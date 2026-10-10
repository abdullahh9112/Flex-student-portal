// ============================================================
//  Attacker server (the "malicious external site")
// ============================================================
// Runs on a DIFFERENT origin (http://localhost:4000) from the
// Flex portal (http://localhost:3000). This cross-origin setup
// is what makes the CSRF demonstration genuine.
//
//   Run:   npm run attacker
//   Then:  open http://localhost:4000/  while logged into Flex
// ============================================================
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.ATTACKER_PORT || 4000;
const PAGE = path.join(__dirname, 'csrf-change-password.html');

http
  .createServer((req, res) => {
    fs.readFile(PAGE, (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end('Could not load attacker page.');
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  })
  .listen(PORT, () => {
    console.log('\n================================================');
    console.log('   ATTACKER SITE (malicious external page)');
    console.log(`   URL: http://localhost:${PORT}`);
    console.log('   Open this while logged into Flex to test CSRF.');
    console.log('================================================\n');
  });
