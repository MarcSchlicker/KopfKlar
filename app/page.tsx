"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Share } from "@capacitor/share";

type Screen =
  | "calendar"
  | "day"
  | "pain"
  | "statistics"
  | "report"
  | "settings"
  | "medications"
  | "triggers"
  | "therapies"
  | "import"
  | "pain-fields"
  | "personal"
  | "data"
  | "appearance";
type Language = "de" | "en";
type MedicationKind = "Akut" | "Alternative" | "Präventiv";
type PresetPainPalette = "rose" | "sunset" | "violet";
type PainPalette = PresetPainPalette | "custom";
type PainScale = [string, string, string, string, string];
type PainSectionId =
  | "location"
  | "characteristics"
  | "symptoms"
  | "aura"
  | "impacts";
type EntryFilter =
  | "documented"
  | "pain"
  | "free"
  | "medication"
  | "acute"
  | "alternative"
  | "preventive"
  | "trigger"
  | "therapy"
  | "period"
  | "high-intensity"
  | "long-duration";
type Medication = {
  id: string;
  name: string;
  dose: string;
  kind: MedicationKind;
};
type MedicationUse = {
  medicationId: string;
  effectiveness: "gut" | "mittel" | "schlecht";
};
type Therapy = { id: string; name: string; durationWeeks: number };
type ReminderSettings = { enabled: boolean; time: string; lastSent: string };
type BackupSettings = {
  enabled: boolean;
  intervalWeeks: number;
  lastPromptDate: string;
  lastBackupDate: string;
};
type CycleSettings = { enabled: boolean };
type AppearanceSettings = {
  painPalette: PainPalette;
  darkMode: boolean;
  customPainColors: PainScale;
};
type SupportReminder = {
  dismissedAt: string;
  disabled: boolean;
  startedAt: string;
};
type AppLockSettings = { enabled: boolean; salt: string; hash: string };
type NavigationPoint = { screen: Screen; scrollY: number };
type PainFieldSettings = Record<PainSectionId, string[]>;
type DayEntry = {
  date: string;
  headache: boolean | null;
  dayComment: string;
  preventiveMedication: string;
  generalComment: string;
  period: boolean | null;
  intensity: number;
  duration: number;
  location: string[];
  characteristics: string[];
  symptoms: string[];
  aura: string[];
  impacts: string[];
  triggers: string[];
  medications: MedicationUse[];
  therapies: string[];
};
type MonthlySummary = {
  date: Date;
  label: string;
  painDays: number;
  medicationDays: number;
  acuteUses: number;
  alternativeUses: number;
  duration: number;
  intensity: number | null;
  unableToWork: number;
};
type DmkgImport = {
  sourceName: string;
  entries: DayEntry[];
  medications: Medication[];
};
type PdfTextItem = { str: string; transform: number[] };
type BackupPayload = {
  format: "kopfklar-backup";
  version: 1;
  exportedAt: string;
  data: {
    entries: DayEntry[];
    medications: Medication[];
    triggers: string[];
    therapies: Therapy[];
    reminders: ReminderSettings;
    backupSettings: BackupSettings;
    language: Language;
    cycleSettings: CycleSettings;
    painFieldSettings: PainFieldSettings;
    appearance: AppearanceSettings;
    appLock: AppLockSettings;
  };
};

const ENTRIES_KEY = "kopfklar-tage-v2";
const MEDICATIONS_KEY = "kopfklar-medikamente-v2";
const TRIGGERS_KEY = "kopfklar-trigger-v2";
const THERAPIES_KEY = "kopfklar-therapien-v1";
const REMINDERS_KEY = "kopfklar-erinnerungen-v1";
const LANGUAGE_KEY = "kopfklar-sprache-v1";
const PAIN_SECTIONS_KEY = "kopfklar-schmerzfelder-v1";
const PAIN_FIELD_SETTINGS_KEY = "kopfklar-schmerzfeld-auswahl-v2";
const CYCLE_SETTINGS_KEY = "kopfklar-zyklus-v1";
const BACKUP_SETTINGS_KEY = "kopfklar-backup-erinnerung-v1";
const SETUP_COMPLETE_KEY = "kopfklar-einrichtung-v1";
const APPEARANCE_KEY = "kopfklar-darstellung-v1";
const SUPPORT_REMINDER_KEY = "kopfklar-unterstuetzung-v1";
const APP_LOCK_KEY = "kopfklar-app-sperre-v1";
const LEGACY_KEY = "kopfklar-eintraege-v1";
const FACTORY_RESET_PENDING_KEY = "kopfklar-werkreset-ausstehend-v1";
const DAILY_REMINDER_ACTION_TYPE = "kopfklar-tagescheck";
const QUICK_NO_HEADACHE_ACTION = "keine-kopfschmerzen";
const QUICK_HEADACHE_ACTION = "kopfschmerzen-eintragen";
let activeLanguage: Language = "de";

const englishText: Record<string, string> = {
  Einstellungen: "Settings",
  Kalender: "Calendar",
  Statistik: "Statistics",
  "Dein Kopfschmerzkalender": "Your headache diary",
  "Tippe auf einen Tag zum Eintragen": "Tap a day to add an entry",
  Kopfschmerztage: "Headache days",
  "Tage mit Medikation": "Days with medication",
  "Heute eintragen": "Add today",
  "Keine Kopfschmerzen": "No headache",
  Akutmedikation: "Acute medication",
  "Alternative Medikation": "Alternative medication",
  "Präventive Medikation": "Preventive medication",
  "Periode eingetragen": "Period recorded",
  "Periode geschätzt": "Estimated period",
  "Eisprung geschätzt": "Estimated ovulation",
  Therapie: "Therapy",
  "Mo.": "Mon.",
  "Di.": "Tue.",
  "Mi.": "Wed.",
  "Do.": "Thu.",
  "Fr.": "Fri.",
  "Sa.": "Sat.",
  "So.": "Sun.",
  "Kopfschmerzen / Migräne": "Headache / migraine",
  Ja: "Yes",
  Nein: "No",
  "Kommentar zum Tag": "Daily notes",
  "Vorbeugende Medikation": "Preventive medication",
  "Allgemeiner Kommentar": "General note",
  "Hattest du an diesem Tag deine Periode?":
    "Did you have your period on this day?",
  "Vorbeugende Therapie": "Preventive therapy",
  "Markiere eine Therapie an dem Tag, an dem sie begonnen oder erneuert wurde.":
    "Mark a therapy on the day it started or was renewed.",
  "Noch keine Therapie angelegt.": "No therapy added yet.",
  "Therapien verwalten": "Manage therapies",
  "Schmerzen detailliert beschreiben": "Describe pain in detail",
  Abbrechen: "Cancel",
  Fertig: "Done",
  "Kopfschmerzen beschreiben": "Describe headache",
  Schmerzdaten: "Pain details",
  Schmerzstärke: "Pain intensity",
  leicht: "mild",
  "sehr stark": "very severe",
  Schmerzdauer: "Pain duration",
  Stunden: "hours",
  "Symptome und Auswirkungen": "Symptoms and impact",
  Kopfschmerzlokalisation: "Pain location",
  Beidseitig: "Both sides",
  Einseitig: "One side",
  Kopfschmerzcharakteristika: "Pain characteristics",
  "Pochend / pulsierend": "Throbbing / pulsating",
  "Dumpf / drückend": "Dull / pressing",
  Begleitsymptome: "Associated symptoms",
  Migräneaura: "Migraine aura",
  "Auswirkungen auf deinen Tag": "Impact on your day",
  "Mögliche Trigger": "Possible triggers",
  "Was war vor den Kopfschmerzen auffällig?":
    "What stood out before the headache?",
  "Trigger verwalten": "Manage triggers",
  Zurück: "Back",
  "Verstärkung bei körperlicher Aktivität": "Worse with physical activity",
  Übelkeit: "Nausea",
  Erbrechen: "Vomiting",
  Lichtempfindlichkeit: "Light sensitivity",
  Lärmempfindlichkeit: "Sound sensitivity",
  Geruchsempfindlichkeit: "Smell sensitivity",
  Schwindel: "Dizziness",
  Konzentrationsstörungen: "Difficulty concentrating",
  "Müdigkeit / Erschöpfung": "Fatigue / exhaustion",
  Sehstörung: "Visual disturbance",
  Gefühlsstörung: "Sensory disturbance",
  Sprachstörung: "Speech disturbance",
  Lähmung: "Paralysis",
  "Arbeit / Schule ausgefallen": "Missed work / school",
  "Haushalt / Freizeit ausgefallen": "Missed household / leisure",
  "Ambulant beim Arzt gewesen": "Outpatient doctor visit",
  "In der Notaufnahme gewesen": "Emergency department visit",
  "Krankenhausaufenthalt über Nacht": "Overnight hospital stay",
  Stress: "Stress",
  Schlafmangel: "Lack of sleep",
  Wetterwechsel: "Weather change",
  Zyklus: "Cycle",
  "Mahlzeit ausgelassen": "Skipped meal",
  Alkohol: "Alcohol",
  Bildschirmzeit: "Screen time",
  "Sport / Belastung": "Sport / exertion",
  "Deine Daten, dein Gerät": "Your data, your device",
  "Alle Einträge bleiben ausschließlich in diesem Browser gespeichert.":
    "All entries are stored only in this browser.",
  Sprache: "Language",
  "Wähle die Sprache der App.": "Choose the app language.",
  Deutsch: "German",
  Englisch: "English",
  "Tägliche Erinnerung aktiv": "Daily reminder active",
  "Tägliche Erinnerung": "Daily reminder",
  "Erinnert dich täglich daran, deinen Kopfschmerzkalender auszufüllen.":
    "Reminds you every day to complete your headache diary.",
  Uhrzeit: "Time",
  "Benachrichtigung testen": "Test notification",
  "Benachrichtigungen erlauben": "Allow notifications",
  Deaktivieren: "Disable",
  "Die Erinnerung funktioniert, solange KopfKlar bzw. dein Browser aktiv ist.":
    "The reminder works while KopfKlar or your browser is active.",
  "Medikamente & Alternativen": "Medication & alternatives",
  "Schmerzmittel, Ingwertee, Cola und weitere Maßnahmen":
    "Pain medication, ginger tea, cola, and other measures",
  "Vorbeugende Therapien": "Preventive therapies",
  "z. B. Botox mit individuell definierter Wirkzeit":
    "e.g. Botox with an individually defined duration",
  "Eigene mögliche Auslöser auswählen": "Choose your own possible triggers",
  "Ausführlicher Report": "Detailed report",
  "Jahresübersicht mit Diagrammen und PDF":
    "Annual overview with charts and PDF",
  "Rohdaten exportieren": "Export raw data",
  "CSV-Datei für den Arzttermin herunterladen":
    "Download a CSV file for your appointment",
  "Kalender zurücksetzen": "Reset calendar",
  "Entfernt alle gespeicherten Tage nur aus diesem Browser.":
    "Removes all saved days from this browser only.",
  "Einträge löschen": "Delete entries",
  "Dein Monatsüberblick": "Your monthly overview",
  "Ø Stärke": "Avg. intensity",
  Dokumentiert: "Recorded",
  "Ausführlichen Report öffnen": "Open detailed report",
  "Diagramme, Jahresdaten, Therapien und PDF":
    "Charts, annual data, therapies and PDF",
  Auslöser: "Triggers",
  "Trigger-Analyse": "Trigger analysis",
  bei: "across",
  Einträgen: "entries",
  "Sobald du Trigger einträgst, siehst du hier mögliche Muster.":
    "Once you add triggers, possible patterns appear here.",
  Wirkfenster: "Effective window",
  "Tage im Wirkfenster": "days during the effective window",
  "Noch nicht eingetragen": "Not recorded yet",
  "Vorbeugende Therapien lassen sich im Profil anlegen und danach am jeweiligen Tag markieren.":
    "You can add preventive therapies in Settings and mark them on the relevant day.",
  "Rohdaten als CSV exportieren": "Export raw data as CSV",
  "KopfKlar · persönlicher Bericht": "KopfKlar · personal report",
  "Report & Verlauf": "Report & history",
  "Letzte Aktualisierung:": "Last updated:",
  "Als PDF speichern": "Save as PDF",
  "Öffnet den Druckdialog. Dort „Als PDF speichern“ auswählen.":
    "Opens the print dialog. Choose “Save as PDF” there.",
  Monatsansicht: "Monthly view",
  "Kopfschmerztage & Medikation": "Headache days & medication",
  "letzte 12 Monate": "last 12 months",
  "Medikationstage:": "Medication days:",
  "Medikamente & Wirkung": "Medication & effectiveness",
  "Verwendung und durchschnittliche Wirkung": "Use and average effectiveness",
  "letzte 3 Monate": "last 3 months",
  "schlecht · 1": "poor · 1",
  "mittel · 5": "medium · 5",
  "gut · 10": "good · 10",
  Gesamtdauer: "Total duration",
  "Kopfschmerzdauer pro Monat": "Headache duration per month",
  "Stunden · 12 Monate": "Hours · 12 months",
  "Durchschnittliche Stärke": "Average intensity",
  "letzte 24 Monate": "last 24 months",
  "Skala von 0 bis 10": "Scale from 0 to 10",
  "Nur Monate mit Einträgen": "Only months with entries",
  "Schmerztage nach Therapie": "Headache days after therapy",
  "Wirkzeit:": "Expected duration:",
  Wochen: "weeks",
  davor: "before",
  "Zum Auswerten am Therapietag markieren.":
    "Mark it on the therapy day for analysis.",
  "Lege im Profil eine Therapie mit Wirkzeit an. Wenn du sie am Starttag markierst, vergleicht der Report das Wirkfenster mit dem Zeitraum davor.":
    "Add a therapy with an expected duration in Settings. Mark its start day to compare the effective window with the previous period.",
  Jahrestabelle: "Annual table",
  "Alle Kennzahlen der letzten 12 Monate":
    "All metrics from the last 12 months",
  Monat: "Month",
  Schmerztage: "Headache days",
  "Med.-Tage": "Medication days",
  Dauer: "Duration",
  "Ø Stärke": "Avg. intensity",
  AU: "Absence",
  Arbeitsunfähigkeit: "Inability to work",
  "Ausfälle nach Monat": "Absences by month",
  Tag: "day",
  Tage: "days",
  "Noch keine Arbeits- oder Schulausfälle dokumentiert.":
    "No work or school absences recorded yet.",
  Kommentare: "Comments",
  "Deine Notizen im Überblick": "Your notes at a glance",
  "Kommentare aus den Tagesansichten werden hier gesammelt.":
    "Comments from daily entries are collected here.",
  "Noch keine Akut- oder Alternativmedikation in den letzten drei Monaten dokumentiert.":
    "No acute or alternative medication recorded in the last three months.",
  Einnahme: "use",
  Einnahmen: "uses",
  "Ø Wirkung": "Avg. effectiveness",
  schlecht: "poor",
  mittel: "medium",
  gut: "good",
  Medikamente: "Medication",
  "Akutmedikation ist dunkelrot, alternative Maßnahmen wie Ingwertee oder Cola sind blau. Präventive Medikation wird als eigene weiße Kategorie geführt.":
    "Acute medication is dark red, alternatives such as ginger tea or cola are blue. Preventive medication has its own white category.",
  Akut: "Acute",
  Alternative: "Alternative",
  Präventiv: "Preventive",
  "Menge offen": "Amount not specified",
  "Neue Medikation": "New medication",
  Name: "Name",
  "Dosis / Menge": "Dose / amount",
  "Akut · dunkelrot": "Acute · dark red",
  "Alternativ · blau": "Alternative · blue",
  "Präventiv · weiß": "Preventive · white",
  Hinzufügen: "Add",
  "Vorbeugende Therapien": "Preventive therapies",
  "Lege eine Therapie mit der erwarteten Wirkzeit an. Markiere sie anschließend am jeweiligen Start- oder Erneuerungstag im Kalender.":
    "Add a therapy with its expected duration. Then mark it on its start or renewal day in the calendar.",
  "Zum Beispiel: Botox, CGRP-Antikörper, Physiotherapie oder Ausdauertraining.":
    "For example: Botox, CGRP antibodies, physiotherapy or endurance training.",
  "Therapie anlegen": "Add therapy",
  Bezeichnung: "Name",
  "Erwartete Wirkzeit in Wochen": "Expected duration in weeks",
  "Therapie hinzufügen": "Add therapy",
  "Diese Auslöser kannst du beim Schmerz-Eintrag schnell markieren.":
    "You can quickly mark these triggers in a pain entry.",
  "Eigenen Trigger hinzufügen": "Add custom trigger",
  "Trigger hinzufügen": "Add trigger",
  "z. B. täglich eingenommene Medikamente": "e.g. daily medication",
  "Wie war dein Tag?": "How was your day?",
  "z. B. Amitriptylin": "e.g. amitriptyline",
  "z. B. 1 Tablette oder 400 mg": "e.g. 1 tablet or 400 mg",
  "z. B. Botox": "e.g. Botox",
  "z. B. Flüssigkeitsmangel": "e.g. dehydration",
  Hauptnavigation: "Main navigation",
  Zurück: "Back",
  Speichern: "Save",
  "Alternative Medikation eingetragen": "Alternative medication recorded",
  "Präventive Medikation eingetragen": "Preventive medication recorded",
  "Akutmedikation eingetragen": "Acute medication recorded",
  "Vorbeugende Therapie eingetragen": "Preventive therapy recorded",
  "Trigger eingetragen": "Trigger recorded",
  "DMKG-Daten importieren": "Import DMKG data",
  "DMKG-PDF auswählen": "Choose DMKG PDF",
  "Die PDF wird ausschließlich auf diesem Gerät ausgewertet und nicht hochgeladen.":
    "The PDF is processed only on this device and is not uploaded.",
  Importvorschau: "Import preview",
  Übernehmen: "Import",
  "Andere PDF auswählen": "Choose another PDF",
  "Ausgelesene Tage": "Parsed days",
  Kopfschmerztage: "Headache days",
  "Keine Kopfschmerzen": "No headache",
  "Import abgebrochen.": "Import cancelled.",
  "Die PDF enthält keine lesbaren DMKG-Tagebucheinträge.":
    "The PDF contains no readable DMKG diary entries.",
  "Die PDF konnte nicht gelesen werden. Bitte wähle einen DMKG-Report aus.":
    "The PDF could not be read. Please choose a DMKG report.",
  "DMKG-Import wird ausgewertet …": "Reading DMKG import …",
  "Tage wurden importiert.": "days were imported.",
  Schmerzangaben: "Pain fields",
  "Sichtbare Schmerzangaben": "Visible pain fields",
  "Lege fest, welche Bereiche beim Öffnen des Schmerzformulars sofort sichtbar sind. Die übrigen findest du unter „Weitere Angaben“.":
    "Choose which sections are immediately visible when opening the pain form. The remaining sections appear under “More details”.",
  "Direkt anzeigen": "Show immediately",
  "Weitere Angaben": "More details",
  "Weitere Angaben ausblenden": "Hide more details",
  "Zyklus dokumentieren": "Track cycle",
  "Aktiviert Periodenangaben, Zyklus-Trigger und die Zyklusauswertung. Deaktivieren blendet diese Angaben aus, vorhandene Daten bleiben erhalten.":
    "Enables period information, cycle triggers, and cycle analysis. Disabling hides them; existing data stays saved.",
  "Doppelte Medikamente zusammenführen": "Merge duplicate medication",
  "Doppelte Medikamente wurden zusammengeführt.":
    "Duplicate medication was merged.",
  "Dieses Medikament ist bereits vorhanden.": "This medication already exists.",
  "Alle direkt anzeigen": "Show all immediately",
  "Einzelne Angaben wählen": "Choose individual fields",
  "Wähle pro Bereich, was sofort sichtbar ist. Nicht ausgewählte Angaben bleiben unter „Weitere Angaben“ erreichbar.":
    "Choose what is immediately visible in each section. Unselected fields remain available under “More details”.",
  "Angaben direkt sichtbar": "fields visible immediately",
  Backups: "Backups",
  "Backup teilen / speichern": "Share / save backup",
  "Erstellt eine vollständige Sicherung deiner lokalen Einträge und Einstellungen als JSON-Datei.":
    "Creates a complete backup of your local entries and settings as a JSON file.",
  "Regelmäßig an Backup erinnern": "Remind me regularly to back up",
  Sicherungsintervall: "Backup interval",
  "alle 4 Wochen": "every 4 weeks",
  "alle 8 Wochen": "every 8 weeks",
  "alle 12 Wochen": "every 12 weeks",
  "Letztes Backup:": "Last backup:",
  "Noch kein Backup erstellt.": "No backup created yet.",
  "Zeit für ein KopfKlar-Backup. Sichere deine Daten in den Einstellungen.":
    "Time for a KopfKlar backup. Save your data in Settings.",
  "Backup wurde geteilt bzw. gespeichert.": "Backup was shared or saved.",
  "Backup wurde heruntergeladen.": "Backup was downloaded.",
  "Willkommen bei KopfKlar": "Welcome to KopfKlar",
  "Richte die wichtigsten Angaben einmal ein. Du kannst alles später in den Einstellungen ändern.":
    "Set up the most important preferences once. You can change everything later in Settings.",
  "Deine Daten, dein Gerät": "Your data, your device",
  "Alle Angaben bleiben auf diesem Gerät. Es gibt kein Konto und keinen Cloud-Abgleich.":
    "All data stays on this device. There is no account and no cloud sync.",
  "Zyklus dokumentieren": "Track cycle",
  "Aktiviert Periodenangaben, Zyklus-Trigger und die Zyklusauswertung. Du kannst dies später jederzeit ändern.":
    "Enables period information, cycle triggers, and cycle analysis. You can change this anytime later.",
  "Einrichtung abschließen": "Finish setup",
  "Einrichtung gespeichert.": "Setup saved.",
  Dokumentation: "Diary",
  Auswertung: "Analysis",
  "App & Daten": "App & data",
  "Persönliches & Erinnerungen": "Personal & reminders",
  "Zyklus, Sprache und tägliche Erinnerung":
    "Cycle, language, and daily reminder",
  "Daten & Backups": "Data & backups",
  "Sichern, wiederherstellen und exportieren": "Back up, restore, and export",
  "KopfKlar-Backup importieren": "Import KopfKlar backup",
  "Backup wiederherstellen": "Restore backup",
  "Wähle eine KopfKlar-Backup-Datei (.json). Sie ersetzt nach Bestätigung die aktuellen lokalen Daten.":
    "Choose a KopfKlar backup file (.json). After confirmation, it replaces your current local data.",
  "Sicherung wiederherstellen": "Restore backup",
  "KopfKlar-Backup wurde wiederhergestellt.": "KopfKlar backup restored.",
  "Die Datei ist kein gültiges KopfKlar-Backup.":
    "This file is not a valid KopfKlar backup.",
  "Backup konnte nicht wiederhergestellt werden.":
    "Backup could not be restored.",
  "DMKG-Bericht importieren": "Import DMKG report",
  "Rohdaten als CSV": "Raw data as CSV",
  "Erweiterte Datenoptionen": "Advanced data options",
  "Kalendereinträge zurücksetzen": "Reset calendar entries",
  "Entfernt ausschließlich die Tagebucheinträge dieses Geräts. Medikamente, Trigger und Einstellungen bleiben erhalten.":
    "Removes only diary entries from this device. Medication, triggers, and settings stay intact.",
  "Alle Kalendereinträge löschen": "Delete all calendar entries",
  "Alle Kalendereinträge wurden gelöscht.":
    "All calendar entries were deleted.",
  "Intervall in Wochen": "Interval in weeks",
  "Standard: jede Woche.": "Default: every week.",
  Woche: "week",
  Wochen: "weeks",
  Datensicherung: "Data backup",
  "Tägliche Erinnerung": "Daily reminder",
  "Tägliche Erinnerung aktiv": "Daily reminder active",
  "Erinnert dich täglich daran, deinen Kopfschmerzkalender auszufüllen.":
    "Reminds you every day to complete your headache diary.",
  "Benachrichtigungen funktionieren, solange KopfKlar bzw. dein Browser aktiv ist.":
    "Notifications work while KopfKlar or your browser is active.",
};
Object.assign(englishText, {
  "Mögliche Auslöser dieses Tages. Sie werden als Zusammenhang ausgewertet, nicht als festgestellte Ursache.":
    "Possible triggers for this day. They are analysed as an association, not as a confirmed cause.",
  "Notiere mögliche Auslöser auch dann, wenn du keine Kopfschmerzen hattest.":
    "Record possible triggers even when you did not have a headache.",
  "Werkseinstellungen zurücksetzen": "Reset to factory settings",
  "Löscht alle Kalendereinträge, Medikamente, Trigger und persönlichen Einstellungen auf diesem Gerät. Danach startet KopfKlar wieder mit Tutorial und Backup-Abfrage.":
    "Deletes all calendar entries, medication, triggers and personal settings on this device. KopfKlar then starts again with the tutorial and a backup prompt.",
  "KopfKlar vollständig zurücksetzen": "Completely reset KopfKlar",
  "Hast du bereits eine KopfKlar-Sicherung? Du kannst sie direkt wiederherstellen oder mit einem leeren Kalender starten.":
    "Do you already have a KopfKlar backup? You can restore it directly or start with an empty calendar.",
  "Ja, Backup importieren": "Yes, import backup",
  "Nein, neu beginnen": "No, start fresh",
  "Tutorial überspringen": "Skip tutorial",
  "So funktioniert KopfKlar": "How KopfKlar works",
  "Tippe einen Trigger an. Die Auswertung zeigt dokumentierte Zusammenhänge, keine medizinisch festgestellte Ursache.":
    "Tap a trigger. The analysis shows documented associations, not a medically confirmed cause.",
  "dokumentierten Tagen mit Kopfschmerzen": "documented days with headache",
  "ohne Kopfschmerzen": "without headache",
  Kopfschmerztage: "headache days",
  "Ø Dauer": "Avg. duration",
  "Kopfschmerzstatus noch nicht dokumentiert":
    "Headache status not documented yet",
  "Entspricht deinem bisherigen dokumentierten Durchschnitt.":
    "Matches your documented average so far.",
  "Darstellung & KopfKlar": "Appearance & KopfKlar",
  "Farben, Darkmode, Unterstützung und Lizenzen":
    "Colours, dark mode, support and licences",
  Darstellung: "Appearance",
  "Über KopfKlar": "About KopfKlar",
  Darkmode: "Dark mode",
  "Schont die Augen bei dunkler Umgebung.":
    "Easier on the eyes in dark surroundings.",
  "Ruhige Nachtfarben, die Augen und Kontrast schonen.":
    "Calm night colours with comfortable contrast.",
  Schmerzfarben: "Pain colours",
  "Leichte Schmerzen sind hellrosa, stärkere werden zunehmend dunkler.":
    "Mild pain is light pink; stronger pain becomes gradually darker.",
  "Wähle eine Skala für leichte bis starke Schmerzen – getrennt vom Periodenrot.":
    "Choose a scale for mild to severe pain – separate from period red.",
  Rosa: "Pink",
  "Gelb → Rosa": "Yellow → pink",
  Violett: "Violet",
  Eigene: "Custom",
  "Eigene Farbskala anpassen": "Adjust custom colour scale",
  "Lege fünf Farbstufen fest. Beim Ändern wird diese Skala sofort verwendet.":
    "Set five colour levels. Editing them uses this scale immediately.",
  "Die Einstellung verändert nur die Darstellung deines Kalenders, nicht deine gespeicherten Daten.":
    "This setting only changes the appearance of your calendar, not your saved data.",
  "KopfKlar ist quelloffen": "KopfKlar source is available",
  "Wenn dir die App gefällt und du die Möglichkeit hast, freue ich mich über Unterstützung. Damit kann ich die App weiterentwickeln – zum Beispiel für ein mögliches Login und sicheres Speichern auf einem Server.":
    "If you like the app and are able to, I appreciate your support. It helps me continue developing KopfKlar – for example, towards possible sign-in and secure server storage.",
  "Auf GitHub unterstützen": "Support on GitHub",
  "Unterstützungshinweis jetzt zeigen": "Show support note now",
  "Hinweis nicht mehr automatisch zeigen": "Do not show the note automatically",
  "Quelloffen & Lizenzen": "Source available & licences",
  "KopfKlar ist ein lokales, quelloffenes Projekt unter der PolyForm Noncommercial License 1.0.0. Nicht-kommerzielle Nutzung ist unter den Lizenzbedingungen möglich; für kommerzielle Nutzung ist eine separate Erlaubnis erforderlich.":
    "KopfKlar is a local, source-available project under the PolyForm Noncommercial License 1.0.0. Noncommercial use is permitted under the licence terms; commercial use needs separate permission.",
  "Quellcode, README und vollständige Lizenzhinweise ansehen":
    "View source code, README and full licence notices",
  "Das Layout und die Auswertungsstruktur sind eigenständig umgesetzt und nur funktional von der DMKG-App inspiriert; KopfKlar ist kein offizielles DMKG-Produkt.":
    "The layout and reporting structure are independently implemented and only functionally inspired by the DMKG app; KopfKlar is not an official DMKG product.",
  "Die Erinnerung wird direkt von Android geplant und funktioniert auch, wenn KopfKlar geschlossen ist.":
    "The reminder is scheduled directly by Android and works even when KopfKlar is closed.",
  "Im Browser kann die Erinnerung nur funktionieren, solange KopfKlar oder der Browser aktiv ist. In der Android-App wird sie zuverlässig geplant.":
    "In a browser, the reminder can only work while KopfKlar or the browser is active. In the Android app it is scheduled reliably.",
  "Notiere mögliche Auslöser auch dann, wenn du keine Kopfschmerzen hattest.":
    "Record possible triggers even when you did not have a headache.",
  "Diese möglichen Auslöser kannst du an jedem Kalendertag markieren – unabhängig davon, ob Kopfschmerzen aufgetreten sind.":
    "You can mark these possible triggers on any calendar day, whether or not you had a headache.",
  "Mögliche Auslöser für jeden Kalendertag":
    "Possible triggers for every calendar day",
  an: "on",
  Tagen: "days",
  "In weniger als einer Minute weißt du, wo du was einträgst. Alles lässt sich später in den Einstellungen anpassen.":
    "In less than a minute, you will know where to record everything. You can change every setting later.",
  "Tag dokumentieren": "Record a day",
  "Tippe im Kalender auf einen Tag – auch ohne Kopfschmerzen kannst du mögliche Trigger festhalten.":
    "Tap a calendar day – you can record possible triggers even without a headache.",
  "Schmerzen beschreiben": "Describe pain",
  "Bei „Ja“ öffnet sich die detaillierte Schmerzangabe mit Stärke, Dauer und Symptomen.":
    "Selecting “Yes” opens the detailed pain form with intensity, duration, and symptoms.",
  "Muster erkennen": "Recognise patterns",
  "Statistik und Report machen Verläufe, Medikamente und Therapien sichtbar.":
    "Statistics and reports show trends, medication, and therapies.",
  Weiter: "Continue",
  "EINSTELLUNG 2 VON 2": "SETTING 2 OF 2",
  "Zyklus dokumentieren?": "Track cycle?",
  "Diese Angabe ist optional und lässt sich später jederzeit ein- oder ausschalten.":
    "This is optional and can be turned on or off later.",
  "Aktiviert Periodenangaben, den Zyklus-Trigger und die Zyklusauswertung.":
    "Enables period information, the cycle trigger, and cycle analysis.",
  Loslegen: "Get started",
  "App mit Code schützen": "Protect app with a code",
  "Beim Öffnen und nach der Rückkehr zur App wird ein 4- bis 8-stelliger Code abgefragt.":
    "A 4 to 8 digit code is requested when opening or returning to the app.",
  "Code-Sperre ist aktiv": "Code lock is active",
  Deaktivieren: "Disable",
  "Neuer Code": "New code",
  "Code wiederholen": "Repeat code",
  "Code aktivieren": "Enable code",
  "Hinweis: Der Code schützt die App-Oberfläche. Bereits lokal gespeicherte Daten werden dadurch nicht verschlüsselt.":
    "Note: The code protects the app interface. Existing local data is not encrypted by it.",
  "App entsperren": "Unlock app",
  "Gib deinen persönlichen App-Code ein.": "Enter your personal app code.",
  Code: "Code",
  Entsperren: "Unlock",
  "Wenn dir die App gefällt und du die Möglichkeit hast, freue ich mich über deine Unterstützung. So kann ich KopfKlar weiterentwickeln.":
    "If you like the app and are able to, I appreciate your support. It helps me keep developing KopfKlar.",
  Unterstützen: "Support",
  "In einem Monat erinnern": "Remind me in a month",
  "Nicht mehr erinnern": "Do not remind me",
  "Unterstützungshinweis schließen": "Close support note",
  "Heute als kopfschmerzfrei eingetragen.":
    "Today was recorded as headache-free.",
  "Schmerzangaben für heute geöffnet.": "Pain details for today are open.",
  "Direkt in der Benachrichtigung kannst du einen kopfschmerzfreien Tag eintragen oder die detaillierte Eingabe öffnen.":
    "You can record a headache-free day directly in the notification or open the detailed entry.",
  "Filter & Ansicht": "Filter & view",
  "Alle dokumentierten Tage": "All recorded days",
  "Nur Kopfschmerztage": "Headache days only",
  "Nur Tage mit Medikation": "Medication days only",
  "Nur Tage mit Triggern": "Trigger days only",
  "Tage mit Triggern": "Days with triggers",
  "Tag auswählen": "Choose a day",
  "Tippe auf einen Tag im Kalender, um deinen Verlauf festzuhalten.":
    "Tap a calendar day to record your history.",
  "Heute dokumentieren": "Record today",
  "Kopfschmerzen?": "Headache?",
  "Auch an ruhigen Tagen kannst du mögliche Trigger festhalten.":
    "You can record possible triggers even on calm days.",
  "Schmerzen genauer beschreiben": "Describe pain in more detail",
  "Stärke, Dauer, Symptome und Medikation werden hier zusammen erfasst.":
    "Intensity, duration, symptoms and medication are recorded here together.",
  "Deine Auswertung": "Your analysis",
  "Linien, Wirkungen und Trigger machen Muster sichtbar.":
    "Lines, effectiveness and triggers make patterns visible.",
  Schritt: "Step",
  von: "of",
  "Kalender filtern": "Filter calendar",
  "Alle Tage": "All days",
  Dokumentiert: "Recorded",
  "Ohne Kopfschmerzen": "Without headache",
  "Mit Medikation": "With medication",
  "Mit Triggern": "With triggers",
  "Stark (7–10)": "Severe (7–10)",
  "Lang (ab 8 h)": "Long (8 h or more)",
  "Mehrere Filter lassen sich kombinieren.":
    "You can combine multiple filters.",
  "Alle zeigen": "Show all",
  "Kopfschmerztage im Filter": "Headache days in filter",
  "Hier startet dein Kalender": "Your calendar starts here",
  "Der markierte heutige Tag ist ein echter Kalendereintrag. Tippe ihn an, um zu dokumentieren.":
    "The highlighted current day is a real calendar entry. Tap it to document.",
  "Hier klicken: Tag öffnen": "Tap here: open day",
  "Kopfschmerzstatus wählen": "Choose headache status",
  "Oben im echten Tagesformular legst du fest, ob Kopfschmerzen da waren. Tippe für den Rundgang auf „Ja“.":
    "In the real day form above, choose whether you had a headache. Tap “Yes” for the walkthrough.",
  "Weiter zu den Schmerzangaben": "Continue to pain details",
  "Schmerzangaben ergänzen": "Add pain details",
  "Stärke, Dauer, Symptome und Medikation sind genau hier. Tippe unten auf „Statistik“, wenn du die Auswertung sehen möchtest.":
    "Intensity, duration, symptoms and medication are recorded right here. Tap “Statistics” below to see your analysis.",
  "Auswertung zeigen": "Show analysis",
  "Muster sichtbar machen": "Make patterns visible",
  "Hier findest du Filter, Triggerzusammenhänge und den ausführlichen Report. Der Rundgang speichert keinen Testeintrag.":
    "Here you find filters, trigger associations and the detailed report. The walkthrough does not save a test entry.",
  "Weiter zur Einrichtung": "Continue setup",
  Rundgang: "Walkthrough",
});
const germanText = Object.fromEntries(
  Object.entries(englishText).map(([german, english]) => [english, german]),
);
const germanUiCorrections: Record<string, string> = {
  Profil: "Einstellungen",
  "Vorbeugende Therapien lassen sich im Profil anlegen und danach am jeweiligen Tag markieren.":
    "Vorbeugende Therapien lassen sich in den Einstellungen anlegen und danach am jeweiligen Tag markieren.",
  "Lege im Profil eine Therapie mit Wirkzeit an. Wenn du sie am Starttag markierst, vergleicht der Report das Wirkfenster mit dem Zeitraum davor.":
    "Lege in den Einstellungen eine Therapie mit Wirkzeit an. Wenn du sie am Starttag markierst, vergleicht der Report das Wirkfenster mit dem Zeitraum davor.",
};
const englishUiCorrections: Record<string, string> = {
  "Vorbeugende Therapien lassen sich in den Einstellungen anlegen und danach am jeweiligen Tag markieren.":
    "You can add preventive therapies in Settings and mark them on the relevant day.",
  "Lege in den Einstellungen eine Therapie mit Wirkzeit an. Wenn du sie am Starttag markierst, vergleicht der Report das Wirkfenster mit dem Zeitraum davor.":
    "Add a therapy with an expected duration in Settings. Mark its start day to compare the effective window with the previous period.",
};
function translateUiText(value: string, language: Language) {
  return language === "en"
    ? (englishText[value] ?? englishUiCorrections[value] ?? value)
    : (germanUiCorrections[value] ?? germanText[value] ?? value);
}
const defaultMedications: Medication[] = [
  { id: "ibu400", name: "Ibuprofen", dose: "400 mg", kind: "Akut" },
  { id: "riza10", name: "Rizatriptan", dose: "10 mg", kind: "Akut" },
  { id: "para500", name: "Paracetamol", dose: "500 mg", kind: "Akut" },
];
const defaultTriggers = [
  "Stress",
  "Schlafmangel",
  "Wetterwechsel",
  "Zyklus",
  "Mahlzeit ausgelassen",
  "Alkohol",
  "Bildschirmzeit",
  "Sport / Belastung",
];
const locationChoices = ["Beidseitig", "Einseitig"];
const characteristicChoices = ["Pochend / pulsierend", "Dumpf / drückend"];
const symptomChoices = [
  "Verstärkung bei körperlicher Aktivität",
  "Übelkeit",
  "Erbrechen",
  "Lichtempfindlichkeit",
  "Lärmempfindlichkeit",
  "Geruchsempfindlichkeit",
  "Schwindel",
  "Konzentrationsstörungen",
  "Müdigkeit / Erschöpfung",
];
const auraChoices = [
  "Sehstörung",
  "Gefühlsstörung",
  "Sprachstörung",
  "Lähmung",
];
const impactChoices = [
  "Arbeit / Schule ausgefallen",
  "Haushalt / Freizeit ausgefallen",
  "Ambulant beim Arzt gewesen",
  "In der Notaufnahme gewesen",
  "Krankenhausaufenthalt über Nacht",
];
const workImpact = "Arbeit / Schule ausgefallen";
const painSectionDefinitions: {
  id: PainSectionId;
  title: string;
  description: string;
}[] = [
  {
    id: "location",
    title: "Kopfschmerzlokalisation",
    description: "beidseitig oder einseitig",
  },
  {
    id: "characteristics",
    title: "Kopfschmerzcharakteristika",
    description: "pulsierend, drückend und weitere Merkmale",
  },
  {
    id: "symptoms",
    title: "Begleitsymptome",
    description: "z. B. Übelkeit oder Lichtempfindlichkeit",
  },
  {
    id: "aura",
    title: "Migräneaura",
    description: "Seh-, Gefühls- oder Sprachstörungen",
  },
  {
    id: "impacts",
    title: "Auswirkungen auf deinen Tag",
    description: "Ausfall, Arztbesuch und Klinik",
  },
];
const defaultPainSections = painSectionDefinitions.map((section) => section.id);
const defaultBackupSettings: BackupSettings = {
  enabled: false,
  intervalWeeks: 1,
  lastPromptDate: "",
  lastBackupDate: "",
};

