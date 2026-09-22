# Persönliches Ernährungstagebuch

Eine responsive Progressive Web App (PWA) für ein persönliches Ernährungstagebuch. Die App dient ausschließlich der Erfassung von Lebensmitteln und der automatischen Prüfung, ob ein Lebensmittel in den letzten Tagen bereits gegessen wurde oder laut der eigenen Bewertung als orange oder rot eingestuft ist.

Dabei läuft die Anwendung komplett im Browser und kann auf Android als installierbare App auf dem Startbildschirm platziert werden. Sie funktioniert offline, bleibt mobil nutzbar und speichert die Daten lokal im Browser.

## Zweck der App

Die App unterstützt die tägliche Erfassung von Lebensmitteln mit folgenden Prüfungen:

- Rotationswarnung: Wenn ein Lebensmittel in den letzten 4 Tagen bereits gegessen wurde
- Unverträglichkeitswarnung: Wenn ein Lebensmittel laut der eigenen Bewertung als orange oder rot markiert ist
- Einfache, schnelle Auswahl aus einer persönlichen Lebensmittel-Datenbank
- Keine festen Rotationstage, keine komplexen Pläne und keine Kategorie-Abhängigkeiten

## PWA-Anforderungen

Die App enthält die notwendigen PWA-Komponenten:

- Manifest mit Name, Icons, Theme-Farben und standalone-Display
- Service Worker für Caching und Offline-Fallback
- Installierbarkeit auf Android über Add to Home Screen
- Vollbild-ähnliches Verhalten auf dem Handy ohne Browser-UI

## Funktionen

- Lebensmittel nach Name suchen
- Kategorie filtern
- Vorschläge mit Statusfarbe anzeigen
- Auswahl vor dem Speichern verwalten
- Einträge pro Tag im Verlauf anzeigen
- 4-Tage-Übersicht
- lokale Speicherung im Browser (`localStorage`)
- Export als JSON oder CSV
- Import aus JSON oder CSV
- als installierbare PWA nutzbar
- offline-fähig über Service Worker

## Projektstruktur

- `index.html` – App-Layout
- `styles.css` – Styling und responsive Oberfläche
- `app.js` – Logik für Suche, Auswahl, Filter, Verlauf und Speicherung
- `manifest.json` – PWA-Manifest
- `sw.js` – Service Worker für Offline-Funktion
- `food-data.json` – Lebensmittel-Datenbank
- `icons/` – Installations- und App-Icons

## Voraussetzungen

- Ein aktueller Browser (Chrome, Edge, Chromium-basierte Browser empfohlen)
- Python 3, falls du den lokalen Webserver verwenden willst

## Lokale Ausführung

Im Projektordner ausführen:

```bash
python -m http.server 8001
```

Danach im Browser öffnen:

```text
http://localhost:8001/
```

## Testen auf dem Handy im gleichen WLAN

1. Auf dem PC den Server starten:

```bash
cd "c:\Users\domin\OneDrive\Data\VSCode\Project\Ernahrungstagebuch"
python -m http.server 8001
```

2. Auf dem PC die eigene IP ermitteln:

```powershell
ipconfig
```

3. Die IPv4-Adresse notieren, z. B.:

```text
192.168.1.25
```

4. Auf dem Handy im gleichen WLAN den Browser öffnen und folgende Adresse eingeben:

```text
http://192.168.1.25:8001/
```

5. Die App testen und optional als PWA auf dem Handy installieren.

## Verwendung

1. Datum auswählen
2. Kategorie wählen (optional)
3. Lebensmittel suchen und aus der Vorschlagsliste wählen
4. Mehrere Lebensmittel in die Auswahl aufnehmen
5. Auswahl per Chip entfernen oder mit dem X direkt verwalten
6. Einträge speichern
7. Verlauf und 4-Tage-Übersicht prüfen

## Datenpflege

Die Lebensmittel-Daten stammen aus `food-data.json`. Diese Datei ist projekt- und nutzer-spezifisch und muss je nach persönlicher Bewertung, Lebensmitteln, Kategorien und individuellen Regeln angepasst werden.

Das bedeutet:

- neue Lebensmittel oder Kategorien müssen manuell in `food-data.json` ergänzt werden
- bestehende Einträge können je nach persönlicher Bewertung angepasst werden
- die App nutzt diese Datei als zentrale Datenbasis, daher ist sie kein statischer, unveränderlicher Standard
- bei größeren Änderungen solltest du die Datei gezielt bearbeiten oder mit einem eigenen Generator neu erzeugen

## Hinweise

- Die Daten werden lokal im Browser gespeichert.
- Bei einem Wechsel des Browsers oder Gerätes sind ältere Datensätze nicht automatisch sichtbar.
- Für echte PWA-Funktionalität ist ein lokaler Server sinnvoll.

## Lizenz

Dieses Projekt ist für den privaten Gebrauch vorgesehen.

# Ernahrungstagebuch

Nutrition Rotation Tracker – PWA zur Erfassung täglicher Lebensmittel mit automatischer 4‑Tage‑Rotationswarnung und Unverträglichkeitsprüfung (Grün/Orange/Rot).
