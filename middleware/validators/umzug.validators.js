// Umzug (move) validation schemas
const Joi = require('joi');
const { validators, schemas, createValidationMiddleware } = require('./common.validators');

// Umzug schemas
const umzugSchemas = {
  create: Joi.object({
    kundennummer: validators.safeString
      .optional()
      .allow(null),
    aufnahmeId: validators.objectId
      .optional()
      .allow(null, ''),
    auftraggeber: Joi.object({
      name: validators.safeString.required()
        .messages({ 'any.required': 'Name des Auftraggebers ist erforderlich' }),
      telefon: validators.phoneNumber.required()
        .messages({ 'any.required': 'Telefon des Auftraggebers ist erforderlich' }),
      email: validators.email.optional(),
      firma: validators.safeString.optional().allow('')
    }).required()
      .messages({ 'any.required': 'Auftraggeber ist erforderlich' }),
    kontakte: Joi.array().items(schemas.contact).optional().default([]),
    auszugsadresse: schemas.address.required()
      .messages({ 'any.required': 'Auszugsadresse ist erforderlich' }),
    einzugsadresse: schemas.address.required()
      .messages({ 'any.required': 'Einzugsadresse ist erforderlich' }),
    zwischenstopps: Joi.array().items(schemas.address).optional().default([]),
    startDatum: validators.isoDate.required()
      .messages({ 'any.required': 'Startdatum ist erforderlich' }),
    endDatum: validators.isoDate.required()
      .messages({ 'any.required': 'Enddatum ist erforderlich' }),
    umzugsdatum: validators.isoDate.optional(),
    status: validators.germanEnum(
      ['geplant', 'bestaetigt', 'in_bearbeitung', 'abgeschlossen', 'storniert'],
      'Status'
    ).optional().default('geplant'),
    preis: schemas.price.optional(),
    fahrzeuge: Joi.array().items(
      Joi.object({
        typ: validators.safeString.required(),
        kennzeichen: validators.safeString.optional(),
        fahrer: validators.objectId.optional()
      })
    ).optional().default([]),
    mitarbeiter: Joi.array().items(
      Joi.object({
        mitarbeiterId: validators.objectId.required(),
        rolle: validators.germanEnum(
          ['Teamleiter', 'Träger', 'Fahrer', 'Helfer'],
          'Rolle'
        ).required()
      })
    ).optional().default([]),
    tasks: Joi.array().items(
      Joi.object({
        beschreibung: validators.safeString.required(),
        erledigt: Joi.boolean().default(false),
        faelligkeit: validators.isoDate.optional(),
        prioritaet: validators.germanEnum(
          ['niedrig', 'mittel', 'hoch', 'kritisch'],
          'Priorität'
        ).default('mittel'),
        zugewiesen: validators.objectId.optional()
      })
    ).optional().default([]),
    dokumente: Joi.array().items(
      Joi.object({
        name: validators.safeString.required(),
        pfad: validators.safePath.required(),
        kategorie: validators.germanEnum(
          ['vertrag', 'angebot', 'rechnung', 'lieferschein', 'protokoll', 'sonstiges'],
          'Kategorie'
        ).default('sonstiges')
      })
    ).optional().default([]),
    notizen: Joi.array().items(
      Joi.object({
        text: validators.safeString.required()
      })
    ).optional().default([]),
    inventar: Joi.object({
      raeume: Joi.array().items(
        Joi.object({
          name: validators.safeString.required(),
          gegenstaende: Joi.array().items(
            Joi.object({
              bezeichnung: validators.safeString.required(),
              anzahl: Joi.number().integer().min(1).required(),
              verpackung: validators.safeString.optional(),
              bemerkung: validators.safeString.optional()
            })
          ).optional().default([])
        })
      ).optional().default([]),
      kartons: Joi.object({
        klein: Joi.number().integer().min(0).default(0),
        mittel: Joi.number().integer().min(0).default(0),
        gross: Joi.number().integer().min(0).default(0),
        kleider: Joi.number().integer().min(0).default(0),
        buecher: Joi.number().integer().min(0).default(0)
      }).optional(),
      verpackungsmaterial: Joi.object({
        luftpolsterfolie: Joi.number().min(0).default(0),
        packdecken: Joi.number().integer().min(0).default(0),
        packpapier: Joi.number().min(0).default(0),
        klebeband: Joi.number().integer().min(0).default(0)
      }).optional()
    }).optional()
  }).custom((value, helpers) => {
    if (value.startDatum > value.endDatum) {
      return helpers.error('dateRange.invalid');
    }
    return value;
  }).messages({
    'dateRange.invalid': 'Startdatum muss vor Enddatum liegen'
  }),
  
  update: Joi.object({
    kundennummer: validators.safeString.optional(),
    aufnahmeId: validators.objectId.optional().allow(null, ''),
    auftraggeber: Joi.object({
      name: validators.safeString.optional(),
      telefon: validators.phoneNumber.optional(),
      email: validators.email.optional(),
      firma: validators.safeString.optional().allow('')
    }).optional(),
    kontakte: Joi.array().items(schemas.contact).optional(),
    auszugsadresse: schemas.address.optional(),
    einzugsadresse: schemas.address.optional(),
    zwischenstopps: Joi.array().items(schemas.address).optional(),
    startDatum: validators.isoDate.optional(),
    endDatum: validators.isoDate.optional(),
    umzugsdatum: validators.isoDate.optional(),
    status: validators.germanEnum(
      ['geplant', 'bestaetigt', 'in_bearbeitung', 'abgeschlossen', 'storniert'],
      'Status'
    ).optional(),
    preis: schemas.price.optional(),
    fahrzeuge: Joi.array().items(
      Joi.object({
        typ: validators.safeString.optional(),
        kennzeichen: validators.safeString.optional(),
        fahrer: validators.objectId.optional()
      })
    ).optional(),
    mitarbeiter: Joi.array().items(
      Joi.object({
        mitarbeiterId: validators.objectId.required(),
        rolle: validators.germanEnum(
          ['Teamleiter', 'Träger', 'Fahrer', 'Helfer'],
          'Rolle'
        ).optional()
      })
    ).optional(),
    tasks: Joi.array().items(
      Joi.object({
        _id: validators.objectId.optional(),
        beschreibung: validators.safeString.optional(),
        erledigt: Joi.boolean().optional(),
        faelligkeit: validators.isoDate.optional(),
        prioritaet: validators.germanEnum(
          ['niedrig', 'mittel', 'hoch', 'kritisch'],
          'Priorität'
        ).optional(),
        zugewiesen: validators.objectId.optional()
      })
    ).optional(),
    dokumente: Joi.array().items(
      Joi.object({
        _id: validators.objectId.optional(),
        name: validators.safeString.optional(),
        pfad: validators.safePath.optional(),
        kategorie: validators.germanEnum(
          ['vertrag', 'angebot', 'rechnung', 'lieferschein', 'protokoll', 'sonstiges'],
          'Kategorie'
        ).optional()
      })
    ).optional(),
    notizen: Joi.array().items(
      Joi.object({
        _id: validators.objectId.optional(),
        text: validators.safeString.optional()
      })
    ).optional(),
    inventar: Joi.object({
      raeume: Joi.array().items(
        Joi.object({
          _id: validators.objectId.optional(),
          name: validators.safeString.optional(),
          gegenstaende: Joi.array().items(
            Joi.object({
              _id: validators.objectId.optional(),
              bezeichnung: validators.safeString.optional(),
              anzahl: Joi.number().integer().min(1).optional(),
              verpackung: validators.safeString.optional(),
              bemerkung: validators.safeString.optional()
            })
          ).optional()
        })
      ).optional(),
      kartons: Joi.object({
        klein: Joi.number().integer().min(0).optional(),
        mittel: Joi.number().integer().min(0).optional(),
        gross: Joi.number().integer().min(0).optional(),
        kleider: Joi.number().integer().min(0).optional(),
        buecher: Joi.number().integer().min(0).optional()
      }).optional(),
      verpackungsmaterial: Joi.object({
        luftpolsterfolie: Joi.number().min(0).optional(),
        packdecken: Joi.number().integer().min(0).optional(),
        packpapier: Joi.number().min(0).optional(),
        klebeband: Joi.number().integer().min(0).optional()
      }).optional()
    }).optional()
  }),
  
  addTask: Joi.object({
    beschreibung: validators.safeString.required()
      .messages({ 'any.required': 'Beschreibung ist erforderlich' }),
    faelligkeit: validators.isoDate.optional(),
    prioritaet: validators.germanEnum(
      ['niedrig', 'mittel', 'hoch', 'kritisch'],
      'Priorität'
    ).optional().default('mittel'),
    zugewiesen: validators.objectId.optional()
  }),
  
  updateTask: Joi.object({
    beschreibung: validators.safeString.optional(),
    erledigt: Joi.boolean().optional(),
    faelligkeit: validators.isoDate.optional(),
    prioritaet: validators.germanEnum(
      ['niedrig', 'mittel', 'hoch', 'kritisch'],
      'Priorität'
    ).optional(),
    zugewiesen: validators.objectId.optional()
  }),
  
  addDokument: Joi.object({
    name: validators.safeString.required()
      .messages({ 'any.required': 'Name ist erforderlich' }),
    pfad: validators.safePath.required()
      .messages({ 'any.required': 'Pfad ist erforderlich' }),
    kategorie: validators.germanEnum(
      ['vertrag', 'angebot', 'rechnung', 'lieferschein', 'protokoll', 'sonstiges'],
      'Kategorie'
    ).optional().default('sonstiges')
  }),
  
  addNotiz: Joi.object({
    text: validators.safeString.required()
      .messages({ 'any.required': 'Text ist erforderlich' })
  })
};

