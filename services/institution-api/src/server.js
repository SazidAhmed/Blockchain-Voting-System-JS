const app = require('./app');
const { initDatabase } = require('./config/database');

const PORT = process.env.PORT || 4000;

async function start() {
  for (let attempt = 1; attempt <= 15; attempt++) {
    try { await initDatabase(); break; }
    catch (err) {
      console.log('Attempt ' + attempt + '/15 - DB not ready: ' + err.message);
      if (attempt === 15) { process.exit(1); }
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  app.listen(PORT, '0.0.0.0', () => console.log('Institution API on port ' + PORT));
}

start();
