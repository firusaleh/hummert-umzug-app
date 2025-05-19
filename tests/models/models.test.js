// tests/models/models.test.js - Comprehensive model tests
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');

// Import models
const User = require('../../models/user.fixed');
const Umzug = require('../../models/umzug.fixed');
const Mitarbeiter = require('../../models/mitarbeiter.fixed');
const Aufnahme = require('../../models/aufnahme.fixed');
const Angebot = require('../../models/angebot.fixed');
const Rechnung = require('../../models/rechnung.fixed');
const Projektkosten = require('../../models/projektkosten.fixed');
const Finanzuebersicht = require('../../models/finanzuebersicht.fixed');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('User Model Tests', () => {
  describe('Validation', () => {
    it('should create a valid user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'mitarbeiter'
      };
      
      const user = new User(userData);
      const savedUser = await user.save();
      
      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(userData.email.toLowerCase());
      expect(savedUser.password).not.toBe(userData.password); // Should be hashed
    });
    
    it('should require all required fields', async () => {
      const user = new User({});
      
      await expect(user.save()).rejects.toThrow();
      
      const validationError = user.validateSync();
      expect(validationError.errors.name).toBeDefined();
      expect(validationError.errors.email).toBeDefined();
      expect(validationError.errors.password).toBeDefined();
    });
    
    it('should validate email format', async () => {
      const user = new User({
        name: 'Test User',
        email: 'invalid-email',
        password: 'SecurePass123!'
      });
      
      await expect(user.save()).rejects.toThrow();
      
      const validationError = user.validateSync();
      expect(validationError.errors.email).toBeDefined();
    });
    
    it('should validate password strength', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'weak'
      });
      
      await expect(user.save()).rejects.toThrow();
      
      const validationError = user.validateSync();
      expect(validationError.errors.password).toBeDefined();
    });
    
    it('should enforce unique email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!'
      };
      
      await User.create(userData);
      
      const duplicateUser = new User(userData);
      await expect(duplicateUser.save()).rejects.toThrow();
    });
  });
  
  describe('Methods', () => {
    let user;
    
    beforeEach(async () => {
      user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'mitarbeiter'
      });
    });
    
    it('should compare passwords correctly', async () => {
      const isValid = await user.comparePassword('SecurePass123!');
      expect(isValid).toBe(true);
      
      const isInvalid = await user.comparePassword('WrongPassword');
      expect(isInvalid).toBe(false);
    });
    
    it('should generate password reset token', () => {
      const token = user.createPasswordResetToken();
      
      expect(token).toBeDefined();
      expect(user.resetPasswordToken).toBeDefined();
      expect(user.resetPasswordExpire).toBeDefined();
      expect(user.resetPasswordExpire).toBeInstanceOf(Date);
    });
    
    it('should handle failed login attempts', async () => {
      await user.handleFailedLogin();
      
      expect(user.loginAttempts).toBe(1);
      
      // Simulate max attempts
      user.loginAttempts = 4;
      await user.handleFailedLogin();
      
      expect(user.lockUntil).toBeDefined();
      expect(user.isLocked).toBe(true);
    });
    
    it('should handle successful login', async () => {
      user.loginAttempts = 3;
      await user.handleSuccessfulLogin('192.168.1.1');
      
      expect(user.loginAttempts).toBe(0);
      expect(user.lastLogin).toBeDefined();
      expect(user.lastLoginIP).toBe('192.168.1.1');
    });
  });
  
  describe('Statics', () => {
    beforeEach(async () => {
      await User.create([
        {
          name: 'Active User',
          email: 'active@example.com',
          password: 'SecurePass123!',
          role: 'mitarbeiter',
          isActive: true
        },
        {
          name: 'Inactive User',
          email: 'inactive@example.com',
          password: 'SecurePass123!',
          role: 'admin',
          isActive: false
        }
      ]);
    });
    
    it('should find active users', async () => {
      const activeUsers = await User.findActive();
      
      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].email).toBe('active@example.com');
    });
    
    it('should find users by role', async () => {
      const admins = await User.findByRole('admin');
      
      expect(admins).toHaveLength(1);
      expect(admins[0].role).toBe('admin');
    });
    
    it('should get user statistics', async () => {
      const stats = await User.getStatistics();
      
      expect(stats.totalUsers).toBe(2);
      expect(stats.activeUsers).toBe(1);
    });
  });
});

