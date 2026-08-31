# KopfKlar

KopfKlar is a local-first headache diary for Android. It helps people document headaches, medication, possible triggers, preventive therapies and optional cycle information, then view the data in a calendar, statistics and reports.

## Privacy

KopfKlar stores diary data locally on the device. It has no account system, cloud synchronisation, analytics or advertising SDKs. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for details.

## Features

- Calendar with headache intensity, medication, therapies and optional cycle display
- Configurable symptoms, triggers and medication types
- Local Android reminders and app lock
- Detailed statistics, PDF report and CSV export
- Local import of DMKG diary PDFs
- JSON backup, restore and system sharing
- German and English interface

## Development

Requirements: Node.js 22.13 or newer and a current Android SDK for Android builds.

```bash
npm install
npm run dev
```

Build the Android web assets:

```bash
npm run android:build-web
```

Build a debug APK:

```bash
npm run android:apk
```

For a release bundle, provide your own Android signing configuration locally and run `npm run android:aab`. Never commit signing keys, passwords, APKs or App Bundles.

## Licence

This repository is publicly available source code under the PolyForm Noncommercial License 1.0.0. It permits non-commercial use and modification; commercial use requires a separate licence. This is source-available, not Open Source in the OSI sense. See [LICENSE](LICENSE).

## Attribution

Third-party software, fonts and inspiration are listed in [ATTRIBUTION.md](ATTRIBUTION.md). KopfKlar is an independent project and is not affiliated with the German Migraine and Headache Society (DMKG).
