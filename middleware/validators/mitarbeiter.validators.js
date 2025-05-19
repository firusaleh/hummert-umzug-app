// Mitarbeiter (employee) validation schemas
const Joi = require('joi');
const { validators, schemas, createValidationMiddleware } = require('./common.validators');

// Mitarbeiter schemas
const mitarbeiterSchemas = {
  create: Joi.object({
    vorname: validators.safeString
      .min(2)
      .max(50)
      .required()
      .messages({
        'any.required': 'Vorname ist erforderlich',
        'string.min': 'Vorname muss mindestens 2 Zeichen lang sein',
        'string.max': 'Vorname darf maximal 50 Zeichen lang sein'
      }),
    nachname: validators.safeString
      .min(2)
      .max(50)
      .required()
      .messages({
        'any.required': 'Nachname ist erforderlich',
        'string.min': 'Nachname muss mindestens 2 Zeichen lang sein',
        'string.max': 'Nachname darf maximal 50 Zeichen lang sein'
      }),
    userId: validators.objectId
      .optional()
      .messages({
        'string.pattern.base': 'Ungültige Benutzer-ID'
      }),
    telefon: validators.phoneNumber
      .optional(),
    email: validators.email
      .optional(),
    adresse: schemas.address
      .optional(),
    position: validators.germanEnum(
      ['Geschäftsführer', 'Teamleiter', 'Träger', 'Fahrer', 'Praktikant', 'Verkäufer', 'Verwaltung'],
      'Position'
    ).optional(),
    abteilung: validators.germanEnum(
      ['Umzüge', 'Verwaltung', 'Verkauf', 'Lager', 'Fuhrpark'],
      'Abteilung'
    ).optional(),
    einstellungsdatum: validators.isoDate
      .optional(),
    gehalt: Joi.object({
      brutto: validators.positiveNumber.optional(),
      netto: validators.positiveNumber.optional(),
      stundensatz: validators.positiveNumber.optional()
    }).optional(),
    faehigkeiten: Joi.array()
      .items(validators.safeString)
      .optional()
      .default([]),
    fuehrerscheinklassen: Joi.array()
      .items(
        validators.germanEnum(
          ['AM', 'A1', 'A2', 'A', 'B', 'BE', 'B96', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE', 'L', 'T'],
          'Führerscheinklasse'
        )
      )
      .optional()
      .default([]),
    notizen: validators.safeString
      .max(1000)
      .optional()
      .allow(''),
    notfallkontakt: Joi.object({
      name: validators.safeString.optional(),
      telefon: validators.phoneNumber.optional(),
      beziehung: validators.safeString.optional()
    }).optional(),
    bankverbindung: Joi.object({
      kontoinhaber: validators.safeString.optional(),
      iban: validators.iban.optional(),
      bic: validators.safeString.optional(),
      bank: validators.safeString.optional()
    }).optional(),
    isActive: Joi.boolean()
      .optional()
      .default(true)
  }),
  
  update: Joi.object({
    vorname: validators.safeString
      .min(2)
      .max(50)
      .optional(),
    nachname: validators.safeString
      .min(2)
      .max(50)
      .optional(),
    telefon: validators.phoneNumber
      .optional(),
    email: validators.email
      .optional(),
    adresse: schemas.address
      .optional(),
    position: validators.germanEnum(
      ['Geschäftsführer', 'Teamleiter', 'Träger', 'Fahrer', 'Praktikant', 'Verkäufer', 'Verwaltung'],
      'Position'
    ).optional(),
    abteilung: validators.germanEnum(
      ['Umzüge', 'Verwaltung', 'Verkauf', 'Lager', 'Fuhrpark'],
      'Abteilung'
    ).optional(),
    einstellungsdatum: validators.isoDate
      .optional(),
    gehalt: Joi.object({
      brutto: validators.positiveNumber.optional(),
      netto: validators.positiveNumber.optional(),
      stundensatz: validators.positiveNumber.optional()
    }).optional(),
    faehigkeiten: Joi.array()
      .items(validators.safeString)
      .optional(),
    fuehrerscheinklassen: Joi.array()
      .items(
        validators.germanEnum(
          ['AM', 'A1', 'A2', 'A', 'B', 'BE', 'B96', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE', 'L', 'T'],
          'Führerscheinklasse'
        )
      )
      .optional(),
    notizen: validators.safeString
      .max(1000)
      .optional()
      .allow(''),
    notfallkontakt: Joi.object({
      name: validators.safeString.optional(),
      telefon: validators.phoneNumber.optional(),
      beziehung: validators.safeString.optional()
    }).optional(),
    bankverbindung: Joi.object({
      kontoinhaber: validators.safeString.optional(),
      iban: validators.iban.optional(),
      bic: validators.safeString.optional(),
      bank: validators.safeString.optional()
    }).optional(),
    isActive: Joi.boolean()
      .optional()
  }),
  
  addArbeitszeit: Joi.object({
    datum: validators.isoDate.required()
      .messages({ 'any.required': 'Datum ist erforderlich' }),
    startzeit: validators.timeFormat.required()
      .messages({ 'any.required': 'Startzeit ist erforderlich' }),
    endzeit: validators.timeFormat.required()
      .messages({ 'any.required': 'Endzeit ist erforderlich' }),
    pausen: Joi.array().items(
      Joi.object({
        start: validators.timeFormat.required(),
        ende: validators.timeFormat.required()
      })
    ).optional().default([]),
    notizen: validators.safeString.optional()
  }),
  
  addDokument: Joi.object({
    name: validators.safeString.required()
      .messages({ 'any.required': 'Name ist erforderlich' }),
    pfad: validators.safePath.required()
      .messages({ 'any.required': 'Pfad ist erforderlich' }),
    kategorie: validators.germanEnum(
      ['arbeitsvertrag', 'zeugnis', 'fortbildung', 'fuehrerschein', 'gesundheitszeugnis', 'sonstiges'],
      'Kategorie'
    ).optional().default('sonstiges'),
    gueltigBis: validators.isoDate.optional()
  }),
  
  updateUrlaub: Joi.object({
    jahresurlaub: Joi.number().integer().min(0).max(365).optional(),
    genommenerUrlaub: Joi.number().integer().min(0).max(365).optional(),
    restUrlaub: Joi.number().integer().min(0).max(365).optional(),
    urlaubstage: Joi.array().items(
      Joi.object({
        von: validators.isoDate.required(),
        bis: validators.isoDate.required(),
        typ: validators.germanEnum(
          ['urlaub', 'krankheit', 'unbezahlt', 'sonderurlaub'],
          'Typ'
        ).required(),
        genehmigt: Joi.boolean().default(false),
        bemerkung: validators.safeString.optional()
      })
    ).optional()
  })
};

// Query validation schemas
const mitarbeiterQuerySchemas = {
  list: Joi.object({
    position: validators.germanEnum(
      ['Geschäftsführer', 'Teamleiter', 'Träger', 'Fahrer', 'Praktikant', 'Verkäufer', 'Verwaltung'],
      'Position'
    ).optional(),
    abteilung: validators.germanEnum(
      ['Umzüge', 'Verwaltung', 'Verkauf', 'Lager', 'Fuhrpark'],
      'Abteilung'
    ).optional(),
    isActive: Joi.boolean().optional(),
    fuehrerscheinklasse: Joi.string().optional(),
    search: validators.safeString.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('vorname', 'nachname', 'position', 'einstellungsdatum', 'createdAt').default('nachname'),
    order: Joi.string().valid('asc', 'desc').default('asc')
  }),
  
  zeiterfassung: Joi.object({
    mitarbeiterId: validators.objectId.optional(),
    von: validators.isoDate.optional(),
    bis: validators.isoDate.optional(),
    projektId: validators.objectId.optional()
  })
};

// Path parameter validation
const mitarbeiterParamSchemas = {
  id: Joi.object({
    id: validators.objectId.required()
      .messages({ 'any.required': 'Mitarbeiter-ID ist erforderlich' })
  })
};

// Create validation middleware
const mitarbeiterValidation = {
  create: createValidationMiddleware(mitarbeiterSchemas.create),
  update: createValidationMiddleware(mitarbeiterSchemas.update),
  addArbeitszeit: createValidationMiddleware(mitarbeiterSchemas.addArbeitszeit),
  addDokument: createValidationMiddleware(mitarbeiterSchemas.addDokument),
  updateUrlaub: createValidationMiddleware(mitarbeiterSchemas.updateUrlaub),
  list: createValidationMiddleware(mitarbeiterQuerySchemas.list, 'query'),
  zeiterfassung: createValidationMiddleware(mitarbeiterQuerySchemas.zeiterfassung, 'query'),
  validateId: createValidationMiddleware(mitarbeiterParamSchemas.id, 'params')
};

module.exports = mitarbeiterValidation;