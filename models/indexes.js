// models/indexes.js - Comprehensive MongoDB Index Definitions for LagerLogix

const mongoose = require('mongoose');

/**
 * Comprehensive Index Creation for LagerLogix MongoDB Collections
 * 
 * This module defines all indexes for optimal query performance.
 * Indexes are categorized by model and purpose.
 */

class IndexManager {
  /**
   * Create all indexes for the User model
   */
  static async createUserIndexes() {
    const User = mongoose.model('User');
    
    // Primary lookups
    await User.collection.createIndex({ email: 1 }, { 
      unique: true, 
      name: 'email_unique',
      background: true 
    });
    
    // Role-based queries
    await User.collection.createIndex({ role: 1 }, { 
      name: 'role_index',
      background: true 
    });
    
    // Active users filtering
    await User.collection.createIndex({ isActive: 1 }, { 
      name: 'active_users',
      background: true 
    });
    
    // Last login tracking
    await User.collection.createIndex({ lastLogin: -1 }, { 
      name: 'last_login_desc',
      background: true 
    });
    
    // Password reset tokens
    await User.collection.createIndex({ resetPasswordToken: 1 }, { 
      sparse: true,
      name: 'reset_token',
      background: true 
    });
    
    // Password reset expiry (TTL)
    await User.collection.createIndex({ resetPasswordExpire: 1 }, { 
      expireAfterSeconds: 0,
      sparse: true,
      name: 'reset_token_ttl',
      background: true 
    });
    
    // Compound index for login queries
    await User.collection.createIndex({ email: 1, isActive: 1 }, { 
      name: 'email_active_compound',
      background: true 
    });
    
    // Text search on name and email
    await User.collection.createIndex({ 
      name: 'text', 
      email: 'text' 
    }, { 
      name: 'user_text_search',
      background: true 
    });
    
    console.log('User indexes created successfully');
  }

  /**
   * Create all indexes for the Umzug model
   */
  static async createUmzugIndexes() {
    const Umzug = mongoose.model('Umzug');
    
    // Primary lookups
    await Umzug.collection.createIndex({ kundennummer: 1 }, { 
      sparse: true,
      name: 'kundennummer_index',
      background: true 
    });
    
    // Status filtering
    await Umzug.collection.createIndex({ status: 1 }, { 
      name: 'status_index',
      background: true 
    });
    
    // Date range queries
    await Umzug.collection.createIndex({ startDatum: 1 }, { 
      name: 'start_date_asc',
      background: true 
    });
    
    await Umzug.collection.createIndex({ endDatum: 1 }, { 
      name: 'end_date_asc',
      background: true 
    });
    
    // Compound index for date range with status
    await Umzug.collection.createIndex({ 
      status: 1, 
      startDatum: 1, 
      endDatum: 1 
    }, { 
      name: 'status_date_range',
      background: true 
    });
    
    // Foreign key relationships
    await Umzug.collection.createIndex({ aufnahmeId: 1 }, { 
      sparse: true,
      name: 'aufnahme_ref',
      background: true 
    });
    
    await Umzug.collection.createIndex({ 'mitarbeiter.mitarbeiterId': 1 }, { 
      name: 'mitarbeiter_refs',
      background: true 
    });
    
    // Payment status
    await Umzug.collection.createIndex({ 'preis.bezahlt': 1 }, { 
      name: 'payment_status',
      background: true 
    });
    
    // Address location queries
    await Umzug.collection.createIndex({ 'auszugsadresse.plz': 1 }, { 
      name: 'auszug_plz',
      background: true 
    });
    
    await Umzug.collection.createIndex({ 'einzugsadresse.plz': 1 }, { 
      name: 'einzug_plz',
      background: true 
    });
    
    // Task management
    await Umzug.collection.createIndex({ 'tasks.erledigt': 1 }, { 
      name: 'task_completion',
      background: true 
    });
    
    await Umzug.collection.createIndex({ 'tasks.faelligkeit': 1 }, { 
      name: 'task_due_date',
      background: true 
    });
    
    // Text search on customer and notes
    await Umzug.collection.createIndex({ 
      'auftraggeber.name': 'text',
      'notizen.text': 'text'
    }, { 
      name: 'umzug_text_search',
      background: true 
    });
    
    console.log('Umzug indexes created successfully');
  }

