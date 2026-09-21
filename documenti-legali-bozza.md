# U-Life — Documenti legali (BOZZA)

> **Attenzione.** Questa è una bozza di partenza, non un parere legale. Va completata (i campi `[DA COMPILARE]`), adattata al tuo caso e **fatta rivedere da un professionista** (avvocato o DPO) prima della pubblicazione. Le indicazioni tecniche riflettono come funziona oggi l'app; se cambi fornitori o funzioni, aggiorna il testo e la costante `APP_VERSION_LEGAL` in `app.js` (agli utenti verrà richiesto di nuovo il consenso).

---

# PARTE 1 — Informativa Privacy (artt. 13-14 GDPR)

**Versione:** 2026-09 · **Ultimo aggiornamento:** [DA COMPILARE]

## 1. Titolare del trattamento
[Nome e cognome / ragione sociale], [indirizzo], [P. IVA / C.F. se applicabile]
Contatto privacy: [email dedicata]. Se nominato: Responsabile della protezione dei dati (DPO): [DA COMPILARE].

## 2. Quali dati trattiamo
| Categoria | Esempi | Note |
|---|---|---|
| Account | email, password (conservata solo in forma cifrata dal fornitore di autenticazione) | necessari per l'accesso |
| **Dati relativi alla salute** | visite, controlli, cure, farmaci, spese mediche, allegati sanitari (foto/PDF) | **categoria particolare (art. 9 GDPR)**: trattata solo con il tuo consenso esplicito |
| Dati di casa e amministrazione | bollette, rate, documenti, contatti, beni, scadenze | inseriti da te |
| Dati economici | spese, entrate (stipendio, pensione, accrediti), budget | inseriti da te; l'app **non** accede al tuo conto bancario |
| Auto | targa, chilometri, interventi | inseriti da te |
| Benessere e calendario | routine, impegni | inseriti da te |
| Piano e acquisti | piano attivo, scadenza abbonamento, identificativo acquisto | i dati di pagamento (carta) sono gestiti solo da Apple/Google, mai da noi |
| Pubblicità (solo piano Base) | identificativo pubblicitario, dati tecnici del dispositivo, dati di interazione con gli annunci | solo se dai il consenso dove richiesto (UE/SEE/UK) |
| Assistente AI (solo Premium) | le domande che scrivi e un estratto di spese, scadenze, auto e bollette | passano dai nostri server (Supabase Edge Functions) al provider AI; **non** le conserviamo né le registriamo nei log, teniamo solo un contatore giornaliero delle richieste; i dati sanitari **non** sono inviati |
| Dati tecnici | log di errore, versione app, sistema operativo | per sicurezza e assistenza |

## 3. Perché li trattiamo e su quale base giuridica
| Finalità | Base giuridica |
|---|---|
| Creare l'account e fornire le funzioni dell'app (sincronizzazione, notifiche, condivisione familiare) | esecuzione del contratto (art. 6.1.b) |
| Trattare i **dati sulla salute** che inserisci | **consenso esplicito** (art. 9.2.a), revocabile in ogni momento da Impostazioni → Privacy e dati |
| Gestire abbonamenti e acquisti, ripristinare gli acquisti | esecuzione del contratto (art. 6.1.b) e obblighi di legge (art. 6.1.c) |
| Mostrare pubblicità (piano Base) | consenso (art. 6.1.a), raccolto tramite il modulo di consenso di Google (UMP) dove richiesto |
| Assistente AI (Premium) | esecuzione del contratto (art. 6.1.b) |
| Sicurezza, prevenzione abusi, assistenza clienti | legittimo interesse (art. 6.1.f) |
| Conservare la prova dei consensi | obbligo di accountability (art. 5.2 e 7.1) |

Non vendiamo i tuoi dati e non li usiamo per profilazione al di fuori della pubblicità del piano Base.

## 4. Con chi li condividiamo (responsabili e destinatari)
| Fornitore | Ruolo | Scopo | Sede/regione |
|---|---|---|---|
| Supabase Inc. | responsabile del trattamento | database, autenticazione, archiviazione allegati | [verifica la regione del tuo progetto: preferibile UE] |
| RevenueCat Inc. | responsabile | gestione abbonamenti | USA |
| Apple / Google | titolari autonomi | pagamenti e distribuzione app | — |
| Google AdMob | titolare autonomo / responsabile | pubblicità (solo piano Base) | USA/Irlanda |
| [Provider AI, es. OpenAI/Anthropic] | responsabile | assistente AI (solo Premium) | [DA COMPILARE] |

Se un familiare entra nel tuo taccuino, vede i dati condivisi (compresi eventuali dati sanitari): condividi solo con persone di fiducia.

## 5. Trasferimenti fuori dallo SEE
Alcuni fornitori possono trattare dati negli USA. Il trasferimento avviene sulla base di decisione di adeguatezza (EU-US Data Privacy Framework) o clausole contrattuali standard. [DA VERIFICARE per ciascun fornitore]

## 6. Per quanto tempo conserviamo i dati
- Dati dell'account e contenuti: finché mantieni l'account. Con "Elimina account e dati" vengono cancellati subito da app e database; eventuali copie di backup dei fornitori scadono secondo i loro cicli [DA VERIFICARE, in genere entro 30-90 giorni].
- Elementi nel cestino: 30 giorni, poi eliminati.
- Registro dei consensi: fino alla cancellazione dell'account.
- Dati di acquisto: per il tempo richiesto da obblighi fiscali/contabili [DA COMPILARE].