describe('Umzug Model Tests', () => {
  describe('Validation', () => {
    it('should create a valid Umzug', async () => {
      const umzugData = {
        auftraggeber: {
          name: 'Test Kunde',
          telefon: '+49 123 456789'
        },
        auszugsadresse: {
          strasse: 'Teststraße',
          hausnummer: '123',
          plz: '12345',
          ort: 'Teststadt'
        },
        einzugsadresse: {
          strasse: 'Neue Straße',
          hausnummer: '456',
          plz: '67890',
          ort: 'Neustadt'
        },
        startDatum: new Date(Date.now() + 86400000), // Tomorrow
        endDatum: new Date(Date.now() + 172800000)   // Day after tomorrow
      };
      
      const umzug = new Umzug(umzugData);
      const savedUmzug = await umzug.save();
      
      expect(savedUmzug._id).toBeDefined();
      expect(savedUmzug.kundennummer).toMatch(/^KD-\d{6}$/);
      expect(savedUmzug.status).toBe('angefragt');
    });
    
    it('should validate required fields', async () => {
      const umzug = new Umzug({});
      
      const validationError = umzug.validateSync();
      expect(validationError.errors.auftraggeber).toBeDefined();
      expect(validationError.errors.auszugsadresse).toBeDefined();
      expect(validationError.errors.einzugsadresse).toBeDefined();
      expect(validationError.errors.startDatum).toBeDefined();
      expect(validationError.errors.endDatum).toBeDefined();
    });
    
    it('should validate date range', async () => {
      const umzug = new Umzug({
        startDatum: new Date(Date.now() + 172800000),  // Day after tomorrow
        endDatum: new Date(Date.now() + 86400000),     // Tomorrow
        auftraggeber: {
          name: 'Test',
          telefon: '0123456789'
        },
        auszugsadresse: {
          strasse: 'Test',
          hausnummer: '1',
          plz: '12345',
          ort: 'Test'
        },
        einzugsadresse: {
          strasse: 'Test',
          hausnummer: '2',
          plz: '12345',
          ort: 'Test'
        }
      });
      
      await expect(umzug.save()).rejects.toThrow();
    });
    
    it('should validate German postal code', async () => {
      const umzug = new Umzug({
        auftraggeber: {
          name: 'Test',
          telefon: '0123456789'
        },
        auszugsadresse: {
          strasse: 'Test',
          hausnummer: '1',
          plz: '1234', // Invalid PLZ
          ort: 'Test'
        },
        einzugsadresse: {
          strasse: 'Test',
          hausnummer: '2',
          plz: '12345',
          ort: 'Test'
        },
        startDatum: new Date(Date.now() + 86400000),
        endDatum: new Date(Date.now() + 172800000)
      });
      
      const validationError = umzug.validateSync();
      expect(validationError.errors['auszugsadresse.plz']).toBeDefined();
    });
  });
  
  describe('Methods', () => {
    let umzug;
    
    beforeEach(async () => {
      umzug = await Umzug.create({
        auftraggeber: {
          name: 'Test Kunde',
          telefon: '+49 123 456789'
        },
        auszugsadresse: {
          strasse: 'Teststraße',
          hausnummer: '123',
          plz: '12345',
          ort: 'Teststadt'
        },
        einzugsadresse: {
          strasse: 'Neue Straße',
          hausnummer: '456',
          plz: '67890',
          ort: 'Neustadt'
        },
        startDatum: new Date(Date.now() + 86400000),
        endDatum: new Date(Date.now() + 172800000)
      });
    });
    
    it('should change status with history', async () => {
      const userId = new mongoose.Types.ObjectId();
      await umzug.changeStatus('geplant', userId, 'Kunde bestätigt');
      
      expect(umzug.status).toBe('geplant');
      expect(umzug.statusHistory).toHaveLength(1);
      expect(umzug.statusHistory[0].status).toBe('geplant');
      expect(umzug.statusHistory[0].reason).toBe('Kunde bestätigt');
    });
    
    it('should calculate total price', () => {
      umzug.preis.final.brutto = 1000;
      umzug.extraLeistungen = [
        { beschreibung: 'Verpackung', preis: 100, menge: 2 },
        { beschreibung: 'Montage', preis: 150, menge: 1 }
      ];
      
      const total = umzug.calculateTotalPrice();
      expect(total).toBe(1350); // 1000 + (100*2) + (150*1)
    });
    
    it('should add and complete tasks', async () => {
      const taskData = {
        beschreibung: 'Kartons besorgen',
        prioritaet: 'hoch',
        faelligkeit: new Date(Date.now() + 86400000)
      };
      
      await umzug.addTask(taskData);
      expect(umzug.tasks).toHaveLength(1);
      expect(umzug.tasks[0].erledigt).toBe(false);
      
      const userId = new mongoose.Types.ObjectId();
      await umzug.completeTask(umzug.tasks[0]._id, userId);
      
      expect(umzug.tasks[0].erledigt).toBe(true);
      expect(umzug.tasks[0].erledigtVon).toEqual(userId);
    });
  });
  
  describe('Virtuals', () => {
    it('should calculate duration', () => {
      const umzug = new Umzug({
        startDatum: new Date('2024-01-01'),
        endDatum: new Date('2024-01-03')
      });
      
      expect(umzug.dauer).toBe(3);
    });
    
    it('should calculate extra services total', () => {
      const umzug = new Umzug({
        extraLeistungen: [
          { beschreibung: 'Service 1', preis: 100, menge: 2 },
          { beschreibung: 'Service 2', preis: 50, menge: 3 }
        ]
      });
      
      expect(umzug.extraLeistungenGesamt).toBe(350);
    });
  });
});

