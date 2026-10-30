# Quellen, Lizenzen und Hinweise

## Eigenständige Umsetzung

KopfKlar wurde in diesem Repository als eigenständige Web-App umgesetzt.
Die Datenfelder, der Kalenderablauf und die Auswertungsstruktur wurden durch
die Idee eines Kopfschmerztagebuchs und die öffentlich sichtbaren
Bedienabläufe der DMKG-Kopfschmerz-App inspiriert, damit ähnliche Daten
strukturiert dokumentiert und ausgewertet werden können.

Es wurde kein Quellcode, keine Grafik, kein Text und kein Markenmaterial der
DMKG-App übernommen. „DMKG“ ist eine Bezeichnung der Deutschen Migräne- und
Kopfschmerzgesellschaft; KopfKlar ist nicht mit ihr verbunden und wird nicht
von ihr unterstützt.

## KopfKlar-Logo und Name

Das KopfKlar-Logo wurde vom Projektinhaber für diese App bereitgestellt. Es
ist Teil der KopfKlar-Markenidentität und wird nicht zur freien Nutzung als
Marke freigegeben. Vor einer öffentlichen Veröffentlichung sollte der
Projektinhaber sicherstellen, dass er alle erforderlichen Rechte am Logo
besitzt.

## Headi

Die Funktionsidee wurde außerdem am Open-Source-Projekt
[Headi (Headache Diary) von MrReSc](https://github.com/MrReSc/Headi)
orientiert. Headi ist unter der MIT-Lizenz veröffentlicht, Copyright (c) 2021
MrReSc. KopfKlar übernimmt keinen Quellcode aus Headi; der Verweis dient der
transparenten Anerkennung der fachlichen und funktionalen Inspiration.

## Verwendete Software-Bausteine

Die folgenden direkten Abhängigkeiten sind in `package.json` festgehalten:

| Baustein | Version | Lizenz |
| --- | ---: | --- |
| React / React DOM | 19.2.6 | MIT |
| Capacitor Core / Android / Browser / Filesystem / Share / Local Notifications | 8.5.0 / 8.0.0 | MIT |
| jsPDF | 4.2.1 | MIT |
| PDF.js (`pdfjs-dist`) | 6.2.108 | Apache-2.0 |
| Vinext | 1.0.0-beta.2 | MIT |
| Vite | 8.0.13 | MIT |
| Drizzle ORM | 0.45.2 | Apache-2.0 |

Zusätzliche indirekte Abhängigkeiten werden durch die jeweiligen Pakete
mitgebracht. Ihre Lizenzinformationen sind in den installierten
Paketmetadaten verfügbar.

## Schriftarten

Die Benutzeroberfläche bündelt **DM Sans Variable** und **Manrope Variable**
über `@fontsource-variable/dm-sans` und `@fontsource-variable/manrope`, jeweils
Version 5.3.0, lokal. Es erfolgt kein Abruf von Google Fonts zur Laufzeit.
Beide Schriftfamilien stehen unter der SIL Open Font License 1.1. Die
vollständigen Lizenztexte einschließlich Copyright werden in Web- und
Android-Paketen unter `licenses/dm-sans-OFL.txt` und
`licenses/manrope-OFL.txt` mitgeliefert. Ihre Quelldateien liegen in
`public/licenses/` und `android-web/public/licenses/`.

## Geltung der Projektlizenz

Die Datei [LICENSE](LICENSE) gilt für den eigenständigen KopfKlar-Code. Sie
verwendet die PolyForm Noncommercial License 1.0.0 und enthält den
verbindlichen Copyright-Hinweis für Marc Schlicker. Die Projektlizenz ersetzt
keine Lizenzen der oben genannten Drittanbieter-Projekte.
