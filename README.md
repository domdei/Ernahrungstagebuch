# Persönliches Ernährungstagebuch

Eine Progressive Web App (PWA) zur Erfassung von Lebensmitteln. Die App prüft automatisch Rotationszeiten und persönliche Unverträglichkeiten. Sie läuft im Browser, funktioniert offline und speichert Daten lokal und dauerhaft in einer IndexedDB-Datenbank auf dem Gerät.

## Hauptfunktionen

- **4-Tage-Rotationswarnung:** Warnt, wenn ein Lebensmittel in den letzten 3 Tagen gegessen wurde. Ab Tag 5 ist es wieder ohne Warnung erlaubt.
- **Unverträglichkeitsprüfung:** Markiert Lebensmittel nach eigener Einstufung farblich (Grün, Orange, Rot).
- **Kompakter Smart-Date-Chip:** Zeigt das Erfassungsdatum platzsparend als interaktiven Button (`📅 Heute (Fr., 25.09.) ▾`). Klick öffnet den Datepicker; bei abweichendem Datum erscheint ein Schnell-Reset-Button (`↺ Heute`).
- **Aufgeräumte Hauptseite & Symmetrische Typografie:** Beide Bereiche (`Lebensmittel erfassen` und `Verlauf`) nutzen eine einheitliche, dezente Überschriftengröße. Auf der Hauptseite gibt es keine störenden Filter-Dropdowns mehr.
- **Filterleiste in der Suche & Custom-Kategorie-Modal:** Die Kategorieauswahl (`🏷️ Alle Kategorien ▾`) und der Grün-Filter (`🟢`) sitzen direkt in der Suchleiste und erscheinen nur bei aktiver Suche. Ein Klick auf den Kategorie-Button öffnet ein elegantes, an das App-Design angepasstes Modal statt des nativen System-Auswahldialogs.
- **Direktes Speichern & Idempotenz:** Zutaten werden direkt in der Suche gewählt und über `Speichern (X)` ohne Umwege im Tagebuch abgelegt. Lebensmittel, die am selben Tag bereits erfasst wurden, werden lautlos ignoriert (kein blockierendes Alert-Pop-up).
- **Bereits erfasste Lebensmittel abgehakt:** Lebensmittel, die für den ausgewählten Tag bereits im Tagebuch stehen, werden in der Vorschlagsliste dezent abgeblendet (`opacity: 0.45`), mit einem grünen Haken (`✓`) markiert und können nicht versehentlich nochmals angeklickt werden.
- **Mehrzeilige Tag-Cloud:** Ausgewählte Lebensmittel brechen bei Bedarf automatisch mehrzeilig um (`max-height: 120px` mit Scrollbalken), damit man immer den Überblick behält.
- **Konflikt-Dialog beim Speichern:** Verletzt ein gewähltes Lebensmittel die Rotationsfrist oder eine Verträglichkeitsregel, erscheint beim Speichern ein Bestätigungs-Modal (Ja/Nein) mit genauer Begründung.
- **Visuell optimierte Chips & Dark Mode:** Konfliktbehaftete Lebensmittel werden direkt am Chip durch Rahmen und Badges (`1T` / `!`) hervorgehoben. Gesperrte Lebensmittel treten im Dark Mode dezent in den Hintergrund, ohne zu blenden.
- **Tastatur-Verhalten (Mobile):** Das mobile Vollbild-Such-Overlay öffnet sich standardmäßig ohne Bildschirmtastatur für freies Scrollen. Antippen des Suchfelds blendet die Tastatur ein/aus; nach dem Auswählen springt sie nicht ungewollt auf.
- **Tag- und Nachtmodus (☾ / ☼):** Wechselt das Farbschema über die Kopfzeile und speichert die Wahl.
- **Tagesabstand-Badges:** Zeigt bei Vorschlägen an, vor wie vielen Tagen ein Lebensmittel gegessen wurde (`1T`, `2T`, `3T`).
- **Kompaktes Verlaufs-Akkordeon (4 Tage Standard):** Zeigt standardmäßig die letzten 4 Tage (3 Tage Rotation + heute) zugeklappt als Einzeiler mit Ampel-Zusammenfassung (`14 🟢 · 2 🟠`). Ein Klick klappt die nach Kategorien gruppierten Details auf.
- **Kompakte Werkzeuge & Modale Verlaufsfilter (🔍 / 🗑️):** Die Filterleiste im Verlauf bietet einheitliche App-Modals für Kategorie (`🏷️ Alle Kategorien ▾`) und Verträglichkeitsstatus (`🚦 Alle Status ▾`) jeweils mit Schnell-Reset (`✕`). Daneben sitzt der Löschmodus (`🗑️`) direkt neben der Überschrift „Verlauf“.
- **Einstellungen & Backup (⚙):** Export und Import sowie Speicherstatus und Version sind aufgeräumt über das Zahnrad-Icon in der Topbar erreichbar.
- **Intelligenter Import-Dialog:** Bietet die Wahl zwischen *Ergänzen* (mit Duplikaterkennung), *Ersetzen* und *Abbrechen* im einheitlichen App-Design.
- **Moderne Browser-Datenbank (IndexedDB):** Zuverlässige, transaktionssichere Speicherung mit automatischem Schutz gegen Cache-Bereinigung (`navigator.storage.persist()`).
- **Offlinefähig & Modular:** Vollwertige PWA mit modularem ES6-Code (`src/`) ohne Build-Tool-Ballast.

