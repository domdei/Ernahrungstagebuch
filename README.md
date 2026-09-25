# Persönliches Ernährungstagebuch

Eine Progressive Web App (PWA) zur Erfassung von Lebensmitteln. Die App prüft automatisch Rotationszeiten und persönliche Unverträglichkeiten. Sie läuft im Browser, funktioniert offline und speichert Daten lokal und dauerhaft in einer IndexedDB-Datenbank auf dem Gerät.

## Hauptfunktionen

- **4-Tage-Rotationswarnung:** Warnt, wenn ein Lebensmittel in den letzten 3 Tagen gegessen wurde. Ab Tag 5 ist es wieder ohne Warnung erlaubt.
- **Unverträglichkeitsprüfung:** Markiert Lebensmittel nach eigener Einstufung farblich (Grün, Orange, Rot).
- **Vollbild-Suche & Mehrfachauswahl (Mobile):** Auf Smartphones öffnet sich beim Suchen ein aufgeräumtes Vollbild-Overlay. Mehrere Zutaten können hintereinander angetippt werden, während das Suchfeld für die nächste Zutat bereitbleibt und eine obere Leiste die Auswahl anzeigt (`[ Fertig (X) ]`).
- **Kompakter Kategorie-Filter mit Schnell-Reset (✕):** Einheitlich gestaltete Kategorieauswahl mit 1-Klick-Reset auf „Alle“.
- **Schnellfilter (🟢):** Filtert die Suche per Knopfdruck auf verträgliche und heute rotationsfreie Lebensmittel (`Lebensmittel (gefiltert)`).
- **Tag- und Nachtmodus (☾ / ☼):** Wechselt das Farbschema über die Kopfzeile und speichert die Wahl.
- **Tagesabstand-Badges:** Zeigt bei Vorschlägen an, vor wie vielen Tagen ein Lebensmittel gegessen wurde (`1T`, `2T`, `3T`).
- **Kompaktes Verlaufs-Akkordeon:** Alle Tage starten eingeklappt als übersichtliche Einzeiler mit Ampel-Zusammenfassung (`14 🟢 · 2 🟠`). Ein Klick klappt die Details auf.
- **Kompakte Werkzeuge (🔍 / 🗑️):** Filterleiste und Löschmodus sitzen platzsparend als Icon-Buttons direkt neben der Überschrift „Verlauf“.
- **Einstellungen & Backup (⚙):** Export und Import sowie Speicherstatus und Version sind aufgeräumt über das Zahnrad-Icon in der Topbar erreichbar.
- **Intelligenter Import-Dialog:** Bietet die Wahl zwischen *Ergänzen* (mit Duplikaterkennung), *Ersetzen* und *Abbrechen* im einheitlichen App-Design.
- **Sticky Speichern-Button:** Bleibt auf Mobilgeräten am unteren Bildschirmrand griffbereit.
- **Moderne Browser-Datenbank (IndexedDB):** Zuverlässige, transaktionssichere Speicherung mit automatischem Schutz gegen Cache-Bereinigung (`navigator.storage.persist()`).
- **Offlinefähig:** Lässt sich auf Android und Desktop als vollwertige PWA installieren und offline nutzen.

## Projektstruktur

- [index.html](index.html): HTML-Gerüst der App samt Modals für Suche, Backup und Einstellungen.
- [styles.css](styles.css): Styles für mobile Geräte und Desktop (inklusive Theme-Variablen und Responsive-Layouts).
- [app.js](app.js): Gesamte Anwendungslogik, IndexedDB-Speicher, Rotation und PWA-Verwaltung.
- [manifest.json](manifest.json): PWA-Konfiguration für die Installation.
- [sw.js](sw.js): Service Worker für Caching und Offlinebetrieb.
- [version.json](version.json): Versionsnummer der App.
- [data.md](data.md): Quelldatei der Lebensmittel als Tabelle.
- [build_assets.py](build_assets.py): Erzeugt [food-data.json](food-data.json) aus [data.md](data.md).
- [food-data.json](food-data.json): Von der App geladene Lebensmittel-Datenbank.
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

1. Wähle das Datum (mit `↺` setzt du es sofort auf heute zurück).
2. Wähle optional eine Kategorie oder aktiviere den Grün-Filter (`🟢`).
3. Tippe auf das Lebensmittelfeld:
   - Auf dem Handy öffnet sich das Vollbild-Such-Overlay.
   - Tippe nacheinander alle Zutaten an – das Suchfeld leert sich automatisch für die nächste Eingabe.
   - Tippe auf `Fertig`, um zurück zum Formular zu gelangen.
4. Prüfe eventuelle Rotations- oder Unverträglichkeitswarnungen.
5. Speichere die Auswahl mit „Einträge speichern“.
6. Im **Verlauf** kannst du vergangene Tage aufklappen, über `🔍` filtern oder über `🗑️` unerwünschte Einträge entfernen.
7. Über das Zahnrad `⚙` oben rechts kannst du jederzeit Backups exportieren oder wieder einspielen.

## Datenbasis pflegen

1. Öffne [data.md](data.md) und passe die Tabelle an (`Kategorie,Lebensmittel,Status`).
2. Führe das Build-Skript aus:

```bash
python build_assets.py
```

3. Das Skript aktualisiert [food-data.json](food-data.json) (bestehende Icons bleiben unverändert).

## Hinweise

- Alle Daten liegen in der lokalen Browser-Datenbank (`IndexedDB`).
- Bei einem Gerätewechsel überträgst du die Daten über das Zahnrad `⚙` per Backup-Export und Import.
- Ein Service Worker benötigt `localhost` oder eine HTTPS-Verbindung.

## Lizenz

Privater Gebrauch.
