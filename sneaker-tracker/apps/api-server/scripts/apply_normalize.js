require('dotenv').config({path: __dirname + '/../.env'});
const db = require('../dist/lib/db.js');
(async () => {
  const { data, error } = await db.supabase.from('releases').select('*');
  if (error) { console.error('Supabase error', error.message); return; }
  let failures = 0;
  data.forEach((row, i) => {
    try {
      const parsed = db.normalizeRawRelease(row);
      if(i < 3) console.log('Parsed sample', parsed);
    } catch (e) {
      failures++;
      console.error('Row failed', row.id, e.message);
    }
  });
  console.log('Total rows:', data.length, 'Failures:', failures);
})();
