# Il mio taccuino — versione ibrida (Android + iOS)

Questo è un progetto **separato** dalla versione che già usi sul PC (quella non la tocchiamo). L'obiettivo qui è arrivare a un'app installabile su telefono, gratis, usando:
- **Supabase** (gratuito) come database e sistema di login, al posto del server sul tuo PC
- **Capacitor** per impacchettare l'app in un contenitore installabile su Android e iOS

## A che punto siamo

✅ Fatto e **confermato funzionante** (hai già testato login e salvataggio dati nel browser):
- Schema del database (`supabase/schema.sql`) — una riga per utente, sicura con Row Level Security
- Login e registrazione vere con email + password, al posto del solo PIN
- Tutte le sezioni dell'app collegate a Supabase invece che al server locale
- Foto e PDF allegati su Supabase Storage invece che come base64
- Cache offline e sincronizzazione automatica alla riconnessione
- **Notifiche native**: il Benessere ora usa il plugin `@capacitor/local-notifications` quando l'app gira impacchettata su telefono (non più solo il popup del browser). In un browser normale continua a usare le notifiche del browser per i test — si adatta da sola.
- **Schema normalizzato** (`supabase/schema-normalized.sql`), pronto ma non ancora collegato — vedi sotto.

⏳ Non ancora attivo (disattivato con messaggi chiari nell'app, non rotto):
- **Promemoria via email** e **Assistente AI**: richiedono una funzione lato Supabase (Edge Function) — per ora fuori dal piano gratuito "senza altri account esterni". Si riprendono quando vuoi.

## Le due versioni dello schema database

- **`schema.sql`** (quello che hai già eseguito): la vecchia tabella unica, un blocco JSON per utente. **L'app non la usa più** per leggere/scrivere, resta solo come sorgente per la migrazione automatica dei dati (vedi sotto).
- **`schema-normalized.sql`** (nuovo): 18 tabelle separate (una per salute, bollette, spese, auto, eventi, farmaci, manutenzioni, beni, routine benessere, ecc.), con indici per query veloci. **È quella che l'app usa ora.**

### Per applicare la migrazione

1. Vai su **SQL Editor** nel pannello Supabase → **New query**
2. Apri `supabase/schema-normalized.sql`, copia tutto il contenuto, incollalo e premi **Run**
3. Ricarica l'app nel browser (o riapri l'app sul telefono) e accedi di nuovo

Al primo accesso dopo la migrazione, l'app si accorge da sola che le tabelle nuove sono vuote ma la vecchia `app_state` ha dei dati, e li travasa automaticamente nelle tabelle giuste — non serve fare nulla a mano, e i dati che avevi già inserito in fase di test non si perdono.

**Come funziona ora il salvataggio**: ogni volta che aggiungi/modifichi/elimini qualcosa, l'app confronta lo stato attuale con l'ultima versione sincronizzata e scrive solo le righe effettivamente cambiate nella tabella giusta — non riscrive più tutto il blocco ogni volta. Più efficiente, e apre la porta a fare query dirette sul database in futuro (es. "somma spese di marzo per categoria" direttamente in SQL).

## Condivisione familiare tramite QR code

Per usare lo stesso taccuino con un familiare servono due account Supabase distinti. Il QR code non condivide password: crea un invito temporaneo e autorizza il secondo account ad accedere agli stessi dati.

### Attivazione una sola volta

Dopo aver eseguito `supabase/schema-normalized.sql`, vai nel **SQL Editor** di Supabase, crea una nuova query, copia tutto il file `supabase/family-sharing.sql` e premi **Run**.

Questa migrazione crea:
- i nuclei familiari;
- i membri autorizzati;
- gli inviti temporanei;
- le policy RLS che permettono ai membri dello stesso nucleo di leggere e modificare gli stessi dati.

### Collegare due account

1. Entrambe le persone devono avere un account separato nell'app.
2. Aggiorna l'app nativa dopo la modifica:

```bash
npm run sync
npm run open:ios
```

3. Sul primo telefono vai in **Impostazioni → Aggiungi familiare**.
4. Mostra il QR code all'altra persona. L'invito dura 24 ore.
5. Sul secondo telefono vai in **Impostazioni → Unisciti a una famiglia**.
6. Consenti l'accesso alla fotocamera e inquadra il QR code.
7. Dopo l'unione, chiudi e riapri l'app se i dati non compaiono subito.

È disponibile anche l'inserimento manuale del codice mostrato sotto il QR code. Da quel momento entrambi gli account vedono e modificano lo stesso nucleo di dati, inclusi spese, bollette, calendario, documenti e allegati.