## 7. I tuoi diritti
Accesso, rettifica, cancellazione, limitazione, portabilità, opposizione, revoca del consenso (artt. 15-22 e 7 GDPR). Nell'app:
- **Esporta i miei dati (JSON)** → Impostazioni → Privacy e dati (portabilità/accesso)
- **Elimina account e dati** → stesso menu (cancellazione)
- **Revoca consenso dati sanitari** → stesso menu
- **Preferenze pubblicitarie** → stesso menu (solo piano Base)
Per altro: [email privacy]. Hai diritto di proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).

## 8. Sicurezza
Connessioni cifrate (HTTPS), dati cifrati a riposo dal fornitore, accesso ai dati protetto da regole a livello di riga (ogni utente vede solo i propri dati e quelli del proprio nucleo familiare). I dati **non** sono cifrati end-to-end: il fornitore tecnico può in linea di principio accedervi per manutenzione. In caso di violazione dei dati personali ti informeremo nei casi e nei tempi previsti dalla legge.

## 9. Minori
L'app è destinata a persone maggiorenni. Non raccogliamo consapevolmente dati di minori di 18 anni.

## 10. Modifiche
Se modifichiamo questa informativa in modo sostanziale, aggiorniamo la versione e ti chiediamo di nuovo il consenso all'apertura dell'app.

---

# PARTE 2 — Termini di servizio e abbonamenti (schema)

**Versione:** 2026-09

1. **Servizio.** U-Life è uno strumento personale di organizzazione (salute, casa, spese, auto, calendario). Non è un dispositivo medico, non fornisce consulenza medica, legale, fiscale o finanziaria. Verifica sempre scadenze e importi importanti sui documenti ufficiali.
2. **Piani.**
   - *Base*: gratuito, con pubblicità.
   - *Pro*: 3,99 € una tantum, senza pubblicità.
   - *Premium*: 5 €/mese oppure 35 €/anno; senza pubblicità, aggiunta di familiari, assistente AI, assistenza via email dedicata.
   I prezzi possono variare per paese/valuta e sono quelli mostrati dallo store al momento dell'acquisto.
3. **Pagamento e rinnovo.** Gli acquisti avvengono tramite App Store / Google Play. Gli abbonamenti si rinnovano automaticamente alla scadenza del periodo, salvo disdetta almeno 24 ore prima dal proprio account dello store. Rimborsi e diritto di recesso sono gestiti secondo le regole dello store e di legge (per i consumatori UE: [DA VERIFICARE con un professionista, in particolare sul recesso per contenuti digitali]).
4. **Cosa succede se l'abbonamento scade.** Torni al piano Pro (se lo avevi acquistato) o Base. I tuoi dati restano; le funzioni Premium si disattivano (AI, aggiunta di nuovi familiari). I familiari già inseriti restano nel nucleo.
5. **Account e sicurezza.** Sei responsabile di email, password e PIN. Puoi eliminare l'account in ogni momento dall'app.
6. **Uso consentito.** Vietato l'uso illecito, il tentativo di accedere ai dati di altri, la rivendita del servizio.
7. **Limitazione di responsabilità.** [DA COMPILARE con un professionista]
8. **Legge applicabile e foro.** [DA COMPILARE]
9. **Contatti e assistenza.** [email]; utenti Premium: [email dedicata].

---

# PARTE 3 — Checklist di conformità (per te)

- [ ] Pubblicare Informativa e Termini su un sito e aggiornare `PRIVACY_URL` e `TERMS_URL` in `app.js`.
- [ ] **Dati sanitari:** confermare con un professionista se serve una **valutazione d'impatto (DPIA, art. 35)**; tenere il **registro dei trattamenti (art. 30)** (con dati di categoria particolare l'esenzione per le piccole realtà normalmente non vale).
- [ ] Verificare la **regione** del progetto Supabase e firmare/accettare i **DPA** (accordi art. 28) con Supabase, RevenueCat, Google, provider AI.
- [ ] **Pubblicità:** creare l'app su AdMob; configurare in AdMob → Privacy e messaggi il modulo di consenso **UMP** (è il CMP gratuito di Google, certificato IAB TCF, che il plugin usa in automatico); sostituire gli ID di test; impostare `ADS_TESTING = false`. Su iOS aggiungere `NSUserTrackingUsageDescription` (ATT).
- [ ] **Store:** compilare "Privacy nutrition labels" (Apple) e "Data safety" (Google Play) coerentemente con la tabella dei dati sopra; indicare che l'app tratta dati sulla salute.
- [ ] Mantenere **cancellazione account in-app** (già presente: richiesta da Apple) e **"Ripristina acquisti"** (già presente).
- [ ] **AI:** l'assistente passa da una Edge Function con la *tua* chiave (già fatto, vedi `SETUP-EDGE-FUNCTIONS.md`). Da completare: indicare nell'informativa il provider scelto (`AI_PROVIDER`), accettare il suo DPA, verificare regione di trattamento e se i dati inviati via API sono usati per addestrare modelli.
- [ ] Procedura di **data breach** (notifica al Garante entro 72 ore quando dovuta).
- [ ] Rivedere tutto con un professionista prima della pubblicazione.