## Projektstruktur

- [index.html](index.html): HTML-Gerüst der App samt Modals für Suche, Backup und Einstellungen.
- [styles.css](styles.css): Styles für mobile Geräte und Desktop (inklusive Theme-Variablen und Responsive-Layouts).
- [app.js](app.js): Einstiegspunkt und Event-Handling der Anwendung (als ES6-Modul).
- [src/](src/): Modularer Anwendungscode:
  - [src/state.js](src/state.js): Zentraler State (`state`), DOM-Referenzen (`ui`) und Viewport-Erkennung.
  - [src/rotation.js](src/rotation.js): Rotationsregeln, Verträglichkeitsprüfung, Such-Scoring und Filter.
  - [src/db.js](src/db.js): IndexedDB-Zugriff, Draft-Persistenz, Backup-Export/Import und Versionierung.
  - [src/ui.js](src/ui.js): DOM-Rendering für Verlauf, Chips, Vorschläge, Filter und Theme-Verwaltung.
  - [src/modals.js](src/modals.js): Bestätigungs- und Import-Dialoge.
  - [src/utils.js](src/utils.js): Datums- und Hilfsfunktionen, Formatierung und Konstanten.
- [manifest.json](manifest.json): PWA-Konfiguration für die Installation.
- [sw.js](sw.js): Service Worker für Caching und Offlinebetrieb.
- [version.json](version.json): Versionsnummer der App.
- [data.md](data.md): Quelldatei der Lebensmittel als Tabelle.
- [build_assets.py](build_assets.py): Erzeugt [food-tolerance.json](food-tolerance.json) aus [data.md](data.md) und ermöglicht Version-Bumps.
- [food-tolerance.json](food-tolerance.json): Von der App geladene Lebensmittel-Datenbank.
- icons/: App-Symbole für Mobilgeräte.

## Lokale Ausführung

Starte einen Webserver im Projektordner:

```bash
python -m http.server 8001
```

Öffne die App im Browser unter:

```text
http://localhost:8001/
```

## Auf dem Handy im WLAN testen

1. Starte den Server auf dem PC.
2. Ermittle die lokale IP-Adresse deines PCs (in Windows mit `ipconfig`).
3. Öffne auf dem Handy die Adresse `http://<DEINE-IP>:8001/`.
4. Installiere die App über das Browsermenü ("Zum Startbildschirm hinzufügen").

## Bedienung

1. **Datum anpassen:** Das Datum steht standardmäßig auf `Heute`. Bei Bedarf klickst du auf den Datums-Chip `📅 Heute ▾`, um einen vergangenen Tag nachzutragen (über `↺ Heute` kommst du jederzeit zurück).
2. **Lebensmittel erfassen:** Tippe in das Suchfeld:
   - Auf dem Handy öffnet sich das Vollbild-Such-Overlay ohne störende Tastatur (freies Scrollen).
   - In der Suche kannst du optional über `🏷️ Alle Kategorien ▾` (im App-Design) oder den Grün-Filter (`🟢`) filtern.
   - Tippe nacheinander alle gegessenen Zutaten an.
   - Tippe auf `Speichern (X)`, um alle Einträge sofort zu sichern.
3. **Konfliktprüfung:** Falls ein Lebensmittel das Rotationsprinzip verletzt oder unverträglich ist, poppt beim Speichern ein Bestätigungsdialog (Ja/Nein) auf. Bereits erfasste Lebensmittel werden lautlos ignoriert.
4. **Verlauf einsehen:** Der Verlauf zeigt standardmäßig die letzten 4 Tage zugeklappt an. Klicke auf einen Tag, um die Details zu sehen. Über `🔍` kannst du nach Zeiträumen sowie per Modal nach Kategorie (`🏷️`) und Verträglichkeitsstatus (`🚦`) filtern, über `🗑️` Einträge löschen.
5. **Backups:** Über das Zahnrad `⚙` oben rechts kannst du jederzeit Backups als JSON exportieren oder importieren.

## Datenbasis pflegen & Versionieren

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

## Hinweise

- Alle Daten liegen in der lokalen Browser-Datenbank (`IndexedDB`).
- Bei einem Gerätewechsel überträgst du die Daten über das Zahnrad `⚙` per Backup-Export und Import.
- Ein Service Worker benötigt `localhost` oder eine HTTPS-Verbindung.

## Lizenz

Privater Gebrauch.