describe('Mitarbeiter Model Tests', () => {
  describe('Validation', () => {
    it('should create a valid Mitarbeiter', async () => {
      const userId = new mongoose.Types.ObjectId();
      
      const mitarbeiterData = {
        userId,
        vorname: 'Max',
        nachname: 'Mustermann',
        geburtsdatum: new Date('1990-01-01'),
        telefon: '+49 123 456789',
        position: 'fahrer',
        einstellungsdatum: new Date('2020-01-01')
      };
      
      const mitarbeiter = new Mitarbeiter(mitarbeiterData);
      const savedMitarbeiter = await mitarbeiter.save();
      
      expect(savedMitarbeiter._id).toBeDefined();
      expect(savedMitarbeiter.vollname).toBe('Max Mustermann');
    });
    
    it('should validate phone number', async () => {
      const mitarbeiter = new Mitarbeiter({
        userId: new mongoose.Types.ObjectId(),
        vorname: 'Test',
        nachname: 'User',
        telefon: 'invalid-phone',
        position: 'fahrer',
        einstellungsdatum: new Date()
      });
      
      const validationError = mitarbeiter.validateSync();
      expect(validationError.errors.telefon).toBeDefined();
    });
    
    it('should validate age restrictions', async () => {
      const mitarbeiter = new Mitarbeiter({
        userId: new mongoose.Types.ObjectId(),
        vorname: 'Test',
        nachname: 'User',
        geburtsdatum: new Date(), // Too young
        position: 'fahrer',
        einstellungsdatum: new Date()
      });
      
      const validationError = mitarbeiter.validateSync();
      expect(validationError.errors.geburtsdatum).toBeDefined();
    });
  });
  
  describe('Working Hours', () => {
    let mitarbeiter;
    
    beforeEach(async () => {
      mitarbeiter = await Mitarbeiter.create({
        userId: new mongoose.Types.ObjectId(),
        vorname: 'Test',
        nachname: 'Worker',
        position: 'fahrer',
        einstellungsdatum: new Date('2020-01-01')
      });
    });
    
    it('should add and calculate working hours', async () => {
      const arbeitszeitData = {
        datum: new Date(),
        startzeit: new Date('2024-01-01T08:00:00'),
        endzeit: new Date('2024-01-01T17:00:00'),
        pausen: [{
          start: new Date('2024-01-01T12:00:00'),
          ende: new Date('2024-01-01T13:00:00')
        }]
      };
      
      await mitarbeiter.addArbeitszeit(arbeitszeitData);
      
      const arbeitszeit = mitarbeiter.arbeitszeiten[0];
      expect(arbeitszeit.arbeitsstundenBrutto).toBe(9);
      expect(arbeitszeit.pausenzeit).toBe(1);
      expect(arbeitszeit.arbeitsstundenNetto).toBe(8);
      expect(arbeitszeit.ueberstunden).toBe(0);
    });
    
    it('should calculate overtime', async () => {
      const arbeitszeitData = {
        datum: new Date(),
        startzeit: new Date('2024-01-01T08:00:00'),
        endzeit: new Date('2024-01-01T19:00:00'), // 11 hours
        pausen: [{
          start: new Date('2024-01-01T12:00:00'),
          ende: new Date('2024-01-01T13:00:00')
        }]
      };
      
      await mitarbeiter.addArbeitszeit(arbeitszeitData);
      
      const arbeitszeit = mitarbeiter.arbeitszeiten[0];
      expect(arbeitszeit.arbeitsstundenNetto).toBe(10);
      expect(arbeitszeit.ueberstunden).toBe(2); // 10 - 8 = 2
    });
  });
  
  describe('Statics', () => {
    beforeEach(async () => {
      await Mitarbeiter.create([
        {
          userId: new mongoose.Types.ObjectId(),
          vorname: 'Driver',
          nachname: 'One',
          position: 'fahrer',
          einstellungsdatum: new Date(),
          fuehrerscheinklassen: ['B', 'C'],
          isActive: true
        },
        {
          userId: new mongoose.Types.ObjectId(),
          vorname: 'Helper',
          nachname: 'Two',
          position: 'helfer',
          einstellungsdatum: new Date(),
          isActive: true
        }
      ]);
    });
    
    it('should find by position', async () => {
      const drivers = await Mitarbeiter.findByPosition('fahrer');
      
      expect(drivers).toHaveLength(1);
      expect(drivers[0].position).toBe('fahrer');
    });
    
    it('should find by license', async () => {
      const cLicense = await Mitarbeiter.findByFuehrerschein('C');
      
      expect(cLicense).toHaveLength(1);
      expect(cLicense[0].fuehrerscheinklassen).toContain('C');
    });
  });
});

describe('Aufnahme Model Tests', () => {
  describe('Validation', () => {
    it('should create a valid Aufnahme', async () => {
      const aufnahmeData = {
        kunde: {
          name: 'Test Kunde',
          telefon: '+49 123 456789',
          email: 'kunde@example.com'
        },
        umzugsdetails: {
          typ: 'privat',
          geplanteDatum: new Date(Date.now() + 86400000)
        },
        auszugsadresse: {
          strasse: 'Altstraße',
          hausnummer: '1',
          plz: '12345',
          ort: 'Altstadt'
        },
        einzugsadresse: {
          strasse: 'Neustraße',
          hausnummer: '2',
          plz: '67890',
          ort: 'Neustadt'
        },
        raeume: [{
          name: 'Wohnzimmer',
          typ: 'wohnzimmer',
          flaeche: 25,
          moebel: [{
            name: 'Sofa',
            anzahl: 1,
            kategorie: 'sofa'
          }]
        }],
        aufnehmer: new mongoose.Types.ObjectId()
      };
      
      const aufnahme = new Aufnahme(aufnahmeData);
      const savedAufnahme = await aufnahme.save();
      
      expect(savedAufnahme._id).toBeDefined();
      expect(savedAufnahme.referenznummer).toMatch(/^AUF-\d{6}$/);
      expect(savedAufnahme.status).toBe('entwurf');
    });
    
    it('should require at least one room', async () => {
      const aufnahme = new Aufnahme({
        kunde: {
          name: 'Test',
          telefon: '0123456789'
        },
        auszugsadresse: {
          strasse: 'Test',
          hausnummer: '1',
          plz: '12345',
          ort: 'Test'
        },
        einzugsadresse: {
          strasse: 'Test',
          hausnummer: '2',
          plz: '12345',
          ort: 'Test'
        },
        raeume: [], // Empty
        aufnehmer: new mongoose.Types.ObjectId()
      });
      
      const validationError = aufnahme.validateSync();
      expect(validationError.errors.raeume).toBeDefined();
    });
  });
  
  describe('Calculations', () => {
    let aufnahme;
    
    beforeEach(async () => {
      aufnahme = await Aufnahme.create({
        kunde: {
          name: 'Test Kunde',
          telefon: '+49 123 456789'
        },
        umzugsdetails: {
          typ: 'privat'
        },
        auszugsadresse: {
          strasse: 'Test',
          hausnummer: '1',
          plz: '12345',
          ort: 'Test'
        },
        einzugsadresse: {
          strasse: 'Test',
          hausnummer: '2',
          plz: '12345',
          ort: 'Test'
        },
        raeume: [{
          name: 'Wohnzimmer',
          moebel: [{
            name: 'Sofa',
            anzahl: 1,
            groesse: { laenge: 200, breite: 100, hoehe: 80 }
          }]
        }],
        aufnehmer: new mongoose.Types.ObjectId()
      });
    });
    
    it('should calculate volume automatically', () => {
      // 200 * 100 * 80 / 1000000 = 1.6 m³
      expect(aufnahme.zusammenfassung.gesamtvolumen).toBe(1.6);
    });
    
    it('should calculate price estimation', () => {
      const estimate = aufnahme.calculatePriceEstimation();
      
      expect(estimate).toBeDefined();
      expect(estimate.brutto).toBeGreaterThan(0);
      expect(estimate.netto).toBeGreaterThan(0);
      expect(estimate.mwst).toBe(19);
    });
    
    it('should track completeness', () => {
      expect(aufnahme.qualitaet.vollstaendigkeit).toBeGreaterThan(0);
      expect(aufnahme.qualitaet.vollstaendigkeit).toBeLessThanOrEqual(100);
    });
  });
});

