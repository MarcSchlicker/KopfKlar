# KopfKlar Android-Quellcode 1.4.2

Dies ist ein eigenständig baubarer Android-Quellstand mit Kalender,
Medikamentendetails, Statistiken, lokalen Backups und DE/EN-Oberfläche.
Quellrevision: `417f86c89eed968e33fe6be148025fbea1bb4913`. Diese Ausgabe enthält keine private Historie,
Entwicklungsakte, Hostingkonfiguration, Signierschlüssel oder Nutzerdaten.
Server-/Hostingbeispiele und interne Dokumentation sind nicht Bestandteil
dieser Android-Ausgabe. Die Android-Oberfläche und ihre fachliche Logik
bleiben unverändert; npm-Skripte und Tests sind auf diesen Umfang begrenzt.

## Lizenz

**Öffentlich einsehbar, aber nicht für kommerzielle Nutzung freigegeben.**
Es gilt [PolyForm Noncommercial 1.0.0](LICENSE), mit dem dort genannten
Copyright-/Lizenzhinweis. Für kommerzielle Nutzung ist eine gesonderte
Erlaubnis nötig. Drittanbieter- und Schriftlizenzen: [ATTRIBUTION.md](ATTRIBUTION.md).
Dies ist keine freie Softwarelizenz im Sinne des offiziellen F-Droid-Katalogs;
die öffentliche Bereitstellung allein ermöglicht dort keine Aufnahme.
Name/Logo sind nicht als frei verwendbare Marken freigegeben.

## Bauen und prüfen

Node >=22.13 (CI: 22), npm mit Lockfile, OpenJDK 21,
Android SDK 36 und Build Tools 36.0.0 verwenden.

```sh
npm ci
npm run lint
npm test
npm run android:sync
node scripts/check-distribution.cjs --android-web
cd android
bash gradlew --no-daemon assembleRelease -PkopfklarUnsignedRelease=true
```

Unter Windows den letzten Befehl mit `gradlew.bat` ausführen.
Ausgabe: `android/app/build/outputs/apk/release/app-release-unsigned.apk`.
Das Paket ist ohne Signierung nicht installierbar. Veröffentlichung,
vertrauenswürdige Signatur, Updatefähigkeit zur bestehenden Installation
und Geräteabnahme sind gesonderte Schritte. Die Version ist in Vorbereitung,
nicht als Store-Release freigegeben. Kein Nachweis bitweiser Reproduzierbarkeit.

Die Abhängigkeiten und das Lockfile bleiben vollständig erhalten; nur nicht
mitgelieferte Webserver-/Datenbankskripte wurden aus package.json entfernt.
SHA-256-Werte aller Ausgabedateien stehen in SOURCE_MANIFEST.json.

Die App verarbeitet Tagebuchdaten lokal. Backups enthalten persönliche Daten;
keine Gesundheitsdaten in öffentliche Issues stellen. Die Codesperre schützt
die Oberfläche, verschlüsselt aber nicht den lokalen Speicher. Vor einem
Installations-/Signaturwechsel ein Backup erstellen. KopfKlar ersetzt keine
ärztliche Diagnose oder Behandlung.
