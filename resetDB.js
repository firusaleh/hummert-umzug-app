// resetDB.js
const mongoose = require('mongoose');
require('dotenv').config();

// Verbindung zur MongoDB-Datenbank herstellen
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB-Verbindung hergestellt. Bereit zum Zurücksetzen der Datenbank...');
    
    try {
      // Alle Ihre spezifischen Sammlungen leeren
      await mongoose.connection.db.collection('aufnahmes').deleteMany({});
      console.log('Sammlung "aufnahmes" zurückgesetzt.');
      
      await mongoose.connection.db.collection('benachrichtigungs').deleteMany({});
      console.log('Sammlung "benachrichtigungs" zurückgesetzt.');
      
      await mongoose.connection.db.collection('clients').deleteMany({});
      console.log('Sammlung "clients" zurückgesetzt.');
      
      await mongoose.connection.db.collection('files').deleteMany({});
      console.log('Sammlung "files" zurückgesetzt.');
      
      await mongoose.connection.db.collection('mitarbeiters').deleteMany({});
      console.log('Sammlung "mitarbeiters" zurückgesetzt.');
      
      await mongoose.connection.db.collection('projects').deleteMany({});
      console.log('Sammlung "projects" zurückgesetzt.');
      
      await mongoose.connection.db.collection('tasks').deleteMany({});
      console.log('Sammlung "tasks" zurückgesetzt.');
      
      await mongoose.connection.db.collection('umzugs').deleteMany({});
      console.log('Sammlung "umzugs" zurückgesetzt.');
      
      await mongoose.connection.db.collection('uploads').deleteMany({});
      console.log('Sammlung "uploads" zurückgesetzt.');
      
      // Die users-Sammlung zum Schluss, da Sie möglicherweise einen Admin-Benutzer 
      // beibehalten oder neu erstellen möchten
      await mongoose.connection.db.collection('users').deleteMany({});
      console.log('Sammlung "users" zurückgesetzt.');
      
      // Optional: Erstellen Sie einen Admin-Benutzer
      // Hinweis: Sie müssten Ihr User-Modell importieren und einen verschlüsselten
      // Password-Hash verwenden (nicht im Klartext wie hier gezeigt)
      /*
      const User = require('./models/User');
      await User.create({
        name: 'Administrator',
        email: 'admin@hummert-umzug.de',
        password: 'verschlüsseltes-passwort', // verwenden Sie bcrypt o.ä.
        role: 'admin'
      });
      console.log('Standard Admin-Benutzer erstellt.');
      */
      
      console.log('Datenbank erfolgreich zurückgesetzt!');
    } catch (error) {
      console.error('Fehler beim Zurücksetzen der Datenbank:', error);
    } finally {
      // Verbindung schließen
      await mongoose.connection.close();
      console.log('Datenbankverbindung geschlossen.');
      process.exit(0);
    }
  })
  .catch(err => {
    console.error('Verbindungsfehler:', err);
    process.exit(1);
  });