describe('Angebot Model Tests', () => {
  describe('Validation', () => {
    it('should create a valid Angebot', async () => {
      const angebotData = {
        kunde: new mongoose.Types.ObjectId(),
        gueltigBis: new Date(Date.now() + 2592000000), // 30 days
        positionsliste: [{
          bezeichnung: 'Umzugsleistung',
          menge: 1,
          einheit: 'Pauschal',
          einzelpreis: 1000
        }],
        preisgestaltung: {
          mehrwertsteuer: { satz: 19 }
        },
        erstelltVon: new mongoose.Types.ObjectId()
      };
      
      const angebot = new Angebot(angebotData);
      const savedAngebot = await angebot.save();
      
      expect(savedAngebot._id).toBeDefined();
      expect(savedAngebot.angebotNummer).toMatch(/^ANG-\d{4}-\d{6}$/);
      expect(savedAngebot.status).toBe('Entwurf');
    });
    
    it('should calculate prices automatically', async () => {
      const angebot = new Angebot({
        kunde: new mongoose.Types.ObjectId(),
        gueltigBis: new Date(Date.now() + 2592000000),
        positionsliste: [{
          bezeichnung: 'Position 1',
          menge: 2,
          einheit: 'Stück',
          einzelpreis: 100
        }],
        preisgestaltung: {
          mehrwertsteuer: { satz: 19 },
          rabatt: { prozent: 10 }
        },
        erstelltVon: new mongoose.Types.ObjectId()
      });
      
      await angebot.save();
      
      // Position: 2 * 100 = 200
      // Rabatt: 200 * 0.1 = 20
      // Zwischensumme: 200 - 20 = 180
      // MwSt: 180 * 0.19 = 34.2
      // Gesamt: 180 + 34.2 = 214.2
      
      expect(angebot.preisgestaltung.nettosumme).toBe(200);
      expect(angebot.preisgestaltung.rabatt.betrag).toBe(20);
      expect(angebot.preisgestaltung.zwischensumme).toBe(180);
      expect(angebot.preisgestaltung.mehrwertsteuer.betrag).toBe(34.2);
      expect(angebot.preisgestaltung.gesamtbetrag).toBe(214.2);
    });
  });
  
  describe('Methods', () => {
    let angebot;
    
    beforeEach(async () => {
      angebot = await Angebot.create({
        kunde: new mongoose.Types.ObjectId(),
        gueltigBis: new Date(Date.now() + 2592000000),
        positionsliste: [{
          bezeichnung: 'Test Position',
          menge: 1,
          einheit: 'Pauschal',
          einzelpreis: 1000
        }],
        preisgestaltung: {
          mehrwertsteuer: { satz: 19 }
        },
        erstelltVon: new mongoose.Types.ObjectId()
      });
    });
    
    it('should send offer', async () => {
      const userId = new mongoose.Types.ObjectId();
      await angebot.versenden('email', 'kunde@example.com', userId);
      
      expect(angebot.status).toBe('Gesendet');
      expect(angebot.kommunikation.versendetAm).toBeDefined();
      expect(angebot.kommunikation.versendetPer).toBe('email');
    });
    
    it('should accept offer', async () => {
      const userId = new mongoose.Types.ObjectId();
      await angebot.akzeptieren('AUF-2024-000001', userId);
      
      expect(angebot.status).toBe('Akzeptiert');
      expect(angebot.konversion.zuAuftrag).toBe(true);
      expect(angebot.konversion.auftragsnummer).toBe('AUF-2024-000001');
    });
    
    it('should create new version', async () => {
      const userId = new mongoose.Types.ObjectId();
      const neueVersion = await angebot.neueVersion(userId);
      
      expect(neueVersion._id).not.toEqual(angebot._id);
      expect(neueVersion.version.nummer).toBe(2);
      expect(neueVersion.version.vorherige).toEqual(angebot._id);
      expect(neueVersion.status).toBe('Entwurf');
    });
  });
  
  describe('Statics', () => {
    beforeEach(async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      await Angebot.create([
        {
          kunde: new mongoose.Types.ObjectId(),
          status: 'Gesendet',
          gueltigBis: tomorrow,
          positionsliste: [{
            bezeichnung: 'Active',
            menge: 1,
            einheit: 'Pauschal',
            einzelpreis: 1000
          }],
          preisgestaltung: {
            mehrwertsteuer: { satz: 19 },
            gesamtbetrag: 1190
          },
          erstelltVon: new mongoose.Types.ObjectId()
        },
        {
          kunde: new mongoose.Types.ObjectId(),
          status: 'Gesendet',
          gueltigBis: yesterday, // Expired
          positionsliste: [{
            bezeichnung: 'Expired',
            menge: 1,
            einheit: 'Pauschal',
            einzelpreis: 500
          }],
          preisgestaltung: {
            mehrwertsteuer: { satz: 19 },
            gesamtbetrag: 595
          },
          erstelltVon: new mongoose.Types.ObjectId()
        },
        {
          kunde: new mongoose.Types.ObjectId(),
          status: 'Akzeptiert',
          gueltigBis: nextMonth,
          positionsliste: [{
            bezeichnung: 'Accepted',
            menge: 1,
            einheit: 'Pauschal',
            einzelpreis: 2000
          }],
          preisgestaltung: {
            mehrwertsteuer: { satz: 19 },
            gesamtbetrag: 2380
          },
          erstelltVon: new mongoose.Types.ObjectId()
        }
      ]);
    });
    
    it('should find active offers', async () => {
      const active = await Angebot.findActive();
      
      expect(active).toHaveLength(1);
      expect(active[0].positionsliste[0].bezeichnung).toBe('Active');
    });
    
    it('should find expired offers', async () => {
      const expired = await Angebot.findExpired();
      
      expect(expired).toHaveLength(1);
      expect(expired[0].positionsliste[0].bezeichnung).toBe('Expired');
    });
    
    it('should calculate conversion statistics', async () => {
      const stats = await Angebot.getConversionStats();
      
      expect(stats.totalAngebote).toBe(3);
      expect(stats.konversionsrate).toBe('33.33');
      expect(stats.gesamtwert).toBe(4165); // 1190 + 595 + 2380
      expect(stats.konvertierterWert).toBe(2380);
    });
  });
});

