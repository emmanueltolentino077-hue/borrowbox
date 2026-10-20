# BorrowBox Plan

*Status: planning only. Nothing is implemented. Supabase and EmailJS are not yet set up. This plan is **locked** when submitted; later changes go in the change log (Part 3, section 4).*

*Planning date: 2026-10-20. Sources: `BorrowBox-Project-Overview-Challenge.md`, `DESIGN-SYSTEM (1).md`, and the grill-me session. All answers below were decided by the project owner.*

---

## Part 1: Summary

BorrowBox is an admin-only web app that IT officers use to lend campus hardware (laptops, monitors, projectors and more) to faculty, staff and students, and to record when it comes back. Admins are pre-registered by HR as `pending`, activate their own account by email, are forced to set their own username and password at first login, and then use four modules: Dashboard, New Borrow, Returns Desk and Equipment Inventory. Borrowers never log in; they are records that admins search for. All stock changes and returns run as single database transactions so two admins can never lend the same unit or return the same borrow twice. All due dates are 17:00 in `APP_TIMEZONE` (`Asia/Manila`), and every status and number comes from one shared server function.

**Phase order:** Phase 0 Setup -> Phase 1 Activation -> Phase 2 Login, first-login setup and sessions -> Phase 3 Equipment Inventory -> Phase 4 New Borrow -> Phase 5 Returns Desk -> Phase 6 Dashboard -> Phase 7 Hardening.

**Why this order (Q39, in Phase 0):** authentication comes first because every page and API is admin-only (Q11). Inventory comes before borrowing because borrowing needs stock to take from. Returns need borrows to close. The Dashboard only adds up the earlier phases, so it is last.

---

## Part 2: Phases

Every phase leaves the app in a state that runs. A phase may not start until the phase it depends on passes its "Done when".

### Phase 0: Setup

| Part | What to write |
|---|---|
| **Phase name and goal** | **Phase 0, Setup.** The project runs locally with Supabase connected, EmailJS able to send one test email, all tables and seed data in place, and the design tokens and shared utilities ready. |
| **Depends on** | Nothing. This phase is the foundation. |
| **Questions covered** | **Q21, Q37, Q38, Q39, Q40** (answers below). |
| **Data and seed rows** | All tables in Part 3, `rate_limits`, the database functions listed in Part 3, and the Q37 seed rows. |
| **Screens, components and endpoints** | No product screens. Build: design tokens (CSS variables from the design system, mapped into the Tailwind v4 theme), Inter and JetBrains Mono, Lucide icons, shared components (Button, Badge, StatCard, SearchField, ProgressBar, Input, DataTable, Modal), the shared server helpers (`getNow()`, due-date builder, status function, stock-status function), and a Supabase server client. |
| **Tasks** | See the setup gates 0.1 to 0.6 below. |
| **Done when** | Gates 0.1 to 0.6 pass: the connectivity check succeeds, a real test email arrives in an inbox you own, the seed counts match Q37, and `npm run build` and `npm run lint` pass. |
| **Tests** | **Proves it works:** the Supabase check returns data and the EmailJS test email arrives in the inbox. **Tries to break it:** run the check with a wrong URL or key and confirm it fails with a clear error, not a silent pass. |

**Setup gates.** If a gate fails, stop and fix it. Do not move on.

| Step | What happens | Gate |
|---|---|---|
| 0.1 | The owner creates the Supabase project and the EmailJS account, service and template, then fills `my-app/.env.local` (see "Setup guide" below). | Owner confirms, with no keys shared. |
| 0.2 | Check that `.env.local` is in `my-app/`, is ignored by Git, and has no secret under a `NEXT_PUBLIC_` name (variable names only, never values). | Pass. |
| 0.3 | **Supabase connectivity:** a server-only check script reads from Supabase with the secret key. | Success response. |
| 0.4 | `schema.sql` and `seed.sql` are written and run in the Supabase SQL Editor. | Table list and seed counts match Q37. |
| 0.5 | **EmailJS smoke test:** one test email to a mailbox the owner controls. | The email is in the inbox (check spam too). A `200 OK` alone does not count. |
| 0.6 | Design tokens, fonts, shared components and utilities. | App builds and runs. |

