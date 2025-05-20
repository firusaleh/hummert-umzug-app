// Financial validation schemas
const Joi = require('joi');
const { validators, schemas, createValidationMiddleware } = require('./common.validators');

// Financial position schema
const positionSchema = Joi.object({
  bezeichnung: validators.safeString.required()
    .messages({ 'any.required': 'Bezeichnung ist erforderlich' }),
  menge: validators.positiveNumber.required()
    .messages({ 'any.required': 'Menge ist erforderlich' }),
  einheit: validators.germanEnum(
    ['Stück', 'Stunden', 'Pauschale', 'm²', 'm³', 'km', 'kg'],
    'Einheit'
  ).optional().default('Stück'),
  einzelpreis: validators.positiveNumber.required()
    .messages({ 'any.required': 'Einzelpreis ist erforderlich' }),
  gesamtpreis: validators.positiveNumber.optional(),
  rabatt: Joi.number().min(0).max(100).optional().default(0)
});

// Angebot (quote) schemas
const angebotSchemas = {
  create: Joi.object({
    kunde: validators.objectId.required()
      .messages({ 'any.required': 'Kunde ist erforderlich' }),
    umzug: validators.objectId.optional(),
    gueltigBis: validators.isoDate.required()
      .messages({ 'any.required': 'Gültigkeitsdatum ist erforderlich' }),
    status: validators.germanEnum(
      ['Entwurf', 'Gesendet', 'Akzeptiert', 'Abgelehnt', 'Abgelaufen'],
      'Status'
    ).optional().default('Entwurf'),
    mehrwertsteuer: Joi.number().min(0).max(100).optional().default(19),
    positionsliste: Joi.array().items(positionSchema).min(1).required()
      .messages({ 
        'any.required': 'Mindestens eine Position ist erforderlich',
        'array.min': 'Mindestens eine Position ist erforderlich'
      }),
    notizen: validators.safeString.max(2000).optional(),
    zahlungsbedingungen: validators.safeString.max(1000).optional(),
    lieferbedingungen: validators.safeString.max(1000).optional()
  }),
  
  update: Joi.object({
    kunde: validators.objectId.optional(),
    umzug: validators.objectId.optional(),
    gueltigBis: validators.isoDate.optional(),
    status: validators.germanEnum(
      ['Entwurf', 'Gesendet', 'Akzeptiert', 'Abgelehnt', 'Abgelaufen'],
      'Status'
    ).optional(),
    mehrwertsteuer: Joi.number().min(0).max(100).optional(),
    positionsliste: Joi.array().items(positionSchema).min(1).optional(),
    notizen: validators.safeString.max(2000).optional(),
    zahlungsbedingungen: validators.safeString.max(1000).optional(),
    lieferbedingungen: validators.safeString.max(1000).optional()
  })
};