describe('Rechnung Model Tests', () => {
  describe('Validation', () => {
    it('should create a valid Rechnung', async () => {
      const rechnungData = {
        kunde: new mongoose.Types.ObjectId(),
        leistungszeitraum: {
          von: new Date('2024-01-01'),
          bis: new Date('2024-01-31')
        },
        positionsliste: [{
          bezeichnung: 'Umzugsleistung',
          menge: 1,
          einheit: 'Pauschal',
          einzelpreis: 1000,
          steuersatz: 19
        }],
        erstelltVon: new mongoose.Types.ObjectId()
      };
      
      const rechnung = new Rechnung(rechnungData);
      const savedRechnung = await rechnung.save();
      
      expect(savedRechnung._id).toBeDefined();
      expect(savedRechnung.rechnungNummer).toMatch(/^RG-\d{4}-\d{6}$/);
      expect(savedRechnung.status).toBe('Entwurf');
    });
    
    it('should validate date ranges', async () => {
      const rechnung = new Rechnung({
        kunde: new mongoose.Types.ObjectId(),
        leistungszeitraum: {
          von: new Date('2024-01-31'),
          bis: new Date('2024-01-01') // Invalid: end before start
        },
        positionsliste: [{
          bezeichnung: 'Test',
          menge: 1,
          einzelpreis: 100,
          steuersatz: 19
        }],
        erstelltVon: new mongoose.Types.ObjectId()
      });
      
      const validationError = rechnung.validateSync();
      expect(validationError.errors['leistungszeitraum.bis']).toBeDefined();
    });
    
    it('should validate invoice number format', () => {
      const rechnung = new Rechnung({
        rechnungNummer: 'INVALID-123'
      });
      
      const validationError = rechnung.validateSync();
      expect(validationError.errors.rechnungNummer).toBeDefined();
    });
  });
  
  describe('Calculations', () => {
    let rechnung;
    
    beforeEach(async () => {
      rechnung = await Rechnung.create({
        kunde: new mongoose.Types.ObjectId(),
        leistungszeitraum: {
          von: new Date('2024-01-01'),
          bis: new Date('2024-01-31')
        },
        positionsliste: [{
          bezeichnung: 'Position 1',
          menge: 2,
          einheit: 'Stück',
          einzelpreis: 100,
          steuersatz: 19
        }, {
          bezeichnung: 'Position 2',
          menge: 1,
          einheit: 'Pauschal',
          einzelpreis: 500,
          steuersatz: 7
        }],
        preisgestaltung: {
          rabatt: { prozent: 10 }
        },
        erstelltVon: new mongoose.Types.ObjectId()
      });
    });
    
    it('should calculate position totals correctly', () => {
      // Position 1: 2 * 100 = 200 netto, 238 brutto (19% tax)
      expect(rechnung.positionsliste[0].gesamtpreisNetto).toBe(200);
      expect(rechnung.positionsliste[0].gesamtpreisBrutto).toBe(238);
      
      // Position 2: 1 * 500 = 500 netto, 535 brutto (7% tax)
      expect(rechnung.positionsliste[1].gesamtpreisNetto).toBe(500);
      expect(rechnung.positionsliste[1].gesamtpreisBrutto).toBe(535);
    });
    
    it('should calculate tax groups correctly', () => {
      const taxGroup19 = rechnung.steuersaetze.find(s => s.satz === 19);
      const taxGroup7 = rechnung.steuersaetze.find(s => s.satz === 7);
      
      expect(taxGroup19.nettobetrag).toBe(200);
      expect(taxGroup19.steuerbetrag).toBe(38);
      
      expect(taxGroup7.nettobetrag).toBe(500);
      expect(taxGroup7.steuerbetrag).toBe(35);
    });
    
    it('should calculate total with discount', () => {
      // Netto: 200 + 500 = 700
      // Rabatt: 700 * 0.1 = 70
      // Zwischensumme: 700 - 70 = 630
      // Steuer: (200*0.19 + 500*0.07) = 38 + 35 = 73
      // Gesamt: 630 + 73 = 703
      
      expect(rechnung.preisgestaltung.nettosumme).toBe(700);
      expect(rechnung.preisgestaltung.rabatt.betrag).toBe(70);
      expect(rechnung.preisgestaltung.zwischensumme).toBe(630);
      expect(rechnung.preisgestaltung.steuerbetrag).toBe(73);
      expect(rechnung.preisgestaltung.gesamtbetrag).toBe(703);
    });
  });
  
  describe('Payment Management', () => {
    let rechnung;
    
    beforeEach(async () => {
      rechnung = await Rechnung.create({
        kunde: new mongoose.Types.ObjectId(),
        leistungszeitraum: {
          von: new Date('2024-01-01'),
          bis: new Date('2024-01-31')
        },
        positionsliste: [{
          bezeichnung: 'Test',
          menge: 1,
          einzelpreis: 1000,
          steuersatz: 19
        }],
        erstelltVon: new mongoose.Types.ObjectId()
      });
    });
    
    it('should add payment and update status', async () => {
      const zahlung = {
        betrag: 500,
        zahlungsmethode: 'Überweisung',
        referenz: 'REF-123'
      };
      
      await rechnung.zahlungHinzufuegen(zahlung);
      
      expect(rechnung.zahlungen).toHaveLength(1);
      expect(rechnung.bezahlterBetrag).toBe(500);
      expect(rechnung.offenerBetrag).toBe(690); // 1190 - 500
      expect(rechnung.status).toBe('Teilweise bezahlt');
    });
    
    it('should mark as fully paid', async () => {
      const zahlung = {
        betrag: 1190,
        zahlungsmethode: 'Überweisung'
      };
      
      await rechnung.zahlungHinzufuegen(zahlung);
      
      expect(rechnung.bezahlterBetrag).toBe(1190);
      expect(rechnung.offenerBetrag).toBe(0);
      expect(rechnung.status).toBe('Bezahlt');
    });
  });
  
  describe('Reminder Management', () => {
    let rechnung;
    
    beforeEach(async () => {
      rechnung = await Rechnung.create({
        kunde: new mongoose.Types.ObjectId(),
        leistungszeitraum: {
          von: new Date('2024-01-01'),
          bis: new Date('2024-01-31')
        },
        positionsliste: [{
          bezeichnung: 'Test',
          menge: 1,
          einzelpreis: 1000,
          steuersatz: 19
        }],
        status: 'Gesendet',
        erstelltVon: new mongoose.Types.ObjectId()
      });
    });
    
    it('should create reminder', async () => {
      await rechnung.mahnungErstellen(5);
      
      expect(rechnung.zahlungserinnerungen).toHaveLength(1);
      expect(rechnung.zahlungserinnerungen[0].mahnstufe).toBe(1);
      expect(rechnung.zahlungserinnerungen[0].mahngebuehr).toBe(5);
      expect(rechnung.status).toBe('Gemahnt');
    });
    
    it('should limit reminder levels', async () => {
      await rechnung.mahnungErstellen();
      await rechnung.mahnungErstellen();
      await rechnung.mahnungErstellen();
      
      await expect(rechnung.mahnungErstellen()).rejects.toThrow('Maximale Mahnstufe erreicht');
    });
  });
  
  describe('Statics', () => {
    beforeEach(async () => {
      const now = new Date();
      const overdue = new Date(now);
      overdue.setDate(overdue.getDate() - 30);
      
      await Rechnung.create([
        {
          kunde: new mongoose.Types.ObjectId(),
          leistungszeitraum: {
            von: new Date('2024-01-01'),
            bis: new Date('2024-01-31')
          },
          faelligkeitsdatum: overdue,
          status: 'Gesendet',
          positionsliste: [{
            bezeichnung: 'Overdue',
            menge: 1,
            einzelpreis: 1000,
            steuersatz: 19
          }],
          preisgestaltung: {
            gesamtbetrag: 1190
          },
          offenerBetrag: 1190,
          erstelltVon: new mongoose.Types.ObjectId()
        },
        {
          kunde: new mongoose.Types.ObjectId(),
          leistungszeitraum: {
            von: new Date('2024-01-01'),
            bis: new Date('2024-01-31')
          },
          status: 'Bezahlt',
          positionsliste: [{
            bezeichnung: 'Paid',
            menge: 1,
            einzelpreis: 500,
            steuersatz: 19
          }],
          preisgestaltung: {
            gesamtbetrag: 595
          },
          bezahlterBetrag: 595,
          offenerBetrag: 0,
          erstelltVon: new mongoose.Types.ObjectId()
        }
      ]);
    });
    
    it('should find overdue invoices', async () => {
      const overdue = await Rechnung.findUeberfaellig();
      
      expect(overdue).toHaveLength(1);
      expect(overdue[0].positionsliste[0].bezeichnung).toBe('Overdue');
    });
    
    it('should calculate revenue for period', async () => {
      const von = new Date('2024-01-01');
      const bis = new Date('2024-01-31');
      
      const umsatz = await Rechnung.berechneUmsatz(von, bis);
      
      expect(umsatz.anzahl).toBe(2);
      expect(umsatz.gesamtBrutto).toBe(1785); // 1190 + 595
      expect(umsatz.gezahlt).toBe(595);
      expect(umsatz.offen).toBe(1190);
    });
  });
});