  /**
   * Create all indexes for the Mitarbeiter model
   */
  static async createMitarbeiterIndexes() {
    const Mitarbeiter = mongoose.model('Mitarbeiter');
    
    // Foreign key relationship
    await Mitarbeiter.collection.createIndex({ userId: 1 }, { 
      unique: true,
      name: 'user_ref_unique',
      background: true 
    });
    
    // Name sorting
    await Mitarbeiter.collection.createIndex({ nachname: 1, vorname: 1 }, { 
      name: 'name_sort',
      background: true 
    });
    
    // Active status
    await Mitarbeiter.collection.createIndex({ isActive: 1 }, { 
      name: 'active_status',
      background: true 
    });
    
    // Skills and licenses
    await Mitarbeiter.collection.createIndex({ faehigkeiten: 1 }, { 
      name: 'skills_index',
      background: true 
    });
    
    await Mitarbeiter.collection.createIndex({ fuehrerscheinklassen: 1 }, { 
      name: 'license_index',
      background: true 
    });
    
    // Work time tracking
    await Mitarbeiter.collection.createIndex({ 'arbeitszeiten.datum': 1 }, { 
      name: 'worktime_date',
      background: true 
    });
    
    // Address location
    await Mitarbeiter.collection.createIndex({ 'adresse.plz': 1 }, { 
      name: 'employee_plz',
      background: true 
    });
    
    // Text search on name and notes
    await Mitarbeiter.collection.createIndex({ 
      vorname: 'text',
      nachname: 'text',
      notizen: 'text'
    }, { 
      name: 'mitarbeiter_text_search',
      background: true 
    });
    
    console.log('Mitarbeiter indexes created successfully');
  }

  /**
   * Create all indexes for the Aufnahme model
   */
  static async createAufnahmeIndexes() {
    const Aufnahme = mongoose.model('Aufnahme');
    
    // Date queries
    await Aufnahme.collection.createIndex({ datum: -1 }, { 
      name: 'date_desc',
      background: true 
    });
    
    // Status filtering
    await Aufnahme.collection.createIndex({ status: 1 }, { 
      name: 'status_index',
      background: true 
    });
    
    // Customer lookups
    await Aufnahme.collection.createIndex({ kundenName: 1 }, { 
      name: 'customer_name',
      background: true 
    });
    
    await Aufnahme.collection.createIndex({ email: 1 }, { 
      sparse: true,
      name: 'customer_email',
      background: true 
    });
    
    // Type filtering
    await Aufnahme.collection.createIndex({ umzugstyp: 1 }, { 
      name: 'move_type',
      background: true 
    });
    
    // Foreign key relationships
    await Aufnahme.collection.createIndex({ aufnehmer: 1 }, { 
      name: 'recorder_ref',
      background: true 
    });
    
    await Aufnahme.collection.createIndex({ mitarbeiterId: 1 }, { 
      sparse: true,
      name: 'employee_ref',
      background: true 
    });
    
    // Volume queries
    await Aufnahme.collection.createIndex({ gesamtvolumen: 1 }, { 
      name: 'total_volume',
      background: true 
    });
    
    // Rating queries
    await Aufnahme.collection.createIndex({ bewertung: -1 }, { 
      name: 'rating_desc',
      background: true 
    });
    
    // Address location
    await Aufnahme.collection.createIndex({ 'auszugsadresse.plz': 1 }, { 
      name: 'pickup_plz',
      background: true 
    });
    
    await Aufnahme.collection.createIndex({ 'einzugsadresse.plz': 1 }, { 
      name: 'delivery_plz',
      background: true 
    });
    
    // Price range queries
    await Aufnahme.collection.createIndex({ 'angebotspreis.brutto': 1 }, { 
      name: 'price_gross',
      background: true 
    });
    
    // Compound index for common queries
    await Aufnahme.collection.createIndex({ 
      status: 1, 
      datum: -1 
    }, { 
      name: 'status_date_compound',
      background: true 
    });
    
    // Text search
    await Aufnahme.collection.createIndex({ 
      kundenName: 'text',
      besonderheiten: 'text',
      notizen: 'text'
    }, { 
      name: 'aufnahme_text_search',
      background: true 
    });
    
    console.log('Aufnahme indexes created successfully');
  }

