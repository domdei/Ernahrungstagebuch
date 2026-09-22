# Hosting-Überlegungen für das Ernährungstagebuch

## Kurz gesagt

Wenn die App nur lokal im Browser gespeichert wird, braucht sie keine Authentifizierung. Die Einträge liegen im Browser-LocalStorage und sind damit nur auf diesem Browser/Profil sichtbar.

## Warum keine Auth nötig ist

Die aktuelle Version speichert die Historie mit einem LocalStorage-Key:

```js
const STORAGE_KEY = "ernaehrungstagebuch-diary-v1";
localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
```

Das bedeutet:

- keine zentrale Datenbank
- keine gemeinsame Benutzerverwaltung
- keine serverseitige Authentifizierung
- keine Synchronisierung zwischen Geräten

Das ist für eine private, lokale PWA vollkommen passend.

## Wenn du die App nur lokal verwenden willst

Dann ist die beste Lösung:

- App lokal im Browser oder als PWA installieren
- Daten bleiben auf dem Gerät / im Browser
- kein Server nötig
- kein PC muss dauerhaft laufen

## Wenn du die App im Internet hosten willst

Wenn du nur die App extern erreichbar machen willst, aber die Daten lokal im Browser behalten willst, reicht ein einfaches statisches Hosting aus. Dann musst du nicht auf ein echtes Backend umstellen.

Das ist für die aktuelle App genau passend:

- Frontend: HTML/CSS/JavaScript
- Hosting: z. B. Cloudflare Pages, GitHub Pages, Netlify
- Daten: bleiben im Browser/LocalStorage des Geräts
- kein Backend nötig
- kein Login nötig
- kein laufender PC nötig

Das ist eine statische PWA-Variante und funktioniert ohne Server, ohne Node.js und ohne zentrale Datenbank.

### Cloudflare Pages – kompakte Anleitung

1. Öffne deinen Projektordner, z. B. den Ordner des Ernährungstagebuchs.
2. Stelle sicher, dass dort diese Dateien vorhanden sind:
   - index.html
   - styles.css
   - app.js
   - manifest.json
   - sw.js
   - food-data.json
   - optional: offline.html
3. Lade den Ordner in ein GitHub-Repository hoch.
4. Melde dich bei Cloudflare an und öffne “Workers & Pages”.
5. Klicke auf “Create application” → “Pages” → “Connect to Git”.
6. Wähle dein Repository aus.
7. Projektname: z. B. `ernaehrungstagebuch`.
8. Framework preset: `None`.
9. Build command: leer lassen.
10. Output directory: der Projektordner oder `.` je nach Struktur.
11. Speichere und deploye.
12. Öffne die Cloudflare-URL und prüfe die App.
13. Auf dem Handy kannst du die Seite als PWA installieren.

> Wichtig: Das ist ein reines Client-seitiges Setup. Die Daten bleiben im Browser/Profil des Geräts. Es gibt keinen zentralen Nutzer-Login oder eine gemeinsame Datenbank.

## Wenn du echte Synchronisierung willst

Wenn du die gleichen Einträge auf mehreren Geräten sehen willst, brauchst du dagegen eine echte Online-Version mit Backend und Datenbank, zum Beispiel:

- Supabase
- Firebase
- Render + Postgres
- Vercel + Datenbank

Dann werden zusätzlich benötigt:

- Login / Authentifizierung
- zentraler Datenspeicher
- serverseitige API
- HTTPS

## Für deinen konkreten Anwendungsfall

Wenn du nur privat und lokal am Handy + PC arbeiten willst, ist die aktuelle PWA-Variante sinnvoll.

Wenn du dagegen die App von außerhalb deines WLANs nutzen willst, ohne dass dein PC dauerhaft läuft, dann brauchst du eine echte online-Version mit zentralem Datenspeicher.

## Fazit

- Lokal im Browser: keine Auth nötig
- Im Internet gehostet: Auth und Backend nötig
- Dein PC muss nicht dauerhaft laufen, sobald du die App extern hostest

## Empfehlung

Für die nächste Phase würde ich die folgende Reihenfolge empfehlen:

1. Lokal als PWA weiter nutzen und stabil machen
2. Danach optional eine Online-Version mit Cloud-Speicher bauen
3. Erst dann Login/Authentifizierung einbauen, wenn echte Synchronisierung nötig ist
