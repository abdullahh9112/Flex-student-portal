# Flex — Student Portal (Web Security Project, Blue Team Focus)

A full-stack student portal called **Flex** built to demonstrate how common web
vulnerabilities work, how they are exploited, and how they are properly fixed —
all in **one project with two switchable versions**.

- **Vulnerable Version** — deliberately insecure; every attack below works end-to-end.
- **Safe Version** — the same application, hardened so every attack is blocked.

Both versions are **the same code base**. The security posture is controlled by a
single configuration flag (`MODE`), so the difference between vulnerable and safe
is easy for the examiner to see.

---

## Use Case

**Flex** is a university **Student Information System** (modelled on the FAST NUCES
student portal). A logged-in student can:

- Sign in to their account
- View a **dashboard** with their stats
- Browse **My Courses** and **My Grades**
- **Search** the course catalogue
- Post on the **Class Wall** (a shared message board)
- See a personalised **Welcome Board**
- View their **Profile** and **change their password**

These are ordinary, realistic features — which is exactly what makes the attacks
meaningful: they target a login form, a search box, a comment wall, a URL fragment,
and a password-change action, just like a real application.

---

## Tech Stack

| Layer      | Technology |
|------------|-----------|
| Runtime    | **Node.js** |
| Web server | **Express** |
| Views      | **EJS** (server-side rendered HTML) |
| Database   | **SQLite** via **better-sqlite3** (real, file-based, query-executing DB) |
| Sessions   | **express-session** + **cookie-parser** |
| Styling    | Plain CSS (no framework) |

The database is **real and query-driven** — the SQL injection vulnerabilities and
their fixes are genuine, not hard-coded or faked. In the vulnerable version the
user's input is concatenated directly into SQL text; in the safe version the same
queries use parameter binding.

---

## What You Need to Install

1. **Node.js** (version 18 or newer) — includes `npm`.
   Download: <https://nodejs.org> → install the **LTS** version.
   Check it worked:
   ```bash
   node -v
   npm -v
   ```

That's it. There is **no separate database server to install** — SQLite is bundled,
and the database file (`flex.db`) is created and seeded automatically on first run.
There are **no paid APIs** and nothing else to configure.

---

## How to Run

Open a terminal **inside the project folder** (the folder that contains this README),
then install dependencies once:

```bash
npm install
```

### Run the VULNERABLE version (attacks work)

```bash
npm run vulnerable
```

### Run the SAFE version (attacks blocked)

```bash
npm run safe
```

Either way, open your browser at:

```
http://localhost:3000
```

The server logs the current security mode when it starts. Only run one version
at a time; they both use port 3000.

> **Tip:** `npm start` runs whichever mode is set in `src/config.js`
> (`DEFAULT_MODE`, which ships as `vulnerable`). The `vulnerable` / `safe`
> scripts just set the `MODE` environment variable for you.

### Demo accounts

| Username | Password          | Role    |
|----------|-------------------|---------|
| `admin`  | `SuperSecret@123` | admin   |
| `abdullah` | `1234`          | student |
| `afifa`  | `afifa@`          | student |
| `ayesha` | `ayesha@pass`     | student |
| `bilal`  | `bilalPwd99`      | student |

### Reset the database

If you want to wipe the data and re-seed fresh demo content:

```bash
npm run reset-db
```

---

## Running the CSRF attacker site

The CSRF attack needs a **second, different website** (a malicious external page).
It is included in the `attacker/` folder and runs on its own port (**4000**).

In a **second terminal**:

```bash
npm run attacker
```

Then, while you are **logged into Flex**, open:

```
http://localhost:4000
```

- In the **vulnerable** version, this page silently changes your Flex password.
- In the **safe** version, Flex rejects the forged request.

Full step-by-step payloads and what to screenshot are in **[ATTACKS.md](ATTACKS.md)**.

---

## Implemented Vulnerabilities and Defenses

| # | Vulnerability | Where in Flex | Fix in the Safe Version |
|---|---------------|---------------|-------------------------|
| 1 | **Reflected XSS** | Course Search — the `?q=` term is echoed back into the page | Output is HTML-escaped before rendering |
| 2 | **Stored XSS** | Class Wall — a saved post is shown to every visitor | Stored content is HTML-escaped at output time |
| 3 | **DOM-based XSS** | Welcome Board — client JS reads `location.hash` | Uses `textContent` instead of `innerHTML` |
| 4 | **CSRF** | Change Password (a genuine state-changing action) | Per-session CSRF token is required + `SameSite`/`HttpOnly` cookie |
| 5 | **SQL Injection — Easy** | Login form — `' OR '1'='1` / `admin' --` bypass | Parameterised query |
| 6 | **SQL Injection — Intermediate** | Course Search — boolean inference | Parameterised query |
| 7 | **SQL Injection — Advanced** | Course Search — UNION chain: columns → tables → columns → data | Parameterised query with a fixed column list |

### Where the vulnerable vs safe logic lives

The entire difference between the two versions is in **`src/security.js`**, which
every route uses:

- `outputText()` — escapes user content in safe mode, returns it raw in vulnerable mode (XSS).
- `csrfOk()` — validates the CSRF token in safe mode, always passes in vulnerable mode (CSRF).
- The SQL routes (`src/routes/auth.js`, `src/routes/portal.js`) branch on the mode:
  string-concatenated SQL in vulnerable mode, parameterised queries in safe mode (SQLi).

The session cookie is also hardened (`HttpOnly` + `SameSite`) only in safe mode
(`src/server.js`).

---

## Project Structure

```
flex-portal/
├── README.md                     ← this file
├── ATTACKS.md                    ← every payload + what to screenshot
├── package.json
├── src/
│   ├── config.js                 ← the MODE flag (vulnerable | safe)
│   ├── security.js               ← vulnerable-vs-safe logic lives here
│   ├── server.js                 ← Express app + session hardening
│   ├── db/
│   │   ├── seed.js               ← creates + seeds flex.db
│   │   ├── connection.js         ← shared DB connection + raw query helper
│   │   └── flex.db               ← (auto-generated on first run)
│   ├── routes/
│   │   ├── auth.js               ← login (SQLi easy), change-password (CSRF)
│   │   └── portal.js             ← search (reflected XSS + SQLi), wall (stored XSS), welcome (DOM XSS)
│   ├── views/                    ← EJS templates (login, dashboard, etc.)
│   └── public/
│       ├── css/style.css
│       └── js/dom-xss.js         ← client-side DOM XSS sink
└── attacker/
    ├── attacker-server.js        ← serves the malicious page on :4000
    └── csrf-change-password.html ← the CSRF attack page
```

---

## ⚠️ Disclaimer

This project is intentionally insecure **for educational purposes only**. The
vulnerable version must **never** be deployed on a public server or used with real
data. Run it locally (`localhost`) only.