function painChoicesForSection(section: PainSectionId) {
  if (section === "location") return locationChoices;
  if (section === "characteristics") return characteristicChoices;
  if (section === "symptoms") return symptomChoices;
  if (section === "aura") return auraChoices;
  if (section === "impacts") return impactChoices;
  return impactChoices;
}

function defaultPainFieldSettings(): PainFieldSettings {
  return Object.fromEntries(
    painSectionDefinitions.map((section) => [
      section.id,
      [...painChoicesForSection(section.id)],
    ]),
  ) as PainFieldSettings;
}

function normalizePainFieldSettings(
  value: unknown,
  legacyVisibleSections: PainSectionId[] = defaultPainSections,
): PainFieldSettings {
  const legacy = new Set(legacyVisibleSections);
  const source =
    value && typeof value === "object"
      ? (value as Partial<PainFieldSettings>)
      : {};
  return Object.fromEntries(
    painSectionDefinitions.map((section) => {
      const choices = painChoicesForSection(section.id);
      const saved = source[section.id];
      const direct = Array.isArray(saved)
        ? saved.filter(
            (choice): choice is string =>
              typeof choice === "string" && choices.includes(choice),
          )
        : legacy.has(section.id)
          ? choices
          : [];
      return [section.id, direct];
    }),
  ) as PainFieldSettings;
}

