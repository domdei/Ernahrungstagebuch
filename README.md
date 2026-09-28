# Persönliches Ernährungstagebuch

Eine App zur Erfassung von Lebensmitteln, die automatisch prüft, ob du etwas zu früh wiederholt isst (Rotationsprinzip) oder ob ein Lebensmittel laut deiner eigenen Einstufung unverträglich ist. Sie funktioniert im Browser, auch offline, und lässt sich wie eine normale App auf dem Handy installieren.

---

## Für Einsteiger

### App öffnen

Rufe im Browser (Handy oder PC) diese Adresse auf:

👉 **https://ernahrungstagebuch.pages.dev/**

Auf dem Handy kannst du sie danach über das Browsermenü **„Zum Startbildschirm hinzufügen"** wie eine normale App installieren. Ein Symbol erscheint dann auf deinem Homescreen, ganz ohne App Store.

### Wichtig: Vor der Nutzung Lebensmitteltoleranzen anpassen

Die App liefert von Haus aus eine vorbefüllte Liste an Lebensmitteln inklusive Grün/Orange/Rot-Einstufung mit. **Diese Werte sind nur ein Beispiel und entsprechen nicht deiner persönlichen Verträglichkeit.**

Bevor du beginnst, öffne daher einmal Zahnrad → **„Lebensmitteltoleranzen verwalten"** und passe die Einstufungen an deine eigenen, mit einem Arzt oder Test ermittelten Ergebnisse an. Nur so warnt dich die App auch wirklich zuverlässig vor Lebensmitteln, die *für dich* unverträglich sind.

### So benutzt du sie

1. **Datum wählen:** Standardmäßig ist „Heute" ausgewählt. Über den Datums-Button kannst du auch einen vergangenen Tag nachtragen.
2. **Lebensmittel erfassen:** Tippe ins Suchfeld, wähle nacheinander alle gegessenen Zutaten aus und tippe auf „Speichern".
3. **Warnungen beachten:** Wenn ein Lebensmittel kürzlich schon gegessen wurde oder als unverträglich markiert ist, fragt die App vor dem Speichern noch einmal nach.
4. **Verlauf ansehen:** Unter „Verlauf" siehst du die letzten Tage. Ein Klick auf einen Tag zeigt die Details.
5. **Lebensmitteltoleranzen verwalten:** Über das Zahnrad-Symbol oben rechts kannst du jederzeit eigene Lebensmittel hinzufügen, deren Verträglichkeit ändern (Grün/Orange/Rot) oder das Farbschema (hell/dunkel) wechseln.

Der Rest der Bedienung ist bewusst einfach gehalten und erklärt sich beim Ausprobieren von selbst.

### Wo werden meine Daten gespeichert?

Das ist der wichtigste Punkt, den du verstehen solltest:

- **Alles bleibt auf deinem Gerät.** Die App speichert alle Einträge direkt und ausschließlich in deinem Browser, lokal auf dem Handy oder PC, auf dem du sie benutzt.
- **Es gibt keinen zentralen Server, der deine Daten kennt.** Der Betreiber der Webseite (Hoster) sieht und speichert deine Einträge zu keinem Zeitpunkt. Es findet keine Übertragung an irgendeinen Server statt.
- **Deshalb gibt es auch keinen Login.** Ein Login wäre nur nötig, wenn deine Daten zentral gespeichert würden, um sie einem Konto zuzuordnen. Da das nicht passiert, kannst du die App sofort ohne Registrierung nutzen.
- **Kehrseite: Ohne Backup ist nichts wiederherstellbar.** Weil nichts zentral gespeichert wird, kann auch niemand — auch nicht der Hoster oder Entwickler — deine Daten für dich wiederherstellen. Wenn du z. B.:
  - den Browser-Speicher/-Cache leerst,
  - die App-Daten in den Handy-Einstellungen löschst,
  - das Gerät wechselst oder zurücksetzt,

  sind deine bisherigen Einträge unwiederbringlich verloren.

**Deshalb wichtig:** Nutze regelmäßig die Backup-Funktion (Zahnrad → Exportieren), um eine Sicherungsdatei auf deinem Gerät zu speichern. Über „Importieren" kannst du diese Datei jederzeit wieder einlesen — auch auf einem neuen Gerät, um deine Daten dorthin zu übertragen.

---

## Für Techniker

Dieser Abschnitt richtet sich an Entwickler bzw. alle, die die App lokal ausführen, anpassen oder selbst hosten möchten.

### Architektur im Überblick

Eine Progressive Web App (PWA) auf Basis von reinem HTML/CSS/JavaScript (ES6-Module), ohne Build-Tool oder Framework. Persistenz erfolgt über die **IndexedDB** des Browsers (nicht LocalStorage), abgesichert zusätzlich per `navigator.storage.persist()` gegen automatische Cache-Bereinigung durch das Betriebssystem. Ein Service Worker sorgt für Offlinefähigkeit und Caching des App-Shells.

Da alle Daten rein clientseitig verarbeitet werden, genügt für das Hosting ein einfacher statischer Webserver (z. B. Cloudflare Pages, GitHub Pages, Netlify) — es ist kein Backend, keine Datenbank und keine Authentifizierung nötig. Details dazu und zu Synchronisierungs-Optionen über mehrere Geräte hinweg siehe [README-hosting.md](README-hosting.md).

