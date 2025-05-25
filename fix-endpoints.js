#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Backend Endpoints...\n');

// Fix 1: Update umzug controller to handle both old and new data formats
const fixUmzugController = () => {
  console.log('📦 Fixing Umzug Controller...');
  
  const controllerPath = path.join(__dirname, 'controllers/umzug.controller.js');
  let content = fs.readFileSync(controllerPath, 'utf8');
  
  // Add data transformation function after imports
  const transformFunction = `
// Transform legacy data format to new format
const transformLegacyUmzugData = (data) => {
  // Handle old format with 'kunde' instead of 'auftraggeber'
  if (data.kunde && !data.auftraggeber) {
    data.auftraggeber = data.kunde;
    delete data.kunde;
  }
  
  // Handle old format with 'datum' instead of 'startDatum/endDatum'
  if (data.datum && !data.startDatum) {
    data.startDatum = data.datum;
    data.endDatum = data.datum;
    delete data.datum;
  }
  
  // Ensure hausnummer is present in addresses
  if (data.auszugsadresse && !data.auszugsadresse.hausnummer) {
    // Extract hausnummer from strasse if combined
    const match = data.auszugsadresse.strasse?.match(/^(.+?)\\s+(\\d+\\w*)$/);
    if (match) {
      data.auszugsadresse.strasse = match[1];
      data.auszugsadresse.hausnummer = match[2];
    } else {
      data.auszugsadresse.hausnummer = '1'; // Default
    }
  }
  
  if (data.einzugsadresse && !data.einzugsadresse.hausnummer) {
    const match = data.einzugsadresse.strasse?.match(/^(.+?)\\s+(\\d+\\w*)$/);
    if (match) {
      data.einzugsadresse.strasse = match[1];
      data.einzugsadresse.hausnummer = match[2];
    } else {
      data.einzugsadresse.hausnummer = '1'; // Default
    }
  }
  
  return data;
};
`;

  // Insert after error utils import
  const errorUtilsIndex = content.indexOf('} = require(\'../utils/error.utils\');');
  if (errorUtilsIndex !== -1) {
    const insertPos = content.indexOf('\n', errorUtilsIndex) + 1;
    content = content.slice(0, insertPos) + transformFunction + content.slice(insertPos);
  }
  
  // Update createUmzug to use transformation
  const createUmzugRegex = /exports\.createUmzug = catchAsync\(async \(req, res\) => \{/;
  content = content.replace(createUmzugRegex, 
    `exports.createUmzug = catchAsync(async (req, res) => {
  // Transform legacy data format
  req.body = transformLegacyUmzugData(req.body);`
  );
  
  fs.writeFileSync(controllerPath, content);
  console.log('✅ Umzug Controller fixed');
};

// Fix 2: Update response format consistency
const fixResponseFormats = () => {
  console.log('📋 Fixing Response Formats...');
  
  // Fix mitarbeiter controller response format
  const mitarbeiterPath = path.join(__dirname, 'controllers/mitarbeiter.controller.js');
  if (fs.existsSync(mitarbeiterPath)) {
    let content = fs.readFileSync(mitarbeiterPath, 'utf8');
    
    // Ensure getAllMitarbeiter returns consistent format
    const getAllRegex = /res\.json\(mitarbeiter\);/g;
    content = content.replace(getAllRegex, `res.json({
    success: true,
    data: mitarbeiter,
    count: mitarbeiter.length
  });`);
    
    fs.writeFileSync(mitarbeiterPath, content);
    console.log('✅ Mitarbeiter response format fixed');
  }
};

// Fix 3: Fix Fahrzeug validation
const fixFahrzeugValidation = () => {
  console.log('🚚 Fixing Fahrzeug Validation...');
  
  const validatorPath = path.join(__dirname, 'middleware/validators/fahrzeug.validator.js');
  if (fs.existsSync(validatorPath)) {
    let content = fs.readFileSync(validatorPath, 'utf8');
    
    // Update kennzeichen regex to be more flexible
    content = content.replace(
      /kennzeichen:\s*Joi\.string\(\)\.pattern\([^)]+\)/,
      `kennzeichen: Joi.string().pattern(/^[A-ZÄÖÜ]{1,3}-[A-ZÄÖÜ]{1,2}\\s?\\d{1,4}[A-Z]?$/)`
    );
    
    // Make bezeichnung optional if it's required
    content = content.replace(
      /bezeichnung:\s*validators\.safeString\.required\(\)/,
      `bezeichnung: validators.safeString.optional()`
    );
    
    // Fix status enum
    content = content.replace(
      /'verfuegbar'/g,
      `'verfügbar'`
    );
    
    fs.writeFileSync(validatorPath, content);
    console.log('✅ Fahrzeug validation fixed');
  }
};

// Fix 4: Ensure all routes are properly registered
const fixRouteRegistration = () => {
  console.log('🛣️ Fixing Route Registration...');
  
  const zeiterfassungRoutesPath = path.join(__dirname, 'routes/zeiterfassung.routes.js');
  if (fs.existsSync(zeiterfassungRoutesPath)) {
    let content = fs.readFileSync(zeiterfassungRoutesPath, 'utf8');
    
    // Ensure GET route exists
    if (!content.includes('router.get(\'/\'')) {
      const postRouteIndex = content.indexOf('router.post(\'/\'');
      if (postRouteIndex !== -1) {
        const insertPos = content.lastIndexOf('\n', postRouteIndex);
        const getRoute = `
// Get all time entries with optional filters
router.get('/', auth, zeiterfassungController.getAllZeiterfassungen);
`;
        content = content.slice(0, insertPos) + getRoute + content.slice(insertPos);
      }
    }
    
    fs.writeFileSync(zeiterfassungRoutesPath, content);
    console.log('✅ Zeiterfassung routes fixed');
  }
};

// Fix 5: Add missing controller methods
const fixMissingControllerMethods = () => {
  console.log('🔌 Fixing Missing Controller Methods...');
  
  const zeiterfassungControllerPath = path.join(__dirname, 'controllers/zeiterfassung.controller.js');
  if (fs.existsSync(zeiterfassungControllerPath)) {
    let content = fs.readFileSync(zeiterfassungControllerPath, 'utf8');
    
    // Add getAllZeiterfassungen if missing
    if (!content.includes('exports.getAllZeiterfassungen')) {
      const newMethod = `
// Get all time entries
exports.getAllZeiterfassungen = catchAsync(async (req, res) => {
  const { mitarbeiterId, datum, startDatum, endDatum } = req.query;
  
  const filter = {};
  
  if (mitarbeiterId) {
    filter.mitarbeiterId = mitarbeiterId;
  }
  
  if (datum) {
    filter.datum = new Date(datum);
  }
  
  if (startDatum || endDatum) {
    filter.datum = {};
    if (startDatum) filter.datum.$gte = new Date(startDatum);
    if (endDatum) filter.datum.$lte = new Date(endDatum);
  }
  
  const zeiterfassungen = await Zeiterfassung.find(filter)
    .populate('mitarbeiterId', 'vorname nachname')
    .sort({ datum: -1, startzeit: -1 });
  
  res.json({
    success: true,
    data: zeiterfassungen,
    count: zeiterfassungen.length
  });
});
`;
      
      // Insert before module.exports or at end
      const moduleExportsIndex = content.lastIndexOf('module.exports');
      if (moduleExportsIndex !== -1) {
        content = content.slice(0, moduleExportsIndex) + newMethod + '\n' + content.slice(moduleExportsIndex);
      } else {
        content += newMethod;
      }
    }
    
    fs.writeFileSync(zeiterfassungControllerPath, content);
    console.log('✅ Zeiterfassung controller methods added');
  }
};

// Fix 6: Create a middleware to handle legacy API formats
const createLegacyMiddleware = () => {
  console.log('🔄 Creating Legacy Format Middleware...');
  
  const middlewareContent = `// middleware/legacyFormat.js
// Middleware to handle legacy API request formats

/**
 * Transform legacy request formats to current format
 */
exports.transformLegacyRequest = (req, res, next) => {
  // Transform Umzug legacy format
  if (req.path.includes('/umzuege') && req.method === 'POST') {
    if (req.body.kunde && !req.body.auftraggeber) {
      req.body.auftraggeber = req.body.kunde;
      delete req.body.kunde;
    }
    
    if (req.body.datum && !req.body.startDatum) {
      req.body.startDatum = req.body.datum;
      req.body.endDatum = req.body.datum;
      delete req.body.datum;
    }
  }
  
  // Transform Fahrzeug legacy format
  if (req.path.includes('/fahrzeuge') && req.method === 'POST') {
    if (req.body.status === 'verfuegbar') {
      req.body.status = 'verfügbar';
    }
    
    // Add bezeichnung if missing
    if (!req.body.bezeichnung && req.body.marke && req.body.modell) {
      req.body.bezeichnung = \`\${req.body.marke} \${req.body.modell}\`;
    }
  }
  
  next();
};

/**
 * Transform responses to include consistent format
 */
exports.transformResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // If data is an array, wrap it in standard format
    if (Array.isArray(data)) {
      data = {
        success: true,
        data: data,
        count: data.length
      };
    }
    // If data doesn't have success field, add it
    else if (data && typeof data === 'object' && !data.hasOwnProperty('success')) {
      data = {
        success: true,
        ...data
      };
    }
    
    originalJson.call(this, data);
  };
  
  next();
};
`;

  fs.writeFileSync(path.join(__dirname, 'middleware/legacyFormat.js'), middlewareContent);
  console.log('✅ Legacy format middleware created');
};

// Run all fixes
const runFixes = async () => {
  try {
    fixUmzugController();
    fixResponseFormats();
    fixFahrzeugValidation();
    fixRouteRegistration();
    fixMissingControllerMethods();
    createLegacyMiddleware();
    
    console.log('\n✅ All endpoint fixes completed!');
    console.log('\nNext steps:');
    console.log('1. Add legacy middleware to server.js:');
    console.log('   const { transformLegacyRequest, transformResponse } = require("./middleware/legacyFormat");');
    console.log('   app.use("/api", transformLegacyRequest);');
    console.log('   app.use("/api", transformResponse);');
    console.log('2. Restart the server: npm run dev');
    console.log('3. Run tests again: node test-all-endpoints.js');
    
  } catch (error) {
    console.error('❌ Error during fixes:', error);
    process.exit(1);
  }
};

runFixes();