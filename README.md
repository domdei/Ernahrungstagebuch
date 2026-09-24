# Persönliches Ernährungstagebuch

Eine Progressive Web App (PWA) zur Erfassung von Lebensmitteln. Die App prüft automatisch Rotationszeiten und persönliche Unverträglichkeiten. Sie läuft im Browser, funktioniert offline und speichert Daten lokal auf dem Gerät.

## Hauptfunktionen

- **4-Tage-Rotationswarnung:** Warnt, wenn ein Lebensmittel in den letzten 3 Tagen gegessen wurde. Ab Tag 5 ist es wieder ohne Warnung erlaubt.
- **Unverträglichkeitsprüfung:** Markiert Lebensmittel nach eigener Einstufung farblich (Grün, Orange, Rot).
- **Schnellfilter (🟢):** Filtert die Suche per Knopfdruck auf verträgliche und heute rotationsfreie Lebensmittel (`Lebensmittel (gefiltert)`).
- **Tag- und Nachtmodus (☾ / ☼):** Wechselt das Farbschema über die Kopfzeile und speichert die Wahl.
- **Tagesabstand-Badges:** Zeigt bei Vorschlägen an, vor wie vielen Tagen ein Lebensmittel gegessen wurde (`1T`, `2T`, `3T`).
- **Verlauf:** Zeigt Einträge pro Tag an. Bietet Filter nach Datum, Kategorie und Status sowie einen Löschmodus.
- **Entwurfsspeicherung:** Sichert ungespeicherte Eingaben automatisch im Browser.
- **Backup:** Exportiert Daten als JSON über das Android-Teilen-Menü oder per Download. Importiert Backups aus JSON.
- **Offlinefähig:** Lässt sich auf Android als App installieren und ohne Internet nutzen.

## Projektstruktur

- [index.html](index.html): HTML-Gerüst der App.
- [styles.css](styles.css): Styles für mobile Geräte und Desktop.
- [app.js](app.js): Gesamte Anwendungslogik.
- [manifest.json](manifest.json): PWA-Konfiguration für die Installation.
- [sw.js](sw.js): Service Worker für Caching und Offlinebetrieb.
- [version.json](version.json): Versionsnummer der App.
- [data.md](data.md): Quelldatei der Lebensmittel als Tabelle.
- [build_assets.py](build_assets.py): Erzeugt `food-data.json` aus `data.md`.
- [food-data.json](food-data.json): Von der App geladene Datenbank.
- `icons/`: App-Symbole für Mobilgeräte.

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
3. Suche das Lebensmittel und tippe es an.
4. Wiederhole den Schritt für weitere Lebensmittel.
5. Speichere die Auswahl.
6. Prüfe oder bearbeite Einträge im Verlauf.
7. Sichere deine Daten regelmäßig über "Backup speichern".

## Datenbasis pflegen

1. Öffne [data.md](data.md) und passe die Tabelle an (`Kategorie,Lebensmittel,Status`).
2. Führe das Build-Skript aus:

```bash
python build_assets.py
```

3. Das Skript aktualisiert [food-data.json](food-data.json).

## Hinweise

- Alle Daten liegen im lokalen Browserspeicher (`localStorage`).
- Bei einem Gerätewechsel überträgst du die Daten per Backup-Export und Import.
- Ein Service Worker benötigt `localhost` oder eine HTTPS-Verbindung.

## Lizenz

Privater Gebrauch.