### Projektstruktur

- [index.html](index.html): HTML-Gerüst der App samt Modals für Suche, Backup und Einstellungen.
- [styles.css](styles.css): Styles für mobile Geräte und Desktop (inklusive Theme-Variablen und Responsive-Layouts).
- [app.js](app.js): Einstiegspunkt und Event-Handling der Anwendung (als ES6-Modul).
- [src/](src/): Modularer Anwendungscode:
  - [src/state.js](src/state.js): Zentraler State (`state`), DOM-Referenzen (`ui`) und Viewport-Erkennung.
  - [src/rotation.js](src/rotation.js): Rotationsregeln, Verträglichkeitsprüfung, Such-Scoring und Filter.
  - [src/db.js](src/db.js): IndexedDB-Zugriff, Draft-Persistenz, Backup-Export/Import und Versionierung.
  - [src/ui.js](src/ui.js): DOM-Rendering für Verlauf, Chips, Vorschläge, Filter und Theme-Verwaltung.
  - [src/modals.js](src/modals.js): Bestätigungs-, Auswahl- und Import-Dialoge.
  - [src/utils.js](src/utils.js): Datums- und Hilfsfunktionen, Formatierung und Konstanten.
- [manifest.json](manifest.json): PWA-Konfiguration für die Installation.
- [sw.js](sw.js): Service Worker für Caching und Offlinebetrieb.
- [version.json](version.json): Versionsnummer der App.
- [data.md](data.md): Quelldatei der Lebensmittel als Tabelle.
- [build_assets.py](build_assets.py): Erzeugt [food-tolerance.json](food-tolerance.json) aus [data.md](data.md) und ermöglicht Version-Bumps.
- [food-tolerance.json](food-tolerance.json): Von der App geladene Lebensmittel-Datenbank.
- icons/: App-Symbole für Mobilgeräte.

### Lokale Ausführung

Starte einen Webserver im Projektordner:

```bash
python -m http.server 8001
```

Öffne die App im Browser unter:

```text
http://localhost:8001/
```

> Ein Service Worker benötigt zwingend `localhost` oder eine HTTPS-Verbindung — über `file://` funktioniert die App nicht vollständig.

### Auf dem Handy im lokalen WLAN testen

1. Starte den Server auf dem PC (siehe oben).
2. Ermittle die lokale IP-Adresse deines PCs (in Windows mit `ipconfig`).
3. Öffne auf dem Handy die Adresse `http://<DEINE-IP>:8001/`.
4. Installiere die App über das Browsermenü ("Zum Startbildschirm hinzufügen").

### Datenbasis pflegen & Versionieren

1. Öffne [data.md](data.md) und passe die Tabelle an (`Kategorie,Lebensmittel,Status`).
2. Führe das Build-Skript aus, um [food-tolerance.json](food-tolerance.json) zu aktualisieren:

```bash
python build_assets.py
```

3. Um ein neues Release mit automatischer Versionsanhebung und Cache-Aktualisierung zu erstellen:

```bash
python build_assets.py --bump
```

Das Skript erhöht die Versionsnummer automatisch in [version.json](version.json), aktualisiert die Cache-Buster in [index.html](index.html) und passt den Cache-Namen in [sw.js](sw.js) an.

### Hauptfunktionen (technische Details)

- **4-Tage-Rotationswarnung:** Warnt, wenn ein Lebensmittel in den letzten 3 Tagen gegessen wurde. Ab Tag 5 ist es wieder ohne Warnung erlaubt.
- **Unverträglichkeitsprüfung:** Markiert Lebensmittel nach eigener Einstufung farblich (Grün, Orange, Rot) über zentral definierte CSS-Farbpunkte.
- **Konflikt-Dialog beim Speichern:** Verletzt ein gewähltes Lebensmittel die Rotationsfrist oder eine Verträglichkeitsregel, erscheint ein themenkonformes Bestätigungs-Modal (kein natives Browser-Popup) mit genauer Begründung.
- **Intelligenter Import-Dialog:** Bietet die Wahl zwischen *Ergänzen* (mit Duplikaterkennung), *Ersetzen* und *Abbrechen*.
- **Moderne Browser-Datenbank (IndexedDB):** Zuverlässige, transaktionssichere Speicherung mit automatischem Schutz gegen Cache-Bereinigung (`navigator.storage.persist()`).
- **Offlinefähig & Modular:** Vollwertige PWA mit modularem ES6-Code (`src/`) ohne Build-Tool-Ballast.
- **Einheitliches Dialog-System:** Alle Bestätigungen, Fehler- und Erfolgsmeldungen laufen über ein zentrales, themefähiges Modal (`showConfirmDialog` in [src/modals.js](src/modals.js)) statt über native `confirm()`/`alert()`-Popups.

### Hinweise

- Alle Daten liegen ausschließlich in der lokalen Browser-Datenbank (`IndexedDB`) des jeweiligen Geräts/Browserprofils.
- Bei einem Gerätewechsel überträgst du die Daten über das Zahnrad → Backup-Export und -Import.
- Zum Hosting im Internet und zu Optionen für echte Synchronisierung zwischen mehreren Geräten siehe [README-hosting.md](README-hosting.md).

## Lizenz

Privater Gebrauch.