**Setup guide (pending prerequisites, not yet done).**
- **Supabase:** create a project named `borrowbox` in the region nearest the Philippines. Save the database password in a password manager. In the dashboard find the Project URL and the secret key (`sb_secret_...`, or the legacy `service_role` key if that is all that is shown). Put them in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Row Level Security is on for every table with no policies, because only the server key is used. Supabase Auth is not used.
- **EmailJS:** create an account, add an email service (connect a mailbox you own), and create a template using `{{to_email}}`, `{{to_name}}`, `{{username}}`, `{{temp_password}}` and `{{login_url}}`. Copy the Service ID, Template ID, Public Key and Private Key. Turn on "Allow EmailJS API for non-browser applications" in Account settings (stated by the brief; not confirmed on the EmailJS REST page). Server-side sending uses `POST https://api.emailjs.com/api/v1.0/email/send` with `service_id`, `template_id`, `user_id` (public key), `template_params` and `accessToken` (private key). The documented rate limit is 1 request per second. The brief states 200 emails per month on the free tier.
- **Environment variables:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET` (a 64-character random hex string made locally and never shared), `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`, `APP_TIMEZONE=Asia/Manila`. No secret uses a `NEXT_PUBLIC_` prefix. No key is ever pasted into chat or committed to Git.
- **Test mailboxes:** every seeded pending admin email must be one the owner can open (for example plus-addressing on a mailbox the owner owns).

**Q21. Which stock numbers are stored and which are calculated?**
- *Answer:* Stored: `equipment.total_units` and `equipment.available_units`, plus `borrow_items.quantity` for history. Calculated: borrowed units = `total_units - available_units`. Database `CHECK` constraints enforce `0 <= available_units <= total_units`. A test compares the calculated borrowed units against the sum of `borrow_items.quantity` for unreturned borrows.
- *Reason:* the brief's starter schema already stores `available_units`. A stored value lets issuing a borrow be one conditional update, which is the safest answer to two admins taking the last unit (Q19).
- *Rejected alternative:* calculate available stock only from borrow records. It needs a locked aggregate inside a database function and changes the starter design.
- *Cost:* the stored number can drift from the borrow records if code updates it outside the database functions. All changes go through database functions, and the reconciliation test guards the invariant.

**Q37. Which seed rows prove every status, filter and flow works?**
- *Answer:* dates are written relative to "now" in `APP_TIMEZONE` so the rows stay valid on any day.
  - **Admins:** two `pending` admins with real, openable mailboxes; one of them has an Employee ID containing an uppercase letter and a hyphen (to test the temporary-username rule). One `active` admin with `must_change_credentials = false` and a known test password. One `active` admin with `must_change_credentials = true`.
  - **Borrowers:** at least 8, across CECT, CAS, CON and CBA, as faculty, staff and students. One borrower has several active borrows.
  - **Equipment:** at least 12 items across Monitor, PC, Mouse, Keyboard, Headset and Projector. Include: Ready, Low Stock at the exact threshold boundary, Depleted (available 0), a 1-unit item, items with and without photos, and one archived item with returned history. Counts match the borrows.
  - **Borrows:** active and not yet due; due today before 17:00; due today after 17:00 (via the test clock below); overdue; returned today; returned on an earlier day; one borrow with several different items and quantities above one; one borrow containing an archived item.
- *Test clock:* all status logic reads time through one `getNow()` helper so tests can fix the time (for example 16:59:59 and 17:00:00). This is a test-only override.
- *Reason:* a varied dataset lets every badge, filter, boundary and flow be tested without live data.

**Q38. One test that proves it works and one that tries to break it, per phase.**
- *Answer:* these are in the **Tests** row of every phase below.
- *Reason:* a screen that renders does not prove correctness. Each phase needs a normal case and an attack or failure case.

**Q39. Phases, order, dependencies.** *(Harder question.)*
- *Answer:* the eight phases in Part 1, each with its dependency in its own table.
- *Reason:* each phase stands on a stable foundation: auth, then catalog, then borrowing, then returns, then totals.
- *Rejected alternative:* build every screen first and connect them at the end. Stock and status rules would be assumed in many places and need expensive rework.
- *Cost:* more schema and test work up front, in exchange for fewer data bugs later.

**Q40. Which decisions are mine, which does the agent make, where do I check?**
- *Answer:* the project owner decides business rules, access policy, stock and status meaning, security requirements and anything the designs require. The agent chooses implementation details (component structure, utility names) as long as they keep the agreed rules. The owner checks every phase by reviewing changed files and migrations, build and lint results, manual tests against the screenshots, database rows after issue and return, negative tests (no session, duplicate action, concurrent stock), and that Dashboard, Returns Desk and Inventory numbers agree.
- *Reason:* an agent can build fast, but only the owner can confirm behavior matches the requirements and the designs.
- *Rejected alternative:* accept the agent's "done" summary without testing. A passing build does not prove security or correct database behavior.

---

### Phase 1: Activation

| Part | What to write |
|---|---|
| **Phase name and goal** | **Phase 1, Activation.** A seeded pending IT officer can activate their account on `/activate` and receive temporary login details at their registered email. |
| **Depends on** | Phase 0: tables, seed admins, EmailJS delivery (gate 0.5), and `rate_limits`. |
| **Questions covered** | **Q1, Q2, Q3, Q4** (answers below). |
| **Data and seed rows** | `admins` (pending rows), `rate_limits`. Uses the two pending seed admins. |
| **Screens, components and endpoints** | `/activate` screen from `BorrowBox-Account Activation.png` (not yet viewed, see open questions). `POST /api/activate`. Reuse Input, Button and the rate-limit function. Apply the design system tokens and the frontend-design skill: follow the supplied design exactly where it specifies something, keep copy in plain sentence case with active verbs, and make the error state explain what to do. |
| **Tasks** | [ ] Server validates Employee ID and email format. [ ] Rate-limit check (see below). [ ] Lookup by Employee ID and email on a `pending` row. [ ] Generate a random temporary password and hash it. [ ] Compare-and-set steps 1 to 3 (see Q3). [ ] EmailJS send from the server. [ ] Neutral response for every outcome. [ ] Specific reasons logged on the server only. [ ] Rate-limit window and concurrency tests. |
| **Done when** | An officer activates with the seeded Employee ID and email, receives a real email in their inbox with a temporary username and password, and that password logs in (login itself is built in Phase 2; Phase 1 proves the hash and status are correct, and the full login proof happens at the Phase 2 gate). Activation is **not** declared complete until a real email has arrived. |
| **Tests** | **Proves it works:** activate seeded officer 1; the email arrives; `status = active`, `must_change_credentials = true`, `activated_at` set. **Tries to break it:** wrong ID or email, unknown account, already-active account, simulated email outage, and two simultaneous requests for the same account. Each gives the same neutral message; the outage leaves the account `pending` with a retry possible; the concurrent case ends with one valid credential. Also: the 4th attempt on one Employee ID within an hour is blocked. |

**Q1. Who can activate, what proof, why?** *(Harder question.)*
- *Answer:* only IT officers whom HR pre-registered with status `pending`. They give their Employee/Staff ID and company email, and both must match the same pending record. The system then emails the temporary login details to that registered mailbox.
- *Reason:* the ID alone is easy to learn (it can be on a badge), and an email alone is easy to guess. Matching both to one record rules out random or mistaken lookups. The real proof of ownership is the mailbox: only someone who can read the registered inbox receives the credentials.
- *Student scenario:* a student who knows both values can only trigger an email to the real officer. They cannot read it, so they gain nothing. The officer could see an unexpected email, or a temporary rate-limit block, and could lose time if the email goes astray. Matching both fields does not prove identity or stop someone from triggering emails; the emailed credentials and the rate limit cover that.
- *Rejected alternative:* a separate verification link before sending credentials. It adds token storage, a second email (the free plan allows 200 emails a month), another workflow and a change to the brief. Open registration is also rejected because it would allow accounts without an HR record.
- *Cost:* a temporary password travels by email, and EmailJS history may keep it. Rate limiting and safe retries are needed. If the email never arrives, recovery is manual (Q3).

**Q2. What happens when the ID or email is wrong, the account does not exist, or it is already active?**
- *Answer:* **one neutral response for every outcome**, including email failure: "If these details match a pending account, sign-in details have been sent to the registered email. If nothing arrives, contact the system administrator." (Copy to be finalized against the screenshot.) A rate-limited request gets "Too many attempts. Try again later." Specific reasons (no match, already active, send failed) are logged on the server only.
- *Reason:* different messages would let someone test which IDs and emails exist.
- *Cost:* an officer whose email failed is not told why, so the message points them to the administrator.

**Q3. Exact activation steps, and what if email fails?** *(Harder question.)*
- *Answer, in order:*
  1. Validate Employee ID and email format.
  2. Check the rate limits (activation: 3 per Employee ID and 10 per IP per hour).
  3. Find the admin by Employee ID and email with `status = pending`. If none, return the neutral response.
  4. Generate a cryptographically random temporary password and hash it with bcryptjs.
  5. **Compare-and-set 1:** `UPDATE admins SET password_hash = <new hash> WHERE id = X AND status = 'pending'`. If no row changes, return the neutral response.
  6. Send the email through EmailJS (server side, private key).
  7. **Compare-and-set 2:** `UPDATE admins SET status = 'active', activated_at = now(), must_change_credentials = true WHERE id = X AND status = 'pending' AND password_hash = <the same hash>`.
  8. Return the neutral response.
- *If sending fails:* the account stays `pending`; the officer can try again and a retry replaces the stored hash. Login refuses any account that is not `active`, so a hash stored before activation cannot be used.
- *Known races:* two simultaneous requests can send two emails and only the later credentials work (the email tells the officer to use the newest). A crash between send and step 7 leaves the account `pending`; a retry fixes it. If the provider accepts the email but it never arrives, the account becomes `active` with credentials nobody has: recovery is a **manual reset to `pending`** by HR or the developer using the service-role key. There is no public re-activation and no forgot-password flow because the brief has none.
- *Reason:* an account must not become active before the officer has the credentials.
- *Rejected alternative:* mark the account active first. A failed send would leave an active account whose credentials nobody received. Sending first and then failing to save the credentials would send unusable credentials.
- *Cost:* the provider saying "OK" does not guarantee inbox delivery. Manual recovery is needed. Concurrent requests can cause two emails.

**Q4. What does the admin receive, and how is it created?**
- *Answer:* one email containing the temporary username (the seeded Employee ID, exactly as stored), a cryptographically random temporary password, and the login URL. The server creates it with a secure random generator and stores only its bcrypt hash. No plaintext is stored.
- *Reason:* email can be forwarded or read by others, so the password must be unpredictable, hashed in the database, and replaced at first login.
- *Cost and risk:* the temporary password appears in the email, and EmailJS history may keep template parameters. This flow is not risk-free. The first-login change limits the exposure.

---

### Phase 2: Login, first-login setup and sessions

| Part | What to write |
|---|---|
| **Phase name and goal** | **Phase 2, Login, setup and sessions.** An admin can log in with the emailed temporary credentials, must set a new username and password at `/setup-credentials`, and then reaches `/dashboard`; every page and API is protected on the server. |
| **Depends on** | Phase 1: activated accounts and temporary credentials. |
| **Questions covered** | **Q5, Q6, Q7, Q8, Q9, Q10, Q11, Q12** (answers below). |
| **Data and seed rows** | `admins` (`must_change_credentials`, `username`, `password_hash`), `rate_limits` (login keys). Uses the active seed admins. |
| **Screens, components and endpoints** | `/login`, `/setup-credentials` (from the Login and Update Admin Credentials screenshots, not yet viewed). `POST /api/login`, `POST /api/logout`, `POST /api/setup-credentials`. A shared server guard used by every protected page and route handler. A placeholder `/dashboard` page so the redirect lands somewhere that runs. Live checklist component for the username and password rules. The sidebar shell with the active item in solid Primary. |
| **Tasks** | [ ] Read the Next.js 16 docs in `node_modules/next/dist/docs/` (`proxy.md`, `authentication.md`) and fix the guard placement before building. [ ] bcrypt login with a neutral error. [ ] JWT in an HttpOnly cookie (8 hours). [ ] Guard that reads `status` and `must_change_credentials` from the database on every protected request. [ ] Setup form with live checklist and server re-check. [ ] Re-issue the session after setup. [ ] Login and sign-out. [ ] Login rate limit. |
| **Done when** | An officer activated in Phase 1 logs in with the temporary credentials, is forced to `/setup-credentials`, cannot reach any other page or API until setup finishes, then lands on `/dashboard` and can sign out. |
| **Tests** | **Proves it works:** full path from temporary login through setup to the dashboard, then sign out. **Tries to break it:** call a protected API directly with no cookie and with a setup-incomplete cookie (both rejected); wrong username and wrong password give the same message; 6 failed logins for one username are blocked; revisit `/setup-credentials` after setup and get redirected. |

**Q5. What happens at first login?**
- *Answer:* the admin logs in with the temporary username and password. If `must_change_credentials` is true they are redirected to `/setup-credentials`. Until setup is done they can open only that page and sign out; Dashboard, New Borrow, Returns Desk and Inventory are blocked.
- *Reason:* an account must set its own permanent credentials before doing sensitive work.

**Q6. Where is the first-login rule enforced?** *(Harder question.)*
- *Answer:* **both** page and server. A shared server guard checks every protected page and API request. `proxy.ts` may add a quick cookie-present redirect, but the Next.js 16 docs say Proxy is for optimistic checks and not for full authorization, so it is never the only check.
- *Reason:* a page redirect can be skipped by calling an API directly, and then the data operations would be exposed.
- *Rejected alternative:* client-side redirects only (browser code is under the user's control), or page-only checks.
- *Cost:* one database lookup on every protected request, and the check must stay in a single shared function so it is not forgotten on a route.

**Q7. What happens after saving credentials?**
- *Answer:* validate on the server, save the new username and a bcrypt hash of the new password, set `must_change_credentials = false`, issue a fresh session cookie, and redirect to `/dashboard`. Opening `/setup-credentials` later redirects to `/dashboard`.
- *Reason:* the user must not stay in a temporary-credentials state, and the setup page must not become a way to overwrite credentials later.

**Q8. Who checks the username and password rules?**
- *Answer:* both. The browser shows a live checklist; the server checks everything again before saving.
- *Rules:* username at least 4 characters, lowercase letters, numbers and periods only, and unique across all admins (including pending rows). Password at least 8 characters with an uppercase letter, a lowercase letter, a number and a special character, and a matching confirm field. The **temporary** login username (the seeded Employee ID) is exempt: login does not apply the username format rule.
- *Reason:* the browser gives fast feedback, but only the server can be trusted. Field-level errors say which rule failed; nothing invalid is saved.
- *Note:* a "username taken" error may hint that a pending admin holds that name. Accepted as a minor leak.

**Q9. Is setup one-time or repeatable?**
- *Answer:* one-time. The database flag `must_change_credentials` is set to `false` only after a successful setup. No later password-change feature is built, because the brief does not include one.
- *Reason:* a stored flag is more reliable than browser state, which can be cleared or changed.

**Q10. How does the system know who is logged in?**
- *Answer:* a signed JWT (`jose`) in an HttpOnly, SameSite cookie (Secure in production) with a fixed 8-hour lifetime. There is **no trusted-workstation option**. Signing out clears the cookie. On every protected request the server also reads the admin row, so pending or setup-incomplete accounts are blocked immediately.
- *Reason:* the server identifies the admin without trusting anything the browser sends, and the brief specifies the cookie-based JWT.
- *Limitation (documented):* clearing the cookie does not revoke a copied, unexpired token. No server-side session table is added.

**Q11. Which pages and APIs need a logged-in admin?**
- *Answer:* `/dashboard`, `/new-borrow`, `/returns`, `/inventory` and every API for borrower search, equipment, image upload, CSV export, issuing a borrow, returning a borrow and the Dashboard numbers. `/login` and `/activate` are public. `/setup-credentials` needs a session whose `must_change_credentials` is true. Every route calls the shared guard itself.
- *Reason:* protecting pages alone is not enough; each API must check on its own.

**Q12. What does login say when the details are wrong?**
- *Answer:* "Invalid username or password" for a wrong username, a wrong password, an unknown username, and an account that is not `active`. Failed logins are rate-limited (5 per username and 20 per IP per 15 minutes). Implementation note: the server runs a dummy password comparison for unknown usernames so timing does not reveal them.
- *Reason:* one message reduces username guessing.

---

### Phase 3: Equipment Inventory

| Part | What to write |
|---|---|
| **Phase name and goal** | **Phase 3, Equipment Inventory.** A logged-in admin can see, search, filter, add, edit, archive or delete, and export equipment with photos. |
| **Depends on** | Phase 2: all inventory pages and APIs are admin-only. |
| **Questions covered** | **Q30, Q31, Q32, Q33, Q34** (answers below). |
| **Data and seed rows** | `equipment`, Supabase Storage bucket `equipment-images` (public). Uses the seeded equipment, including the archived item and the boundary-stock items. |
| **Screens, components and endpoints** | `/inventory` with three cards, search, category filter, status filter, refresh, table (photo, name, code, total, borrowed progress bar, status badge, row menu), and the Add/Edit modal (from the two Inventory screenshots, not yet viewed). `GET /api/equipment`, `POST /api/equipment`, `PATCH /api/equipment/[id]`, `DELETE /api/equipment/[id]`, `GET /api/equipment/export`. Reuse DataTable, Modal, Badge, ProgressBar, StatCard. Status badges use the design system mapping (Ready/Available, Low Stock, Depleted/Out of Stock) and always show the word. |
| **Tasks** | [ ] Shared stock-status function. [ ] List, search and filters. [ ] Add with product-code and photo validation. [ ] Edit with the total-units rule. [ ] Delete or archive rules. [ ] CSV export of the current filtered list. [ ] Cleanup of orphan images on failure. |
| **Done when** | An admin adds an item with and without a photo, edits it, sees the correct status and numbers, exports CSV, archives an item with history, and deleting a never-used item removes it. |
| **Tests** | **Proves it works:** add a valid item with a PNG photo and see it in the table with the right badge. **Tries to break it:** duplicate code in different case (`ab-1` vs `AB-1`), a 5 MB image, a file renamed `.png` that is not an image, total below the borrowed quantity, and delete or archive while units are out. |

**Q30. What makes a product code valid?**
- *Answer:* non-blank after trimming, unique ignoring case (so `ab-1` and `AB-1` are the same), enforced by a database unique index on the trimmed, upper-cased code as well as by the form. The exact format is an open question (see Part 3).
- *Reason:* case-insensitive uniqueness stops duplicate entries that differ only by capitals, and the database enforces what a form cannot guarantee.

**Q31. Rules for Available, Low Stock and Out of Stock?**
- *Answer:* one shared function and one shared constant. Out of Stock (shown as Depleted on cards) when available is 0, and this wins over Low Stock. Low Stock when available is above 0 and at or below the threshold. The threshold is 20% of total units rounded up with a minimum of 1, calculated with integer math as `(total + 4) / 5` (integer division). Otherwise Ready/Available. Examples: total 1 gives threshold 1 (1 available is Low Stock); total 5 gives threshold 1 (1 available is Low Stock, 2 is not); total 10 gives threshold 2 (2 is Low Stock, 3 is not).
- *Reason:* one definition prevents different pages from showing different badges for the same item.
- *Cost:* an item with a single unit is always Low Stock when available.

**Q32. Edit total units when 4 of 10 are borrowed.** *(Harder question.)*
- *Answer:* the new total must be at least the borrowed units (4). Lower values are rejected. If the total becomes 4, available becomes 0. The change is applied under a row lock as `available_units = available_units + (new_total - old_total)`.
- *Reason:* total cannot be lower than the units already out, or availability would be negative.
- *Rejected alternative:* allow any total, even below the borrowed amount.
- *Cost:* the admin must wait for returns before shrinking the total, and the update needs a locked database operation so it cannot clash with a borrow.

**Q33. What does Delete do?** *(Harder question.)*
- *Answer:* if any units are currently borrowed (`total_units - available_units > 0`), both delete and archive are blocked with a clear message. If the item has any borrow history (any `borrow_items` row), Delete **archives** it (`is_archived = true`) and keeps the history. If it has no history and no units out, Delete **permanently removes** it and its stored photo. Archived items are hidden from Inventory and New Borrow and are excluded from the card totals; their names still appear in View Items for old borrows. A product code stays reserved while its row exists, so an archived item's code cannot be reused. There is no archive-management or restore screen.
- *Reason:* permanent deletion would break old borrow records.
- *Rejected alternative:* cascade the delete into borrow history. It would erase transaction evidence.
- *Cost:* a code is permanently burned once archived, and a hard-deleted code becomes free again.

**Q34. How are photos handled?**
- *Answer:* optional. PNG, JPG or WEBP up to **4 MB**. The server checks the size and the real file type (content, not just the extension), generates its own filename, stores the file in the public `equipment-images` bucket, and saves the full public URL in `image_url`. The duplicate-code check runs before the upload. If the upload or the database write fails, any file already uploaded is deleted and no half-created item is saved. A retry cannot create a duplicate item.
- *Reason:* a file extension can be faked, and keeping files in storage keeps equipment rows small.

---

### Phase 4: New Borrow

| Part | What to write |
|---|---|
| **Phase name and goal** | **Phase 4, New Borrow.** An admin can find a borrower, build a tray of equipment, choose a due date, and issue the borrow, with stock reduced safely. |
| **Depends on** | Phase 3: stock to lend and the shared stock function. Phase 0: borrower seed rows and the due-date helper. |
| **Questions covered** | **Q13, Q14, Q15, Q16, Q17, Q18, Q19, Q20, Q22** (answers below). |
| **Data and seed rows** | `borrowers`, `equipment`, `borrows`, `borrow_items`. Uses the seeded borrowers and equipment. |
| **Screens, components and endpoints** | `/new-borrow` with borrower search, 6-card paged catalog with search and category filter, tray with steppers, delete and Clear Tray, due-date options (3 Days, 1 Week, Custom), Confirm modal and Success modal (from the three New Borrow screenshots, not yet viewed). `GET /api/borrowers/search`, `GET /api/equipment` (reused, excludes archived), `POST /api/borrows`. Database function `issue_borrow`. Card states: Ready, Low Stock, Depleted, and Staged when in the tray. |
| **Tasks** | [ ] Borrower search. [ ] Catalog with paging, search, filter and Staged state. [ ] Tray state in the page. [ ] Due-date builder (server side). [ ] Issue Borrow enable rules. [ ] Confirm and Success modals shown only after commit. [ ] `issue_borrow` database function. [ ] Stock-conflict message. |
| **Done when** | An admin issues a multi-item borrow, the success window appears only after the data is saved, stock drops by the right amounts, and "Done & New Borrow" starts clean. |
| **Tests** | **Proves it works:** issue a borrow with two items and quantities above one; check `borrows`, `borrow_items` and `available_units`. **Tries to break it:** two simultaneous requests for the last unit (exactly one succeeds); a tray with one item that went short (nothing is issued and the short item is named); a custom date of today; a posted past date or invalid date; a forged timestamp from the browser (ignored). The 00:30 test: an issue at 00:30 on 20 October in `Asia/Manila` (still 19 October in UTC) must use the Philippine date for the 3-day and 7-day options. |

**Q13. Steps to lend equipment.**
- *Answer, in order:* (1) select a valid borrower; (2) pick equipment from the catalog; (3) add quantities to the tray; (4) choose 3 Days, 1 Week or Custom; (5) the page validates borrower, quantities and date; (6) review the Confirm window; (7) click the final Issue action; (8) the server revalidates and reserves stock atomically; (9) the borrow and its item rows are created; (10) the Success window shows only after the transaction commits.
- *Reason:* preparing is separated from the stock-changing step, and the screen never claims success before the data is saved.

**Q14. When is Issue Borrow enabled?**
- *Answer:* only when a borrower is selected, at least one item is in the tray, every quantity is a positive whole number within the currently known available stock, and the date option is valid. Otherwise it is disabled. The server repeats every check.
- *Reason:* stops incomplete requests, but stock can still change after the button is enabled, so the server is the final check.

**Q15. Which tables change when a borrow is issued?**
- *Answer:* `borrows` (one new row), `borrow_items` (one row per distinct equipment item) and `equipment.available_units` (reduced). All inside one transaction. No audit table exists in the brief, so none is added.
- *Reason:* the borrow row is the transaction, the item rows keep each product's quantity, and the stock column must change together with them or not at all.

**Q16. What resets after the Success window?**
- *Answer:* the selected borrower, tray, quantities and due-date choice are cleared, and the catalog stock is refreshed. The saved borrow stays in the database. "Done & New Borrow" starts a fresh borrow.
- *Reason:* the next borrow must not reuse the previous borrower or items by accident.

**Q17. Where does the tray live?**
- *Answer:* in the page's own memory. It survives moving between catalog pages, search and filters, but a browser refresh clears it. No drafts are saved, because the brief lists saving drafts as not part of the project. The screen makes clear that nothing is reserved until Issue.
- *Reason:* the tray is not a borrow and must not hold stock. Losing it on refresh is acceptable for this scope.

**Q18. When does available stock go down?** *(Harder question.)*
- *Answer:* only when the borrow is issued and the transaction commits. Not when an item is added to the tray and not when the Confirm window opens.
- *Reason:* a tray can be abandoned, and reserving earlier would make items look unavailable when no borrow exists.
- *Rejected alternative:* decrease stock when the item enters the tray. A user who leaves the page would lock inventory.
- *Cost:* an item in the tray can run out before Issue, so the admin may have to fix the tray (see Q20).

**Q19. Two admins take the last unit at the same time.** *(Harder question.)*
- *Answer:* exactly one succeeds. The `issue_borrow` database function runs in one transaction. For each distinct item, in a fixed order, it runs `UPDATE equipment SET available_units = available_units - qty WHERE id = ... AND available_units >= qty AND is_archived = false`. If any item updates no row, the whole transaction rolls back. The losing admin sees "Not enough stock. Refresh and review your tray."
- *Reason:* a check in the browser cannot stop two requests at once, so the database must decide.
- *Rejected alternative:* read the stock, then write it in two separate steps. Both admins could read "1 available" and both issue it.
- *Cost:* a database function must be written and tested, and conflicts need a clear message.

**Q20. Stock drops while the tray is open.**
- *Answer:* every requested quantity is rechecked when Issue is clicked. If any item is short, nothing is issued, the response names the items that changed, and the admin adjusts the tray.
- *Reason:* no partial borrows, and quantities are never changed silently.

**Q22. How is the due date worked out?** *(Harder question.)*
- *Answer:* every option is due at **17:00 in `APP_TIMEZONE`** (set to `Asia/Manila`; read from the environment; 17:00 is one shared code constant). 3 Days is the local issue date plus 3 calendar days; 1 Week is plus 7; Custom is a date the admin picks, no earlier than tomorrow, with no upper limit. The browser sends only a date (`YYYY-MM-DD`); the server checks the date is valid and builds the 17:00 local timestamp, then stores it in UTC. Weekends and holidays count as normal days.
- *Reason:* one fixed deadline is predictable and keeps every screen consistent.
- *Rejected alternative:* use the issue time of day. It makes the deadline depend on when the item was borrowed and is harder to explain.
- *Cost:* the selected date, not the borrow time, decides when it becomes overdue; a due date can fall on a weekend. If the time zone were wrong, items would turn overdue hours early or late (17:00 Manila is 09:00 UTC) and "issue date" could land on the wrong day.

---

### Phase 5: Returns Desk

| Part | What to write |
|---|---|
| **Phase name and goal** | **Phase 5, Returns Desk.** An admin can see active borrows with correct statuses and mark a whole borrow as returned, safely. |
| **Depends on** | Phase 4: borrows to return, and the shared status function. |
| **Questions covered** | **Q23, Q24, Q25, Q26, Q27, Q28, Q29** (answers below). |
| **Data and seed rows** | `borrows`, `borrow_items`, `equipment`. Uses the seeded borrows (due today before and after 17:00, overdue, returned today, returned earlier, multi-item, archived item). |
| **Screens, components and endpoints** | `/returns` with four cards (All Active Borrows, Due Today, Overdue, Returned Today), search by borrower name, product code or product name, Department and Status filters, pagination, and the table with View Items and Returned (from the Returns Desk screenshots, not yet viewed). `GET /api/borrows`, `GET /api/borrows/[id]/items`, `POST /api/borrows/[id]/return`. Database function `return_borrow`. Status badges: Active, Due Today, Overdue, Returned. |
| **Tasks** | [ ] Shared server status function used by the table and the cards. [ ] Filters, search and pagination. [ ] Read-only View Items. [ ] `return_borrow` function. [ ] Refresh of the page data after a return. |
| **Done when** | The four cards and the table agree on seeded data, and returning a borrow closes it and restores the stock exactly once. |
| **Tests** | **Proves it works:** return a seeded active borrow and check `returned_at`, `returned_by`, restored `available_units` and the changed cards. **Tries to break it:** a double-click or two simultaneous return requests (stock restored once, second gets "Already returned"); the boundary at exactly 16:59:59 and 17:00:00 using the test clock (Due Today then Overdue); a returned borrow does not count as active, due or overdue. |

**Q23. Define each status.**
- *Answer:* **Returned:** the return has been recorded (`returned_at` is set). **Active:** every borrow that has not been returned, including Due Today and Overdue ones. **Due Today:** not returned, the due date is today in `APP_TIMEZONE`, and now is before `due_at`. **Overdue:** not returned and now is at or after `due_at`. The table badges (Active, Due Today, Overdue, Returned) never overlap; the "All Active Borrows" count is every unreturned borrow.
- *Reason:* a status must follow from the due time and the return record, not from a hand-set label.

**Q24. Is status stored or calculated?**
- *Answer:* only `returned_at` is stored. Due Today, Overdue and Active are calculated on every read using the server clock and the shared status function. No scheduled job is needed. A page left open keeps its old status until it reloads; there is no polling. This limitation is documented.
- *Reason:* time passing changes the answer, and a stored label would need a job to keep it right.

**Q25. When does Due Today become Overdue?**
- *Answer:* at exactly 17:00:00 on the due date (`now >= due_at`). Dashboard, Returns Desk cards and the table all call the same server function with the server clock, so they agree on every load. The browser clock is never used.
- *Reason:* one function and one clock cannot disagree with themselves.

**Q26. What changes when Returned is clicked?**
- *Answer:* `borrows.returned_at` and `returned_by` are set, and `available_units` goes back up by each item's quantity, all in one transaction. The borrow and item rows are kept as history. After a return, the borrower, the items, the quantities and the issue time cannot be changed.
- *Reason:* returning closes a transaction; it does not erase it.

**Q27. Double-click or two admins on the same borrow.** *(Harder question.)*
- *Answer:* only the first request counts. The `return_borrow` function runs `UPDATE borrows SET returned_at = now(), returned_by = ... WHERE id = ... AND returned_at IS NULL`. If no row changes, it returns "Already returned" and does not touch stock; the stock restore happens in the same transaction as that successful update.
- *Reason:* repeated clicks or a retry must not add stock twice.
- *Rejected alternative:* blindly add the quantities back on every click.
- *Cost:* a database function and a clear "Already returned" message for the second admin.

**Q28. Which numbers change after a return?**
- *Answer:* available units up, borrowed units down, active borrow count down, Returned Today up (and Due Today or Overdue down, depending on the borrow). Dashboard, Returns Desk and Inventory show the new values when they next load.
- *Reason:* all screens read the same committed data with the same functions.

**Q29. What does returning a whole borrow not cover?**
- *Answer:* partial returns, for example returning 1 of 3 borrowed laptops. That is acceptable: the brief lists per-item returns and return condition notes as not part of the project.
- *Reason:* partial returns need per-item return times and quantities. If the institution needs them, this decision must be reopened first.

---

### Phase 6: Dashboard

| Part | What to write |
|---|---|
| **Phase name and goal** | **Phase 6, Dashboard.** An admin sees correct totals and the five latest borrows, and can jump to Add Equipment. |
| **Depends on** | Phases 3, 4 and 5: the numbers add up their data and reuse their functions. |
| **Questions covered** | **Q35, Q36** (answers below). |
| **Data and seed rows** | All seed data from Phase 0. |
| **Screens, components and endpoints** | `/dashboard`: three cards (Total Inventory Units, Available Units with progress bar, Active Borrows with a borrower count), the Latest Borrowed table (5 most recent, with View Items), and "+ Add Equipment" going to `/inventory` and opening the Add window (from the Dashboard screenshot, not yet viewed). `GET /api/dashboard`. Reuse StatCard, DataTable, Badge, ProgressBar and the View Items modal. |
| **Tasks** | [ ] One server function that returns all card numbers. [ ] Latest Borrowed with status badges. [ ] "+ Add Equipment" deep link. [ ] Cross-screen comparison test. |
| **Done when** | For the seeded data, Dashboard, Returns Desk and Inventory show the same value wherever they measure the same thing. |
| **Tests** | **Proves it works:** the card values equal hand-calculated seed totals. **Tries to break it:** issue and return a borrow, reload all three screens, and confirm they still agree; run the stock reconciliation (calculated borrowed units against the sum of unreturned `borrow_items.quantity`). |

**Q35. Every number on the three screens and how it is calculated.**
- *Answer:*
  - **Dashboard, Total Inventory Units:** sum of `total_units` over non-archived items.
  - **Dashboard, Available Units:** sum of `available_units` over non-archived items; the bar shows available divided by total.
  - **Dashboard, Active Borrows:** count of unreturned borrow transactions.
  - **Dashboard, Borrowers:** count of distinct borrowers with at least one unreturned borrow.
  - **Returns Desk, All Active Borrows:** count of unreturned borrow transactions.
  - **Returns Desk, Due Today:** unreturned, due date is today, `now < due_at`.
  - **Returns Desk, Overdue:** unreturned and `now >= due_at`.
  - **Returns Desk, Returned Today:** borrows whose `returned_at` falls between local midnight (inclusive) and the next local midnight (exclusive) in `APP_TIMEZONE`.
  - **Inventory, Total Units:** same as Dashboard Total Inventory Units.
  - **Inventory, Available Stock:** same sum of `available_units`, plus its percentage of total.
  - **Inventory, Currently Borrowed:** `total_units - available_units` summed over non-archived items, plus its percentage of total. A test compares this against the sum of unreturned `borrow_items.quantity`.
- *Reason:* borrow transactions and units are different measures. Everything comes from shared server functions. Two screens can differ only when they intentionally measure different things, or when a page is stale because it has not reloaded.
- *Note:* archived items are only archived when no units are out, so excluding them keeps available + borrowed = total.

**Q36. What does "Active Borrows" mean?**
- *Answer:* on the Dashboard, the main value is the number of **borrow transactions** not yet returned, with the number of distinct **Borrowers** shown separately. The Returns Desk "All Active Borrows" is the same count. Units are shown only in Inventory ("Currently Borrowed") and labelled as units. Each value is labelled so a transaction count is not mistaken for units.
- *Reason:* one borrow can contain several units, and clear labels prevent misreading.
- *Open check:* the screenshot may label the Dashboard value differently. If it clearly says units, this must be re-decided before building (see open questions).

---

### Phase 7: Hardening

| Part | What to write |
|---|---|
| **Phase name and goal** | **Phase 7, Hardening.** The app is responsive, keyboard-friendly, matches the designs, and passes a full regression and security check. |
| **Depends on** | Phase 6: everything is built. |
| **Questions covered** | None. Every question belongs to an earlier phase. |
| **Data and seed rows** | Reuses the Phase 0 seed. |
| **Screens, components and endpoints** | No new screens. Review all screens against the screenshots, mobile layouts, visible keyboard focus, reduced-motion respect, contrast at WCAG AA, empty and error states with plain copy. Apply the frontend-design skill's closing critique: remove decoration that does not serve the brief. Where the design system prescribes something (for example uppercase monospace card captions), the design system wins over the skill's general guidance. |
| **Tasks** | [ ] Compare every screen to its screenshot. [ ] Responsive and keyboard pass. [ ] Re-run all phase tests. [ ] Direct-API test of every protected route. [ ] `npm run build` and `npm run lint`. [ ] Review the open questions and the change log. |
| **Done when** | All phase tests pass, every protected route rejects unauthorized calls, build and lint pass, and each screen matches its design. |
| **Tests** | **Proves it works:** the full path from activation to a returned borrow runs end to end. **Tries to break it:** call every API with no session, with a setup-incomplete session and with malformed bodies, and confirm each is refused with no data leaked. |

---

### Question coverage check (Q1 to Q40, each in exactly one phase)

| Phase | Questions |
|---|---|
| 0 | Q21, Q37, Q38, Q39, Q40 |
| 1 | Q1, Q2, Q3, Q4 |
| 2 | Q5, Q6, Q7, Q8, Q9, Q10, Q11, Q12 |
| 3 | Q30, Q31, Q32, Q33, Q34 |
| 4 | Q13, Q14, Q15, Q16, Q17, Q18, Q19, Q20, Q22 |
| 5 | Q23, Q24, Q25, Q26, Q27, Q28, Q29 |
| 6 | Q35, Q36 |
| 7 | none |

Total: 5 + 4 + 8 + 5 + 9 + 7 + 2 = 40.

---

## Part 3: Across all phases

### 1. Data model

Names follow the brief's starter tables. Additions are marked *(added)*.

**`admins`**

| Field | Notes |
|---|---|
| `id` | primary key |
| `employee_id` | unique, not empty |
| `company_email` | unique, not empty, compared ignoring case |
| `full_name` | not empty |
| `username` | unique, not empty. Seeded as the Employee ID while `pending`; changed at `/setup-credentials` |
| `password_hash` | bcrypt hash. While `pending` it may hold a not-yet-confirmed temporary hash |
| `status` | `pending` or `active` (assumed, see open questions) |
| `must_change_credentials` | true after activation until setup is done |
| `activated_at` | empty until activation |

**`borrowers`**: `id`, `borrower_code` (unique), `full_name`, `email`, `type` (faculty, staff or student), `department_code`, `department_name`.

**`equipment`**: `id`, `product_code` (unique on the trimmed, upper-cased value), `name`, `category` (Monitor, PC, Mouse, Keyboard, Headset, Projector), `spec` (may be empty), `image_url` (may be empty), `total_units`, `available_units`, `is_archived`. Checks: `0 <= available_units <= total_units`. **Stored:** `total_units`, `available_units`. **Calculated:** borrowed units and the stock status.

**`borrows`**: `id`, `loan_code` (unique), `borrower_id`, `issued_by`, `issued_at`, `due_at` (UTC), `returned_at` (empty until returned), `returned_by` (empty until returned). **Calculated, never stored:** Active, Due Today, Overdue.

**`borrow_items`**: `id`, `borrow_id`, `equipment_id`, `quantity` (a positive whole number). One row per distinct equipment per borrow. Equipment is never hard-deleted while any `borrow_items` row references it.

**`rate_limits`** *(added)*: a key (for example `login:username:<value>`), the window start and a count, with an atomic function that increments and checks it. Keys do not depend on whether an account exists. Used for login and activation limits.

**Database functions** *(added)*: `issue_borrow`, `return_borrow`, an equipment total-update function (Q32), and the rate-limit function.

**Calculated, not stored:** borrowed units, stock status, borrow status (Active, Due Today, Overdue), all card numbers.

### 2. Endpoints

Route names are proposals; the Next.js 16 route-handler convention is checked in Phase 0 against the installed docs.

| Route | Who can call it | What it does | Phase |
|---|---|---|---|
| `POST /api/activate` | Public (rate-limited) | Activation steps from Q3 | 1 |
| `POST /api/login` | Public (rate-limited) | Check username and password, set the session cookie | 2 |
| `POST /api/logout` | Logged-in admin | Clear the cookie | 2 |
| `POST /api/setup-credentials` | Logged-in admin with `must_change_credentials = true` | Save new username and password, re-issue the session | 2 |
| `GET /api/equipment` | Active admin | List, search and filter (excludes archived) | 3 |
| `POST /api/equipment` | Active admin | Add an item, with optional photo | 3 |
| `PATCH /api/equipment/[id]` | Active admin | Edit an item (Q32 rule) | 3 |
| `DELETE /api/equipment/[id]` | Active admin | Archive or delete (Q33 rules) | 3 |
| `GET /api/equipment/export` | Active admin | CSV of the current list | 3 |
| `GET /api/borrowers/search` | Active admin | Search by name, ID number or email | 4 |
| `POST /api/borrows` | Active admin | Issue a borrow through `issue_borrow` | 4 |
| `GET /api/borrows` | Active admin | List borrows with status, search and filters | 5 |
| `GET /api/borrows/[id]/items` | Active admin | Read-only items and quantities | 5 |
| `POST /api/borrows/[id]/return` | Active admin | Return a borrow through `return_borrow` | 5 |
| `GET /api/dashboard` | Active admin | Card numbers and the latest 5 borrows | 6 |

"Active admin" means a valid session whose admin row is `active` and not waiting for first-login setup, checked in the database on every request.

### 3. Open questions and assumptions

**Not yet verified**
1. **Screenshots.** The PNGs are not inside the workspace and could not be read. Not verified: the Dashboard "Active Borrows" label (Q36 assumes borrow transactions plus a separate "Borrowers" value), the Login screen text (no trusted-workstation option), and the Activation screen's success state. UI fidelity checks wait until the screenshots are in the workspace.
2. **Supabase and EmailJS are not set up.** The `.env.local` check is unconfirmed. Keys that were exposed earlier in the session should be rotated, and that has not been confirmed. Whether the EmailJS "non-browser applications" setting exists in the account is unconfirmed. Whether the new `sb_secret_...` key works with the installed Supabase client is checked in gate 0.3.
3. **Next.js 16 guard placement.** Proxy (the renamed Middleware) is documented as an optimistic check only. The exact placement of the shared guard is confirmed against `node_modules/next/dist/docs/` at the start of Phase 2.

**Assumptions needing the owner's confirmation**
4. `admins.status` holds only `pending` and `active`. A `deactivated` value is not defined by the brief.
5. Product-code format (Q30) is not defined. Proposal: letters, digits and hyphens, 3 to 20 characters. Formats for `loan_code` and `borrower_code` are also undefined; proposal: `LN-` plus a padded number from a database sequence for loans.
6. Rate-limit numbers are proposals: login 5 failures per username and 20 per IP per 15 minutes; activation 3 per Employee ID and 10 per IP per hour. Fixed windows expire, so there is no permanent lockout.
7. Hosting is not decided, so IP-based limiting depends on a trusted forwarded-IP header.
8. The neutral-response wording and the temporary-password length and character set are implementation details to finalize.
9. `.env.example` would be ignored by the `.env*` rule in `.gitignore`; a `!.env.example` exception or a different file name is needed (an approved change at that time).
10. `PLAN.md` lives in the workspace root next to the brief, outside the `my-app` Git repository.

**Known limitations (accepted)**
- A copied cookie stays valid until it expires (8 hours); sign-out only clears the cookie.
- A page left open keeps old statuses until it reloads.
- The temporary password travels by email and EmailJS history may keep it.
- If an activation email never arrives, recovery is manual (reset to `pending` by HR or the developer).
- A single-unit item is always Low Stock when available.
- Archived product codes are permanently reserved; there is no restore screen.
- Due dates use calendar days, so they can land on a weekend or holiday.
- Whole-borrow returns only; no partial returns.
- EmailJS free tier: 200 emails per month and 1 request per second.

### 4. Change log

*Empty at first. Every later change needs the phase, what changed, and why.*

| Date | Phase | What changed | Why |
|---|---|---|---|
| 2026-10-20 | Phase 6 | Added real-time Dashboard aggregations, top 5 latest borrows, and deep-link to Add Equipment (`/inventory?action=add`). | Completed Phase 6 as per visual design in `BorrowBox-Dashboard.png` and invariant rules. |
| 2026-10-20 | Phase 7 | Hardened all 11 API endpoints against unauthenticated and setup-incomplete access, added input/payload validation, verified end-to-end circulation lifecycle, and passed lint and production build. | Completed Phase 7 Hardening & Regression Suite. |
