// config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB verbunden: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Verbindungsfehler: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

// config/google.js
const { google } = require('google-auth-library');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/auth/google/callback'
);

// Token-Informationen setzen
const setCredentials = (tokens) => {
  oauth2Client.setCredentials(tokens);
};

// Autorisierungs-URL generieren
const getAuthUrl = () => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
};

// Token von Autorisierungscode abrufen
const getTokenFromCode = async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('Fehler beim Abrufen des Tokens:', error);
    throw error;
  }
};

module.exports = {
  oauth2Client,
  setCredentials,
  getAuthUrl,
  getTokenFromCode
};