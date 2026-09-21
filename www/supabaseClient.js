// ============================================================
// Client Supabase per "U-Life" (versione ibrida) — v2
// ============================================================
// Novità v2:
//  - scritture idempotenti (upsert) => niente più blocchi "offline" per righe duplicate
//  - campi solo-locali (es. ultimo promemoria benessere) NON vengono più inviati al database
//  - meno chiamate: profilo aggiornato solo se cambia, elenco familiari in cache, registro attività opzionale
//  - nuova entità "incomes" (entrate), piano abbonamento, consensi privacy, eliminazione account
// ============================================================
// Incolla qui sotto URL e chiave "anon" del tuo progetto:
// Supabase → Project Settings → API
const SUPABASE_URL = 'https://riywpzowbnyrntuapmek.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeXdwem93Ym55cm50dWFwbWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MjU4ODcsImV4cCI6MjEwNDUwMTg4N30.6n8j-ye91Ksgld5vM543KyUXdo55y1Cl8sBsmtymetU';

if(SUPABASE_URL.startsWith('INCOLLA_QUI') || SUPABASE_ANON_KEY.startsWith('INCOLLA_QUI')){
  const msg = 'Configurazione mancante: apri www/supabaseClient.js e sostituisci SUPABASE_URL e SUPABASE_ANON_KEY con i valori del tuo progetto Supabase (Project Settings → API). Poi ricarica la pagina con un refresh forzato.';
  document.addEventListener('DOMContentLoaded', () => {
    const box = document.getElementById('lockScreen');
    if(box){ box.classList.add('active'); box.innerHTML = `<div class="lock-box"><h2>Configurazione mancante</h2><div class="sub">${msg}</div></div>`; }
  });
  throw new Error(msg);
}

// Se true il "Registro attività" viene sincronizzato su Supabase (1 scrittura in più per ogni azione).
// Se false (consigliato) resta solo su questo dispositivo: meno scritture e meno letture.
const SYNC_ACTIVITY_LOG = false;

// La libreria supabase-js viene caricata come <script> in index.html,
// quindi qui usiamo semplicemente window.supabase.
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- Autenticazione (email + password) ----------
async function signUp(email, password) {
  const { data, error } = await sb.auth.signUp({ email, password });
  return { data, error };
}
async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  return { data, error };
}
async function signOut() {
  await sb.auth.signOut();
}
async function getSession() {
  const { data } = await sb.auth.getSession();
  return data ? data.session : null;
}

// Elenco degli utenti del nucleo familiare (te compreso). Chiamata RPC messa in cache per 10 minuti.
let _familyIdsCache = null;
async function getFamilyUserIds(force) {
  const now = Date.now();
  if(!force && _familyIdsCache && now - _familyIdsCache.at < 10*60*1000) return _familyIdsCache.ids;
  const { data, error } = await sb.rpc('get_family_user_ids');
  if(error){
    const session = await getSession();
    return session ? [session.user.id] : [];   // fallback: solo i miei dati (non lo metto in cache)
  }
  const ids = (data||[]).map(row=>row.user_id);
  _familyIdsCache = { ids, at: now };
  return ids;
}
async function createFamilyInvite() {
  const { data, error } = await sb.rpc('create_family_invite');
  if(error) throw error;
  _familyIdsCache = null;
  return data && data[0];
}
async function joinFamily(code) {
  const { data, error } = await sb.rpc('join_family', { p_code: code });
  if(error) throw error;
  _familyIdsCache = null;
  return data;
}
async function resetPasswordForEmail(email) {
  return sb.auth.resetPasswordForEmail(email);
}

