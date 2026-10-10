// ============================================================
//  Flex Student Portal - Central configuration
// ============================================================
// The ENTIRE security posture of the app is controlled from
// ONE place: the MODE flag below.
//
//   MODE = "vulnerable"  -> all attacks (XSS, CSRF, SQLi) work
//   MODE = "safe"        -> every attack is blocked
//
// You can set it with an environment variable:
//     MODE=vulnerable npm start      (or: npm run vulnerable)
//     MODE=safe       npm start      (or: npm run safe)
//
// If no environment variable is given, it falls back to the
// DEFAULT_MODE value written here.
// ============================================================

const DEFAULT_MODE = 'vulnerable';

const MODE = (process.env.MODE || DEFAULT_MODE).toLowerCase();

if (MODE !== 'vulnerable' && MODE !== 'safe') {
  console.error(`\n[CONFIG ERROR] MODE must be "vulnerable" or "safe", got "${MODE}"\n`);
  process.exit(1);
}

const isVulnerable = MODE === 'vulnerable';
const isSafe = MODE === 'safe';

module.exports = {
  MODE,
  isVulnerable,
  isSafe,
  PORT: process.env.PORT || 3000,
  ATTACKER_PORT: process.env.ATTACKER_PORT || 4000,
  SESSION_SECRET: 'flex-portal-demo-secret-key',
};