  /**
   * Create all indexes for the financial models
   */
  static async createFinancialIndexes() {
    // Angebot indexes
    const Angebot = mongoose.model('Angebot');
    
    await Angebot.collection.createIndex({ angebotNummer: 1 }, { 
      unique: true,
      name: 'offer_number_unique',
      background: true 
    });
    
    await Angebot.collection.createIndex({ kunde: 1 }, { 
      name: 'customer_ref',
      background: true 
    });
    
    await Angebot.collection.createIndex({ umzug: 1 }, { 
      sparse: true,
      name: 'move_ref',
      background: true 
    });
    
    await Angebot.collection.createIndex({ status: 1 }, { 
      name: 'offer_status',
      background: true 
    });
    
    await Angebot.collection.createIndex({ erstelltAm: -1 }, { 
      name: 'created_date_desc',
      background: true 
    });
    
    await Angebot.collection.createIndex({ gueltigBis: 1 }, { 
      name: 'valid_until',
      background: true 
    });
    
    await Angebot.collection.createIndex({ erstelltVon: 1 }, { 
      name: 'created_by_ref',
      background: true 
    });
    
    // Rechnung indexes
    const Rechnung = mongoose.model('Rechnung');
    
    await Rechnung.collection.createIndex({ rechnungNummer: 1 }, { 
      unique: true,
      name: 'invoice_number_unique',
      background: true 
    });
    
    await Rechnung.collection.createIndex({ kunde: 1 }, { 
      name: 'customer_ref',
      background: true 
    });
    
    await Rechnung.collection.createIndex({ umzug: 1 }, { 
      sparse: true,
      name: 'move_ref',
      background: true 
    });
    
    await Rechnung.collection.createIndex({ angebot: 1 }, { 
      sparse: true,
      name: 'offer_ref',
      background: true 
    });
    
    await Rechnung.collection.createIndex({ status: 1 }, { 
      name: 'invoice_status',
      background: true 
    });
    
    await Rechnung.collection.createIndex({ ausstellungsdatum: -1 }, { 
      name: 'issue_date_desc',
      background: true 
    });
    
    await Rechnung.collection.createIndex({ faelligkeitsdatum: 1 }, { 
      name: 'due_date',
      background: true 
    });
    
    await Rechnung.collection.createIndex({ bezahltAm: 1 }, { 
      sparse: true,
      name: 'paid_date',
      background: true 
    });
    
    // Compound index for overdue invoices
    await Rechnung.collection.createIndex({ 
      status: 1, 
      faelligkeitsdatum: 1 
    }, { 
      name: 'overdue_check',
      background: true 
    });
    
    // Projektkosten indexes
    const Projektkosten = mongoose.model('Projektkosten');
    
    await Projektkosten.collection.createIndex({ umzug: 1 }, { 
      name: 'move_ref',
      background: true 
    });
    
    await Projektkosten.collection.createIndex({ kategorie: 1 }, { 
      name: 'cost_category',
      background: true 
    });
    
    await Projektkosten.collection.createIndex({ datum: -1 }, { 
      name: 'cost_date_desc',
      background: true 
    });
    
    await Projektkosten.collection.createIndex({ bezahlstatus: 1 }, { 
      name: 'payment_status',
      background: true 
    });
    
    await Projektkosten.collection.createIndex({ erstelltVon: 1 }, { 
      name: 'created_by_ref',
      background: true 
    });
    
    // Compound index for category reports
    await Projektkosten.collection.createIndex({ 
      kategorie: 1, 
      datum: -1 
    }, { 
      name: 'category_date_compound',
      background: true 
    });
    
    console.log('Financial indexes created successfully');
  }

  /**
   * Create all indexes for the Benachrichtigung model
   */
  static async createBenachrichtigungIndexes() {
    const Benachrichtigung = mongoose.model('Benachrichtigung');
    
    // User notifications
    await Benachrichtigung.collection.createIndex({ empfaenger: 1 }, { 
      name: 'recipient_ref',
      background: true 
    });
    
    // Unread notifications
    await Benachrichtigung.collection.createIndex({ 
      empfaenger: 1, 
      gelesen: 1 
    }, { 
      name: 'user_unread',
      background: true 
    });
    
    // Type filtering
    await Benachrichtigung.collection.createIndex({ typ: 1 }, { 
      name: 'notification_type',
      background: true 
    });
    
    // Reference tracking
    await Benachrichtigung.collection.createIndex({ 
      'bezug.typ': 1, 
      'bezug.id': 1 
    }, { 
      name: 'reference_compound',
      background: true 
    });
    
    // Created date for sorting
    await Benachrichtigung.collection.createIndex({ createdAt: -1 }, { 
      name: 'created_desc',
      background: true 
    });
    
    // Compound index for user notification list
    await Benachrichtigung.collection.createIndex({ 
      empfaenger: 1, 
      createdAt: -1 
    }, { 
      name: 'user_notifications_recent',
      background: true 
    });
    
    // Text search
    await Benachrichtigung.collection.createIndex({ 
      titel: 'text',
      inhalt: 'text'
    }, { 
      name: 'notification_text_search',
      background: true 
    });
    
    console.log('Benachrichtigung indexes created successfully');
  }