// ============================================================
// Mappa delle entità: nome campo nell'app (camelCase) <-> nome colonna SQL (snake_case)
// ============================================================
const ENTITY_CONFIG = {
  health:        { table: 'health',           fields: { cat:'cat', title:'title', date:'date', nextDate:'next_date', desc:'description', med:'med', cost:'cost', recurMonths:'recur_months', tags:'tags', files:'files' } },
  bills:         { table: 'bills',             fields: { provider:'provider', frequency:'frequency', amount:'amount', method:'method', nextDue:'next_due' } },
  homeTasks:     { table: 'home_tasks',        fields: { title:'title', status:'status', priority:'priority', note:'note', cost:'cost', tags:'tags', archived:'archived', completedDate:'completed_date' } },
  installments:  { table: 'installments',      fields: { title:'title', totalAmount:'total_amount', installmentAmount:'installment_amount', totalCount:'total_count', paidCount:'paid_count', nextDue:'next_due', frequency:'frequency', autoPayment:'auto_payment' } },
  expenses:      { table: 'expenses',          fields: { sourceKey:'source_key', title:'title', amount:'amount', date:'date', category:'category', tags:'tags' } },
  incomes:       { table: 'incomes',           fields: { title:'title', amount:'amount', date:'date', recur:'recur', endDate:'end_date', category:'category' } },
  cars:          { table: 'cars',              fields: { name:'name', plate:'plate', model:'model', year:'year', km:'km', startKm:'start_km', lastServiceKm:'last_service_km', serviceIntervalKm:'service_interval_km', archived:'archived' } },
  carEvents:     { table: 'car_events',        fields: { carId:'car_id', type:'type', date:'date', note:'note', cost:'cost', tags:'tags' } },
  events:        { table: 'events',            fields: { title:'title', date:'date', time:'time', note:'note', recur:'recur', category:'category', linkedFrom:'linked_from' } },
  homeDocuments: { table: 'home_documents',    fields: { title:'title', category:'category', note:'note', tags:'tags', files:'files' } },
  personalDocs:  { table: 'personal_docs',     fields: { type:'type', title:'title', number:'number', expiryDate:'expiry_date', note:'note', tags:'tags', files:'files' } },
  contacts:      { table: 'contacts',          fields: { name:'name', category:'category', phone:'phone', note:'note' } },
  medicines:     { table: 'medicines',         fields: { name:'name', expiryDate:'expiry_date', note:'note', tags:'tags' } },
  seasonalTasks: { table: 'seasonal_tasks',    fields: { title:'title', month:'month', note:'note', lastDoneYear:'last_done_year' } },
  assets:        { table: 'assets',            fields: { name:'name', purchasePrice:'purchase_price', purchaseDate:'purchase_date', note:'note' } },
};
// Entità "speciali", annidate dentro state in modo diverso da un array diretto.
// lastFiredAt / lastFiredDate NON sono più qui: sono dati legati al singolo dispositivo
// (quando è comparsa l'ultima notifica) e non hanno motivo di finire nel database.
const ROUTINES_CONFIG = { table: 'wellness_routines', fields: { category:'category', label:'label', scheduleType:'schedule_type', intervalMinutes:'interval_minutes', activeStart:'active_start', activeEnd:'active_end', time:'time', enabled:'enabled', color:'color', doneDates:'done_dates' } };
const TRASH_CONFIG = { table: 'trash', fields: { type:'type', data:'data', label:'label', deletedAt:'deleted_at' } };
const LOG_CONFIG = { table: 'activity_log', fields: { ts:'ts', action:'action', type:'type', label:'label' } };

// Chiavi presenti solo in locale: ignorate quando si confrontano gli oggetti per decidere cosa scrivere.
const LOCAL_ONLY_KEYS = ['lastFiredAt', 'lastFiredDate'];

function toSqlRow(cfg, obj, userId){
  const row = { id: obj.id, user_id: userId };
  for(const [js, sql] of Object.entries(cfg.fields)){
    const v = obj[js];
    // Una stringa vuota ("") non è una data né un numero validi per Postgres:
    // la trattiamo come "nessun valore" (null), qualunque sia il tipo di colonna.
    row[sql] = (v === undefined || v === '') ? null : v;
  }
  return row;
}
function fromSqlRow(cfg, row){
  const obj = { id: row.id };
  for(const [js, sql] of Object.entries(cfg.fields)){
    obj[js] = row[sql] === null ? '' : row[sql];
  }
  return obj;
}

