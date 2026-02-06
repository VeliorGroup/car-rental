/**
 * Script to split single JSON translation files into namespace-based files
 * Run with: node scripts/split-translations.js
 */

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '../messages');
const LOCALES = ['en', 'it', 'sq', 'el', 'es', 'fr', 'de', 'pt', 'ro', 'mk', 'sr'];

// Mapping of top-level keys to namespace files
const NAMESPACE_MAPPING = {
  // common.json - shared elements
  'Navigation': 'common',
  'Common': 'common',
  
  // Individual page namespaces
  'Dashboard': 'dashboard',
  'Customers': 'customers',
  'Vehicles': 'vehicles',
  'Bookings': 'bookings',
  'Calendar': 'calendar',
  'Branches': 'branches',
  'Cautions': 'cautions',
  'Damages': 'damages',
  'Maintenance': 'maintenance',
  'Analytics': 'analytics',
  'Notifications': 'notifications',
  'Settings': 'settings',
  
  // Auth & Home combined
  'Auth': 'auth',
  'Home': 'home',
  'Register': 'landing',
  'Login': 'landing'
};

function splitLocale(locale) {
  const sourceFile = path.join(MESSAGES_DIR, `${locale}.json`);
  const targetDir = path.join(MESSAGES_DIR, locale);
  
  // Check if source file exists
  if (!fs.existsSync(sourceFile)) {
    console.log(`⚠️  Skipping ${locale}: source file not found`);
    return;
  }
  
  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  // Read source JSON
  const sourceContent = fs.readFileSync(sourceFile, 'utf8');
  const sourceData = JSON.parse(sourceContent);
  
  // Group keys by namespace
  const namespaces = {};
  
  for (const [key, value] of Object.entries(sourceData)) {
    const namespace = NAMESPACE_MAPPING[key];
    
    if (!namespace) {
      console.log(`  ⚠️  Unknown key: ${key} - adding to common.json`);
      if (!namespaces['common']) {
        namespaces['common'] = {};
      }
      namespaces['common'][key] = value;
      continue;
    }
    
    if (!namespaces[namespace]) {
      namespaces[namespace] = {};
    }
    namespaces[namespace][key] = value;
  }
  
  // Write namespace files
  for (const [namespace, data] of Object.entries(namespaces)) {
    const targetFile = path.join(targetDir, `${namespace}.json`);
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log(`  ✅ Created ${locale}/${namespace}.json`);
  }
  
  console.log(`✅ Split ${locale}.json into ${Object.keys(namespaces).length} namespace files\n`);
}

// Main
console.log('🔄 Splitting translation files into namespaces...\n');

for (const locale of LOCALES) {
  console.log(`📁 Processing ${locale}...`);
  try {
    splitLocale(locale);
  } catch (err) {
    console.error(`❌ Error processing ${locale}: ${err.message}`);
  }
}

console.log('🎉 Done! Namespace files created successfully.');
console.log('\n⚠️  Remember to update src/i18n/request.ts to load from new structure.');
console.log('⚠️  After verifying, you can delete the old single JSON files.');
