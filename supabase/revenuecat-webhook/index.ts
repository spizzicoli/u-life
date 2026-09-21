// ============================================================
// Edge Function "revenuecat-webhook" — allinea il piano dell'utente agli acquisti
// ============================================================
// RevenueCat chiama questa funzione a ogni evento (acquisto, rinnovo, scadenza, rimborso...).
// Invece di fidarsi del contenuto dell'evento, la funzione lo usa solo come "campanello":
// chiede a RevenueCat lo stato ATTUALE dell'utente (API v1) e lo scrive in public.subscriptions.
// Così eventi doppi, in ritardo o fuori ordine non possono lasciare un piano sbagliato.
//
// DEPLOY: senza verifica JWT (RevenueCat non ha un token Supabase; l'autenticazione è il secret condiviso):
//    supabase functions deploy revenuecat-webhook --no-verify-jwt
//
// Secret necessari:
//    REVENUECAT_WEBHOOK_SECRET   valore che imposti anche in RevenueCat come "Authorization header" (es. "Bearer <stringa-lunga-casuale>")
//    REVENUECAT_SECRET_KEY       chiave API SEGRETA v1 di RevenueCat (inizia con sk_)
// Facoltativi (nomi degli "Entitlements" creati in RevenueCat):
//    RC_ENTITLEMENT_PREMIUM  (default "premium")     RC_ENTITLEMENT_PRO  (default "pro")
import { createClient } from 'npm:@supabase/supabase-js@2';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FAR_FUTURE = '9999-12-31T00:00:00.000Z';

function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}
function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function fetchSubscriber(userId: string, key: string): Promise<any | null> {
  const r = await fetch('https://api.revenuecat.com/v1/subscribers/' + encodeURIComponent(userId), {
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('RevenueCat HTTP ' + r.status);
  return (await r.json())?.subscriber ?? null;
}

// Da stato RevenueCat a "cosa scrivere nel database".
function computePlan(sub: any, now: number, entPremium: string, entPro: string) {
  const ents = sub?.entitlements ?? {};
  const prem = ents[entPremium];
  const pro = ents[entPro];

  let premiumUntil: string | null = null;
  if (prem) {
    const exp = prem.expires_date ? Date.parse(prem.expires_date) : Infinity;        // senza scadenza = per sempre
    const grace = prem.grace_period_expires_date ? Date.parse(prem.grace_period_expires_date) : 0;   // problema di pagamento: RevenueCat concede una tolleranza
    const best = Math.max(Number.isNaN(exp) ? 0 : exp, Number.isNaN(grace) ? 0 : grace);
    premiumUntil = best === Infinity ? FAR_FUTURE : (best > 0 ? new Date(best).toISOString() : null);
  }
  const proActive = !!pro && (!pro.expires_date || Date.parse(pro.expires_date) > now);

  const productId = prem?.product_identifier ?? pro?.product_identifier;
  const store = productId ? sub?.subscriptions?.[productId]?.store ?? sub?.non_subscriptions?.[productId]?.[0]?.store : undefined;
  return { pro_lifetime: proActive, premium_until: premiumUntil, source: typeof store === 'string' && store ? store : 'revenuecat' };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);

  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '';
  const rcKey = Deno.env.get('REVENUECAT_SECRET_KEY') ?? '';
  if (!secret || !rcKey) { console.error('webhook non configurato: mancano i secret'); return reply({ error: 'not_configured' }, 503); }
  if (!safeEqual(req.headers.get('Authorization') ?? '', secret)) return reply({ error: 'unauthorized' }, 401);

  let payload: any;
  try { payload = await req.json(); } catch { return reply({ error: 'bad_request' }, 400); }
  const ev = payload?.event;
  if (!ev || typeof ev !== 'object') return reply({ error: 'bad_request' }, 400);
  if (ev.type === 'TEST') return reply({ ok: true, test: true });

  // Utenti coinvolti (l'app usa l'id Supabase come app_user_id; gli id anonimi "$RCAnonymousID:..." vengono ignorati)
  const candidates: unknown[] = [ev.app_user_id, ev.original_app_user_id, ...(ev.aliases ?? []), ...(ev.transferred_from ?? []), ...(ev.transferred_to ?? [])];
  const ids = [...new Set(candidates.filter((x): x is string => typeof x === 'string' && UUID_RE.test(x)))];
  if (!ids.length) return reply({ ok: true, ignored: 'nessun utente riconoscibile' });

  const entPremium = Deno.env.get('RC_ENTITLEMENT_PREMIUM') || 'premium';
  const entPro = Deno.env.get('RC_ENTITLEMENT_PRO') || 'pro';
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } });

  const results: Record<string, string> = {};
  let failed = false;
  for (const id of ids) {
    try {
      // i piani assegnati a mano (test) non vengono sovrascritti
      const { data: existing } = await admin.from('subscriptions').select('source').eq('user_id', id).maybeSingle();
      if (existing?.source === 'manual') { results[id] = 'skipped_manual'; continue; }

      const sub = await fetchSubscriber(id, rcKey);
      const plan = computePlan(sub, Date.now(), entPremium, entPro);
      const { error } = await admin.from('subscriptions')
        .upsert({ user_id: id, ...plan, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) {
        if (error.code === '23503') { results[id] = 'unknown_user'; continue; }   // id non presente in auth.users
        throw new Error(error.message);
      }
      results[id] = plan.premium_until ? 'premium' : plan.pro_lifetime ? 'pro' : 'free';
    } catch (e) {
      console.error('sync fallita per', id, (e as Error).message);
      results[id] = 'error';
      failed = true;
    }
  }
  // 500 => RevenueCat riprova automaticamente più tardi
  return reply({ ok: !failed, results }, failed ? 500 : 200);
});
