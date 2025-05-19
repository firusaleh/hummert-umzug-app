const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const Mitarbeiter = require('../models/mitarbeiter.model');
// Importieren weiterer benötigter Modelle

async function resetTestDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_TEST_URI);
    
    // Datenbank leeren
    await mongoose.connection.dropDatabase();
    
    // Testbenutzer erstellen
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('password123', saltRounds);
    const adminHashedPassword = await bcrypt.hash('admin123', saltRounds);
    
    await User.create([
      {
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'user'
      },
      {
        email: 'admin@example.com',
        password: adminHashedPassword,
        name: 'Admin User',
        role: 'admin'
      }
    ]);
    
    // Test-Mitarbeiter erstellen
    await Mitarbeiter.create([
      {
        vorname: 'Max',
        nachname: 'Mustermann',
        email: 'max.mustermann@example.com',
        telefon: '0123456789',
        position: 'Fahrer',
        eintrittsdatum: new Date('2023-01-01'),
        status: 'Aktiv',
        faehigkeiten: ['Führerschein Klasse B', 'Möbelmontage']
      },
      {
        vorname: 'Erika',
        nachname: 'Musterfrau',
        email: 'erika.musterfrau@example.com',
        telefon: '0987654321',
        position: 'Helferin',
        eintrittsdatum: new Date('2023-02-15'),
        status: 'Aktiv',
        faehigkeiten: ['Inventarisierung', 'Verpackung']
      }
    ]);
    
    // Weitere Testdaten erstellen (Umzüge, Aufnahmen, etc.)
    
    console.log('Test-Datenbank zurückgesetzt und mit Testdaten gefüllt');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Fehler beim Zurücksetzen der Test-Datenbank:', error);
    process.exit(1);
  }
}

// Script direkt ausführen, wenn es aufgerufen wird
if (require.main === module) {
  resetTestDatabase();
} else {
  // Als Modul exportieren für programmatischen Zugriff
  module.exports = resetTestDatabase;
}