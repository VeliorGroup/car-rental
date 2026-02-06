const fs = require('fs');
try {
  const content = fs.readFileSync('c:\\WORKSPACE\\CAR RENTAL\\frontend\\messages\\sq.json', 'utf8');
  JSON.parse(content);
  console.log('Valid JSON');
} catch (e) {
  console.error('Invalid JSON:', e.message);
}
