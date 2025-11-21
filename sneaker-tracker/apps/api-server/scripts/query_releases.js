require('dotenv').config({path: __dirname + '/../.env'});
const db = require('../dist/lib/db.js');
(async () => {
  const result = await db.supabase.from('releases').select('*');
  console.log(JSON.stringify(result, null, 2));
})();