describe('Projektkosten Model Tests', () => {
  describe('Validation', () => {
    it('should create valid Projektkosten', async () => {
      const kostenData = {
        bezeichnung: 'Kraftstoff LKW',
        kategorie: 'Fahrzeuge',
        kostenart: 'Variable Kosten',
        betrag: {
          betragNetto: 100,
          steuersatz: 19
        },
        erstelltVon: new mongoose.Types.ObjectId()
      };
      
      const kosten = new Projektkosten(kostenData);
      const savedKosten = await kosten.save();
      
      expect(savedKosten._id).toBeDefined();
      expect(savedKosten.kostennummer).toMatch(/^PK-\d{4}-\d{6}$/);
      expect(savedKosten.bezahlstatus).toBe('Offen');
    });
    
    it('should validate cost number format', () => {
      const kosten = new Projektkosten({
        kostennummer: 'INVALID-123'
      });
      
      const validationError = kosten.validateSync();
      expect(validationError.errors.kostennummer).toBeDefined();
    });
    
    it('should validate subcategory based on category', () => {
      const kosten = new Projektkosten({
        bezeichnung: 'Test',
        kategorie: 'Personal',
        unterkategorie: 'Kraftstoff', // Invalid for Personal
        kostenart: 'Fixkosten',
        betrag: { betragNetto: 100 },
        erstelltVon: new mongoose.Types.ObjectId()
      });
      
      const validationError = kosten.validateSync();
      expect(validationError.errors.unterkategorie).toBeDefined();
    });
  });
  
  describe('Calculations', () => {
    let kosten;
    
    beforeEach(async () => {
      kosten = await Projektkosten.create({
        bezeichnung: 'Test Kosten',
        kategorie: 'Material',
        kostenart: 'Variable Kosten',
        betrag: {
          betragNetto: 100,
          steuersatz: 19
        },
        erstelltVon: new mongoose.Types.ObjectId()
      });
    });
    
    it('should calculate tax and gross amount', () => {
      expect(kosten.betrag.steuerbetrag).toBe(19);
      expect(kosten.betrag.betragBrutto).toBe(119);
    });
    
    it('should calculate from quantity data', async () => {
      kosten.mengendaten = {
        menge: 50,
        einheit: 'Liter',
        einzelpreis: 1.5
      };
      
      await kosten.save();
      
      expect(kosten.betrag.betragNetto).toBe(75); // 50 * 1.5
      expect(kosten.betrag.betragBrutto).toBe(89.25); // 75 * 1.19
    });
  });
  
  describe('Approval Workflow', () => {
    let kosten;
    
    beforeEach(async () => {
      kosten = await Projektkosten.create({
        bezeichnung: 'Expensive Item',
        kategorie: 'Material',
        kostenart: 'Einmalkosten',
        betrag: {
          betragNetto: 1000,
          steuersatz: 19
        },
        erstelltVon: new mongoose.Types.ObjectId()
      });
    });
    
    it('should require approval for high amounts', () => {
      expect(kosten.genehmigung.erforderlich).toBe(true);
      expect(kosten.genehmigung.status).toBe('Ausstehend');
    });
    
    it('should approve cost', async () => {
      const userId = new mongoose.Types.ObjectId();
      await kosten.genehmigen(userId, 'Budget vorhanden');
      
      expect(kosten.genehmigung.status).toBe('Genehmigt');
      expect(kosten.genehmigung.genehmigtVon).toEqual(userId);
      expect(kosten.bearbeitetVon).toHaveLength(2); // Created + Approved
    });
    
    it('should reject cost', async () => {
      const userId = new mongoose.Types.ObjectId();
      await kosten.ablehnen(userId, 'Budget überschritten');
      
      expect(kosten.genehmigung.status).toBe('Abgelehnt');
      expect(kosten.genehmigung.ablehnungsgrund).toBe('Budget überschritten');
    });
  });
  
  describe('Payment Management', () => {
    let kosten;
    
    beforeEach(async () => {
      kosten = await Projektkosten.create({
        bezeichnung: 'Test',
        kategorie: 'Material',
        kostenart: 'Variable Kosten',
        betrag: {
          betragNetto: 100,
          steuersatz: 19
        },
        erstelltVon: new mongoose.Types.ObjectId()
      });
    });
    
    it('should mark as paid', async () => {
      const zahlungsdaten = {
        zahlungsmethode: 'Überweisung',
        referenznummer: 'REF-123',
        userId: new mongoose.Types.ObjectId()
      };
      
      await kosten.alsBezahltMarkieren(zahlungsdaten);
      
      expect(kosten.bezahlstatus).toBe('Bezahlt');
      expect(kosten.bezahlung.zahlungsmethode).toBe('Überweisung');
      expect(kosten.bezahlung.referenznummer).toBe('REF-123');
    });
    
    it('should prevent double payment', async () => {
      kosten.bezahlstatus = 'Bezahlt';
      
      await expect(kosten.alsBezahltMarkieren({}))
        .rejects.toThrow('Kosten sind bereits bezahlt');
    });
  });
  
  describe('Statics', () => {
    beforeEach(async () => {
      await Projektkosten.create([
        {
          bezeichnung: 'Personal 1',
          kategorie: 'Personal',
          kostenart: 'Fixkosten',
          betrag: { betragNetto: 1000, steuersatz: 19 },
          datum: new Date('2024-01-15'),
          erstelltVon: new mongoose.Types.ObjectId()
        },
        {
          bezeichnung: 'Fahrzeug 1',
          kategorie: 'Fahrzeuge',
          kostenart: 'Variable Kosten',
          betrag: { betragNetto: 500, steuersatz: 19 },
          datum: new Date('2024-01-20'),
          erstelltVon: new mongoose.Types.ObjectId()
        },
        {
          bezeichnung: 'Material 1',
          kategorie: 'Material',
          kostenart: 'Variable Kosten',
          betrag: { betragNetto: 200, steuersatz: 19 },
          datum: new Date('2024-02-01'),
          erstelltVon: new mongoose.Types.ObjectId()
        }
      ]);
    });
    
    it('should get costs by category', async () => {
      const kategorien = await Projektkosten.nachKategorie();
      
      expect(kategorien).toHaveLength(3);
      
      const personal = kategorien.find(k => k._id === 'Personal');
      expect(personal.summeNetto).toBe(1000);
      expect(personal.anzahl).toBe(1);
    });
    
    it('should get costs by period', async () => {
      const von = new Date('2024-01-01');
      const bis = new Date('2024-01-31');
      
      const perioden = await Projektkosten.nachZeitraum(von, bis, 'monat');
      
      expect(perioden).toHaveLength(1);
      expect(perioden[0]._id).toBe('2024-01');
      expect(perioden[0].anzahl).toBe(2);
      expect(perioden[0].summeNetto).toBe(1500);
    });
  });
});

