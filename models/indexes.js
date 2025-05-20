/**
 * indexes.js - Centralized database indexing configuration
 * This file sets up all MongoDB indexes for optimized database performance
 */

const mongoose = require('mongoose');

// Initialize indexes for all models
const setupIndexes = async () => {
  console.log('Setting up database indexes...');
  
  try {
    // File and Upload indexes
    // These models handle file storage and referencing
    const File = mongoose.model('File');
    await File.collection.createIndexes([
      { key: { project: 1 }, name: 'idx_file_project' },
      { key: { task: 1 }, name: 'idx_file_task' },
      { key: { uploadedBy: 1 }, name: 'idx_file_uploader' },
      { key: { fileType: 1 }, name: 'idx_file_type' },
      { key: { createdAt: -1 }, name: 'idx_file_date' },
      { key: { project: 1, fileType: 1 }, name: 'idx_file_project_type' }
    ]);
    
    const Upload = mongoose.model('Upload');
    await Upload.collection.createIndexes([
      { key: { bezugId: 1, bezugModell: 1 }, name: 'idx_upload_reference' },
      { key: { kategorie: 1 }, name: 'idx_upload_category' },
      { key: { hochgeladenVon: 1 }, name: 'idx_upload_uploader' },
      { key: { createdAt: -1 }, name: 'idx_upload_date' }
    ]);
    
    // Umzug (Move) indexes
    // These models handle moving services and surveys
    const Umzug = mongoose.model('Umzug');
    await Umzug.collection.createIndexes([
      { key: { kundennummer: 1 }, name: 'idx_umzug_kundennummer', unique: true, sparse: true },
      { key: { status: 1 }, name: 'idx_umzug_status' },
      { key: { startDatum: 1 }, name: 'idx_umzug_start_date' },
      { key: { endDatum: 1 }, name: 'idx_umzug_end_date' },
      { key: { 'mitarbeiter.mitarbeiterId': 1 }, name: 'idx_umzug_mitarbeiter' },
      { key: { 'preis.bezahlt': 1 }, name: 'idx_umzug_bezahlt' },
      { key: { 'auszugsadresse.plz': 1 }, name: 'idx_umzug_plz_from' },
      { key: { 'einzugsadresse.plz': 1 }, name: 'idx_umzug_plz_to' },
      { key: { 'tasks.faelligkeit': 1 }, name: 'idx_umzug_task_due' },
      { key: { 'tasks.erledigt': 1 }, name: 'idx_umzug_task_done' },
      { key: { startDatum: 1, endDatum: 1 }, name: 'idx_umzug_date_range' },
      { key: { 'auftraggeber.name': 'text', 'auftraggeber.email': 'text', 'notizen.text': 'text' }, 
        name: 'idx_umzug_text_search' }
    ]);
    
    const Aufnahme = mongoose.model('Aufnahme');
    await Aufnahme.collection.createIndexes([
      { key: { datum: 1 }, name: 'idx_aufnahme_date' },
      { key: { status: 1 }, name: 'idx_aufnahme_status' },
      { key: { 'kunde.name': 1 }, name: 'idx_aufnahme_kunde_name' },
      { key: { 'kunde.email': 1 }, name: 'idx_aufnahme_kunde_email' },
      { key: { umzugsTyp: 1 }, name: 'idx_aufnahme_type' },
      { key: { beobachter: 1 }, name: 'idx_aufnahme_beobachter' },
      { key: { gesamtvolumen: 1 }, name: 'idx_aufnahme_volume' },
      { key: { 'preisBerechnung.gesamtpreis': 1 }, name: 'idx_aufnahme_preis' },
      { key: { 'adresse.plz': 1 }, name: 'idx_aufnahme_plz' },
      { key: { 'kunde.name': 'text', 'kunde.email': 'text', 'notizen': 'text' }, 
        name: 'idx_aufnahme_text_search' }
    ]);
    
    // Employee and time tracking indexes
    const Mitarbeiter = mongoose.model('Mitarbeiter');
    await Mitarbeiter.collection.createIndexes([
      { key: { userId: 1 }, name: 'idx_mitarbeiter_user', unique: true },
      { key: { nachname: 1, vorname: 1 }, name: 'idx_mitarbeiter_name' },
      { key: { aktiv: 1 }, name: 'idx_mitarbeiter_active' },
      { key: { faehigkeiten: 1 }, name: 'idx_mitarbeiter_skills' },
      { key: { fuehrerschein: 1 }, name: 'idx_mitarbeiter_license' },
      { key: { 'arbeitszeitErfassung.startDatum': 1 }, name: 'idx_mitarbeiter_work_start' },
      { key: { 'arbeitszeitErfassung.endDatum': 1 }, name: 'idx_mitarbeiter_work_end' },
      { key: { 'adresse.plz': 1 }, name: 'idx_mitarbeiter_plz' },
      { key: { vorname: 'text', nachname: 'text', notizen: 'text' }, 
        name: 'idx_mitarbeiter_text_search' }
    ]);
    
    const Zeiterfassung = mongoose.model('Zeiterfassung');
    await Zeiterfassung.collection.createIndexes([
      { key: { mitarbeiter: 1 }, name: 'idx_zeit_mitarbeiter' },
      { key: { projekt: 1 }, name: 'idx_zeit_projekt' },
      { key: { datum: 1 }, name: 'idx_zeit_datum' },
      { key: { mitarbeiter: 1, datum: 1 }, name: 'idx_zeit_mitarbeiter_datum' },
      { key: { projekt: 1, datum: 1 }, name: 'idx_zeit_projekt_datum' },
      { key: { arbeitsstunden: 1 }, name: 'idx_zeit_stunden' },
      { key: { taetigkeit: 1 }, name: 'idx_zeit_activity' }
    ]);
    
    // Notification indexes
    const Benachrichtigung = mongoose.model('Benachrichtigung');
    await Benachrichtigung.collection.createIndexes([
      { key: { empfaenger: 1 }, name: 'idx_benachrichtigung_empfaenger' },
      { key: { typ: 1 }, name: 'idx_benachrichtigung_typ' },
      { key: { gelesen: 1 }, name: 'idx_benachrichtigung_gelesen' },
      { key: { empfaenger: 1, gelesen: 1 }, name: 'idx_benachrichtigung_empfaenger_gelesen' },
      { key: { createdAt: 1 }, name: 'idx_benachrichtigung_date' },
      { key: { titel: 'text', inhalt: 'text' }, name: 'idx_benachrichtigung_text_search' },
      // TTL index to automatically delete old notifications after 90 days
      { key: { createdAt: 1 }, name: 'idx_benachrichtigung_ttl', expireAfterSeconds: 7776000 }
    ]);
    
    // Financial models indexes
    const Angebot = mongoose.model('Angebot');
    await Angebot.collection.createIndexes([
      { key: { angebotNummer: 1 }, name: 'idx_angebot_nummer', unique: true },
      { key: { kunde: 1 }, name: 'idx_angebot_kunde' },
      { key: { umzug: 1 }, name: 'idx_angebot_umzug' },
      { key: { status: 1 }, name: 'idx_angebot_status' },
      { key: { erstelltAm: 1 }, name: 'idx_angebot_date' },
      { key: { gueltigBis: 1 }, name: 'idx_angebot_validity' },
      { key: { erstelltVon: 1 }, name: 'idx_angebot_creator' },
      { key: { gesamtbetrag: 1 }, name: 'idx_angebot_amount' }
    ]);
    
    const Rechnung = mongoose.model('Rechnung');
    await Rechnung.collection.createIndexes([
      { key: { rechnungNummer: 1 }, name: 'idx_rechnung_nummer', unique: true },
      { key: { kunde: 1 }, name: 'idx_rechnung_kunde' },
      { key: { umzug: 1 }, name: 'idx_rechnung_umzug' },
      { key: { angebot: 1 }, name: 'idx_rechnung_angebot' },
      { key: { status: 1 }, name: 'idx_rechnung_status' },
      { key: { ausstellungsdatum: 1 }, name: 'idx_rechnung_issue_date' },
      { key: { faelligkeitsdatum: 1 }, name: 'idx_rechnung_due_date' },
      { key: { bezahltAm: 1 }, name: 'idx_rechnung_paid_date' },
      { key: { erstelltVon: 1 }, name: 'idx_rechnung_creator' },
      { key: { gesamtbetrag: 1 }, name: 'idx_rechnung_amount' },
      { key: { faelligkeitsdatum: 1, status: 1 }, name: 'idx_rechnung_overdue' }
    ]);
    
    const Projektkosten = mongoose.model('Projektkosten');
    await Projektkosten.collection.createIndexes([
      { key: { umzug: 1 }, name: 'idx_kosten_umzug' },
      { key: { kategorie: 1 }, name: 'idx_kosten_kategorie' },
      { key: { datum: 1 }, name: 'idx_kosten_date' },
      { key: { bezahlstatus: 1 }, name: 'idx_kosten_status' },
      { key: { erstelltVon: 1 }, name: 'idx_kosten_creator' },
      { key: { betrag: 1 }, name: 'idx_kosten_amount' },
      { key: { kategorie: 1, umzug: 1 }, name: 'idx_kosten_kat_umzug' }
    ]);
    
    const Finanzuebersicht = mongoose.model('Finanzuebersicht');
    await Finanzuebersicht.collection.createIndexes([
      { key: { jahr: 1, monat: 1 }, name: 'idx_finanz_jahr_monat', unique: true },
      { key: { einnahmen: 1 }, name: 'idx_finanz_income' },
      { key: { ausgaben: 1 }, name: 'idx_finanz_expenses' },
      { key: { gewinn: 1 }, name: 'idx_finanz_profit' }
    ]);
    
    console.log('Successfully set up database indexes');
  } catch (error) {
    console.error('Error setting up database indexes:', error);
    throw error;
  }
};

module.exports = setupIndexes;