Per rimuovere un familiare o gestire più nuclei serve una modifica successiva alle funzioni SQL; non cancellare manualmente righe dalle tabelle `family_members` senza aggiornare anche le policy.

## Passo 1 — Crea il progetto Supabase (5 minuti, gratis)

1. Vai su https://supabase.com e registrati (puoi usare l'account Google/GitHub)
2. Crea un nuovo progetto, scegli una password per il database (salvala da parte) e una regione vicina a te (es. Frankfurt/EU)
3. Aspetta 1-2 minuti che il progetto si prepari
4. Vai su **SQL Editor** (menu a sinistra) → **New query**
5. Apri il file `supabase/schema.sql` di questo progetto, copia tutto il contenuto, incollalo lì e premi **Run**
   - Se va tutto bene vedrai "Success. No rows returned"
6. Vai su **Project Settings → API**: copia **Project URL** e la chiave **anon public**
7. Apri `www/supabaseClient.js` (è quello letto davvero dall'app) e incolla questi due valori al posto di `INCOLLA_QUI_...`

A questo punto hai un database vero, con login pronto, del tutto gratuito.

## Passo 2 — Prova l'app nel browser

Prima di generare i pacchetti nativi, prova l'app in un browser normale: dalla cartella `taccuino-hybrid`, esegui `npx serve www` oppure `python3 -m http.server --directory www 5500`, poi vai su `http://localhost:5500`. Registrati con una email vera e prova a usare l'app.

## Passo 3 — Genera i progetti nativi (Android + iOS)

La configurazione (`capacitor.config.ts`) è già pronta in questo progetto, quindi **non serve** `cap init` — basta aggiungere le piattaforme:

```bash
cd taccuino-hybrid
npm install
npx cap add android
npx cap add ios
```

Questo crea le cartelle `android/` e `ios/` con i progetti nativi, già collegati al plugin delle notifiche locali.

Genera poi le icone e la schermata di avvio per tutte le dimensioni richieste da Android e iOS, partendo dalle immagini già pronte in `resources/`:

```bash
npm run assets
npx cap sync
```

(Se `npm run assets` chiede conferme o pacchetti aggiuntivi al primo avvio, accetta pure — è lo strumento ufficiale di Capacitor che genera automaticamente tutte le taglie necessarie.)

## Passo 4 — prova l'app sul telefono, gratis

```bash
npx cap open ios       # apre Xcode: da lì "Run" su un iPhone collegato via USB (Apple ID gratuito, valido 7 giorni)
npx cap open android   # apre Android Studio: da lì genera un .apk installabile senza scadenza
```

**Per iOS**, in Xcode dovrai anche:
1. Selezionare il tuo iPhone come dispositivo di destinazione (in alto, al posto del simulatore)
2. In "Signing & Capabilities", scegliere il tuo Apple ID personale come Team (gratuito)
3. La prima volta, sul telefono: Impostazioni → Generali → VPN e gestione dispositivo → fidati del tuo Apple ID sviluppatore

**Per Android**, il file `.apk` generato da Android Studio (Build → Build Bundle(s)/APK(s) → Build APK(s)) si può installare direttamente trasferendolo sul telefono, senza scadenze.

Ogni volta che modifichi qualcosa in `www/`, ripeti `npx cap sync` prima di ricompilare in Xcode/Android Studio (non serve rilanciare `npm run assets`, quello serve solo se cambi le icone).

## Domande frequenti

**Devo confermare l'email ogni volta che testo?** Per velocizzare i test, in Supabase vai su **Authentication → Providers → Email** e disattiva **"Confirm email"**: da quel momento la registrazione crea subito una sessione attiva, senza dover cliccare un link ricevuto via email. Consigliato riattivarlo prima di un uso "vero".

**Devo pagare qualcosa fino a qui?** No. Supabase free, Capacitor è open source e gratuito, Xcode e Android Studio sono gratuiti. L'unica spesa futura sarà quando (e se) vorrai pubblicare sugli store veri (Apple $99/anno, Google $25 una tantum) — vedi la spiegazione che ti ho dato in chat.

**Il progetto Supabase gratuito si "addormenta"?** Sì, dopo 7 giorni senza nessuna richiesta si mette in pausa automaticamente (i dati restano, si riattiva con un click dal pannello). Per un uso personale regolare non è un problema; se sparisci per settimane, la prima apertura dopo la pausa sarà solo un po' più lenta.

**Posso continuare a usare anche la versione sul PC?** Sì, sono due progetti indipendenti. Puoi tenerli entrambi, anche se ovviamente i dati non si sincronizzano automaticamente tra le due finché non decidi di usarne una sola.