// ---------- Lettura: ricostruisce lo stesso "state" che l'app usa già ----------
async function fetchAllTables(){
  const session = await getSession();
  if(!session) throw new Error('Non autenticato.');
  const userId = session.user.id;
  const familyUserIds = await getFamilyUserIds();

  const entityKeys = Object.keys(ENTITY_CONFIG);
  const queries = entityKeys.map(k => sb.from(ENTITY_CONFIG[k].table).select('*').in('user_id', familyUserIds));
  queries.push(sb.from(ROUTINES_CONFIG.table).select('*').in('user_id', familyUserIds));
  queries.push(sb.from(TRASH_CONFIG.table).select('*').in('user_id', familyUserIds));
  queries.push(sb.from('profiles').select('*').eq('id', userId).maybeSingle());
  if(SYNC_ACTIVITY_LOG) queries.push(sb.from(LOG_CONFIG.table).select('*').in('user_id', familyUserIds).order('ts', {ascending:false}).limit(300));

  const results = await Promise.all(queries);
  results.forEach(r => { if(r.error) throw r.error; });

  const state = {};
  entityKeys.forEach((k, i) => {
    state[k] = (results[i].data || []).map(row => fromSqlRow(ENTITY_CONFIG[k], row));
  });
  const routinesRes = results[entityKeys.length];
  const trashRes = results[entityKeys.length+1];
  const profileRes = results[entityKeys.length+2];

  state.wellness = { routines: (routinesRes.data||[]).map(row=>fromSqlRow(ROUTINES_CONFIG,row)), notificationsAsked:false };
  state.trash = (trashRes.data||[]).map(row=>fromSqlRow(TRASH_CONFIG,row));
  if(SYNC_ACTIVITY_LOG){
    state.activityLog = (results[entityKeys.length+3].data||[]).map(row=>fromSqlRow(LOG_CONFIG,row));
  }

  let profile = profileRes.data;
  if(!profile){
    // Rete di sicurezza: se per qualche motivo il profilo non esiste ancora, lo creo ora.
    const { data: created } = await sb.from('profiles').insert({ id: userId }).select().single();
    profile = created;
  }
  state.homeInfo = { street: profile.home_street||'', city: profile.home_city||'', cap: profile.home_cap||'', note: profile.home_note||'' };
  state.settings = {
    ownerName: profile.owner_name||'', theme: profile.theme||'light',
    reminderDaysAhead: profile.reminder_days_ahead||3, autoLockMinutes: profile.auto_lock_minutes||10,
    pin: profile.pin||'0584', pinEnabled: !!profile.pin_enabled, budgets: profile.budgets||{},
    onboardingDone: !!profile.onboarding_done,
    lastBriefingShown: profile.last_briefing_shown||''
  };
  return state;
}