// Query validation schemas
const umzugQuerySchemas = {
  list: Joi.object({
    status: validators.germanEnum(
      ['geplant', 'bestaetigt', 'in_bearbeitung', 'abgeschlossen', 'storniert'],
      'Status'
    ).optional(),
    startDatum: validators.isoDate.optional(),
    endDatum: validators.isoDate.optional(),
    kundenName: validators.safeString.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('startDatum', 'endDatum', 'status', 'createdAt').default('startDatum'),
    order: Joi.string().valid('asc', 'desc').default('asc')
  })
};

// Path parameter validation
const umzugParamSchemas = {
  id: Joi.object({
    id: validators.objectId.required()
      .messages({ 'any.required': 'Umzug-ID ist erforderlich' })
  }),
  taskId: Joi.object({
    id: validators.objectId.required()
      .messages({ 'any.required': 'Umzug-ID ist erforderlich' }),
    taskId: validators.objectId.required()
      .messages({ 'any.required': 'Task-ID ist erforderlich' })
  })
};

// Create validation middleware
const umzugValidation = {
  create: createValidationMiddleware(umzugSchemas.create),
  update: createValidationMiddleware(umzugSchemas.update),
  addTask: createValidationMiddleware(umzugSchemas.addTask),
  updateTask: createValidationMiddleware(umzugSchemas.updateTask),
  addDokument: createValidationMiddleware(umzugSchemas.addDokument),
  addNotiz: createValidationMiddleware(umzugSchemas.addNotiz),
  list: createValidationMiddleware(umzugQuerySchemas.list, 'query'),
  validateId: createValidationMiddleware(umzugParamSchemas.id, 'params'),
  validateTaskId: createValidationMiddleware(umzugParamSchemas.taskId, 'params')
};

module.exports = umzugValidation;