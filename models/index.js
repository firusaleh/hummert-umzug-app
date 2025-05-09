// models/index.js
// Einen Versuch machen, alle möglichen Modellnamen zu unterstützen
try {
  module.exports = {
    User: require('./user'),
    Project: require('./project'),
    Task: require('./task'),
    Client: require('./client'),
    File: require('./file'),
    // Weitere Modelle hier hinzufügen
  };
} catch (error) {
  console.error('Fehler beim Laden der Modelle:', error);
  // Fallback-Versuch mit alternativen Namen
  module.exports = {
    User: require('./user.model'),
    // Weitere Modelle hier hinzufügen
  };
}