// ---------- Scrittura: confronta con l'ultimo stato sincronizzato e scrive solo le differenze ----------
function stripLocal(item){
  if(!item || typeof item !== 'object') return item;
  const copy = { ...item };
  LOCAL_ONLY_KEYS.forEach(k => { delete copy[k]; });
  return copy;
}
function diffArrays(newArr, oldArr){
  const oldMap = new Map((oldArr||[]).map(x=>[x.id,x]));
  const newMap = new Map((newArr||[]).map(x=>[x.id,x]));
  const added = [], changed = [], removedIds = [];
  for(const [id, item] of newMap){
    if(!oldMap.has(id)) added.push(item);
    else if(JSON.stringify(stripLocal(oldMap.get(id))) !== JSON.stringify(stripLocal(item))) changed.push(item);
  }
  for(const id of oldMap.keys()){ if(!newMap.has(id)) removedIds.push(id); }
  return { added, changed, removedIds };
}
async function syncEntity(cfg, newArr, oldArr, userId){
  const { added, changed, removedIds } = diffArrays(newArr, oldArr);
  if(added.length){
    // upsert e non insert: se un tentativo precedente era andato a buon fine solo in parte,
    // riprovare non deve mai fallire per "chiave duplicata".
    const rows = added.map(item => toSqlRow(cfg, item, userId));
    const { error } = await sb.from(cfg.table).upsert(rows, { onConflict: 'id' });
    if(error) throw error;
  }
  if(changed.length){
    await Promise.all(changed.map(item => {
      const row = toSqlRow(cfg, item, userId);
      delete row.id; delete row.user_id;
      return sb.from(cfg.table).update(row).eq('id', item.id).then(({error})=>{ if(error) throw error; });
    }));
  }
  if(removedIds.length){
    const { error } = await sb.from(cfg.table).delete().in('id', removedIds);
    if(error) throw error;
  }
}
function profilePayload(state){
  const s = (state && state.settings) || {}, h = (state && state.homeInfo) || {};
  return {
    owner_name: s.ownerName||'', theme: s.theme||'light',
    reminder_days_ahead: s.reminderDaysAhead||3, auto_lock_minutes: s.autoLockMinutes||10,
    pin: s.pin||'0584', pin_enabled: !!s.pinEnabled, budgets: s.budgets||{},
    onboarding_done: !!s.onboardingDone,
    last_briefing_shown: s.lastBriefingShown || null,
    home_street: h.street||'', home_city: h.city||'', home_cap: h.cap||'', home_note: h.note||''
  };
}
async function syncStateToTables(newState, oldState){
  const session = await getSession();
  if(!session) throw new Error('Non autenticato.');
  const userId = session.user.id;
  oldState = oldState || {};

  // cars prima di car_events: car_events ha una chiave esterna verso cars.
  const orderedKeys = Object.keys(ENTITY_CONFIG).filter(k => k !== 'carEvents');
  const jobs = orderedKeys.map(k =>
    syncEntity(ENTITY_CONFIG[k], newState[k]||[], oldState[k]||[], userId)
  );
  jobs.push(syncEntity(ROUTINES_CONFIG, (newState.wellness||{}).routines||[], (oldState.wellness||{}).routines||[], userId));
  jobs.push(syncEntity(TRASH_CONFIG, newState.trash||[], oldState.trash||[], userId));
  if(SYNC_ACTIVITY_LOG) jobs.push(syncEntity(LOG_CONFIG, newState.activityLog||[], oldState.activityLog||[], userId));

  // Il profilo (impostazioni + indirizzo di casa) è una riga sola: la scrivo solo se è cambiata.
  const newProfile = profilePayload(newState);
  const profileChanged = !oldState.settings || JSON.stringify(newProfile) !== JSON.stringify(profilePayload(oldState));
  if(profileChanged){
    jobs.push(sb.from('profiles').update(newProfile).eq('id', userId).then(({error})=>{ if(error) throw error; }));
  }

  await Promise.all(jobs);
  // Le auto devono esistere prima dei loro eventi (e devono sparire dopo).
  await syncEntity(ENTITY_CONFIG.carEvents, newState.carEvents||[], oldState.carEvents||[], userId);
}

// ---------- Migrazione automatica dalla vecchia tabella unica "app_state" ----------
// Se in passato avevi usato la versione con un unico blocco JSON, questa funzione
// travasa quei dati nelle tabelle nuove la prima volta che serve. Il controllo si fa una
// sola volta per utente e dispositivo (poi si ricorda il risultato) per non sprecare chiamate.
async function migrateFromBlobIfNeeded(currentState){
  const alreadyHasData = Object.keys(ENTITY_CONFIG).some(k => (currentState[k]||[]).length>0)
    || (currentState.wellness && currentState.wellness.routines && currentState.wellness.routines.length>0);
  if(alreadyHasData) return currentState;

  const session = await getSession();
  if(!session) return currentState;
  const flagKey = 'taccuino-blob-checked-' + session.user.id;
  try{ if(localStorage.getItem(flagKey)) return currentState; }catch(e){ /* storage non disponibile */ }

  const { data: blobRow, error } = await sb.from('app_state').select('data').eq('user_id', session.user.id).maybeSingle();
  if(error) return currentState;   // la tabella potrebbe non esistere più: nessun problema
  try{ localStorage.setItem(flagKey, '1'); }catch(e){}
  if(!blobRow || !blobRow.data) return currentState;
  const blob = blobRow.data;
  const blobHasData = Object.keys(ENTITY_CONFIG).some(k => (blob[k]||[]).length>0)
    || (blob.wellness && blob.wellness.routines && blob.wellness.routines.length>0);
  if(!blobHasData) return currentState;

  await syncStateToTables(blob, {});
  if(blob.settings || blob.homeInfo){
    await syncStateToTables({ settings: blob.settings||{}, homeInfo: blob.homeInfo||{} }, {});
  }
  return await fetchAllTables();
}

