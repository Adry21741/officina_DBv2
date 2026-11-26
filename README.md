# Officina di Casa – gestionale

Sito statico (HTML/CSS/JS + Supabase). Nessuna PWA, nessun service worker, nessuna cache offline.

## Avvio
1. Crea un **nuovo** progetto Supabase (non usare quello già collegato a Officina_DB: lo schema ha tabelle con nomi che potrebbero collidere).
2. SQL Editor: esegui `database.sql`, poi (facoltativo) `seed.sql`.
3. Authentication > Sign In / Providers: **disattiva "Allow new users to sign up"** (nessuna registrazione pubblica).
4. Authentication > Users > *Add user* (Create new user) due volte, con "Auto Confirm User", e nei *User Metadata* metti:
   `{"first_name":"Nome","last_name":"Cognome","role":"admin"}` per l'Amministratore e `"role":"titolare"` per il Titolare.
5. Authentication > URL Configuration: aggiungi l'indirizzo del sito (es. GitHub Pages) in *Redirect URLs* per il recupero password.
6. Copia `config.example.js` in `config.js` e inserisci URL e anon key. Pubblica la cartella (GitHub Pages) o aprila con un server statico locale.

## Ruoli e policy (RLS)
- Tutte le tabelle hanno RLS attiva; nessun accesso anonimo.
- `is_staff()` è vera per `admin` e `titolare`: entrambi possono **leggere, inserire, modificare, eliminare** su tutte le tabelle (policy `staff_all`).
- `profiles`: lettura per lo staff; ognuno modifica solo il proprio profilo e non può cambiarsi il ruolo.
- `activity_log`: solo lettura; viene scritto dai trigger.
- Storage `workshop-files`: bucket **privato** (10 MB, immagini e PDF), accesso per lo staff, file aperti con URL firmati (1 ora).
- Per differenziare i permessi in futuro: sostituisci `staff_all` con policy per operazione basate su `profiles.role`.

## Logica di magazzino
- `parts.qty_on_hand` si modifica solo con `inventory_movements` (trigger): carico (+), scarico (−), rettifica (± con conferma), trasferimento (cambia ubicazione).
- Quando in un ordine di acquisto aumenta `qty_received`, viene creato automaticamente un **carico** e lo stato dell'ordine passa a *parzialmente ricevuto* o *ricevuto*.
- Un ordine di lavoro deve avere un mezzo appartenente al cliente scelto (chiave composta).

## Non incluso in questa prima versione
Viste agenda giorno/settimana/mese (c'è l'elenco), sessioni di inventario (tabelle `inventory_sessions/items` da aggiungere), interfaccia per le compatibilità (la tabella `part_compatibilities` esiste), report su tempi medi e ricambi utilizzati.