describe('Finanzuebersicht Model Tests', () => {
  describe('Validation', () => {
    it('should create valid Finanzuebersicht', async () => {
      const uebersichtData = {
        jahr: 2024,
        monat: 1,
        einnahmen: {
          rechnungen: {
            anzahl: 10,
            summeBrutto: 10000,
            bezahlt: 8000,
            offen: 2000
          }
        },
        ausgaben: {
          personal: { loehne: 5000 },
          fahrzeuge: { kraftstoff: 1000 }
        }
      };
      
      const uebersicht = new Finanzuebersicht(uebersichtData);
      const savedUebersicht = await uebersicht.save();
      
      expect(savedUebersicht._id).toBeDefined();
      expect(savedUebersicht.status).toBe('Entwurf');
      expect(savedUebersicht.periodFormatiert).toBe('Januar 2024');
    });
    
    it('should validate month range', () => {
      const uebersicht = new Finanzuebersicht({
        jahr: 2024,
        monat: 13 // Invalid
      });
      
      const validationError = uebersicht.validateSync();
      expect(validationError.errors.monat).toBeDefined();
    });
    
    it('should enforce unique year/month combination', async () => {
      await Finanzuebersicht.create({
        jahr: 2024,
        monat: 1
      });
      
      const duplicate = new Finanzuebersicht({
        jahr: 2024,
        monat: 1
      });
      
      await expect(duplicate.save()).rejects.toThrow();
    });
  });
  
  describe('Calculations', () => {
    let uebersicht;
    
    beforeEach(async () => {
      uebersicht = await Finanzuebersicht.create({
        jahr: 2024,
        monat: 1,
        einnahmen: {
          rechnungen: {
            anzahl: 10,
            summeBrutto: 10000,
            bezahlt: 8000,
            offen: 2000
          },
          sonstige: { summe: 500 }
        },
        ausgaben: {
          personal: { loehne: 3000, sozialabgaben: 500 },
          fahrzeuge: { kraftstoff: 800, wartung: 200 },
          material: { verpackung: 300 }
        }
      });
    });
    
    it('should calculate totals automatically', () => {
      // Income
      expect(uebersicht.einnahmen.gesamt).toBe(8500); // 8000 + 500
      
      // Expenses by category
      expect(uebersicht.ausgaben.personal.gesamt).toBe(3500);
      expect(uebersicht.ausgaben.fahrzeuge.gesamt).toBe(1000);
      expect(uebersicht.ausgaben.material.gesamt).toBe(300);
      
      // Total expenses
      expect(uebersicht.ausgaben.gesamt).toBe(4800);
      
      // Results
      expect(uebersicht.ergebnis.betriebsergebnis).toBe(3700); // 8500 - 4800
      expect(uebersicht.ergebnis.nettogewinn).toBe(3700);
      expect(uebersicht.ergebnis.gewinnmarge).toBeCloseTo(43.53, 1);
    });
    
    it('should calculate efficiency ratios', () => {
      expect(uebersicht.kennzahlen.effizienz.personalquote).toBeCloseTo(41.18, 1);
      expect(uebersicht.kennzahlen.effizienz.fahrzeugquote).toBeCloseTo(11.76, 1);
      expect(uebersicht.kennzahlen.effizienz.materialquote).toBeCloseTo(3.53, 1);
    });
    
    it('should calculate conversion rate', () => {
      uebersicht.geschaeftsaktivitaet.angebote = {
        gesendet: 20,
        akzeptiert: 5
      };
      
      uebersicht.save();
      
      expect(uebersicht.geschaeftsaktivitaet.angebote.konversionsrate).toBe(25);
    });
  });
  
  describe('Methods', () => {
    let uebersicht;
    
    beforeEach(async () => {
      uebersicht = await Finanzuebersicht.create({
        jahr: 2024,
        monat: 1
      });
    });
    
    it('should add comment', async () => {
      const userId = new mongoose.Types.ObjectId();
      await uebersicht.kommentarHinzufuegen(
        'Umsatz über Erwartungen',
        'Einnahmen',
        userId
      );
      
      expect(uebersicht.kommentare).toHaveLength(1);
      expect(uebersicht.kommentare[0].text).toBe('Umsatz über Erwartungen');
      expect(uebersicht.kommentare[0].bereich).toBe('Einnahmen');
    });
    
    it('should finalize overview', async () => {
      const userId = new mongoose.Types.ObjectId();
      await uebersicht.finalisieren(userId);
      
      expect(uebersicht.status).toBe('Final');
      expect(uebersicht.aktualisiert_von).toEqual(userId);
    });
    
    it('should prevent re-finalization', async () => {
      uebersicht.status = 'Final';
      
      await expect(uebersicht.finalisieren())
        .rejects.toThrow('Übersicht ist bereits finalisiert');
    });
  });
  
  describe('Statics', () => {
    beforeEach(async () => {
      // Create test data for multiple months
      await Finanzuebersicht.create([
        {
          jahr: 2024,
          monat: 1,
          einnahmen: { gesamt: 10000 },
          ausgaben: { gesamt: 6000 },
          ergebnis: { nettogewinn: 4000 }
        },
        {
          jahr: 2024,
          monat: 2,
          einnahmen: { gesamt: 12000 },
          ausgaben: { gesamt: 7000 },
          ergebnis: { nettogewinn: 5000 }
        },
        {
          jahr: 2023,
          monat: 2,
          einnahmen: { gesamt: 9000 },
          ausgaben: { gesamt: 5500 },
          ergebnis: { nettogewinn: 3500 }
        }
      ]);
    });
    
    it('should get comparison data', async () => {
      const vergleich = await Finanzuebersicht.vergleichsDaten(2024, 2);
      
      // Should have previous month data
      expect(vergleich.vergleich.vormonat.einnahmen).toBe(10000);
      expect(vergleich.vergleich.vormonat.ausgaben).toBe(6000);
      expect(vergleich.vergleich.vormonat.gewinn).toBe(4000);
      
      // Should have previous year data
      expect(vergleich.vergleich.vorjahr.einnahmen).toBe(9000);
      expect(vergleich.vergleich.vorjahr.ausgaben).toBe(5500);
      expect(vergleich.vergleich.vorjahr.gewinn).toBe(3500);
      
      // Should calculate percentage changes
      expect(vergleich.vergleich.vormonat.veraenderungProzent).toBe(20); // (12000-10000)/10000*100
      expect(vergleich.vergleich.vorjahr.veraenderungProzent).toBeCloseTo(33.33, 1); // (12000-9000)/9000*100
    });
  });
});