  /**
   * Create all indexes for the Zeiterfassung model
   */
  static async createZeiterfassungIndexes() {
    const Zeiterfassung = mongoose.model('Zeiterfassung');
    
    // Employee time tracking
    await Zeiterfassung.collection.createIndex({ mitarbeiterId: 1 }, { 
      name: 'employee_ref',
      background: true 
    });
    
    // Project time tracking
    await Zeiterfassung.collection.createIndex({ projektId: 1 }, { 
      name: 'project_ref',
      background: true 
    });
    
    // Date queries
    await Zeiterfassung.collection.createIndex({ datum: -1 }, { 
      name: 'date_desc',
      background: true 
    });
    
    // Compound index for employee daily entries
    await Zeiterfassung.collection.createIndex({ 
      mitarbeiterId: 1, 
      datum: -1 
    }, { 
      name: 'employee_date_compound',
      background: true 
    });
    
    // Compound index for project time reports
    await Zeiterfassung.collection.createIndex({ 
      projektId: 1, 
      datum: -1 
    }, { 
      name: 'project_date_compound',
      background: true 
    });
    
    // Work hours analysis
    await Zeiterfassung.collection.createIndex({ arbeitsstunden: 1 }, { 
      name: 'work_hours',
      background: true 
    });
    
    // Activity tracking
    await Zeiterfassung.collection.createIndex({ taetigkeit: 1 }, { 
      name: 'activity_type',
      background: true 
    });
    
    console.log('Zeiterfassung indexes created successfully');
  }

  /**
   * Create all indexes for the Token model (already has indexes)
   */
  static async createTokenIndexes() {
    const Token = mongoose.model('Token');
    
    // Note: Token model already has indexes defined in schema
    // This is just to ensure they exist
    
    await Token.collection.createIndex({ token: 1 }, { 
      unique: true,
      name: 'token_unique',
      background: true 
    });
    
    await Token.collection.createIndex({ userId: 1 }, { 
      name: 'user_tokens',
      background: true 
    });
    
    await Token.collection.createIndex({ expiresAt: 1 }, { 
      expireAfterSeconds: 0,
      name: 'token_ttl',
      background: true 
    });
    
    await Token.collection.createIndex({ 
      userId: 1, 
      type: 1, 
      revoked: 1 
    }, { 
      name: 'user_token_status',
      background: true 
    });
    
    console.log('Token indexes created successfully');
  }

  /**
   * Create all indexes for all models
   */
  static async createAllIndexes() {
    try {
      console.log('Starting index creation for all models...');
      
      await this.createUserIndexes();
      await this.createUmzugIndexes();
      await this.createMitarbeiterIndexes();
      await this.createAufnahmeIndexes();
      await this.createFinancialIndexes();
      await this.createBenachrichtigungIndexes();
      await this.createZeiterfassungIndexes();
      await this.createTokenIndexes();
      
      console.log('All indexes created successfully!');
    } catch (error) {
      console.error('Error creating indexes:', error);
      throw error;
    }
  }

  /**
   * Drop all indexes (use with caution!)
   */
  static async dropAllIndexes() {
    const models = [
      'User', 'Umzug', 'Mitarbeiter', 'Aufnahme',
      'Angebot', 'Rechnung', 'Projektkosten',
      'Benachrichtigung', 'Zeiterfassung', 'Token'
    ];
    
    for (const modelName of models) {
      try {
        const Model = mongoose.model(modelName);
        await Model.collection.dropIndexes();
        console.log(`Dropped all indexes for ${modelName}`);
      } catch (error) {
        console.error(`Error dropping indexes for ${modelName}:`, error);
      }
    }
  }

  /**
   * Get index statistics for all collections
   */
  static async getIndexStats() {
    const models = [
      'User', 'Umzug', 'Mitarbeiter', 'Aufnahme',
      'Angebot', 'Rechnung', 'Projektkosten',
      'Benachrichtigung', 'Zeiterfassung', 'Token'
    ];
    
    const stats = {};
    
    for (const modelName of models) {
      try {
        const Model = mongoose.model(modelName);
        const indexes = await Model.collection.getIndexes();
        const indexStats = await Model.collection.aggregate([
          { $indexStats: {} }
        ]).toArray();
        
        stats[modelName] = {
          indexes,
          stats: indexStats
        };
      } catch (error) {
        console.error(`Error getting index stats for ${modelName}:`, error);
        stats[modelName] = { error: error.message };
      }
    }
    
    return stats;
  }
}

module.exports = IndexManager;