// ---------- Allegati (foto/PDF) su Supabase Storage ----------
async function uploadAttachment(file) {
  const session = await getSession();
  if (!session) throw new Error('Non autenticato.');
  // Storage rifiuta alcuni caratteri (accenti, parentesi, spazi strani): ripulisco il nome del file
  // nel percorso, ma nell'app continuo a mostrare il nome originale.
  const safeName = String(file.name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.\-]+/g, '_');
  const path = `${session.user.id}/${Date.now()}-${safeName}`;
  const { error } = await sb.storage.from('attachments').upload(path, file);
  if (error) throw error;
  return { name: file.name, path };
}
async function getAttachmentUrl(path) {
  // "signed URL" valido 1 ora, dato che il bucket è privato
  const { data, error } = await sb.storage.from('attachments').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
async function deleteAttachment(path) {
  await sb.storage.from('attachments').remove([path]);
}

// ---------- Piano / abbonamento ----------
// Il piano viene calcolato dal SERVER (funzione get_my_plan): il client non può auto-assegnarsi Premium.
async function getMyPlan() {
  const { data, error } = await sb.rpc('get_my_plan');
  if(error) throw error;
  return (data === 'premium' || data === 'pro') ? data : 'free';
}

// ---------- Assistente AI (Edge Function "ai-chat") ----------
// La chiave del provider AI sta solo sul server. Il server verifica login e piano Premium e applica un limite giornaliero.
// payload: { mode:'chat'|'quickadd', question, context?, today? }   ->   { answer, remaining }  oppure  { parsed, remaining }
async function askAI(payload) {
  const { data, error } = await sb.functions.invoke('ai-chat', { body: payload });
  if(error){
    let info = {};
    try{ info = await error.context.json(); }catch(e){ /* errore di rete: nessun corpo da leggere */ }
    const err = new Error(info.message || error.message || 'Assistente non raggiungibile.');
    err.code = info.error || '';
    throw err;
  }
  return data;
}

// ---------- Consensi privacy (registro append-only) ----------
async function recordConsent(kind, version, granted) {
  const session = await getSession();
  if(!session) throw new Error('Non autenticato.');
  const { error } = await sb.from('consents').insert({ user_id: session.user.id, kind, version, granted: !!granted });
  if(error) throw error;
}
async function fetchLatestConsents() {
  const { data, error } = await sb.from('consents').select('kind,version,granted,created_at').order('created_at', { ascending:false }).limit(50);
  if(error) throw error;
  const latest = {};
  (data||[]).forEach(r => { if(!latest[r.kind]) latest[r.kind] = { version:r.version, granted:r.granted, at:r.created_at }; });
  return latest;
}

// ---------- Eliminazione account (diritto alla cancellazione, GDPR art. 17) ----------
async function deleteMyAccount() {
  const session = await getSession();
  if(!session) throw new Error('Non autenticato.');
  const uid = session.user.id;
  // 1) allegati: la cancellazione dell'utente elimina le righe ma non i file nello Storage
  try{
    const { data: files } = await sb.storage.from('attachments').list(uid, { limit: 1000 });
    if(files && files.length){
      await sb.storage.from('attachments').remove(files.map(f => `${uid}/${f.name}`));
    }
  }catch(e){ console.warn('Pulizia allegati non completata:', e); }
  // 2) account e tutte le righe collegate (cascade) — funzione SQL "delete_my_account"
  const { error } = await sb.rpc('delete_my_account');
  if(error) throw error;
  try{ await sb.auth.signOut(); }catch(e){}
}

window.taccuinoDB = {
  sb, signUp, signIn, signOut, getSession, resetPasswordForEmail, createFamilyInvite, joinFamily,
  fetchAllTables, syncStateToTables, migrateFromBlobIfNeeded,
  uploadAttachment, getAttachmentUrl, deleteAttachment,
  getMyPlan, askAI, recordConsent, fetchLatestConsents, deleteMyAccount,
  SYNC_ACTIVITY_LOG
};
