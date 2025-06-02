const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Mitarbeiter = require('./models/Mitarbeiter');

dotenv.config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Mitarbeiter.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin'
    });
    console.log('👤 Created admin user');

    // Create sample employees
    const mitarbeiter = await Mitarbeiter.create([
      {
        vorname: 'Max',
        nachname: 'Mustermann',
        email: 'max.mustermann@example.com',
        telefon: '+49 123 4567890',
        position: 'Umzugsleiter',
        status: 'aktiv'
      },
      {
        vorname: 'Anna',
        nachname: 'Schmidt',
        email: 'anna.schmidt@example.com',
        telefon: '+49 123 4567891',
        position: 'Umzugshelfer',
        status: 'aktiv'
      },
      {
        vorname: 'Tom',
        nachname: 'Weber',
        email: 'tom.weber@example.com',
        telefon: '+49 123 4567892',
        position: 'Fahrer',
        status: 'aktiv'
      }
    ]);
    console.log(`👥 Created ${mitarbeiter.length} sample employees`);

    console.log('\n✨ Seed data created successfully!');
    console.log('\n📋 Login credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData();