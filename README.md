# <img src="https://upload.wikimedia.org/wikipedia/en/a/ae/Flag_of_the_United_Kingdom.svg" width="50"/> UniTN Courses Downloader 

Welcome! This extension was created to make it easier to **download content** from the **Moodle** platform of the University of Trento. Below you’ll find a practical and intuitive guide to understand how it works.

---

### 🧩 Installation

1. **Download the extension** as a `.zip` file from this GitHub repository.  
2. **Extract** the `.zip` file to a folder on your computer.  
3. Open **Google Chrome** and go to:  
   `chrome://extensions/`  
4. **Enable** the “Developer mode” (top right corner).  
5. Click on **“Load unpacked”** and select the folder you extracted in step 2.  
6. The extension *UniTN Courses Downloader* will now appear in your Chrome toolbar!

---

### ⚙️ Requirements

- You must be logged in to: [https://webapps.unitn.it/gestionecorsi/](https://webapps.unitn.it/gestionecorsi/)  
- A **regular UniTN account login** is sufficient — *you do not need SPID or two-factor authentication* for this extension to work.  

---

### 🔒 Privacy & Security

This extension operates **entirely within your active Moodle session** on [didatticaonline.unitn.it](https://didatticaonline.unitn.it).  
It **does not** perform any fake identification, session emulation, or background authentication.  

When fetching course materials, the extension simply issues standard `fetch` requests **from the same page context** where you are already logged in.  
Your browser automatically includes your Moodle session cookies — exactly as visible in the browser’s **Developer Console** — and handles authentication internally.  

The extension:
- ✅ Does **not** access or export private cookies beyond what the page’s JavaScript can see.  
- ✅ Does **not** read `HttpOnly` cookies or hidden authentication tokens.  
- ✅ Does **not** transmit, store, or share any private data, credentials, or files with third parties.  
- ✅ Uses only the permissions listed in the manifest: `"downloads"`, `"activeTab"`, and `"scripting"` — solely to download files from the Moodle platform.  
- ✅ Operates with complete transparency: the full source code is available for public review on GitHub.  

> **In short:** The extension behaves like a normal logged-in user browsing and downloading materials manually — no additional or hidden access is performed.

---

### ▶️ Usage Instructions

1. Make sure you are **inside a specific course** on the UniTN Moodle platform.  
2. Click on the ***"UniTN Courses Downloader"*** extension icon in your Chrome toolbar.  
3. Select at least one **section** to download.  
4. Press the **green button** at the bottom to download the selected sections.  
5. Wait a few moments — download time may vary depending on the number and size of the files.  

Once finished, the browser will ask where you want to save the `.zip` file containing your materials. By default, it can be found here:

- **Windows:** `C:\\Users\\<USERNAME>\\Downloads`  
- **MacOS:** `/Users/<USERNAME>/Downloads`  
- **Linux:** `/home/<USERNAME>/Downloads`

Otherwise, you can specify the exact directory where you want to save your folder.

---

### ⚠️ General Information

> At the moment, **only PDF file downloads are supported**.  
> Other file types will be added in future updates.

---

## 🧭 Trust & Transparency

This project follows a policy of **open transparency** so that every user can verify its safety.  
- The **source code** is fully available on GitHub. You can inspect, rebuild, and install it manually.  
- The extension **never contacts external servers** — all operations occur locally within your browser.  
- You can verify in Chrome’s **Developer Tools → Network tab** that all requests are made only to the Moodle platform.  
- The permissions are minimal and clearly explained.  
- The developer identity and contact information are public and verifiable.

> 💡 *If you ever have doubts, you can open the code, read it, and confirm that no personal data leaves your browser.*

---

## 📝 Changelog

### [1.0] - 2025-09-29
- Implementation of **PDF material download**.  

### [1.1] - 2025-10-18
- Added functionality that enables **parsing of subfolders** contained in a section of a course.  
- Added **progress bar** in the popup to track download status.

---

## 📜 Terms of Use

This tool is intended solely for students and staff of the University of Trento.  
Its use is allowed only for personal and academic purposes.

It is strictly forbidden to share, publish, or redistribute teaching materials downloaded through this extension, as they are protected by copyright and subject to the university’s policies.

The author of this extension is not affiliated with the University of Trento and disclaims any responsibility for improper use.

---

## 📧 Contact

For any questions, concerns, or clarifications:  
*Extension owner:*  
- Luca Galli — [luca.galli-1@studenti.unitn.it](mailto:luca.galli-1@studenti.unitn.it)

---

# <img src="https://upload.wikimedia.org/wikipedia/en/0/03/Flag_of_Italy.svg" width="50"/> Downloader Corsi UniTN 

Benvenuto/a! Questa estensione è creata per facilitare il **download dei contenuti** tramite la piattaforma **Moodle** dell'Università di Trento. Qui sotto troverai una guida pratica ed intuitiva per capirne il funzionamento.

---

### 🧩 Installazione

1. **Scarica l’estensione** come file `.zip` da questo repository GitHub.  
2. **Estrai** il file `.zip` in una cartella sul tuo computer.  
3. Apri **Google Chrome** e vai su:  
   `chrome://extensions/`  
4. **Attiva** la “Modalità sviluppatore” (in alto a destra).  
5. Clicca su **“Carica estensione non pacchettizzata”** e seleziona la cartella estratta al punto 2.  
6. L’estensione *Downloader Corsi UniTN* apparirà ora nella barra degli strumenti di Chrome!

---

### ⚙️ Requisiti

- Aver effettuato l'accesso alla pagina: [https://webapps.unitn.it/gestionecorsi/](https://webapps.unitn.it/gestionecorsi/)  
- È sufficiente un **accesso con le proprie credenziali UniTN** — *non è necessario lo SPID né l’autenticazione a due fattori* per utilizzare questa estensione.  

---

### 🔒 Privacy & Sicurezza

Questa estensione funziona **esclusivamente all’interno della sessione Moodle attiva** su [didatticaonline.unitn.it](https://didatticaonline.unitn.it).  
Non esegue **identificazioni simulate**, **emulazioni di sessione**, né **autenticazioni in background**.  

Durante il download dei materiali, l’estensione invia normali richieste `fetch` **dallo stesso contesto della pagina** in cui l’utente è già autenticato.  
Il browser include automaticamente i cookie della sessione Moodle — gli stessi visibili nella **console sviluppatore** del browser — e gestisce internamente l’autenticazione.  

L’estensione:
- ✅ Non accede né esporta cookie privati oltre a quelli visibili dallo JavaScript della pagina.  
- ✅ Non legge cookie `HttpOnly` o token di autenticazione nascosti.  
- ✅ Non trasmette, archivia o condivide dati personali, credenziali o file con terze parti.  
- ✅ Utilizza solo i permessi dichiarati nel manifest: `"downloads"`, `"activeTab"`, e `"scripting"`, necessari unicamente per il download dei file dalla piattaforma Moodle.  
- ✅ Opera in totale trasparenza: il **codice sorgente** è pubblico e consultabile su GitHub.  

> **In sintesi:** L’estensione si comporta come un normale utente loggato che scarica manualmente i materiali — senza accessi aggiuntivi o nascosti.

---

### ▶️ Istruzioni d’uso

1. Assicurati di trovarti **all’interno di un corso specifico** sulla piattaforma Moodle UniTN.  
2. Clicca sull’estensione ***"Downloader Corsi UniTN"*** nella barra degli strumenti di Chrome.  
3. Seleziona almeno una **sezione** da scaricare.  
4. Premi il **tasto verde** in basso per scaricare le sezioni selezionate.  
5. Attendi qualche secondo — il tempo di download può variare in base alla quantità e dimensione dei file.  

Una volta terminato, il browser ti chiederà dove salvare il file `.zip` contenente i tuoi materiali. Di default si troverà:

- **Windows:** `C:\\Users\\<USERNAME>\\Downloads`  
- **MacOS:** `/Users/<USERNAME>/Downloads`  
- **Linux:** `/home/<USERNAME>/Downloads`

Altrimenti potrai specificare la directory esatta nella quale salvare la tua cartella.

---

### ⚠️ Informazioni Generali

> Al momento è supportato **solo il download dei file PDF**.  
> Altri tipi di file verranno aggiunti nei futuri aggiornamenti.

---

## 🧭 Fiducia & Trasparenza

Questo progetto segue una politica di **massima trasparenza** per garantire la piena fiducia degli utenti.  
- Il **codice sorgente** è interamente disponibile su GitHub: chiunque può leggerlo, verificarlo e installarlo manualmente.  
- L’estensione **non contatta server esterni**: tutte le operazioni avvengono localmente nel browser.  
- È possibile verificare, nella sezione **Strumenti per sviluppatori → Rete**, che tutte le richieste sono dirette unicamente alla piattaforma Moodle.  
- I permessi richiesti sono minimi e spiegati chiaramente.  
- L’identità e i contatti dello sviluppatore sono pubblici e verificabili.  

> 💡 *Se hai dubbi, puoi sempre controllare il codice e confermare che nessun dato personale lascia il tuo browser.*

---

## 📝 Changelog delle modifiche

### [1.0] - 2025-09-29
- Implementazione del **download dei materiali PDF**.  

### [1.1] - 2025-10-18
- Aggiunta funzionalità che consente il **parsing delle sottocartelle** contenute in una sezione del corso.  
- Aggiunta **barra di progresso** nel popup per mostrare lo stato del download.

---

## 📜 Condizioni d’uso

Questo strumento è destinato esclusivamente agli studenti e al personale dell’Università di Trento.  
Il suo utilizzo è consentito solo per fini personali e accademici.

È espressamente vietato condividere, pubblicare o ridistribuire il materiale didattico scaricato tramite questa estensione, in quanto protetto da diritti d’autore e soggetto alle politiche dell’Ateneo.

L’autore dell’estensione non è affiliato con l’Università di Trento e declina ogni responsabilità per un uso improprio.

---

## 📧 Contatti

Per qualsiasi domanda, dubbio o chiarimento:  
*Proprietario dell'estensione:*  
- Luca Galli — [luca.galli-1@studenti.unitn.it](mailto:luca.galli-1@studenti.unitn.it)
