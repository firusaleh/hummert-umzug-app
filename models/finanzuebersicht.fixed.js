const mongoose = require('mongoose');

// Financial Overview Model with comprehensive reporting and analytics
const finanzuebersichtSchema = new mongoose.Schema({
  jahr: {
    type: Number,
    required: [true, 'Jahr ist erforderlich'],
    min: [2000, 'Jahr muss mindestens 2000 sein'],
    max: [2100, 'Jahr darf maximal 2100 sein'],
    index: true
  },
  
  monat: {
    type: Number,
    required: [true, 'Monat ist erforderlich'],
    min: [1, 'Monat muss zwischen 1 und 12 liegen'],
    max: [12, 'Monat muss zwischen 1 und 12 liegen'],
    index: true
  },
  
  periode: {
    start: {
      type: Date,
      required: true
    },
    ende: {
      type: Date,
      required: true
    }
  },
  
  einnahmen: {
    rechnungen: {
      anzahl: { type: Number, default: 0 },
      summeNetto: { type: Number, default: 0 },
      summeBrutto: { type: Number, default: 0 },
      bezahlt: { type: Number, default: 0 },
      offen: { type: Number, default: 0 }
    },
    gutschriften: {
      anzahl: { type: Number, default: 0 },
      summe: { type: Number, default: 0 }
    },
    sonstige: {
      anzahl: { type: Number, default: 0 },
      summe: { type: Number, default: 0 }
    },
    gesamt: {
      type: Number,
      default: 0
    }
  },
  
  ausgaben: {
    personal: {
      loehne: { type: Number, default: 0 },
      sozialabgaben: { type: Number, default: 0 },
      praemien: { type: Number, default: 0 },
      sonstige: { type: Number, default: 0 },
      gesamt: { type: Number, default: 0 }
    },
    fahrzeuge: {
      kraftstoff: { type: Number, default: 0 },
      wartung: { type: Number, default: 0 },
      versicherung: { type: Number, default: 0 },
      miete: { type: Number, default: 0 },
      sonstige: { type: Number, default: 0 },
      gesamt: { type: Number, default: 0 }
    },
    material: {
      verpackung: { type: Number, default: 0 },
      werkzeuge: { type: Number, default: 0 },
      sonstige: { type: Number, default: 0 },
      gesamt: { type: Number, default: 0 }
    },
    betrieb: {
      miete: { type: Number, default: 0 },
      energie: { type: Number, default: 0 },
      kommunikation: { type: Number, default: 0 },
      versicherungen: { type: Number, default: 0 },
      sonstige: { type: Number, default: 0 },
      gesamt: { type: Number, default: 0 }
    },
    unterauftraege: {
      transport: { type: Number, default: 0 },
      lagerung: { type: Number, default: 0 },
      sonstige: { type: Number, default: 0 },
      gesamt: { type: Number, default: 0 }
    },
    sonstige: {
      werbung: { type: Number, default: 0 },
      beratung: { type: Number, default: 0 },
      gebuehren: { type: Number, default: 0 },
      sonstige: { type: Number, default: 0 },
      gesamt: { type: Number, default: 0 }
    },
    gesamt: {
      type: Number,
      default: 0
    }
  },
  
  ergebnis: {
    bruttogewinn: { type: Number, default: 0 },
    betriebsergebnis: { type: Number, default: 0 },
    ebit: { type: Number, default: 0 },
    nettogewinn: { type: Number, default: 0 },
    gewinnmarge: { type: Number, default: 0 }
  },
  
  kennzahlen: {
    liquiditaet: {
      zahlungsmittel: { type: Number, default: 0 },
      kurzfristigeForderungen: { type: Number, default: 0 },
      kurzfristigeVerbindlichkeiten: { type: Number, default: 0 },
      liquiditaetsgrad1: { type: Number, default: 0 },
      liquiditaetsgrad2: { type: Number, default: 0 }
    },
    rentabilitaet: {
      umsatzrendite: { type: Number, default: 0 },
      eigenkapitalrendite: { type: Number, default: 0 },
      gesamtkapitalrendite: { type: Number, default: 0 }
    },
    effizienz: {
      personalquote: { type: Number, default: 0 },
      materialquote: { type: Number, default: 0 },
      fahrzeugquote: { type: Number, default: 0 },
      debitorenlaufzeit: { type: Number, default: 0 }
    }
  },
  
  geschaeftsaktivitaet: {
    umzuege: {
      anzahl: { type: Number, default: 0 },
      durchgefuehrt: { type: Number, default: 0 },
      storniert: { type: Number, default: 0 },
      durchschnittsvolumen: { type: Number, default: 0 },
      durchschnittspreis: { type: Number, default: 0 }
    },
    angebote: {
      erstellt: { type: Number, default: 0 },
      gesendet: { type: Number, default: 0 },
      akzeptiert: { type: Number, default: 0 },
      abgelehnt: { type: Number, default: 0 },
      ausstehend: { type: Number, default: 0 },
      konversionsrate: { type: Number, default: 0 }
    },
    kunden: {
      neukunden: { type: Number, default: 0 },
      bestandskunden: { type: Number, default: 0 },
      verloreneKunden: { type: Number, default: 0 },
      zufriedenheit: { type: Number, default: 0 }
    },
    mitarbeiter: {
      anzahl: { type: Number, default: 0 },
      vollzeit: { type: Number, default: 0 },
      teilzeit: { type: Number, default: 0 },
      aushilfen: { type: Number, default: 0 },
      durchschnittsStunden: { type: Number, default: 0 },
      ueberstunden: { type: Number, default: 0 }
    }
  },
  
  vergleich: {
    vormonat: {
      einnahmen: { type: Number, default: 0 },
      ausgaben: { type: Number, default: 0 },
      gewinn: { type: Number, default: 0 },
      veraenderungProzent: { type: Number, default: 0 }
    },
    vorjahr: {
      einnahmen: { type: Number, default: 0 },
      ausgaben: { type: Number, default: 0 },
      gewinn: { type: Number, default: 0 },
      veraenderungProzent: { type: Number, default: 0 }
    },
    budget: {
      einnahmenPlan: { type: Number, default: 0 },
      ausgabenPlan: { type: Number, default: 0 },
      abweichungEinnahmen: { type: Number, default: 0 },
      abweichungAusgaben: { type: Number, default: 0 }
    }
  },
  
  mahnwesen: {
    offeneForderungen: {
      anzahl: { type: Number, default: 0 },
      betrag: { type: Number, default: 0 },
      aelteste: Date
    },
    mahnungen: {
      stufe1: { type: Number, default: 0 },
      stufe2: { type: Number, default: 0 },
      stufe3: { type: Number, default: 0 },
      gerichtlich: { type: Number, default: 0 }
    },
    ausfaelle: {
      anzahl: { type: Number, default: 0 },
      betrag: { type: Number, default: 0 }
    }
  },
  
  prognose: {
    erwarteteEinnahmen: { type: Number, default: 0 },
    erwarteteAusgaben: { type: Number, default: 0 },
    erwarteterGewinn: { type: Number, default: 0 },
    risiken: [{
      bezeichnung: String,
      wahrscheinlichkeit: Number,
      auswirkung: Number
    }]
  },
  
  status: {
    type: String,
    enum: ['Entwurf', 'Vorläufig', 'Final', 'Geprüft'],
    default: 'Entwurf'
  },
  
  kommentare: [{
    text: String,
    bereich: String,
    erstelltVon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    erstelltAm: {
      type: Date,
      default: Date.now
    }
  }],
  
  anhangsdaten: {
    rechnungsdetails: [{
      rechnungId: mongoose.Schema.Types.ObjectId,
      nummer: String,
      betrag: Number,
      status: String
    }],
    kostendetails: [{
      kostenId: mongoose.Schema.Types.ObjectId,
      kategorie: String,
      betrag: Number
    }]
  },
  
  zuletzt_aktualisiert: {
    type: Date,
    default: Date.now
  },
  
  aktualisiert_von: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Composite index for year and month to prevent duplicates
finanzuebersichtSchema.index({ jahr: 1, monat: 1 }, { unique: true });
finanzuebersichtSchema.index({ jahr: -1, monat: -1 });
finanzuebersichtSchema.index({ status: 1, jahr: -1, monat: -1 });

// Virtual for formatted period
finanzuebersichtSchema.virtual('periodFormatiert').get(function() {
  const monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return `${monate[this.monat - 1]} ${this.jahr}`;
});

// Virtual for calculation of key metrics
finanzuebersichtSchema.virtual('nettogewinnmarge').get(function() {
  if (this.einnahmen.gesamt === 0) return 0;
  return ((this.ergebnis.nettogewinn / this.einnahmen.gesamt) * 100).toFixed(2);
});

// Pre-save hook to calculate derived values
finanzuebersichtSchema.pre('save', function(next) {
  // Set period dates
  this.periode.start = new Date(this.jahr, this.monat - 1, 1);
  this.periode.ende = new Date(this.jahr, this.monat, 0);
  
  // Calculate totals for income
  this.einnahmen.gesamt = 
    this.einnahmen.rechnungen.bezahlt +
    this.einnahmen.gutschriften.summe +
    this.einnahmen.sonstige.summe;
  
  // Calculate totals for each expense category
  const ausgabenKategorien = ['personal', 'fahrzeuge', 'material', 'betrieb', 'unterauftraege', 'sonstige'];
  for (const kategorie of ausgabenKategorien) {
    const katDaten = this.ausgaben[kategorie];
    katDaten.gesamt = Object.keys(katDaten)
      .filter(key => key !== 'gesamt')
      .reduce((sum, key) => sum + (katDaten[key] || 0), 0);
  }
  
  // Calculate total expenses
  this.ausgaben.gesamt = ausgabenKategorien.reduce((sum, kat) => sum + this.ausgaben[kat].gesamt, 0);
  
  // Calculate results
  this.ergebnis.bruttogewinn = this.einnahmen.gesamt - this.ausgaben.material.gesamt;
  this.ergebnis.betriebsergebnis = this.einnahmen.gesamt - this.ausgaben.gesamt;
  this.ergebnis.nettogewinn = this.ergebnis.betriebsergebnis; // Simplified, would include taxes
  
  if (this.einnahmen.gesamt > 0) {
    this.ergebnis.gewinnmarge = (this.ergebnis.nettogewinn / this.einnahmen.gesamt) * 100;
  }
  
  // Calculate efficiency ratios
  if (this.einnahmen.gesamt > 0) {
    this.kennzahlen.effizienz.personalquote = (this.ausgaben.personal.gesamt / this.einnahmen.gesamt) * 100;
    this.kennzahlen.effizienz.materialquote = (this.ausgaben.material.gesamt / this.einnahmen.gesamt) * 100;
    this.kennzahlen.effizienz.fahrzeugquote = (this.ausgaben.fahrzeuge.gesamt / this.einnahmen.gesamt) * 100;
  }
  
  // Calculate conversion rate for offers
  if (this.geschaeftsaktivitaet.angebote.gesendet > 0) {
    this.geschaeftsaktivitaet.angebote.konversionsrate = 
      (this.geschaeftsaktivitaet.angebote.akzeptiert / this.geschaeftsaktivitaet.angebote.gesendet) * 100;
  }
  
  // Update timestamp
  this.zuletzt_aktualisiert = new Date();
  
  next();
});

// Static method to generate overview from raw data
finanzuebersichtSchema.statics.generiereAusRohdaten = async function(jahr, monat) {
  const Rechnung = mongoose.model('Rechnung');
  const Projektkosten = mongoose.model('Projektkosten');
  const Umzug = mongoose.model('Umzug');
  const Angebot = mongoose.model('Angebot');
  
  const periodeStart = new Date(jahr, monat - 1, 1);
  const periodeEnde = new Date(jahr, monat, 0);
  
  // Get invoice data
  const rechnungen = await Rechnung.find({
    ausstellungsdatum: { $gte: periodeStart, $lte: periodeEnde }
  });
  
  // Get cost data
  const kosten = await Projektkosten.find({
    datum: { $gte: periodeStart, $lte: periodeEnde }
  });
  
  // Get move data
  const umzuege = await Umzug.find({
    datum: { $gte: periodeStart, $lte: periodeEnde }
  });
  
  // Get offer data
  const angebote = await Angebot.find({
    createdAt: { $gte: periodeStart, $lte: periodeEnde }
  });
  
  // Create new overview with calculated data
  const uebersicht = new this({
    jahr,
    monat,
    einnahmen: {
      rechnungen: {
        anzahl: rechnungen.length,
        summeBrutto: rechnungen.reduce((sum, r) => sum + r.preisgestaltung.gesamtbetrag, 0),
        bezahlt: rechnungen.reduce((sum, r) => sum + r.bezahlterBetrag, 0),
        offen: rechnungen.reduce((sum, r) => sum + r.offenerBetrag, 0)
      }
    },
    geschaeftsaktivitaet: {
      umzuege: {
        anzahl: umzuege.length,
        durchgefuehrt: umzuege.filter(u => u.status === 'abgeschlossen').length,
        storniert: umzuege.filter(u => u.status === 'storniert').length
      },
      angebote: {
        erstellt: angebote.length,
        gesendet: angebote.filter(a => a.status === 'gesendet').length,
        akzeptiert: angebote.filter(a => a.status === 'angenommen').length
      }
    }
  });
  
  // Process costs by category
  const kostenNachKategorie = {};
  kosten.forEach(k => {
    const kat = k.kategorie.toLowerCase();
    if (!kostenNachKategorie[kat]) {
      kostenNachKategorie[kat] = 0;
    }
    kostenNachKategorie[kat] += k.betrag.betragBrutto;
  });
  
  // Map costs to expense categories
  if (kostenNachKategorie.personal) {
    uebersicht.ausgaben.personal.loehne = kostenNachKategorie.personal;
  }
  if (kostenNachKategorie.fahrzeuge) {
    uebersicht.ausgaben.fahrzeuge.gesamt = kostenNachKategorie.fahrzeuge;
  }
  // ... map other categories
  
  return uebersicht.save();
};

// Static method to get comparison data
finanzuebersichtSchema.statics.vergleichsDaten = async function(jahr, monat) {
  const aktuelleUebersicht = await this.findOne({ jahr, monat });
  if (!aktuelleUebersicht) return null;
  
  // Get previous month
  let vormonat = monat - 1;
  let vormonatJahr = jahr;
  if (vormonat === 0) {
    vormonat = 12;
    vormonatJahr = jahr - 1;
  }
  
  const vormonatUebersicht = await this.findOne({ 
    jahr: vormonatJahr, 
    monat: vormonat 
  });
  
  // Get previous year same month
  const vorjahrUebersicht = await this.findOne({ 
    jahr: jahr - 1, 
    monat: monat 
  });
  
  // Calculate comparisons
  if (vormonatUebersicht) {
    aktuelleUebersicht.vergleich.vormonat = {
      einnahmen: vormonatUebersicht.einnahmen.gesamt,
      ausgaben: vormonatUebersicht.ausgaben.gesamt,
      gewinn: vormonatUebersicht.ergebnis.nettogewinn,
      veraenderungProzent: vormonatUebersicht.einnahmen.gesamt > 0 ? 
        ((aktuelleUebersicht.einnahmen.gesamt - vormonatUebersicht.einnahmen.gesamt) / vormonatUebersicht.einnahmen.gesamt) * 100 : 0
    };
  }
  
  if (vorjahrUebersicht) {
    aktuelleUebersicht.vergleich.vorjahr = {
      einnahmen: vorjahrUebersicht.einnahmen.gesamt,
      ausgaben: vorjahrUebersicht.ausgaben.gesamt,
      gewinn: vorjahrUebersicht.ergebnis.nettogewinn,
      veraenderungProzent: vorjahrUebersicht.einnahmen.gesamt > 0 ?
        ((aktuelleUebersicht.einnahmen.gesamt - vorjahrUebersicht.einnahmen.gesamt) / vorjahrUebersicht.einnahmen.gesamt) * 100 : 0
    };
  }
  
  return aktuelleUebersicht.save();
};

// Instance method to add comment
finanzuebersichtSchema.methods.kommentarHinzufuegen = function(text, bereich, userId) {
  this.kommentare.push({
    text,
    bereich,
    erstelltVon: userId
  });
  
  return this.save();
};

// Instance method to finalize
finanzuebersichtSchema.methods.finalisieren = function(userId) {
  if (this.status === 'Final') {
    throw new Error('Übersicht ist bereits finalisiert');
  }
  
  this.status = 'Final';
  this.aktualisiert_von = userId;
  this.zuletzt_aktualisiert = new Date();
  
  return this.save();
};

const Finanzuebersicht = mongoose.model('Finanzuebersicht', finanzuebersichtSchema);

module.exports = Finanzuebersicht;