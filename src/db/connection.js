// ============================================================
//  Shared database connection + query helpers
// ============================================================
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { seed, DB_PATH } = require('./seed');

// Auto-seed on first run so the student never has a missing-db error.
if (!fs.existsSync(DB_PATH)) {
  console.log('[db] flex.db not found - seeding a fresh database...');
  seed();
}

const db = new Database(DB_PATH);

// Keep existing databases aligned with the current demo accounts.
db.prepare(`
  UPDATE users
  SET username = 'abdullah', password = '1234',
      full_name = 'Abdullah', email = 'abdullah@flex.edu'
  WHERE username = 'fahad'
`).run();
db.prepare(`
  INSERT INTO users (username, password, full_name, role, email, secret_ssn)
  VALUES ('afifa', 'afifa@', 'Afifa', 'student', 'afifa@flex.edu', '35205-2223334')
  ON CONFLICT(username) DO UPDATE SET
    password = excluded.password,
    full_name = excluded.full_name,
    email = excluded.email
`).run();
db.prepare("UPDATE users SET full_name = 'Abdullah' WHERE username = 'abdullah'").run();
db.prepare("UPDATE users SET full_name = 'Afifa' WHERE username = 'ayesha'").run();
db.prepare("UPDATE wall_posts SET author = 'Abdullah' WHERE author IN ('Fahad Saleem', 'Abdullah Saleem')").run();
db.prepare("UPDATE wall_posts SET author = 'Afifa' WHERE author = 'Ayesha Khan'").run();

// ------------------------------------------------------------
// rawAll() runs a query string DIRECTLY (no parameter binding).
// This is what makes SQL injection genuinely work in the
// vulnerable version - the attacker's input becomes part of
// the SQL text. better-sqlite3 lets us run arbitrary SQL,
// including UNION SELECT and information_schema-style queries
// against sqlite_master.
// ------------------------------------------------------------
function rawAll(sql) {
  return db.prepare(sql).all();
}

function rawGet(sql) {
  return db.prepare(sql).get();
}

module.exports = { db, rawAll, rawGet };
