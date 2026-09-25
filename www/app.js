let state = {
  health: [], homeInfo:{street:'',city:'',cap:'',note:''},
  bills: [], homeTasks: [], installments: [],
  expenses: [], incomes: [], cars: [], carEvents: [], events: [], homeDocuments: [],
  personalDocs: [], contacts: [], medicines: [], seasonalTasks: [], assets: [],
  trash: [], activityLog: [],
  settings: { reminderDaysAhead: 3, theme: 'light', pin:'0584', pinEnabled:false, autoLockMinutes:10, budgets:{}, onboardingDone:false, lastBriefingShown:'' }
};
let activeTab = 'home';
let calMode = 'month';
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();
let weekRef = new Date();
let selectedDay = null;
let searchQuery = '';
let unlocked = false;
let showArchivedTasks = false;
let showArchivedCars = false;
let undoStack = [];
const MAX_UNDO = 20;
const EVENT_CATS = ['Salute','Lavoro','Famiglia','Sport','Altro'];
const EVENT_CAT_COLORS = { Salute:'#D9718C', Lavoro:'#4E7DA0', Famiglia:'#C99A2E', Sport:'#7FA06F', Altro:'#87619B', Amministrazione:'#8A8074' };
function eventColor(e){ return e.nationalHoliday ? '#B85C38' : (e.linkedFrom ? EVENT_CAT_COLORS.Amministrazione : (EVENT_CAT_COLORS[e.category||'Altro'] || EVENT_CAT_COLORS.Altro)); }
let chartMonthly = null, chartCategory = null, chartYearly = null;