// Rechnung (invoice) schemas
const rechnungSchemas = {
  create: Joi.object({
    kunde: validators.objectId.required()
      .messages({ 'any.required': 'Kunde ist erforderlich' }),
    umzug: validators.objectId.optional(),
    angebot: validators.objectId.optional(),
    faelligkeitsdatum: validators.isoDate.required()
      .messages({ 'any.required': 'Fälligkeitsdatum ist erforderlich' }),
    status: validators.germanEnum(
      ['Entwurf', 'Gesendet', 'Überfällig', 'Teilbezahlt', 'Bezahlt', 'Storniert'],
      'Status'
    ).optional().default('Entwurf'),
    zahlungsmethode: validators.germanEnum(
      ['Überweisung', 'Bar', 'PayPal', 'Kreditkarte', 'Lastschrift', 'Sonstige'],
      'Zahlungsmethode'
    ).optional().default('Überweisung'),
    mehrwertsteuer: Joi.number().min(0).max(100).optional().default(19),
    positionsliste: Joi.array().items(positionSchema).min(1).required()
      .messages({ 
        'any.required': 'Mindestens eine Position ist erforderlich',
        'array.min': 'Mindestens eine Position ist erforderlich'
      }),
    notizen: validators.safeString.max(2000).optional(),
    zahlungsbedingungen: validators.safeString.max(1000).optional(),
    skonto: Joi.object({
      prozent: Joi.number().min(0).max(100).optional(),
      tage: Joi.number().integer().min(1).max(60).optional()
    }).optional()
  }),
  
  update: Joi.object({
    kunde: validators.objectId.optional(),
    umzug: validators.objectId.optional(),
    angebot: validators.objectId.optional(),
    ausstellungsdatum: validators.isoDate.optional(),
    faelligkeitsdatum: validators.isoDate.optional(),
    status: validators.germanEnum(
      ['Entwurf', 'Gesendet', 'Überfällig', 'Teilbezahlt', 'Bezahlt', 'Storniert'],
      'Status'
    ).optional(),
    bezahltAm: validators.isoDate.optional(),
    zahlungsmethode: validators.germanEnum(
      ['Überweisung', 'Bar', 'PayPal', 'Kreditkarte', 'Lastschrift', 'Sonstige'],
      'Zahlungsmethode'
    ).optional(),
    mehrwertsteuer: Joi.number().min(0).max(100).optional(),
    positionsliste: Joi.array().items(positionSchema).min(1).optional(),
    notizen: validators.safeString.max(2000).optional(),
    zahlungsbedingungen: validators.safeString.max(1000).optional(),
    skonto: Joi.object({
      prozent: Joi.number().min(0).max(100).optional(),
      tage: Joi.number().integer().min(1).max(60).optional()
    }).optional(),
    zahlungserinnerungen: Joi.array().items(
      Joi.object({
        datum: validators.isoDate.required(),
        notiz: validators.safeString.optional()
      })
    ).optional()
  }),
  
  markAsPaid: Joi.object({
    zahlungsmethode: validators.germanEnum(
      ['Überweisung', 'Bar', 'PayPal', 'Kreditkarte', 'Lastschrift', 'Sonstige'],
      'Zahlungsmethode'
    ).optional(),
    bezahltAm: validators.isoDate.optional(),
    betrag: validators.positiveNumber.optional(),
    referenz: validators.safeString.optional()
  })
};

// Projektkosten (project costs) schemas
const projektkostenSchemas = {
  create: Joi.object({
    bezeichnung: validators.safeString.required()
      .messages({ 'any.required': 'Bezeichnung ist erforderlich' }),
    umzug: validators.objectId.optional(),
    kategorie: validators.germanEnum(
      ['Personal', 'Fahrzeuge', 'Material', 'Unterauftrag', 'Sonstiges'],
      'Kategorie'
    ).required()
      .messages({ 'any.required': 'Kategorie ist erforderlich' }),
    betrag: validators.positiveNumber.required()
      .messages({ 'any.required': 'Betrag ist erforderlich' }),
    datum: validators.isoDate.optional().default(() => new Date()),
    beschreibung: validators.safeString.max(1000).optional(),
    lieferant: validators.safeString.optional(),
    rechnungsnummer: validators.safeString.optional(),
    bezahlstatus: validators.germanEnum(
      ['Offen', 'Genehmigt', 'Bezahlt', 'Abgelehnt'],
      'Bezahlstatus'
    ).optional().default('Offen'),
    bezahltAm: validators.isoDate.optional(),
    zahlungsmethode: validators.germanEnum(
      ['Überweisung', 'Bar', 'PayPal', 'Kreditkarte', 'Lastschrift', 'Sonstige'],
      'Zahlungsmethode'
    ).optional()
  }),
  
  update: Joi.object({
    bezeichnung: validators.safeString.optional(),
    umzug: validators.objectId.optional(),
    kategorie: validators.germanEnum(
      ['Personal', 'Fahrzeuge', 'Material', 'Unterauftrag', 'Sonstiges'],
      'Kategorie'
    ).optional(),
    betrag: validators.positiveNumber.optional(),
    datum: validators.isoDate.optional(),
    beschreibung: validators.safeString.max(1000).optional(),
    lieferant: validators.safeString.optional(),
    rechnungsnummer: validators.safeString.optional(),
    bezahlstatus: validators.germanEnum(
      ['Offen', 'Genehmigt', 'Bezahlt', 'Abgelehnt'],
      'Bezahlstatus'
    ).optional(),
    bezahltAm: validators.isoDate.optional(),
    zahlungsmethode: validators.germanEnum(
      ['Überweisung', 'Bar', 'PayPal', 'Kreditkarte', 'Lastschrift', 'Sonstige'],
      'Zahlungsmethode'
    ).optional()
  })
};