function dateId(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function blankEntry(date: string): DayEntry {
  return {
    date,
    headache: null,
    dayComment: "",
    preventiveMedication: "",
    generalComment: "",
    period: null,
    intensity: 5,
    duration: 4,
    location: [],
    characteristics: [],
    symptoms: [],
    aura: [],
    impacts: [],
    triggers: [],
    medications: [],
    therapies: [],
  };
}

function normalizeEntry(value: Partial<DayEntry> & { date: string }): DayEntry {
  return {
    ...blankEntry(value.date),
    ...value,
    location: value.location ?? [],
    characteristics: value.characteristics ?? [],
    symptoms: value.symptoms ?? [],
    aura: value.aura ?? [],
    impacts: value.impacts ?? [],
    triggers: value.triggers ?? [],
    medications: value.medications ?? [],
    therapies: value.therapies ?? [],
  };
}

function normalizedMedicationText(value: string) {
  return value
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function medicationIdentity(
  medication: Pick<Medication, "name" | "dose" | "kind">,
) {
  return [
    medication.kind,
    normalizedMedicationText(medication.name),
    normalizedMedicationText(medication.dose),
  ].join("|");
}

function uniqueMedicationUses(uses: MedicationUse[]) {
  return [...new Map(uses.map((use) => [use.medicationId, use])).values()];
}

const painPalettes: Record<PresetPainPalette, PainScale> = {
  rose: ["#f9dbe7", "#f4bdd2", "#ec91b5", "#dc638f", "#aa3e70"],
  sunset: ["#fff0a9", "#ffd583", "#f9af8d", "#ed7da1", "#c74c87"],
  violet: ["#eee2f8", "#d9bce9", "#bd91d2", "#945fb3", "#673c80"],
};
const defaultCustomPainColors: PainScale = [
  "#e5f3f4",
  "#a8d7d6",
  "#6ab8b6",
  "#358887",
  "#1e5d68",
];
const defaultAppearance: AppearanceSettings = {
  painPalette: "rose",
  darkMode: false,
  customPainColors: defaultCustomPainColors,
};
const defaultSupportReminder: SupportReminder = {
  dismissedAt: "",
  disabled: false,
  startedAt: "",
};
const defaultAppLock: AppLockSettings = { enabled: false, salt: "", hash: "" };

function isPainScale(value: unknown): value is PainScale {
  return (
    Array.isArray(value) &&
    value.length === 5 &&
    value.every(
      (color) => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color),
    )
  );
}

function normalizeAppearance(value: unknown): AppearanceSettings {
  const source =
    value && typeof value === "object"
      ? (value as Partial<AppearanceSettings>)
      : {};
  const palette =
    source.painPalette === "rose" ||
    source.painPalette === "sunset" ||
    source.painPalette === "violet" ||
    source.painPalette === "custom"
      ? source.painPalette
      : source.painPalette === "berry" || source.painPalette === "fuchsia"
        ? "violet"
        : "rose";
  return {
    painPalette: palette,
    darkMode: source.darkMode === true,
    customPainColors: isPainScale(source.customPainColors)
      ? source.customPainColors
      : ([...defaultCustomPainColors] as PainScale),
  };
}

function paletteForAppearance(appearance: AppearanceSettings): PainScale {
  return appearance.painPalette === "custom"
    ? appearance.customPainColors
    : painPalettes[appearance.painPalette];
}

function painColor(intensity: number, palette: PainScale = painPalettes.rose) {
  const step = Math.max(
    0,
    Math.min(4, Math.ceil(Math.max(1, intensity) / 2) - 1),
  );
  return palette[step];
}

async function hashAppCode(code: string, salt: string) {
  const bytes = new TextEncoder().encode(`${salt}:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function KopfKlarMark() {
  return (
    <img className="kopfklar-logo" src="/kopfklar-logo.png" alt="KopfKlar" />
  );
}

const dmkgMonths: Record<string, number> = {
  Januar: 0,
  Februar: 1,
  März: 2,
  April: 3,
  Mai: 4,
  Juni: 5,
  Juli: 6,
  August: 7,
  September: 8,
  Oktober: 9,
  November: 10,
  Dezember: 11,
};
const dmkgLocationColumns: [number, number, string][] = [
  [126, 142, "Beidseitig"],
  [142, 156, "Einseitig"],
];
const dmkgCharacteristicColumns: [number, number, string][] = [
  [156, 170, "Pochend / pulsierend"],
  [170, 184, "Dumpf / drückend"],
];
const dmkgSymptomColumns: [number, number, string][] = [
  [184, 198, "Verstärkung bei körperlicher Aktivität"],
  [198, 212, "Übelkeit"],
  [212, 226, "Erbrechen"],
  [226, 240, "Lichtempfindlichkeit"],
  [240, 254, "Lärmempfindlichkeit"],
  [254, 268, "Geruchsempfindlichkeit"],
  [268, 282, "Schwindel"],
  [282, 296, "Konzentrationsstörungen"],
  [296, 310, "Müdigkeit / Erschöpfung"],
];
const dmkgImpactColumns: [number, number, string][] = [
  [322, 336, "Arbeit / Schule ausgefallen"],
  [336, 350, "Haushalt / Freizeit ausgefallen"],
  [350, 364, "Ambulant beim Arzt gewesen"],
  [364, 378, "In der Notaufnahme gewesen"],
  [378, 392, "Krankenhausaufenthalt über Nacht"],
];

function dmkgText(items: PdfTextItem[], from: number, to: number) {
  return items
    .filter((item) => item.transform[5] >= from && item.transform[5] < to)
    .sort((a, b) => a.transform[5] - b.transform[5])
    .map((item) => item.str)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
function dmkgMarked(items: PdfTextItem[], from: number, to: number) {
  return items.some(
    (item) =>
      item.transform[5] >= from &&
      item.transform[5] < to &&
      item.str.trim().toUpperCase() === "X",
  );
}
function dmkgMarkedValues(
  items: PdfTextItem[],
  columns: [number, number, string][],
) {
  return columns
    .filter(([from, to]) => dmkgMarked(items, from, to))
    .map(([, , label]) => label);
}
function dmkgDate(day: string, month: number, year: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${day.slice(0, 2)}`;
}
function dmkgMedicationId(name: string, dose: string) {
  return `dmkg-${`${name}-${dose}`
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}
function dmkgEffect(value: string): MedicationUse["effectiveness"] {
  return value.includes("++")
    ? "gut"
    : value.includes("+")
      ? "mittel"
      : "schlecht";
}

async function parseDmkgPdf(file: File): Promise<DmkgImport> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  const document = await loadingTask.promise;
  const entries = new Map<string, DayEntry>();
  const medications = new Map<string, Medication>();
  const detailNotes: {
    type: "general" | "preventive";
    date: string;
    text: string;
  }[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = (content.items as unknown[]).flatMap(
      (item): PdfTextItem[] => {
        if (
          !item ||
          typeof item !== "object" ||
          !("str" in item) ||
          !("transform" in item)
        )
          return [];
        const value = item as { str?: unknown; transform?: unknown };
        const transform = value.transform;
        return typeof value.str === "string" &&
          (Array.isArray(transform) || ArrayBuffer.isView(transform))
          ? [
              {
                str: value.str,
                transform: Array.from(transform as ArrayLike<number>),
              },
            ]
          : [];
      },
    );
    const pageText = items.map((item) => item.str).join(" ");
    const monthMatch = pageText.match(
      /\b(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+(\d{4})\b/,
    );

    if (pageText.includes("Schmerzdaten") && monthMatch) {
      const month = dmkgMonths[monthMatch[1]];
      const year = Number(monthMatch[2]);
      const dates = items.filter(
        (item) => item.transform[5] < 80 && /^\d{2}\.\d{2}\.$/.test(item.str),
      );
      dates.forEach((dateItem) => {
        const row = items.filter(
          (item) =>
            Math.abs(item.transform[4] - dateItem.transform[4]) < 2.5 &&
            item.transform[5] > 65,
        );
        const noHeadache = row.some((item) => item.str.includes("keine KS"));
        const intensityText = dmkgText(row, 76, 104);
        const intensity = Number(intensityText);
        if (!noHeadache && !intensityText) return;
        const key = dmkgDate(dateItem.str, month, year);
        const medicationName = dmkgText(row, 398, 508);
        const medicationDose = dmkgText(row, 508, 570);
        const medicationId = medicationName
          ? dmkgMedicationId(medicationName, medicationDose)
          : "";
        if (medicationName && !medications.has(medicationId))
          medications.set(medicationId, {
            id: medicationId,
            name: medicationName,
            dose: medicationDose,
            kind: "Akut",
          });
        entries.set(
          key,
          normalizeEntry({
            date: key,
            headache: !noHeadache,
            intensity: noHeadache ? 0 : Math.min(10, Math.max(0, intensity)),
            duration: noHeadache
              ? 0
              : Math.max(0, Number(dmkgText(row, 104, 126)) || 0),
            location: dmkgMarkedValues(row, dmkgLocationColumns),
            characteristics: dmkgMarkedValues(row, dmkgCharacteristicColumns),
            symptoms: dmkgMarkedValues(row, dmkgSymptomColumns),
            aura: dmkgMarked(row, 310, 322) ? ["Sehstörung"] : [],
            impacts: dmkgMarkedValues(row, dmkgImpactColumns),
            medications: medicationId
              ? [
                  {
                    medicationId,
                    effectiveness: dmkgEffect(dmkgText(row, 570, 610)),
                  },
                ]
              : [],
            generalComment: dmkgText(row, 610, 700),
            preventiveMedication: dmkgText(row, 700, 780),
            period: dmkgMarked(row, 780, 820),
          }),
        );
      });
    }

    const detailType = pageText.includes(
      "Kommentare zur vorbeugenden Medikation",
    )
      ? "preventive"
      : pageText.includes("Allgemeine Kommentare und")
        ? "general"
        : null;
    if (detailType) {
      items
        .filter(
          (item) =>
            item.transform[5] < 95 &&
            item.transform[4] > 100 &&
            item.transform[4] < 730 &&
            /^\d{2}\.\d{2}\.\d{4}$/.test(item.str),
        )
        .forEach((dateItem) => {
          const row = items
            .filter(
              (item) =>
                Math.abs(item.transform[4] - dateItem.transform[4]) < 2.5 &&
                item.transform[5] > 95,
            )
            .sort((a, b) => a.transform[5] - b.transform[5]);
          const [day, month, year] = dateItem.str.split(".");
          detailNotes.push({
            type: detailType,
            date: `${year}-${month}-${day}`,
            text: row
              .map((item) => item.str)
              .join(" ")
              .trim(),
          });
        });
    }
  }
  await loadingTask.destroy();

  detailNotes.forEach((note) => {
    const entry = entries.get(note.date);
    if (!entry || !note.text) return;
    if (note.type === "preventive") entry.preventiveMedication = note.text;
    else {
      const [comment, auraText] = note.text.split(/Aurasymptome:\s*/i);
      entry.generalComment = comment.replace(/[;,]\s*$/, "").trim();
      if (auraText)
        entry.aura = auraChoices.filter((choice) => auraText.includes(choice));
    }
  });
  if (!entries.size) throw new Error("Keine DMKG-Einträge erkannt");
  return {
    sourceName: file.name,
    entries: [...entries.values()].sort((a, b) => a.date.localeCompare(b.date)),
    medications: [...medications.values()],
  };
}

function prettyDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(
    activeLanguage === "en" ? "en-GB" : "de-DE",
    { day: "2-digit", month: "long", year: "numeric" },
  );
}
function monthName(date: Date) {
  return date.toLocaleDateString(activeLanguage === "en" ? "en-GB" : "de-DE", {
    month: "long",
    year: "numeric",
  });
}
function monthShort(date: Date) {
  return date
    .toLocaleDateString(activeLanguage === "en" ? "en-GB" : "de-DE", {
      month: "short",
      year: "2-digit",
    })
    .replace(".", "");
}
function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function toggle(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}
function daysAfter(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return dateId(date);
}
function daysBetween(first: string, second: string) {
  return Math.round(
    (new Date(`${second}T12:00:00`).getTime() -
      new Date(`${first}T12:00:00`).getTime()) /
      86_400_000,
  );
}
function lastMonths(count: number) {
  const now = new Date();
  return Array.from(
    { length: count },
    (_, index) =>
      new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1),
  );
}
function effectLabel(value: number) {
  return value >= 7 ? "gut" : value >= 4 ? "mittel" : "schlecht";
}
function effectColor(value: number) {
  const score = Math.max(1, Math.min(10, value));
  const hue =
    score <= 5 ? 2 + ((score - 1) / 4) * 48 : 50 + ((score - 5) / 5) * 95;
  const greenProgress = Math.max(0, (score - 5) / 5);
  return `hsl(${hue} ${92 - greenProgress * 40}% ${51 - greenProgress * 10}%)`;
}

function Pill({
  active,
  tone = "red",
  onClick,
  children,
}: {
  active: boolean;
  tone?: "red" | "blue";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`choice-pill ${active ? `active ${tone}` : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function Switch({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="yes-no">
      <button
        type="button"
        className={value === true ? "selected" : ""}
        onClick={() => onChange(true)}
      >
        Ja
      </button>
      <button
        type="button"
        className={value === false ? "selected no" : ""}
        onClick={() => onChange(false)}
      >
        Nein
      </button>
    </div>
  );
}

function YesNoRows({
  title,
  values,
  choices,
  onChange,
}: {
  title: string;
  values: string[];
  choices: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <section className="question-section">
      <div className="question-heading">
        <h3>{title}</h3>
        <div className="row-head">
          <span>Nein</span>
          <span>Ja</span>
        </div>
      </div>
      {choices.map((item) => (
        <div className="question-row" key={item}>
          <span>{item}</span>
          <button
            type="button"
            className={
              !values.includes(item) ? "radio-choice selected" : "radio-choice"
            }
            onClick={() => onChange(values.filter((value) => value !== item))}
            aria-label={`${item}: Nein`}
          />
          <button
            type="button"
            className={
              values.includes(item)
                ? "radio-choice selected yes"
                : "radio-choice"
            }
            onClick={() =>
              onChange(values.includes(item) ? values : [...values, item])
            }
            aria-label={`${item}: Ja`}
          />
        </div>
      ))}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function LineGraph({
  data,
  metric = "painDays",
}: {
  data: MonthlySummary[];
  metric?: "painDays" | "duration" | "intensity";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(260, rect.width);
      const height = 174;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(dpr, dpr);
      context.clearRect(0, 0, width, height);
      const padding = { top: 18, right: 12, bottom: 33, left: 24 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;
      const mainValue = (item: MonthlySummary) => Number(item[metric]) || 0;
      const showMedication = metric === "painDays";
      const maximum = Math.max(
        1,
        ...data.flatMap((item) =>
          showMedication
            ? [mainValue(item), item.medicationDays]
            : [mainValue(item)],
        ),
      );
      context.strokeStyle = "#dce7ee";
      context.lineWidth = 1;
      context.font = "10px DM Sans, Arial";
      context.fillStyle = "#6e8091";
      for (let index = 0; index <= 3; index += 1) {
        const y = padding.top + (chartHeight / 3) * index;
        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.stroke();
        context.fillText(
          String(Math.round(maximum - (maximum / 3) * index)),
          1,
          y + 3,
        );
      }
      if (!data.length) return;
      const pointFor = (value: number, index: number) => ({
        x:
          padding.left +
          (data.length === 1
            ? chartWidth / 2
            : (chartWidth / (data.length - 1)) * index),
        y: padding.top + chartHeight - (value / maximum) * chartHeight,
      });
      const painPoints = data.map((item, index) =>
        pointFor(mainValue(item), index),
      );
      const medicationPoints = data.map((item, index) =>
        pointFor(item.medicationDays, index),
      );
      const area = context.createLinearGradient(
        0,
        padding.top,
        0,
        padding.top + chartHeight,
      );
      const mainColor =
        metric === "painDays"
          ? "#e37ba7"
          : metric === "duration"
            ? "#4f64c6"
            : "#16344e";
      const mainArea =
        metric === "painDays"
          ? "rgba(227,123,167,.2)"
          : metric === "duration"
            ? "rgba(79,100,198,.16)"
            : "rgba(22,52,78,.14)";
      area.addColorStop(0, mainArea);
      area.addColorStop(1, "rgba(255,255,255,0)");
      context.beginPath();
      context.moveTo(painPoints[0].x, padding.top + chartHeight);
      painPoints.forEach((point) => context.lineTo(point.x, point.y));
      context.lineTo(
        painPoints[painPoints.length - 1].x,
        padding.top + chartHeight,
      );
      context.closePath();
      context.fillStyle = area;
      context.fill();
      const drawLine = (points: { x: number; y: number }[], color: string) => {
        context.beginPath();
        points.forEach((point, index) =>
          index === 0
            ? context.moveTo(point.x, point.y)
            : context.lineTo(point.x, point.y),
        );
        context.strokeStyle = color;
        context.lineWidth = 3;
        context.lineJoin = "round";
        context.stroke();
        points.forEach((point) => {
          context.beginPath();
          context.arc(point.x, point.y, 4.25, 0, Math.PI * 2);
          context.fillStyle = "#ffffff";
          context.fill();
          context.lineWidth = 2.5;
          context.strokeStyle = color;
          context.stroke();
        });
      };
      drawLine(painPoints, mainColor);
      if (showMedication) drawLine(medicationPoints, "#4f64c6");
      painPoints.forEach((point, index) => {
        context.fillStyle = "#6e8091";
        context.textAlign = "center";
        context.fillText(data[index].label.split(" ")[0], point.x, height - 10);
      });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [data]);
  const label =
    metric === "painDays"
      ? "Liniengraph für Kopfschmerz- und Medikationstage pro Monat"
      : metric === "duration"
        ? "Liniengraph für Kopfschmerzdauer pro Monat"
        : "Liniengraph für durchschnittliche Schmerzstärke pro Monat";
  return (
    <>
      <canvas
        ref={canvasRef}
        className="line-chart"
        aria-label={label}
        role="img"
      />
      {metric === "painDays" && (
        <div className="report-key line-key">
          <span>
            <i className="key-dot pain-line" />
            Kopfschmerztage
          </span>
          <span>
            <i className="key-dot medication-line" />
            Medikationstage
          </span>
        </div>
      )}
    </>
  );
}

export default function Home() {
  const today = dateId(new Date());
  const [screen, setScreen] = useState<Screen>("calendar");
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [medications, setMedications] =
    useState<Medication[]>(defaultMedications);
  const [triggers, setTriggers] = useState<string[]>(defaultTriggers);
  const [therapies, setTherapies] = useState<Therapy[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [draft, setDraft] = useState<DayEntry>(() => blankEntry(today));
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState("");
  const [manageBack, setManageBack] = useState<Screen>("settings");
  const [newMedication, setNewMedication] = useState({
    name: "",
    dose: "",
    kind: "Akut" as MedicationKind,
  });
  const [newTrigger, setNewTrigger] = useState("");
  const [newTherapy, setNewTherapy] = useState({ name: "", durationWeeks: 12 });
  const [reminders, setReminders] = useState<ReminderSettings>({
    enabled: false,
    time: "20:00",
    lastSent: "",
  });
  const [backupSettings, setBackupSettings] = useState<BackupSettings>(
    defaultBackupSettings,
  );
  const [backupReminderDue, setBackupReminderDue] = useState(false);
  const [language, setLanguage] = useState<Language>("de");
  const [visiblePainFields, setVisiblePainFields] = useState<PainFieldSettings>(
    () => defaultPainFieldSettings(),
  );
  const [expandedPainSections, setExpandedPainSections] = useState<
    PainSectionId[]
  >([]);
  const [showMorePainSections, setShowMorePainSections] = useState(false);
  const [cycleSettings, setCycleSettings] = useState<CycleSettings>({
    enabled: true,
  });
  const [appearance, setAppearance] =
    useState<AppearanceSettings>(defaultAppearance);
  const [supportReminder, setSupportReminder] = useState<SupportReminder>(
    defaultSupportReminder,
  );
  const [appLock, setAppLock] = useState<AppLockSettings>(defaultAppLock);
  const [lockVisible, setLockVisible] = useState(false);
  const [enteredCode, setEnteredCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newCodeRepeat, setNewCodeRepeat] = useState("");
  const [lockError, setLockError] = useState("");
  const [supportPromptVisible, setSupportPromptVisible] = useState(false);
  const [appearanceTab, setAppearanceTab] = useState<"design" | "about">(
    "design",
  );
  const [setupComplete, setSetupComplete] = useState(true);
  const [setupCycleEnabled, setSetupCycleEnabled] = useState(true);
  const [setupStep, setSetupStep] = useState<0 | 1 | 2>(0);
  const [tutorialPage, setTutorialPage] = useState<0 | 1 | 2 | 3>(0);
  const [calendarFilters, setCalendarFilters] = useState<EntryFilter[]>([]);
  const [statisticsFilters, setStatisticsFilters] = useState<EntryFilter[]>([]);
  const [selectedTriggerAnalysis, setSelectedTriggerAnalysis] = useState<
    string | null
  >(null);
  const [dmkgImport, setDmkgImport] = useState<DmkgImport | null>(null);
  const [isReadingDmkg, setIsReadingDmkg] = useState(false);
  const dmkgFileInput = useRef<HTMLInputElement>(null);
  const backupFileInput = useRef<HTMLInputElement>(null);
  const setupBackupFileInput = useRef<HTMLInputElement>(null);
  const screenRef = useRef<Screen>("calendar");
  const navigationRef = useRef<NavigationPoint[]>([]);
  activeLanguage = language;

  useEffect(() => {
    try {
      const savedEntries = window.localStorage.getItem(ENTRIES_KEY);
      const savedMedications = window.localStorage.getItem(MEDICATIONS_KEY);
      const savedTriggers = window.localStorage.getItem(TRIGGERS_KEY);
      const savedTherapies = window.localStorage.getItem(THERAPIES_KEY);
      const savedReminders = window.localStorage.getItem(REMINDERS_KEY);
      const savedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
      const savedPainSections = window.localStorage.getItem(PAIN_SECTIONS_KEY);
      const savedPainFields = window.localStorage.getItem(
        PAIN_FIELD_SETTINGS_KEY,
      );
      const savedCycleSettings =
        window.localStorage.getItem(CYCLE_SETTINGS_KEY);
      const savedBackupSettings =
        window.localStorage.getItem(BACKUP_SETTINGS_KEY);
      const savedAppearance = window.localStorage.getItem(APPEARANCE_KEY);
      const savedSupportReminder =
        window.localStorage.getItem(SUPPORT_REMINDER_KEY);
      const savedAppLock = window.localStorage.getItem(APP_LOCK_KEY);
      const savedSetup = window.localStorage.getItem(SETUP_COMPLETE_KEY);
      const factoryResetPending =
        window.localStorage.getItem(FACTORY_RESET_PENDING_KEY) === "pending";
      if (savedEntries)
        setEntries(
          (JSON.parse(savedEntries) as DayEntry[]).map(normalizeEntry),
        );
      else {
        const legacy = window.localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          const old = JSON.parse(legacy) as {
            date: string;
            intensity: number;
            triggers?: string[];
            symptoms?: string[];
            medication?: string;
            note?: string;
          }[];
          setEntries(
            old.map((item) =>
              normalizeEntry({
                date: item.date,
                headache: item.intensity > 0,
                intensity: item.intensity,
                triggers: item.triggers,
                symptoms: item.symptoms,
                generalComment: item.note,
                preventiveMedication: item.medication,
              }),
            ),
          );
        }
      }
      if (savedMedications)
        setMedications(
          (JSON.parse(savedMedications) as Medication[]).map((item) => ({
            ...item,
            kind:
              item.kind === "Alternative"
                ? "Alternative"
                : item.kind === "Präventiv"
                  ? "Präventiv"
                  : "Akut",
          })),
        );
      let restoredTriggers = defaultTriggers;
      if (savedTriggers) {
        restoredTriggers = JSON.parse(savedTriggers) as string[];
        setTriggers(restoredTriggers);
      }
      if (savedTherapies) setTherapies(JSON.parse(savedTherapies) as Therapy[]);
      if (savedReminders)
        setReminders({
          enabled: false,
          time: "20:00",
          lastSent: "",
          ...(JSON.parse(savedReminders) as Partial<ReminderSettings>),
        });
      if (savedLanguage === "en" || savedLanguage === "de")
        setLanguage(savedLanguage);
      const legacySections =
        savedPainSections && Array.isArray(JSON.parse(savedPainSections))
          ? (JSON.parse(savedPainSections) as unknown[]).filter(
              (value): value is PainSectionId =>
                typeof value === "string" &&
                painSectionDefinitions.some((section) => section.id === value),
            )
          : defaultPainSections;
      setVisiblePainFields(
        normalizePainFieldSettings(
          savedPainFields ? JSON.parse(savedPainFields) : undefined,
          legacySections,
        ),
      );
      const restoredCycleSettings = savedCycleSettings
        ? {
            enabled: true,
            ...(JSON.parse(savedCycleSettings) as Partial<CycleSettings>),
          }
        : { enabled: true };
      setCycleSettings(restoredCycleSettings);
      if (savedAppearance) {
        setAppearance(normalizeAppearance(JSON.parse(savedAppearance)));
      }
      if (savedSupportReminder) {
        const storedSupportReminder = JSON.parse(
          savedSupportReminder,
        ) as Partial<SupportReminder>;
        setSupportReminder({
          dismissedAt:
            typeof storedSupportReminder.dismissedAt === "string"
              ? storedSupportReminder.dismissedAt
              : "",
          disabled: storedSupportReminder.disabled === true,
          startedAt:
            typeof storedSupportReminder.startedAt === "string"
              ? storedSupportReminder.startedAt
              : "",
        });
      }
      if (savedAppLock) {
        const storedAppLock = JSON.parse(
          savedAppLock,
        ) as Partial<AppLockSettings>;
        setAppLock({
          enabled:
            storedAppLock.enabled === true &&
            typeof storedAppLock.salt === "string" &&
            typeof storedAppLock.hash === "string",
          salt:
            typeof storedAppLock.salt === "string" ? storedAppLock.salt : "",
          hash:
            typeof storedAppLock.hash === "string" ? storedAppLock.hash : "",
        });
      }
      setSetupCycleEnabled(restoredCycleSettings.enabled);
      if (savedBackupSettings) {
        const storedBackup = JSON.parse(
          savedBackupSettings,
        ) as Partial<BackupSettings>;
        const storedInterval = Math.max(
          1,
          Math.min(52, Number(storedBackup.intervalWeeks) || 1),
        );
        const useWeeklyDefault =
          storedBackup.enabled !== true &&
          !storedBackup.lastBackupDate &&
          !storedBackup.lastPromptDate;
        setBackupSettings({
          ...defaultBackupSettings,
          ...storedBackup,
          intervalWeeks: useWeeklyDefault ? 1 : storedInterval,
        });
      }
      const establishedInstall = Boolean(
        savedEntries ||
          savedMedications ||
          savedTriggers ||
          savedLanguage ||
          savedCycleSettings,
      );
      if (!factoryResetPending && establishedInstall && savedSetup !== "done")
        window.localStorage.setItem(SETUP_COMPLETE_KEY, "done");
      setSetupComplete(
        !factoryResetPending && (savedSetup === "done" || establishedInstall),
      );
    } catch {
      setNotice("Gespeicherte Daten konnten nicht gelesen werden.");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated)
      window.localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  }, [entries, hydrated]);
  useEffect(() => {
    if (hydrated)
      window.localStorage.setItem(MEDICATIONS_KEY, JSON.stringify(medications));
  }, [medications, hydrated]);
  useEffect(() => {
    if (hydrated)
      window.localStorage.setItem(TRIGGERS_KEY, JSON.stringify(triggers));
  }, [triggers, hydrated]);
  useEffect(() => {
    if (hydrated)
      window.localStorage.setItem(THERAPIES_KEY, JSON.stringify(therapies));
  }, [therapies, hydrated]);
  useEffect(() => {
    if (hydrated)
      window.localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
  }, [reminders, hydrated]);
  useEffect(() => {
    if (hydrated) window.localStorage.setItem(LANGUAGE_KEY, language);
  }, [language, hydrated]);
  useEffect(() => {
    if (hydrated)
      window.localStorage.setItem(
        PAIN_FIELD_SETTINGS_KEY,
        JSON.stringify(visiblePainFields),
      );
  }, [visiblePainFields, hydrated]);
  useEffect(() => {
    if (hydrated)
      window.localStorage.setItem(
        CYCLE_SETTINGS_KEY,
        JSON.stringify(cycleSettings),
      );
  }, [cycleSettings, hydrated]);
  useEffect(() => {
    if (hydrated)
      window.localStorage.setItem(
        BACKUP_SETTINGS_KEY,
        JSON.stringify(backupSettings),
      );
  }, [backupSettings, hydrated]);
  useEffect(() => {
    if (hydrated)
      window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
  }, [appearance, hydrated]);
  useEffect(() => {
    if (hydrated)
      window.localStorage.setItem(
        SUPPORT_REMINDER_KEY,
        JSON.stringify(supportReminder),
      );
  }, [supportReminder, hydrated]);
  useEffect(() => {
    if (hydrated)
      window.localStorage.setItem(APP_LOCK_KEY, JSON.stringify(appLock));
  }, [appLock, hydrated]);
  useEffect(() => {
    document.documentElement.dataset.theme = appearance.darkMode
      ? "dark"
      : "light";
  }, [appearance.darkMode]);
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);
  useEffect(() => {
    if (
      !setupComplete &&
      setupStep === 1 &&
      tutorialPage === 2 &&
      screen === "statistics"
    )
      setTutorialPage(3);
  }, [screen, setupComplete, setupStep, tutorialPage]);
  useEffect(() => {
    window.history.replaceState({ kopfklar: true }, "");
    window.history.pushState({ kopfklar: true }, "");
    const handleBack = () => goBack();
    const handleBrowserBack = () => {
      goBack();
      window.history.pushState({ kopfklar: true }, "");
    };
    window.addEventListener("kopfklar-back", handleBack);
    window.addEventListener("popstate", handleBrowserBack);
    return () => {
      window.removeEventListener("kopfklar-back", handleBack);
      window.removeEventListener("popstate", handleBrowserBack);
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title =
      language === "en"
        ? "KopfKlar – Your headache diary"
        : "KopfKlar – Dein Kopfschmerzkalender";
    const root = document.querySelector(".app-shell");
    if (!root) return;
    const translate = (value: string) => translateUiText(value, language);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let node = walker.nextNode();
    while (node) {
      nodes.push(node as Text);
      node = walker.nextNode();
    }
    nodes.forEach((textNode) => {
      const original = textNode.nodeValue ?? "";
      const trimmed = original.trim();
      if (!trimmed) return;
      const translated = translate(trimmed);
      if (translated !== trimmed)
        textNode.nodeValue = original.replace(trimmed, translated);
    });
    root
      .querySelectorAll<HTMLElement>("[aria-label], [placeholder]")
      .forEach((element) => {
        ["aria-label", "placeholder"].forEach((attribute) => {
          const original = element.getAttribute(attribute);
          if (!original) return;
          const translated = translate(original);
          if (translated !== original)
            element.setAttribute(attribute, translated);
        });
      });
  });
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (
      !reminders.enabled ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    )
      return;
    const checkReminder = async () => {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const currentDate = dateId(now);
      if (time !== reminders.time || reminders.lastSent === currentDate) return;
      const registration =
        "serviceWorker" in navigator
          ? await navigator.serviceWorker.ready
          : undefined;
      if (registration)
        await registration.showNotification("KopfKlar", {
          body: "Wie ging es dir heute? Nimm dir einen Moment für deinen Kalendereintrag.",
          tag: "kopfklar-taegliche-erinnerung",
        });
      else
        new Notification("KopfKlar", {
          body: "Wie ging es dir heute? Nimm dir einen Moment für deinen Kalendereintrag.",
        });
      setReminders((current) => ({ ...current, lastSent: currentDate }));
    };
    void checkReminder();
    const timer = window.setInterval(() => {
      void checkReminder();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [reminders]);
  useEffect(() => {
    if (!hydrated || !setupComplete || supportReminder.disabled) {
      setSupportPromptVisible(false);
      return;
    }
    if (!supportReminder.startedAt) {
      setSupportReminder((current) =>
        current.startedAt ? current : { ...current, startedAt: today },
      );
      setSupportPromptVisible(false);
      return;
    }
    const firstPromptDue =
      !supportReminder.dismissedAt &&
      daysBetween(supportReminder.startedAt, today) >= 21;
    const nextPromptDue =
      Boolean(supportReminder.dismissedAt) &&
      daysBetween(supportReminder.dismissedAt, today) >= 30;
    setSupportPromptVisible(firstPromptDue || nextPromptDue);
  }, [
    hydrated,
    setupComplete,
    supportReminder.disabled,
    supportReminder.dismissedAt,
    supportReminder.startedAt,
    today,
  ]);
  useEffect(() => {
    if (!hydrated || !Capacitor.isNativePlatform()) return;
    let active = true;
    let listener: { remove: () => Promise<void> } | undefined;
    void LocalNotifications.addListener(
      "localNotificationActionPerformed",
      ({ actionId }) => {
        if (actionId === QUICK_NO_HEADACHE_ACTION) recordQuickNoHeadache();
        if (actionId === QUICK_HEADACHE_ACTION) openQuickPainEntry();
      },
    ).then((registeredListener) => {
      if (active) listener = registeredListener;
      else void registeredListener.remove();
    });
    return () => {
      active = false;
      if (listener) void listener.remove();
    };
  }, [hydrated, today]);
  useEffect(() => {
    if (!hydrated || !appLock.enabled) {
      setLockVisible(false);
      return;
    }
    setLockVisible(true);
    const lockOnReturn = () => {
      if (document.visibilityState === "visible") setLockVisible(true);
    };
    document.addEventListener("visibilitychange", lockOnReturn);
    return () => document.removeEventListener("visibilitychange", lockOnReturn);
  }, [appLock.enabled, hydrated]);
  useEffect(() => {
    if (!hydrated || !backupSettings.enabled) {
      setBackupReminderDue(false);
      return;
    }
    const reference = [
      backupSettings.lastBackupDate,
      backupSettings.lastPromptDate,
    ]
      .filter(Boolean)
      .sort()
      .at(-1);
    const due =
      !reference ||
      daysBetween(reference, today) >= backupSettings.intervalWeeks * 7;
    setBackupReminderDue(due);
    if (due) {
      setNotice(
        "Zeit für ein KopfKlar-Backup. Sichere deine Daten in den Einstellungen.",
      );
      setBackupSettings((current) =>
        current.lastPromptDate === today
          ? current
          : { ...current, lastPromptDate: today },
      );
      window.setTimeout(() => setNotice(""), 5200);
    }
  }, [
    backupSettings.enabled,
    backupSettings.intervalWeeks,
    backupSettings.lastBackupDate,
    backupSettings.lastPromptDate,
    hydrated,
    today,
  ]);

  const entryByDate = useMemo(
    () => new Map(entries.map((entry) => [entry.date, entry])),
    [entries],
  );
  const medicationById = useMemo(
    () => new Map(medications.map((medication) => [medication.id, medication])),
    [medications],
  );
  const painEntries = useMemo(
    () => entries.filter((entry) => entry.headache),
    [entries],
  );
  const currentMonthEntries = useMemo(
    () => entries.filter((entry) => entry.date.startsWith(monthKey(month))),
    [entries, month],
  );
  const entryFilterOptions: {
    id: EntryFilter;
    label: string;
    symbol: string;
  }[] = [
    { id: "documented", label: "Dokumentiert", symbol: "•" },
    { id: "pain", label: "Kopfschmerzen", symbol: "●" },
    { id: "free", label: "Ohne Kopfschmerzen", symbol: "○" },
    { id: "medication", label: "Mit Medikation", symbol: "▰" },
    { id: "acute", label: "Akut", symbol: "▰" },
    { id: "alternative", label: "Alternativ", symbol: "▱" },
    { id: "preventive", label: "Präventiv", symbol: "▯" },
    { id: "trigger", label: "Mit Triggern", symbol: "✦" },
    { id: "therapy", label: "Therapie", symbol: "★" },
    ...(cycleSettings.enabled
      ? [{ id: "period" as EntryFilter, label: "Periode", symbol: "◯" }]
      : []),
    { id: "high-intensity", label: "Stark (7–10)", symbol: "↑" },
    { id: "long-duration", label: "Lang (ab 8 h)", symbol: "◷" },
  ];
  function entryMatchesFilters(
    entry: DayEntry | undefined,
    filters: EntryFilter[],
  ) {
    if (!filters.length) return true;
    const medicationsForEntry =
      entry?.medications
        .map((use) => medicationById.get(use.medicationId))
        .filter((item): item is Medication => Boolean(item)) ?? [];
    return filters.every((filter) => {
      if (filter === "documented") return Boolean(entry);
      if (filter === "pain") return entry?.headache === true;
      if (filter === "free") return entry?.headache === false;
      if (filter === "medication") return medicationsForEntry.length > 0;
      if (filter === "acute")
        return medicationsForEntry.some(
          (medication) => medication.kind === "Akut",
        );
      if (filter === "alternative")
        return medicationsForEntry.some(
          (medication) => medication.kind === "Alternative",
        );
      if (filter === "preventive")
        return medicationsForEntry.some(
          (medication) => medication.kind === "Präventiv",
        );
      if (filter === "trigger") return Boolean(entry?.triggers.length);
      if (filter === "therapy") return Boolean(entry?.therapies.length);
      if (filter === "period")
        return cycleSettings.enabled && entry?.period === true;
      if (filter === "high-intensity")
        return entry?.headache === true && entry.intensity >= 7;
      return entry?.headache === true && entry.duration >= 8;
    });
  }
  const statisticsEntries = useMemo(
    () =>
      currentMonthEntries.filter((entry) =>
        entryMatchesFilters(entry, statisticsFilters),
      ),
    [
      currentMonthEntries,
      statisticsFilters,
      medicationById,
      cycleSettings.enabled,
    ],
  );
  const calendarMonthPain = currentMonthEntries.filter(
    (entry) => entry.headache,
  );
  const calendarMedicationDays = currentMonthEntries.filter(
    (entry) => entry.medications.length > 0,
  ).length;
  const currentMonthPain = statisticsEntries.filter((entry) => entry.headache);
  const triggerEntries = useMemo(
    () => statisticsEntries.filter((entry) => entry.triggers.length > 0),
    [statisticsEntries],
  );
  const triggerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    statisticsEntries.forEach((entry) =>
      entry.triggers
        .filter((trigger) => cycleSettings.enabled || trigger !== "Zyklus")
        .forEach((trigger) =>
          counts.set(trigger, (counts.get(trigger) ?? 0) + 1),
        ),
    );
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [statisticsEntries, cycleSettings.enabled]);
  const triggerAnalyses = useMemo(() => {
    const documentedDays = statisticsEntries.filter(
      (entry) => entry.headache !== null,
    );
    const baselinePainRate = documentedDays.length
      ? documentedDays.filter((entry) => entry.headache).length /
        documentedDays.length
      : null;
    return triggerCounts.map(([trigger, recordedDays]) => {
      const triggerDays = statisticsEntries.filter((entry) =>
        entry.triggers.includes(trigger),
      );
      const documentedTriggerDays = triggerDays.filter(
        (entry) => entry.headache !== null,
      );
      const headacheDays = documentedTriggerDays.filter(
        (entry) => entry.headache,
      );
      const noHeadacheDays = documentedTriggerDays.filter(
        (entry) => entry.headache === false,
      );
      const painRate = documentedTriggerDays.length
        ? headacheDays.length / documentedTriggerDays.length
        : null;
      return {
        trigger,
        recordedDays,
        documentedDays: documentedTriggerDays.length,
        headacheDays: headacheDays.length,
        noHeadacheDays: noHeadacheDays.length,
        painRate,
        comparedToBaseline:
          painRate === null || baselinePainRate === null
            ? null
            : painRate - baselinePainRate,
        averageIntensity: headacheDays.length
          ? Math.round(
              (headacheDays.reduce(
                (total, entry) => total + entry.intensity,
                0,
              ) /
                headacheDays.length) *
                10,
            ) / 10
          : null,
        averageDuration: headacheDays.length
          ? Math.round(
              (headacheDays.reduce(
                (total, entry) => total + entry.duration,
                0,
              ) /
                headacheDays.length) *
                10,
            ) / 10
          : null,
        medicationDays: headacheDays.filter(
          (entry) => entry.medications.length > 0,
        ).length,
      };
    });
  }, [statisticsEntries, triggerCounts]);
  const activeTriggerAnalysis =
    triggerAnalyses.find((item) => item.trigger === selectedTriggerAnalysis) ??
    triggerAnalyses[0] ??
    null;
  const averageIntensity = currentMonthPain.length
    ? Math.round(
        (currentMonthPain.reduce((total, entry) => total + entry.intensity, 0) /
          currentMonthPain.length) *
          10,
      ) / 10
    : 0;
  const medicationDays = statisticsEntries.filter(
    (entry) => entry.medications.length > 0,
  ).length;
  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const number = index - offset + 1;
      if (number < 1 || number > days) return null;
      const key = dateId(
        new Date(month.getFullYear(), month.getMonth(), number),
      );
      return { number, key, entry: entryByDate.get(key) };
    });
  }, [entryByDate, month]);

  const monthly12 = useMemo(
    () => lastMonths(12).map((date) => summaryForMonth(date)),
    [entries, medicationById],
  );
  const monthly24 = useMemo(
    () => lastMonths(12).map((date) => summaryForMonth(date)),
    [entries, medicationById],
  );
  const lastThreeMedicationShares = useMemo(() => {
    const allowedMonths = new Set(lastMonths(3).map(monthKey));
    const values = new Map<
      string,
      { name: string; kind: MedicationKind; count: number; effectTotal: number }
    >();
    const score = { schlecht: 1, mittel: 5, gut: 10 } as const;
    entries
      .filter((entry) => allowedMonths.has(entry.date.slice(0, 7)))
      .forEach((entry) =>
        entry.medications.forEach((use) => {
          const medication = medicationById.get(use.medicationId);
          if (!medication || medication.kind === "Präventiv") return;
          const current = values.get(medication.id) ?? {
            name: medication.name,
            kind: medication.kind,
            count: 0,
            effectTotal: 0,
          };
          current.count += 1;
          current.effectTotal += score[use.effectiveness];
          values.set(medication.id, current);
        }),
      );
    const total = [...values.values()].reduce(
      (sum, item) => sum + item.count,
      0,
    );
    return [...values.values()]
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        ...item,
        percent: total ? Math.round((item.count / total) * 100) : 0,
        averageEffect: Math.round((item.effectTotal / item.count) * 10) / 10,
      }));
  }, [entries, medicationById]);
  const therapyResults = useMemo(
    () =>
      therapies.map((therapy) => {
        const starts = entries
          .filter((entry) => entry.therapies.includes(therapy.id))
          .sort((a, b) => b.date.localeCompare(a.date));
        const start = starts[0];
        if (!start)
          return { therapy, start: null, during: 0, before: 0, end: null };
        const duration = Math.max(1, therapy.durationWeeks * 7);
        const end = daysAfter(start.date, duration - 1);
        const beforeStart = daysAfter(start.date, -duration);
        return {
          therapy,
          start: start.date,
          end,
          during: painEntries.filter(
            (entry) => entry.date >= start.date && entry.date <= end,
          ).length,
          before: painEntries.filter(
            (entry) => entry.date >= beforeStart && entry.date < start.date,
          ).length,
        };
      }),
    [therapies, entries, painEntries],
  );
  const periodStarts = useMemo(() => {
    if (!cycleSettings.enabled) return [];
    const recorded = [...entries]
      .filter((entry) => entry.period)
      .sort((a, b) => a.date.localeCompare(b.date));
    return recorded.reduce<string[]>(
      (starts, entry) =>
        !starts.length || daysBetween(starts[starts.length - 1], entry.date) > 7
          ? [...starts, entry.date]
          : starts,
      [],
    );
  }, [entries, cycleSettings.enabled]);
  const estimatedCycleLength = useMemo(() => {
    const intervals = periodStarts
      .slice(1)
      .map((start, index) => daysBetween(periodStarts[index], start))
      .filter((days) => days >= 21 && days <= 40);
    return intervals.length
      ? Math.round(
          intervals.reduce((sum, days) => sum + days, 0) / intervals.length,
        )
      : 28;
  }, [periodStarts]);
  function cyclePhaseFor(date: string) {
    if (entryByDate.get(date)?.period) return "Menstruation";
    const start = [...periodStarts].reverse().find((value) => value <= date);
    if (!start) return "Unbekannt";
    const cycleDay = daysBetween(start, date) + 1;
    if (cycleDay <= 5) return "Menstruation";
    if (cycleDay > estimatedCycleLength) return "Unbekannt";
    const ovulationDay = Math.max(12, estimatedCycleLength - 14);
    if (Math.abs(cycleDay - ovulationDay) <= 1) return "Eisprung";
    return cycleDay < ovulationDay ? "Follikelphase" : "Lutealphase";
  }
  function isEstimatedPeriodDay(date: string) {
    const latestStart = periodStarts[periodStarts.length - 1];
    if (!latestStart || entryByDate.get(date)?.period) return false;
    const distance = daysBetween(latestStart, date);
    return distance >= 0 && distance % estimatedCycleLength < 5;
  }
  function isEstimatedOvulationDay(date: string) {
    const latestStart = periodStarts[periodStarts.length - 1];
    if (
      !latestStart ||
      entryByDate.get(date)?.period ||
      isEstimatedPeriodDay(date)
    )
      return false;
    const distance = daysBetween(latestStart, date);
    const cycleDay = (distance % estimatedCycleLength) + 1;
    return (
      distance >= 0 && cycleDay === Math.max(12, estimatedCycleLength - 14)
    );
  }
  const phaseStats = useMemo(
    () =>
      ["Menstruation", "Follikelphase", "Eisprung", "Lutealphase"].map(
        (phase) => ({
          phase,
          painDays: painEntries.filter(
            (entry) => cyclePhaseFor(entry.date) === phase,
          ).length,
          recordedDays: entries.filter(
            (entry) => cyclePhaseFor(entry.date) === phase,
          ).length,
        }),
      ),
    [entries, painEntries, periodStarts, estimatedCycleLength],
  );
  const latestPeriodStart = periodStarts[periodStarts.length - 1];

  function summaryForMonth(date: Date): MonthlySummary {
    const selected = entries.filter((entry) =>
      entry.date.startsWith(monthKey(date)),
    );
    const pain = selected.filter((entry) => entry.headache);
    const acuteUses = selected
      .flatMap((entry) => entry.medications)
      .filter(
        (use) => medicationById.get(use.medicationId)?.kind === "Akut",
      ).length;
    const alternativeUses = selected
      .flatMap((entry) => entry.medications)
      .filter(
        (use) => medicationById.get(use.medicationId)?.kind === "Alternative",
      ).length;
    return {
      date,
      label: monthShort(date),
      painDays: pain.length,
      medicationDays: selected.filter((entry) => entry.medications.length > 0)
        .length,
      acuteUses,
      alternativeUses,
      duration: pain.reduce((total, entry) => total + entry.duration, 0),
      intensity: pain.length
        ? Math.round(
            (pain.reduce((total, entry) => total + entry.intensity, 0) /
              pain.length) *
              10,
          ) / 10
        : null,
      unableToWork: pain.filter((entry) => entry.impacts.includes(workImpact))
        .length,
    };
  }
  function restoreScroll(scrollY: number) {
    window.requestAnimationFrame(() =>
      window.scrollTo({ top: scrollY, behavior: "auto" }),
    );
  }
  function goTo(
    next: Screen,
    options: { reset?: boolean; scrollY?: number } = {},
  ) {
    const current = screenRef.current;
    if (next === current) {
      restoreScroll(options.scrollY ?? 0);
      return;
    }
    if (options.reset) navigationRef.current = [];
    else
      navigationRef.current.push({ screen: current, scrollY: window.scrollY });
    screenRef.current = next;
    setScreen(next);
    restoreScroll(options.scrollY ?? 0);
  }
  function goBack(fallback: Screen = "calendar") {
    const previous = navigationRef.current.pop();
    if (previous) {
      screenRef.current = previous.screen;
      setScreen(previous.screen);
      restoreScroll(previous.scrollY);
      return;
    }
    screenRef.current = fallback;
    setScreen(fallback);
    restoreScroll(0);
  }
  function toggleEntryFilter(
    filter: EntryFilter,
    target: "calendar" | "statistics",
  ) {
    const setFilters =
      target === "calendar" ? setCalendarFilters : setStatisticsFilters;
    setFilters((current) =>
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter],
    );
    if (target === "statistics") setSelectedTriggerAnalysis(null);
  }
  function filterSummary(filters: EntryFilter[]) {
    if (!filters.length) return "Alle Tage";
    return filters
      .map(
        (filter) =>
          entryFilterOptions.find((option) => option.id === filter)?.label ??
          filter,
      )
      .join(" · ");
  }
  function showTutorialStep(page: 0 | 1 | 2 | 3) {
    setTutorialPage(page);
    if (page === 0) {
      goTo("calendar", { reset: true });
      return;
    }
    if (page === 1) {
      const entry = blankEntry(today);
      setSelectedDate(today);
      setDraft(entry);
      goTo("day", { reset: true });
      return;
    }
    if (page === 2) {
      const entry = { ...blankEntry(today), headache: true };
      setSelectedDate(today);
      setDraft(entry);
      setShowMorePainSections(false);
      goTo("pain", { reset: true });
      return;
    }
    goTo("statistics", { reset: true });
  }
  function updateDraft(patch: Partial<DayEntry>) {
    setDraft((current) => ({ ...current, ...patch }));
  }
  function openDay(value: string) {
    setSelectedDate(value);
    setDraft(entryByDate.get(value) ?? blankEntry(value));
    if (!setupComplete && setupStep === 1 && tutorialPage === 0) {
      showTutorialStep(1);
      return;
    }
    goTo("day");
  }
  function chooseHeadache(value: boolean) {
    updateDraft({ headache: value });
    if (value) {
      setShowMorePainSections(false);
      if (!setupComplete && setupStep === 1 && tutorialPage === 1) {
        showTutorialStep(2);
        return;
      }
      goTo("pain");
    }
  }
  function recordQuickNoHeadache() {
    const entry = {
      ...(entryByDate.get(today) ?? blankEntry(today)),
      headache: false,
    };
    setEntries((current) => [
      ...current.filter((item) => item.date !== today),
      entry,
    ]);
    setSelectedDate(today);
    setDraft(entry);
    setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    goTo("calendar", { reset: true });
    setNotice("Heute als kopfschmerzfrei eingetragen.");
    window.setTimeout(() => setNotice(""), 3200);
  }
  function openQuickPainEntry() {
    const entry = {
      ...(entryByDate.get(today) ?? blankEntry(today)),
      headache: true,
    };
    setSelectedDate(today);
    setDraft(entry);
    setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    setShowMorePainSections(false);
    goTo("pain", { reset: true });
    setNotice("Schmerzangaben für heute geöffnet.");
    window.setTimeout(() => setNotice(""), 3200);
  }
  function saveDay(next: Screen = "calendar") {
    setEntries((current) => [
      ...current.filter((entry) => entry.date !== draft.date),
      draft,
    ]);
    setNotice("Der Tag wurde auf diesem Gerät gespeichert.");
    goTo(next, { reset: next === "calendar" });
    window.setTimeout(() => setNotice(""), 3000);
  }
  function toggleMedication(id: string) {
    updateDraft({
      medications: draft.medications.some((item) => item.medicationId === id)
        ? draft.medications.filter((item) => item.medicationId !== id)
        : [...draft.medications, { medicationId: id, effectiveness: "mittel" }],
    });
  }
  function setEffect(
    id: string,
    effectiveness: MedicationUse["effectiveness"],
  ) {
    updateDraft({
      medications: draft.medications.map((item) =>
        item.medicationId === id ? { ...item, effectiveness } : item,
      ),
    });
  }
  function exportCsv() {
    const rows = [
      [
        "Datum",
        "Kopfschmerzen",
        "Stärke",
        "Dauer Stunden",
        "Trigger",
        "Schmerzmittel",
        "Alternative Medikation",
        "Therapien",
        "Arbeitsunfähigkeit",
        "Kommentar",
      ],
      ...entries
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((entry) => [
          entry.date,
          entry.headache ? "Ja" : "Nein",
          entry.headache ? String(entry.intensity) : "",
          entry.headache ? String(entry.duration) : "",
          entry.triggers.join(" | "),
          entry.medications
            .map((use) => medicationById.get(use.medicationId))
            .filter((medication) => medication?.kind === "Akut")
            .map((medication) => medication?.name ?? "")
            .join(" | "),
          entry.medications
            .map((use) => medicationById.get(use.medicationId))
            .filter((medication) => medication?.kind === "Alternative")
            .map((medication) => medication?.name ?? "")
            .join(" | "),
          entry.therapies
            .map(
              (id) =>
                therapies.find((therapy) => therapy.id === id)?.name ?? "",
            )
            .filter(Boolean)
            .join(" | "),
          entry.impacts.includes(workImpact) ? "Ja" : "Nein",
          [entry.dayComment, entry.generalComment].filter(Boolean).join(" · "),
        ]),
    ];
    const content = rows
      .map((row) =>
        row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";"),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `kopfklar-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function exportBackup() {
    const payload: BackupPayload = {
      format: "kopfklar-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        entries,
        medications,
        triggers,
        therapies,
        reminders,
        backupSettings,
        language,
        cycleSettings,
        painFieldSettings: visiblePainFields,
        appearance,
        appLock,
      },
    };
    const serialized = JSON.stringify(payload, null, 2);
    const fileName = `kopfklar-backup-${today}.json`;
    const markBackupComplete = (message: string) => {
      setBackupSettings((current) => ({
        ...current,
        lastBackupDate: today,
        lastPromptDate: today,
      }));
      setBackupReminderDue(false);
      setNotice(message);
      window.setTimeout(() => setNotice(""), 3200);
    };
    const download = () => {
      const url = URL.createObjectURL(
        new Blob([serialized], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    };
    try {
      if (Capacitor.isNativePlatform()) {
        const stored = await Filesystem.writeFile({
          path: `backups/${fileName}`,
          data: serialized,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        await Share.share({
          title: "KopfKlar-Backup",
          text: "Sicherung meiner KopfKlar-Daten",
          files: [stored.uri],
          dialogTitle: "KopfKlar-Backup teilen",
        });
        markBackupComplete("Backup wurde geteilt bzw. gespeichert.");
        return;
      }
      if (typeof File !== "undefined" && navigator.share) {
        const file = new File([serialized], fileName, {
          type: "application/json",
        });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "KopfKlar-Backup",
            text: "Sicherung meiner KopfKlar-Daten",
            files: [file],
          });
          markBackupComplete("Backup wurde geteilt bzw. gespeichert.");
          return;
        }
      }
      download();
      markBackupComplete("Backup wurde heruntergeladen.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      download();
      markBackupComplete("Backup wurde heruntergeladen.");
    }
  }
  function finishSetup() {
    setCycleSettings({ enabled: setupCycleEnabled });
    setSupportReminder((current) =>
      current.startedAt ? current : { ...current, startedAt: today },
    );
    window.localStorage.removeItem(FACTORY_RESET_PENDING_KEY);
    window.localStorage.setItem(SETUP_COMPLETE_KEY, "done");
    setSetupComplete(true);
    setNotice("Einrichtung gespeichert.");
    window.setTimeout(() => setNotice(""), 2600);
  }

  function resetToFactorySettings() {
    if (
      !window.confirm(
        "Wirklich alle KopfKlar-Daten und Einstellungen auf diesem Gerät löschen? Ein vorhandenes Backup kannst du direkt danach wieder importieren.",
      )
    )
      return;
    const localKeys = [
      ENTRIES_KEY,
      MEDICATIONS_KEY,
      TRIGGERS_KEY,
      THERAPIES_KEY,
      REMINDERS_KEY,
      LANGUAGE_KEY,
      PAIN_SECTIONS_KEY,
      PAIN_FIELD_SETTINGS_KEY,
      CYCLE_SETTINGS_KEY,
      BACKUP_SETTINGS_KEY,
      SETUP_COMPLETE_KEY,
      APPEARANCE_KEY,
      SUPPORT_REMINDER_KEY,
      APP_LOCK_KEY,
      LEGACY_KEY,
    ];
    localKeys.forEach((key) => window.localStorage.removeItem(key));
    window.localStorage.setItem(FACTORY_RESET_PENDING_KEY, "pending");
    const firstOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    setEntries([]);
    setMedications(defaultMedications.map((medication) => ({ ...medication })));
    setTriggers([...defaultTriggers]);
    setTherapies([]);
    setReminders({ enabled: false, time: "20:00", lastSent: "" });
    setBackupSettings(defaultBackupSettings);
    setBackupReminderDue(false);
    setLanguage("de");
    setVisiblePainFields(defaultPainFieldSettings());
    setExpandedPainSections([]);
    setShowMorePainSections(false);
    setCycleSettings({ enabled: true });
    setAppearance(defaultAppearance);
    setSupportReminder(defaultSupportReminder);
    setSupportPromptVisible(false);
    setAppLock(defaultAppLock);
    setLockVisible(false);
    setEnteredCode("");
    setNewCode("");
    setNewCodeRepeat("");
    setLockError("");
    setSelectedTriggerAnalysis(null);
    setSetupCycleEnabled(true);
    setSetupStep(0);
    setTutorialPage(0);
    setSetupComplete(false);
    setSelectedDate(today);
    setDraft(blankEntry(today));
    setMonth(firstOfMonth);
    navigationRef.current = [];
    screenRef.current = "calendar";
    setScreen("calendar");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  async function enableAppLock() {
    if (!/^\d{4,8}$/.test(newCode)) {
      setLockError("Der Code muss aus 4 bis 8 Ziffern bestehen.");
      return;
    }
    if (newCode !== newCodeRepeat) {
      setLockError("Die beiden Codes stimmen nicht überein.");
      return;
    }
    const salt = crypto.randomUUID();
    const hash = await hashAppCode(newCode, salt);
    setAppLock({ enabled: true, salt, hash });
    setNewCode("");
    setNewCodeRepeat("");
    setLockError("");
    setNotice("App-Sperre aktiviert.");
    window.setTimeout(() => setNotice(""), 2600);
  }

  async function unlockApp() {
    if (!appLock.enabled) {
      setLockVisible(false);
      return;
    }
    const hash = await hashAppCode(enteredCode, appLock.salt);
    if (hash !== appLock.hash) {
      setLockError("Der Code stimmt nicht.");
      setEnteredCode("");
      return;
    }
    setEnteredCode("");
    setLockError("");
    setLockVisible(false);
  }

  function disableAppLock() {
    if (!window.confirm("App-Sperre wirklich deaktivieren?")) return;
    setAppLock(defaultAppLock);
    setLockVisible(false);
    setNewCode("");
    setNewCodeRepeat("");
    setLockError("");
  }

  function dismissSupportPrompt(disabled = false) {
    setSupportReminder((current) => ({
      ...current,
      dismissedAt: today,
      disabled,
    }));
    setSupportPromptVisible(false);
  }

  async function openExternalLink(url: string) {
    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url });
        return;
      }
      const popup = window.open(url, "_blank", "noopener,noreferrer");
      if (!popup) window.location.assign(url);
    } catch {
      window.location.assign(url);
    }
  }

  async function supportKopfKlar() {
    dismissSupportPrompt();
    await openExternalLink("https://github.com/MarcSchlicker/KopfKlar");
  }

  function remindSupportInMonth() {
    dismissSupportPrompt();
  }
  async function readKopfklarBackup(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as {
        format?: unknown;
        version?: unknown;
        data?: unknown;
      };
      if (
        parsed.format !== "kopfklar-backup" ||
        parsed.version !== 1 ||
        !parsed.data ||
        typeof parsed.data !== "object"
      )
        throw new Error("invalid-backup");
      const data = parsed.data as Record<string, unknown>;
      if (
        !Array.isArray(data.entries) ||
        !Array.isArray(data.medications) ||
        !Array.isArray(data.triggers) ||
        !Array.isArray(data.therapies)
      )
        throw new Error("invalid-backup");
      const rawEntries = data.entries.filter(
        (entry): entry is Partial<DayEntry> & { date: string } =>
          Boolean(entry) &&
          typeof entry === "object" &&
          typeof (entry as { date?: unknown }).date === "string",
      );
      if (
        !window.confirm(
          "Diese Sicherung ersetzt deine aktuellen lokalen Daten. Fortfahren?",
        )
      )
        return;
      const importedMedications = data.medications
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) &&
            typeof item === "object" &&
            typeof (item as { name?: unknown }).name === "string",
        )
        .map((item) => ({
          id:
            typeof item.id === "string" && item.id
              ? item.id
              : crypto.randomUUID(),
          name: item.name as string,
          dose: typeof item.dose === "string" ? item.dose : "",
          kind:
            item.kind === "Alternative"
              ? "Alternative"
              : item.kind === "Präventiv"
                ? "Präventiv"
                : ("Akut" as MedicationKind),
        }));
      const medicationIds = new Map<string, string>();
      const canonicalMedicationIds = new Map<string, string>();
      const mergedMedications: Medication[] = [];
      importedMedications.forEach((medication) => {
        const existingId = canonicalMedicationIds.get(
          medicationIdentity(medication),
        );
        if (existingId) medicationIds.set(medication.id, existingId);
        else {
          canonicalMedicationIds.set(
            medicationIdentity(medication),
            medication.id,
          );
          medicationIds.set(medication.id, medication.id);
          mergedMedications.push(medication);
        }
      });
      const importedEntries = rawEntries
        .map((rawEntry) => {
          const entry = normalizeEntry(rawEntry);
          return {
            ...entry,
            medications: uniqueMedicationUses(
              entry.medications
                .map((use) => ({
                  ...use,
                  medicationId:
                    medicationIds.get(use.medicationId) ?? use.medicationId,
                }))
                .filter((use) =>
                  mergedMedications.some(
                    (medication) => medication.id === use.medicationId,
                  ),
                ),
            ),
          };
        })
        .sort((left, right) => left.date.localeCompare(right.date));
      const importedTriggers = data.triggers.filter(
        (item): item is string =>
          typeof item === "string" && Boolean(item.trim()),
      );
      const importedTherapies = data.therapies
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) &&
            typeof item === "object" &&
            typeof (item as { name?: unknown }).name === "string",
        )
        .map((item) => ({
          id:
            typeof item.id === "string" && item.id
              ? item.id
              : crypto.randomUUID(),
          name: item.name as string,
          durationWeeks: Math.max(
            1,
            Math.min(104, Number(item.durationWeeks) || 12),
          ),
        }));
      const reminderData =
        data.reminders && typeof data.reminders === "object"
          ? (data.reminders as Partial<ReminderSettings>)
          : {};
      const appearanceData =
        data.appearance && typeof data.appearance === "object"
          ? data.appearance
          : {};
      const appLockData =
        data.appLock && typeof data.appLock === "object"
          ? (data.appLock as Partial<AppLockSettings>)
          : defaultAppLock;
      const backupData =
        data.backupSettings && typeof data.backupSettings === "object"
          ? (data.backupSettings as Partial<BackupSettings>)
          : {};
      const importedLanguage =
        data.language === "en" || data.language === "de" ? data.language : "de";
      const importedCycle =
        data.cycleSettings &&
        typeof data.cycleSettings === "object" &&
        (data.cycleSettings as Partial<CycleSettings>).enabled === false
          ? false
          : true;
      setEntries(importedEntries);
      setMedications(mergedMedications);
      setTriggers(importedTriggers.length ? importedTriggers : defaultTriggers);
      setTherapies(importedTherapies);
      setReminders({
        enabled: reminderData.enabled === true,
        time:
          typeof reminderData.time === "string" ? reminderData.time : "20:00",
        lastSent:
          typeof reminderData.lastSent === "string"
            ? reminderData.lastSent
            : "",
      });
      setAppearance(normalizeAppearance(appearanceData));
      setAppLock({
        enabled:
          appLockData.enabled === true &&
          typeof appLockData.salt === "string" &&
          typeof appLockData.hash === "string",
        salt: typeof appLockData.salt === "string" ? appLockData.salt : "",
        hash: typeof appLockData.hash === "string" ? appLockData.hash : "",
      });
      setBackupSettings({
        enabled: backupData.enabled === true,
        intervalWeeks: Math.max(
          1,
          Math.min(52, Number(backupData.intervalWeeks) || 1),
        ),
        lastPromptDate:
          typeof backupData.lastPromptDate === "string"
            ? backupData.lastPromptDate
            : "",
        lastBackupDate:
          typeof backupData.lastBackupDate === "string"
            ? backupData.lastBackupDate
            : "",
      });
      setLanguage(importedLanguage);
      setCycleSettings({ enabled: importedCycle });
      setSetupCycleEnabled(importedCycle);
      setVisiblePainFields(normalizePainFieldSettings(data.painFieldSettings));
      window.localStorage.removeItem(FACTORY_RESET_PENDING_KEY);
      window.localStorage.setItem(SETUP_COMPLETE_KEY, "done");
      setSetupComplete(true);
      const firstDate = importedEntries[0]?.date;
      if (firstDate) setMonth(new Date(`${firstDate}T12:00:00`));
      setNotice("KopfKlar-Backup wurde wiederhergestellt.");
      goTo("calendar", { reset: true });
      window.setTimeout(() => setNotice(""), 3600);
    } catch {
      setNotice("Die Datei ist kein gültiges KopfKlar-Backup.");
      window.setTimeout(() => setNotice(""), 3600);
    }
  }
  async function readDmkgReport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsReadingDmkg(true);
    setNotice("DMKG-Import wird ausgewertet …");
    try {
      const parsed = await parseDmkgPdf(file);
      setDmkgImport(parsed);
      goTo("import");
      setNotice("");
    } catch {
      setDmkgImport(null);
      setNotice(
        "Die PDF konnte nicht gelesen werden. Bitte wähle einen DMKG-Report aus.",
      );
      window.setTimeout(() => setNotice(""), 4200);
    } finally {
      setIsReadingDmkg(false);
    }
  }
  function applyDmkgImport() {
    if (!dmkgImport) return;
    const mergedCatalog: Medication[] = [];
    const medicationIds = new Map<string, string>();
    const canonicalMedicationIds = new Map<string, string>();
    [...medications, ...dmkgImport.medications].forEach((medication) => {
      const knownId = canonicalMedicationIds.get(
        medicationIdentity(medication),
      );
      if (knownId) medicationIds.set(medication.id, knownId);
      else {
        canonicalMedicationIds.set(
          medicationIdentity(medication),
          medication.id,
        );
        medicationIds.set(medication.id, medication.id);
        mergedCatalog.push(medication);
      }
    });
    const remapEntry = (entry: DayEntry) => ({
      ...entry,
      medications: uniqueMedicationUses(
        entry.medications.map((use) => ({
          ...use,
          medicationId: medicationIds.get(use.medicationId) ?? use.medicationId,
        })),
      ),
    });
    const importedEntries = dmkgImport.entries.map(remapEntry);
    setEntries((current) =>
      [
        ...current
          .map(remapEntry)
          .filter(
            (entry) =>
              !importedEntries.some((item) => item.date === entry.date),
          ),
        ...importedEntries,
      ].sort((a, b) => a.date.localeCompare(b.date)),
    );
    setMedications(mergedCatalog);
    const firstDate = dmkgImport.entries[0]?.date;
    if (firstDate) setMonth(new Date(`${firstDate}T12:00:00`));
    setNotice(
      `${dmkgImport.entries.length} Tage wurden importiert. Doppelte Medikamente wurden zusammengeführt.`,
    );
    setDmkgImport(null);
    goTo("calendar", { reset: true });
    window.setTimeout(() => setNotice(""), 3600);
  }
  function mergeDuplicateMedications() {
    const canonicalMedicationIds = new Map<string, string>();
    const medicationIds = new Map<string, string>();
    const mergedCatalog: Medication[] = [];
    medications.forEach((medication) => {
      const knownId = canonicalMedicationIds.get(
        medicationIdentity(medication),
      );
      if (knownId) medicationIds.set(medication.id, knownId);
      else {
        canonicalMedicationIds.set(
          medicationIdentity(medication),
          medication.id,
        );
        medicationIds.set(medication.id, medication.id);
        mergedCatalog.push(medication);
      }
    });
    if (mergedCatalog.length === medications.length) {
      setNotice("Keine doppelten Medikamente gefunden.");
      window.setTimeout(() => setNotice(""), 2600);
      return;
    }
    setMedications(mergedCatalog);
    setEntries((current) =>
      current.map((entry) => ({
        ...entry,
        medications: uniqueMedicationUses(
          entry.medications.map((use) => ({
            ...use,
            medicationId:
              medicationIds.get(use.medicationId) ?? use.medicationId,
          })),
        ),
      })),
    );
    setNotice("Doppelte Medikamente wurden zusammengeführt.");
    window.setTimeout(() => setNotice(""), 3000);
  }
  async function printReport() {
    try {
      setNotice("PDF-Bericht wird erstellt …");
      const { jsPDF } = await import("jspdf/dist/jspdf.es.min.js");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      const bottom = pageHeight - 16;
      let y = 18;
      const text = (
        value: string,
        x: number,
        width: number,
        size = 9,
        color: [number, number, number] = [22, 52, 78],
      ) => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(size);
        pdf.setTextColor(...color);
        const lines = pdf.splitTextToSize(value, width) as string[];
        lines.forEach((line) => {
          if (y > bottom) newPage();
          pdf.text(line, x, y);
          y += size * 0.48 + 1.5;
        });
        return lines.length;
      };
      const pageHeader = () => {
        pdf.setFillColor(8, 71, 110);
        pdf.rect(0, 0, pageWidth, 10, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255);
        pdf.text("KopfKlar - persönlicher Kopfschmerzbericht", margin, 6.7);
        y = 18;
      };
      const newPage = () => {
        pdf.addPage();
        pageHeader();
      };
      const ensure = (height: number) => {
        if (y + height > bottom) newPage();
      };
      const section = (
        title: string,
        subtitle?: string,
        minContentHeight = 0,
      ) => {
        ensure(16 + minContentHeight);
        pdf.setFillColor(234, 245, 251);
        pdf.roundedRect(margin, y, contentWidth, 11, 2, 2, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.setTextColor(8, 71, 110);
        pdf.text(title, margin + 4, y + 6.8);
        if (subtitle) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.5);
          pdf.setTextColor(91, 117, 137);
          pdf.text(subtitle, pageWidth - margin - 4, y + 6.7, {
            align: "right",
          });
        }
        y += 16;
      };
      const chart = (
        title: string,
        data: MonthlySummary[],
        metric: "painDays" | "duration" | "intensity",
        secondSeries = false,
      ) => {
        section(title, `${data.length} Monate`, 60);
        const top = y + 2;
        const left = margin + 13;
        const width = contentWidth - 17;
        const height = 39;
        const primary = (item: MonthlySummary) => Number(item[metric]) || 0;
        const maximum = Math.max(
          1,
          ...data.flatMap((item) =>
            secondSeries
              ? [primary(item), item.medicationDays]
              : [primary(item)],
          ),
        );
        pdf.setDrawColor(220, 231, 238);
        pdf.setLineWidth(0.25);
        for (let grid = 0; grid <= 3; grid += 1) {
          const gridY = top + (height / 3) * grid;
          pdf.line(left, gridY, left + width, gridY);
          pdf.setFontSize(6.5);
          pdf.setTextColor(110, 128, 145);
          pdf.text(
            String(Math.round(maximum - (maximum / 3) * grid)),
            margin,
            gridY + 1.7,
          );
        }
        const points = (series: (item: MonthlySummary) => number) =>
          data.map((item, index) => ({
            x:
              left +
              (data.length === 1
                ? width / 2
                : (width / (data.length - 1)) * index),
            y: top + height - (series(item) / maximum) * height,
          }));
        const drawSeries = (
          series: { x: number; y: number }[],
          color: [number, number, number],
        ) => {
          pdf.setDrawColor(...color);
          pdf.setLineWidth(0.9);
          series.forEach((point, index) => {
            if (index)
              pdf.line(
                series[index - 1].x,
                series[index - 1].y,
                point.x,
                point.y,
              );
          });
          series.forEach((point) => {
            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(...color);
            pdf.circle(point.x, point.y, 1.15, "FD");
          });
        };
        const primaryColor: [number, number, number] =
          metric === "painDays"
            ? [227, 123, 167]
            : metric === "duration"
              ? [79, 100, 198]
              : [22, 52, 78];
        drawSeries(points(primary), primaryColor);
        if (secondSeries)
          drawSeries(
            points((item) => item.medicationDays),
            [79, 100, 198],
          );
        pdf.setFontSize(6.3);
        pdf.setTextColor(110, 128, 145);
        data.forEach((item, index) =>
          pdf.text(
            item.label.split(" ")[0],
            left +
              (data.length === 1
                ? width / 2
                : (width / (data.length - 1)) * index),
            top + height + 5,
            { align: "center" },
          ),
        );
        y = top + height + 10;
        if (secondSeries) {
          pdf.setFillColor(227, 123, 167);
          pdf.circle(margin + 2, y, 1.3, "F");
          pdf.setFillColor(79, 100, 198);
          pdf.circle(margin + 49, y, 1.3, "F");
          pdf.setFontSize(7);
          pdf.setTextColor(91, 117, 137);
          pdf.text("Kopfschmerztage", margin + 5, y + 2);
          pdf.text("Medikationstage", margin + 52, y + 2);
          y += 7;
        }
      };
      const table = (headers: string[], rows: string[][], widths: number[]) => {
        const header = () => {
          ensure(9);
          pdf.setFillColor(8, 71, 110);
          pdf.rect(margin, y, contentWidth, 8, "F");
          let x = margin;
          headers.forEach((item, index) => {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(6.6);
            pdf.setTextColor(255, 255, 255);
            pdf.text(item, x + 2, y + 5, { maxWidth: widths[index] - 4 });
            x += widths[index];
          });
          y += 8;
        };
        header();
        rows.forEach((row, rowIndex) => {
          const cells = row.map(
            (value, index) =>
              pdf.splitTextToSize(value, widths[index] - 4) as string[],
          );
          const rowHeight = Math.max(
            7,
            ...cells.map((cell) => cell.length * 3.8 + 3),
          );
          if (y + rowHeight > bottom) {
            newPage();
            header();
          }
          if (rowIndex % 2 === 0) {
            pdf.setFillColor(244, 250, 251);
            pdf.rect(margin, y, contentWidth, rowHeight, "F");
          }
          let x = margin;
          cells.forEach((cell, index) => {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(7.2);
            pdf.setTextColor(40, 68, 89);
            pdf.text(cell, x + 2, y + 4.7);
            x += widths[index];
          });
          y += rowHeight;
        });
        y += 5;
      };
      const tableHeight = (rows: string[][], widths: number[]) =>
        13 +
        rows.reduce((total, row) => {
          const rowHeight = Math.max(
            7,
            ...row.map(
              (value, index) =>
                (pdf.splitTextToSize(value, widths[index] - 4) as string[])
                  .length *
                  3.8 +
                3,
            ),
          );
          return total + rowHeight;
        }, 0);
      const sectionTable = (
        title: string,
        subtitle: string | undefined,
        headers: string[],
        rows: string[][],
        widths: number[],
      ) => {
        section(
          title,
          subtitle,
          Math.min(tableHeight(rows, widths), bottom - 34),
        );
        table(headers, rows, widths);
      };
      const effectColor = (score: number): [number, number, number] =>
        score >= 7
          ? [62, 142, 103]
          : score >= 4
            ? [255, 209, 47]
            : [198, 70, 85];
      const impactRows = monthly12.map((item) => {
        const inMonth = entries.filter((entry) =>
          entry.date.startsWith(monthKey(item.date)),
        );
        const count = (impact: string) =>
          inMonth.filter((entry) => entry.impacts.includes(impact)).length;
        return {
          label: item.label,
          work: count(workImpact),
          home: count("Haushalt / Freizeit ausgefallen"),
          doctor: count("Ambulant beim Arzt gewesen"),
          emergency: count("In der Notaufnahme gewesen"),
          hospital: count("Krankenhausaufenthalt über Nacht"),
        };
      });
      const noteRows = [...entries]
        .filter(
          (entry) =>
            entry.dayComment.trim() ||
            entry.generalComment.trim() ||
            entry.preventiveMedication.trim(),
        )
        .sort((a, b) => b.date.localeCompare(a.date));
      pageHeader();
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.setTextColor(22, 52, 78);
      pdf.text("Report & Verlauf", margin, y);
      y += 7;
      text(
        `Erstellt am ${prettyDate(today)} · persönlicher Überblick der dokumentierten Daten`,
        margin,
        contentWidth,
        8,
        [91, 117, 137],
      );
      y += 4;
      chart("Kopfschmerztage & Medikation", monthly12, "painDays", true);
      chart("Kopfschmerzdauer", monthly12, "duration");
      chart("Durchschnittliche Schmerzstärke", monthly12, "intensity");
      section(
        "Medikamente & Wirkung",
        "letzte 3 Monate",
        Math.min(
          Math.max(13, lastThreeMedicationShares.length * 11),
          bottom - 34,
        ),
      );
      if (lastThreeMedicationShares.length) {
        lastThreeMedicationShares.forEach((item) => {
          ensure(13);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8.5);
          pdf.setTextColor(22, 52, 78);
          pdf.text(
            `${item.name} (${item.kind === "Alternative" ? "alternativ" : "akut"})`,
            margin,
            y,
          );
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.5);
          pdf.setTextColor(...effectColor(item.averageEffect));
          pdf.text(
            `Ø Wirkung ${item.averageEffect.toFixed(1)}/10`,
            pageWidth - margin,
            y,
            { align: "right" },
          );
          y += 3;
          pdf.setFillColor(232, 239, 243);
          pdf.roundedRect(margin, y, contentWidth, 3.5, 1.75, 1.75, "F");
          pdf.setFillColor(...effectColor(item.averageEffect));
          pdf.roundedRect(
            margin,
            y,
            Math.max(
              3,
              contentWidth *
                (item.percent /
                  Math.max(
                    1,
                    ...lastThreeMedicationShares.map((share) => share.percent),
                  )),
            ),
            3.5,
            1.75,
            1.75,
            "F",
          );
          y += 7.5;
        });
      } else
        text(
          "Noch keine Medikamente in den letzten drei Monaten dokumentiert.",
          margin,
          contentWidth,
        );
      const cycleRows = phaseStats.map((item) => [
        item.phase,
        String(item.painDays),
      ]);
      section(
        "Zyklus & Kopfschmerztage",
        `Ø ${estimatedCycleLength} Tage`,
        Math.min(15 + tableHeight(cycleRows, [118, 62]), bottom - 34),
      );
      text(
        latestPeriodStart
          ? `Letzte eingetragene Periode: ${prettyDate(latestPeriodStart)}. Nächste Periode ca. ${prettyDate(daysAfter(latestPeriodStart, estimatedCycleLength))}.`
          : "Sobald du Periodentage einträgst, wird die Zyklusauswertung ergänzt.",
        margin,
        contentWidth,
        8,
      );
      table(["Phase", "Kopfschmerztage"], cycleRows, [118, 62]);
      const therapyRows = therapyResults.map((item) => [
        item.therapy.name,
        item.start
          ? `${item.therapy.durationWeeks} Wo. · ${prettyDate(item.start)}`
          : "Noch nicht markiert",
        String(item.before),
        String(item.during),
      ]);
      if (therapyRows.length)
        sectionTable(
          "Schmerztage nach Therapie",
          undefined,
          ["Therapie", "Wirkzeit / Start", "Davor", "Im Wirkfenster"],
          therapyRows,
          [48, 68, 30, 34],
        );
      else {
        section("Schmerztage nach Therapie", undefined, 8);
        text("Noch keine vorbeugende Therapie angelegt.", margin, contentWidth);
      }
      const annualRows = monthly12.map((item) => [
        item.label,
        String(item.painDays),
        String(item.medicationDays),
        `${item.duration} h`,
        item.intensity === null ? "-" : String(item.intensity),
        String(item.unableToWork),
      ]);
      sectionTable(
        "Jahresübersicht",
        "letzte 12 Monate",
        ["Monat", "Schmerztage", "Med.-Tage", "Dauer", "Ø Stärke", "AU"],
        annualRows,
        [42, 29, 28, 26, 28, 27],
      );
      const absenceRows = impactRows.map((item) => [
        item.label,
        String(item.work),
        String(item.home),
      ]);
      sectionTable(
        "Ausfälle nach Monat",
        "letzte 12 Monate",
        ["Monat", "Arbeit / Schule", "Haushalt / Freizeit"],
        absenceRows,
        [42, 66, 72],
      );
      const careRows = impactRows.map((item) => [
        item.label,
        String(item.doctor),
        String(item.emergency),
        String(item.hospital),
      ]);
      sectionTable(
        "Arzt & medizinische Hilfe",
        "letzte 12 Monate",
        ["Monat", "Arztbesuch", "Notaufnahme", "Krankenhaus"],
        careRows,
        [42, 46, 46, 46],
      );
      const noteText = (entry: DayEntry) =>
        [
          entry.dayComment,
          entry.generalComment,
          entry.preventiveMedication
            ? `Vorbeugend: ${entry.preventiveMedication}`
            : "",
        ]
          .filter(Boolean)
          .join(" · ");
      const noteHeight = (entry: DayEntry) =>
        8 +
        (pdf.splitTextToSize(noteText(entry), contentWidth) as string[])
          .length *
          5.4;
      section(
        "Notizen & Kommentare",
        undefined,
        noteRows.length ? Math.min(noteHeight(noteRows[0]), bottom - 34) : 8,
      );
      if (noteRows.length)
        noteRows.forEach((entry) => {
          ensure(Math.min(noteHeight(entry), bottom - 18));
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8.5);
          pdf.setTextColor(8, 71, 110);
          pdf.text(prettyDate(entry.date), margin, y);
          y += 4.5;
          text(noteText(entry), margin, contentWidth, 8, [57, 82, 102]);
          y += 3;
        });
      else
        text(
          "Noch keine Notizen oder Kommentare dokumentiert.",
          margin,
          contentWidth,
        );
      const pages = pdf.getNumberOfPages();
      for (let page = 1; page <= pages; page += 1) {
        pdf.setPage(page);
        pdf.setDrawColor(220, 231, 238);
        pdf.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(110, 128, 145);
        pdf.text(
          "KopfKlar · vertraulicher persönlicher Bericht",
          margin,
          pageHeight - 6,
        );
        pdf.text(`${page} / ${pages}`, pageWidth - margin, pageHeight - 6, {
          align: "right",
        });
      }
      const link = document.createElement("a");
      link.href = URL.createObjectURL(pdf.output("blob"));
      link.download = `KopfKlar-Report-${today}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      setNotice("Dein sauber formatierter PDF-Bericht wurde heruntergeladen.");
      window.setTimeout(() => setNotice(""), 3500);
    } catch {
      setNotice(
        "PDF konnte nicht erstellt werden. Der Druckdialog wird stattdessen geöffnet.",
      );
      window.print();
    }
  }
  async function scheduleNativeDailyReminder(time: string) {
    const [hour, minute] = time.split(":").map((part) => Number(part));
    await LocalNotifications.createChannel({
      id: "kopfklar-erinnerungen",
      name: "KopfKlar-Erinnerungen",
      description: "Tägliche Erinnerungen für deinen Kopfschmerzkalender",
      importance: 3,
      visibility: 1,
      vibration: true,
    });
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: DAILY_REMINDER_ACTION_TYPE,
          actions: [
            { id: QUICK_NO_HEADACHE_ACTION, title: "Keine Kopfschmerzen" },
            { id: QUICK_HEADACHE_ACTION, title: "Kopfschmerzen eintragen" },
          ],
        },
      ],
    });
    await LocalNotifications.cancel({ notifications: [{ id: 71001 }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 71001,
          title: "KopfKlar",
          body: "Wie ging es dir heute? Du kannst direkt antworten oder Details eintragen.",
          channelId: "kopfklar-erinnerungen",
          smallIcon: "ic_stat_kopfklar",
          iconColor: "#126b9c",
          actionTypeId: DAILY_REMINDER_ACTION_TYPE,
          schedule: { on: { hour, minute } },
        },
      ],
    });
  }
  async function enableReminders() {
    try {
      if (Capacitor.isNativePlatform()) {
        const currentPermission = await LocalNotifications.checkPermissions();
        const permission =
          currentPermission.display === "granted"
            ? currentPermission
            : await LocalNotifications.requestPermissions();
        if (permission.display !== "granted") {
          setNotice("Benachrichtigungen wurden nicht erlaubt.");
          return;
        }
        await scheduleNativeDailyReminder(reminders.time);
        setReminders((current) => ({ ...current, enabled: true }));
        setNotice("Tägliche Android-Erinnerung ist aktiviert.");
        return;
      }
      if (!("Notification" in window)) {
        setNotice(
          "Dieser Browser unterstützt keine Benachrichtigungen. In der Android-App funktionieren sie zuverlässig.",
        );
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setReminders((current) => ({ ...current, enabled: true }));
        setNotice("Tägliche Erinnerung ist aktiviert.");
      } else setNotice("Benachrichtigungen wurden nicht erlaubt.");
    } catch {
      setNotice(
        "Die Erinnerung konnte nicht eingerichtet werden. Prüfe die Benachrichtigungsrechte von KopfKlar.",
      );
    } finally {
      window.setTimeout(() => setNotice(""), 3600);
    }
  }
  async function disableReminders() {
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.cancel({ notifications: [{ id: 71001 }] });
      } catch {
        /* The saved switch is still disabled below. */
      }
    }
    setReminders((current) => ({ ...current, enabled: false }));
    setNotice("Tägliche Erinnerung ist deaktiviert.");
    window.setTimeout(() => setNotice(""), 2600);
  }
  async function updateReminderTime(time: string) {
    setReminders((current) => ({ ...current, time }));
    if (!reminders.enabled || !Capacitor.isNativePlatform()) return;
    try {
      await scheduleNativeDailyReminder(time);
      setNotice("Uhrzeit der Android-Erinnerung aktualisiert.");
      window.setTimeout(() => setNotice(""), 2600);
    } catch {
      setNotice("Die neue Uhrzeit konnte nicht gespeichert werden.");
      window.setTimeout(() => setNotice(""), 2600);
    }
  }
  async function testReminder() {
    try {
      if (Capacitor.isNativePlatform()) {
        const permission = await LocalNotifications.checkPermissions();
        if (permission.display !== "granted") {
          await enableReminders();
          return;
        }
        await LocalNotifications.registerActionTypes({
          types: [
            {
              id: DAILY_REMINDER_ACTION_TYPE,
              actions: [
                { id: QUICK_NO_HEADACHE_ACTION, title: "Keine Kopfschmerzen" },
                { id: QUICK_HEADACHE_ACTION, title: "Kopfschmerzen eintragen" },
              ],
            },
          ],
        });
        await LocalNotifications.schedule({
          notifications: [
            {
              id: 71002,
              title: "KopfKlar",
              body: "Test erfolgreich – du kannst die Schnelleingabe direkt ausprobieren.",
              channelId: "kopfklar-erinnerungen",
              smallIcon: "ic_stat_kopfklar",
              iconColor: "#126b9c",
              actionTypeId: DAILY_REMINDER_ACTION_TYPE,
              schedule: { at: new Date(Date.now() + 2500) },
            },
          ],
        });
        setNotice("Test-Benachrichtigung wird gleich angezeigt.");
        window.setTimeout(() => setNotice(""), 3200);
        return;
      }
      if (
        !("Notification" in window) ||
        Notification.permission !== "granted"
      ) {
        await enableReminders();
        return;
      }
      const registration =
        "serviceWorker" in navigator
          ? await navigator.serviceWorker.ready
          : undefined;
      if (registration)
        await registration.showNotification("KopfKlar", {
          body: "Test erfolgreich – deine Erinnerung ist eingerichtet.",
          tag: "kopfklar-test",
        });
      else
        new Notification("KopfKlar", {
          body: "Test erfolgreich – deine Erinnerung ist eingerichtet.",
        });
    } catch {
      setNotice("Test-Benachrichtigung konnte nicht erstellt werden.");
      window.setTimeout(() => setNotice(""), 2600);
    }
  }

  function Header({
    title,
    back = "calendar",
    save,
  }: {
    title: string;
    back?: Screen;
    save?: () => void;
  }) {
    return (
      <header className="screen-header">
        <button type="button" onClick={() => goBack(back)} aria-label="Zurück">
          ‹
        </button>
        <h1>{title}</h1>
        {save ? (
          <button
            className="header-save"
            type="button"
            onClick={save}
            aria-label="Speichern"
          >
            ✓
          </button>
        ) : (
          <span />
        )}
      </header>
    );
  }
  function shiftMonth(offset: number) {
    setMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }
  function CalendarTablet({ kind }: { kind: MedicationKind }) {
    const label =
      kind === "Alternative"
        ? "Alternative Medikation eingetragen"
        : kind === "Präventiv"
          ? "Präventive Medikation eingetragen"
          : "Akutmedikation eingetragen";
    const tone =
      kind === "Alternative"
        ? "alternative"
        : kind === "Präventiv"
          ? "preventive"
          : "acute";
    return <i className={`tablet ${tone}`} aria-label={label} />;
  }

  function renderCalendar() {
    const palette = paletteForAppearance(appearance);
    const tutorialCalendarStep =
      !setupComplete && setupStep === 1 && tutorialPage === 0;
    return (
      <>
        <main className="page calendar-page">
          <section className="calendar-title">
            <p>Dein Kopfschmerzkalender</p>
            <h1>Kalender</h1>
          </section>
          <section className="month-control">
            <button type="button" onClick={() => shiftMonth(-1)}>
              ‹
            </button>
            <div>
              <strong>{monthName(month)}</strong>
              <small>Tippe auf einen Tag zum Eintragen</small>
            </div>
            <button type="button" onClick={() => shiftMonth(1)}>
              ›
            </button>
          </section>
          <section className="calendar-card">
            <div className="weekdays">
              {["Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa.", "So."].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {calendarDays.map((item, index) => {
                if (!item)
                  return <div className="calendar-empty" key={index} />;
                const uses = item.entry?.medications
                  .map((use) => medicationById.get(use.medicationId))
                  .filter(Boolean) as Medication[] | undefined;
                const hasAcute = uses?.some(
                  (medication) => medication.kind === "Akut",
                );
                const hasAlternative = uses?.some(
                  (medication) => medication.kind === "Alternative",
                );
                const hasPreventive = uses?.some(
                  (medication) => medication.kind === "Präventiv",
                );
                const hasTherapy = Boolean(item.entry?.therapies.length);
                const recordedPeriod =
                  cycleSettings.enabled && Boolean(item.entry?.period);
                const estimatedPeriod =
                  cycleSettings.enabled && isEstimatedPeriodDay(item.key);
                const estimatedOvulation =
                  cycleSettings.enabled && isEstimatedOvulationDay(item.key);
                const painIsLight = Boolean(
                  item.entry?.headache && item.entry.intensity <= 4,
                );
                const matchesFilters = entryMatchesFilters(
                  item.entry,
                  calendarFilters,
                );
                const tutorialTarget =
                  tutorialCalendarStep && item.key === today;
                return (
                  <button
                    type="button"
                    key={item.key}
                    style={
                      item.entry?.headache
                        ? {
                            backgroundColor: painColor(
                              item.entry.intensity,
                              palette,
                            ),
                          }
                        : undefined
                    }
                    className={`calendar-day ${item.entry?.headache === true ? "pain" : item.entry?.headache === false ? "free" : ""} ${painIsLight ? "pain-light" : ""} ${recordedPeriod ? "period-day" : ""} ${estimatedPeriod ? "estimated-period" : ""} ${estimatedOvulation ? "estimated-ovulation" : ""} ${item.key === today ? "today" : ""} ${calendarFilters.length && !matchesFilters ? "filter-muted" : ""} ${tutorialTarget ? "tutorial-target" : ""}`}
                    onClick={() => openDay(item.key)}
                    aria-label={
                      item.entry?.headache
                        ? `${item.number}. ${monthName(month)}, Kopfschmerzen Stärke ${item.entry.intensity} von 10`
                        : undefined
                    }
                  >
                    <span>{item.number}</span>
                    {recordedPeriod && (
                      <i
                        className="period-drop"
                        aria-label="Periode eingetragen"
                      />
                    )}
                    {hasTherapy && (
                      <i
                        className="therapy-marker"
                        aria-label="Vorbeugende Therapie eingetragen"
                      >
                        ✦
                      </i>
                    )}
                    {hasPreventive && <CalendarTablet kind="Präventiv" />}
                    {hasAcute && <CalendarTablet kind="Akut" />}
                    {hasAlternative && <CalendarTablet kind="Alternative" />}
                  </button>
                );
              })}
            </div>
          </section>
          <section className="month-summary">
            <div>
              <strong>{calendarMonthPain.length}</strong>
              <span>Kopfschmerztage</span>
            </div>
            <div>
              <strong>{calendarMedicationDays}</strong>
              <span>Tage mit Medikation</span>
            </div>
            <button type="button" onClick={() => openDay(today)}>
              Heute eintragen
            </button>
          </section>
          <details className="calendar-filters">
            <summary>
              <span>⌕</span>
              <strong>Kalender filtern</strong>
              <small>{filterSummary(calendarFilters)}</small>
            </summary>
            <div className="calendar-filter-head">
              <span>Mehrere Filter lassen sich kombinieren.</span>
              {calendarFilters.length > 0 && (
                <button type="button" onClick={() => setCalendarFilters([])}>
                  Alle zeigen
                </button>
              )}
            </div>
            <div className="calendar-filter-options">
              {entryFilterOptions.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={`${calendarFilters.includes(option.id) ? "selected" : ""} filter-${option.id}`}
                  aria-pressed={calendarFilters.includes(option.id)}
                  onClick={() => toggleEntryFilter(option.id, "calendar")}
                >
                  <i>{option.symbol}</i>
                  {option.label}
                </button>
              ))}
            </div>
          </details>
          <section className="legend">
            <span>
              <i className="legend-dot free" />
              Keine Kopfschmerzen
            </span>
            <span>
              <i
                className="legend-dot pain pain-scale"
                style={{
                  background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[2]} 56%, ${palette[4]} 100%)`,
                }}
              />
              Kopfschmerztage · leicht bis stark
            </span>
            <span>
              <CalendarTablet kind="Akut" />
              Akutmedikation
            </span>
            <span>
              <CalendarTablet kind="Alternative" />
              Alternative Medikation
            </span>
            <span>
              <CalendarTablet kind="Präventiv" />
              Präventive Medikation
            </span>
            {cycleSettings.enabled && (
              <>
                <span>
                  <i className="period-drop legend-drop" />
                  Periode eingetragen
                </span>
                <span>
                  <i className="legend-ring estimated-period" />
                  Periode geschätzt
                </span>
                <span>
                  <i className="legend-ring estimated-ovulation" />
                  Eisprung geschätzt
                </span>
              </>
            )}
            <span>
              <i className="therapy-marker legend-therapy">✦</i>Therapie
            </span>
          </section>
        </main>
      </>
    );
  }

  function TriggerPicker({ compact = false }: { compact?: boolean }) {
    const availableTriggers = triggers.filter(
      (trigger) => cycleSettings.enabled || trigger !== "Zyklus",
    );
    return (
      <section
        className={`form-block day-trigger-block ${compact ? "pain-trigger-block" : ""}`}
      >
        <h2>Mögliche Trigger</h2>
        <p>
          {compact
            ? "Markiere mögliche Auslöser dieses Tages. Sie werden als Zusammenhang ausgewertet, nicht als festgestellte Ursache."
            : "Notiere mögliche Auslöser auch dann, wenn du keine Kopfschmerzen hattest."}
        </p>
        <div className="pills">
          {availableTriggers.map((trigger) => (
            <Pill
              key={trigger}
              active={draft.triggers.includes(trigger)}
              onClick={() =>
                updateDraft({ triggers: toggle(draft.triggers, trigger) })
              }
            >
              {trigger}
            </Pill>
          ))}
        </div>
        <button
          type="button"
          className="text-action"
          onClick={() => {
            setManageBack(compact ? "pain" : "day");
            goTo("triggers");
          }}
        >
          Trigger verwalten
        </button>
      </section>
    );
  }

  function renderDay() {
    return (
      <>
        <Header title={prettyDate(selectedDate)} save={() => saveDay()} />
        <main className="page form-page">
          <section className="day-question">
            <h2>Kopfschmerzen / Migräne</h2>
            <Switch value={draft.headache} onChange={chooseHeadache} />
          </section>
          <section className="form-block">
            <h2>Kommentar zum Tag</h2>
            <label>
              Vorbeugende Medikation
              <textarea
                value={draft.preventiveMedication}
                onChange={(event) =>
                  updateDraft({ preventiveMedication: event.target.value })
                }
                placeholder="z. B. täglich eingenommene Medikamente"
                rows={3}
              />
            </label>
            <label>
              Allgemeiner Kommentar
              <textarea
                value={draft.generalComment}
                onChange={(event) =>
                  updateDraft({ generalComment: event.target.value })
                }
                placeholder="Wie war dein Tag?"
                rows={4}
              />
            </label>
            {cycleSettings.enabled && (
              <div className="period-row">
                <span>Hattest du an diesem Tag deine Periode?</span>
                <Switch
                  value={draft.period}
                  onChange={(period) => updateDraft({ period })}
                />
              </div>
            )}
          </section>
          <TriggerPicker />
          <MedicationList kind="Präventiv" title="Präventive Medikation" />
          <section className="form-block therapy-day-block">
            <h2>Vorbeugende Therapie</h2>
            <p>
              Markiere eine Therapie an dem Tag, an dem sie begonnen oder
              erneuert wurde.
            </p>
            {therapies.length ? (
              <div className="pills">
                {therapies.map((therapy) => (
                  <Pill
                    key={therapy.id}
                    active={draft.therapies.includes(therapy.id)}
                    tone="blue"
                    onClick={() =>
                      updateDraft({
                        therapies: toggle(draft.therapies, therapy.id),
                      })
                    }
                  >
                    {therapy.name} · {therapy.durationWeeks} Wo.
                  </Pill>
                ))}
              </div>
            ) : (
              <p className="inline-empty">Noch keine Therapie angelegt.</p>
            )}
            <button
              className="text-action blue"
              type="button"
              onClick={() => {
                setManageBack("day");
                goTo("therapies");
              }}
            >
              Therapien verwalten
            </button>
          </section>
          {draft.headache === true && (
            <button
              className="outline-action"
              type="button"
              onClick={() => {
                setShowMorePainSections(false);
                goTo("pain");
              }}
            >
              Schmerzen detailliert beschreiben <span>›</span>
            </button>
          )}
          <div className="bottom-actions">
            <button
              type="button"
              className="quiet-button"
              onClick={() => goTo("calendar", { reset: true })}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className="primary-action"
              onClick={() => saveDay()}
            >
              Fertig
            </button>
          </div>
        </main>
      </>
    );
  }

  function MedicationList({
    kind,
    title,
  }: {
    kind: MedicationKind;
    title: string;
  }) {
    const list = medications.filter((medication) => medication.kind === kind);
    const alternative = kind === "Alternative";
    const preventive = kind === "Präventiv";
    return (
      <>
        <section
          className={`form-block medication-block ${alternative ? "alternative-block" : ""} ${preventive ? "preventive-block" : ""}`}
        >
          <h2>{title}</h2>
          <p>
            {alternative
              ? "z. B. Ingwertee, Cola oder andere eigene Maßnahmen"
              : preventive
                ? "Regelmäßig oder vorbeugend eingenommene Medikamente"
                : "Medikament(e) eingenommen?"}
          </p>
          {list.length ? (
            <div className="med-select-list">
              {list.map((medication) => {
                const use = draft.medications.find(
                  (item) => item.medicationId === medication.id,
                );
                return (
                  <div
                    className={`med-select ${use ? "checked" : ""} ${alternative ? "blue" : ""} ${preventive ? "preventive" : ""}`}
                    key={medication.id}
                  >
                    <button
                      type="button"
                      className="med-check"
                      onClick={() => toggleMedication(medication.id)}
                      aria-pressed={Boolean(use)}
                    >
                      {use ? "✓" : ""}
                    </button>
                    <div>
                      <strong>{medication.name}</strong>
                      <span>
                        {medication.dose
                          ? `Dosis / Menge: ${medication.dose}`
                          : "Eigene Maßnahme"}
                      </span>
                    </div>
                    {use && (
                      <select
                        value={use.effectiveness}
                        onChange={(event) =>
                          setEffect(
                            medication.id,
                            event.target
                              .value as MedicationUse["effectiveness"],
                          )
                        }
                        aria-label={`Wirkung von ${medication.name}`}
                      >
                        <option value="schlecht">schlecht</option>
                        <option value="mittel">mittel</option>
                        <option value="gut">gut</option>
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="inline-empty">Noch nichts angelegt.</p>
          )}
          <button
            type="button"
            className={`text-action ${alternative ? "blue" : ""} ${preventive ? "preventive" : ""}`}
            onClick={() => {
              setManageBack(preventive ? "day" : "pain");
              goTo("medications");
            }}
          >
            Medikation verwalten
          </button>
        </section>
        {kind === "Akut" && <TriggerPicker compact />}
      </>
    );
  }

  function renderPain() {
    const sectionGroups = painSectionDefinitions.map((section) => {
      const choices = painChoicesForSection(section.id);
      const direct = choices.filter((choice) =>
        visiblePainFields[section.id].includes(choice),
      );
      return {
        section,
        direct,
        additional: choices.filter((choice) => !direct.includes(choice)),
      };
    });
    const directGroups = sectionGroups.filter(
      (group) => group.direct.length > 0,
    );
    const additionalGroups = sectionGroups.filter(
      (group) => group.additional.length > 0,
    );
    const additionalCount = additionalGroups.reduce(
      (count, group) => count + group.additional.length,
      0,
    );
    const renderPainSection = (
      section: PainSectionId,
      choices: string[],
      additional = false,
    ) => {
      const label =
        painSectionDefinitions.find((definition) => definition.id === section)
          ?.title ?? "";
      const title = additional ? `${label} · weitere` : label;
      const key = `${section}-${additional ? "additional" : "direct"}`;
      if (section === "location")
        return (
          <YesNoRows
            key={key}
            title={title}
            values={draft.location}
            choices={choices}
            onChange={(location) => updateDraft({ location })}
          />
        );
      if (section === "characteristics")
        return (
          <YesNoRows
            key={key}
            title={title}
            values={draft.characteristics}
            choices={choices}
            onChange={(characteristics) => updateDraft({ characteristics })}
          />
        );
      if (section === "symptoms")
        return (
          <YesNoRows
            key={key}
            title={title}
            values={draft.symptoms}
            choices={choices}
            onChange={(symptoms) => updateDraft({ symptoms })}
          />
        );
      if (section === "aura")
        return (
          <YesNoRows
            key={key}
            title={title}
            values={draft.aura}
            choices={choices}
            onChange={(aura) => updateDraft({ aura })}
          />
        );
      if (section === "impacts")
        return (
          <YesNoRows
            key={key}
            title={title}
            values={draft.impacts}
            choices={choices}
            onChange={(impacts) => updateDraft({ impacts })}
          />
        );
      return null;
    };
    return (
      <>
        <Header
          title="Kopfschmerzen beschreiben"
          back="day"
          save={() => saveDay()}
        />
        <main className="page form-page pain-form">
          <section className="section-label">
            <h2>Schmerzdaten</h2>
          </section>
          <section className="slider-block">
            <div>
              <label htmlFor="intensity">Schmerzstärke</label>
              <strong>{draft.intensity} / 10</strong>
            </div>
            <input
              id="intensity"
              type="range"
              min="0"
              max="10"
              value={draft.intensity}
              onChange={(event) =>
                updateDraft({ intensity: Number(event.target.value) })
              }
            />
            <div className="range-ends">
              <span>0 · leicht</span>
              <span>10 · sehr stark</span>
            </div>
          </section>
          <section className="slider-block">
            <div>
              <label htmlFor="duration">Schmerzdauer</label>
              <strong>{draft.duration} Stunden</strong>
            </div>
            <input
              id="duration"
              type="range"
              min="0"
              max="24"
              value={draft.duration}
              onChange={(event) =>
                updateDraft({ duration: Number(event.target.value) })
              }
            />
            <div className="range-ends">
              <span>0 h</span>
              <span>24 h</span>
            </div>
          </section>
          <section className="section-label">
            <h2>Symptome und Auswirkungen</h2>
          </section>
          {directGroups.map((group) =>
            renderPainSection(group.section.id, group.direct),
          )}
          {additionalGroups.length > 0 && (
            <section className="more-pain-details">
              <button
                type="button"
                className="more-pain-toggle"
                onClick={() => setShowMorePainSections((current) => !current)}
                aria-expanded={showMorePainSections}
              >
                {showMorePainSections
                  ? "Weitere Angaben ausblenden"
                  : `Weitere Angaben (${additionalCount})`}
                <span>{showMorePainSections ? "⌃" : "⌄"}</span>
              </button>
              {showMorePainSections && (
                <div className="additional-pain-sections">
                  {additionalGroups.map((group) =>
                    renderPainSection(group.section.id, group.additional, true),
                  )}
                </div>
              )}
            </section>
          )}
          <MedicationList kind="Akut" title="Akutmedikation" />
          <MedicationList kind="Alternative" title="Alternative Medikation" />
          <div className="bottom-actions">
            <button
              type="button"
              className="quiet-button"
              onClick={() => goBack("day")}
            >
              Zurück
            </button>
            <button
              type="button"
              className="primary-action"
              onClick={() => saveDay()}
            >
              Fertig
            </button>
          </div>
        </main>
      </>
    );
  }

  function Bars({
    data,
    metric,
    color = "red",
  }: {
    data: MonthlySummary[];
    metric: "painDays" | "duration" | "intensity";
    color?: "red" | "blue" | "ink";
  }) {
    void color;
    if (metric === "painDays")
      return (
        <>
          <LineGraph data={data} metric="painDays" />
          {cycleSettings.enabled && (
            <section className="cycle-insight">
              <div className="cycle-intro">
                <div>
                  <strong>Zyklus & Kopfschmerztage</strong>
                  <span>
                    Schätzung aus {periodStarts.length} dokumentierten Perioden
                  </span>
                </div>
                <b>Ø {estimatedCycleLength} Tage</b>
              </div>
              {latestPeriodStart ? (
                <p>
                  Letzte Periode: {prettyDate(latestPeriodStart)} · nächste
                  Periode ca.{" "}
                  {prettyDate(
                    daysAfter(latestPeriodStart, estimatedCycleLength),
                  )}
                </p>
              ) : (
                <p>
                  Markiere im Kalender die Tage deiner Periode, um Phasen
                  auszuwerten.
                </p>
              )}
              <div className="phase-grid">
                {phaseStats.map((item) => (
                  <div key={item.phase}>
                    <span>{item.phase}</span>
                    <strong>{item.painDays}</strong>
                    <small>Kopfschmerztage</small>
                  </div>
                ))}
              </div>
              <small className="cycle-note">
                Phasen sind eine rechnerische Orientierung anhand deiner
                Einträge und keine medizinische Vorhersage.
              </small>
            </section>
          )}
        </>
      );
    if (metric === "intensity") {
      const impactRows = data.slice(-12).map((item) => {
        const inMonth = entries.filter((entry) =>
          entry.date.startsWith(monthKey(item.date)),
        );
        const count = (impact: string) =>
          inMonth.filter((entry) => entry.impacts.includes(impact)).length;
        return {
          label: item.label,
          work: count(workImpact),
          home: count("Haushalt / Freizeit ausgefallen"),
          doctor: count("Ambulant beim Arzt gewesen"),
          emergency: count("In der Notaufnahme gewesen"),
          hospital: count("Krankenhausaufenthalt über Nacht"),
        };
      });
      return (
        <>
          <LineGraph data={data} metric="intensity" />
          <section className="impact-tables">
            <div className="impact-table">
              <h4>Ausfälle nach Monat</h4>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Monat</th>
                      <th>Arbeit / Schule</th>
                      <th>Haushalt / Freizeit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impactRows.map((item) => (
                      <tr key={`absence-${item.label}`}>
                        <td>{item.label}</td>
                        <td>{item.work}</td>
                        <td>{item.home}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="impact-table">
              <h4>Arzt & medizinische Hilfe</h4>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Monat</th>
                      <th>Arztbesuch</th>
                      <th>Notaufnahme</th>
                      <th>Krankenhaus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impactRows.map((item) => (
                      <tr key={`care-${item.label}`}>
                        <td>{item.label}</td>
                        <td>{item.doctor}</td>
                        <td>{item.emergency}</td>
                        <td>{item.hospital}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      );
    }
    return <LineGraph data={data} metric={metric} />;
  }

  function renderStatistics() {
    const daysInMonth = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate();
    const maxTrigger = Math.max(1, ...triggerCounts.map(([, count]) => count));
    const heroCount = currentMonthPain.length;
    const heroLabel = statisticsFilters.length
      ? "Kopfschmerztage im Filter"
      : "Kopfschmerztage";
    return (
      <>
        <Header title="Statistik" />
        <main className="page statistics-page">
          <section className="month-control compact-control">
            <button type="button" onClick={() => shiftMonth(-1)}>
              ‹
            </button>
            <strong>{monthName(month)}</strong>
            <button type="button" onClick={() => shiftMonth(1)}>
              ›
            </button>
          </section>
          <details className="statistics-filters">
            <summary>
              <span>⌕</span>
              <strong>Filter & Ansicht</strong>
              <small>{filterSummary(statisticsFilters)}</small>
            </summary>
            <div className="statistics-filter-head">
              <span>Mehrere Filter lassen sich kombinieren.</span>
              {statisticsFilters.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setStatisticsFilters([]);
                    setSelectedTriggerAnalysis(null);
                  }}
                >
                  Alle zeigen
                </button>
              )}
            </div>
            <div className="statistics-filter-options">
              {entryFilterOptions.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={`${statisticsFilters.includes(option.id) ? "selected" : ""} filter-${option.id}`}
                  aria-pressed={statisticsFilters.includes(option.id)}
                  onClick={() => toggleEntryFilter(option.id, "statistics")}
                >
                  <i>{option.symbol}</i>
                  {option.label}
                </button>
              ))}
            </div>
          </details>
          <section className="stat-hero">
            <p>Dein Monatsüberblick</p>
            <strong>
              {heroCount}
              <small> / {daysInMonth}</small>
            </strong>
            <span>{heroLabel}</span>
            <div className="stat-progress">
              <i style={{ width: `${(heroCount / daysInMonth) * 100}%` }} />
            </div>
          </section>
          <section className="metric-grid">
            <article>
              <span>Ø Stärke</span>
              <strong>
                {currentMonthPain.length ? `${averageIntensity}` : "–"}
                <small>/10</small>
              </strong>
            </article>
            <article>
              <span>Akutmedikation</span>
              <strong>
                {medicationDays}
                <small> Tage</small>
              </strong>
            </article>
            <article>
              <span>Dokumentiert</span>
              <strong>
                {statisticsEntries.length}
                <small> Tage</small>
              </strong>
            </article>
          </section>
          <button
            className="report-open-button"
            type="button"
            onClick={() => goTo("report")}
          >
            <span>▤</span>
            <span>
              <strong>Ausführlichen Report öffnen</strong>
              <small>Diagramme, Jahresdaten, Therapien und PDF</small>
            </span>
            <b>›</b>
          </button>
          <section className="analysis-card trigger-analysis-card">
            <div className="section-heading">
              <div>
                <p>Auslöser</p>
                <h2>Trigger-Analyse</h2>
              </div>
              <span>an {triggerEntries.length} Tagen</span>
            </div>
            {triggerCounts.length ? (
              <>
                <p className="trigger-analysis-intro">
                  Tippe einen Trigger an. Die Auswertung zeigt dokumentierte
                  Zusammenhänge, keine medizinisch festgestellte Ursache.
                </p>
                <div className="bar-list">
                  {triggerCounts.slice(0, 6).map(([trigger, count]) => (
                    <button
                      type="button"
                      className={`bar-row trigger-analysis-row ${activeTriggerAnalysis?.trigger === trigger ? "selected" : ""}`}
                      key={trigger}
                      onClick={() => setSelectedTriggerAnalysis(trigger)}
                    >
                      <div>
                        <span>{trigger}</span>
                        <strong>{count}×</strong>
                      </div>
                      <i>
                        <b
                          style={{ width: `${(count / maxTrigger) * 100}%` }}
                        />
                      </i>
                    </button>
                  ))}
                </div>
                {activeTriggerAnalysis && (
                  <section className="trigger-detail" aria-live="polite">
                    <div>
                      <strong>{activeTriggerAnalysis.trigger}</strong>
                      <span>
                        {activeTriggerAnalysis.documentedDays
                          ? `${activeTriggerAnalysis.headacheDays} von ${activeTriggerAnalysis.documentedDays} dokumentierten Tagen mit Kopfschmerzen`
                          : "Kopfschmerzstatus noch nicht dokumentiert"}
                      </span>
                    </div>
                    <div className="trigger-detail-grid">
                      <span>
                        <b>{activeTriggerAnalysis.noHeadacheDays}</b> ohne
                        Kopfschmerzen
                      </span>
                      <span>
                        <b>
                          {activeTriggerAnalysis.painRate === null
                            ? "–"
                            : `${Math.round(activeTriggerAnalysis.painRate * 100)} %`}
                        </b>{" "}
                        Kopfschmerztage
                      </span>
                      <span>
                        <b>
                          {activeTriggerAnalysis.averageIntensity === null
                            ? "–"
                            : `${activeTriggerAnalysis.averageIntensity}/10`}
                        </b>{" "}
                        Ø Stärke
                      </span>
                      <span>
                        <b>
                          {activeTriggerAnalysis.averageDuration === null
                            ? "–"
                            : `${activeTriggerAnalysis.averageDuration} h`}
                        </b>{" "}
                        Ø Dauer
                      </span>
                    </div>
                    {activeTriggerAnalysis.comparedToBaseline !== null && (
                      <small>
                        {activeTriggerAnalysis.comparedToBaseline === 0
                          ? "Entspricht deinem bisherigen dokumentierten Durchschnitt."
                          : `${activeTriggerAnalysis.comparedToBaseline > 0 ? "+" : ""}${Math.round(activeTriggerAnalysis.comparedToBaseline * 100)} Prozentpunkte gegenüber deinem bisherigen dokumentierten Durchschnitt.`}
                      </small>
                    )}
                  </section>
                )}
              </>
            ) : (
              <Empty text="Sobald du Trigger einträgst, siehst du hier mögliche Muster." />
            )}
          </section>
          <section className="analysis-card">
            <div className="section-heading">
              <div>
                <p>Therapien</p>
                <h2>Wirkfenster</h2>
              </div>
            </div>
            {therapyResults.length ? (
              therapyResults.map((result) => (
                <div className="simple-stat" key={result.therapy.id}>
                  <span>{result.therapy.name}</span>
                  <strong>
                    {result.start
                      ? `${result.during} Tage im Wirkfenster`
                      : "Noch nicht eingetragen"}
                  </strong>
                </div>
              ))
            ) : (
              <Empty text="Vorbeugende Therapien lassen sich in den Einstellungen anlegen und danach am jeweiligen Tag markieren." />
            )}
          </section>
          <button
            className="export-button"
            type="button"
            onClick={exportCsv}
            disabled={!entries.length}
          >
            Rohdaten als CSV exportieren
          </button>
        </main>
      </>
    );
  }

  function renderTutorialWalkthrough() {
    const steps = [
      {
        title: "Hier startet dein Kalender",
        text: "Der markierte heutige Tag ist ein echter Kalendereintrag. Tippe ihn an, um zu dokumentieren.",
        action: "Hier klicken: Tag öffnen",
      },
      {
        title: "Kopfschmerzstatus wählen",
        text: "Oben im echten Tagesformular legst du fest, ob Kopfschmerzen da waren. Tippe für den Rundgang auf „Ja“.",
        action: "Weiter zu den Schmerzangaben",
      },
      {
        title: "Schmerzangaben ergänzen",
        text: "Stärke, Dauer, Symptome und Medikation sind genau hier. Tippe unten auf „Statistik“, wenn du die Auswertung sehen möchtest.",
        action: "Auswertung zeigen",
      },
      {
        title: "Muster sichtbar machen",
        text: "Hier findest du Filter, Triggerzusammenhänge und den ausführlichen Report. Der Rundgang speichert keinen Testeintrag.",
        action: "Weiter zur Einrichtung",
      },
    ] as const;
    const current = steps[tutorialPage];
    const previous = () =>
      tutorialPage === 0
        ? setSetupStep(0)
        : showTutorialStep((tutorialPage - 1) as 0 | 1 | 2 | 3);
    const advance = () =>
      tutorialPage === steps.length - 1
        ? setSetupStep(2)
        : showTutorialStep((tutorialPage + 1) as 0 | 1 | 2 | 3);
    return (
      <aside className="tutorial-coach" aria-labelledby="tutorial-title">
        <div className="tutorial-coach-top">
          <span>
            Rundgang · {tutorialPage + 1}/{steps.length}
          </span>
          <div
            className="tutorial-dots"
            aria-label={`Schritt ${tutorialPage + 1} von ${steps.length}`}
          >
            {steps.map((step, index) => (
              <i
                className={index === tutorialPage ? "active" : ""}
                key={step.title}
              />
            ))}
          </div>
        </div>
        <h2 id="tutorial-title">{current.title}</h2>
        <p>{current.text}</p>
        <div className="tutorial-coach-actions">
          <button type="button" className="quiet-button" onClick={previous}>
            Zurück
          </button>
          <button type="button" className="primary-action" onClick={advance}>
            {current.action}
          </button>
        </div>
        <button
          type="button"
          className="tutorial-skip"
          onClick={() => setSetupStep(2)}
        >
          Tutorial überspringen
        </button>
      </aside>
    );
  }

  function renderReport() {
    const comments = [...entries]
      .map((entry) => ({
        ...entry,
        dayComment: [
          entry.dayComment,
          entry.preventiveMedication
            ? `Vorbeugend: ${entry.preventiveMedication}`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
      }))
      .filter((entry) => entry.dayComment.trim() || entry.generalComment.trim())
      .sort((a, b) => b.date.localeCompare(a.date));
    const workRows = monthly12.filter((item) => item.unableToWork > 0);
    const maximumShare = Math.max(
      1,
      ...lastThreeMedicationShares.map((item) => item.percent),
    );
    return (
      <>
        <Header title="Ausführlicher Report" back="statistics" />
        <main className="page report-page">
          <section className="report-intro">
            <p>KopfKlar · persönlicher Bericht</p>
            <h2>Report & Verlauf</h2>
            <span>Letzte Aktualisierung: {prettyDate(today)}</span>
            <button type="button" className="pdf-button" onClick={printReport}>
              Als PDF speichern
            </button>
            <small>
              Öffnet den Druckdialog. Dort „Als PDF speichern“ auswählen.
            </small>
          </section>
          <section className="report-card">
            <div className="report-card-heading">
              <div>
                <p>Monatsansicht</p>
                <h3>Kopfschmerztage & Medikation</h3>
              </div>
              <span>letzte 12 Monate</span>
            </div>
            <Bars data={monthly12} metric="painDays" />
            <div className="report-key">
              <span>
                <i className="key-dot red" />
                Kopfschmerztage
              </span>
              <span>
                Medikationstage:{" "}
                {monthly12.reduce((sum, item) => sum + item.medicationDays, 0)}
              </span>
            </div>
          </section>
          <section className="report-card">
            <div className="report-card-heading">
              <div>
                <p>Medikamente & Wirkung</p>
                <h3>Verwendung und durchschnittliche Wirkung</h3>
              </div>
              <span>letzte 3 Monate</span>
            </div>
            <p className="effect-legend">
              <span>
                <i className="effect-dot bad" />
                schlecht · 1
              </span>
              <span>
                <i className="effect-dot medium" />
                mittel · 5
              </span>
              <span>
                <i className="effect-dot good" />
                gut · 10
              </span>
            </p>
            {lastThreeMedicationShares.length ? (
              <div className="share-bars medication-effect-bars">
                {lastThreeMedicationShares.map((item) => (
                  <div key={`${item.kind}-${item.name}`}>
                    <div>
                      <span>
                        {item.name}
                        <small
                          className={
                            item.kind === "Alternative"
                              ? "alternative-tag"
                              : "acute-tag"
                          }
                        >
                          {item.kind === "Alternative" ? "alternativ" : "akut"}
                        </small>
                      </span>
                      <strong>{item.percent}%</strong>
                    </div>
                    <i>
                      <b
                        style={{
                          width: `${(item.percent / maximumShare) * 100}%`,
                          backgroundColor: effectColor(item.averageEffect),
                        }}
                      />
                    </i>
                    <div className="effect-summary">
                      <small>
                        {item.count} Einnahme{item.count === 1 ? "" : "n"}
                      </small>
                      <strong
                        style={{ color: effectColor(item.averageEffect) }}
                      >
                        Ø Wirkung{" "}
                        {item.averageEffect.toLocaleString("de-DE", {
                          maximumFractionDigits: 1,
                        })}
                        /10 · {effectLabel(item.averageEffect)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="Noch keine Akut- oder Alternativmedikation in den letzten drei Monaten dokumentiert." />
            )}
          </section>
          <section className="report-card">
            <div className="report-card-heading">
              <div>
                <p>Gesamtdauer</p>
                <h3>Kopfschmerzdauer pro Monat</h3>
              </div>
              <span>Stunden · 12 Monate</span>
            </div>
            <Bars data={monthly12} metric="duration" color="blue" />
          </section>
          <section className="report-card">
            <div className="report-card-heading">
              <div>
                <p>Schmerzstärke</p>
                <h3>Durchschnittliche Stärke</h3>
              </div>
              <span>letzte 24 Monate</span>
            </div>
            <Bars data={monthly24} metric="intensity" color="ink" />
            <div className="report-key">
              <span>Skala von 0 bis 10</span>
              <span>Nur Monate mit Einträgen</span>
            </div>
          </section>
          <section className="report-card">
            <div className="report-card-heading">
              <div>
                <p>Vorbeugende Therapien</p>
                <h3>Schmerztage nach Therapie</h3>
              </div>
            </div>
            {therapyResults.length ? (
              <div className="therapy-results">
                {therapyResults.map((result) => (
                  <article key={result.therapy.id}>
                    <div>
                      <strong>{result.therapy.name}</strong>
                      <span>
                        Wirkzeit: {result.therapy.durationWeeks} Wochen
                        {result.start
                          ? ` · Start: ${prettyDate(result.start)}`
                          : ""}
                      </span>
                    </div>
                    {result.start ? (
                      <div className="therapy-comparison">
                        <span>
                          <b>{result.before}</b> davor
                        </span>
                        <i>→</i>
                        <span>
                          <b>{result.during}</b> im Wirkfenster
                        </span>
                      </div>
                    ) : (
                      <small>Zum Auswerten am Therapietag markieren.</small>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <Empty text="Lege im Profil eine Therapie mit Wirkzeit an. Wenn du sie am Starttag markierst, vergleicht der Report das Wirkfenster mit dem Zeitraum davor." />
            )}
          </section>
          <section className="report-card report-wide">
            <div className="report-card-heading">
              <div>
                <p>Jahrestabelle</p>
                <h3>Alle Kennzahlen der letzten 12 Monate</h3>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Monat</th>
                    <th>Schmerztage</th>
                    <th>Med.-Tage</th>
                    <th>Dauer</th>
                    <th>Ø Stärke</th>
                    <th>AU</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly12.map((item) => (
                    <tr key={monthKey(item.date)}>
                      <td>{item.label}</td>
                      <td>{item.painDays}</td>
                      <td>{item.medicationDays}</td>
                      <td>{item.duration} h</td>
                      <td>{item.intensity ?? "–"}</td>
                      <td>{item.unableToWork}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="report-card">
            <div className="report-card-heading">
              <div>
                <p>Arbeitsunfähigkeit</p>
                <h3>Ausfälle nach Monat</h3>
              </div>
            </div>
            {workRows.length ? (
              <div className="work-list">
                {workRows.map((item) => (
                  <div key={monthKey(item.date)}>
                    <span>{item.label}</span>
                    <strong>
                      {item.unableToWork} Tag
                      {item.unableToWork === 1 ? "" : "e"}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="Noch keine Arbeits- oder Schulausfälle dokumentiert." />
            )}
          </section>
          <section className="report-card comments-card">
            <div className="report-card-heading">
              <div>
                <p>Kommentare</p>
                <h3>Deine Notizen im Überblick</h3>
              </div>
              <span>{comments.length}</span>
            </div>
            {comments.length ? (
              <div className="comment-list">
                {comments.map((entry) => (
                  <article key={entry.date}>
                    <time>{prettyDate(entry.date)}</time>
                    {entry.dayComment && <p>{entry.dayComment}</p>}
                    {entry.generalComment && <p>{entry.generalComment}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <Empty text="Kommentare aus den Tagesansichten werden hier gesammelt." />
            )}
          </section>
        </main>
      </>
    );
  }

  function renderSettings() {
    return (
      <>
        <Header title="Einstellungen" />
        <main className="page settings-page">
          <section className="language-card settings-language">
            <div>
              <h2>Sprache</h2>
              <p>Wähle die Sprache der App.</p>
            </div>
            <div className="language-switch" aria-label="Sprache">
              <button
                type="button"
                className={language === "de" ? "selected" : ""}
                onClick={() => setLanguage("de")}
              >
                Deutsch
              </button>
              <button
                type="button"
                className={language === "en" ? "selected" : ""}
                onClick={() => setLanguage("en")}
              >
                Englisch
              </button>
            </div>
          </section>
          <section className="settings-group">
            <p className="settings-group-label">Dokumentation</p>
            <section className="settings-list">
              <button
                type="button"
                onClick={() => {
                  setManageBack("settings");
                  goTo("medications");
                }}
              >
                <span className="setting-icon">▣</span>
                <span>
                  <strong>Medikamente & Alternativen</strong>
                  <small>
                    Schmerzmittel, Ingwertee, Cola und weitere Maßnahmen
                  </small>
                </span>
                <b>›</b>
              </button>
              <button type="button" onClick={() => goTo("pain-fields")}>
                <span className="setting-icon field-icon">☷</span>
                <span>
                  <strong>Schmerzangaben</strong>
                  <small>
                    Lege fest, welche Angaben beim Schmerzformular direkt
                    sichtbar sind
                  </small>
                </span>
                <b>›</b>
              </button>
              <button
                type="button"
                onClick={() => {
                  setManageBack("settings");
                  goTo("therapies");
                }}
              >
                <span className="setting-icon blue-icon">◌</span>
                <span>
                  <strong>Vorbeugende Therapien</strong>
                  <small>
                    z. B. Botox mit individuell definierter Wirkzeit
                  </small>
                </span>
                <b>›</b>
              </button>
              <button
                type="button"
                onClick={() => {
                  setManageBack("settings");
                  goTo("triggers");
                }}
              >
                <span className="setting-icon">✦</span>
                <span>
                  <strong>Trigger</strong>
                  <small>Mögliche Auslöser für jeden Kalendertag</small>
                </span>
                <b>›</b>
              </button>
            </section>
          </section>
          <section className="settings-group">
            <p className="settings-group-label">Auswertung</p>
            <section className="settings-list">
              <button type="button" onClick={() => goTo("report")}>
                <span className="setting-icon">▤</span>
                <span>
                  <strong>Ausführlicher Report</strong>
                  <small>Jahresübersicht mit Diagrammen und PDF</small>
                </span>
                <b>›</b>
              </button>
            </section>
          </section>
          <section className="settings-group">
            <p className="settings-group-label">App & Daten</p>
            <section className="settings-list">
              <button type="button" onClick={() => goTo("personal")}>
                <span className="setting-icon personal-icon">◐</span>
                <span>
                  <strong>Persönliches & Erinnerungen</strong>
                  <small>Zyklus, Sprache und tägliche Erinnerung</small>
                </span>
                <b>›</b>
              </button>
              <button type="button" onClick={() => goTo("data")}>
                <span className="setting-icon import-icon">⇧</span>
                <span>
                  <strong>Daten & Backups</strong>
                  <small>Sichern, wiederherstellen und exportieren</small>
                </span>
                <b>›</b>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAppearanceTab("design");
                  goTo("appearance");
                }}
              >
                <span className="setting-icon appearance-icon">◒</span>
                <span>
                  <strong>Darstellung & KopfKlar</strong>
                  <small>Farben, Darkmode, Unterstützung und Lizenzen</small>
                </span>
                <b>›</b>
              </button>
            </section>
          </section>
        </main>
      </>
    );
  }

  function renderPersonal() {
    const nativeNotifications = Capacitor.isNativePlatform();
    return (
      <>
        <Header title="Persönliches & Erinnerungen" back="settings" />
        <main className="page manage-page personal-page">
          <section className="cycle-card personal-card">
            <div>
              <h2>Zyklus dokumentieren</h2>
              <p>
                Aktiviert Periodenangaben, Zyklus-Trigger und die
                Zyklusauswertung. Du kannst dies später jederzeit ändern.
              </p>
            </div>
            <Switch
              value={cycleSettings.enabled}
              onChange={(enabled) => setCycleSettings({ enabled })}
            />
          </section>
          <section className="app-lock-card">
            <div className="app-lock-heading">
              <span className="notification-icon">⌁</span>
              <div>
                <h2>App mit Code schützen</h2>
                <p>
                  Beim Öffnen und nach der Rückkehr zur App wird ein 4- bis
                  8-stelliger Code abgefragt.
                </p>
              </div>
            </div>
            {appLock.enabled ? (
              <div className="app-lock-active">
                <strong>Code-Sperre ist aktiv</strong>
                <button
                  type="button"
                  className="notification-disable"
                  onClick={disableAppLock}
                >
                  Deaktivieren
                </button>
              </div>
            ) : (
              <div className="app-lock-create">
                <label>
                  Neuer Code
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    minLength={4}
                    maxLength={8}
                    value={newCode}
                    onChange={(event) =>
                      setNewCode(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="4–8 Ziffern"
                  />
                </label>
                <label>
                  Code wiederholen
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    minLength={4}
                    maxLength={8}
                    value={newCodeRepeat}
                    onChange={(event) =>
                      setNewCodeRepeat(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Code wiederholen"
                  />
                </label>
                <button
                  type="button"
                  className="blue-action"
                  onClick={() => void enableAppLock()}
                >
                  Code aktivieren
                </button>
              </div>
            )}
            {lockError && !lockVisible && (
              <small className="lock-error">{lockError}</small>
            )}
            <small>
              Hinweis: Der Code schützt die App-Oberfläche. Bereits lokal
              gespeicherte Daten werden dadurch nicht verschlüsselt.
            </small>
          </section>
          <section className="notification-card">
            <div>
              <span className="notification-icon">♧</span>
              <div>
                <h2>
                  {reminders.enabled
                    ? "Tägliche Erinnerung aktiv"
                    : "Tägliche Erinnerung"}
                </h2>
                <p>
                  Erinnert dich täglich daran, deinen Kopfschmerzkalender
                  auszufüllen.
                </p>
              </div>
            </div>
            <label>
              Uhrzeit
              <input
                type="time"
                value={reminders.time}
                onChange={(event) =>
                  void updateReminderTime(event.target.value)
                }
              />
            </label>
            <div className="notification-actions">
              <button
                type="button"
                className="blue-action"
                onClick={reminders.enabled ? testReminder : enableReminders}
              >
                {reminders.enabled
                  ? "Benachrichtigungen testen"
                  : "Benachrichtigungen erlauben"}
              </button>
              {reminders.enabled && (
                <button
                  type="button"
                  className="notification-disable"
                  onClick={() => void disableReminders()}
                >
                  Deaktivieren
                </button>
              )}
            </div>
            <small>
              {nativeNotifications
                ? "Die Erinnerung wird direkt von Android geplant und funktioniert auch, wenn KopfKlar geschlossen ist."
                : "Im Browser kann die Erinnerung nur funktionieren, solange KopfKlar oder der Browser aktiv ist. In der Android-App wird sie zuverlässig geplant."}
            </small>
          </section>
        </main>
      </>
    );
  }

  function renderAppearance() {
    const paletteOptions: {
      id: PresetPainPalette;
      label: string;
      description: string;
    }[] = [
      {
        id: "rose",
        label: "Rosa",
        description: "von hellem Rosa bis Himbeere",
      },
      {
        id: "sunset",
        label: "Gelb → Rosa",
        description: "von Sonnengelb bis Rosa",
      },
      {
        id: "violet",
        label: "Violett",
        description: "von Flieder bis Pflaume",
      },
    ];
    return (
      <>
        <Header title="Darstellung & KopfKlar" back="settings" />
        <main className="page manage-page appearance-page">
          <div
            className="appearance-tabs"
            role="tablist"
            aria-label="Darstellung und Informationen"
          >
            <button
              type="button"
              role="tab"
              aria-selected={appearanceTab === "design"}
              className={appearanceTab === "design" ? "selected" : ""}
              onClick={() => setAppearanceTab("design")}
            >
              Darstellung
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={appearanceTab === "about"}
              className={appearanceTab === "about" ? "selected" : ""}
              onClick={() => setAppearanceTab("about")}
            >
              Über KopfKlar
            </button>
          </div>
          {appearanceTab === "design" ? (
            <>
              <section className="appearance-card">
                <div>
                  <h2>Darkmode</h2>
                  <p>Ruhige Nachtfarben, die Augen und Kontrast schonen.</p>
                </div>
                <Switch
                  value={appearance.darkMode}
                  onChange={(darkMode) =>
                    setAppearance((current) => ({ ...current, darkMode }))
                  }
                />
              </section>
              <section className="appearance-card palette-card">
                <div>
                  <h2>Schmerzfarben</h2>
                  <p>
                    Wähle eine Skala für leichte bis starke Schmerzen – getrennt
                    vom Periodenrot.
                  </p>
                </div>
                <div className="palette-options">
                  {paletteOptions.map((palette) => (
                    <button
                      key={palette.id}
                      type="button"
                      className={
                        appearance.painPalette === palette.id ? "selected" : ""
                      }
                      onClick={() =>
                        setAppearance((current) => ({
                          ...current,
                          painPalette: palette.id,
                        }))
                      }
                      aria-label={`Farbskala ${palette.label}: ${palette.description}`}
                    >
                      <i
                        style={{
                          background: `linear-gradient(135deg, ${painPalettes[palette.id][0]}, ${painPalettes[palette.id][2]}, ${painPalettes[palette.id][4]})`,
                        }}
                      />
                      <span>{palette.label}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={
                      appearance.painPalette === "custom" ? "selected" : ""
                    }
                    onClick={() =>
                      setAppearance((current) => ({
                        ...current,
                        painPalette: "custom",
                      }))
                    }
                    aria-label="Eigene Farbskala"
                  >
                    <i
                      style={{
                        background: `linear-gradient(135deg, ${appearance.customPainColors[0]}, ${appearance.customPainColors[2]}, ${appearance.customPainColors[4]})`,
                      }}
                    />
                    <span>Eigene</span>
                  </button>
                </div>
                <details className="custom-palette">
                  <summary>Eigene Farbskala anpassen</summary>
                  <p>
                    Lege fünf Farbstufen fest. Beim Ändern wird diese Skala
                    sofort verwendet.
                  </p>
                  <div className="custom-color-grid">
                    {appearance.customPainColors.map((color, index) => (
                      <label key={index}>
                        <span>{index + 1}</span>
                        <input
                          type="color"
                          value={color}
                          onChange={(event) =>
                            setAppearance((current) => {
                              const customPainColors = [
                                ...current.customPainColors,
                              ] as PainScale;
                              customPainColors[index] = event.target.value;
                              return {
                                ...current,
                                painPalette: "custom",
                                customPainColors,
                              };
                            })
                          }
                          aria-label={`Eigene Schmerzfarbe Stufe ${index + 1}`}
                        />
                      </label>
                    ))}
                  </div>
                </details>
              </section>
              <p className="appearance-note">
                Die Einstellung verändert nur die Darstellung deines Kalenders,
                nicht deine gespeicherten Daten.
              </p>
            </>
          ) : (
            <>
              <section className="support-card">
                <span className="support-mark">
                  <KopfKlarMark />
                </span>
                <div>
                  <h2>KopfKlar ist quelloffen</h2>
                  <p>
                    Wenn dir die App gefällt und du die Möglichkeit hast, freue
                    ich mich über Unterstützung. Damit kann ich die App
                    weiterentwickeln – zum Beispiel für ein mögliches Login und
                    sicheres Speichern auf einem Server.
                  </p>
                </div>
                <button
                  type="button"
                  className="primary-action blue-action"
                  onClick={() => void supportKopfKlar()}
                >
                  Auf GitHub unterstützen
                </button>
                <button
                  type="button"
                  className="text-action blue"
                  onClick={() => {
                    setSupportReminder((current) => ({
                      ...current,
                      disabled: false,
                      dismissedAt: "",
                    }));
                    setSupportPromptVisible(true);
                  }}
                >
                  Unterstützungshinweis jetzt zeigen
                </button>
                {!supportReminder.disabled && (
                  <button
                    type="button"
                    className="text-action muted-action"
                    onClick={() => dismissSupportPrompt(true)}
                  >
                    Hinweis nicht mehr automatisch zeigen
                  </button>
                )}
              </section>
              <section className="legal-card">
                <h2>Quelloffen & Lizenzen</h2>
                <p>
                  KopfKlar ist ein lokales, quelloffenes Projekt unter der
                  PolyForm Noncommercial License 1.0.0. Nicht-kommerzielle
                  Nutzung ist unter den Lizenzbedingungen möglich; für
                  kommerzielle Nutzung ist eine separate Erlaubnis erforderlich.
                </p>
                <a
                  href="https://github.com/MarcSchlicker/KopfKlar"
                  target="_blank"
                  rel="noreferrer"
                >
                  Quellcode, README und vollständige Lizenzhinweise ansehen
                </a>
                <small>
                  Das Layout und die Auswertungsstruktur sind eigenständig
                  umgesetzt und nur funktional von der DMKG-App inspiriert;
                  KopfKlar ist kein offizielles DMKG-Produkt.
                </small>
              </section>
            </>
          )}
        </main>
      </>
    );
  }

  function renderData() {
    return (
      <>
        <Header title="Daten & Backups" back="settings" />
        <main className="page manage-page data-page">
          <input
            ref={backupFileInput}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={readKopfklarBackup}
          />
          <section
            className={`backup-card ${backupReminderDue ? "backup-due" : ""}`}
          >
            <div className="backup-card-heading">
              <span className="backup-icon">↥</span>
              <div>
                <h2>Datensicherung</h2>
                <p>
                  Erstellt eine vollständige Sicherung deiner lokalen Einträge
                  und Einstellungen als JSON-Datei.
                </p>
              </div>
            </div>
            {backupReminderDue && (
              <strong className="backup-due-note">Zeit für ein Backup</strong>
            )}
            <button
              type="button"
              className="primary-action backup-export"
              onClick={exportBackup}
            >
              Backup teilen / speichern
            </button>
            <div className="backup-reminder-row">
              <span>Regelmäßig an Backup erinnern</span>
              <Switch
                value={backupSettings.enabled}
                onChange={(enabled) =>
                  setBackupSettings((current) => ({ ...current, enabled }))
                }
              />
            </div>
            {backupSettings.enabled && (
              <div className="backup-interval">
                <span>Intervall in Wochen</span>
                <label className="backup-week-input">
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={backupSettings.intervalWeeks}
                    onChange={(event) =>
                      setBackupSettings((current) => ({
                        ...current,
                        intervalWeeks: Math.max(
                          1,
                          Math.min(52, Number(event.target.value) || 1),
                        ),
                      }))
                    }
                  />
                  <span>
                    {backupSettings.intervalWeeks === 1 ? "Woche" : "Wochen"}
                  </span>
                </label>
                <small>Standard: jede Woche.</small>
              </div>
            )}
            <small className="backup-date">
              Letztes Backup:{" "}
              {backupSettings.lastBackupDate
                ? prettyDate(backupSettings.lastBackupDate)
                : "Noch kein Backup erstellt."}
            </small>
          </section>
          <section className="settings-group">
            <p className="settings-group-label">Import & Export</p>
            <section className="settings-list data-actions">
              <button
                type="button"
                onClick={() => backupFileInput.current?.click()}
              >
                <span className="setting-icon restore-icon">↶</span>
                <span>
                  <strong>KopfKlar-Backup importieren</strong>
                  <small>Eigene Sicherungsdatei wiederherstellen</small>
                </span>
                <b>›</b>
              </button>
              <button
                type="button"
                onClick={() => {
                  setManageBack("data");
                  goTo("import");
                }}
              >
                <span className="setting-icon import-icon">⇧</span>
                <span>
                  <strong>DMKG-Bericht importieren</strong>
                  <small>DMKG-PDF lokal übernehmen</small>
                </span>
                <b>›</b>
              </button>
              <button
                type="button"
                onClick={exportCsv}
                disabled={!entries.length}
              >
                <span className="setting-icon">⇩</span>
                <span>
                  <strong>Rohdaten als CSV</strong>
                  <small>CSV-Datei für den Arzttermin herunterladen</small>
                </span>
                <b>›</b>
              </button>
            </section>
          </section>
          <details className="danger-disclosure">
            <summary>Erweiterte Datenoptionen</summary>
            <div>
              <strong>Werkseinstellungen zurücksetzen</strong>
              <p>
                Löscht alle Kalendereinträge, Medikamente, Trigger und
                persönlichen Einstellungen auf diesem Gerät. Danach startet
                KopfKlar wieder mit Tutorial und Backup-Abfrage.
              </p>
              <button type="button" onClick={resetToFactorySettings}>
                KopfKlar vollständig zurücksetzen
              </button>
            </div>
          </details>
        </main>
      </>
    );
  }

  function renderPainFields() {
    const updateSection = (section: PainSectionId, choices: string[]) =>
      setVisiblePainFields((current) => ({ ...current, [section]: choices }));
    return (
      <>
        <Header title="Schmerzangaben" back="settings" />
        <main className="page manage-page pain-fields-page">
          <p className="intro">
            Wähle pro Bereich, was sofort sichtbar ist. Nicht ausgewählte
            Angaben bleiben unter „Weitere Angaben“ erreichbar.
          </p>
          <section className="pain-field-list">
            {painSectionDefinitions.map((section) => {
              const choices = painChoicesForSection(section.id);
              const direct = choices.filter((choice) =>
                visiblePainFields[section.id].includes(choice),
              );
              const allVisible = direct.length === choices.length;
              const expanded = expandedPainSections.includes(section.id);
              return (
                <article className="pain-field-group" key={section.id}>
                  <div className="pain-field-group-head">
                    <button
                      type="button"
                      className={
                        allVisible
                          ? "pain-group-main selected"
                          : "pain-group-main"
                      }
                      onClick={() =>
                        updateSection(section.id, allVisible ? [] : choices)
                      }
                    >
                      <i>{allVisible ? "✓" : direct.length ? "–" : ""}</i>
                      <span>
                        <strong>{section.title}</strong>
                        <small>
                          {direct.length} / {choices.length} Angaben direkt
                          sichtbar
                        </small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="pain-group-expand"
                      onClick={() =>
                        setExpandedPainSections((current) =>
                          expanded
                            ? current.filter((id) => id !== section.id)
                            : [...current, section.id],
                        )
                      }
                      aria-label={`${section.title} einzeln einstellen`}
                      aria-expanded={expanded}
                    >
                      {expanded ? "⌃" : "⌄"}
                    </button>
                  </div>
                  {expanded && (
                    <div className="pain-field-items">
                      {choices.map((choice) => {
                        const visible = direct.includes(choice);
                        return (
                          <button
                            type="button"
                            key={choice}
                            className={
                              visible
                                ? "pain-field-option selected"
                                : "pain-field-option"
                            }
                            onClick={() =>
                              updateSection(
                                section.id,
                                visible
                                  ? direct.filter((item) => item !== choice)
                                  : [...direct, choice],
                              )
                            }
                          >
                            <i>{visible ? "✓" : ""}</i>
                            <span>
                              <strong>{choice}</strong>
                            </span>
                            <b>
                              {visible ? "Direkt anzeigen" : "Weitere Angaben"}
                            </b>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        </main>
      </>
    );
  }

  function renderImport() {
    const painDays =
      dmkgImport?.entries.filter((entry) => entry.headache).length ?? 0;
    return (
      <>
        <Header title="DMKG-Daten importieren" back={manageBack} />
        <main className="page manage-page import-page">
          <input
            ref={dmkgFileInput}
            className="visually-hidden"
            type="file"
            accept="application/pdf,.pdf"
            onChange={readDmkgReport}
          />
          {!dmkgImport ? (
            <section className="import-card">
              <span className="import-symbol">⇧</span>
              <h2>DMKG-PDF auswählen</h2>
              <p>
                Wähle den heruntergeladenen Bericht „Ihr Kopfschmerztagebuch“
                aus. Die PDF wird ausschließlich auf diesem Gerät ausgewertet
                und nicht hochgeladen.
              </p>
              <button
                type="button"
                className="primary-action blue-action"
                onClick={() => dmkgFileInput.current?.click()}
                disabled={isReadingDmkg}
              >
                {isReadingDmkg
                  ? "DMKG-Import wird ausgewertet …"
                  : "DMKG-PDF auswählen"}
              </button>
            </section>
          ) : (
            <>
              <section className="import-card import-preview">
                <p>Importvorschau</p>
                <h2>{dmkgImport.sourceName}</h2>
                <div className="import-summary">
                  <span>
                    <strong>{dmkgImport.entries.length}</strong>Ausgelesene Tage
                  </span>
                  <span>
                    <strong>{painDays}</strong>Kopfschmerztage
                  </span>
                  <span>
                    <strong>{dmkgImport.medications.length}</strong>Medikamente
                  </span>
                </div>
                <small>
                  Nur dokumentierte Tage werden übernommen. Vorhandene
                  KopfKlar-Einträge mit demselben Datum werden ersetzt.
                </small>
              </section>
              <section className="import-days">
                {dmkgImport.entries.map((entry) => (
                  <article key={entry.date}>
                    <time>{prettyDate(entry.date)}</time>
                    <div>
                      <strong>
                        {entry.headache
                          ? `Kopfschmerzen · Stärke ${entry.intensity}/10 · ${entry.duration} h`
                          : "Keine Kopfschmerzen"}
                      </strong>
                      {entry.medications.length ? (
                        <small>
                          {entry.medications
                            .map(
                              (use) =>
                                dmkgImport.medications.find(
                                  (medication) =>
                                    medication.id === use.medicationId,
                                )?.name,
                            )
                            .filter(Boolean)
                            .join(", ")}
                        </small>
                      ) : null}
                    </div>
                  </article>
                ))}
              </section>
              <div className="import-actions">
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => setDmkgImport(null)}
                >
                  Import abbrechen
                </button>
                <button
                  type="button"
                  className="primary-action blue-action"
                  onClick={applyDmkgImport}
                >
                  Übernehmen
                </button>
              </div>
              <button
                type="button"
                className="text-action blue import-replace"
                onClick={() => {
                  setDmkgImport(null);
                  window.setTimeout(() => dmkgFileInput.current?.click(), 0);
                }}
              >
                Andere PDF auswählen
              </button>
            </>
          )}
        </main>
      </>
    );
  }

  function renderMedications() {
    return (
      <>
        <Header title="Medikamente" back={manageBack} />
        <main className="page manage-page">
          <p className="intro">
            Akutmedikation ist dunkelrot, alternative Maßnahmen wie Ingwertee
            oder Cola sind blau. Präventive Medikation wird als eigene weiße
            Kategorie geführt.
          </p>
          <button
            type="button"
            className="merge-medications"
            onClick={mergeDuplicateMedications}
          >
            Doppelte Medikamente zusammenführen
          </button>
          <section className="manage-list">
            {medications.map((medication) => (
              <article
                key={medication.id}
                className={`${medication.kind === "Alternative" ? "alternative-item" : ""} ${medication.kind === "Präventiv" ? "preventive-item" : ""}`}
              >
                <span
                  className={`kind-label ${medication.kind === "Alternative" ? "alternative" : medication.kind === "Präventiv" ? "preventive" : "acute"}`}
                >
                  {medication.kind}
                </span>
                <div>
                  <strong>{medication.name}</strong>
                  <small>{medication.dose || "Menge offen"}</small>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setMedications((current) =>
                      current.filter((item) => item.id !== medication.id),
                    )
                  }
                  aria-label={`${medication.name} löschen`}
                >
                  ×
                </button>
              </article>
            ))}
          </section>
          <section className="add-panel">
            <h2>Neue Medikation</h2>
            <label>
              Name
              <input
                value={newMedication.name}
                onChange={(event) =>
                  setNewMedication((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="z. B. Amitriptylin"
              />
            </label>
            <label>
              Dosis / Menge
              <input
                value={newMedication.dose}
                onChange={(event) =>
                  setNewMedication((current) => ({
                    ...current,
                    dose: event.target.value,
                  }))
                }
                placeholder="z. B. 1 Tablette oder 400 mg"
              />
            </label>
            <div className="segmented medication-kinds">
              <button
                type="button"
                className={
                  newMedication.kind === "Akut" ? "selected acute" : ""
                }
                onClick={() =>
                  setNewMedication((current) => ({ ...current, kind: "Akut" }))
                }
              >
                Akut · dunkelrot
              </button>
              <button
                type="button"
                className={
                  newMedication.kind === "Alternative" ? "selected blue" : ""
                }
                onClick={() =>
                  setNewMedication((current) => ({
                    ...current,
                    kind: "Alternative",
                  }))
                }
              >
                Alternativ · blau
              </button>
              <button
                type="button"
                className={
                  newMedication.kind === "Präventiv"
                    ? "selected preventive"
                    : ""
                }
                onClick={() =>
                  setNewMedication((current) => ({
                    ...current,
                    kind: "Präventiv",
                  }))
                }
              >
                Präventiv · weiß
              </button>
            </div>
            <button
              type="button"
              className="primary-action"
              onClick={() => {
                const name = newMedication.name.trim();
                const dose = newMedication.dose.trim();
                if (!name) return;
                const candidate = { name, dose, kind: newMedication.kind };
                if (
                  medications.some(
                    (medication) =>
                      medicationIdentity(medication) ===
                      medicationIdentity(candidate),
                  )
                ) {
                  setNotice("Dieses Medikament ist bereits vorhanden.");
                  window.setTimeout(() => setNotice(""), 2600);
                  return;
                }
                setMedications((current) => [
                  ...current,
                  { id: crypto.randomUUID(), ...candidate },
                ]);
                setNewMedication({ name: "", dose: "", kind: "Akut" });
              }}
            >
              Hinzufügen
            </button>
          </section>
        </main>
      </>
    );
  }

  function renderTherapies() {
    return (
      <>
        <Header title="Vorbeugende Therapien" back={manageBack} />
        <main className="page manage-page">
          <p className="intro">
            Lege eine Therapie mit der erwarteten Wirkzeit an. Markiere sie
            anschließend am jeweiligen Start- oder Erneuerungstag im Kalender.
          </p>
          <section className="manage-list">
            {therapies.length ? (
              therapies.map((therapy) => (
                <article key={therapy.id} className="therapy-item">
                  <span className="kind-label preventive">Therapie</span>
                  <div>
                    <strong>{therapy.name}</strong>
                    <small>Wirkzeit: {therapy.durationWeeks} Wochen</small>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setTherapies((current) =>
                        current.filter((item) => item.id !== therapy.id),
                      )
                    }
                    aria-label={`${therapy.name} löschen`}
                  >
                    ×
                  </button>
                </article>
              ))
            ) : (
              <Empty text="Zum Beispiel: Botox, CGRP-Antikörper, Physiotherapie oder Ausdauertraining." />
            )}
          </section>
          <section className="add-panel">
            <h2>Therapie anlegen</h2>
            <label>
              Bezeichnung
              <input
                value={newTherapy.name}
                onChange={(event) =>
                  setNewTherapy((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="z. B. Botox"
              />
            </label>
            <label>
              Erwartete Wirkzeit in Wochen
              <input
                type="number"
                min="1"
                max="104"
                value={newTherapy.durationWeeks}
                onChange={(event) =>
                  setNewTherapy((current) => ({
                    ...current,
                    durationWeeks: Number(event.target.value) || 1,
                  }))
                }
              />
            </label>
            <button
              type="button"
              className="primary-action blue-action"
              onClick={() => {
                const name = newTherapy.name.trim();
                if (!name) return;
                setTherapies((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    name,
                    durationWeeks: newTherapy.durationWeeks,
                  },
                ]);
                setNewTherapy({ name: "", durationWeeks: 12 });
              }}
            >
              Therapie hinzufügen
            </button>
          </section>
        </main>
      </>
    );
  }

  function renderTriggers() {
    const shownTriggers = triggers.filter(
      (trigger) => cycleSettings.enabled || trigger !== "Zyklus",
    );
    return (
      <>
        <Header title="Trigger" back={manageBack} />
        <main className="page manage-page">
          <p className="intro">
            Diese möglichen Auslöser kannst du an jedem Kalendertag markieren –
            unabhängig davon, ob Kopfschmerzen aufgetreten sind.
          </p>
          <section className="trigger-manage">
            {shownTriggers.map((trigger) => (
              <div key={trigger}>
                <span>{trigger}</span>
                <button
                  type="button"
                  onClick={() =>
                    setTriggers((current) =>
                      current.filter((item) => item !== trigger),
                    )
                  }
                  aria-label={`${trigger} löschen`}
                >
                  ×
                </button>
              </div>
            ))}
          </section>
          <section className="add-panel">
            <h2>Eigenen Trigger hinzufügen</h2>
            <label>
              Bezeichnung
              <input
                value={newTrigger}
                onChange={(event) => setNewTrigger(event.target.value)}
                placeholder="z. B. Flüssigkeitsmangel"
              />
            </label>
            <button
              type="button"
              className="primary-action"
              onClick={() => {
                const cleaned = newTrigger.trim();
                if (cleaned && !triggers.includes(cleaned)) {
                  setTriggers((current) => [...current, cleaned]);
                  setNewTrigger("");
                }
              }}
            >
              Trigger hinzufügen
            </button>
          </section>
        </main>
      </>
    );
  }

  return (
    <div
      className={`app-shell ${appearance.darkMode ? "dark-mode" : ""} ${!setupComplete && setupStep === 1 ? `tutorial-active tutorial-step-${tutorialPage}` : ""}`}
    >
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {screen === "calendar" && renderCalendar()}
      {screen === "day" && renderDay()}
      {screen === "pain" && renderPain()}
      {screen === "statistics" && renderStatistics()}
      {screen === "report" && renderReport()}
      {screen === "settings" && renderSettings()}
      {screen === "personal" && renderPersonal()}
      {screen === "appearance" && renderAppearance()}
      {screen === "data" && renderData()}
      {screen === "pain-fields" && renderPainFields()}
      {screen === "import" && renderImport()}
      {screen === "medications" && renderMedications()}
      {screen === "triggers" && renderTriggers()}
      {screen === "therapies" && renderTherapies()}
      <nav className="bottom-nav" aria-label="Hauptnavigation">
        <button
          type="button"
          className={
            screen === "calendar" || screen === "day" || screen === "pain"
              ? "active"
              : ""
          }
          onClick={() => goTo("calendar", { reset: true })}
        >
          <span>▦</span>Kalender
        </button>
        <button
          type="button"
          className={
            screen === "statistics" || screen === "report" ? "active" : ""
          }
          onClick={() => goTo("statistics", { reset: true })}
        >
          <span>▥</span>Statistik
        </button>
        <button
          type="button"
          className={
            screen === "settings" ||
            screen === "personal" ||
            screen === "appearance" ||
            screen === "data" ||
            screen === "pain-fields" ||
            screen === "import" ||
            screen === "medications" ||
            screen === "triggers" ||
            screen === "therapies"
              ? "active"
              : ""
          }
          onClick={() => goTo("settings", { reset: true })}
        >
          <span>⚙</span>Einstellungen
        </button>
      </nav>
      {supportPromptVisible && setupComplete && (
        <aside
          className="support-prompt"
          role="dialog"
          aria-labelledby="support-prompt-title"
        >
          <button
            type="button"
            className="support-close"
            onClick={() => dismissSupportPrompt()}
            aria-label="Unterstützungshinweis schließen"
          >
            ×
          </button>
          <span className="support-prompt-mark">
            <KopfKlarMark />
          </span>
          <div>
            <h2 id="support-prompt-title">KopfKlar ist quelloffen</h2>
            <p>
              Wenn dir die App gefällt und du die Möglichkeit hast, freue ich
              mich über deine Unterstützung. So kann ich KopfKlar
              weiterentwickeln.
            </p>
          </div>
          <div className="support-prompt-actions">
            <button
              type="button"
              className="support-link"
              onClick={() => void supportKopfKlar()}
            >
              Unterstützen
            </button>
            <button type="button" onClick={remindSupportInMonth}>
              In einem Monat erinnern
            </button>
            <button type="button" onClick={() => dismissSupportPrompt(true)}>
              Nicht mehr erinnern
            </button>
          </div>
        </aside>
      )}
      {hydrated &&
        !setupComplete &&
        setupStep === 1 &&
        renderTutorialWalkthrough()}
      {hydrated && !setupComplete && setupStep !== 1 && (
        <div
          className="onboarding-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="setup-title"
        >
          <section className="onboarding-card">
            <input
              ref={setupBackupFileInput}
              className="visually-hidden"
              type="file"
              accept="application/json,.json"
              onChange={readKopfklarBackup}
            />
            {setupStep === 0 ? (
              <>
                <span className="onboarding-logo">
                  <KopfKlarMark />
                </span>
                <p className="onboarding-eyebrow">KOPFKLAR</p>
                <h1 id="setup-title">Willkommen bei KopfKlar</h1>
                <p>
                  Hast du bereits eine KopfKlar-Sicherung? Du kannst sie direkt
                  wiederherstellen oder mit einem leeren Kalender starten.
                </p>
                <div className="onboarding-backup-actions">
                  <button
                    type="button"
                    className="primary-action onboarding-finish"
                    onClick={() => setupBackupFileInput.current?.click()}
                  >
                    Ja, Backup importieren
                  </button>
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={() => setSetupStep(1)}
                  >
                    Nein, neu beginnen
                  </button>
                </div>
                <button
                  type="button"
                  className="text-action onboarding-skip"
                  onClick={() => setSetupStep(2)}
                >
                  Tutorial überspringen
                </button>
              </>
            ) : setupStep === 1 ? (
              <>
                <span className="onboarding-logo">
                  <KopfKlarMark />
                </span>
                <p className="onboarding-eyebrow">TUTORIAL</p>
                <h1 id="setup-title">So funktioniert KopfKlar</h1>
                <p>
                  In weniger als einer Minute weißt du, wo du was einträgst.
                  Alles lässt sich später in den Einstellungen anpassen.
                </p>
                <ol className="tutorial-steps">
                  <li>
                    <b>1</b>
                    <div>
                      <strong>Tag dokumentieren</strong>
                      <small>
                        Tippe im Kalender auf einen Tag – auch ohne
                        Kopfschmerzen kannst du mögliche Trigger festhalten.
                      </small>
                    </div>
                  </li>
                  <li>
                    <b>2</b>
                    <div>
                      <strong>Schmerzen beschreiben</strong>
                      <small>
                        Bei „Ja“ öffnet sich die detaillierte Schmerzangabe mit
                        Stärke, Dauer und Symptomen.
                      </small>
                    </div>
                  </li>
                  <li>
                    <b>3</b>
                    <div>
                      <strong>Muster erkennen</strong>
                      <small>
                        Statistik und Report machen Verläufe, Medikamente und
                        Therapien sichtbar.
                      </small>
                    </div>
                  </li>
                </ol>
                <div className="onboarding-actions">
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={() => setSetupStep(0)}
                  >
                    Zurück
                  </button>
                  <button
                    type="button"
                    className="primary-action onboarding-finish"
                    onClick={() => setSetupStep(2)}
                  >
                    Weiter
                  </button>
                </div>
                <button
                  type="button"
                  className="text-action onboarding-skip"
                  onClick={() => setSetupStep(2)}
                >
                  Tutorial überspringen
                </button>
              </>
            ) : (
              <>
                <span className="onboarding-logo">
                  <KopfKlarMark />
                </span>
                <p className="onboarding-eyebrow">EINSTELLUNG 1 VON 1</p>
                <h1 id="setup-title">Zyklus dokumentieren?</h1>
                <p>
                  Diese Angabe ist optional und lässt sich später jederzeit ein-
                  oder ausschalten.
                </p>
                <div className="onboarding-cycle">
                  <div>
                    <strong>Zyklus dokumentieren</strong>
                    <small>
                      Aktiviert Periodenangaben, den Zyklus-Trigger und die
                      Zyklusauswertung.
                    </small>
                  </div>
                  <Switch
                    value={setupCycleEnabled}
                    onChange={setSetupCycleEnabled}
                  />
                </div>
                <div className="onboarding-actions">
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={() => setSetupStep(1)}
                  >
                    Zurück
                  </button>
                  <button
                    type="button"
                    className="primary-action onboarding-finish"
                    onClick={finishSetup}
                  >
                    Loslegen
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
      {lockVisible && appLock.enabled && (
        <div
          className="app-lock-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-lock-title"
        >
          <section className="app-lock-dialog">
            <span className="app-lock-logo">
              <KopfKlarMark />
            </span>
            <p className="onboarding-eyebrow">KOPFKLAR</p>
            <h1 id="app-lock-title">App entsperren</h1>
            <p>Gib deinen persönlichen App-Code ein.</p>
            <label>
              Code
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={enteredCode}
                onChange={(event) =>
                  setEnteredCode(event.target.value.replace(/\D/g, ""))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") void unlockApp();
                }}
              />
            </label>
            {lockError && <small className="lock-error">{lockError}</small>}
            <button
              type="button"
              className="primary-action"
              onClick={() => void unlockApp()}
            >
              Entsperren
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
