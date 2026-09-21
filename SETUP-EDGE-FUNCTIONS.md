# Attivare AI Premium e webhook RevenueCat

Due funzioni server (Supabase Edge Functions) + una migrazione SQL.

| File | A cosa serve |
|---|---|
| `migration-v3.sql` | contatore giornaliero delle richieste AI + permessi interni |
| `supabase/functions/ai-chat/index.ts` | assistente AI: la chiave del provider sta solo qui, controlla login e piano Premium, applica il limite giornaliero |
| `supabase/functions/revenuecat-webhook/index.ts` | riceve gli eventi di acquisto e aggiorna la tabella `subscriptions` |

Prerequisiti: `migration-v2.sql` già eseguita. Ordine consigliato: 1 → 2 → 3 (AI) → 4 (RevenueCat).

---

## 1. Database
Supabase → SQL Editor → esegui `migration-v3.sql`.

## 2. Pubblicare le funzioni

**Da terminale (Supabase CLI)**, nella cartella del progetto (quella che contiene `supabase/`):
```bash
npx supabase login
npx supabase link --project-ref riywpzowbnyrntuapmek
npx supabase functions deploy ai-chat
npx supabase functions deploy revenuecat-webhook --no-verify-jwt
```
`--no-verify-jwt` va **solo** sul webhook: RevenueCat non ha un token Supabase, quindi il webhook si protegge con un secret condiviso (vedi punto 4). `ai-chat` invece deve tenere la verifica attiva.

**Dal Dashboard**, in alternativa: Edge Functions → *Deploy a new function* → *Via Editor*, incolla il codice, usa gli stessi nomi (`ai-chat`, `revenuecat-webhook`) e, solo per il webhook, disattiva la verifica JWT nelle impostazioni della funzione (i nomi esatti delle voci possono cambiare).

## 3. AI Premium
Crea una chiave API presso il provider che preferisci e salvala come *secret* (mai nel codice dell'app):
```bash
npx supabase secrets set AI_API_KEY="la-tua-chiave" AI_PROVIDER=anthropic AI_DAILY_LIMIT=30
```
- `AI_PROVIDER`: `anthropic` (default) oppure `openai`.
- `AI_MODEL` (facoltativo): default `claude-haiku-4-5-20251001` per Anthropic e `gpt-4o-mini` per OpenAI. Cambialo con `secrets set AI_MODEL=...` senza ripubblicare il codice.
- `AI_DAILY_LIMIT`: richieste al giorno per utente (il giorno cambia a mezzanotte UTC). È la tua protezione dai costi: scegli un valore coerente con i 5 €/mese del Premium.

Prova: dai a te stesso il piano Premium (snippet in fondo a `migration-v2.sql`), apri l'app, tocca il robot e fai una domanda. Se qualcosa non va, guarda Edge Functions → `ai-chat` → Logs.

| Messaggio nell'app | Causa |
|---|---|
| "Non ancora configurato sul server" | manca il secret `AI_API_KEY` |
| "Il servizio AI non risponde" | chiave errata/senza credito, o modello inesistente: vedi i log |
| Paywall Premium | l'utente non ha Premium in `subscriptions` |
| "Sessione non valida" | esci e rientra nell'app |

## 4. Webhook RevenueCat

**a) In RevenueCat (Dashboard del progetto)**
1. *Products*: crea i tre prodotti con gli stessi ID usati in `PRODUCT_IDS` di `app.js` (`ulife_pro_lifetime`, `ulife_premium_monthly`, `ulife_premium_yearly`), collegandoli a quelli creati negli store.
2. *Entitlements*: crea `premium` (collega mensile + annuale) e `pro` (collega l'acquisto una tantum). I nomi devono essere questi, oppure imposta i secret `RC_ENTITLEMENT_PREMIUM` / `RC_ENTITLEMENT_PRO`.
3. *Offerings*: nell'offering "current" aggiungi i tre pacchetti.
4. *API keys*: la chiave **pubblica** dell'SDK (una per iOS, una per Android) va in `REVENUECAT_KEYS` in `app.js`; la chiave **segreta** (`sk_...`) serve solo al webhook e non va mai nell'app.

**b) Secret del webhook**
```bash
# genera una stringa lunga e casuale
openssl rand -hex 32
npx supabase secrets set REVENUECAT_WEBHOOK_SECRET="Bearer <la-stringa-generata>" REVENUECAT_SECRET_KEY="sk_..."
```

**c) Collegamento**: RevenueCat → Integrations → Webhooks → *Add new*:
- URL: `https://riywpzowbnyrntuapmek.supabase.co/functions/v1/revenuecat-webhook`
- Authorization header value: esattamente lo stesso valore del secret (`Bearer <la-stringa-generata>`)
- Eventi: tutti. Ambiente: prima *Sandbox*, poi anche *Production*.

**d) Verifica**
1. *Send test event* → RevenueCat deve mostrare 200.
2. Acquisto di prova in sandbox → in Supabase, tabella `subscriptions` compare la tua riga (`premium_until` nel futuro) e nell'app il piano cambia entro pochi secondi.
3. Se RevenueCat mostra errori 5xx: guarda i log della funzione. RevenueCat riprova da solo.

### Come funziona (e perché è sicuro)
- L'app usa l'id utente Supabase come identificativo in RevenueCat: così l'acquisto è legato all'account giusto.
- Il webhook usa l'evento solo come "campanello": chiede a RevenueCat lo stato attuale dell'utente e lo scrive. Eventi doppi, in ritardo o fuori ordine non possono lasciare un piano sbagliato.
- I piani assegnati a mano (`source = 'manual'`, come il tuo di prova) non vengono sovrascritti.
- Il client non può scrivere in `subscriptions`: solo il server.
- Se il pagamento fallisce, RevenueCat concede un periodo di tolleranza e il webhook lo rispetta.
- Utenti anonimi di RevenueCat e utenti non presenti in Supabase vengono ignorati.

## 5. Limiti noti
- Sul webhook uso l'API REST v1 di RevenueCat (`/v1/subscribers/{id}`): se RevenueCat la dovesse cambiare, si modifica solo `fetchSubscriber` in `index.ts`.
- Le chiamate legacy `/api/ai/parse-document` (importa bolletta / scontrino da foto) sono ancora un residuo della versione per PC e ripiegano sull'interpretazione locale. Si possono collegare alla stessa funzione con una terza modalità, se ti serve.
- L'aggiunta rapida in linguaggio naturale ora usa l'AI vera quando il piano è Premium e ripiega sull'interpretazione locale in caso di limite raggiunto, offline o errore.