// Query validation schemas
const finanzenQuerySchemas = {
  angebote: Joi.object({
    status: validators.germanEnum(
      ['Entwurf', 'Gesendet', 'Akzeptiert', 'Abgelehnt', 'Abgelaufen'],
      'Status'
    ).optional(),
    kundeId: validators.objectId.optional(),
    umzugId: validators.objectId.optional(),
    von: validators.isoDate.optional(),
    bis: validators.isoDate.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('erstelltAm', 'gueltigBis', 'gesamtbetrag', 'status').default('erstelltAm'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),
  
  rechnungen: Joi.object({
    status: validators.germanEnum(
      ['Entwurf', 'Gesendet', 'Überfällig', 'Teilbezahlt', 'Bezahlt', 'Storniert'],
      'Status'
    ).optional(),
    kundeId: validators.objectId.optional(),
    umzugId: validators.objectId.optional(),
    von: validators.isoDate.optional(),
    bis: validators.isoDate.optional(),
    ueberfaellig: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('ausstellungsdatum', 'faelligkeitsdatum', 'gesamtbetrag', 'status').default('ausstellungsdatum'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),
  
  projektkosten: Joi.object({
    kategorie: validators.germanEnum(
      ['Personal', 'Fahrzeuge', 'Material', 'Unterauftrag', 'Sonstiges'],
      'Kategorie'
    ).optional(),
    umzugId: validators.objectId.optional(),
    bezahlstatus: validators.germanEnum(
      ['Offen', 'Genehmigt', 'Bezahlt', 'Abgelehnt'],
      'Bezahlstatus'
    ).optional(),
    von: validators.isoDate.optional(),
    bis: validators.isoDate.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('datum', 'betrag', 'kategorie', 'bezahlstatus').default('datum'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),
  
  monatsdetails: Joi.object({
    monat: Joi.number().integer().min(1).max(12).required(),
    jahr: Joi.number().integer().min(2020).max(2050).required()
  })
};

// Path parameter validation
const finanzenParamSchemas = {
  id: Joi.object({
    id: validators.objectId.required()
      .messages({ 'any.required': 'ID ist erforderlich' })
  }),
  
  jahr: Joi.object({
    jahr: Joi.number().integer().min(2020).max(2050).required()
      .messages({ 'any.required': 'Jahr ist erforderlich' })
  }),
  
  monatJahr: Joi.object({
    monat: Joi.number().integer().min(1).max(12).required()
      .messages({ 'any.required': 'Monat ist erforderlich' }),
    jahr: Joi.number().integer().min(2020).max(2050).required()
      .messages({ 'any.required': 'Jahr ist erforderlich' })
  })
};

// Create validation middleware
const finanzenValidation = {
  // Angebot validation
  createAngebot: createValidationMiddleware(angebotSchemas.create),
  updateAngebot: createValidationMiddleware(angebotSchemas.update),
  listAngebote: createValidationMiddleware(finanzenQuerySchemas.angebote, 'query'),
  
  // Rechnung validation
  createRechnung: createValidationMiddleware(rechnungSchemas.create),
  updateRechnung: createValidationMiddleware(rechnungSchemas.update),
  markRechnungAsPaid: createValidationMiddleware(rechnungSchemas.markAsPaid),
  listRechnungen: createValidationMiddleware(finanzenQuerySchemas.rechnungen, 'query'),
  
  // Projektkosten validation
  createProjektkosten: createValidationMiddleware(projektkostenSchemas.create),
  updateProjektkosten: createValidationMiddleware(projektkostenSchemas.update),
  listProjektkosten: createValidationMiddleware(finanzenQuerySchemas.projektkosten, 'query'),
  
  // Common validations
  validateId: createValidationMiddleware(finanzenParamSchemas.id, 'params'),
  validateJahr: createValidationMiddleware(finanzenParamSchemas.jahr, 'params'),
  validateMonatJahr: createValidationMiddleware(finanzenParamSchemas.monatJahr, 'params'),
  
  // Query validations
  validateMonatsdetails: createValidationMiddleware(finanzenQuerySchemas.monatsdetails, 'query')
};

module.exports = finanzenValidation;