const uid = () => Math.random().toString(36).slice(2,10);
// Date "locali": toISOString() converte in UTC e in Italia sposta le date indietro di un giorno (es. alle 00:30
// oppure per le scadenze calcolate a mezzanotte). Uso sempre queste due funzioni.
const pad2 = (n) => String(n).padStart(2,'0');
const isoLocal = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const todayStr = () => isoLocal(new Date());
const fmtD = (d) => { if(!d) return ''; const dt=new Date(d+'T00:00'); return dt.toLocaleDateString('it-IT',{day:'numeric',month:'short',year:'numeric'}); };
const fmtDT = (iso) => { const d=new Date(iso); return d.toLocaleDateString('it-IT',{day:'numeric',month:'short'}) + ' ' + d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}); };
const euro = (n) => (Number(n)||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'});
function parseTags(s){ return (s||'').split(',').map(t=>t.trim()).filter(Boolean); }
function tagsChips(tags){ if(!tags||!tags.length) return ''; return `<div class="tags-row">${tags.map(t=>`<span class="tag chip-label" onclick="filterByTag('${esc(t)}')">#${esc(t)}</span>`).join('')}</div>`; }

const TYPE_LABELS = { health:'Salute', bill:'Bolletta', homeTask:'Lavoro casa', installment:'Rata', homeDocument:'Documento casa', personalDoc:'Documento personale', contact:'Contatto', car:'Auto', carEvent:'Evento auto', event:'Calendario', expense:'Spesa', medicine:'Farmaco', seasonalTask:'Manutenzione stagionale', asset:'Bene', profile:'Profilo', routine:'Routine benessere', income:'Entrata' };
const ACTION_LABELS = { added:'Aggiunto', edited:'Modificato', deleted:'Eliminato', restored:'Ripristinato', archived:'Archiviato' };

// ---------- icone ----------
const ICONS = {
  home: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 11.5 12 4l8 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9h12v-9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 19v-5h4v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  health: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20s-7.2-4.6-9.5-9.1C1 7.6 2.6 4.5 5.8 4c2-.3 3.6.7 4.7 2.2C11.6 4.7 13.2 3.7 15.2 4c3.2.5 4.8 3.6 3.3 6.9C16.2 15.4 12 20 12 20Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M7 11h2.2l1.1-2 1.6 4 1.1-2H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  house: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 11.5 12 4l8 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9h12v-9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 19v-4.2c0-.9.7-1.6 1.6-1.6h1.8c.9 0 1.6.7 1.6 1.6V19" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  piggy: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12.5c0-3.3 3-6 7-6 1 0 2 .2 2.8.5.5-.7 1.4-1.1 2.4-1v2.3c.5.4.8.9 1 1.4H19v2.6h-1c-.3 1-1 1.9-2 2.6v2.1h-2.2v-1.2c-.6.1-1.2.2-1.8.2s-1.2-.1-1.8-.2v1.2H8v-2c-1.8-1-3-2.8-3-4.9Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="14.7" cy="10.3" r=".9" fill="currentColor"/><path d="M5 12c-.8 0-1.6-.5-2-1.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  car: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 15.5V13l1.6-4.2A2 2 0 0 1 7.5 7.5h9a2 2 0 0 1 1.9 1.3L20 13v2.5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M4 15.5h16v2.3a1 1 0 0 1-1 1h-1.2a1 1 0 0 1-1-1V17H7.2v.8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="7.5" cy="15.3" r="1.3" stroke="currentColor" stroke-width="1.4"/><circle cx="16.5" cy="15.3" r="1.3" stroke="currentColor" stroke-width="1.4"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="5.5" width="16" height="14" rx="2.2" stroke="currentColor" stroke-width="1.7"/><path d="M4 9.5h16" stroke="currentColor" stroke-width="1.7"/><path d="M8.5 3.5v3M15.5 3.5v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="8.6" cy="13.2" r="1" fill="currentColor"/><circle cx="12" cy="13.2" r="1" fill="currentColor"/><circle cx="15.4" cy="13.2" r="1" fill="currentColor"/><circle cx="8.6" cy="16.4" r="1" fill="currentColor"/><circle cx="12" cy="16.4" r="1" fill="currentColor"/></svg>`,
  doc: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 3.5V7a1 1 0 0 0 1 1h3.5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 12h6M9 15h6M9 9h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  admin: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="3.5" width="16" height="17" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="14.5" cy="7" r="2.3" fill="var(--card)" stroke="currentColor" stroke-width="1.8"/><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="8.5" cy="12" r="2.3" fill="var(--card)" stroke="currentColor" stroke-width="1.8"/><line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="16" cy="17" r="2.3" fill="var(--card)" stroke="currentColor" stroke-width="1.8"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8"/><path d="m20 20-4.3-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 14.2A8.3 8.3 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  print: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 8.5V4h10v4.5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><rect x="4.5" y="8.5" width="15" height="7.5" rx="1.5" stroke="currentColor" stroke-width="1.7"/><path d="M7 14h10v6H7z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="10.5" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" stroke-width="1.7"/></svg>`,
  undo: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8H15.5a4.5 4.5 0 0 1 0 9H10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 4.5 5.5 8 9 11.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  briefing: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="4.3" stroke="currentColor" stroke-width="1.8"/><path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.55 1.55M7.15 16.85l-1.55 1.55M18.4 18.4l-1.55-1.55M7.15 7.15 5.6 5.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  wand: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 19 17 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M14 4.5v2M17.5 6l-1.4 1.4M20.5 9.5h-2M7 15v2M4.5 18.5h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="3.5" width="6" height="10" rx="3" stroke="currentColor" stroke-width="1.6"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3.5M9 20.5h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  droplet: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3.5s6 6.8 6 11a6 6 0 1 1-12 0c0-4.2 6-11 6-11Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  spark: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.8 2.8M15.2 15.2 18 18M18 6l-2.8 2.8M8.8 15.2 6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
};
function sectionIcon(key, color, soft){ return `<div class="section-icon" style="background:${soft};color:${color};">${ICONS[key]}</div>`; }

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 3200);
}

// ---------- persistenza ----------
let isOffline = false;
let aiAvailable = false;
const AI_CONFIG_KEY = 'taccuino-ai-config-v1';   // vecchia chiave API salvata sul dispositivo: non serve più, la elimino
function loadAIConfig(){
  try{ localStorage.removeItem(AI_CONFIG_KEY); }catch(e){}   // una chiave API in chiaro sul telefono è un rischio inutile
  recomputeAI();
}
async function checkAIStatus(){ recomputeAI(); }
let pendingSync = false;          // ci sono modifiche locali non ancora inviate al server
let lastSyncedState = null;       // fotografia dello stato come l'ha visto il server l'ultima volta
let lastFetchAt = 0;              // quando ho letto l'ultima volta dal server
let currentUserId = null;
let currentUserName = '';
let syncTimer = null, syncing = false, resyncQueued = false, refreshing = false;
let syncBackoffMs = 0, changeCounter = 0;
let syncError = null;             // ultimo errore NON di rete (es. colonna mancante nel database)
let syncErrorToasted = false;
const LEGACY_CACHE_KEY = 'taccuino-offline-cache-v1';
const CACHE_TTL_MS = 10*60*1000;  // entro 10 minuti dall'ultima lettura non ricontrollo il server (meno chiamate)
const SYNC_DEBOUNCE_MS = 1500;    // raggruppo più modifiche ravvicinate in un solo invio

function isAutomaticBill(bill){
  return /addebito|automatic|domicilia|rid|sepa/i.test(bill.method||'');
}
function processScheduledBillPayments(){
  const today = todayStr();
  let changed = false;
  state.bills.forEach(bill=>{
    if(!isAutomaticBill(bill) || !bill.nextDue || Number(bill.amount)<=0) return;
    let guard = 0;
    while(bill.nextDue <= today && guard++ < 120){
      const sourceKey = `bill-auto-${bill.id}-${bill.nextDue}`;
      if(!state.expenses.some(expense=>expense.sourceKey===sourceKey)){
        addExpense(sourceKey, 'Pagamento '+bill.provider, bill.amount, bill.nextDue, 'Bollette');
      }
      bill.nextDue = addPeriod(bill.nextDue, bill.frequency||'Mensile');
      syncLinkedEvent('bill-due-'+bill.id, bill.nextDue, 'Scadenza '+bill.provider, 'Bolletta · '+euro(bill.amount));
      changed = true;
    }
  });
  return changed;
}
function processScheduledInstallmentPayments(){
  const today = todayStr();
  let changed = false;
  state.installments.forEach(installment=>{
    if(!installment.autoPayment || !installment.nextDue || Number(installment.installmentAmount)<=0) return;
    let guard = 0;
    while(installment.nextDue <= today && guard++ < 120){
      const totalCount = Number(installment.totalCount)||0;
      if(totalCount>0 && (Number(installment.paidCount)||0)>=totalCount) break;
      const sourceKey = `inst-auto-${installment.id}-${installment.nextDue}`;
      if(!state.expenses.some(expense=>expense.sourceKey===sourceKey)){
        addExpense(sourceKey, 'Rata '+installment.title, installment.installmentAmount, installment.nextDue, 'Rate');
      }
      installment.paidCount = (Number(installment.paidCount)||0) + 1;
      installment.nextDue = addPeriod(installment.nextDue, installment.frequency||'Mensile');
      syncLinkedEvent('inst-due-'+installment.id, installment.nextDue, 'Rata '+installment.title, 'Rata · '+euro(installment.installmentAmount));
      changed = true;
    }
  });
  return changed;
}
async function runScheduledPayments(){
  if(!unlocked) return;
  const automaticPaymentsAdded = processScheduledBillPayments();
  const automaticInstallmentsAdded = processScheduledInstallmentPayments();
  if(!automaticPaymentsAdded && !automaticInstallmentsAdded) return;
  await saveState();
  toast('Pagamenti automatici aggiornati nello storico.');
}
setInterval(runScheduledPayments, 60000);

// ---------- cache locale (per utente) ----------
function cacheKey(part){ return `taccuino-cache-${part}-${currentUserId||'anon'}`; }
function readCache(){
  try{
    const s = localStorage.getItem(cacheKey('state'));
    if(s){
      const meta = JSON.parse(localStorage.getItem(cacheKey('meta'))||'{}');
      const syncedRaw = localStorage.getItem(cacheKey('synced'));
      return { state: JSON.parse(s), synced: syncedRaw ? JSON.parse(syncedRaw) : null, meta };
    }
    const legacy = localStorage.getItem(LEGACY_CACHE_KEY);   // vecchia copia senza utente: solo come riserva
    if(legacy) return { state: JSON.parse(legacy), synced: null, meta:{ fetchedAt:0, dirty:false }, legacy:true };
  }catch(e){ /* copia illeggibile: la ignoro */ }
  return null;
}
function writeCache(){
  if(!currentUserId) return;
  try{
    localStorage.setItem(cacheKey('state'), JSON.stringify(state));
    if(pendingSync) localStorage.setItem(cacheKey('synced'), JSON.stringify(lastSyncedState||{}));
    else localStorage.removeItem(cacheKey('synced'));
    localStorage.setItem(cacheKey('meta'), JSON.stringify({ fetchedAt:lastFetchAt, dirty:pendingSync }));
    localStorage.removeItem(LEGACY_CACHE_KEY);
  }catch(e){ /* storage piena o non disponibile: ignoro */ }
}
function cacheStateOffline(){ writeCache(); }
function clearLocalCaches(){
  try{
    Object.keys(localStorage).forEach(k=>{
      if(k.startsWith('taccuino-cache-') || k===LEGACY_CACHE_KEY || k.startsWith('taccuino-consents-') || k.startsWith('taccuino-plan-')) localStorage.removeItem(k);
    });
  }catch(e){}
}

// ---------- classificazione errori ----------
function isNetworkError(e){
  if(!navigator.onLine) return true;
  const msg = String((e && (e.message||e.details||e)) || '').toLowerCase();
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout|timed out|err_internet|network error/.test(msg);
}
function friendlyError(e){
  let msg = (e && (e.message || e.details || e.hint)) || 'errore sconosciuto';
  if(/column|schema cache|relation|does not exist|42703|42P01/i.test(msg+' '+((e&&e.code)||''))) msg += ' — hai eseguito migration-v2.sql su Supabase?';
  return msg;
}
function noteSyncFailure(e){
  if(isNetworkError(e)){ isOffline = true; syncError = null; }
  else { isOffline = false; syncError = friendlyError(e); }
  if(!syncErrorToasted){
    syncErrorToasted = true;
    toast(isOffline ? 'Sei offline: la modifica è salvata su questo dispositivo e si sincronizzerà alla riconnessione.' : 'Errore di sincronizzazione: '+syncError);
  }
}
function syncBadgeHTML(){
  if(isOffline) return '<span class="offline-badge">Offline</span>';
  if(syncError) return '<span class="offline-badge" style="cursor:pointer;" onclick="showSyncError()">Errore sync</span>';
  return '';
}
function syncStatusText(){
  if(isOffline) return '⚠️ Al momento sei offline: le modifiche restano su questo dispositivo e si sincronizzeranno alla riconnessione.';
  if(syncError) return '⚠️ Sincronizzazione bloccata da un errore: '+esc(syncError);
  if(pendingSync) return '⏳ Modifiche in attesa di essere inviate…';
  return '✅ Sincronizzato'+(lastFetchAt?(' (ultimo controllo: '+fmtDT(new Date(lastFetchAt).toISOString())+')'):'')+'.';
}
function showSyncError(){
  openModal(`
    <h3>Sincronizzazione bloccata</h3>
    <div class="notice">${esc(syncError||'Nessun errore.')}</div>
    <div class="section-label">Le tue modifiche sono al sicuro su questo dispositivo. Appena il problema è risolto vengono inviate in automatico.</div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Chiudi</button><button class="btn primary" onclick="closeModal(); syncBackoffMs=0; syncNow();">Riprova ora</button></div>`);
}

// ---------- valori predefiniti / normalizzazione ----------
function normalizeState(){
  if(!state.settings) state.settings = {};
  if(state.settings.reminderDaysAhead===undefined) state.settings.reminderDaysAhead = 3;
  state.settings.theme = resolveThemeId(state.settings.theme);
  if(state.settings.pin===undefined) state.settings.pin = '0584';
  if(state.settings.pinEnabled===undefined) state.settings.pinEnabled = false;
  if(state.settings.autoLockMinutes===undefined) state.settings.autoLockMinutes = 10;
  if(!state.settings.budgets) state.settings.budgets = {};
  if(state.settings.onboardingDone===undefined) state.settings.onboardingDone = false;
  if(state.settings.lastBriefingShown===undefined) state.settings.lastBriefingShown = '';
  if(state.settings.ownerName===undefined) state.settings.ownerName = '';
  if(!state.homeDocuments) state.homeDocuments = [];
  if(!state.personalDocs) state.personalDocs = [];
  if(!state.contacts) state.contacts = [];
  if(!state.trash) state.trash = [];
  if(!state.activityLog) state.activityLog = [];
  if(!state.medicines) state.medicines = [];
  if(!state.seasonalTasks) state.seasonalTasks = [];
  if(!state.assets) state.assets = [];
  if(!state.incomes) state.incomes = [];
  if(!state.wellness) state.wellness = { routines: [], notificationsAsked:false };
}
// Dati che vivono solo su questo dispositivo (registro attività, ultimo promemoria benessere):
// quando ricarico dal server li rimetto al loro posto.
function mergeLocalOnly(srcState){
  if(!srcState) return;
  if(!taccuinoDB.SYNC_ACTIVITY_LOG && Array.isArray(srcState.activityLog)) state.activityLog = srcState.activityLog;
  const old = new Map((((srcState.wellness||{}).routines)||[]).map(r=>[r.id,r]));
  (((state.wellness||{}).routines)||[]).forEach(r=>{
    const o = old.get(r.id);
    r.lastFiredAt = o ? (o.lastFiredAt||0) : 0;
    r.lastFiredDate = o ? (o.lastFiredDate||'') : '';
  });
}

// ---------- lettura dal server ----------
// Ritorna false (senza toccare nulla) se nel frattempo hai fatto modifiche locali.
async function pullFromServer(localOnlySource){
  const counterAtStart = changeCounter;
  let data = await taccuinoDB.fetchAllTables();
  data = await taccuinoDB.migrateFromBlobIfNeeded(data);
  if(changeCounter !== counterAtStart || pendingSync) return false;
  const keep = localOnlySource || { activityLog: state.activityLog, wellness: state.wellness };
  state = Object.assign(state, data);
  mergeLocalOnly(keep);
  normalizeState();
  lastSyncedState = JSON.parse(JSON.stringify(state));
  lastFetchAt = Date.now();
  isOffline = false; syncError = null; syncErrorToasted = false;
  writeCache();
  return true;
}
async function maybeRefreshFromServer(){
  if(!unlocked || pendingSync || syncing || refreshing || !navigator.onLine) return;
  const ov = document.getElementById('overlay');
  if(ov && ov.classList.contains('active')) return;          // non disturbo chi sta compilando un modulo
  if(!isOffline && !syncError && (Date.now()-lastFetchAt) < CACHE_TTL_MS) return;
  refreshing = true;
  try{ if(await pullFromServer(null)) render(); }
  catch(e){ console.warn('Aggiornamento dal server non riuscito:', e); noteSyncFailure(e); if(unlocked) render(); }
  finally{ refreshing = false; }
}
async function forceRefresh(){
  if(pendingSync){ toast('Ci sono modifiche in attesa: le invio prima.'); await syncNow(); }
  if(pendingSync) return;
  try{ await pullFromServer(null); render(); toast('Dati aggiornati.'); }
  catch(e){ noteSyncFailure(e); if(unlocked) render(); }
}

async function loadState(){
  let session = null;
  try{ session = await taccuinoDB.getSession(); }catch(e){}
  currentUserId = session ? session.user.id : null;
  const user = session && session.user ? session.user : null;
  const metadata = user && user.user_metadata ? user.user_metadata : {};
  currentUserName = String(metadata.full_name || metadata.name || metadata.display_name || metadata.preferred_username || (user && user.email ? user.email.split('@')[0] : '') || '').trim();
  if(!currentUserName) currentUserName = 'bentornato';
  const cached = readCache();
  try{
    if(cached && cached.meta && cached.meta.dirty){
      // Ci sono modifiche non ancora inviate (fatte offline o prima di chiudere l'app): riparto da quelle.
      state = Object.assign(state, cached.state);
      normalizeState();
      lastSyncedState = cached.synced || {};
      lastFetchAt = cached.meta.fetchedAt || 0;
      pendingSync = true;
    } else if(cached && !cached.legacy && (Date.now() - (cached.meta.fetchedAt||0)) < CACHE_TTL_MS){
      // Copia recente: parto subito da quella, senza interrogare il server.
      state = Object.assign(state, cached.state);
      normalizeState();
      lastSyncedState = JSON.parse(JSON.stringify(state));
      lastFetchAt = cached.meta.fetchedAt;
    } else {
      await pullFromServer(cached ? cached.state : null);
    }
  }catch(e){
    console.error('Errore nel caricamento da Supabase:', e);
    if(isNetworkError(e)){ isOffline = true; } else { syncError = friendlyError(e); }
    if(cached){
      state = Object.assign(state, cached.state);
      normalizeState();
      lastSyncedState = cached.synced || JSON.parse(JSON.stringify(cached.state));
      lastFetchAt = (cached.meta && cached.meta.fetchedAt) || 0;
      toast(isOffline ? 'Sei offline: vedi l’ultima copia salvata su questo dispositivo.' : 'Errore dal server: '+syncError+' — vedi l’ultima copia salvata.');
    } else {
      toast(isOffline ? 'Impossibile contattare il server e nessuna copia offline disponibile su questo dispositivo.' : 'Errore dal server: '+syncError);
    }
    if(!lastSyncedState) lastSyncedState = {};
  }
  normalizeState();
  let plannedTaskExpensesRemoved = false;
  state.homeTasks.forEach(task=>{
    if(task.status!=='Completato' && state.expenses.some(expense=>expense.sourceKey==='task-'+task.id)){
      removeExpense('task-'+task.id); plannedTaskExpensesRemoved = true;
    }
  });
  purgeOldTrash();
  const automaticPaymentsAdded = processScheduledBillPayments();
  const automaticInstallmentsAdded = processScheduledInstallmentPayments();
  if(plannedTaskExpensesRemoved || automaticPaymentsAdded || automaticInstallmentsAdded) await saveState();
  applyTheme();
  loadAIConfig();
  setupConnectivityHandlers();
  if(pendingSync) scheduleSync(800);
  // L'accesso vero è già garantito da Supabase (email+password). Il PIN qui diventa un
  // livello extra opzionale di "rilocchetto rapido" (utile se presti il telefono a qualcuno),
  // non è più la porta d'ingresso principale come nella versione per PC.
  if(state.settings.pinEnabled && state.settings.pin){ showLock(); }
  else { unlocked = true; document.getElementById('app').style.display=''; render(); onAppReady(); }
}

// ---------- salvataggio: subito in locale, sul server in blocco dopo un attimo ----------
async function saveState(){
  changeCounter++;
  pendingSync = true;
  writeCache();
  if(unlocked) render();
  scheduleSync();
  scheduleNotificationsSoon();
}
function scheduleSync(delay){
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, delay===undefined ? SYNC_DEBOUNCE_MS : delay);
}
async function syncNow(){
  clearTimeout(syncTimer); syncTimer = null;
  if(syncing){ resyncQueued = true; return; }
  if(!pendingSync) return;
  if(!navigator.onLine){ if(!isOffline){ isOffline = true; if(unlocked) render(); } return; }
  syncing = true;
  const statusBefore = `${isOffline}|${syncError}`;
  const snapshot = JSON.parse(JSON.stringify(state));   // fotografia: se modifichi mentre invio, la modifica non va persa
  const counterAtStart = changeCounter;
  try{
    await taccuinoDB.syncStateToTables(snapshot, lastSyncedState);
    lastSyncedState = snapshot;
    syncBackoffMs = 0; isOffline = false; syncError = null; syncErrorToasted = false;
    pendingSync = (changeCounter !== counterAtStart);
    if(!pendingSync) lastFetchAt = Date.now();
    writeCache();
    if(pendingSync) scheduleSync(300);
  }catch(e){
    console.error('Errore nel salvataggio su Supabase:', e);
    pendingSync = true;
    noteSyncFailure(e);
    writeCache();
    syncBackoffMs = Math.min((syncBackoffMs||15000)*2, 5*60*1000);   // 30s, 1min, 2min, 4min, poi ogni 5 min
    scheduleSync(syncBackoffMs);
  }finally{
    syncing = false;
    if(resyncQueued){ resyncQueued = false; scheduleSync(300); }
    if(unlocked && statusBefore !== `${isOffline}|${syncError}`) render();   // aggiorno solo se è cambiato lo stato (badge)
  }
}
function flushSync(){ return pendingSync ? syncNow() : Promise.resolve(); }

// ---------- rete: riprova quando torna la connessione o quando riapri l'app ----------
function setupConnectivityHandlers(){
  if(window._connSetup) return; window._connSetup = true;
  window.addEventListener('online', ()=>{
    syncBackoffMs = 0;
    if(pendingSync) scheduleSync(300); else maybeRefreshFromServer();
    if(isOffline && !pendingSync){ isOffline = false; if(unlocked) render(); }
  });
  window.addEventListener('offline', ()=>{ isOffline = true; if(unlocked) render(); });
  document.addEventListener('visibilitychange', ()=>{
    if(document.visibilityState === 'hidden'){ if(pendingSync) syncNow(); }
    else { syncBackoffMs = 0; if(pendingSync) scheduleSync(300); else maybeRefreshFromServer(); scheduleNotificationsSoon(); }
  });
  window.addEventListener('pagehide', ()=>{ if(pendingSync) syncNow(); });
}

// ---------- Autenticazione (email + password, tramite Supabase) ----------
async function initApp(){
  try{
    const session = await taccuinoDB.getSession();
    if(session){ await loadState(); return; }
  }catch(e){ /* nessuna sessione valida: mostro il login */ }
  showAuthScreen('login');
}
// ---------- credenziali salvate su questo dispositivo (comodità, non un vero password manager) ----------
const DEVICE_CRED_KEY = 'taccuino-device-credential';
function saveDeviceCredential(email, password){
  try{ localStorage.setItem(DEVICE_CRED_KEY, JSON.stringify({ email, password, savedAt: Date.now() })); }catch(e){}
}
function readDeviceCredential(){
  try{ const raw = localStorage.getItem(DEVICE_CRED_KEY); return raw ? JSON.parse(raw) : null; }catch(e){ return null; }
}
function forgetDeviceCredential(){
  try{ localStorage.removeItem(DEVICE_CRED_KEY); }catch(e){}
}
// Chiede se salvare l'accesso; in ogni caso, dopo la scelta, prosegue con afterFn (il login/registrazione non aspetta la risposta).
function offerSaveCredential(email, password, afterFn){
  modalLocked = true;
  window._pendingCred = { email, password };
  window._credAfterFn = afterFn;
  openModal(`
    <h3>Salvare l'accesso su questo dispositivo?</h3>
    <div class="section-label">La prossima volta potrai accedere più velocemente, senza riscrivere email e password.</div>
    <div class="notice">Le credenziali restano solo su questo telefono, mai su Supabase. Usa questa opzione solo su un dispositivo protetto da PIN, impronta o Face ID.</div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="resolveSaveCredential(false)">Non salvare</button>
      <button class="btn primary" onclick="resolveSaveCredential(true)">Salva</button>
    </div>`);
}
function resolveSaveCredential(save){
  modalLocked = false;
  const cred = window._pendingCred; window._pendingCred = null;
  if(save && cred) saveDeviceCredential(cred.email, cred.password);
  closeModal();
  const fn = window._credAfterFn; window._credAfterFn = null;
  if(fn) fn();
}
function showAuthScreen(mode, opts){
  opts = opts || {};
  const box = document.getElementById('lockScreen');
  document.getElementById('app').style.display='none';
  box.classList.add('active');
  const isSignup = mode==='signup';
  const saved = (!isSignup && !opts.manual) ? readDeviceCredential() : null;
  if(saved){
    box.innerHTML = `
      <div class="lock-box">
        <h2>Bentornato</h2>
        <div class="sub">Accedi rapidamente con l'account salvato su questo dispositivo.</div>
        <div class="notice" style="text-align:left;">${esc(saved.email)}</div>
        <div id="authError" class="notice" style="display:none;margin-bottom:12px;"></div>
        <button class="btn primary" style="width:100%;margin-bottom:10px;" onclick="quickDeviceLogin()">Accedi</button>
        <button class="link-toggle" onclick="showAuthScreen('login',{manual:true})">Usa un altro account</button>
        <div style="margin-top:10px;"><button class="link-toggle" onclick="forgetDeviceCredential(); showAuthScreen('login',{manual:true});">Dimentica questo account</button></div>
      </div>`;
    return;
  }
  box.innerHTML = `
    <div class="lock-box">
      <h2>${isSignup?'Crea il tuo account':'Bentornato'}</h2>
      <div class="sub">${isSignup?'Bastano email e password: i tuoi dati saranno solo tuoi.':'Accedi con la tua email per continuare'}</div>
      <input class="pin-input" id="auth_email" type="email" autocomplete="username" placeholder="Email" style="letter-spacing:normal;font-size:15px;text-align:left;padding-left:14px;">
      <input class="pin-input" id="auth_password" type="password" autocomplete="${isSignup?'new-password':'current-password'}" placeholder="Password" style="letter-spacing:normal;font-size:15px;text-align:left;padding-left:14px;">
      <div id="authError" class="notice" style="display:none;margin-bottom:12px;"></div>
      <button class="btn primary" style="width:100%;margin-bottom:10px;" onclick="handleAuthSubmit('${mode}')">${isSignup?'Registrati':'Accedi'}</button>
      <button class="link-toggle" onclick="showAuthScreen('${isSignup?'login':'signup'}')">${isSignup?'Hai già un account? Accedi':'Non hai un account? Registrati'}</button>
    </div>`;
  const pwInput = document.getElementById('auth_password');
  pwInput.addEventListener('keyup', (e)=>{ if(e.key==='Enter') handleAuthSubmit(mode); });
}
async function quickDeviceLogin(){
  const saved = readDeviceCredential();
  const errBox = document.getElementById('authError');
  if(!saved){ showAuthScreen('login',{manual:true}); return; }
  if(errBox) errBox.style.display='none';
  const { error } = await taccuinoDB.signIn(saved.email, saved.password);
  if(error){
    forgetDeviceCredential();
    if(errBox){ errBox.textContent = 'Le credenziali salvate non sono più valide: accedi di nuovo.'; errBox.style.display='block'; }
    setTimeout(()=>showAuthScreen('login',{manual:true}), 1200);
    return;
  }
  document.getElementById('lockScreen').classList.remove('active');
  await loadState();
}
async function handleAuthSubmit(mode){
  const email = val('auth_email').trim();
  const password = val('auth_password');
  const errBox = document.getElementById('authError');
  errBox.style.display='none';
  if(!email || !password){ errBox.textContent='Inserisci email e password.'; errBox.style.display='block'; return; }
  if(password.length<6){ errBox.textContent='La password deve avere almeno 6 caratteri.'; errBox.style.display='block'; return; }
  const fn = mode==='signup' ? taccuinoDB.signUp : taccuinoDB.signIn;
  const { data, error } = await fn(email, password);
  if(error){ errBox.textContent = error.message; errBox.style.display='block'; return; }
  const proceed = async () => {
    if(mode==='signup' && !data.session){
      errBox.className='notice';
      errBox.textContent = 'Account creato! Controlla la tua email per confermarlo, poi torna qui ad accedere.';
      errBox.style.display='block';
      return;
    }
    document.getElementById('lockScreen').classList.remove('active');
    await loadState();
  };
  const saved = readDeviceCredential();
  const alreadySavedThis = saved && saved.email===email && saved.password===password;
  if(alreadySavedThis) await proceed();
  else offerSaveCredential(email, password, proceed);
}
async function logout(){
  if(pendingSync){
    await flushSync();
    if(pendingSync && !confirm('Ci sono modifiche non ancora sincronizzate che andrebbero perse. Uscire comunque?')) return;
  }
  await taccuinoDB.signOut();
  clearLocalCaches();          // sul dispositivo non devono restare i dati dell'account appena chiuso
  // Le credenziali salvate restano: è il senso stesso del "ricorda l'accesso" — si tolgono solo
  // esplicitamente dalla schermata di accesso ("Dimentica questo account") o eliminando l'account.
  unlocked = false;
  location.reload();
}
// ---------- temi ----------
// Ogni tema definisce le stesse variabili CSS: applicarne uno significa scrivere questi valori
// come custom properties su <html>, così style.css non deve sapere nulla dei singoli temi.
const THEMES = [
  { id:'light-modern', label:'Moderno', mode:'light', desc:'Il tema originale: azzurro e bianco, pulito e luminoso.', vars:{
    paper:'#EBF8FF', 'app-background':'#EBF8FF', card:'#FFFFFF', surface:'#FDFCFA', 'input-bg':'#FFFFFF',
    ink:'#051923', 'ink-soft':'#4F7A91', line:'#CDE6F4', primary:'#0582CA', 'primary-hover':'#003554',
    'c-salute':'#00A6FB', 'c-salute-soft':'rgba(0,166,251,0.14)',
    'c-casa':'#006494', 'c-casa-soft':'rgba(0,100,148,0.13)',
    'c-salvadanaio':'#003554', 'c-salvadanaio-soft':'rgba(0,53,84,0.12)',
    'c-auto':'#051923', 'c-auto-soft':'rgba(5,25,35,0.09)',
    'c-calendario':'#0582CA', 'c-calendario-soft':'rgba(5,130,202,0.14)',
    'tab-active-bg':'#051923', 'tab-active-ink':'#FFFFFF', 'toast-bg':'#051923', 'toast-ink':'#FFFFFF'
  }},
  { id:'light-classic', label:'Classico', mode:'light', desc:'Carta e inchiostro: avorio caldo, terracotta e oliva.', vars:{
    paper:'#F6EFE2', 'app-background':'#F6EFE2', card:'#FFFDF8', surface:'#FBF3E4', 'input-bg':'#FFFFFF',
    ink:'#3B2A1E', 'ink-soft':'#8A7660', line:'#E4D5BC', primary:'#A9642B', 'primary-hover':'#7C4A1F',
    'c-salute':'#B5563F', 'c-salute-soft':'rgba(181,86,63,0.14)',
    'c-casa':'#6E7A4F', 'c-casa-soft':'rgba(110,122,79,0.14)',
    'c-salvadanaio':'#7C4A1F', 'c-salvadanaio-soft':'rgba(124,74,31,0.13)',
    'c-auto':'#3B2A1E', 'c-auto-soft':'rgba(59,42,30,0.09)',
    'c-calendario':'#A9642B', 'c-calendario-soft':'rgba(169,100,43,0.15)',
    'tab-active-bg':'#3B2A1E', 'tab-active-ink':'#FFF8EC', 'toast-bg':'#3B2A1E', 'toast-ink':'#FFF8EC'
  }},
  { id:'dark-modern', label:'Moderno', mode:'dark', desc:'Il tema scuro originale: blu notte e ciano.', vars:{
    paper:'#051923', 'app-background':'#051923', card:'#0B2A3D', surface:'#0E3348', 'input-bg':'#0A2534',
    ink:'#EAF6FF', 'ink-soft':'#7FAFC7', line:'#123B52', primary:'#00A6FB', 'primary-hover':'#33B8FC',
    'c-salute':'#00A6FB', 'c-salute-soft':'rgba(0,166,251,0.24)',
    'c-casa':'#2E9BC9', 'c-casa-soft':'rgba(0,100,148,0.30)',
    'c-salvadanaio':'#2C6F9E', 'c-salvadanaio-soft':'rgba(0,53,84,0.38)',
    'c-auto':'#8FD3F5', 'c-auto-soft':'rgba(255,255,255,0.07)',
    'c-calendario':'#39A8E0', 'c-calendario-soft':'rgba(5,130,202,0.26)',
    'tab-active-bg':'#00A6FB', 'tab-active-ink':'#051923', 'toast-bg':'#00A6FB', 'toast-ink':'#051923'
  }},
  { id:'dark-classic', label:'Classico', mode:'dark', desc:'Studio la sera: espresso scuro e rame antico.', vars:{
    paper:'#221812', 'app-background':'#221812', card:'#2E2018', surface:'#37271C', 'input-bg':'#2A1D15',
    ink:'#F3E6D3', 'ink-soft':'#BBA084', line:'#4A3626', primary:'#D89A4E', 'primary-hover':'#E8B36B',
    'c-salute':'#D2795A', 'c-salute-soft':'rgba(210,121,90,0.24)',
    'c-casa':'#8FA06B', 'c-casa-soft':'rgba(143,160,107,0.22)',
    'c-salvadanaio':'#C99A4B', 'c-salvadanaio-soft':'rgba(201,154,75,0.24)',
    'c-auto':'#E8D9C2', 'c-auto-soft':'rgba(255,255,255,0.07)',
    'c-calendario':'#D89A4E', 'c-calendario-soft':'rgba(216,154,78,0.26)',
    'tab-active-bg':'#D89A4E', 'tab-active-ink':'#221812', 'toast-bg':'#D89A4E', 'toast-ink':'#221812'
  }},
  { id:'dark-aesthetic', label:'Aesthetic', mode:'dark', desc:'Prugna e malva: tenue, morbido, un po\' sognante.', vars:{
    paper:'#160E1E', 'app-background':'#160E1E', card:'#20142B', surface:'#271A34', 'input-bg':'#1C1225',
    ink:'#F1E8FA', 'ink-soft':'#A594BE', line:'#3B2A4E', primary:'#C879D6', 'primary-hover':'#E39BEC',
    'c-salute':'#F08FB0', 'c-salute-soft':'rgba(240,143,176,0.22)',
    'c-casa':'#7FB6C9', 'c-casa-soft':'rgba(127,182,201,0.20)',
    'c-salvadanaio':'#9C8CF0', 'c-salvadanaio-soft':'rgba(156,140,240,0.22)',
    'c-auto':'#D8CCF0', 'c-auto-soft':'rgba(255,255,255,0.07)',
    'c-calendario':'#C879D6', 'c-calendario-soft':'rgba(200,121,214,0.24)',
    'tab-active-bg':'#C879D6', 'tab-active-ink':'#160E1E', 'toast-bg':'#C879D6', 'toast-ink':'#160E1E'
  }}
];
const THEME_CACHE_KEY = 'taccuino-last-theme';
// Vecchi valori salvati ('light'/'dark', da prima che esistessero 5 temi) vengono convertiti una volta per tutte.
function resolveThemeId(id){
  if(id==='light') return 'light-modern';
  if(id==='dark') return 'dark-modern';
  if(THEMES.some(t=>t.id===id)) return id;
  return 'light-modern';
}
function applyThemeVars(theme){
  const root = document.documentElement;
  root.setAttribute('data-theme', theme.mode);
  root.setAttribute('data-theme-id', theme.id);
  Object.keys(theme.vars).forEach(k => root.style.setProperty('--'+k, theme.vars[k]));
  try{ localStorage.setItem(THEME_CACHE_KEY, theme.id); }catch(e){}
}
function applyTheme(){
  state.settings.theme = resolveThemeId(state.settings.theme);
  applyThemeVars(THEMES.find(t=>t.id===state.settings.theme) || THEMES[0]);
}
function selectTheme(id){
  if(!THEMES.some(t=>t.id===id)) return;
  state.settings.theme = id;
  applyTheme();
  saveState();
}
// Applica subito l'ultimo tema usato su questo dispositivo (letto dalla cache locale, non dall'account),
// così anche la schermata di accesso — prima ancora di sapere chi sei — non mostra un lampo del tema sbagliato.
(function bootTheme(){
  let id = 'light-modern';
  try{ id = localStorage.getItem(THEME_CACHE_KEY) || id; }catch(e){}
  applyThemeVars(THEMES.find(t=>t.id===resolveThemeId(id)) || THEMES[0]);
})();

// ---------- PIN + blocco automatico ----------
function showLock(){
  const lock = document.getElementById('lockScreen');
  document.getElementById('app').style.display='none';
  lock.classList.add('active');
  lock.innerHTML = `
    <div class="lock-box">
      <div style="margin-bottom:10px;"><div class="section-icon" style="background:var(--c-calendario-soft);color:var(--c-calendario);margin:0 auto;">${ICONS.lock}</div></div>
      <h2>Bentornato</h2>
      <div class="sub">Inserisci il PIN a 4 cifre per accedere al tuo taccuino</div>
      <input class="pin-input" id="pinInput" type="password" inputmode="numeric" maxlength="4" autofocus>
      <button class="btn primary" style="width:100%;" onclick="checkPin()">Sblocca</button>
    </div>`;
  const input = document.getElementById('pinInput');
  input.addEventListener('keyup', (e)=>{ if(e.key==='Enter') checkPin(); if(input.value.length===4) checkPin(); });
}
function checkPin(){
  const input = document.getElementById('pinInput');
  const entered = input.value;
  if(entered === state.settings.pin){
    unlocked = true;
    document.getElementById('lockScreen').classList.remove('active');
    document.getElementById('app').style.display='';
    window._lastActivity = Date.now();
    render();
    onAppReady();
  } else {
    input.classList.add('shake'); input.value='';
    setTimeout(()=>input.classList.remove('shake'), 400);
    toast('PIN errato.');
  }
}
function setupAutoLock(){
  ['click','keydown','mousemove','touchstart'].forEach(evt=>document.addEventListener(evt, ()=>{ window._lastActivity = Date.now(); }, {passive:true}));
  window._lastActivity = Date.now();
  setInterval(()=>{
    if(!unlocked) return;
    const mins = state.settings.autoLockMinutes||0;
    if(mins>0 && (Date.now()-window._lastActivity) > mins*60000){ unlocked=false; showLock(); }
  }, 20000);
}
function quickUpdateSetting(key, value){
  pushUndo(); state.settings[key]=value; saveState(); toast('Impostazione aggiornata.'); }
function quickSetTheme(v){ selectTheme(v); }   // alias per compatibilità con eventuale codice esterno
function changePinFromSettings(){
  pushUndo();
  const v = val('set_newPin'); if(!v) return;
  if(!/^\d{4}$/.test(v)){ alert('Il PIN deve essere di 4 cifre numeriche.'); return; }
  state.settings.pin = v; saveState(); toast('PIN aggiornato.');
}
function maybeShowOnboarding(){
  if(!state.settings.onboardingDone){ setTimeout(openOnboardingWizard, 300); }
}
function openOnboardingWizard(){
  openModal(`
    <h3>Benvenuto nel tuo taccuino 🌿</h3>
    <div class="section-label">Due minuti per impostare le basi. Potrai sempre modificare tutto in seguito.</div>
    <div class="field"><label>Come ti chiami?</label><input id="ob_name" placeholder="Il tuo nome" value="${esc(state.settings.ownerName||'')}"></div>
    <div class="field"><label>Indirizzo di casa (opzionale)</label><input id="ob_street" placeholder="Via e numero"></div>
    <div class="field-row">
      <div class="field"><label>Città</label><input id="ob_city"></div>
      <div class="field"><label>CAP</label><input id="ob_cap"></div>
    </div>
    <div class="field"><label>PIN di accesso (4 cifre)</label><input id="ob_pin" maxlength="4" inputmode="numeric" value="${esc(state.settings.pin||'0584')}"></div>
    <div class="notice">Ti avviseremo delle scadenze con le notifiche del telefono: alla fine ti chiederò il permesso. Potrai regolare giorni di anticipo e orario da Impostazioni → Notifiche.</div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="skipOnboarding()">Salta</button>
      <button class="btn primary" onclick="finishOnboarding()">Inizia</button>
    </div>
  `);
}
function skipOnboarding(){
  state.settings.onboardingDone = true;
  closeModal(); saveState();
}
function finishOnboarding(){
  const name = val('ob_name'), street = val('ob_street'), city = val('ob_city'), cap = val('ob_cap'), pin = val('ob_pin');
  if(name) state.settings.ownerName = name;
  if(street || city || cap) state.homeInfo = {...state.homeInfo, street, city, cap};
  if(/^\d{4}$/.test(pin)) state.settings.pin = pin;
  state.settings.onboardingDone = true;
  closeModal(); saveState(); toast('Tutto pronto!'); requestWellnessNotifications();
}

// ---------- cestino + registro attività ----------
function logActivity(action, type, label){
  state.activityLog = state.activityLog || [];
  state.activityLog.unshift({id:uid(), ts:new Date().toISOString(), action, type, label});
  if(state.activityLog.length>300) state.activityLog.length = 300;
}
function trashItem(type, item, label){
  state.trash.push({id:uid(), type, data: JSON.parse(JSON.stringify(item)), deletedAt: todayStr(), label});
  logActivity('deleted', type, label);
}
function purgeOldTrash(){
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-30);
  state.trash = (state.trash||[]).filter(t=> new Date((t.deletedAt||todayStr())+'T00:00') >= cutoff);
}
function restoreFromTrash(trashId){
  pushUndo();
  const t = state.trash.find(x=>x.id===trashId); if(!t) return;
  switch(t.type){
    case 'health': state.health.push(t.data); upsertExpense('health-'+t.data.id, t.data.title||t.data.cat, t.data.cost, t.data.date, 'Salute'); syncLinkedEvent('health-next-'+t.data.id, t.data.nextDate, t.data.title||t.data.cat, 'Controllo salute · '+t.data.cat); break;
    case 'bill': state.bills.push(t.data); syncLinkedEvent('bill-due-'+t.data.id, t.data.nextDue, 'Scadenza '+t.data.provider, 'Bolletta · '+euro(t.data.amount)); break;
    case 'homeTask': state.homeTasks.push(t.data); if(t.data.status==='Completato') upsertExpense('task-'+t.data.id, t.data.title, t.data.cost, t.data.completedDate||todayStr(), 'Lavori casa'); break;
    case 'installment': state.installments.push(t.data); syncLinkedEvent('inst-due-'+t.data.id, t.data.nextDue, 'Rata '+t.data.title, 'Rata · '+euro(t.data.installmentAmount)); break;
    case 'homeDocument': state.homeDocuments.push(t.data); break;
    case 'personalDoc': state.personalDocs.push(t.data); syncLinkedEvent('persdoc-'+t.data.id, t.data.expiryDate, 'Scadenza '+(t.data.title||t.data.type), 'Documento personale'); break;
    case 'contact': state.contacts.push(t.data); break;
    case 'car': state.cars.push(t.data); break;
    case 'carEvent': { state.carEvents.push(t.data); upsertExpense('car-'+t.data.id, t.data.type, t.data.cost, t.data.date, 'Auto'); const car=state.cars.find(x=>x.id===t.data.carId); syncLinkedEvent('carevt-'+t.data.id, t.data.date, (car?car.name+' - ':'')+t.data.type, 'Auto'); break; }
    case 'event': state.events.push(t.data); break;
    case 'expense': state.expenses.push(t.data); break;
    case 'income': state.incomes.push(t.data); break;
    case 'medicine': state.medicines.push(t.data); syncLinkedEvent('med-'+t.data.id, t.data.expiryDate, 'Scadenza farmaco: '+t.data.name, 'Farmacia'); break;
    case 'seasonalTask': state.seasonalTasks.push(t.data); break;
    case 'asset': state.assets.push(t.data); break;
    case 'routine': state.wellness.routines.push(t.data); break;
  }
  state.trash = state.trash.filter(x=>x.id!==trashId);
  logActivity('restored', t.type, t.label);
  saveState(); toast('Ripristinato.');
}
function permanentlyDeleteTrash(trashId){
  pushUndo(); state.trash = state.trash.filter(x=>x.id!==trashId); saveState(); }

// ---------- spese ----------
function upsertExpense(sourceKey, title, amount, date, category){
  const amt = Number(amount)||0;
  const idx = state.expenses.findIndex(e=>e.sourceKey===sourceKey);
  if(amt<=0){ if(idx>-1) state.expenses.splice(idx,1); return; }
  const entry = {id: idx>-1?state.expenses[idx].id:uid(), sourceKey, title, amount:amt, date:date||todayStr(), category};
  if(idx>-1) state.expenses[idx]=entry; else state.expenses.push(entry);
}
function addExpense(sourceKey, title, amount, date, category, tags){
  const amt = Number(amount)||0; if(amt<=0) return;
  state.expenses.push({id:uid(), sourceKey, title, amount:amt, date:date||todayStr(), category, tags:tags||[]});
}
function removeExpense(sourceKey){ state.expenses = state.expenses.filter(e=>e.sourceKey!==sourceKey); }
function confirmDelete(msg, fn){ if(confirm(msg)) fn(); }
function pushUndo(){
  try{ undoStack.push(JSON.stringify(state)); if(undoStack.length>MAX_UNDO) undoStack.shift(); }catch(e){}
}
function undoLast(){
  if(undoStack.length===0){ toast('Niente da annullare.'); return; }
  const prev = undoStack.pop();
  try{ state = JSON.parse(prev); saveState(); toast('Ultima modifica annullata.'); }
  catch(e){ toast('Impossibile annullare.'); }
}
function addPeriod(dateStr, freq){
  const map = {'Mensile':1,'Bimestrale':2,'Trimestrale':3,'Semestrale':6,'Annuale':12};
  return addMonths(dateStr, map[freq]||1);
}
// Somma N mesi a una data "YYYY-MM-DD" senza sfasamenti di fuso e senza "sforare" a fine mese (31 gen + 1 mese = 28/29 feb).
function addMonths(dateStr, months){
  const [y,m,d] = dateStr.split('-').map(Number);
  const first = new Date(y, m-1+Number(months||1), 1);
  const dim = new Date(first.getFullYear(), first.getMonth()+1, 0).getDate();
  return isoLocal(new Date(first.getFullYear(), first.getMonth(), Math.min(d, dim)));
}

// ---------- scadenze -> calendario ----------
function syncLinkedEvent(sourceKey, date, title, sub){
  const idx = state.events.findIndex(e=>e.linkedFrom===sourceKey);
  if(!date || date < todayStr()){ if(idx>-1) state.events.splice(idx,1); return; }
  const entry = { id: idx>-1?state.events[idx].id:uid(), title, date, time:'', note: sub||'', linkedFrom: sourceKey, recur:'none' };
  if(idx>-1) state.events[idx]=entry; else state.events.push(entry);
}
function removeLinkedEvent(sourceKey){ state.events = state.events.filter(e=>e.linkedFrom!==sourceKey); }

async function openAttachment(encodedPath){
  const path = decodeURIComponent(encodedPath);
  try{
    const url = await taccuinoDB.getAttachmentUrl(path);
    window.open(url, '_blank');
  }catch(e){ toast('Non sono riuscito ad aprire questo file.'); }
}
async function readFiles(fileList){
  const uploads = [];
  for(const f of Array.from(fileList)){
    try{ uploads.push(await taccuinoDB.uploadAttachment(f)); }
    catch(e){ console.error('Upload fallito per', f.name, e); toast(`Non sono riuscito a caricare ${f.name}.`); }
  }
  return uploads; // ogni elemento: {name, path} — il file vero sta su Supabase Storage
}
function loadScript(src){
  return new Promise((resolve,reject)=>{
    if(document.querySelector(`script[src="${src}"]`)){ resolve(); return; }
    const s=document.createElement('script'); s.src=src; s.onload=()=>resolve(); s.onerror=()=>reject(new Error('Impossibile caricare '+src));
    document.head.appendChild(s);
  });
}

function nextOccurrenceDate(e){
  if(!e.date) return e.date;
  if(!e.recur || e.recur==='none') return e.date;
  const [by,bm,bd] = e.date.split('-').map(Number);
  const today = new Date(); today.setHours(0,0,0,0);
  if(e.recur==='yearly'){
    let candidate = new Date(today.getFullYear(), bm-1, bd);
    if(candidate < today) candidate = new Date(today.getFullYear()+1, bm-1, bd);
    return isoLocal(candidate).slice(0,10);
  }
  if(e.recur==='monthly'){
    let candidate = new Date(today.getFullYear(), today.getMonth(), bd);
    if(candidate < today) candidate = new Date(today.getFullYear(), today.getMonth()+1, bd);
    return isoLocal(candidate).slice(0,10);
  }
  return e.date;
}
function collectUpcoming(){
  const list = [];
  if(hasHealthConsent()) state.health.forEach(h=>{ if(h.nextDate) list.push({title:h.title||h.cat, sub:'Salute · '+h.cat, date:h.nextDate}); });
  state.bills.forEach(b=>{ if(b.nextDue) list.push({title:b.provider, sub:'Bolletta · '+euro(b.amount), date:b.nextDue}); });
  state.installments.forEach(i=>{ if(i.nextDue) list.push({title:i.title, sub:'Rata · '+euro(i.installmentAmount), date:i.nextDue}); });
  state.carEvents.forEach(c=>{ const car=state.cars.find(x=>x.id===c.carId); if(c.date) list.push({title:(car?car.name+' · ':'')+c.type, sub:'Auto', date:c.date}); });
  state.personalDocs.forEach(p=>{ if(p.expiryDate) list.push({title:p.title||p.type, sub:'Documento personale', date:p.expiryDate}); });
  if(hasHealthConsent()) state.medicines.forEach(m=>{ if(m.expiryDate) list.push({title:m.name, sub:'Farmaco in scadenza', date:m.expiryDate}); });
  state.events.forEach(e=>{ if(!e.linkedFrom) list.push({title:e.title, sub:'Calendario'+(e.time?(' · '+e.time):''), date: nextOccurrenceDate(e)}); });
  const now = new Date(todayStr()+'T00:00');
  return list.filter(x=>x.date).map(x=>({...x, diff: Math.round((new Date(x.date+'T00:00')-now)/86400000)}))
    .filter(x=>x.diff>=-1).sort((a,b)=>a.diff-b.diff);
}
function badgeFor(diff){
  if(diff<-3) return `<span class="due-badge overdue">⚠ scaduta da ${Math.abs(diff)}g</span>`;
  if(diff<0) return '<span class="due-badge urgent">scaduta</span>';
  if(diff<=7) return `<span class="due-badge urgent">tra ${diff}g</span>`;
  if(diff<=21) return `<span class="due-badge soon">tra ${diff}g</span>`;
  return `<span class="due-badge"></span>`;
}

// ---------- punteggio salute amministrativa ----------
function computeAdminScore(){
  let score = 100;
  const details = [];
  const overdue = collectUpcoming().filter(u=>u.diff<0);
  if(overdue.length){ score -= Math.min(40, overdue.length*8); details.push(`${overdue.length} scadenza/e in ritardo`); }
  const budgets = state.settings.budgets||{};
  const thisMonth = todayStr().slice(0,7);
  const byCatThisMonth = {};
  state.expenses.filter(e=>(e.date||'').startsWith(thisMonth)).forEach(e=>{ byCatThisMonth[e.category]=(byCatThisMonth[e.category]||0)+e.amount; });
  let overBudget = 0;
  Object.entries(budgets).forEach(([cat,limit])=>{ if((byCatThisMonth[cat]||0) > limit) overBudget++; });
  if(overBudget){ score -= Math.min(30, overBudget*10); details.push(`${overBudget} budget superato/i questo mese`); }
  const expiredDocs = [...state.personalDocs, ...state.medicines].filter(d=>d.expiryDate && d.expiryDate < todayStr());
  if(expiredDocs.length){ score -= Math.min(30, expiredDocs.length*10); details.push(`${expiredDocs.length} documento/farmaco scaduto`); }
  score = Math.max(0, Math.min(100, score));
  let label = 'Ottimo', color = 'var(--primary)';
  if(score<50){ label='Da migliorare'; color='#C0554D'; }
  else if(score<80){ label='Buono'; color='#C99A2E'; }
  return { score, label, color, details };
}

// ---------- briefing del mattino ----------
function maybeShowBriefing(){
  if(!state.settings.onboardingDone) return; // non sovrapporsi al wizard al primissimo avvio
  if(state.settings.lastBriefingShown === todayStr()) return;
  setTimeout(openBriefingModal, 350);
}
function buildBriefingHTML(){
  const upcoming = collectUpcoming();
  const urgent = upcoming.filter(u=>u.diff<=3);
  const overdue = upcoming.filter(u=>u.diff<0);
  const admin = computeAdminScore();
  const thisMonth = todayStr().slice(0,7);
  const spentThisMonth = state.expenses.filter(e=>(e.date||'').startsWith(thisMonth)).reduce((s,e)=>s+e.amount,0);
  return `
    <h3>Buongiorno${state.settings.ownerName?(', '+esc(state.settings.ownerName)):''} 🌤️</h3>
    <div class="section-label">${new Date().toLocaleDateString('it-IT',{weekday:'long', day:'numeric', month:'long'})}</div>
    <div class="stat-row" style="margin:14px 0;">
      <div class="stat"><div class="label">Punteggio amministrativo</div><div class="value" style="color:${admin.color};">${admin.score}</div></div>
      <div class="stat"><div class="label">Speso questo mese</div><div class="value">${euro(spentThisMonth)}</div></div>
    </div>
    ${overdue.length?`<div class="notice">⚠ Hai ${overdue.length} scadenza/e in ritardo: ${overdue.slice(0,3).map(u=>esc(u.title)).join(', ')}${overdue.length>3?'…':''}.</div>`:''}
    ${urgent.length? `<div class="section-label">Nei prossimi 3 giorni:</div>${urgent.map(u=>`<div class="due-item"><div class="due-left"><div class="t">${esc(u.title)}</div><div class="s">${esc(u.sub)}</div></div>${badgeFor(u.diff)}</div>`).join('')}` : `<div class="empty">Nessuna scadenza imminente. Giornata tranquilla!</div>`}
    ${admin.details.length? `<div class="section-label" style="margin-top:12px;">Da tenere d'occhio: ${admin.details.join(' · ')}</div>` : ''}
  `;
}
function openBriefingModal(){
  openModal(buildBriefingHTML() + `<div class="modal-actions"><button class="btn primary" onclick="closeBriefing()">Va bene, grazie</button></div>`);
  state.settings.lastBriefingShown = todayStr();
  saveState();
}
function closeBriefing(){ closeModal(); }

// ---------- aggiunta rapida a testo libero ----------
const IT_MONTHS_MAP = {gennaio:0,febbraio:1,marzo:2,aprile:3,maggio:4,giugno:5,luglio:6,agosto:7,settembre:8,ottobre:9,novembre:10,dicembre:11};
const QUICK_CAT_KEYWORDS = {
  Salute: ['dentista','medico','dottore','visita','controllo','analisi','ecografia','cardiologo','oculista'],
  Lavoro: ['bolletta','luce','gas','acqua','rata','pagamento','scadenza','fattura'],
  Famiglia: ['compleanno','festa','cena','pranzo','anniversario'],
  Sport: ['palestra','allenamento','partita','corsa','piscina'],
};
function guessQuickCategory(textLower){
  for(const [cat, words] of Object.entries(QUICK_CAT_KEYWORDS)){
    if(words.some(w=>textLower.includes(w))) return cat;
  }
  return 'Altro';
}
function parseQuickAdd(text){
  let t = text.trim();
  const lower = t.toLowerCase();
  let date = null, time = '';

  // ora: "alle 10", "alle 10:30", "ore 9"
  const timeMatch = lower.match(/\b(?:alle|ore)\s+(\d{1,2})(?:[:.](\d{2}))?/);
  if(timeMatch){ time = timeMatch[1].padStart(2,'0')+':'+(timeMatch[2]||'00'); t = t.replace(timeMatch[0],''); }

  const today = new Date();
  if(/\boggi\b/i.test(lower)){ date = todayStr(); t = t.replace(/\boggi\b/i,''); }
  else if(/\bdopodomani\b/i.test(lower)){ const d=new Date(today); d.setDate(d.getDate()+2); date=isoLocal(d).slice(0,10); t=t.replace(/\bdopodomani\b/i,''); }
  else if(/\bdomani\b/i.test(lower)){ const d=new Date(today); d.setDate(d.getDate()+1); date=isoLocal(d).slice(0,10); t=t.replace(/\bdomani\b/i,''); }
  else {
    // dd/mm o dd/mm/yyyy
    const dm = lower.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if(dm){
      let yy = dm[3] ? (dm[3].length===2?'20'+dm[3]:dm[3]) : String(today.getFullYear());
      date = `${yy}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`;
      t = t.replace(dm[0],'');
    } else {
      // "15 marzo" oppure "15 marzo 2027"
      const im = lower.match(/(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+(\d{4}))?/);
      if(im){
        const yy = im[3] ? Number(im[3]) : today.getFullYear();
        const d = new Date(yy, IT_MONTHS_MAP[im[2]], Number(im[1]));
        date = isoLocal(d).slice(0,10);
        t = t.replace(im[0],'');
      }
    }
  }
  if(!date) date = todayStr();
  const category = guessQuickCategory(lower);
  const title = t.replace(/\s+/g,' ').trim() || 'Nuovo impegno';
  return { title, date, time, category };
}
async function runQuickAdd(){
  const input = document.getElementById('quickAddInput');
  const text = input ? input.value.trim() : '';
  if(!text){ toast('Scrivi qualcosa prima di aggiungere.'); return; }
  pushUndo();
  let parsed;
  if(aiAvailable){
    try{
      const d = await taccuinoDB.askAI({ mode:'quickadd', question:text, today: todayStr() });
      if(d && d.parsed) parsed = { title:d.parsed.title, date:d.parsed.date, time:d.parsed.time||'', category:d.parsed.category||'Altro' };
    }catch(e){ /* limite raggiunto, offline o errore: uso l'interpretazione locale qui sotto */ }
  }
  if(!parsed) parsed = parseQuickAdd(text);
  const item = { id:uid(), title: parsed.title.charAt(0).toUpperCase()+parsed.title.slice(1), date: parsed.date, time: parsed.time, note:'', recur:'none', category: parsed.category };
  state.events.push(item);
  logActivity('added','event', item.title+' (aggiunta rapida)');
  saveState();
  if(input) input.value='';
  toast(`Aggiunto "${item.title}" al ${fmtD(item.date)}${item.time?(' alle '+item.time):''}. Controllalo in Calendario.`);
}

// ---------- MODAL ----------
function uniqueHints(values){ return [...new Set(values.flatMap(value=>Array.isArray(value)?value:[value]).map(value=>String(value||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it')); }
function applyFieldHints(){
  const modal = document.getElementById('modalBody');
  if(!modal) return;
  const hints = {
    f_provider: uniqueHints(state.bills.map(b=>b.provider)),
    f_title: uniqueHints([
      ...state.health.map(x=>x.title), ...state.homeTasks.map(x=>x.title), ...state.installments.map(x=>x.title),
      ...state.homeDocuments.map(x=>x.title), ...state.personalDocs.map(x=>x.title), ...state.events.map(x=>x.title),
      ...state.expenses.map(x=>x.title)
    ]),
    f_category: uniqueHints([
      ...state.expenses.map(x=>x.category), ...state.events.map(x=>x.category), ...state.contacts.map(x=>x.category),
      ...state.wellness.routines.map(x=>x.category)
    ]),
    f_name: uniqueHints([...state.medicines.map(x=>x.name), ...state.cars.map(x=>x.name), ...state.contacts.map(x=>x.name), ...state.assets.map(x=>x.name)]),
    f_city: uniqueHints([state.homeInfo.city]),
    f_method: uniqueHints(state.bills.map(b=>b.method)),
    f_med: uniqueHints(state.health.map(x=>x.med)),
    f_tags: uniqueHints([
      ...state.health.flatMap(x=>x.tags||[]), ...state.homeTasks.flatMap(x=>x.tags||[]), ...state.homeDocuments.flatMap(x=>x.tags||[]),
      ...state.personalDocs.flatMap(x=>x.tags||[]), ...state.expenses.flatMap(x=>x.tags||[]), ...state.carEvents.flatMap(x=>x.tags||[])
    ])
  };
  Object.entries(hints).forEach(([fieldId, values])=>{
    const input = modal.querySelector('#'+fieldId);
    if(!input || input.tagName==='SELECT' || !values.length) return;
    const listId = `${fieldId}Hints`;
    input.setAttribute('list', listId);
    const datalist = document.createElement('datalist');
    datalist.id = listId;
    values.forEach(value=>{
      const option = document.createElement('option');
      option.value = value;
      datalist.appendChild(option);
    });
    modal.appendChild(datalist);
  });
}
function openModal(html){ document.getElementById('modalBody').innerHTML = html; applyFieldHints(); document.getElementById('overlay').classList.add('active'); }
function closeModal(){ modalLocked = false; stopFamilyScanner(); document.getElementById('overlay').classList.remove('active'); }
document.getElementById('overlay').addEventListener('click', (e)=>{ if(e.target.id==='overlay' && !modalLocked) closeModal(); });

// ---------- RICERCA + TAG ----------
function buildSearchIndex(){
  const idx = [];
  if(hasHealthConsent()) state.health.forEach(h=>idx.push({type:'Salute', label:h.title||h.cat, sub:h.cat, text:(h.title+' '+h.cat+' '+(h.desc||'')+' '+(h.med||'')+' '+(h.tags||[]).join(' ')).toLowerCase(), tags:h.tags||[], go:()=>{ setTab('health'); openHealthForm(h.id); }}));
  state.bills.forEach(b=>idx.push({type:'Bolletta', label:b.provider, sub:b.frequency||'', text:(b.provider+' '+(b.method||'')).toLowerCase(), tags:[], go:()=>{ setTab('house'); openBillForm(b.id); }}));
  state.homeTasks.forEach(t=>idx.push({type:'Lavoro casa', label:t.title, sub:t.status, text:(t.title+' '+(t.note||'')+' '+(t.tags||[]).join(' ')).toLowerCase(), tags:t.tags||[], go:()=>{ setTab('house'); openTaskForm(t.id); }}));
  state.installments.forEach(i=>idx.push({type:'Rata', label:i.title, sub:'', text:(i.title||'').toLowerCase(), tags:[], go:()=>{ setTab('house'); openInstForm(i.id); }}));
  state.homeDocuments.forEach(d=>idx.push({type:'Documento casa', label:d.title, sub:d.category, text:(d.title+' '+(d.note||'')+' '+d.category+' '+(d.tags||[]).join(' ')).toLowerCase(), tags:d.tags||[], go:()=>{ setTab('house'); openDocForm(d.id); }}));
  state.personalDocs.forEach(p=>idx.push({type:'Documento personale', label:p.title||p.type, sub:p.type, text:(p.title+' '+p.type+' '+(p.note||'')+' '+(p.tags||[]).join(' ')).toLowerCase(), tags:p.tags||[], go:()=>{ setTab('admin'); openPersonalDocForm(p.id); }}));
  state.contacts.forEach(c=>idx.push({type:'Contatto', label:c.name, sub:c.category, text:(c.name+' '+c.category+' '+(c.phone||'')).toLowerCase(), tags:[], go:()=>{ setTab('admin'); openContactForm(c.id); }}));
  if(hasHealthConsent()) state.medicines.forEach(m=>idx.push({type:'Farmaco', label:m.name, sub:m.expiryDate?fmtD(m.expiryDate):'', text:(m.name+' '+(m.note||'')+' '+(m.tags||[]).join(' ')).toLowerCase(), tags:m.tags||[], go:()=>{ setTab('health'); openMedicineForm(m.id); }}));
  state.seasonalTasks.forEach(s=>idx.push({type:'Manutenzione stagionale', label:s.title, sub:'', text:(s.title+' '+(s.note||'')).toLowerCase(), tags:[], go:()=>{ setTab('house'); openSeasonalForm(s.id); }}));
  (state.incomes||[]).forEach(i=>idx.push({type:'Entrata', label:i.title, sub:i.category||'', text:((i.title||'')+' '+(i.category||'')).toLowerCase(), tags:[], go:()=>{ setTab('savings'); openIncomeForm(i.id); }}));
  state.assets.forEach(a=>idx.push({type:'Bene', label:a.name, sub:'', text:(a.name+' '+(a.note||'')).toLowerCase(), tags:[], go:()=>{ setTab('admin'); openAssetForm(a.id); }}));
  (state.wellness.routines||[]).forEach(r=>idx.push({type:'Benessere', label:r.label, sub:r.category, text:(r.label+' '+r.category).toLowerCase(), tags:[], go:()=>{ setTab('wellness'); openRoutineForm(r.id); }}));
  state.cars.forEach(c=>idx.push({type:'Auto', label:c.name, sub:c.plate||'', text:(c.name+' '+(c.model||'')+' '+(c.plate||'')).toLowerCase(), tags:[], go:()=>{ setTab('cars'); }}));
  state.carEvents.forEach(e=>{ const car=state.cars.find(x=>x.id===e.carId); idx.push({type:'Evento auto', label:e.type+(car?(' · '+car.name):''), sub:e.date, text:(e.type+' '+(e.note||'')+' '+(e.tags||[]).join(' ')).toLowerCase(), tags:e.tags||[], go:()=>{ setTab('cars'); }}); });
  state.events.filter(e=>!e.linkedFrom).forEach(e=>idx.push({type:'Calendario', label:e.title, sub:fmtD(e.date), text:(e.title+' '+(e.note||'')).toLowerCase(), tags:[], go:()=>jumpToCalendarEvent(e.id)}));
  return idx;
}
function onSearchInput(q){ searchQuery = q; renderSearchDropdown(); }
function renderSearchDropdown(){
  const box = document.getElementById('searchResults'); if(!box) return;
  const q = searchQuery.trim().toLowerCase();
  if(q.length<2){ box.innerHTML=''; box.classList.remove('active'); return; }
  const results = buildSearchIndex().filter(r=>r.text.includes(q)).slice(0,10);
  if(results.length===0){ box.innerHTML = `<div class="search-empty">Nessun risultato per "${esc(searchQuery)}"</div>`; box.classList.add('active'); return; }
  box.innerHTML = results.map((r,i)=>`
    <div class="search-result-item" onclick="runSearchResult(${i})">
      <span class="tag">${esc(r.type)}</span>
      <div><div class="item-title" style="font-size:13px;">${esc(r.label)}</div><div class="item-meta">${esc(r.sub||'')}</div></div>
    </div>`).join('');
  box.classList.add('active'); window._searchResults = results;
}
function runSearchResult(i){
  const r = window._searchResults[i];
  document.getElementById('searchResults').classList.remove('active');
  document.getElementById('searchInput').value=''; searchQuery='';
  if(r) r.go();
}
function jumpToCalendarEvent(id){
  const e = state.events.find(x=>x.id===id); if(!e) return;
  const [y,m,d] = e.date.split('-').map(Number);
  calYear=y; calMonth=m-1; calMode='month'; setTab('calendar'); openDay(d);
}
// ---------- ricerca a voce ----------
function startVoiceSearch(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = document.getElementById('searchMicBtn');
  if(!SR){ toast('Il riconoscimento vocale non è supportato da questo browser (funziona su Chrome/Android).'); return; }
  const recognition = new SR();
  recognition.lang = 'it-IT';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  if(btn) btn.classList.add('listening');
  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    const input = document.getElementById('searchInput');
    if(input){ input.value = text; input.focus(); }
    searchQuery = text;
    renderSearchDropdown();
  };
  recognition.onerror = () => { toast('Non ho capito, riprova.'); };
  recognition.onend = () => { if(btn) btn.classList.remove('listening'); };
  recognition.start();
}
function filterByTag(tag){
  const results = buildSearchIndex().filter(r=>(r.tags||[]).includes(tag));
  openModal(`
    <h3>Etichetta #${esc(tag)}</h3>
    ${results.length? results.map((r,i)=>`
      <div class="item" style="cursor:pointer;" onclick="closeModal(); (window._tagResults[${i}]).go();">
        <div class="item-top"><div><span class="tag">${esc(r.type)}</span><div class="item-title">${esc(r.label)}</div><div class="item-meta">${esc(r.sub||'')}</div></div></div>
      </div>`).join('') : `<div class="empty">Nessun altro elemento con questa etichetta.</div>`}
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Chiudi</button></div>
  `);
  window._tagResults = results;
}
document.addEventListener('click', (e)=>{
  const wrap = document.getElementById('searchWrap');
  if(wrap && !wrap.contains(e.target)){ const box=document.getElementById('searchResults'); if(box) box.classList.remove('active'); }
});

// ---------- calcoli mensili/annuali ----------
function sumForMonth(m){ return state.expenses.filter(e=>(e.date||'').startsWith(m)).reduce((s,e)=>s+e.amount,0); }
function monthlyTotalsForYear(year){
  const arr = new Array(12).fill(0);
  state.expenses.forEach(e=>{ if(!e.date) return; const [y,m] = e.date.split('-').map(Number); if(y===year) arr[m-1]+=e.amount; });
  return arr;
}
const MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const CHART_COLORS = ['#00A6FB','#0582CA','#006494','#003554','#051923','#7EC8F2','#4F7A91'];

// ---------- RENDER ----------
function render(){
  const app = document.getElementById('app');
  const tabs = document.querySelector('nav.tabs');
  const tabsScrollLeft = tabs ? tabs.scrollLeft : 0;
  app.innerHTML = `
    <div class="header">
      <div class="header-title">
        <h1>Ciao ${esc((state.settings.ownerName || '').trim() || currentUserName || 'bentornato')} ${syncBadgeHTML()}</h1>
        <div class="sub">Un piccolo spazio tutto tuo, per prenderti cura di ciò che conta ✨</div>
      </div>
      <div class="header-right">
        <button class="btn icon-btn" title="Recap giornaliero" aria-label="Recap giornaliero" onclick="openBriefingModal()">${ICONS.briefing}</button>
        <button class="btn icon-btn" title="Impostazioni" aria-label="Impostazioni" onclick="setTab('settings')">${ICONS.gear}</button>
      </div>
    </div>
    <div class="search-wrap" id="searchWrap">
      <div class="search-box">${ICONS.search}<input id="searchInput" placeholder="Cerca ovunque…" oninput="onSearchInput(this.value)" onfocus="renderSearchDropdown()"><button class="mic-btn" id="searchMicBtn" title="Cerca a voce" onclick="startVoiceSearch()">${ICONS.mic}</button></div>
      <div class="search-results" id="searchResults"></div>
    </div>
    <nav class="tabs">
      ${tabBtn('home','calendar','Panoramica')}
      ${tabBtn('health','health','Salute')}
      ${tabBtn('house','house','Casa')}
      ${tabBtn('savings','piggy','Salvadanaio')}
      ${tabBtn('cars','car','Auto')}
      ${tabBtn('calendar','calendar','Calendario')}
      ${tabBtn('wellness','droplet','Benessere')}
      ${tabBtn('admin','admin','Amministrazione')}
    </nav>
    <div class="panel ${activeTab==='home'?'active':''}">${renderHome()}</div>
    <div class="panel ${activeTab==='health'?'active':''}">${renderHealth()}</div>
    <div class="panel ${activeTab==='house'?'active':''}">${renderHouse()}</div>
    <div class="panel ${activeTab==='savings'?'active':''}">${renderSavings()}</div>
    <div class="panel ${activeTab==='cars'?'active':''}">${renderCars()}</div>
    <div class="panel ${activeTab==='calendar'?'active':''}">${renderCalendar()}</div>
    <div class="panel ${activeTab==='wellness'?'active':''}">${renderWellness()}</div>
    <div class="panel ${activeTab==='admin'?'active':''}">${renderAdmin()}</div>
    <div class="panel ${activeTab==='settings'?'active':''}">${renderSettings()}</div>
    ${planHas('ai') ? `<div class="ai-assistant" id="aiAssistant">
      <div class="ai-panel" id="aiPanel" hidden>
        <div class="ai-panel-head"><strong>Assistente</strong><button class="ai-close" title="Chiudi assistente" onclick="toggleAIAssistant()">×</button></div>
        <div class="ai-panel-sub">Chiedimi qualcosa sui tuoi dati.</div>
        <div id="aiAskAnswer"></div>
        <div class="ai-input-row"><input id="aiAskInput" placeholder="Scrivi una domanda…" onkeyup="if(event.key==='Enter') askTaccuino()"><button class="btn primary" onclick="askTaccuino()">Invia</button></div>
      </div>
      <button class="ai-fab" title="Apri assistente AI" aria-label="Apri assistente AI" onclick="toggleAIAssistant()"><span aria-hidden="true">🤖</span></button>
    </div>` : ''}
  `;
  const newTabs = app.querySelector('nav.tabs');
  if(newTabs) newTabs.scrollLeft = tabsScrollLeft;
  if(activeTab==='home') setTimeout(renderYearlyChart, 0);
  if(activeTab==='savings') setTimeout(renderSavingsCharts, 0);
}
function tabBtn(id,icon,label){ return `<button class="${activeTab===id?'active':''}" onclick="setTab('${id}')">${ICONS[icon]}${label}</button>`; }
function setTab(id){ activeTab=id; render(); }

// ===== HOME =====
function renderHome(){
  const totalSpese = state.expenses.reduce((s,e)=>s+e.amount,0);
  const upcoming = collectUpcoming().slice(0,10);
  const thisMonth = todayStr().slice(0,7);
  const lastMonthDate = new Date(new Date().getFullYear(), new Date().getMonth()-1, 1);
  const lastMonth = isoLocal(lastMonthDate).slice(0,7);
  const curM = sumForMonth(thisMonth), prevM = sumForMonth(lastMonth);
  const diffPct = prevM>0 ? Math.round(((curM-prevM)/prevM)*100) : null;
  const year = new Date().getFullYear();
  const yearTotal = state.expenses.filter(e=>(e.date||'').startsWith(String(year))).reduce((s,e)=>s+e.amount,0);
  const healthVisits = !hasHealthConsent() ? 0 : state.health.filter(h=>(h.date||'').startsWith(String(year))).length;
  const carCostYear = state.carEvents.filter(e=>(e.date||'').startsWith(String(year))).reduce((s,e)=>s+(Number(e.cost)||0),0);
  const yearIncome = monthlyIncomeForYear(year).reduce((s,v)=>s+v,0);
  const admin = computeAdminScore();

  return `
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Aggiungi rapido</h2>${aiAvailable?'<span class="tag" style="background:var(--c-salute-soft);color:var(--c-salute);border-color:transparent;">✨ AI</span>':''}</div>
    <div class="section-label">Scrivi un impegno es. "dentista domani alle 10" o "revisione auto 15 marzo" — creo un impegno in calendario per te 📆</div>
    <div class="quick-add-row">
      <input id="quickAddInput" placeholder="Scrivi qui…" onkeyup="if(event.key==='Enter') runQuickAdd()">
      <button class="btn primary" onclick="runQuickAdd()">Aggiungi</button>
    </div>
  </div>
  <div class="stat-row">
    <div class="stat"><div class="label">Spese registrate</div><div class="value">${euro(totalSpese)}</div></div>
    <div class="stat"><div class="label">Spese questo mese</div><div class="value">${euro(curM)}</div>${diffPct!==null?`<div class="item-meta" style="margin-top:2px;">${diffPct>=0?'+':''}${diffPct}% rispetto al mese scorso</div>`:''}</div>
    <div class="stat"><div class="label">Auto in gestione</div><div class="value">${state.cars.filter(c=>!c.archived).length}</div></div>
    <div class="stat"><div class="label">Punteggio amministrativo</div><div class="value" style="color:${admin.color};">${admin.score}</div><div class="item-meta">${admin.label}</div></div>
  </div>
  <div class="card">
    <div class="card-head"><div class="title-group">${sectionIcon('calendar','var(--c-calendario)','var(--c-calendario-soft)')}<h2>Prossime scadenze</h2></div></div>
    <div class="section-label">Le scadenze di salute, bollette, rate, auto, farmaci e documenti personali vengono aggiunte automaticamente anche al Calendario. Giorni di anticipo e notifiche: in Impostazioni.</div>
    ${upcoming.length? upcoming.map(u=>`<div class="due-item"><div class="due-left"><div class="t">${esc(u.title)}</div><div class="s">${esc(u.sub)}</div></div>${u.diff>21?`<span class="due-badge">${fmtD(u.date)}</span>`:badgeFor(u.diff)}</div>`).join('') : `<div class="empty">Nessuna scadenza imminente. Aggiungine da Salute, Casa, Auto o Calendario.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:17px;">Riepilogo ${year}</h2></div>
    <div class="stat-row">
      <div class="stat"><div class="label">Speso quest'anno</div><div class="value">${euro(yearTotal)}</div></div>
      <div class="stat"><div class="label">Entrate quest'anno</div><div class="value" style="color:#4C8C4A;">${euro(yearIncome)}</div></div>
      <div class="stat"><div class="label">Saldo quest'anno</div><div class="value" style="color:${(yearIncome-yearTotal)>=0?'#4C8C4A':'#C0554D'};">${euro(yearIncome-yearTotal)}</div></div>
      <div class="stat"><div class="label">Visite/controlli salute</div><div class="value">${healthVisits}</div></div>
      <div class="stat"><div class="label">Spese auto</div><div class="value">${euro(carCostYear)}</div></div>
    </div>
    <div class="chart-wrap"><canvas id="chartYearly" height="90"></canvas></div>
  </div>`;
}
function toggleAIAssistant(){
  if(!planHas('ai')){ openPaywall('🔒 PREMIUM · L’assistente AI è incluso nel piano Premium.'); return; }
  const panel = document.getElementById('aiPanel');
  if(!panel) return;
  panel.hidden = !panel.hidden;
  if(!panel.hidden) document.getElementById('aiAskInput')?.focus();
}
function buildAIContext(){
  return JSON.stringify({
    oggi: todayStr(),
    speseRecenti: state.expenses.slice(-30).map(e=>({data:e.date,importo:e.amount,categoria:e.category,descrizione:e.description||e.note||''})),
    prossimeScadenze: collectUpcoming().slice(0,20).map(e=>({data:e.date,titolo:e.title,info:e.sub||''})),
    auto: state.cars.map(c=>({nome:c.name,modello:c.model,targa:c.plate})),
    bollette: state.bills.map(b=>({fornitore:b.provider,frequenza:b.frequency,importo:b.amount,scadenza:b.nextDue}))
  });
}
async function askTaccuino(){
  const input = document.getElementById('aiAskInput');
  const answerBox = document.getElementById('aiAskAnswer');
  const question = input ? input.value.trim() : '';
  if(!question){ toast('Scrivi una domanda prima di inviarla.'); return; }
  if(!aiAvailable){ openPaywall('🔒 PREMIUM · L’assistente AI è incluso nel piano Premium.'); return; }
  if(!navigator.onLine){ toast('Serve la connessione per usare l’assistente.'); return; }
  if(input) input.disabled = true;
  if(answerBox) answerBox.innerHTML = `<div class="section-label" style="margin-top:10px;">Sto pensando…</div>`;
  try{
    const d = await taccuinoDB.askAI({ mode:'chat', question, context: buildAIContext(), today: todayStr() });
    if(answerBox){
      answerBox.innerHTML = d && d.answer
        ? `<div class="item ai-answer"><div class="item-desc" style="white-space:pre-wrap;">${esc(d.answer)}</div></div>${typeof d.remaining==='number'?`<div class="item-meta" style="margin-top:6px;">Richieste AI rimaste oggi: ${d.remaining}</div>`:''}`
        : `<div class="notice" style="margin-top:10px;">La risposta è vuota, riprova.</div>`;
    }
    if(input) input.value = '';
  }catch(e){
    if(e.code==='premium_required'){ currentPlan = 'free'; recomputeAI(); openPaywall('🔒 PREMIUM · L’assistente AI è incluso nel piano Premium.'); if(answerBox) answerBox.innerHTML=''; }
    else if(answerBox) answerBox.innerHTML = `<div class="notice" style="margin-top:10px;">${esc(e.message||'Non riesco a contattare l’assistente.')}</div>`;
  }finally{
    if(input) input.disabled = false;
  }
}
function renderYearlyChart(){
  const canvas = document.getElementById('chartYearly'); if(!canvas || typeof Chart==='undefined') return;
  const year = new Date().getFullYear();
  if(chartYearly) chartYearly.destroy();
  chartYearly = new Chart(canvas, { type:'bar', data:{ labels:MONTHS_SHORT, datasets:[
    { label:'Entrate', data:monthlyIncomeForYear(year), backgroundColor:'#4C8C4A', borderRadius:6 },
    { label:'Spese', data:monthlyTotalsForYear(year), backgroundColor:'#0582CA', borderRadius:6 }
  ]}, options:{ plugins:{legend:{display:true, position:'bottom', labels:{boxWidth:10,font:{size:11}}}}, scales:{ y:{ beginAtZero:true } } } });
}

// ===== SALUTE =====
const HEALTH_CATS = ['Infortunio / Frattura','Vista','Cardiologia','Ecografia','Analisi del sangue','Podologia','Altro'];
function renderHealth(){
  if(!hasHealthConsent()) return healthConsentPlaceholder();
  const items = [...state.health].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  return `
  <div class="card">
    <div class="card-head">
      <div class="title-group">${sectionIcon('health','var(--c-salute)','var(--c-salute-soft)')}<h2>Salute</h2></div>
      <div style="display:flex; flex-direction:column;gap:8px;">
        <button class="btn subtle" onclick="openMedicalExport()">Esporta spese detraibili</button>
        <button class="btn primary" onclick="openHealthForm()">Aggiungi voce</button>
      </div>
    </div>
    ${items.length? items.map(h=>`
      <div class="item">
        <div class="item-top">
          <div>
            <span class="tag">${esc(h.cat)}</span>
            ${h.recurMonths?`<span class="tag badge-recur">ogni ${h.recurMonths} mesi</span>`:''}
            <div class="item-title">${esc(h.title||h.cat)}</div>
            <div class="item-meta">${h.date?('Data: '+fmtD(h.date)):''} ${h.nextDate?(' · Prossimo controllo: '+fmtD(h.nextDate)):''}</div>
          </div>
          <div class="item-actions">
            ${h.recurMonths?`<button class="btn small subtle" onclick="markHealthDone('${h.id}')">Effettuato</button>`:''}
            <button class="btn small ghost" onclick="openHealthForm('${h.id}')">Modifica</button>
            <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questa voce di salute?', ()=>deleteHealth('${h.id}'))">Elimina</button>
          </div>
        </div>
        ${h.desc?`<div class="item-desc">${esc(h.desc)}</div>`:''}
        ${h.med?`<div class="item-meta" style="margin-top:6px;">💊 Medicinale usato: <strong>${esc(h.med)}</strong></div>`:''}
        ${h.cost?`<div class="item-meta">Costo: ${euro(h.cost)}</div>`:''}
        ${h.files&&h.files.length?`<div class="files-row">${h.files.map((f)=>`<span class="file-chip">📎 <a href="#" onclick="openAttachment('${encodeURIComponent(f.path)}'); return false;">${esc(f.name)}</a></span>`).join('')}</div>`:''}
        ${tagsChips(h.tags)}
      </div>`).join('') : `<div class="empty">Ancora nessuna voce. Aggiungi infortuni, visite o controlli.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Farmacia</h2><button class="btn primary" onclick="openMedicineForm()">Aggiungi farmaco</button></div>
    <div class="section-label">Tieni traccia dei farmaci a casa con una scadenza da monitorare (specie quelli cronici).</div>
    ${[...state.medicines].sort((a,b)=>(a.expiryDate||'').localeCompare(b.expiryDate||'')).map(m=>`
      <div class="item"><div class="item-top">
        <div><div class="item-title">${esc(m.name)}</div><div class="item-meta">${m.expiryDate?('Scade il '+fmtD(m.expiryDate)):'Nessuna scadenza impostata'}</div>${m.note?`<div class="item-desc">${esc(m.note)}</div>`:''}${tagsChips(m.tags)}</div>
        <div class="item-actions"><button class="btn small ghost" onclick="openMedicineForm('${m.id}')">Modifica</button><button class="btn small danger ghost" onclick="confirmDelete('Eliminare questo farmaco?', ()=>deleteMedicine('${m.id}'))">Elimina</button></div>
      </div></div>`).join('') || `<div class="empty">Nessun farmaco monitorato.</div>`}
  </div>`;
}
function openMedicineForm(id){
  const m = id ? state.medicines.find(x=>x.id===id) : {name:'',expiryDate:'',note:'',tags:[]};
  openModal(`
    <h3>${id?'Modifica farmaco':'Nuovo farmaco'}</h3>
    <div class="field"><label>Nome</label><input id="f_name" value="${esc(m.name||'')}"></div>
    <div class="field"><label>Scadenza</label><input type="date" id="f_expiryDate" value="${m.expiryDate||''}"></div>
    <div class="field"><label>Note (es. dosaggio, a cosa serve)</label><textarea id="f_note">${esc(m.note||'')}</textarea></div>
    <div class="field"><label>Etichette (separate da virgola)</label><input id="f_tags" value="${esc((m.tags||[]).join(', '))}"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveMedicine('${id||''}')">Salva</button></div>
  `);
}
function saveMedicine(id){
  pushUndo();
  let item = id ? state.medicines.find(x=>x.id===id) : {id:uid()};
  item.name=val('f_name'); item.expiryDate=val('f_expiryDate'); item.note=val('f_note'); item.tags=parseTags(val('f_tags'));
  if(!id) state.medicines.push(item);
  syncLinkedEvent('med-'+item.id, item.expiryDate, 'Scadenza farmaco: '+item.name, 'Farmacia');
  logActivity(id?'edited':'added','medicine', item.name);
  closeModal(); saveState(); toast('Farmaco salvato.');
}
function deleteMedicine(id){
  pushUndo();
  const m = state.medicines.find(x=>x.id===id); if(!m) return;
  trashItem('medicine', m, m.name);
  state.medicines=state.medicines.filter(x=>x.id!==id); removeLinkedEvent('med-'+id); saveState();
}
function findPreviousHealth(title, excludeId){
  const t = (title||'').trim().toLowerCase(); if(!t) return null;
  const matches = state.health.filter(h=>h.id!==excludeId && (h.title||'').trim().toLowerCase()===t).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  return matches[0] || null;
}
function checkHealthHistory(title){
  const hint = document.getElementById('healthHistoryHint'); if(!hint) return;
  const prev = findPreviousHealth(title, null);
  if(prev){
    hint.style.display='block';
    hint.innerHTML = `Hai già registrato "<strong>${esc(prev.title)}</strong>" il ${fmtD(prev.date)}.${prev.med?(' Avevi usato: <strong>'+esc(prev.med)+'</strong>.'):' Non avevi indicato un medicinale.'}`;
  } else { hint.style.display='none'; }
}
function openHealthForm(id){
  const h = id ? state.health.find(x=>x.id===id) : {cat:HEALTH_CATS[0],title:'',date:todayStr(),nextDate:'',desc:'',med:'',cost:'',recurMonths:'',files:[],tags:[]};
  openModal(`
    <h3>${id?'Modifica voce salute':'Nuova voce salute'}</h3>
    <div class="field"><label>Ambito</label><select id="f_cat">${HEALTH_CATS.map(c=>`<option ${h.cat===c?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Titolo (es. "Costola incrinata", "Emorroidi")</label><input id="f_title" value="${esc(h.title||'')}" oninput="checkHealthHistory(this.value)"></div>
    <div id="healthHistoryHint" class="notice" style="display:none;margin-bottom:12px;"></div>
    <div class="field-row">
      <div class="field"><label>Data evento / visita</label><input type="date" id="f_date" value="${h.date||''}"></div>
      <div class="field"><label>Prossimo controllo (opzionale)</label><input type="date" id="f_nextDate" value="${h.nextDate||''}"></div>
    </div>
    <div class="field"><label>Ripeti automaticamente ogni tot mesi (opzionale)</label><input type="number" id="f_recurMonths" value="${h.recurMonths||''}" placeholder="es. 12 per un controllo annuale"></div>
    <div class="field"><label>Dettagli (es. gradi vista, diagnosi, esito)</label><textarea id="f_desc">${esc(h.desc||'')}</textarea></div>
    <div class="field"><label>Medicinale / cura usata</label><input id="f_med" value="${esc(h.med||'')}" placeholder="così la prossima volta sai da dove partire"></div>
    <div class="field"><label>Costo (opzionale, va nel salvadanaio e nell'export spese mediche)</label><input type="number" step="0.01" id="f_cost" value="${h.cost||''}"></div>
    <div class="field"><label>Etichette (separate da virgola)</label><input id="f_tags" value="${esc((h.tags||[]).join(', '))}" placeholder="es. ristrutturazione, famiglia"></div>
    <div class="field"><label>Foto / documenti</label><div class="file-pickers"><label class="btn small subtle">📷 Scatta foto<input type="file" id="f_camera" accept="image/*" capture="environment" hidden></label><label class="btn small subtle">🖼️ Galleria / file<input type="file" id="f_files" multiple accept="image/*,.pdf" hidden></label></div>
      <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">${h.files&&h.files.length?h.files.length+' file già allegati (verranno mantenuti)':'Nessun file allegato'}</div>
    </div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveHealth('${id||''}')">Salva</button></div>
  `);
  if(id) checkHealthHistory(h.title);
}
async function saveHealth(id){
  pushUndo();
  if(!val('f_title') && !val('f_cat')){ alert('Aggiungi almeno un titolo.'); return; }
  const newFiles = await readFiles([...document.getElementById('f_files').files,...(document.getElementById('f_camera')?.files||[])]);
  let item = id ? state.health.find(x=>x.id===id) : {id:uid(), files:[]};
  item.cat = val('f_cat'); item.title = val('f_title'); item.date = val('f_date');
  item.nextDate = val('f_nextDate'); item.desc = val('f_desc'); item.med = val('f_med');
  item.cost = val('f_cost'); item.recurMonths = val('f_recurMonths'); item.tags = parseTags(val('f_tags'));
  item.files = (item.files||[]).concat(newFiles);
  if(!id) state.health.push(item);
  upsertExpense('health-'+item.id, item.title||item.cat, item.cost, item.date, 'Salute');
  syncLinkedEvent('health-next-'+item.id, item.nextDate, item.title||item.cat, 'Controllo salute · '+item.cat);
  logActivity(id?'edited':'added', 'health', item.title||item.cat);
  closeModal(); saveState(); toast('Voce salute salvata.');
}
function markHealthDone(id){
  pushUndo();
  const h = state.health.find(x=>x.id===id); if(!h) return;
  h.date = todayStr(); h.nextDate = addMonths(todayStr(), h.recurMonths||12);
  syncLinkedEvent('health-next-'+h.id, h.nextDate, h.title||h.cat, 'Controllo salute · '+h.cat);
  logActivity('edited','health', (h.title||h.cat)+' (effettuato)');
  saveState(); toast('Segnato come effettuato. Prossimo: '+fmtD(h.nextDate));
}
function deleteHealth(id){
  pushUndo();
  const h = state.health.find(x=>x.id===id); if(!h) return;
  trashItem('health', h, h.title||h.cat);
  state.health = state.health.filter(x=>x.id!==id); removeExpense('health-'+id); removeLinkedEvent('health-next-'+id); saveState();
}
function openMedicalExport(){
  const items = state.health.filter(h=>Number(h.cost)>0).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const total = items.reduce((s,h)=>s+Number(h.cost),0);
  const franchigia = 129.11;
  const eccedenza = Math.max(0, total-franchigia);
  const stimaDetrazione = eccedenza*0.19;
  openModal(`
    <h3>Spese mediche detraibili</h3>
    <div class="section-label">${items.length} voci con costo registrato, totale ${euro(total)}.</div>
    <div class="notice">Franchigia 730: primi ${euro(franchigia)} non detraibili. Eccedenza stimata: ${euro(eccedenza)} → detrazione indicativa al 19%: <strong>${euro(stimaDetrazione)}</strong>. Verifica sempre con un CAF o commercialista: questa è solo una stima.</div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Chiudi</button><button class="btn primary" onclick="downloadMedicalCSV()">Scarica CSV</button></div>
  `);
}
function downloadMedicalCSV(){
  const items = state.health.filter(h=>Number(h.cost)>0).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const rows = [['Data','Titolo','Ambito','Costo','Medicinale/cura']];
  items.forEach(h=>rows.push([h.date||'', h.title||h.cat, h.cat, (Number(h.cost)||0).toFixed(2), h.med||'']));
  const total = items.reduce((s,h)=>s+Number(h.cost),0);
  rows.push(['','','','TOTALE', total.toFixed(2)]);
  const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`spese-mediche-${todayStr()}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  closeModal();
}

// ===== CASA =====
const DOC_CATS = ['Contratto','Planimetria','Garanzia elettrodomestico','Bolletta archiviata','Altro'];
function renderHouse(){
  const bills=[...state.bills];
  const allTasks=[...state.homeTasks].sort((a,b)=>(priorityRank(b.priority)-priorityRank(a.priority)));
  const archivedTaskCount = state.homeTasks.filter(t=>t.archived).length;
  const tasks = allTasks.filter(t=> showArchivedTasks ? true : !t.archived);
  const inst=[...state.installments], docs=[...state.homeDocuments];
  return `
  <div class="card">
    <div class="card-head"><div class="title-group">${sectionIcon('house','var(--c-casa)','var(--c-casa-soft)')}<h2>Indirizzo</h2></div><button class="btn small ghost" onclick="openHomeInfoForm()">Modifica</button></div>
    ${state.homeInfo.street? `<div class="item-meta">${esc(state.homeInfo.street)}, ${esc(state.homeInfo.cap||'')} ${esc(state.homeInfo.city||'')}</div>${state.homeInfo.note?`<div class="item-desc">${esc(state.homeInfo.note)}</div>`:''}` : `<div class="empty">Nessun indirizzo inserito.</div>`}
  </div>
  <div class="card">
    <div class="card-head">
      <h2 style="font-size:16px;color:var(--ink-soft);">Bollette</h2>
      <div style="display:flex; width:100%;flex-direction:column;gap:8px;">
        <label class="btn subtle" style="display:inline-flex;align-items:center;justify-content:center;text-align:center;">📷 Importa da PDF/foto<input type="file" accept="application/pdf,image/*" style="display:none" onchange="importBillFromFile(this)"></label>
        <button class="btn primary" onclick="openBillForm()">Aggiungi bolletta</button>
      </div>
    </div>
    <div class="section-label">L'import da PDF/foto è un aiuto automatico: controlla sempre i campi pre-compilati prima di salvare.</div>
    ${bills.length? bills.map(b=>{
      const anomaly = billAnomaly(b);
      return `
      <div class="item"><div class="item-top">
        <div><div class="item-title">${esc(b.provider)} ${anomaly?`<span class="tag ${anomaly.good?'badge-good':'badge-anomaly'}">${anomaly.text}</span>`:''}${isAutomaticBill(b)?'<span class="tag badge-good">Addebito automatico</span>':''}</div>
        <div class="item-meta">${esc(b.frequency||'')} · ${euro(b.amount)} · ${esc(b.method||'')}${b.nextDue?(' · prossima scadenza '+fmtD(b.nextDue)):''}</div></div>
        <div class="item-actions" style="margin-bottom: 10px;">
          <button class="btn small subtle" onclick="markBillPaid('${b.id}')">Segna pagata</button>
          <button class="btn small ghost" onclick="openBillForm('${b.id}')">Modifica</button>
          <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questa bolletta?', ()=>deleteBill('${b.id}'))">Elimina</button>
        </div>
      </div></div>`;
    }).join('') : `<div class="empty">Nessuna bolletta registrata.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Lavori da ultimare</h2><button class="btn primary" onclick="openTaskForm()">Aggiungi lavoro</button></div>
    <div class="section-label">Ordinati per priorità (alta prima). ${archivedTaskCount>0?`<button class="link-toggle" onclick="toggleArchivedTasks()">${showArchivedTasks?'Nascondi archiviati':`Mostra archiviati (${archivedTaskCount})`}</button>`:''}</div>
    ${tasks.length? tasks.map(t=>`
      <div class="item"><div class="item-top">
        <div>${t.archived?'<span class="tag archived">Archiviato</span>':''}<span class="tag">${esc(t.status)}</span><span class="tag" style="background:${priorityColor(t.priority)};color:#fff;border-color:transparent;">${esc(t.priority||'Media')}</span><div class="item-title">${esc(t.title)}</div>${t.note?`<div class="item-desc">${esc(t.note)}</div>`:''}${t.cost?`<div class="item-meta">Costo: ${euro(t.cost)}</div>`:''}${tagsChips(t.tags)}</div>
        <div class="item-actions">
          ${t.archived? `<button class="btn small subtle" onclick="unarchiveTask('${t.id}')">Ripristina</button>` : t.status==='Completato' ? `<button class="btn small subtle" onclick="archiveTask('${t.id}')">Archivia</button>` : ''}
          <button class="btn small ghost" onclick="openTaskForm('${t.id}')">Modifica</button>
          <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questo lavoro?', ()=>deleteTask('${t.id}'))">Elimina</button>
        </div>
      </div></div>`).join('') : `<div class="empty">Nessun lavoro in lista.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Rate</h2><button class="btn primary" onclick="openInstForm()">Aggiungi rata</button></div>
    ${inst.length? inst.map(i=>`
      <div class="item"><div class="item-top">
        <div><div class="item-title">${esc(i.title)}${i.autoPayment?'<span class="tag badge-good">Pagamento automatico</span>':''}</div>
        <div class="item-meta">${i.paidCount||0}/${i.totalCount||'?'} rate · ${euro(i.installmentAmount)} a rata su ${euro(i.totalAmount)}${i.nextDue?(' · prossima '+fmtD(i.nextDue)):''}</div></div>
        <div class="item-actions">
          <button class="btn small subtle" onclick="markInstPaid('${i.id}')">Segna pagata</button>
          <button class="btn small ghost" onclick="openInstForm('${i.id}')">Modifica</button>
          <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questa rata?', ()=>deleteInst('${i.id}'))">Elimina</button>
        </div>
      </div></div>`).join('') : `<div class="empty">Nessuna rata in corso.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><div class="title-group">${sectionIcon('doc','var(--c-casa)','var(--c-casa-soft)')}<h2 style="font-size:16px;">Documenti della casa</h2></div><button class="btn primary" onclick="openDocForm()">Aggiungi documento</button></div>
    <div class="section-label">Contratti, planimetrie, garanzie: tutto quello che vuoi avere sempre a portata di mano.</div>
    ${docs.length? docs.map(d=>`
      <div class="item"><div class="item-top">
        <div><span class="tag">${esc(d.category)}</span><div class="item-title">${esc(d.title)}</div>${d.note?`<div class="item-desc">${esc(d.note)}</div>`:''}${tagsChips(d.tags)}</div>
        <div class="item-actions"><button class="btn small ghost" onclick="openDocForm('${d.id}')">Modifica</button><button class="btn small danger ghost" onclick="confirmDelete('Eliminare questo documento?', ()=>deleteDoc('${d.id}'))">Elimina</button></div>
      </div>
      ${d.files&&d.files.length?`<div class="files-row">${d.files.map((f)=>`<span class="file-chip">📎 <a href="#" onclick="openAttachment('${encodeURIComponent(f.path)}'); return false;">${esc(f.name)}</a></span>`).join('')}</div>`:''}
      </div>`).join('') : `<div class="empty">Nessun documento archiviato.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Manutenzioni stagionali</h2><button class="btn primary" onclick="openSeasonalForm()">Aggiungi manutenzione</button></div>
    <div class="section-label">Cose che vanno fatte una volta l'anno ma non hanno una data fissa — pulizia caldaia, grondaie, cambio gomme.</div>
    ${[...state.seasonalTasks].sort((a,b)=>a.month-b.month).map(s=>{
      const currentYear = new Date().getFullYear();
      const isDue = (s.lastDoneYear||0) < currentYear && (new Date().getMonth()+1) >= s.month;
      return `<div class="item"><div class="item-top">
        <div>${isDue?'<span class="tag badge-anomaly">da fare</span>':''}<div class="item-title">${esc(s.title)}</div><div class="item-meta">Periodo: ${MONTHS[s.month-1]}${s.lastDoneYear?(' · ultima volta: '+s.lastDoneYear):' · mai fatta'}</div>${s.note?`<div class="item-desc">${esc(s.note)}</div>`:''}</div>
        <div class="item-actions">
          <button class="btn small subtle" onclick="markSeasonalDone('${s.id}')">Segna fatta</button>
          <button class="btn small ghost" onclick="openSeasonalForm('${s.id}')">Modifica</button>
          <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questa manutenzione?', ()=>deleteSeasonalTask('${s.id}'))">Elimina</button>
        </div>
      </div></div>`;
    }).join('') || `<div class="empty">Nessuna manutenzione stagionale impostata.</div>`}
  </div>`;
}
const MONTHS_SEASON = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
function openSeasonalForm(id){
  const s = id ? state.seasonalTasks.find(x=>x.id===id) : {title:'',month:new Date().getMonth()+1,note:'',lastDoneYear:''};
  openModal(`
    <h3>${id?'Modifica manutenzione':'Nuova manutenzione stagionale'}</h3>
    <div class="field"><label>Titolo (es. "Pulizia caldaia")</label><input id="f_title" value="${esc(s.title||'')}"></div>
    <div class="field"><label>Periodo dell'anno</label><select id="f_month">${MONTHS_SEASON.map((m,i)=>`<option value="${i+1}" ${s.month===i+1?'selected':''}>${m}</option>`).join('')}</select></div>
    <div class="field"><label>Note</label><textarea id="f_note">${esc(s.note||'')}</textarea></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveSeasonalTask('${id||''}')">Salva</button></div>
  `);
}
function saveSeasonalTask(id){
  pushUndo();
  let item = id ? state.seasonalTasks.find(x=>x.id===id) : {id:uid(), lastDoneYear:''};
  item.title=val('f_title'); item.month=Number(val('f_month')); item.note=val('f_note');
  if(!id) state.seasonalTasks.push(item);
  logActivity(id?'edited':'added','seasonalTask', item.title);
  closeModal(); saveState();
}
function markSeasonalDone(id){
  pushUndo();
  const s = state.seasonalTasks.find(x=>x.id===id); if(!s) return;
  s.lastDoneYear = new Date().getFullYear();
  logActivity('edited','seasonalTask', s.title+' (fatta)');
  saveState(); toast("Segnata come fatta per quest'anno.");
}
function deleteSeasonalTask(id){
  pushUndo();
  const s = state.seasonalTasks.find(x=>x.id===id); if(!s) return;
  trashItem('seasonalTask', s, s.title);
  state.seasonalTasks=state.seasonalTasks.filter(x=>x.id!==id); saveState();
}
function toggleArchivedTasks(){ showArchivedTasks=!showArchivedTasks; render(); }
function archiveTask(id){
  pushUndo(); const t=state.homeTasks.find(x=>x.id===id); if(!t) return; t.archived=true; logActivity('archived','homeTask', t.title); saveState(); }
function unarchiveTask(id){
  pushUndo(); const t=state.homeTasks.find(x=>x.id===id); if(!t) return; t.archived=false; logActivity('restored','homeTask', t.title+' (dall\u2019archivio)'); saveState(); }
function priorityRank(p){ return {'Alta':3,'Media':2,'Bassa':1}[p]||2; }
function priorityColor(p){ return {'Alta':'#C0554D','Media':'#C99A2E','Bassa':'#7FA06F'}[p]||'#C99A2E'; }
function billAnomaly(bill){
  const payments = state.expenses.filter(e=>e.sourceKey && e.sourceKey.startsWith('bill-payment-') && e.title==='Pagamento '+bill.provider);
  if(payments.length<2 || !bill.amount) return null;
  const avg = payments.reduce((s,p)=>s+p.amount,0)/payments.length;
  if(avg<=0) return null;
  const diff = Math.round(((Number(bill.amount)-avg)/avg)*100);
  if(diff>=20) return { text:(diff>0?'+':'')+diff+'% vs media', good:false };
  if(diff<=-15) return { text:diff+'% vs media 🎉', good:true };
  return null;
}
function openHomeInfoForm(){
  const h = state.homeInfo;
  openModal(`
    <h3>Indirizzo di casa</h3>
    <div class="field"><label>Via e numero</label><input id="f_street" value="${esc(h.street||'')}"></div>
    <div class="field-row"><div class="field"><label>Città</label><input id="f_city" value="${esc(h.city||'')}"></div><div class="field"><label>CAP</label><input id="f_cap" value="${esc(h.cap||'')}"></div></div>
    <div class="field"><label>Note</label><textarea id="f_note">${esc(h.note||'')}</textarea></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveHomeInfo()">Salva</button></div>
  `);
}
function saveHomeInfo(){
  pushUndo(); state.homeInfo = {street:val('f_street'),city:val('f_city'),cap:val('f_cap'),note:val('f_note')}; closeModal(); saveState(); }
function openBillForm(id){
  const b = id ? state.bills.find(x=>x.id===id) : {provider:'',frequency:'Mensile',amount:'',method:'',nextDue:''};
  openModal(`
    <h3>${id?'Modifica bolletta':'Nuova bolletta'}</h3>
    <div class="field"><label>Gestore</label><input id="f_provider" value="${esc(b.provider||'')}"></div>
    <div class="field-row">
      <div class="field"><label>Frequenza</label><select id="f_frequency">${['Mensile','Bimestrale','Trimestrale','Semestrale','Annuale'].map(f=>`<option ${b.frequency===f?'selected':''}>${f}</option>`).join('')}</select></div>
      <div class="field"><label>Importo</label><input type="number" step="0.01" id="f_amount" value="${b.amount||''}"></div>
    </div>
    <div class="field"><label>Metodo di pagamento</label><select id="f_method">
      <option value="Addebito diretto" ${/addebito|automatic|domicilia|rid|sepa/i.test(b.method||'')?'selected':''}>Addebito diretto (automatico)</option>
      <option value="Bonifico" ${b.method==='Bonifico'?'selected':''}>Bonifico</option>
      <option value="Carta" ${b.method==='Carta'?'selected':''}>Carta</option>
      <option value="Contanti" ${b.method==='Contanti'?'selected':''}>Contanti</option>
      <option value="Altro" ${b.method && !/addebito|automatic|domicilia|rid|sepa/i.test(b.method||'') && !['Bonifico','Carta','Contanti'].includes(b.method)?'selected':''}>Altro</option>
    </select></div>
    ${id?'':`<div class="field"><label>Data di un pagamento già effettuato (opzionale)</label><input type="date" id="f_paymentDate" value=""></div>`}
    <div class="field"><label>Prossima scadenza</label><input type="date" id="f_nextDue" value="${b.nextDue||''}"></div>
    <div class="section-label">Con “Addebito diretto”, alla data della prossima scadenza il pagamento verrà aggiunto automaticamente allo storico.</div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveBill('${id||''}')">Salva</button></div>
  `);
}
function saveBill(id){
  pushUndo();
  let item = id ? state.bills.find(x=>x.id===id) : {id:uid()};
  item.provider=val('f_provider'); item.frequency=val('f_frequency'); item.amount=val('f_amount');
  item.method=val('f_method'); item.nextDue=val('f_nextDue');
  if(!id){
    state.bills.push(item);
    const paymentDate = val('f_paymentDate');
    if(paymentDate && Number(item.amount)>0) addExpense('bill-payment-'+item.id, 'Pagamento '+item.provider, item.amount, paymentDate, 'Bollette');
  }
  syncLinkedEvent('bill-due-'+item.id, item.nextDue, 'Scadenza '+item.provider, 'Bolletta · '+euro(item.amount));
  logActivity(id?'edited':'added','bill', item.provider);
  closeModal(); saveState(); toast('Bolletta salvata.');
}
function markBillPaid(id){
  const b = state.bills.find(x=>x.id===id); if(!b) return;
  openModal(`
    <h3>Pagamento ${esc(b.provider)}</h3>
    <div class="field"><label>Data del pagamento</label><input type="date" id="f_paymentDate" value="${todayStr()}"></div>
    <div class="field"><label>Importo</label><input type="number" step="0.01" id="f_paymentAmount" value="${b.amount||''}"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveBillPayment('${id}')">Salva pagamento</button></div>
  `);
}
function saveBillPayment(id){
  pushUndo();
  const b = state.bills.find(x=>x.id===id); if(!b) return;
  const paymentDate = val('f_paymentDate')||todayStr();
  const amount = val('f_paymentAmount')||b.amount;
  addExpense('bill-payment-'+uid(), 'Pagamento '+b.provider, amount, paymentDate, 'Bollette');
  if(b.nextDue) b.nextDue = addPeriod(b.nextDue, b.frequency||'Mensile');
  syncLinkedEvent('bill-due-'+b.id, b.nextDue, 'Scadenza '+b.provider, 'Bolletta · '+euro(b.amount));
  closeModal(); saveState(); toast('Pagamento archiviato con la data indicata.');
}
function deleteBill(id){
  pushUndo();
  const b = state.bills.find(x=>x.id===id); if(!b) return;
  trashItem('bill', b, b.provider);
  state.bills=state.bills.filter(x=>x.id!==id); removeLinkedEvent('bill-due-'+id); saveState();
}
function openTaskForm(id){
  const t = id ? state.homeTasks.find(x=>x.id===id) : {title:'',status:'Da fare',priority:'Media',note:'',cost:'',tags:[]};
  openModal(`
    <h3>${id?'Modifica lavoro':'Nuovo lavoro'}</h3>
    <div class="field"><label>Titolo</label><input id="f_title" value="${esc(t.title||'')}"></div>
    <div class="field-row">
      <div class="field"><label>Stato</label><select id="f_status">${['Da fare','In corso','Completato'].map(s=>`<option ${t.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="field"><label>Priorità</label><select id="f_priority">${['Alta','Media','Bassa'].map(p=>`<option ${(t.priority||'Media')===p?'selected':''}>${p}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Note</label><textarea id="f_note">${esc(t.note||'')}</textarea></div>
    <div class="field"><label>Costo stimato/reale (opzionale)</label><input type="number" step="0.01" id="f_cost" value="${t.cost||''}"></div>
    <div class="field"><label>Etichette (separate da virgola)</label><input id="f_tags" value="${esc((t.tags||[]).join(', '))}" placeholder="es. ristrutturazione bagno"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveTask('${id||''}')">Salva</button></div>
  `);
}
function saveTask(id){
  pushUndo();
  let item = id ? state.homeTasks.find(x=>x.id===id) : {id:uid()};
  item.title=val('f_title'); item.status=val('f_status'); item.priority=val('f_priority'); item.note=val('f_note'); item.cost=val('f_cost'); item.tags=parseTags(val('f_tags'));
  if(!id) state.homeTasks.push(item);
  if(item.status==='Completato' && Number(item.cost)>0){
    const previousExpense = state.expenses.find(expense=>expense.sourceKey==='task-'+item.id);
    item.completedDate = item.completedDate || previousExpense?.date || todayStr();
    upsertExpense('task-'+item.id, item.title, item.cost, item.completedDate, 'Lavori casa');
  } else {
    removeExpense('task-'+item.id);
    delete item.completedDate;
  }
  logActivity(id?'edited':'added','homeTask', item.title);
  closeModal(); saveState();
}
function deleteTask(id){
  pushUndo();
  const t = state.homeTasks.find(x=>x.id===id); if(!t) return;
  trashItem('homeTask', t, t.title);
  state.homeTasks=state.homeTasks.filter(x=>x.id!==id); removeExpense('task-'+id); saveState();
}
function openInstForm(id){
  const i = id ? state.installments.find(x=>x.id===id) : {title:'',totalAmount:'',installmentAmount:'',totalCount:'',paidCount:'',nextDue:'',frequency:'Mensile'};
  openModal(`
    <h3>${id?'Modifica rata':'Nuova rata'}</h3>
    <div class="field"><label>Titolo (es. "Divano", "Prestito auto")</label><input id="f_title" value="${esc(i.title||'')}"></div>
    <div class="field-row">
      <div class="field"><label>Importo totale</label><input type="number" step="0.01" id="f_totalAmount" value="${i.totalAmount||''}"></div>
      <div class="field"><label>Importo per rata</label><input type="number" step="0.01" id="f_installmentAmount" value="${i.installmentAmount||''}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Numero rate totali</label><input type="number" id="f_totalCount" value="${i.totalCount||''}"></div>
      <div class="field"><label>Rate già pagate</label><input type="number" id="f_paidCount" value="${i.paidCount||''}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Frequenza rata</label><select id="f_frequency">${['Mensile','Bimestrale','Trimestrale','Semestrale','Annuale'].map(f=>`<option ${(i.frequency||'Mensile')===f?'selected':''}>${f}</option>`).join('')}</select></div>
      <div class="field"><label>Prossima scadenza</label><input type="date" id="f_nextDue" value="${i.nextDue||''}"></div>
    </div>
    <div class="field">
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;"><input type="checkbox" role="switch" id="f_autoPayment" ${i.autoPayment?'checked':''} style="width:20px;height:20px;accent-color:var(--c-casa);"> Pagamento automatico</label>
      <div class="section-label">Se attivo, alla data di scadenza la rata verrà registrata automaticamente tra le spese.</div>
    </div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveInst('${id||''}')">Salva</button></div>
  `);
}
function saveInst(id){
  pushUndo();
  let item = id ? state.installments.find(x=>x.id===id) : {id:uid()};
  item.title=val('f_title'); item.totalAmount=val('f_totalAmount'); item.installmentAmount=val('f_installmentAmount');
  item.totalCount=val('f_totalCount'); item.paidCount=val('f_paidCount'); item.nextDue=val('f_nextDue'); item.frequency=val('f_frequency');
  item.autoPayment=document.getElementById('f_autoPayment').checked;
  if(!id) state.installments.push(item);
  syncLinkedEvent('inst-due-'+item.id, item.nextDue, 'Rata '+item.title, 'Rata · '+euro(item.installmentAmount));
  logActivity(id?'edited':'added','installment', item.title);
  closeModal(); saveState(); toast('Rata salvata.');
}
function markInstPaid(id){
  pushUndo();
  const i = state.installments.find(x=>x.id===id); if(!i) return;
  addExpense('inst-payment-'+uid(), 'Rata '+i.title, i.installmentAmount, todayStr(), 'Rate');
  i.paidCount = (Number(i.paidCount)||0) + 1;
  if(i.nextDue) i.nextDue = addPeriod(i.nextDue, i.frequency||'Mensile');
  syncLinkedEvent('inst-due-'+i.id, i.nextDue, 'Rata '+i.title, 'Rata · '+euro(i.installmentAmount));
  saveState(); toast('Rata registrata come pagata.');
}
function deleteInst(id){
  pushUndo();
  const i = state.installments.find(x=>x.id===id); if(!i) return;
  trashItem('installment', i, i.title);
  state.installments=state.installments.filter(x=>x.id!==id); removeLinkedEvent('inst-due-'+id); saveState();
}
function openDocForm(id){
  const d = id ? state.homeDocuments.find(x=>x.id===id) : {title:'',category:DOC_CATS[0],note:'',files:[],tags:[]};
  openModal(`
    <h3>${id?'Modifica documento':'Nuovo documento'}</h3>
    <div class="field"><label>Titolo</label><input id="f_title" value="${esc(d.title||'')}"></div>
    <div class="field"><label>Categoria</label><select id="f_category">${DOC_CATS.map(c=>`<option ${d.category===c?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Note</label><textarea id="f_note">${esc(d.note||'')}</textarea></div>
    <div class="field"><label>Etichette (separate da virgola)</label><input id="f_tags" value="${esc((d.tags||[]).join(', '))}"></div>
    <div class="field"><label>File</label><div class="file-pickers"><label class="btn small subtle">📷 Scatta foto<input type="file" id="f_camera" accept="image/*" capture="environment" hidden></label><label class="btn small subtle">🖼️ Galleria / file<input type="file" id="f_files" multiple accept="image/*,.pdf" hidden></label></div>
      <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">${d.files&&d.files.length?d.files.length+' file già allegati':'Nessun file allegato'}</div>
    </div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveDoc('${id||''}')">Salva</button></div>
  `);
}
async function saveDoc(id){
  pushUndo();
  const newFiles = await readFiles([...document.getElementById('f_files').files,...(document.getElementById('f_camera')?.files||[])]);
  let item = id ? state.homeDocuments.find(x=>x.id===id) : {id:uid(), files:[]};
  item.title=val('f_title'); item.category=val('f_category'); item.note=val('f_note'); item.tags=parseTags(val('f_tags'));
  item.files = (item.files||[]).concat(newFiles);
  if(!id) state.homeDocuments.push(item);
  logActivity(id?'edited':'added','homeDocument', item.title);
  closeModal(); saveState(); toast('Documento salvato.');
}
function deleteDoc(id){
  pushUndo();
  const d = state.homeDocuments.find(x=>x.id===id); if(!d) return;
  trashItem('homeDocument', d, d.title);
  state.homeDocuments=state.homeDocuments.filter(x=>x.id!==id); saveState();
}

// ---------- import bolletta da PDF/foto ----------
async function importBillFromFile(input){
  const file = input.files[0]; if(!file) return;
  toast('Analisi del file in corso…');
  try{
    const text = await extractTextFromFile(file);
    input.value='';
    if(!text){ toast('Formato non supportato: usa PDF o immagine.'); return; }
    let guess = null;
    if(aiAvailable){
      try{
        const r = await fetch('/api/ai/parse-document', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text, kind:'bill'}) });
        const d = await r.json();
        if(d.ok) guess = { provider:d.provider, amount:d.amount, date:d.date };
      }catch(e){ /* uso il fallback qui sotto */ }
    }
    if(!guess) guess = guessBillFields(text);
    openBillForm(null);
    setTimeout(()=>{
      if(guess.provider) document.getElementById('f_provider').value = guess.provider;
      if(guess.amount) document.getElementById('f_amount').value = guess.amount;
      if(guess.date) document.getElementById('f_nextDue').value = guess.date;
      const hint = document.createElement('div');
      hint.className='notice'; hint.style.marginBottom='12px';
      hint.textContent = 'Campi pre-compilati dalla scansione: controllali prima di salvare, potrebbero non essere precisi.';
      const modalBody = document.getElementById('modalBody');
      modalBody.insertBefore(hint, modalBody.children[1]);
    }, 30);
  }catch(e){
    console.error(e); toast('Non sono riuscito a leggere il file. Inserisci i dati manualmente.');
  }
}
function guessBillFields(text){
  const known = ['Enel','Eni','A2A','Acea','Iren','Hera','Sorgenia','TIM','Vodafone','WindTre','Wind Tre','Fastweb','Iliad'];
  let provider = ''; for(const k of known){ if(text.includes(k)){ provider=k; break; } }
  const amountMatches = [...text.matchAll(/(\d{1,4},\d{2})\s?€?/g)].map(m=>Number(m[1].replace(',','.')));
  let amount=''; if(amountMatches.length){ amount = amountMatches.sort((a,b)=>b-a)[0].toFixed(2); }
  const dateMatch = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  let date=''; if(dateMatch){ let day=dateMatch[1].padStart(2,'0'), month=dateMatch[2].padStart(2,'0'), year=dateMatch[3]; if(year.length===2) year='20'+year; date = `${year}-${month}-${day}`; }
  return {provider, amount, date};
}

// ---------- OCR generico per scontrini ----------
async function extractTextFromFile(file){
  if(file.type === 'application/pdf'){
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({data:buf}).promise;
    let text = '';
    for(let i=1;i<=Math.min(doc.numPages,3);i++){
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(it=>it.str).join(' ') + '\n';
    }
    return text;
  } else if(file.type.startsWith('image/')){
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.0.4/tesseract.min.js');
    const result = await Tesseract.recognize(file, 'ita');
    return result.data.text;
  }
  return null;
}
function guessReceiptFields(text){
  // Su uno scontrino il "totale" è quasi sempre l'importo più alto tra quelli con due decimali,
  // spesso preceduto dalla parola TOTALE — se la troviamo, diamo priorità a quella riga.
  const totalLineMatch = text.match(/total[ei][^\d]{0,10}(\d{1,4}[.,]\d{2})/i);
  let amount = '';
  if(totalLineMatch){ amount = totalLineMatch[1].replace('.','').replace(',','.'); }
  else {
    const amountMatches = [...text.matchAll(/(\d{1,4},\d{2})\s?€?/g)].map(m=>Number(m[1].replace(',','.')));
    if(amountMatches.length) amount = amountMatches.sort((a,b)=>b-a)[0].toFixed(2);
  }
  const dateMatch = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  let date = '';
  if(dateMatch){ let day=dateMatch[1].padStart(2,'0'), month=dateMatch[2].padStart(2,'0'), year=dateMatch[3]; if(year.length===2) year='20'+year; date = `${year}-${month}-${day}`; }
  // prima riga non vuota, spesso il nome del negozio
  const firstLine = text.split('\n').map(l=>l.trim()).find(l=>l.length>2) || '';
  return { amount, date, title: firstLine.slice(0,40) };
}
async function importReceiptFromFile(input){
  const file = input.files[0]; if(!file) return;
  toast('Lettura dello scontrino in corso…');
  try{
    const text = await extractTextFromFile(file);
    input.value = '';
    if(!text){ toast('Formato non supportato: usa PDF o immagine.'); return; }
    let guess = null;
    if(aiAvailable){
      try{
        const r = await fetch('/api/ai/parse-document', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text, kind:'receipt'}) });
        const d = await r.json();
        if(d.ok) guess = { title:d.title, amount:d.amount, date:d.date };
      }catch(e){ /* uso il fallback qui sotto */ }
    }
    if(!guess) guess = guessReceiptFields(text);
    openExpenseForm();
    setTimeout(()=>{
      if(guess.title) document.getElementById('f_title').value = guess.title;
      if(guess.amount) document.getElementById('f_amount').value = guess.amount;
      if(guess.date) document.getElementById('f_date').value = guess.date;
      document.getElementById('f_category').value = 'Varie';
      const hint = document.createElement('div');
      hint.className='notice'; hint.style.marginBottom='12px';
      hint.textContent = 'Campi pre-compilati dalla scansione dello scontrino: controllali prima di salvare.';
      const modalBody = document.getElementById('modalBody');
      modalBody.insertBefore(hint, modalBody.children[1]);
    }, 30);
  }catch(e){
    console.error(e); toast('Non sono riuscito a leggere lo scontrino. Inserisci la spesa manualmente.');
  }
}

// ---------- riconciliazione con l'estratto conto ----------
function reconcileBankCSV(input){
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try{
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(l=>l.trim().length>0);
      if(lines.length===0){ toast('File vuoto.'); return; }
      const delim = lines[0].includes(';') ? ';' : ',';
      const rows = lines.map(l=>parseCSVLine(l, delim));
      // individua automaticamente quali colonne sono data, importo e descrizione
      const sample = rows[1] || rows[0];
      let dateCol=-1, amountCol=-1, descCol=-1;
      sample.forEach((val,i)=>{
        if(dateCol===-1 && (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(val) || !isNaN(Date.parse(val)))) dateCol=i;
        else if(amountCol===-1 && /^-?\d+([.,]\d{1,2})?$/.test(val.replace(/\s/g,''))) amountCol=i;
        else if(descCol===-1 && isNaN(Number(val)) && val.length>2) descCol=i;
      });
      if(dateCol===-1 || amountCol===-1){
        alert('Non riesco a capire il formato di questo CSV bancario. Servono almeno una colonna data e una importo.');
        input.value=''; return;
      }
      const startRow = (dateCol===0 && isNaN(Date.parse(rows[0][dateCol]))) ? 1 : 0;
      const bankTx = [];
      for(let i=startRow;i<rows.length;i++){
        const row = rows[i]; if(row.length<=Math.max(dateCol,amountCol)) continue;
        let d = row[dateCol];
        const dm = d.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
        if(dm){ let yy=dm[3]; if(yy.length===2) yy='20'+yy; d = `${yy}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`; }
        const amt = Math.abs(Number(String(row[amountCol]).replace(',','.')));
        if(!amt) continue;
        bankTx.push({ date:d, amount:amt, desc: descCol>-1?row[descCol]:'' });
      }
      const matched = [], unmatchedBank = [];
      const usedExpenseIds = new Set();
      bankTx.forEach(tx=>{
        const match = state.expenses.find(e=>{
          if(usedExpenseIds.has(e.id)) return false;
          const diffDays = Math.abs((new Date(tx.date+'T00:00') - new Date((e.date||'')+'T00:00'))/86400000);
          return Math.abs(e.amount - tx.amount) < 0.01 && diffDays<=3;
        });
        if(match){ matched.push(tx); usedExpenseIds.add(match.id); }
        else unmatchedBank.push(tx);
      });
      const unmatchedApp = state.expenses.filter(e=>!usedExpenseIds.has(e.id));
      window._reconcileUnmatchedBank = unmatchedBank;
      openModal(`
        <h3>Riconciliazione estratto conto</h3>
        <div class="section-label">${matched.length} transazioni corrispondenti su ${bankTx.length} lette dal file.</div>
        <div class="settings-section-title" style="margin-top:10px;">Nell'estratto conto ma non nel taccuino (${unmatchedBank.length})</div>
        ${unmatchedBank.length? unmatchedBank.slice(0,30).map(tx=>`<div class="due-item"><div class="due-left"><div class="t">${esc(tx.desc||'Movimento')}</div><div class="s">${fmtD(tx.date)}</div></div><div class="due-badge">${euro(tx.amount)}</div></div>`).join('') : `<div class="empty">Nessuna, tutto combacia.</div>`}
        <div class="settings-section-title" style="margin-top:14px;">Nel taccuino ma non nell'estratto (${unmatchedApp.length})</div>
        ${unmatchedApp.length? unmatchedApp.slice(0,30).map(e=>`<div class="due-item"><div class="due-left"><div class="t">${esc(e.title)}</div><div class="s">${fmtD(e.date)}</div></div><div class="due-badge">${euro(e.amount)}</div></div>`).join('') : `<div class="empty">Nessuna, tutto combacia.</div>`}
        <div class="modal-actions">
          <button class="btn ghost" onclick="closeModal()">Chiudi</button>
          ${unmatchedBank.length?`<button class="btn primary" onclick="addUnmatchedBankAsExpenses()">Aggiungi le mancanti come spese</button>`:''}
        </div>
      `);
    }catch(err){ console.error(err); alert('Non sono riuscito a leggere questo file. Assicurati sia un CSV esportato dalla tua banca.'); }
  };
  reader.readAsText(file); input.value='';
}
function addUnmatchedBankAsExpenses(){
  pushUndo();
  const list = window._reconcileUnmatchedBank || [];
  list.forEach(tx=>addExpense('bank-'+uid(), tx.desc||'Movimento bancario', tx.amount, tx.date, 'Da estratto conto', ['banca']));
  logActivity('added','expense', `${list.length} spese aggiunte da estratto conto`);
  closeModal(); saveState(); toast(`${list.length} spese aggiunte.`);
}

// ===== SALVADANAIO =====
function renderSavings(){
  const total = state.expenses.reduce((s,e)=>s+e.amount,0);
  const byCat = {};
  state.expenses.forEach(e=>{ byCat[e.category]=(byCat[e.category]||0)+e.amount; });
  const sorted = [...state.expenses].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const thisMonth = todayStr().slice(0,7);
  const lastMonthDate = new Date(new Date().getFullYear(), new Date().getMonth()-1, 1);
  const lastMonth = isoLocal(lastMonthDate).slice(0,7);
  const curM = sumForMonth(thisMonth), prevM = sumForMonth(lastMonth);
  const byCatThisMonth = {};
  state.expenses.filter(e=>(e.date||'').startsWith(thisMonth)).forEach(e=>{ byCatThisMonth[e.category]=(byCatThisMonth[e.category]||0)+e.amount; });
  const budgets = state.settings.budgets || {};
  const forecast = computeForecastNextMonth();
  const streak = computeBudgetStreak();

  return `
  ${renderFlowCard()}
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Spese: questo mese vs mese scorso</h2></div>
    <div class="stat-row">
      <div class="stat"><div class="label">Mese corrente</div><div class="value">${euro(curM)}</div></div>
      <div class="stat"><div class="label">Mese scorso</div><div class="value">${euro(prevM)}</div></div>
      <div class="stat"><div class="label">Differenza</div><div class="value">${prevM>0? (curM>=prevM?'+':'')+Math.round(((curM-prevM)/prevM)*100)+'%' : '—'}</div></div>
      <div class="stat"><div class="label">Stima mese prossimo</div><div class="value">${euro(forecast)}</div><div class="item-meta">Media ultimi 3 mesi</div></div>
    </div>
    ${streak>0?`<div class="notice">🔥 ${streak} mese/i di fila entro i budget impostati. Continua così!</div>`:''}
  </div>
  <div class="stat-row">
    <div class="stat"><div class="label">Totale spese registrate</div><div class="value">${euro(total)}</div></div>
    ${Object.entries(byCat).map(([c,v])=>`<div class="stat"><div class="label">${esc(c)}</div><div class="value">${euro(v)}</div></div>`).join('')}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Andamento</h2></div>
    <div class="chart-row">
      <div class="chart-wrap"><canvas id="chartMonthly" height="120"></canvas></div>
      <div class="chart-wrap"><canvas id="chartCategory" height="120"></canvas></div>
    </div>
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Budget mensile per categoria</h2><button class="btn small subtle" onclick="openBudgetForm()">Imposta budget</button></div>
    ${Object.keys(budgets).length? Object.entries(budgets).map(([cat,limit])=>{
      const spent = byCatThisMonth[cat]||0;
      const pct = limit>0 ? Math.min(100, Math.round((spent/limit)*100)) : 0;
      const over = spent>limit;
      const warn = !over && pct>=80;
      return `<div class="item">
        <div class="item-top"><div><div class="item-title">${esc(cat)}</div><div class="item-meta">${euro(spent)} di ${euro(limit)} questo mese</div></div>
        <div class="item-actions">${over?'<span class="tag badge-anomaly">superato</span>':''}<button class="btn small danger ghost" onclick="confirmDelete('Rimuovere questo budget?', ()=>deleteBudget('${esc(cat)}'))">Rimuovi</button></div></div>
        <div class="budget-bar-track"><div class="budget-bar-fill ${over?'over':warn?'warn':''}" style="width:${pct}%;"></div></div>
      </div>`;
    }).join('') : `<div class="empty">Nessun budget impostato. Aggiungine uno per ricevere un avviso quando ti avvicini al limite.</div>`}
  </div>
  ${renderIncomesCard()}
  <div class="card">
    <div class="card-head"><div class="title-group">${sectionIcon('piggy','var(--c-salvadanaio)','var(--c-salvadanaio-soft)')}<h2>Spese</h2></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <label class="btn small subtle" style="display:inline-flex;align-items:center;">📷 Scontrino<input type="file" accept="application/pdf,image/*" style="display:none" onchange="importReceiptFromFile(this)"></label>
        <label class="btn small subtle" style="display:inline-flex;align-items:center;">Importa CSV<input type="file" accept=".csv" style="display:none" onchange="importExpensesCSV(this)"></label>
        <label class="btn small subtle" style="display:inline-flex;align-items:center;">Confronta estratto conto<input type="file" accept=".csv" style="display:none" onchange="reconcileBankCSV(this)"></label>
        <button class="btn primary" onclick="openExpenseForm()">Aggiungi spesa</button>
      </div>
    </div>
    <div class="section-label">Salute, lavori in casa, auto entrano qui quando compili il costo. Bollette e rate entrano quando premi "Segna pagata". Il CSV deve avere colonne Data;Titolo;Categoria;Importo (come nell'export spese mediche). "Scontrino" prova a leggere una foto/PDF; "Confronta estratto conto" legge un CSV esportato dalla tua banca e verifica cosa manca.</div>
    ${sorted.length? sorted.map(e=>`
      <div class="item"><div class="item-top">
        <div><span class="tag">${esc(e.category)}</span><div class="item-title">${esc(e.title)}</div><div class="item-meta">${fmtD(e.date)}</div>${tagsChips(e.tags)}</div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-weight:700;">${euro(e.amount)}</div>
          <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questa spesa?', ()=>deleteExpense('${e.id}'))">Elimina</button>
        </div>
      </div></div>`).join('') : `<div class="empty">Nessuna spesa registrata ancora.</div>`}
  </div>`;
}
function computeForecastNextMonth(){
  const now = new Date();
  let sum = 0, months = 0;
  for(let i=1;i<=3;i++){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const key = isoLocal(d).slice(0,7);
    const total = sumForMonth(key);
    if(total>0){ sum += total; months++; }
  }
  return months>0 ? sum/months : 0;
}
function computeBudgetStreak(){
  const budgets = state.settings.budgets||{};
  if(Object.keys(budgets).length===0) return 0;
  let streak = 0;
  const now = new Date();
  for(let i=1;i<=24;i++){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const key = isoLocal(d).slice(0,7);
    const byCat = {};
    state.expenses.filter(e=>(e.date||'').startsWith(key)).forEach(e=>{ byCat[e.category]=(byCat[e.category]||0)+e.amount; });
    const anyOver = Object.entries(budgets).some(([cat,limit])=>(byCat[cat]||0) > limit);
    if(anyOver) break;
    streak++;
  }
  return streak;
}
function renderSavingsCharts(){
  if(typeof Chart==='undefined') return;
  const year = new Date().getFullYear();
  const monthlyCanvas = document.getElementById('chartMonthly');
  if(monthlyCanvas){
    if(chartMonthly) chartMonthly.destroy();
    const expArr = monthlyTotalsForYear(year), incArr = monthlyIncomeForYear(year);
    chartMonthly = new Chart(monthlyCanvas, { type:'bar', data:{ labels:MONTHS_SHORT, datasets:[
      {type:'bar', label:'Entrate', data:incArr, backgroundColor:'#4C8C4A', borderRadius:6},
      {type:'bar', label:'Uscite', data:expArr, backgroundColor:'#0582CA', borderRadius:6},
      {type:'line', label:'Saldo', data:expArr.map((v,i)=>Math.round((incArr[i]-v)*100)/100), borderColor:'#C99A2E', backgroundColor:'#C99A2E', tension:0.25, pointRadius:3}
    ]}, options:{ plugins:{legend:{display:true, position:'bottom', labels:{boxWidth:10,font:{size:11}}}}, scales:{y:{beginAtZero:false}} } });
  }
  const catCanvas = document.getElementById('chartCategory');
  if(catCanvas){
    const byCat = {};
    state.expenses.filter(e=>(e.date||'').startsWith(String(year))).forEach(e=>{ byCat[e.category]=(byCat[e.category]||0)+e.amount; });
    const labels = Object.keys(byCat), data = Object.values(byCat);
    if(chartCategory) chartCategory.destroy();
    chartCategory = new Chart(catCanvas, { type:'doughnut', data:{ labels, datasets:[{data, backgroundColor:CHART_COLORS}] }, options:{ plugins:{legend:{position:'bottom', labels:{boxWidth:10,font:{size:11}}}} } });
  }
}
function openExpenseForm(){
  openModal(`
    <h3>Nuova spesa manuale</h3>
    <div class="field"><label>Titolo</label><input id="f_title" placeholder="es. Spesa alimentare"></div>
    <div class="field-row"><div class="field"><label>Importo</label><input type="number" step="0.01" id="f_amount"></div><div class="field"><label>Data</label><input type="date" id="f_date" value="${todayStr()}"></div></div>
    <div class="field"><label>Categoria</label><input id="f_category" placeholder="es. Varie"></div>
    <div class="field"><label>Etichette (separate da virgola, opzionale)</label><input id="f_tags" placeholder="es. nome di un bene da collegare"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveExpense()">Salva</button></div>
  `);
}
function saveExpense(){
  pushUndo();
  addExpense('manual-'+uid(), val('f_title'), val('f_amount'), val('f_date')||todayStr(), val('f_category')||'Varie', parseTags(val('f_tags')));
  logActivity('added','expense', val('f_title'));
  closeModal(); saveState();
}
function deleteExpense(id){
  pushUndo();
  const e = state.expenses.find(x=>x.id===id); if(!e) return;
  trashItem('expense', e, e.title);
  state.expenses=state.expenses.filter(x=>x.id!==id); saveState();
}
function parseCSVLine(line, delim){
  const out = []; let cur=''; let inQuotes=false;
  for(let i=0;i<line.length;i++){
    const c = line[i];
    if(inQuotes){
      if(c==='"'){ if(line[i+1]==='"'){ cur+='"'; i++; } else { inQuotes=false; } }
      else cur+=c;
    } else {
      if(c==='"') inQuotes=true;
      else if(c===delim){ out.push(cur); cur=''; }
      else cur+=c;
    }
  }
  out.push(cur);
  return out.map(s=>s.trim());
}
function importExpensesCSV(input){
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try{
      pushUndo();
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(l=>l.trim().length>0);
      if(lines.length===0){ toast('File CSV vuoto.'); return; }
      const delim = lines[0].includes(';') ? ';' : ',';
      let start = 0;
      const firstRow = parseCSVLine(lines[0], delim);
      const looksLikeHeader = isNaN(Date.parse(firstRow[0])) ;
      if(looksLikeHeader) start = 1;
      let count = 0;
      for(let i=start;i<lines.length;i++){
        const row = parseCSVLine(lines[i], delim);
        if(row.length<4) continue;
        const [date, title, category, amountStr] = row;
        const amount = Number(String(amountStr).replace(',','.'));
        if(!title || !amount || amount<=0) continue;
        let d = date;
        const dm = date.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
        if(dm){ let yy=dm[3]; if(yy.length===2) yy='20'+yy; d = `${yy}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`; }
        addExpense('csv-'+uid(), title, amount, d||todayStr(), category||'Varie');
        count++;
      }
      logActivity('added','expense', `${count} spese importate da CSV`);
      saveState(); toast(`${count} spese importate.`);
    }catch(err){ console.error(err); alert('Non sono riuscito a leggere questo file CSV. Controlla il formato.'); }
  };
  reader.readAsText(file); input.value='';
}
function openBudgetForm(){
  const existingCats = Array.from(new Set(state.expenses.map(e=>e.category)));
  openModal(`
    <h3>Nuovo budget mensile</h3>
    <div class="field"><label>Categoria</label><input id="f_cat" list="catList" placeholder="es. Bollette"><datalist id="catList">${existingCats.map(c=>`<option value="${esc(c)}">`).join('')}</datalist></div>
    <div class="field"><label>Limite mensile</label><input type="number" step="0.01" id="f_limit"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveBudget()">Salva</button></div>
  `);
}
function saveBudget(){
  pushUndo();
  const cat = val('f_cat').trim(); const limit = Number(val('f_limit'))||0;
  if(!cat || limit<=0){ alert('Inserisci categoria e importo validi.'); return; }
  state.settings.budgets[cat] = limit; closeModal(); saveState();
}
function deleteBudget(cat){
  pushUndo(); delete state.settings.budgets[cat]; saveState(); }

// ===== AUTO =====
function renderCars(){
  const archivedCount = state.cars.filter(c=>c.archived).length;
  const visibleCars = state.cars.filter(c=> showArchivedCars ? true : !c.archived);
  return `
  <div class="card">
    <div class="card-head"><div class="title-group">${sectionIcon('car','var(--c-auto)','var(--c-auto-soft)')}<h2>Le mie auto</h2></div><button class="btn primary" onclick="openCarForm()">Aggiungi auto</button></div>
    ${archivedCount>0?`<div class="section-label"><button class="link-toggle" onclick="toggleArchivedCars()">${showArchivedCars?'Nascondi archiviate':`Mostra archiviate (${archivedCount})`}</button></div>`:''}
    ${visibleCars.length? visibleCars.map(c=>{
      const evts = state.carEvents.filter(e=>e.carId===c.id).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
      const kmEstimate = carKmEstimate(c);
      const costPerKm = carCostPerKm(c);
      return `
      <div class="item">
        <div class="item-top">
          <div>${c.archived?'<span class="tag archived">Archiviata</span>':''}<div class="item-title">${esc(c.name)} ${c.plate?('· '+esc(c.plate)):''}</div>
          <div class="item-meta">${esc(c.model||'')} ${c.year?(' · '+c.year):''}${c.km?(' · '+Number(c.km).toLocaleString('it-IT')+' km'):''}</div>
          ${kmEstimate?`<div class="item-meta">${kmEstimate}</div>`:''}
          ${costPerKm?`<div class="item-meta">Costo stimato: ${costPerKm.toFixed(3)} €/km percorso</div>`:''}</div>
          <div class="item-actions">
            ${c.archived? `<button class="btn small subtle" onclick="unarchiveCar('${c.id}')">Ripristina</button>` : `<button class="btn small subtle" onclick="archiveCar('${c.id}')">Archivia</button>`}
            <button class="btn small subtle" onclick="openCarEventForm(null,'${c.id}')">Evento</button>
            <button class="btn small ghost" onclick="openCarForm('${c.id}')">Modifica</button>
            <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questa auto e i suoi eventi?', ()=>deleteCar('${c.id}'))">Elimina</button>
          </div>
        </div>
        ${evts.length? `<div style="margin-top:10px;">${evts.map(e=>`
          <div class="item" style="background:var(--paper);">
            <div class="item-top">
              <div><span class="tag">${esc(e.type)}</span><div class="item-meta">${fmtD(e.date)}${e.cost?(' · '+euro(e.cost)):''}</div>${e.note?`<div class="item-desc">${esc(e.note)}</div>`:''}${tagsChips(e.tags)}</div>
              <div class="item-actions"><button class="btn small ghost" onclick="openCarEventForm('${e.id}','${c.id}')">Modifica</button><button class="btn small danger ghost" onclick="confirmDelete('Eliminare questo evento?', ()=>deleteCarEvent('${e.id}'))">Elimina</button></div>
            </div>
          </div>`).join('')}</div>` : `<div class="empty">Nessun evento registrato per questa auto.</div>`}
      </div>`;
    }).join('') : `<div class="empty">Nessuna auto aggiunta.</div>`}
  </div>`;
}
function toggleArchivedCars(){ showArchivedCars=!showArchivedCars; render(); }
function archiveCar(id){
  pushUndo(); const c=state.cars.find(x=>x.id===id); if(!c) return; c.archived=true; logActivity('archived','car', c.name); saveState(); }
function unarchiveCar(id){
  pushUndo(); const c=state.cars.find(x=>x.id===id); if(!c) return; c.archived=false; logActivity('restored','car', c.name+' (dall\u2019archivio)'); saveState(); }
function carKmEstimate(c){
  if(!c.km || !c.lastServiceKm || !c.serviceIntervalKm) return null;
  const remaining = (Number(c.lastServiceKm)+Number(c.serviceIntervalKm)) - Number(c.km);
  if(remaining<=0) return `⚠️ Tagliando scaduto da circa ${Math.abs(remaining).toLocaleString('it-IT')} km`;
  if(remaining<=1000) return `🔧 Prossimo tagliando tra circa ${remaining.toLocaleString('it-IT')} km`;
  return `Prossimo tagliando stimato tra circa ${remaining.toLocaleString('it-IT')} km`;
}
function carCostPerKm(c){
  if(!c.startKm || !c.km || Number(c.km)<=Number(c.startKm)) return null;
  const totalCost = state.carEvents.filter(e=>e.carId===c.id).reduce((s,e)=>s+(Number(e.cost)||0),0);
  const kmDriven = Number(c.km)-Number(c.startKm);
  if(kmDriven<=0 || totalCost<=0) return null;
  return totalCost/kmDriven;
}
function openCarForm(id){
  const c = id ? state.cars.find(x=>x.id===id) : {name:'',plate:'',model:'',year:'',km:'',startKm:'',lastServiceKm:'',serviceIntervalKm:''};
  openModal(`
    <h3>${id?'Modifica auto':'Nuova auto'}</h3>
    <div class="field"><label>Nome (es. "Panda", "Auto di famiglia")</label><input id="f_name" value="${esc(c.name||'')}"></div>
    <div class="field-row"><div class="field"><label>Targa</label><input id="f_plate" value="${esc(c.plate||'')}"></div><div class="field"><label>Anno</label><input type="number" id="f_year" value="${c.year||''}"></div></div>
    <div class="field-row"><div class="field"><label>Modello</label><input id="f_model" value="${esc(c.model||'')}"></div><div class="field"><label>Km attuali</label><input type="number" id="f_km" value="${c.km||''}"></div></div>
    <div class="field"><label>Km iniziali (per calcolare il costo al km)</label><input type="number" id="f_startKm" value="${c.startKm||''}" placeholder="km quando hai iniziato a tracciare"></div>
    <div class="section-label">Promemoria tagliando basato sui km (opzionale)</div>
    <div class="field-row"><div class="field"><label>Km all'ultimo tagliando</label><input type="number" id="f_lastServiceKm" value="${c.lastServiceKm||''}"></div><div class="field"><label>Intervallo tagliando (km)</label><input type="number" id="f_serviceIntervalKm" value="${c.serviceIntervalKm||''}" placeholder="es. 15000"></div></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveCar('${id||''}')">Salva</button></div>
  `);
}
function saveCar(id){
  pushUndo();
  let item = id ? state.cars.find(x=>x.id===id) : {id:uid()};
  item.name=val('f_name'); item.plate=val('f_plate'); item.model=val('f_model'); item.year=val('f_year'); item.km=val('f_km'); item.startKm=val('f_startKm');
  item.lastServiceKm=val('f_lastServiceKm'); item.serviceIntervalKm=val('f_serviceIntervalKm');
  if(!id) state.cars.push(item);
  logActivity(id?'edited':'added','car', item.name);
  closeModal(); saveState();
}
function deleteCar(id){
  pushUndo();
  const c = state.cars.find(x=>x.id===id); if(!c) return;
  trashItem('car', c, c.name);
  state.cars=state.cars.filter(x=>x.id!==id);
  state.carEvents = state.carEvents.filter(e=>{ if(e.carId===id){ removeExpense('car-'+e.id); removeLinkedEvent('carevt-'+e.id); } return e.carId!==id; });
  saveState();
}
function openCarEventForm(id, carId){
  const e = id ? state.carEvents.find(x=>x.id===id) : {type:'Tagliando',date:todayStr(),note:'',cost:'',carId,tags:[]};
  openModal(`
    <h3>${id?'Modifica evento auto':'Nuovo evento auto'}</h3>
    <div class="field"><label>Tipo</label><select id="f_type">${['Tagliando','Revisione','Bollo','Assicurazione','Riparazione','Altro'].map(t=>`<option ${e.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
    <div class="field-row"><div class="field"><label>Data</label><input type="date" id="f_date" value="${e.date||''}"></div><div class="field"><label>Costo (opzionale)</label><input type="number" step="0.01" id="f_cost" value="${e.cost||''}"></div></div>
    <div class="field"><label>Note</label><textarea id="f_note">${esc(e.note||'')}</textarea></div>
    <div class="field"><label>Etichette (separate da virgola)</label><input id="f_tags" value="${esc((e.tags||[]).join(', '))}"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveCarEvent('${id||''}','${carId}')">Salva</button></div>
  `);
}
function saveCarEvent(id, carId){
  pushUndo();
  let item = id ? state.carEvents.find(x=>x.id===id) : {id:uid(), carId};
  item.type=val('f_type'); item.date=val('f_date'); item.note=val('f_note'); item.cost=val('f_cost'); item.tags=parseTags(val('f_tags'));
  if(!id) state.carEvents.push(item);
  upsertExpense('car-'+item.id, item.type, item.cost, item.date, 'Auto');
  const car = state.cars.find(x=>x.id===carId);
  syncLinkedEvent('carevt-'+item.id, item.date, (car?car.name+' - ':'')+item.type, 'Auto');
  logActivity(id?'edited':'added','carEvent', item.type);
  closeModal(); saveState();
}
function deleteCarEvent(id){
  pushUndo();
  const e = state.carEvents.find(x=>x.id===id); if(!e) return;
  trashItem('carEvent', e, e.type);
  state.carEvents=state.carEvents.filter(x=>x.id!==id); removeExpense('car-'+id); removeLinkedEvent('carevt-'+id); saveState();
}

// ===== CALENDARIO =====
const MONTHS = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const DOW = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
function occursOn(e, y, m, d){
  if(!e.date) return false;
  const [by,bm,bd] = e.date.split('-').map(Number);
  const target = new Date(y,m,d); const base = new Date(by,bm-1,bd);
  if(target < base) return false;
  const recur = e.recur||'none';
  if(recur==='none') return by===y && (bm-1)===m && bd===d;
  if(recur==='monthly') return bd===d;
  if(recur==='yearly') return (bm-1)===m && bd===d;
  return false;
}
function italianEasterDate(year){
  // Meeus/Jones/Butcher: domenica di Pasqua nel calendario gregoriano
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
  return new Date(year,month-1,day);
}
function italianHolidays(year){
  const fixed=[['Capodanno',1,1],['Epifania',1,6],['Festa della Liberazione',4,25],['Festa dei Lavoratori',5,1],['Festa della Repubblica',6,2],['Ferragosto',8,15],['Tutti i Santi',11,1],['Immacolata Concezione',12,8],['Natale',12,25],['Santo Stefano',12,26]];
  const events=fixed.map(([title,month,day])=>({id:`holiday-${year}-${month}-${day}`,title,date:`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,category:'Festività',note:'Festività nazionale italiana',nationalHoliday:true,recur:'none'}));
  const easter=italianEasterDate(year), easterMonday=new Date(easter); easterMonday.setDate(easter.getDate()+1);
  for(const [title,date] of [['Pasqua',easter],['Lunedì dell’Angelo',easterMonday]]) events.push({id:`holiday-${year}-${title}`,title,date:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,category:'Festività',note:'Festività nazionale italiana',nationalHoliday:true,recur:'none'});
  return events;
}
function eventsOnDate(y,m,d){
  const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  return [...state.events.filter(e=>occursOn(e,y,m,d)),...italianHolidays(y).filter(e=>e.date===date)];
}
function renderCalendar(){ return calMode==='week' ? renderCalendarWeek() : renderCalendarMonth(); }
function renderCalendarMonth(){
  const first = new Date(calYear, calMonth, 1);
  const startOffset = (first.getDay()+6)%7;
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const cells = []; for(let i=0;i<startOffset;i++) cells.push(null); for(let d=1;d<=daysInMonth;d++) cells.push(d);
  const todayD = new Date();
  const isToday = (d)=> d && todayD.getFullYear()===calYear && todayD.getMonth()===calMonth && todayD.getDate()===d;
  return `
  <div class="card">
    <div class="cal-head">
      <div class="title-group">${sectionIcon('calendar','var(--c-calendario)','var(--c-calendario-soft)')}<h2>${MONTHS[calMonth]} ${calYear}</h2></div>
      <div class="cal-nav">
        <button class="btn small ${calMode==='month'?'subtle':'ghost'}" onclick="setCalMode('month')">Mese</button>
        <button class="btn small ${calMode==='week'?'subtle':'ghost'}" onclick="setCalMode('week')">Settimana</button>
        <button class="btn small ghost" onclick="calPrev()">‹</button><button class="btn small ghost" onclick="calToday()">Oggi</button><button class="btn small ghost" onclick="calNext()">›</button>
      </div>
    </div>
    <div class="cal-legend">${EVENT_CATS.map(c=>`<span class="legend-item"><span class="legend-dot" style="background:${EVENT_CAT_COLORS[c]};"></span>${c}</span>`).join('')}<span class="legend-item"><span class="legend-dot" style="background:#B85C38;"></span>Festività</span><span class="legend-item"><span class="legend-dot" style="background:${EVENT_CAT_COLORS.Amministrazione};"></span>Automatico</span></div>
    <div class="cal-grid">
      ${DOW.map(d=>`<div class="cal-dow">${d}</div>`).join('')}
      ${cells.map(d=>{
        if(!d) return `<div class="cal-day empty"></div>`;
        const evts = eventsOnDate(calYear, calMonth, d);
        const shown = evts.slice(0,2); const extra = evts.length-shown.length;
        return `<div class="cal-day ${isToday(d)?'today':''}" onclick="openDay(${d})">
          <div class="num">${d}</div>
          ${shown.map(e=>`<div class="cal-evt" style="background:${eventColor(e)};">${esc(e.title)}</div>`).join('')}
          ${extra>0?`<div class="cal-evt more">+${extra} altro</div>`:''}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
function renderCalendarWeek(){
  const ref = new Date(weekRef); const dow=(ref.getDay()+6)%7;
  const monday = new Date(ref); monday.setDate(ref.getDate()-dow);
  const days = []; for(let i=0;i<7;i++){ const d=new Date(monday); d.setDate(monday.getDate()+i); days.push(d); }
  const todayD = new Date();
  const label = `${days[0].getDate()} ${MONTHS[days[0].getMonth()].slice(0,3)} – ${days[6].getDate()} ${MONTHS[days[6].getMonth()].slice(0,3)} ${days[6].getFullYear()}`;
  return `
  <div class="card">
    <div class="cal-head">
      <div class="title-group">${sectionIcon('calendar','var(--c-calendario)','var(--c-calendario-soft)')}<h2 style="text-transform:none;">${label}</h2></div>
      <div class="cal-nav">
        <button class="btn small ${calMode==='month'?'subtle':'ghost'}" onclick="setCalMode('month')">Mese</button>
        <button class="btn small ${calMode==='week'?'subtle':'ghost'}" onclick="setCalMode('week')">Settimana</button>
        <button class="btn small ghost" onclick="weekPrev()">‹</button><button class="btn small ghost" onclick="weekToday()">Oggi</button><button class="btn small ghost" onclick="weekNext()">›</button>
      </div>
    </div>
    <div class="week-grid">
      ${days.map(d=>{
        const evts = eventsOnDate(d.getFullYear(), d.getMonth(), d.getDate()).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
        const isToday = d.toDateString()===todayD.toDateString();
        return `<div class="week-day ${isToday?'today':''}">
          <div class="week-day-head">${DOW[(d.getDay()+6)%7]} <span>${d.getDate()}</span></div>
          <div class="week-day-body">
            ${evts.length? evts.map(e=>`<div class="cal-evt" style="margin-bottom:4px;cursor:pointer;background:${eventColor(e)};" onclick="openWeekDay(${d.getFullYear()},${d.getMonth()},${d.getDate()})">${e.time?esc(e.time)+' · ':''}${esc(e.title)}</div>`).join('') : `<div class="empty" style="padding:8px 2px;font-size:11.5px;cursor:pointer;" onclick="openWeekDay(${d.getFullYear()},${d.getMonth()},${d.getDate()})">aggiungi</div>`}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
function setCalMode(m){ calMode=m; render(); }
function calPrev(){ calMonth--; if(calMonth<0){calMonth=11;calYear--;} render(); }
function calNext(){ calMonth++; if(calMonth>11){calMonth=0;calYear++;} render(); }
function calToday(){ const n=new Date(); calMonth=n.getMonth(); calYear=n.getFullYear(); render(); }
function weekPrev(){ weekRef.setDate(weekRef.getDate()-7); render(); }
function weekNext(){ weekRef.setDate(weekRef.getDate()+7); render(); }
function weekToday(){ weekRef = new Date(); render(); }
function openWeekDay(y,m,d){ calYear=y; calMonth=m; openDay(d); }
function dateStr(d){ return `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function openDay(d){
  selectedDay = d; renderSidebar();
  document.getElementById('sidebar').classList.add('active'); document.getElementById('scrim').classList.add('active');
}
function closeSidebar(){ document.getElementById('sidebar').classList.remove('active'); document.getElementById('scrim').classList.remove('active'); }
document.getElementById('scrim').addEventListener('click', closeSidebar);
function renderSidebar(){
  const ds = dateStr(selectedDay); const [y,m,d] = ds.split('-').map(Number);
  const evts = eventsOnDate(y, m-1, d).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  document.getElementById('sidebar').innerHTML = `
    <div class="sidebar-head"><h3>${selectedDay} ${MONTHS[m-1]}</h3><button class="btn small ghost" onclick="closeSidebar()">Chiudi</button></div>
    <button class="btn primary" style="width:100%;margin-bottom:14px;" onclick="closeSidebar(); openEventForm(null,'${ds}')">Aggiungi impegno</button>
    ${evts.length? evts.map(e=>`
      <div class="item">
        <div class="item-top">
          <div><div class="item-title"><span class="legend-dot" style="background:${eventColor(e)};"></span>${e.time?esc(e.time)+' · ':''}${esc(e.title)} ${e.nationalHoliday?'<span class="tag holiday-tag">Festività nazionale</span>':''}${e.linkedFrom?'<span class="tag">Auto</span>':''}${e.recur&&e.recur!=='none'?`<span class="tag badge-recur">${e.recur==='monthly'?'ogni mese':'ogni anno'}</span>`:''}</div>${e.note?`<div class="item-desc">${esc(e.note)}</div>`:''}</div>
          ${e.nationalHoliday?'':`<div class="item-actions"><button class="btn small ghost" onclick="closeSidebar(); openEventForm('${e.id}','${ds}')">Modifica</button><button class="btn small danger ghost" onclick="confirmDelete('Eliminare questo impegno?', ()=>deleteEvent('${e.id}'))">Elimina</button></div>`}
        </div>
      </div>`).join('') : `<div class="empty">Nessun impegno questo giorno.</div>`}
  `;
}
function openEventForm(id, ds){
  const e = id ? state.events.find(x=>x.id===id) : {title:'',time:'',note:'',date:ds,recur:'none',category:'Altro'};
  const isLinked = e.linkedFrom;
  openModal(`
    <h3>${id?'Modifica impegno':'Nuovo impegno'}</h3>
    ${isLinked?`<div class="notice">Questo impegno è collegato automaticamente a una scadenza (${esc(e.note||'')}). Modificalo dalla sezione di origine se vuoi cambiarne la data.</div>`:''}
    <div class="field"><label>Titolo</label><input id="f_title" value="${esc(e.title||'')}" ${isLinked?'disabled':''}></div>
    <div class="field-row"><div class="field"><label>Data</label><input type="date" id="f_date" value="${e.date||ds}" ${isLinked?'disabled':''}></div><div class="field"><label>Ora (opzionale)</label><input type="time" id="f_time" value="${e.time||''}"></div></div>
    <div class="field-row">
      <div class="field"><label>Ripetizione</label><select id="f_recur" ${isLinked?'disabled':''}>
        <option value="none" ${(e.recur||'none')==='none'?'selected':''}>Nessuna</option>
        <option value="monthly" ${e.recur==='monthly'?'selected':''}>Ogni mese</option>
        <option value="yearly" ${e.recur==='yearly'?'selected':''}>Ogni anno</option>
      </select></div>
      <div class="field"><label>Categoria</label><select id="f_category" ${isLinked?'disabled':''}>${EVENT_CATS.map(c=>`<option ${(e.category||'Altro')===c?'selected':''}>${c}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Note</label><textarea id="f_note" ${isLinked?'disabled':''}>${esc(e.note||'')}</textarea></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveEvent('${id||''}')">Salva</button></div>
  `);
}
function saveEvent(id){
  pushUndo();
  let item = id ? state.events.find(x=>x.id===id) : {id:uid()};
  if(item.linkedFrom){
    item.time=val('f_time'); closeModal(); saveState(); renderSidebar();
    document.getElementById('sidebar').classList.add('active'); document.getElementById('scrim').classList.add('active');
    return;
  }
  if(!val('f_title')){ alert('Aggiungi un titolo.'); return; }
  item.title=val('f_title'); item.date=val('f_date'); item.time=val('f_time'); item.note=val('f_note'); item.recur=val('f_recur'); item.category=val('f_category');
  if(!id) state.events.push(item);
  logActivity(id?'edited':'added','event', item.title);
  const [y,m,d] = item.date.split('-').map(Number); calYear=y; calMonth=m-1; selectedDay=d;
  closeModal(); saveState(); renderSidebar();
  document.getElementById('sidebar').classList.add('active'); document.getElementById('scrim').classList.add('active');
}
function deleteEvent(id){
  pushUndo();
  const e = state.events.find(x=>x.id===id); if(!e) return;
  if(!e.linkedFrom) trashItem('event', e, e.title);
  state.events=state.events.filter(x=>x.id!==id); saveState(); renderSidebar();
}

// ---------- esporta/importa calendario .ics ----------
function icsEscape(s){ return String(s||'').replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n'); }
function unescapeIcsText(s){ return String(s||'').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\n/g,'\n').trim(); }
function exportICS(){
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Il mio taccuino//IT\r\nCALSCALE:GREGORIAN\r\n';
  state.events.forEach(e=>{
    if(!e.date) return;
    const dt = e.date.replace(/-/g,'');
    let rrule = '';
    if(e.recur==='monthly') rrule = 'RRULE:FREQ=MONTHLY\r\n';
    if(e.recur==='yearly') rrule = 'RRULE:FREQ=YEARLY\r\n';
    ics += `BEGIN:VEVENT\r\nUID:${e.id}@iltaccuino\r\nDTSTAMP:${dt}T000000Z\r\nDTSTART;VALUE=DATE:${dt}\r\n${rrule}SUMMARY:${icsEscape(e.title)}\r\n${e.note?('DESCRIPTION:'+icsEscape(e.note)+'\r\n'):''}END:VEVENT\r\n`;
  });
  ics += 'END:VCALENDAR\r\n';
  const blob = new Blob([ics], {type:'text/calendar;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`calendario-taccuino-${todayStr()}.ics`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function importICS(input){
  pushUndo();
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try{
      const text = e.target.result;
      const blocks = text.split('BEGIN:VEVENT').slice(1);
      let count = 0;
      blocks.forEach(b=>{
        const body = b.split('END:VEVENT')[0];
        const summaryM = body.match(/SUMMARY:(.*)/);
        const dtM = body.match(/DTSTART[^:]*:(\d{8})(T(\d{2})(\d{2}))?/);
        const descM = body.match(/DESCRIPTION:(.*)/);
        const rruleM = body.match(/RRULE:.*FREQ=(\w+)/);
        if(!summaryM || !dtM) return;
        const y=dtM[1].slice(0,4), mo=dtM[1].slice(4,6), d=dtM[1].slice(6,8);
        const date = `${y}-${mo}-${d}`;
        const time = dtM[3] ? `${dtM[3]}:${dtM[4]}` : '';
        let recur='none';
        if(rruleM){ if(/MONTHLY/.test(rruleM[1])) recur='monthly'; if(/YEARLY/.test(rruleM[1])) recur='yearly'; }
        state.events.push({id:uid(), title: unescapeIcsText(summaryM[1]), date, time, note: descM?unescapeIcsText(descM[1]):'', recur});
        count++;
      });
      logActivity('added','event', `${count} eventi importati da .ics`);
      saveState(); toast(`${count} eventi importati.`);
    }catch(err){ alert('File .ics non valido o non supportato.'); }
  };
  reader.readAsText(file); input.value='';
}

// ===== AMMINISTRAZIONE =====
const PDOC_TYPES = ["Carta d'identità",'Passaporto','Patente','Tessera sanitaria','Altro'];
const CONTACT_CATS = ['Idraulico','Elettricista','Muratore/Edile','Meccanico','Medico di famiglia','Altro'];
// ===== BENESSERE =====
const WELLNESS_PRESETS = {
  'Acqua': { icon:'droplet', color:'#00A6FB', scheduleType:'interval', intervalMinutes:120, activeStart:'08:00', activeEnd:'21:00', label:'Bevi un bicchiere d\u2019acqua' },
  'Meditazione': { icon:'spark', color:'#006494', scheduleType:'daily', time:'08:00', label:'Qualche minuto di meditazione' },
  'Movimento': { icon:'spark', color:'#0582CA', scheduleType:'daily', time:'18:00', label:'Un po\u2019 di movimento o stretching' },
  'Sonno': { icon:'spark', color:'#003554', scheduleType:'daily', time:'22:30', label:'Prepararsi ad andare a dormire' },
  'Altro': { icon:'spark', color:'#4F7A91', scheduleType:'daily', time:'09:00', label:'' }
};
const WELLNESS_MESSAGES = {
  'Acqua': ['💧 È ora di bere un bicchiere d\u2019acqua.', '💧 Piccola pausa idratazione!', '💧 Il tuo corpo ti ringrazia: bevi un po\u2019 d\u2019acqua.'],
  'Meditazione': ['🧘 Qualche minuto per te: respira e rilassati.', '🧘 Momento di calma: 5 minuti di meditazione?', '🧘 Fermati un attimo e respira profondamente.'],
  'Movimento': ['🤸 Alzati e muoviti un po\u2019!', '🤸 Due minuti di stretching ti farebbero bene.', '🤸 Il corpo ha bisogno di movimento: dai, su!'],
  'Sonno': ['🌙 Comincia a prepararti per andare a dormire.', '🌙 Tra poco è ora di riposare.'],
  'Altro': ['✨ Promemoria: '],
};
function wellnessMessage(routine){
  const arr = WELLNESS_MESSAGES[routine.category] || WELLNESS_MESSAGES['Altro'];
  const base = arr[Math.floor(Math.random()*arr.length)];
  return routine.category==='Altro' ? base + routine.label : base;
}
function lastNDays(n){
  const days = [];
  for(let i=n-1;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days.push(isoLocal(d).slice(0,10)); }
  return days;
}
function computeRoutineStreak(routine){
  const done = new Set(routine.doneDates||[]);
  let streak = 0;
  let cursor = new Date();
  // se oggi non ancora fatto, parto comunque da ieri per non azzerare subito lo streak durante la giornata
  if(!done.has(isoLocal(cursor).slice(0,10))) cursor.setDate(cursor.getDate()-1);
  while(done.has(isoLocal(cursor).slice(0,10))){ streak++; cursor.setDate(cursor.getDate()-1); }
  return streak;
}
function renderWellness(){
  const routines = state.wellness.routines||[];
  const notifSupported = isNativeApp() ? !!nativeNotifications() : ('Notification' in window);
  const notifGranted = notifGrantedCache;
  return `
  <div class="card">
    <div class="card-head"><div class="title-group">${sectionIcon('droplet','var(--c-salute)','var(--c-salute-soft)')}<h2>Benessere</h2></div><button class="btn primary" onclick="openRoutineForm()">Aggiungi routine</button></div>
    <div class="section-label">Promemoria per bere acqua, meditare, muoverti o qualsiasi altra piccola abitudine. ${isNativeApp() ? 'Le notifiche vengono programmate sul telefono e arrivano anche ad app chiusa. Riapri l’app ogni tanto per mantenere aggiornata la programmazione.' : 'Nel browser i promemoria funzionano finché tieni questa pagina aperta; nell’app per telefono arrivano anche ad app chiusa.'}</div>
    ${notifSupported && !notifGranted ? `<div class="notice">Attiva le notifiche per ricevere i promemoria. <button class="btn small subtle" style="margin-left:8px;" onclick="requestWellnessNotifications()">Attiva notifiche</button></div>` : ''}
    ${routines.length? routines.map(r=>{
      const streak = computeRoutineStreak(r);
      const days = lastNDays(7);
      const doneToday = (r.doneDates||[]).includes(todayStr());
      const schedule = r.scheduleType==='interval' ? `Ogni ${r.intervalMinutes} min, dalle ${r.activeStart} alle ${r.activeEnd}` : `Ogni giorno alle ${r.time}`;
      return `<div class="item">
        <div class="item-top">
          <div><span class="tag" style="background:${r.color||'var(--c-salute-soft)'}22;color:${r.color||'var(--c-salute)'};border-color:transparent;">${esc(r.category)}</span>${!r.enabled?'<span class="tag archived">In pausa</span>':''}<div class="item-title">${esc(r.label)}</div><div class="item-meta">${schedule}${streak>0?(' · 🔥 '+streak+' giorni di fila'):''}</div></div>
          <div class="item-actions">
            <button class="btn small ${doneToday?'subtle':'primary'}" onclick="toggleRoutineDoneToday('${r.id}')">${doneToday?'✅ Fatto oggi':'Segna fatto oggi'}</button>
            <button class="btn small ghost" onclick="toggleRoutineEnabled('${r.id}')">${r.enabled?'Metti in pausa':'Riattiva'}</button>
            <button class="btn small ghost" onclick="openRoutineForm('${r.id}')">Modifica</button>
            <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questa routine?', ()=>deleteRoutine('${r.id}'))">Elimina</button>
          </div>
        </div>
        <div class="week-dots">${days.map(d=>`<span class="week-dot ${(r.doneDates||[]).includes(d)?'done':''}" title="${fmtD(d)}"></span>`).join('')}</div>
      </div>`;
    }).join('') : `<div class="empty">Nessuna routine impostata. Aggiungine una per iniziare — acqua, meditazione, movimento o quello che vuoi tu.</div>`}
  </div>`;
}
// Rileva se l'app gira dentro il contenitore nativo Capacitor (iOS/Android)
// oppure in un normale browser (dove usiamo le notifiche del browser per i test).
function isNativeApp(){
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}
function nativeNotifications(){
  return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
}
function openRoutineForm(id){
  const r = id ? state.wellness.routines.find(x=>x.id===id) : {category:'Acqua', ...WELLNESS_PRESETS['Acqua'], enabled:true, doneDates:[]};
  openModal(`
    <h3>${id?'Modifica routine':'Nuova routine'}</h3>
    <div class="field"><label>Categoria</label><select id="f_category" onchange="applyWellnessPreset(this.value)">${Object.keys(WELLNESS_PRESETS).map(c=>`<option ${r.category===c?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Etichetta (cosa ti deve ricordare)</label><input id="f_label" value="${esc(r.label||'')}"></div>
    <div class="field"><label>Tipo di promemoria</label><select id="f_scheduleType" onchange="toggleWellnessScheduleFields(this.value)">
      <option value="interval" ${r.scheduleType==='interval'?'selected':''}>Ad intervalli durante il giorno (es. acqua)</option>
      <option value="daily" ${r.scheduleType==='daily'?'selected':''}>Una volta al giorno ad un orario fisso</option>
    </select></div>
    <div id="wellnessIntervalFields" style="display:${r.scheduleType==='interval'?'block':'none'};">
      <div class="field-row">
        <div class="field"><label>Ogni quanti minuti</label><input type="number" id="f_intervalMinutes" value="${r.intervalMinutes||120}"></div>
        <div class="field"><label>Dalle</label><input type="time" id="f_activeStart" value="${r.activeStart||'08:00'}"></div>
        <div class="field"><label>Alle</label><input type="time" id="f_activeEnd" value="${r.activeEnd||'21:00'}"></div>
      </div>
    </div>
    <div id="wellnessDailyFields" style="display:${r.scheduleType==='daily'?'block':'none'};">
      <div class="field"><label>A che ora</label><input type="time" id="f_time" value="${r.time||'09:00'}"></div>
    </div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveRoutine('${id||''}')">Salva</button></div>
  `);
}
function applyWellnessPreset(cat){
  const p = WELLNESS_PRESETS[cat]; if(!p) return;
  document.getElementById('f_label').value = p.label;
  document.getElementById('f_scheduleType').value = p.scheduleType;
  toggleWellnessScheduleFields(p.scheduleType);
  if(p.scheduleType==='interval'){
    document.getElementById('f_intervalMinutes').value = p.intervalMinutes;
    document.getElementById('f_activeStart').value = p.activeStart;
    document.getElementById('f_activeEnd').value = p.activeEnd;
  } else {
    document.getElementById('f_time').value = p.time;
  }
}
function toggleWellnessScheduleFields(type){
  document.getElementById('wellnessIntervalFields').style.display = type==='interval' ? 'block':'none';
  document.getElementById('wellnessDailyFields').style.display = type==='daily' ? 'block':'none';
}
function saveRoutine(id){
  pushUndo();
  const category = val('f_category');
  let item = id ? state.wellness.routines.find(x=>x.id===id) : {id:uid(), enabled:true, doneDates:[], lastFiredAt:0, lastFiredDate:''};
  item.category = category;
  item.label = val('f_label') || WELLNESS_PRESETS[category].label || category;
  item.scheduleType = val('f_scheduleType');
  item.color = WELLNESS_PRESETS[category] ? WELLNESS_PRESETS[category].color : '#0582CA';
  if(item.scheduleType==='interval'){
    item.intervalMinutes = Number(val('f_intervalMinutes'))||120;
    item.activeStart = val('f_activeStart')||'08:00';
    item.activeEnd = val('f_activeEnd')||'21:00';
  } else {
    item.time = val('f_time')||'09:00';
  }
  if(!id) state.wellness.routines.push(item);
  logActivity(id?'edited':'added','routine', item.label);
  closeModal(); saveState(); toast('Routine salvata.');
}
function toggleRoutineEnabled(id){
  pushUndo();
  const r = state.wellness.routines.find(x=>x.id===id); if(!r) return;
  r.enabled = !r.enabled; saveState();
}
function toggleRoutineDoneToday(id){
  pushUndo();
  const r = state.wellness.routines.find(x=>x.id===id); if(!r) return;
  r.doneDates = r.doneDates||[];
  const t = todayStr();
  if(r.doneDates.includes(t)) r.doneDates = r.doneDates.filter(d=>d!==t);
  else r.doneDates.push(t);
  saveState();
}
function deleteRoutine(id){
  pushUndo();
  const r = state.wellness.routines.find(x=>x.id===id); if(!r) return;
  trashItem('routine', r, r.label);
  state.wellness.routines = state.wellness.routines.filter(x=>x.id!==id); saveState();
}

// ---------- motore promemoria benessere ----------
let wellnessEngineStarted = false;
function startWellnessEngine(){
  if(wellnessEngineStarted) return;
  wellnessEngineStarted = true;
  checkWellnessReminders();
  setInterval(()=>{ checkWellnessReminders(); checkWebDeadlines(); }, 60000);
}
function checkWellnessReminders(){
  if(!state.wellness || !state.wellness.routines) return;
  if(isNativeApp() && nativeNotifications()) return;   // nell'app le notifiche sono programmate dal sistema (vedi rescheduleNotifications)
  const now = new Date();
  const hh = String(now.getHours()).padStart(2,'0'), mm = String(now.getMinutes()).padStart(2,'0');
  const nowHM = `${hh}:${mm}`;
  let changed = false;
  state.wellness.routines.forEach(r=>{
    if(!r.enabled) return;
    if(r.scheduleType==='interval'){
      if(nowHM < r.activeStart || nowHM > r.activeEnd) return;
      const last = r.lastFiredAt||0;
      if(Date.now() - last >= (r.intervalMinutes||120)*60000){
        fireWellnessReminder(r); r.lastFiredAt = Date.now(); changed = true;
      }
    } else if(r.scheduleType==='daily'){
      if(r.time===nowHM && r.lastFiredDate!==todayStr()){
        fireWellnessReminder(r); r.lastFiredDate = todayStr(); changed = true;
      }
    }
  });
  if(changed) cacheStateOffline();   // l'ultimo promemoria è un dato locale: niente scritture sul server
}
function fireWellnessReminder(routine){
  const message = wellnessMessage(routine);
  if(isNativeApp() && nativeNotifications()){
    // id numerico richiesto dal plugin nativo: lo ricavo dall'id della routine
    const numericId = Math.abs(Array.from(routine.id).reduce((h,c)=>((h<<5)-h+c.charCodeAt(0))|0, 0)) % 2147483647;
    nativeNotifications().schedule({
      notifications: [{
        id: numericId,
        title: routine.label,
        body: message,
        schedule: { at: new Date(Date.now() + 500) }
      }]
    }).catch(()=>{ /* se la pianificazione nativa fallisce, resta comunque il toast qui sotto */ });
  } else if('Notification' in window && Notification.permission==='granted'){
    try{ new Notification(routine.label, { body: message, icon:'/icons/icon-192.png' }); }catch(e){ /* ignoro se il browser blocca */ }
  }
  toast(message);
}

function renderAdmin(){
  const docs = [...state.personalDocs].sort((a,b)=>(a.expiryDate||'').localeCompare(b.expiryDate||''));
  const contacts = [...state.contacts].sort((a,b)=>a.name.localeCompare(b.name));
  return `
  <div class="card">
    <div class="card-head"><div class="title-group">${sectionIcon('doc','var(--c-calendario)','var(--c-calendario-soft)')}<h2>Documenti personali</h2></div><button class="btn primary" onclick="openPersonalDocForm()">Aggiungi documento</button></div>
    <div class="section-label">Carta d'identità, passaporto, patente: le scadenze appaiono anche in Panoramica e nel Calendario.</div>
    ${docs.length? docs.map(p=>`
      <div class="item"><div class="item-top">
        <div><span class="tag">${esc(p.type)}</span><div class="item-title">${esc(p.title||p.type)}</div><div class="item-meta">${p.number?('N. '+esc(p.number)+' · '):''}${p.expiryDate?('Scade il '+fmtD(p.expiryDate)):'Nessuna scadenza impostata'}</div>${p.note?`<div class="item-desc">${esc(p.note)}</div>`:''}${tagsChips(p.tags)}</div>
        <div class="item-actions"><button class="btn small ghost" onclick="openPersonalDocForm('${p.id}')">Modifica</button><button class="btn small danger ghost" onclick="confirmDelete('Eliminare questo documento?', ()=>deletePersonalDoc('${p.id}'))">Elimina</button></div>
      </div>
      ${p.files&&p.files.length?`<div class="files-row">${p.files.map((f)=>`<span class="file-chip">📎 <a href="#" onclick="openAttachment('${encodeURIComponent(f.path)}'); return false;">${esc(f.name)}</a></span>`).join('')}</div>`:''}
      </div>`).join('') : `<div class="empty">Nessun documento personale archiviato.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Rubrica contatti utili</h2><button class="btn primary" onclick="openContactForm()">Aggiungi contatto</button></div>
    ${contacts.length? contacts.map(c=>`
      <div class="item"><div class="item-top">
        <div><span class="tag">${esc(c.category)}</span><div class="item-title">${esc(c.name)}</div>${c.phone?`<div class="item-meta"><a class="tel-link" href="tel:${esc(c.phone.replace(/[^\d+]/g,''))}">📞 ${esc(c.phone)}</a></div>`:''}${c.note?`<div class="item-desc">${esc(c.note)}</div>`:''}</div>
        <div class="item-actions"><button class="btn small ghost" onclick="openContactForm('${c.id}')">Modifica</button><button class="btn small danger ghost" onclick="confirmDelete('Eliminare questo contatto?', ()=>deleteContact('${c.id}'))">Elimina</button></div>
      </div></div>`).join('') : `<div class="empty">Nessun contatto salvato.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Beni importanti</h2><button class="btn primary" onclick="openAssetForm()">Aggiungi bene</button></div>
    <div class="section-label">Elettrodomestici, mobili o altri acquisti importanti. Il costo totale somma il prezzo d'acquisto e le spese del Salvadanaio che hanno la stessa etichetta.</div>
    ${state.assets.length? state.assets.map(a=>{
      const linked = state.expenses.filter(e=>(e.tags||[]).includes(a.name));
      const linkedTotal = linked.reduce((s,e)=>s+e.amount,0);
      const total = (Number(a.purchasePrice)||0) + linkedTotal;
      return `<div class="item"><div class="item-top">
        <div><div class="item-title">${esc(a.name)}</div><div class="item-meta">${a.purchaseDate?('Acquistato il '+fmtD(a.purchaseDate)+' · '):''}Prezzo: ${euro(a.purchasePrice)}${linked.length?(' · +'+linked.length+' spesa/e collegate'):''}</div>${a.note?`<div class="item-desc">${esc(a.note)}</div>`:''}</div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="text-align:right;"><div class="item-meta">Costo totale</div><div style="font-weight:700;">${euro(total)}</div></div>
          <button class="btn small ghost" onclick="openAssetForm('${a.id}')">Modifica</button>
          <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questo bene?', ()=>deleteAsset('${a.id}'))">Elimina</button>
        </div>
      </div></div>`;
    }).join('') : `<div class="empty">Nessun bene tracciato. Aggiungi un elettrodomestico o un mobile importante per vederne il costo totale nel tempo.</div>`}
  </div>`;
}
function openPersonalDocForm(id){
  const p = id ? state.personalDocs.find(x=>x.id===id) : {title:'',type:PDOC_TYPES[0],number:'',expiryDate:'',note:'',files:[],tags:[]};
  openModal(`
    <h3>${id?'Modifica documento':'Nuovo documento personale'}</h3>
    <div class="field"><label>Tipo</label><select id="f_type">${PDOC_TYPES.map(t=>`<option ${p.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
    <div class="field"><label>Titolo (opzionale, es. "Mia carta d'identità")</label><input id="f_title" value="${esc(p.title||'')}"></div>
    <div class="field-row"><div class="field"><label>Numero documento</label><input id="f_number" value="${esc(p.number||'')}"></div><div class="field"><label>Scadenza</label><input type="date" id="f_expiryDate" value="${p.expiryDate||''}"></div></div>
    <div class="field"><label>Note</label><textarea id="f_note">${esc(p.note||'')}</textarea></div>
    <div class="field"><label>Etichette (separate da virgola)</label><input id="f_tags" value="${esc((p.tags||[]).join(', '))}"></div>
    <div class="field"><label>Foto / scansione</label><div class="file-pickers"><label class="btn small subtle">📷 Scatta foto<input type="file" id="f_camera" accept="image/*" capture="environment" hidden></label><label class="btn small subtle">🖼️ Galleria / file<input type="file" id="f_files" multiple accept="image/*,.pdf" hidden></label></div>
      <div style="font-size:11.5px;color:var(--ink-soft);margin-top:4px;">${p.files&&p.files.length?p.files.length+' file già allegati':'Nessun file allegato'}</div>
    </div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="savePersonalDoc('${id||''}')">Salva</button></div>
  `);
}
async function savePersonalDoc(id){
  pushUndo();
  const newFiles = await readFiles([...document.getElementById('f_files').files,...(document.getElementById('f_camera')?.files||[])]);
  let item = id ? state.personalDocs.find(x=>x.id===id) : {id:uid(), files:[]};
  item.type=val('f_type'); item.title=val('f_title'); item.number=val('f_number'); item.expiryDate=val('f_expiryDate'); item.note=val('f_note'); item.tags=parseTags(val('f_tags'));
  item.files = (item.files||[]).concat(newFiles);
  if(!id) state.personalDocs.push(item);
  syncLinkedEvent('persdoc-'+item.id, item.expiryDate, 'Scadenza '+(item.title||item.type), 'Documento personale');
  logActivity(id?'edited':'added','personalDoc', item.title||item.type);
  closeModal(); saveState(); toast('Documento salvato.');
}
function deletePersonalDoc(id){
  pushUndo();
  const p = state.personalDocs.find(x=>x.id===id); if(!p) return;
  trashItem('personalDoc', p, p.title||p.type);
  state.personalDocs=state.personalDocs.filter(x=>x.id!==id); removeLinkedEvent('persdoc-'+id); saveState();
}
function openContactForm(id){
  const c = id ? state.contacts.find(x=>x.id===id) : {name:'',category:CONTACT_CATS[0],phone:'',note:''};
  openModal(`
    <h3>${id?'Modifica contatto':'Nuovo contatto'}</h3>
    <div class="field"><label>Nome</label><input id="f_name" value="${esc(c.name||'')}"></div>
    <div class="field-row"><div class="field"><label>Categoria</label><select id="f_category">${CONTACT_CATS.map(cc=>`<option ${c.category===cc?'selected':''}>${cc}</option>`).join('')}</select></div><div class="field"><label>Telefono</label><input id="f_phone" value="${esc(c.phone||'')}"></div></div>
    <div class="field"><label>Note</label><textarea id="f_note">${esc(c.note||'')}</textarea></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveContact('${id||''}')">Salva</button></div>
  `);
}
function saveContact(id){
  pushUndo();
  let item = id ? state.contacts.find(x=>x.id===id) : {id:uid()};
  item.name=val('f_name'); item.category=val('f_category'); item.phone=val('f_phone'); item.note=val('f_note');
  if(!id) state.contacts.push(item);
  logActivity(id?'edited':'added','contact', item.name);
  closeModal(); saveState();
}
function deleteContact(id){
  pushUndo();
  const c = state.contacts.find(x=>x.id===id); if(!c) return;
  trashItem('contact', c, c.name);
  state.contacts=state.contacts.filter(x=>x.id!==id); saveState();
}
function openAssetForm(id){
  const a = id ? state.assets.find(x=>x.id===id) : {name:'',purchasePrice:'',purchaseDate:'',note:''};
  openModal(`
    <h3>${id?'Modifica bene':'Nuovo bene'}</h3>
    <div class="field"><label>Nome (es. "Lavatrice cucina")</label><input id="f_name" value="${esc(a.name||'')}"></div>
    <div class="field-row"><div class="field"><label>Prezzo d'acquisto</label><input type="number" step="0.01" id="f_purchasePrice" value="${a.purchasePrice||''}"></div><div class="field"><label>Data acquisto</label><input type="date" id="f_purchaseDate" value="${a.purchaseDate||''}"></div></div>
    <div class="field"><label>Note</label><textarea id="f_note">${esc(a.note||'')}</textarea></div>
    <div class="notice">Per collegare una spesa futura (es. una riparazione), aggiungila in Salvadanaio con l'etichetta "${esc(a.name||'nome del bene')}" — verrà sommata automaticamente qui.</div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveAsset('${id||''}')">Salva</button></div>
  `);
}
function saveAsset(id){
  pushUndo();
  let item = id ? state.assets.find(x=>x.id===id) : {id:uid()};
  item.name=val('f_name'); item.purchasePrice=val('f_purchasePrice'); item.purchaseDate=val('f_purchaseDate'); item.note=val('f_note');
  if(!id) state.assets.push(item);
  logActivity(id?'edited':'added','asset', item.name);
  closeModal(); saveState();
}
function deleteAsset(id){
  pushUndo();
  const a = state.assets.find(x=>x.id===id); if(!a) return;
  trashItem('asset', a, a.name);
  state.assets=state.assets.filter(x=>x.id!==id); saveState();
}

// ===== IMPOSTAZIONI =====
let familyQrScanner = null;
async function showFamilyInvite(){
  if(!planHas('family')){ openPaywall('🔒 PREMIUM · Aggiungere un familiare è incluso nel piano Premium.'); return; }
  try{
    const invite = await taccuinoDB.createFamilyInvite();
    if(!invite?.code) throw new Error('Invito non valido');
    openModal(`
      <h3>Aggiungi familiare</h3>
      <div class="section-label">Mostra questo QR code all'altra persona. L'invito vale 24 ore.</div>
      <div id="familyQrCode" class="family-qr-code"></div>
      <div class="family-code">Codice: <strong>${esc(invite.code)}</strong></div>
      <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Chiudi</button></div>
    `);
    new QRCode(document.getElementById('familyQrCode'), {text:`taccuino-family:${invite.code}`, width:220, height:220, colorDark:'#051923', colorLight:'#ffffff'});
  }catch(e){
    if(/premium_required/i.test(e.message||'')) openPaywall('🔒 PREMIUM · Aggiungere un familiare è incluso nel piano Premium.');
    else toast('Impossibile creare l’invito: '+(e.message||'errore')+' (hai eseguito le migrazioni su Supabase?)');
  }
}
async function joinFamilyWithCode(code){
  const cleanCode = String(code||'').replace(/^taccuino-family:/i,'').trim();
  if(!cleanCode){ toast('Scansiona un QR code valido.'); return; }
  try{
    await stopFamilyScanner();
    await taccuinoDB.joinFamily(cleanCode);
    closeModal();
    toast('Sei entrato nel nucleo familiare. Aggiorno i dati condivisi.');
    setTimeout(()=>location.reload(), 700);
  }catch(e){ toast(/family_owner_not_premium/i.test(e.message||'') ? 'Chi ti ha invitato deve avere il piano Premium per aggiungere familiari.' : (e.message||'Invito non valido o scaduto.')); }
}
async function startFamilyScanner(){
  if(typeof Html5Qrcode==='undefined'){ toast('Scanner QR non disponibile. Controlla la connessione.'); return; }
  try{
    familyQrScanner = new Html5Qrcode('familyQrReader');
    await familyQrScanner.start({facingMode:'environment'}, {fps:10, qrbox:{width:240,height:240}}, text=>joinFamilyWithCode(text));
  }catch(e){ toast('Non riesco ad aprire la fotocamera per leggere il QR.'); }
}
async function stopFamilyScanner(){
  if(!familyQrScanner) return;
  try{ await familyQrScanner.stop(); familyQrScanner.clear(); }catch(e){ /* scanner già fermo */ }
  familyQrScanner = null;
}
function showJoinFamily(){
  openModal(`
    <h3>Unisciti a una famiglia</h3>
    <div class="section-label">Inquadra il QR code dell'altra persona oppure inserisci il codice manualmente.</div>
    <div id="familyQrReader" class="family-qr-reader"></div>
    <div class="field"><label>Codice invito</label><input id="familyInviteCode" placeholder="es. A1B2C3D4E5F6"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="joinFamilyWithCode(val('familyInviteCode'))">Unisciti</button></div>
  `);
  startFamilyScanner();
}
function renderSettings(){
  return `
  <div class="card">
    <div class="card-head"><div class="title-group">${sectionIcon('admin','var(--primary)','var(--c-calendario-soft)')}<h2>Account</h2></div></div>
    <div class="section-label">Il tuo accesso è protetto dalla tua email e password. Se in famiglia siete in più persone, ognuno dovrebbe creare il proprio account invece di condividere questo — i dati restano separati e privati per ciascuno.</div>
    <button class="btn subtle" onclick="logout()">Esci dall'account</button>
  </div>
  ${renderPlanCard()}
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Nucleo familiare</h2></div>
    <div class="section-label">Condividi il taccuino con una persona di fiducia. Entrambi dovete usare account separati; dopo l'unione vedrete gli stessi dati. Aggiungere un familiare richiede il piano Premium; unirsi all’invito di un altro utente è gratuito.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn primary" onclick="showFamilyInvite()">Aggiungi familiare ${planHas('family')?'':'<span class="tag pro-lock">🔒 PREMIUM</span>'}</button><button class="btn subtle" onclick="showJoinFamily()">Unisciti a una famiglia</button></div>
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Assistente AI</h2><span class="tag" ${aiAvailable?'style="background:var(--c-salute-soft);color:var(--c-salute);border-color:transparent;"':''}>${aiAvailable?'Attivo':'🔒 PREMIUM'}</span></div>
    ${aiAvailable
      ? `<div class="section-label">Usa il robot in basso a destra per fare domande sui tuoi dati (spese, bollette, auto, scadenze) o scrivi una frase nell’aggiunta rapida della Panoramica. Le domande passano dai nostri server verso il servizio AI: non serve alcuna chiave. I dati sanitari non vengono mai inviati. C’è un limite giornaliero di richieste.</div>`
      : `<div class="notice">🔒 PREMIUM · L’assistente AI è incluso nel piano Premium. <button class="btn small primary" style="margin-left:8px;" onclick="openPaywall('🔒 PREMIUM · L’assistente AI è incluso nel piano Premium.')">Scopri Premium</button></div>`}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Blocco rapido</h2></div>
    <div class="section-label">Un livello extra oltre all'account: utile se presti il telefono a qualcuno per un attimo.</div>
    <div class="field-row">
      <div class="field"><label>Blocco con PIN</label><select id="set_pinEnabled" onchange="quickUpdateSetting('pinEnabled', this.value==='yes')">
        <option value="yes" ${state.settings.pinEnabled?'selected':''}>Attivo</option>
        <option value="no" ${!state.settings.pinEnabled?'selected':''}>Disattivo</option>
      </select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Blocco automatico dopo inattività (minuti, 0 = mai)</label><input type="number" min="0" id="set_autoLock" value="${state.settings.autoLockMinutes||0}" onchange="quickUpdateSetting('autoLockMinutes', Number(this.value)||0)"></div>
    </div>
    <div class="field"><label>Cambia PIN (4 cifre)</label>
      <div style="display:flex;gap:8px;">
        <input id="set_newPin" maxlength="4" inputmode="numeric" placeholder="es. 0584" style="flex:1;padding:9px 11px;border:1px solid var(--line);border-radius:9px;">
        <button class="btn subtle" onclick="changePinFromSettings()">Aggiorna PIN</button>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Strumenti</h2></div>
    <div class="section-label">Scorciatoie spostate qui dall'intestazione, per lasciarla più leggera.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn subtle" onclick="undoLast()">${ICONS.undo} Annulla ultima modifica</button>
      <button class="btn subtle" onclick="openPrintSummary()">${ICONS.print} Stampa riepilogo</button>
    </div>
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Aspetto</h2></div>
    <div class="field"><label>Tema</label>
      <div class="theme-grid">
        ${THEMES.map(t=>`
          <button class="theme-swatch ${state.settings.theme===t.id?'active':''}" onclick="selectTheme('${t.id}')" title="${esc(t.desc)}">
            <span class="theme-swatch-preview" style="background:${t.vars.paper};border-color:${t.vars.line};">
              <span style="background:${t.vars.card};border-color:${t.vars.line};"></span>
              <span style="background:${t.vars.primary};"></span>
              <span style="background:${t.vars['c-casa']};"></span>
            </span>
            <span class="theme-swatch-label">${t.mode==='dark'?'🌙':'☀️'} ${esc(t.label)}</span>
          </button>`).join('')}
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Il tuo profilo</h2></div>
    <div class="field"><label>Il tuo nome</label>
      <div style="display:flex;gap:8px;">
        <input id="set_ownerName" value="${esc(state.settings.ownerName||'')}" placeholder="Il tuo nome" style="flex:1;padding:9px 11px;border:1px solid var(--line);border-radius:9px;">
        <button class="btn subtle" onclick="quickUpdateSetting('ownerName', val('set_ownerName'))">Salva</button>
      </div>
      <div class="section-label" style="margin-top:6px;">Usato per personalizzare il briefing del mattino.</div>
    </div>
  </div>
  ${renderNotificationsCard()}
  ${renderTipsCard()}
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Calendario</h2></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn subtle" onclick="exportICS()">Esporta calendario (.ics)</button>
      <label class="btn subtle" style="display:inline-flex;align-items:center;">Importa calendario (.ics)<input type="file" accept=".ics" style="display:none" onchange="importICS(this)"></label>
    </div>
    <div class="section-label" style="margin-top:8px;">Esporta per vedere i tuoi impegni su Google/Apple Calendar dal telefono, oppure importa un calendario esistente.</div>
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Cloud</h2></div>
    <div class="settings-section-title">Sincronizzazione</div>
    <div class="section-label">I tuoi dati vivono su Supabase, non su questo telefono: li ritrovi automaticamente se accedi da un altro dispositivo con lo stesso account. ${syncStatusText()}</div>
    <button class="btn subtle" onclick="forceRefresh()">Aggiorna dati ora</button>
  </div>
  ${renderPrivacyCard()}
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Cestino</h2><span class="count">${state.trash.length} elementi</span></div>
    <div class="section-label">Gli elementi eliminati restano qui 30 giorni prima di essere rimossi definitivamente.</div>
    ${state.trash.length? [...state.trash].sort((a,b)=>b.deletedAt.localeCompare(a.deletedAt)).map(t=>`
      <div class="item"><div class="item-top">
        <div><span class="tag">${esc(TYPE_LABELS[t.type]||t.type)}</span><div class="item-title">${esc(t.label||'(senza titolo)')}</div><div class="item-meta">Eliminato il ${fmtD(t.deletedAt)}</div></div>
        <div class="item-actions">
          <button class="btn small subtle" onclick="restoreFromTrash('${t.id}')">Ripristina</button>
          <button class="btn small danger ghost" onclick="confirmDelete('Eliminare definitivamente? Non potrai più recuperarlo.', ()=>permanentlyDeleteTrash('${t.id}'))">Elimina per sempre</button>
        </div>
      </div></div>`).join('') : `<div class="empty">Il cestino è vuoto.</div>`}
  </div>
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Registro attività</h2></div>
    ${state.activityLog.length? state.activityLog.slice(0,80).map(l=>`
      <div class="log-item"><div><div class="l-main">${esc(ACTION_LABELS[l.action]||l.action)} — ${esc(l.label||'')}</div><div class="l-type">${esc(TYPE_LABELS[l.type]||l.type)}</div></div><div class="due-badge">${fmtDT(l.ts)}</div></div>`).join('') : `<div class="empty">Nessuna attività registrata.</div>`}
  </div>
  `;
}

// ---------- STAMPA RIEPILOGO ----------
// ---------- riepilogo stampabile ----------
// Anteprima dentro l'app: niente window.open/browser esterno, quindi niente "porta senza ritorno".
// Stampa vera: sul telefono usa il plugin nativo (cerca da solo le stampanti sulla stessa rete Wi-Fi,
// via AirPrint su iOS e il framework di stampa di Android); nel browser stampa questa stessa pagina.
const PRINT_CSS = `
  .print-preview-scroll{font-family:Georgia,serif;color:#051923;max-width:700px;margin:0 auto;padding:20px;}
  .print-preview-scroll h1{font-size:24px;margin-bottom:4px;}
  .print-preview-scroll h2{font-size:16px;border-bottom:1px solid #ccc;padding-bottom:6px;margin-top:28px;}
  .print-preview-scroll .row{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #eee;font-size:13.5px;}
  .print-preview-scroll .muted{color:#888;font-size:11.5px;}
`;
function buildPrintSummaryHtml(){
  const upcoming = collectUpcoming().slice(0,20);
  const total = state.expenses.reduce((s,e)=>s+e.amount,0);
  return `
    <h1>U-Life — riepilogo</h1>
    <div class="muted">Generato il ${fmtD(todayStr())}</div>
    <h2>Indirizzo</h2>
    <div>${esc(state.homeInfo.street||'')} ${esc(state.homeInfo.cap||'')} ${esc(state.homeInfo.city||'')}</div>
    <h2>Prossime scadenze</h2>
    ${upcoming.map(u=>`<div class="row"><span>${esc(u.title)} — ${esc(u.sub)}</span><span>${fmtD(u.date)}</span></div>`).join('') || '<div class="muted">Nessuna scadenza.</div>'}
    <h2>Salute — voci recenti</h2>
    ${(hasHealthConsent()?[...state.health]:[]).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,15).map(h=>`<div class="row"><span>${esc(h.title||h.cat)} (${esc(h.cat)})${h.med?' — '+esc(h.med):''}</span><span>${fmtD(h.date)}</span></div>`).join('') || '<div class="muted">Nessuna voce.</div>'}
    <h2>Documenti personali</h2>
    ${state.personalDocs.map(p=>`<div class="row"><span>${esc(p.title||p.type)}</span><span>${p.expiryDate?fmtD(p.expiryDate):''}</span></div>`).join('') || '<div class="muted">Nessun documento.</div>'}
    <h2>Auto</h2>
    ${state.cars.map(c=>`<div class="row"><span>${esc(c.name)} ${c.plate?('· '+esc(c.plate)):''}</span><span>${c.km?Number(c.km).toLocaleString('it-IT')+' km':''}</span></div>`).join('') || '<div class="muted">Nessuna auto.</div>'}
    <h2>Spese totali</h2>
    <div class="row"><span>Totale registrato</span><span><strong>${euro(total)}</strong></span></div>
  `;
}
function openPrintSummary(){
  window._printSummaryHtml = buildPrintSummaryHtml();
  closePrintPreview();
  const extraBottom = adsBannerShown ? 64 : 0;   // spazio per non finire sotto il banner pubblicitario
  const el = document.createElement('div');
  el.id = 'printPreview';
  el.innerHTML = `
    <div class="print-preview-head"><strong>Anteprima di stampa</strong></div>
    <style>${PRINT_CSS}</style>
    <div class="print-preview-scroll">${window._printSummaryHtml}</div>
    <div class="print-preview-bar" style="padding-bottom:calc(14px + env(safe-area-inset-bottom) + ${extraBottom}px);">
      <button class="btn subtle" onclick="closePrintPreview()">← Indietro</button>
      <button class="btn primary" onclick="printCurrentSummary()">🖨️ Stampa</button>
    </div>`;
  document.body.appendChild(el);
}
function closePrintPreview(){ const el = document.getElementById('printPreview'); if(el) el.remove(); }
async function printCurrentSummary(){
  const html = window._printSummaryHtml || '';
  if(isNativeApp()){
    const P = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Printer;
    if(!P){ toast('Stampa non disponibile: nell’app manca ancora il plugin di stampa.'); return; }
    try{
      await P.printHtml({ name:'Riepilogo U-Life', html:`<html><head><meta charset="utf-8"><style>${PRINT_CSS.replace(/\.print-preview-scroll/g,'body')}</style></head><body>${html}</body></html>` });
    }catch(e){
      if(!(e && /cancel/i.test(e.message||''))) toast('Stampa non riuscita: '+((e&&e.message)||'errore'));
    }
    return;
  }
  window.print();   // browser: stampa questa stessa pagina (l'anteprima è isolata dal resto via @media print in style.css)
}

// ============================================================
// ENTRATE (stipendio, pensione, accrediti una tantum)
// ============================================================
const INCOME_CATS = ['Stipendio','Pensione','Bonus / rimborso','Altro'];
// Tutte le entrate "avvenute" fino a una data (default: oggi). Le ricorrenti mensili si espandono
// senza salvare una riga per ogni mese: l'app calcola le occorrenze al volo.
function incomeOccurrences(untilDate){
  const until = untilDate || todayStr();
  const out = [];
  (state.incomes||[]).forEach(inc=>{
    const amt = Number(inc.amount)||0;
    if(!inc.date || amt<=0) return;
    if(!inc.recur || inc.recur==='none'){
      if(inc.date <= until) out.push({ incomeId:inc.id, title:inc.title, amount:amt, date:inc.date, category:inc.category, recurring:false });
      return;
    }
    const [y0,m0,d0] = inc.date.split('-').map(Number);
    let y=y0, m=m0, guard=0;
    while(guard++ < 720){
      const dim = new Date(y, m, 0).getDate();
      const ds = `${y}-${pad2(m)}-${pad2(Math.min(d0,dim))}`;
      if(ds > until) break;
      if(inc.endDate && ds > inc.endDate) break;
      out.push({ incomeId:inc.id, title:inc.title, amount:amt, date:ds, category:inc.category, recurring:true });
      m++; if(m>12){ m=1; y++; }
    }
  });
  return out;
}
function sumIncomeForMonth(ym){ return incomeOccurrences(ym+'-31').filter(o=>o.date.startsWith(ym) && o.date<=todayStr()).reduce((s,o)=>s+o.amount,0); }
function expectedIncomeForMonth(ym){ return incomeOccurrences(ym+'-31').filter(o=>o.date.startsWith(ym)).reduce((s,o)=>s+o.amount,0); }
function monthlyIncomeForYear(year){
  const arr = new Array(12).fill(0);
  incomeOccurrences().forEach(o=>{ const [y,m] = o.date.split('-').map(Number); if(y===year) arr[m-1]+=o.amount; });
  return arr;
}
function renderFlowCard(){
  const now = new Date();
  const thisMonth = todayStr().slice(0,7);
  const nextMonth = isoLocal(new Date(now.getFullYear(), now.getMonth()+1, 1)).slice(0,7);
  const inCur = sumIncomeForMonth(thisMonth), outCur = sumForMonth(thisMonth);
  const stillExpected = Math.max(0, expectedIncomeForMonth(thisMonth) - inCur);
  const balance = inCur - outCur;
  const nextExpected = expectedIncomeForMonth(nextMonth);
  const yearIn = monthlyIncomeForYear(now.getFullYear()).reduce((s,v)=>s+v,0);
  const yearOut = monthlyTotalsForYear(now.getFullYear()).reduce((s,v)=>s+v,0);
  const col = (v)=> v>=0 ? '#4C8C4A' : '#C0554D';
  return `
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;color:var(--ink-soft);">Entrate e uscite — questo mese</h2></div>
    <div class="stat-row">
      <div class="stat"><div class="label">Entrate</div><div class="value" style="color:#4C8C4A;">${euro(inCur)}</div>${stillExpected>0?`<div class="item-meta">+ ${euro(stillExpected)} ancora attese</div>`:''}</div>
      <div class="stat"><div class="label">Uscite</div><div class="value">${euro(outCur)}</div></div>
      <div class="stat"><div class="label">Saldo del mese</div><div class="value" style="color:${col(balance)};">${balance>=0?'+':''}${euro(balance)}</div></div>
      <div class="stat"><div class="label">Entrate previste mese prossimo</div><div class="value">${euro(nextExpected)}</div></div>
    </div>
    <div class="item-meta" style="margin-top:8px;">Da inizio ${now.getFullYear()}: entrate ${euro(yearIn)} · uscite ${euro(yearOut)} · saldo <strong style="color:${col(yearIn-yearOut)};">${euro(yearIn-yearOut)}</strong></div>
  </div>`;
}
function renderIncomesCard(){
  const list = [...(state.incomes||[])].sort((a,b)=>((a.recur==='monthly')?0:1)-((b.recur==='monthly')?0:1) || (b.date||'').localeCompare(a.date||''));
  return `
  <div class="card">
    <div class="card-head"><div class="title-group">${sectionIcon('piggy','var(--c-salvadanaio)','var(--c-salvadanaio-soft)')}<h2>Entrate</h2></div><button class="btn primary" onclick="openIncomeForm()">Aggiungi entrata</button></div>
    <div class="section-label">Stipendio, pensione o un accredito una tantum. Le entrate ricorrenti si ripetono ogni mese alla stessa data e vengono sommate ai grafici insieme alle spese, così vedi il saldo mensile.</div>
    ${list.length? list.map(i=>`
      <div class="item"><div class="item-top">
        <div><span class="tag">${esc(i.category||'Altro')}</span><div class="item-title">${esc(i.title)}</div>
          <div class="item-meta">${i.recur==='monthly' ? ('Ogni mese dal '+fmtD(i.date)+(i.endDate?(' fino al '+fmtD(i.endDate)):'')) : ('Una tantum · '+fmtD(i.date))}</div></div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <div style="font-weight:700;color:#4C8C4A;">+${euro(i.amount)}</div>
          <button class="btn small ghost" onclick="openIncomeForm('${i.id}')">Modifica</button>
          <button class="btn small danger ghost" onclick="confirmDelete('Eliminare questa entrata?', ()=>deleteIncome('${i.id}'))">Elimina</button>
        </div>
      </div></div>`).join('') : `<div class="empty">Nessuna entrata registrata. Aggiungi lo stipendio o la pensione per vedere il flusso entrate/uscite.</div>`}
  </div>`;
}
function openIncomeForm(id){
  const i = id ? state.incomes.find(x=>x.id===id) : {title:'',amount:'',date:todayStr(),recur:'monthly',endDate:'',category:'Stipendio'};
  if(!i) return;
  openModal(`
    <h3>${id?'Modifica entrata':'Nuova entrata'}</h3>
    <div class="field"><label>Descrizione</label><input id="f_title" value="${esc(i.title||'')}" placeholder="es. Stipendio, Pensione INPS"></div>
    <div class="field-row">
      <div class="field"><label>Importo</label><input type="number" step="0.01" id="f_amount" value="${i.amount||''}"></div>
      <div class="field"><label>Categoria</label><select id="f_category">${INCOME_CATS.map(c=>`<option ${(i.category||'Stipendio')===c?'selected':''}>${c}</option>`).join('')}</select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Tipo</label><select id="f_recur" onchange="document.getElementById('incomeEndWrap').style.display = this.value==='monthly' ? 'block':'none'">
        <option value="monthly" ${i.recur==='monthly'?'selected':''}>Ricorrente ogni mese</option>
        <option value="none" ${i.recur!=='monthly'?'selected':''}>Una tantum</option>
      </select></div>
      <div class="field"><label>Data (della prima entrata / unica)</label><input type="date" id="f_date" value="${i.date||''}"></div>
    </div>
    <div class="field" id="incomeEndWrap" style="display:${i.recur==='monthly'?'block':'none'};"><label>Fine ricorrenza (opzionale)</label><input type="date" id="f_endDate" value="${i.endDate||''}"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn primary" onclick="saveIncome('${id||''}')">Salva</button></div>
  `);
}
function saveIncome(id){
  const amount = Number(val('f_amount'));
  if(!(amount>0)){ toast('Inserisci un importo maggiore di zero.'); return; }
  if(!val('f_date')){ toast('Indica la data dell’entrata.'); return; }
  pushUndo();
  let item = id ? state.incomes.find(x=>x.id===id) : {id:uid()};
  item.title = val('f_title').trim() || val('f_category') || 'Entrata';
  item.amount = amount; item.date = val('f_date');
  item.recur = val('f_recur')==='monthly' ? 'monthly' : 'none';
  item.endDate = item.recur==='monthly' ? val('f_endDate') : '';
  item.category = val('f_category') || 'Altro';
  if(!id) state.incomes.push(item);
  logActivity(id?'edited':'added','income', item.title);
  closeModal(); saveState(); toast('Entrata salvata.');
}
function deleteIncome(id){
  pushUndo();
  const i = state.incomes.find(x=>x.id===id); if(!i) return;
  trashItem('income', i, i.title);
  state.incomes = state.incomes.filter(x=>x.id!==id); saveState();
}

// ============================================================
// NOTIFICHE (native sul telefono: scadenze + benessere)
// ============================================================
const NOTIF_TIME_KEY = 'taccuino-notif-time';        // "HH:MM" delle notifiche di scadenza (per dispositivo)
const NOTIF_PRIVATE_KEY = 'taccuino-notif-private';  // "1" = niente dettagli nel testo (utile per i dati sanitari)
let notifGrantedCache = false;
let notifTimer = null;
function notifTimeParts(){
  const t = (localStorage.getItem(NOTIF_TIME_KEY)||'09:00').split(':');
  return { h: Math.min(23, Number(t[0])||9), m: Math.min(59, Number(t[1])||0) };
}
function notifPrivate(){ return localStorage.getItem(NOTIF_PRIVATE_KEY)==='1'; }
function setNotifTime(v){ if(!/^\d{2}:\d{2}$/.test(v||'')) return; localStorage.setItem(NOTIF_TIME_KEY, v); scheduleNotificationsSoon(); toast('Orario aggiornato.'); }
function setNotifPrivacy(on){ localStorage.setItem(NOTIF_PRIVATE_KEY, on?'1':'0'); scheduleNotificationsSoon(); toast(on?'Dettagli nascosti nelle notifiche.':'Dettagli visibili nelle notifiche.'); }
async function refreshNotifPermission(){
  try{
    if(isNativeApp() && nativeNotifications()){ const p = await nativeNotifications().checkPermissions(); notifGrantedCache = !!(p && p.display==='granted'); }
    else notifGrantedCache = ('Notification' in window) && Notification.permission==='granted';
  }catch(e){ notifGrantedCache = false; }
  return notifGrantedCache;
}
async function requestWellnessNotifications(){
  if(isNativeApp() && nativeNotifications()){
    try{ const res = await nativeNotifications().requestPermissions(); notifGrantedCache = !!(res && res.display==='granted'); }
    catch(e){ toast('Non sono riuscito ad attivare le notifiche.'); return; }
  } else if('Notification' in window){
    try{ notifGrantedCache = (await Notification.requestPermission())==='granted'; }catch(e){ notifGrantedCache = false; }
  } else { toast('Le notifiche non sono supportate da questo browser.'); return; }
  toast(notifGrantedCache ? 'Notifiche attivate.' : 'Notifiche non attivate: puoi abilitarle dalle impostazioni del telefono.');
  if(notifGrantedCache) scheduleNotificationsSoon();
  if(unlocked) render();
}
function scheduleNotificationsSoon(){ clearTimeout(notifTimer); notifTimer = setTimeout(rescheduleNotifications, 2500); }
function dateAtTime(dateStr, h, m, daysBefore){
  const [y,mo,d] = dateStr.split('-').map(Number);
  return new Date(y, mo-1, d-(daysBefore||0), h, m, 0, 0);
}
// Costruisce l'elenco di notifiche da programmare. Su iOS il sistema ne ammette al massimo 64 in attesa.
function buildNotificationPlan(cap){
  const out = []; let id = 1;
  const now = Date.now() + 30000;
  const { h, m } = notifTimeParts();
  const priv = notifPrivate();
  const days = Math.max(0, Number(state.settings.reminderDaysAhead)||3);
  const deadlineBudget = Math.floor(cap*0.6);
  // 1) scadenze: N giorni prima e nel giorno stesso, all'orario scelto
  for(const u of collectUpcoming()){
    if(out.length >= deadlineBudget) break;
    const offsets = days>0 ? [days, 0] : [0];
    for(const off of offsets){
      if(out.length >= deadlineBudget) break;
      const at = dateAtTime(u.date, h, m, off);
      if(at.getTime() <= now) continue;
      out.push({ id:id++, title: off===0 ? 'Scadenza oggi' : `Scadenza tra ${off} giorni`,
        body: priv ? 'Apri U-Life per vedere i dettagli.' : `${u.title} — ${u.sub}`,
        schedule:{ at, allowWhileIdle:true }, extra:{ kind:'deadline' } });
    }
  }
  // 2) benessere: routine giornaliere (si ripetono da sole) e a intervalli (programmo oggi + domani)
  const routines = ((state.wellness||{}).routines||[]).filter(r=>r.enabled);
  routines.filter(r=>r.scheduleType==='daily' && /^\d{2}:\d{2}$/.test(r.time||'')).forEach(r=>{
    if(out.length >= cap) return;
    const [hh,mm] = r.time.split(':').map(Number);
    out.push({ id:id++, title:r.label, body:wellnessMessage(r), schedule:{ on:{ hour:hh, minute:mm }, allowWhileIdle:true }, extra:{ kind:'wellness' } });
  });
  routines.filter(r=>r.scheduleType==='interval').forEach(r=>{
    const step = Math.max(15, Number(r.intervalMinutes)||120);
    const [sh,sm] = (r.activeStart||'08:00').split(':').map(Number);
    const [eh,em] = (r.activeEnd||'21:00').split(':').map(Number);
    let count = 0;
    for(let day=0; day<2; day++){
      const base = new Date(); base.setDate(base.getDate()+day);
      let t = new Date(base.getFullYear(), base.getMonth(), base.getDate(), sh, sm, 0, 0);
      const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), eh, em, 0, 0);
      while(t <= end && out.length < cap && count < 40){
        if(t.getTime() > now){ out.push({ id:id++, title:r.label, body:wellnessMessage(r), schedule:{ at:new Date(t.getTime()), allowWhileIdle:true }, extra:{ kind:'wellness' } }); count++; }
        t = new Date(t.getTime() + step*60000);
      }
    }
  });
  return out;
}
// Riprogramma tutte le notifiche locali: chiamata dopo ogni modifica dei dati e quando riapri l'app.
async function rescheduleNotifications(){
  const ln = nativeNotifications();
  if(!isNativeApp() || !ln) return;
  if(!(await refreshNotifPermission())) return;
  const platform = (window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || 'android';
  const cap = platform==='ios' ? 60 : 200;
  try{
    const pending = await ln.getPending();
    if(pending && pending.notifications && pending.notifications.length){
      await ln.cancel({ notifications: pending.notifications.map(n=>({ id:n.id })) });
    }
  }catch(e){ /* nessuna notifica in attesa */ }
  const list = buildNotificationPlan(cap);
  if(!list.length) return;
  try{ await ln.schedule({ notifications:list }); }
  catch(e){ console.warn('Programmazione notifiche non riuscita:', e); }
}
async function sendTestNotification(){
  if(!(await refreshNotifPermission())){ toast('Prima attiva le notifiche.'); requestWellnessNotifications(); return; }
  if(isNativeApp() && nativeNotifications()){
    try{
      await nativeNotifications().schedule({ notifications:[{ id:999999, title:'U-Life', body:'Le notifiche funzionano ✅', schedule:{ at:new Date(Date.now()+3000) } }] });
      toast('Notifica di prova in arrivo tra 3 secondi.');
    }catch(e){ toast('Invio non riuscito.'); }
  } else {
    try{ new Notification('U-Life', { body:'Le notifiche funzionano ✅' }); }catch(e){ toast('Il browser ha bloccato la notifica.'); }
  }
}
// Solo per il browser (non nell'app nativa): avviso scadenze una volta al giorno, finché l'app è aperta.
function checkWebDeadlines(){
  if(isNativeApp() || !('Notification' in window) || Notification.permission!=='granted') return;
  const { h, m } = notifTimeParts();
  const now = new Date();
  if(now.getHours()*60+now.getMinutes() < h*60+m) return;
  if(localStorage.getItem('taccuino-web-deadlines-last')===todayStr()) return;
  localStorage.setItem('taccuino-web-deadlines-last', todayStr());
  const days = Math.max(1, Number(state.settings.reminderDaysAhead)||3);
  const due = collectUpcoming().filter(u=>u.diff>=0 && u.diff<=days);
  if(!due.length) return;
  const body = notifPrivate() ? `Hai ${due.length} scadenze in arrivo.` : due.slice(0,3).map(u=>u.title).join(', ');
  try{ new Notification('Scadenze in arrivo', { body, icon:'/icons/icon-192.png' }); }catch(e){}
}
function renderNotificationsCard(){
  const native = isNativeApp();
  const t = notifTimeParts();
  return `
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Notifiche</h2><span class="tag">${notifGrantedCache?'Attive':'Non attive'}</span></div>
    <div class="section-label">Scadenze e promemoria arrivano come ${native?'notifiche del telefono, anche ad app chiusa':'notifiche del browser (finché questa pagina è aperta; nell’app per telefono arrivano anche ad app chiusa)'} — non più via email. Riapri l’app ogni tanto: ad ogni apertura la programmazione viene aggiornata.</div>
    <div class="field-row">
      <div class="field"><label>Giorni di anticipo</label><input type="number" min="1" max="60" id="set_reminderDays" value="${state.settings.reminderDaysAhead}" onchange="quickUpdateSetting('reminderDaysAhead', Math.max(1,Number(this.value)||3))"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Orario delle notifiche di scadenza</label><input type="time" id="set_notifTime" value="${pad2(t.h)}:${pad2(t.m)}" onchange="setNotifTime(this.value)"></div>
    </div>
    <div class="field"><label style="display:flex;gap:10px;align-items:center;cursor:pointer;"><input type="checkbox" ${notifPrivate()?'checked':''} onchange="setNotifPrivacy(this.checked)" style="width:20px;height:20px;"> Nascondi i dettagli nel testo delle notifiche (consigliato: compaiono sulla schermata di blocco)</label></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      ${notifGrantedCache?'':'<button class="btn primary" onclick="requestWellnessNotifications()">Attiva notifiche</button>'}
      <button class="btn subtle" onclick="sendTestNotification()">Invia notifica di prova</button>
    </div>
  </div>`;
}

// ============================================================
// PIANI (Base / Pro / Premium) + PUBBLICITÀ
// ============================================================
const PRIVACY_URL = 'https://sites.google.com/view/u-life-privacy/home-page';        // TODO: pubblica l'informativa (bozza in documenti-legali-bozza.md)
const TERMS_URL   = 'https://sites.google.com/view/u-life-privacy/home-page';        // TODO
const SUPPORT_EMAIL_PREMIUM = 'assistenza@TUODOMINIO.it';   // TODO: casella email dedicata agli utenti Premium
const REVENUECAT_KEYS = { ios:'test_pLWTdHCMkNnCODwKVkUIdeYEiRT', android:'test_pLWTdHCMkNnCODwKVkUIdeYEiRT' };             // TODO: chiavi pubbliche SDK di RevenueCat
const PRODUCT_IDS = { pro:'ulife_pro_lifetime', premium_monthly:'ulife_premium_monthly', premium_yearly:'ulife_premium_yearly' }; // da creare negli store
const ADMOB_IDS = {
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111'
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716'
  }
};

const ADS_TESTING = true;                                // metti false quando usi gli ID reali

const PLAN_DEFS = {
  free:    { label:'Base',    ads:true,  family:false, ai:false, support:false },
  pro:     { label:'Pro',     ads:false, family:false, ai:false, support:false },
  premium: { label:'Premium', ads:false, family:true,  ai:true,  support:true  }
};
let currentPlan = 'free';
function planHas(feature){ return !!(PLAN_DEFS[currentPlan] || PLAN_DEFS.free)[feature]; }
function recomputeAI(){ aiAvailable = planHas('ai'); }   // l'assistente gira sul server: basta il piano Premium
function planCacheKey(){ return 'taccuino-plan-'+(currentUserId||'anon'); }
// Il piano lo decide il SERVER (funzione SQL get_my_plan): il client non può "regalarsi" Premium.
async function refreshPlan(force){
  try{
    const c = JSON.parse(localStorage.getItem(planCacheKey())||'null');
    if(c && PLAN_DEFS[c.plan]){
      currentPlan = c.plan;
      if(!force && Date.now()-c.at < 6*3600*1000){ recomputeAI(); return currentPlan; }
    }
  }catch(e){}
  if(!navigator.onLine){ recomputeAI(); return currentPlan; }
  try{
    currentPlan = await taccuinoDB.getMyPlan();
    try{ localStorage.setItem(planCacheKey(), JSON.stringify({ plan:currentPlan, at:Date.now() })); }catch(e){}
  }catch(e){ console.warn('Piano non aggiornato:', e); }
  recomputeAI();
  return currentPlan;
}
// --- pubblicità (solo piano Base, solo app nativa): Google AdMob + consenso GDPR tramite Google UMP ---
let adsBannerShown = false, adsInitDone = false;
function admob(){ return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob; }
async function syncAds(){
  const ad = admob();

  console.log('[AdMobTrace] syncAds avviata');
  console.log('[AdMobTrace] Native:', isNativeApp());
  console.log('[AdMobTrace] Plugin AdMob:', !!ad);
  console.log('[AdMobTrace] Piano:', currentPlan);
  console.log('[AdMobTrace] Ha ads:', planHas('ads'));

  if(!isNativeApp() || !ad){
    console.warn('[AdMobTrace] Uscita: app non nativa o plugin mancante');
    return;
  }

  const platform = (window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || 'android';

  try{
    if(planHas('ads') && !adsBannerShown){

      console.log('[AdMobTrace] Inizializzazione AdMob');

      if(!adsInitDone){
        if(platform==='ios' && ad.requestTrackingAuthorization){
          await ad.requestTrackingAuthorization();
        }

        await ad.initialize({ initializeForTesting: ADS_TESTING });
        console.log('[AdMobTrace] initialize OK');

        const info = await ad.requestConsentInfo();
        console.log('[AdMobTrace] Consenso iniziale:', JSON.stringify(info));

        if(info && info.isConsentFormAvailable && info.status==='REQUIRED'){
          await ad.showConsentForm();
          console.log('[AdMobTrace] Modulo consenso mostrato');
        }

        adsInitDone = true;
      }

      const after = await ad.requestConsentInfo();
      console.log('[AdMobTrace] Consenso finale:', JSON.stringify(after));

      if(after && after.canRequestAds === false){
        console.warn('[AdMobTrace] Uscita: consenso non consente annunci');
        return;
      }

      const adId = (ADMOB_IDS[platform]||{}).banner;
      console.log('[AdMobTrace] Richiesta banner. ID configurato:', !!adId);

      const result = await ad.showBanner({
        adId,
        adSize: 'ADAPTIVE_BANNER',
        position: 'BOTTOM_CENTER',
        margin: 0,
        isTesting: ADS_TESTING
      });

      console.log('[AdMobTrace] showBanner OK:', JSON.stringify(result));

      adsBannerShown = true;
      document.body.style.paddingBottom = '64px';

    } else if(!planHas('ads') && adsBannerShown){

      console.log('[AdMobTrace] Rimozione banner');
      await ad.removeBanner();
      adsBannerShown = false;
      document.body.style.paddingBottom = '';

    } else {
      console.warn('[AdMobTrace] Nessuna richiesta banner. adsBannerShown:', adsBannerShown);
    }

  }catch(e){
    console.error('[AdMobTrace] ERRORE:', e, e && e.stack);
  }
}
function openAdPrivacyOptions(){
  const ad = admob();
  if(ad && ad.showPrivacyOptionsForm) ad.showPrivacyOptionsForm().catch(()=>toast('Opzioni non disponibili.'));
  else toast('Le preferenze pubblicitarie sono disponibili nell’app installata dallo store.');
}
// --- acquisti (RevenueCat) ---
let purchasesConfigured = false;
function purchasesPlugin(){ return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Purchases; }
async function ensurePurchases(){
  const P = purchasesPlugin();
  if(!isNativeApp() || !P) throw new Error('Gli acquisti sono disponibili solo nell’app installata dallo store.');
  const key = REVENUECAT_KEYS[window.Capacitor.getPlatform()];
  if(!key) throw new Error('Acquisti non ancora configurati (mancano le chiavi RevenueCat).');
  if(!purchasesConfigured){ await P.configure({ apiKey:key, appUserID:currentUserId }); purchasesConfigured = true; }
  return P;
}
async function waitForPlanUpdate(){
  const before = currentPlan;
  for(let i=0;i<6;i++){
    await new Promise(r=>setTimeout(r, 2500));
    await refreshPlan(true);
    if(currentPlan !== before) break;
  }
  syncAds(); closeModal(); if(unlocked) render();
  toast(currentPlan!==before ? 'Piano aggiornato: '+PLAN_DEFS[currentPlan].label+'.' : 'Acquisto registrato: l’attivazione può richiedere qualche minuto.');
}
async function purchasePlan(kind){   // 'pro' | 'premium_monthly' | 'premium_yearly'
  try{
    const P = await ensurePurchases();
    const offerings = await P.getOfferings();
    const packages = (offerings && offerings.current && offerings.current.availablePackages) || [];
    // su Google Play RevenueCat identifica gli abbonamenti come "idProdotto:idPiano": accetto entrambe le forme
    const wanted = PRODUCT_IDS[kind];
    const pkg = packages.find(p => p.product && (p.product.identifier === wanted || String(p.product.identifier).startsWith(wanted+':')));
    if(!pkg) throw new Error('Prodotto non disponibile al momento.');
    await P.purchasePackage({ aPackage: pkg });
    toast('Acquisto completato: attivo il tuo piano…');
    await waitForPlanUpdate();
  }catch(e){
    if(e && e.userCancelled) return;
    toast((e && e.message) || 'Acquisto non riuscito.');
  }
}
async function restorePurchases(){
  try{ const P = await ensurePurchases(); await P.restorePurchases(); toast('Verifico gli acquisti…'); await waitForPlanUpdate(); }
  catch(e){ toast((e && e.message) || 'Ripristino non riuscito.'); }
}
function manageSubscription(){
  const p = isNativeApp() && window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : '';
  window.open(p==='ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions', '_blank');
}
function openPaywall(reason){
  const cur = currentPlan;
  const badge = (id)=> cur===id ? '<span class="tag">Piano attuale</span>' : '';
  openModal(`
    <h3>Scegli il tuo piano</h3>
    ${reason?`<div class="notice">${esc(reason)}</div>`:''}
    <div class="item"><div class="item-top"><div><div class="item-title">Base — gratis ${badge('free')}</div>
      <div class="item-meta">Tutte le funzioni di gestione (salute, casa, spese, auto, calendario, benessere). Contiene pubblicità.</div></div></div></div>
    <div class="item"><div class="item-top"><div><div class="item-title">Pro — 3,99 € una tantum ${badge('pro')}</div>
      <div class="item-meta">Come Base, ma senza pubblicità. Si paga una volta sola.</div></div>
      ${cur==='free'?`<button class="btn small primary" onclick="purchasePlan('pro')">Passa a Pro</button>`:''}</div></div>
    <div class="item"><div class="item-top"><div><div class="item-title">Premium — 5 €/mese o 35 €/anno ${badge('premium')}</div>
      <div class="item-meta">Senza pubblicità · aggiungi familiari al tuo taccuino · assistente AI integrato · assistenza clienti via email dedicata.</div></div>
      ${cur!=='premium'?`<div style="display:flex;gap:6px;flex-wrap:wrap;"><button class="btn small primary" onclick="purchasePlan('premium_monthly')">5 €/mese</button><button class="btn small primary" onclick="purchasePlan('premium_yearly')">35 €/anno</button></div>`:`<button class="btn small subtle" onclick="manageSubscription()">Gestisci</button>`}</div></div>
    <div class="section-label">Gli abbonamenti si rinnovano automaticamente e si gestiscono o annullano dallo store (App Store / Google Play) almeno 24 ore prima della scadenza del periodo. Il pagamento è addebitato sul tuo account dello store. <a href="${TERMS_URL}" target="_blank" rel="noopener">Termini</a> · <a href="${PRIVACY_URL}" target="_blank" rel="noopener">Privacy</a></div>
    <div class="modal-actions"><button class="btn ghost" onclick="restorePurchases()">Ripristina acquisti</button><button class="btn primary" onclick="closeModal()">Chiudi</button></div>
  `);
}
function renderPlanCard(){
  const def = PLAN_DEFS[currentPlan] || PLAN_DEFS.free;
  const txt = { free:'Piano Base: gratuito, con pubblicità. Con Pro togli la pubblicità; con Premium aggiungi anche familiari, assistente AI e assistenza dedicata.',
                pro:'Piano Pro: nessuna pubblicità. Con Premium aggiungi familiari, assistente AI e assistenza dedicata.',
                premium:'Piano Premium: nessuna pubblicità, familiari, assistente AI e assistenza dedicata.' }[currentPlan];
  return `
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Il tuo piano</h2><span class="tag">${def.label}</span></div>
    <div class="section-label">${txt}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn primary" onclick="openPaywall()">${currentPlan==='premium'?'Dettagli piano':'Scopri i piani'}</button>
      <button class="btn subtle" onclick="restorePurchases()">Ripristina acquisti</button>
      ${planHas('support')?`<a class="btn subtle" href="mailto:${SUPPORT_EMAIL_PREMIUM}">Assistenza dedicata</a>`:''}
    </div>
  </div>`;
}

// ============================================================
// PRIVACY / GDPR: consensi, esportazione, cancellazione account
// ============================================================
const APP_VERSION_LEGAL = '2026-09';   // cambia questa data quando modifichi Informativa/Termini: a tutti verrà richiesto di nuovo il consenso
let modalLocked = false;
function consentStoreKey(){ return 'taccuino-consents-'+(currentUserId||'anon'); }
function readConsents(){ try{ return JSON.parse(localStorage.getItem(consentStoreKey())||'{}'); }catch(e){ return {}; } }
function saveConsentsLocal(c){ try{ localStorage.setItem(consentStoreKey(), JSON.stringify(c)); }catch(e){} }
async function ensureConsentsLoaded(){
  if(readConsents().privacy_terms || !navigator.onLine) return;   // già noti su questo dispositivo
  try{ const remote = await taccuinoDB.fetchLatestConsents(); if(Object.keys(remote).length) saveConsentsLocal(remote); }catch(e){ /* tabella non ancora creata: chiederò il consenso */ }
}
function hasValidConsent(kind){ const c = readConsents()[kind]; return !!(c && c.granted && c.version===APP_VERSION_LEGAL); }
function hasHealthConsent(){ return hasValidConsent('health_data'); }
function needsPrivacyConsent(){ return !hasValidConsent('privacy_terms'); }
function queueConsent(kind, granted){
  try{ const q = JSON.parse(localStorage.getItem('taccuino-consent-queue')||'[]'); q.push({ kind, granted, version:APP_VERSION_LEGAL, uid:currentUserId }); localStorage.setItem('taccuino-consent-queue', JSON.stringify(q)); }catch(e){}
}
async function flushConsentQueue(){
  let q = []; try{ q = JSON.parse(localStorage.getItem('taccuino-consent-queue')||'[]'); }catch(e){}
  if(!q.length || !navigator.onLine) return;
  const rest = [];
  for(const item of q){
    if(item.uid !== currentUserId){ rest.push(item); continue; }
    try{ await taccuinoDB.recordConsent(item.kind, item.version, item.granted); }catch(e){ rest.push(item); }
  }
  try{ localStorage.setItem('taccuino-consent-queue', JSON.stringify(rest)); }catch(e){}
}
function setConsent(kind, granted){
  const c = readConsents(); c[kind] = { version:APP_VERSION_LEGAL, granted:!!granted, at:new Date().toISOString() }; saveConsentsLocal(c);
  taccuinoDB.recordConsent(kind, APP_VERSION_LEGAL, granted).catch(()=>queueConsent(kind, granted));
}
function showConsentModal(onDone){
  modalLocked = true;
  window._consentDone = onDone;
  openModal(`
    <h3>Privacy e consensi</h3>
    <div class="section-label">Prima di iniziare, ti spieghiamo come vengono trattati i tuoi dati. Potrai rileggere tutto e cambiare i consensi quando vuoi da Impostazioni → Privacy e dati.</div>
    <label style="display:flex;gap:10px;align-items:flex-start;margin:14px 0;cursor:pointer;">
      <input type="checkbox" id="cons_terms" style="width:20px;height:20px;margin-top:2px;flex-shrink:0;">
      <span>Ho letto e accetto l’<a href="${PRIVACY_URL}" target="_blank" rel="noopener">Informativa Privacy</a> e i <a href="${TERMS_URL}" target="_blank" rel="noopener">Termini di servizio</a>. <em>(obbligatorio)</em></span>
    </label>
    <label style="display:flex;gap:10px;align-items:flex-start;margin:14px 0;cursor:pointer;">
      <input type="checkbox" id="cons_health" style="width:20px;height:20px;margin-top:2px;flex-shrink:0;">
      <span>Acconsento al trattamento dei dati relativi alla salute che scelgo di inserire (sezione Salute e Farmaci), come descritto nell’informativa. Senza questo consenso la sezione Salute resta disattivata. <em>(facoltativo)</em></span>
    </label>
    <div class="modal-actions"><button class="btn primary" onclick="submitConsent()">Continua</button></div>
  `);
}
function submitConsent(){
  if(!document.getElementById('cons_terms').checked){ toast('Per usare l’app devi accettare Informativa e Termini.'); return; }
  setConsent('privacy_terms', true);
  setConsent('health_data', document.getElementById('cons_health').checked);
  closeModal();
  const cb = window._consentDone; window._consentDone = null;
  render();
  if(cb) cb();
}
function healthConsentPlaceholder(){
  return `
  <div class="card">
    <div class="card-head"><div class="title-group">${sectionIcon('health','var(--c-salute)','var(--c-salute-soft)')}<h2>Salute</h2></div></div>
    <div class="section-label">La sezione Salute conserva dati sanitari, che la legge tutela in modo particolare: per usarla serve il tuo consenso esplicito. Puoi revocarlo in qualsiasi momento da Impostazioni → Privacy e dati.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn primary" onclick="toggleHealthConsent(true)">Do il consenso e attivo la sezione</button><a class="btn subtle" href="${PRIVACY_URL}" target="_blank" rel="noopener">Leggi l’informativa</a></div>
  </div>`;
}
function toggleHealthConsent(on){
  if(on){ setConsent('health_data', true); toast('Sezione Salute attivata.'); render(); return; }
  setConsent('health_data', false);
  if(confirm('Consenso revocato: la sezione Salute viene disattivata.\n\nVuoi anche eliminare definitivamente le voci di salute e i farmaci già inseriti? (OK = elimina, Annulla = conserva ma nascosti)')){
    pushUndo();
    state.health = []; state.medicines = [];
    state.expenses = state.expenses.filter(e=>!(e.sourceKey||'').startsWith('health-'));
    state.events = state.events.filter(e=>!((e.linkedFrom||'').startsWith('health-next-') || (e.linkedFrom||'').startsWith('med-')));
    saveState();
    toast('Dati sanitari eliminati.');
  } else { toast('Sezione Salute disattivata.'); }
  render();
}
async function exportMyData(){
  const session = await taccuinoDB.getSession().catch(()=>null);
  const data = JSON.parse(JSON.stringify(state));
  if(data.settings) delete data.settings.pin;
  (((data.wellness||{}).routines)||[]).forEach(r=>{ delete r.lastFiredAt; delete r.lastFiredDate; });
  const payload = { app:'U-Life', exportedAt:new Date().toISOString(), account:{ email: session ? session.user.email : '' },
    note:'Gli allegati (foto/PDF) non sono inclusi: sono elencati con nome e percorso nei campi "files".', data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `ulife-i-miei-dati-${todayStr()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 3000);
  toast('Esportazione pronta.');
}
function openDeleteAccount(){
  openModal(`
    <h3>Elimina account e dati</h3>
    <div class="notice">Azione definitiva: verranno cancellati il tuo account, tutti i dati e gli allegati. Un eventuale abbonamento va annullato separatamente dallo store. Se condividi il taccuino con un familiare, i dati inseriti da te spariranno anche per lui.</div>
    <div class="field"><label>Per confermare scrivi ELIMINA</label><input id="del_confirm" autocomplete="off"></div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annulla</button><button class="btn danger ghost" onclick="confirmDeleteAccount()">Elimina definitivamente</button></div>
  `);
}
async function confirmDeleteAccount(){
  if(val('del_confirm').trim().toUpperCase()!=='ELIMINA'){ toast('Scrivi ELIMINA per confermare.'); return; }
  clearTimeout(syncTimer); pendingSync = false;
  try{
    toast('Elimino l’account…');
    await taccuinoDB.deleteMyAccount();
    clearLocalCaches();
    forgetDeviceCredential();   // l'account non esiste più: niente più senso a tenere l'accesso rapido
    try{ localStorage.removeItem(AI_CONFIG_KEY); }catch(e){}
    unlocked = false; location.reload();
  }catch(e){ toast('Non sono riuscito a eliminare l’account: '+(e.message||'errore')+' (hai eseguito migration-v2.sql?)'); }
}
function renderPrivacyCard(){
  return `
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Privacy e dati</h2></div>
    <div class="section-label">I tuoi dati sono tuoi: puoi rileggere l’informativa, portarli via o cancellarli quando vuoi.</div>
    <div class="field"><label style="display:flex;gap:10px;align-items:center;cursor:pointer;"><input type="checkbox" ${hasHealthConsent()?'checked':''} onchange="toggleHealthConsent(this.checked)" style="width:20px;height:20px;"> Consenso al trattamento dei dati sulla salute (sezione Salute e Farmaci)</label></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <a class="btn subtle" href="${PRIVACY_URL}" target="_blank" rel="noopener">Informativa Privacy</a>
      <a class="btn subtle" href="${TERMS_URL}" target="_blank" rel="noopener">Termini di servizio</a>
      ${planHas('ads')?'<button class="btn subtle" onclick="openAdPrivacyOptions()">Preferenze pubblicitarie</button>':''}
      <button class="btn subtle" onclick="exportMyData()">Esporta i miei dati (JSON)</button>
      <button class="btn danger ghost" onclick="openDeleteAccount()">Elimina account e dati</button>
    </div>
  </div>`;
}

// ============================================================
// AVVIO DELL'APP (dopo login / sblocco PIN)
// ============================================================
async function onAppReady(){
  await ensureConsentsLoaded();
  flushConsentQueue();
  const proceed = () => { maybeShowOnboarding(); maybeShowBriefing(); };
  if(needsPrivacyConsent()) showConsentModal(proceed); else proceed();
  startWellnessEngine();
  checkAIStatus();
  refreshNotifPermission().then(()=>{ scheduleNotificationsSoon(); if(unlocked) render(); });
  refreshPlan(false).then(()=>{ syncAds(); if(unlocked) render(); });
  maybeShowDailyTipSoon();
}

// ============================================================
// ASSISTENTE: un suggerimento al giorno, per scoprire le funzioni dell'app
// ============================================================
// Non è una vera GIF animata di un assistente — genero io un avatar animato via CSS/SVG,
// leggero e già pronto, senza bisogno di scaricare o includere alcun file. Se in futuro vuoi
// usare una tua GIF o animazione, basta cambiare cosa restituisce assistantAvatarHTML() qui sotto,
// ad esempio con <img src="assets/assistant.gif" alt="">.
function assistantAvatarHTML(){
  return `<div class="tip-avatar-face">
    <svg viewBox="0 0 64 64" width="50" height="50" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="var(--primary)"/>
      <circle class="tip-eye" cx="23" cy="29" r="4" fill="#fff"/>
      <circle class="tip-eye" cx="41" cy="29" r="4" fill="#fff"/>
      <path d="M20 40 Q32 49 44 40" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
    </svg>
    <div class="tip-hand">👋</div>
  </div>`;
}

const TIP_LAST_SHOWN_KEY = 'taccuino-tip-last-shown';   // 'YYYY-MM-DD': l'ultimo giorno in cui è comparso su questo dispositivo
const TIP_SNOOZE_KEY = 'taccuino-tip-snooze-until';      // 'YYYY-MM-DD', oppure 'forever'
const TIP_LAST_INDEX_KEY = 'taccuino-tip-last-index';    // per non riproporre sempre lo stesso suggerimento

// Ogni voce: quando proporla (test), cosa dire, e cosa fare se l'utente accetta (dove va, quale modulo apre).
const DAILY_TIPS = [
  { id:'car', test:()=> state.cars.length===0,
    message:'Non hai ancora registrato nessuna auto. Vuoi aggiungerne una? Potrai tenere traccia di manutenzioni e scadenze.',
    cta:'Aggiungi auto', go:()=>{ setTab('cars'); openCarForm(); } },
  { id:'income', test:()=> (state.incomes||[]).length===0,
    message:'Non hai ancora registrato entrate. Vuoi aggiungere stipendio o pensione? Vedrai subito il saldo tra entrate e uscite.',
    cta:'Aggiungi entrata', go:()=>{ setTab('savings'); openIncomeForm(); } },
  { id:'contact', test:()=> state.contacts.length===0,
    message:'La rubrica dei contatti utili è vuota. Vuoi salvare un numero importante, come il medico di famiglia?',
    cta:'Aggiungi contatto', go:()=>{ setTab('admin'); openContactForm(); } },
  { id:'routine', test:()=> ((state.wellness||{}).routines||[]).length===0,
    message:'Non hai ancora nessuna routine di benessere. Vuoi impostare un promemoria, ad esempio per bere acqua?',
    cta:'Aggiungi routine', go:()=>{ setTab('wellness'); openRoutineForm(); } },
  { id:'homeTask', test:()=> state.homeTasks.length===0,
    message:'La lista dei lavori di casa è vuota. Vuoi aggiungere qualcosa da sistemare?',
    cta:'Aggiungi lavoro', go:()=>{ setTab('house'); openTaskForm(); } },
  { id:'medicine', test:()=> hasHealthConsent() && state.medicines.length===0,
    message:'Non hai ancora registrato farmaci. Vuoi tenere traccia di una scadenza o di un promemoria?',
    cta:'Aggiungi farmaco', go:()=>{ setTab('health'); openMedicineForm(); } },
  { id:'asset', test:()=> state.assets.length===0,
    message:'Non hai ancora registrato beni di valore. Vuoi aggiungerne uno, per tenerne traccia nel tempo?',
    cta:'Aggiungi bene', go:()=>{ setTab('admin'); openAssetForm(); } },
  { id:'personalDoc', test:()=> state.personalDocs.length===0,
    message:'Non hai ancora salvato documenti personali (carta d’identità, patente...). Vuoi aggiungerne uno?',
    cta:'Aggiungi documento', go:()=>{ setTab('admin'); openPersonalDocForm(); } },
  { id:'homeDocument', test:()=> state.homeDocuments.length===0,
    message:'Non hai ancora salvato documenti di casa (contratti, garanzie...). Vuoi aggiungerne uno?',
    cta:'Aggiungi documento', go:()=>{ setTab('house'); openDocForm(); } },
  { id:'seasonalTask', test:()=> state.seasonalTasks.length===0,
    message:'Non hai lavori stagionali in programma (es. tagliando caldaia, cambio gomme...). Vuoi aggiungerne uno?',
    cta:'Aggiungi voce', go:()=>{ setTab('house'); openSeasonalForm(); } },
  { id:'budget', test:()=> Object.keys((state.settings||{}).budgets||{}).length===0,
    message:'Non hai ancora impostato un budget per le spese. Vuoi definirne uno per tenere sotto controllo una categoria?',
    cta:'Imposta budget', go:()=>{ setTab('savings'); openBudgetForm(); } },
];

function eligibleDailyTips(){
  return DAILY_TIPS.filter(t=>{ try{ return t.test(); }catch(e){ return false; } });
}
function tipSnoozeUntil(){
  try{ return localStorage.getItem(TIP_SNOOZE_KEY); }catch(e){ return null; }
}
function tipSnoozed(){
  const until = tipSnoozeUntil();
  if(!until) return false;
  if(until==='forever') return true;
  return until >= todayStr();
}
function maybeShowDailyTip(){
  if(tipSnoozed()) return;
  let lastShown = null; try{ lastShown = localStorage.getItem(TIP_LAST_SHOWN_KEY); }catch(e){}
  if(lastShown===todayStr()) return;
  const eligible = eligibleDailyTips();
  if(!eligible.length) return;
  let idx = 0; try{ idx = (Number(localStorage.getItem(TIP_LAST_INDEX_KEY))||0) + 1; }catch(e){}
  const tip = eligible[idx % eligible.length];
  try{ localStorage.setItem(TIP_LAST_INDEX_KEY, String(idx)); }catch(e){}
  showDailyTip(tip);
}
// Aspetta che onboarding/consenso/briefing (che usano la stessa modale a schermo intero) siano chiusi,
// per non sovrapporre due cose insieme al primo avvio.
function maybeShowDailyTipSoon(){
  const tryShow = () => {
    const overlay = document.getElementById('overlay');
    if(overlay && overlay.classList.contains('active')){ setTimeout(tryShow, 2000); return; }
    maybeShowDailyTip();
  };
  setTimeout(tryShow, 3500);
}
function showDailyTip(tip){
  closeDailyTip();
  try{ localStorage.setItem(TIP_LAST_SHOWN_KEY, todayStr()); }catch(e){}
  window._currentDailyTip = tip;
  const el = document.createElement('div');
  el.id = 'dailyTip';
  el.style.setProperty('--tip-extra-bottom', adsBannerShown ? '64px' : '0px');   // spazio per il banner pubblicitario, se attivo
  el.innerHTML = `
    <button class="daily-tip-close" onclick="closeDailyTip()" aria-label="Chiudi">✕</button>
    <div class="daily-tip-avatar">${assistantAvatarHTML()}</div>
    <div class="daily-tip-bubble">
      <div class="daily-tip-text">${esc(tip.message)}</div>
      <div class="daily-tip-actions">
        <button class="btn subtle small" onclick="closeDailyTip()">Non ora</button>
        <button class="btn primary small" onclick="acceptDailyTip()">${esc(tip.cta)}</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(()=>{ const e2=document.getElementById('dailyTip'); if(e2) e2.classList.add('show'); });
}
function closeDailyTip(){
  const el = document.getElementById('dailyTip');
  if(el){ el.classList.remove('show'); setTimeout(()=>{ if(el.parentNode) el.remove(); }, 250); }
  window._currentDailyTip = null;
}
function acceptDailyTip(){
  const tip = window._currentDailyTip;
  closeDailyTip();
  if(tip && tip.go) tip.go();
}
// period: 'week' | 'month' | 'forever' | null (per riattivare subito)
function snoozeDailyTip(period){
  if(!period){
    try{ localStorage.removeItem(TIP_SNOOZE_KEY); }catch(e){}
    toast('Suggerimenti riattivati.');
  } else if(period==='forever'){
    try{ localStorage.setItem(TIP_SNOOZE_KEY,'forever'); }catch(e){}
    closeDailyTip();
    toast('Suggerimenti disattivati. Puoi riattivarli quando vuoi da qui.');
  } else {
    const days = period==='week' ? 7 : 30;
    const until = isoLocal(new Date(Date.now()+days*86400000));
    try{ localStorage.setItem(TIP_SNOOZE_KEY, until); }catch(e){}
    closeDailyTip();
    toast('Suggerimenti in pausa fino al '+fmtD(until)+'.');
  }
  if(unlocked) render();
}
function renderTipsCard(){
  const until = tipSnoozeUntil();
  let status;
  if(until==='forever') status = 'Disattivati.';
  else if(until && until>=todayStr()) status = 'In pausa fino al '+fmtD(until)+'.';
  else status = 'Attivi: al massimo uno al giorno.';
  return `
  <div class="card">
    <div class="card-head"><h2 style="font-size:16px;">Suggerimenti</h2></div>
    <div class="section-label">Un piccolo assistente che, al massimo una volta al giorno, propone un'azione utile in base a cosa non hai ancora usato (per esempio registrare un'auto o un'entrata). ${esc(status)}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn subtle" onclick="snoozeDailyTip('week')">Pausa 1 settimana</button>
      <button class="btn subtle" onclick="snoozeDailyTip('month')">Pausa 1 mese</button>
      <button class="btn subtle" onclick="snoozeDailyTip('forever')">Disattiva per sempre</button>
      ${until?`<button class="btn primary" onclick="snoozeDailyTip(null)">Riattiva ora</button>`:''}
    </div>
  </div>`;
}

// ---------- helpers ----------
function val(id){ const el=document.getElementById(id); return el?el.value:''; }
function esc(s){ if(s===undefined||s===null) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

setupAutoLock();
initApp();
