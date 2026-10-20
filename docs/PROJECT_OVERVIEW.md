# BorrowBox: Campus IT Equipment Dispatch & Logistics

*Project overview and planning challenge. Time limit: 3 hours. Stack: Next.js, Supabase, EmailJS. Built in Antigravity.*

## 1. What you are building

BorrowBox is an admin-only web app that IT officers use to lend university hardware (laptops, monitors, projectors and more) to faculty, staff and students, and to record when it comes back. Admins are pre-registered by HR, activate their own account by email, and then use four modules: **Dashboard**, **New Borrow**, **Returns Desk** and **Equipment Inventory**.

Borrowers do not log in. They are records that admins search for. The system does not record where equipment is stored.

## 2. The challenge

This overview tells you **what** the app has: its screens, features and tables. It does **not** tell you **how the system should work**. That is your job.

Before you build, you will write a **final plan** (`PLAN.md`) that explains the full workflow of the system. You will make it by running the **grill-me skill**, which interviews you with the questions in Section 8. Your instructor will discuss the full workflow in class first, so listen closely and take notes.

**Rules of the challenge**

1. You answer every question yourself. The agent must not answer for you.
2. Every answer needs a **reason**. "The agent said so" is not a reason.
3. For the harder questions, write one **alternative you rejected** and why.
4. When you submit the plan, your workflow is **locked**. Your app must behave the way your plan says. If you change something while building, record it in the plan's change log with a reason.
5. Your plan will be checked against the workflow taught in class, and your app will be checked against your plan.
6. Your plan is divided into **phases**. Each phase is a slice of the app you can build, test and tick off before starting the next one (see Section 10).

## 3. Learning goals

- Analyze a system's workflow before writing code.
- Turn requirements into decisions, and defend them.
- Build a full-stack app with the Next.js App Router, Supabase and EmailJS.
- Plan for things that go wrong: failed emails, double clicks, two admins at once.
- Use agent skills (grill me, frontend design) in the right order.

## 4. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | Route handlers act as the backend |
| Database | Supabase (Postgres only) | Do not use Supabase Auth. Use the service-role key on the server only |
| Password hashing | bcryptjs | Never store plain passwords |
| Session | jose (signed JWT) | httpOnly cookie |
| Email | EmailJS | Called from the server with the private key |
| Image storage | Supabase Storage | Public bucket `equipment-images` |

**Environment variables:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`, `APP_TIMEZONE`.

**EmailJS setup:** create your own free account before class, and enable "Allow EmailJS API for non-browser applications" in Account settings. The free tier allows 200 emails per month. Never put the service-role key or the EmailJS private key in a `NEXT_PUBLIC_` variable.

## 5. Screens

| # | Screen | Route |
|---|---|---|
| 1 | Login | `/login` |
| 2 | Activate Admin Account | `/activate` |
| 3 | Update Admin Credentials (first login) | `/setup-credentials` |
| 4 | Dashboard | `/dashboard` |
| 5 | New Borrow, with Confirm and Success modals | `/new-borrow` |
| 6 | Returns Desk, with View Items modal | `/returns` |
| 7 | Equipment Inventory, with Add/Edit modal | `/inventory` |

All values shown in the mockups (names, counts, product codes) are sample data. Do not copy numbers from the pictures. Your plan decides how every number is calculated.

## 6. Features by module

This is the list of things each screen has. How each one behaves is a question for Section 8.

### Login, Activate and Update Credentials

- Login with username and password. "Forgot password?" is shown but does nothing. There is no trusted-workstation option.
- Activate with Employee ID and company email.
- Update Credentials with a new username, new password and confirm password. The form shows a live checklist.
- Username rule: at least 4 characters, lowercase letters, numbers and periods only, and unique.
- Password rule: at least 8 characters, with uppercase and lowercase letters, a number and a special character.

### Dashboard

- Three cards: Total Inventory Units, Available Units (with progress bar) and Active Borrows (with a borrower count).
- "Latest Borrowed" table of the 5 most recent borrows, with a View Items button.
- "+ Add Equipment" goes to Inventory and opens the Add Equipment window.

### New Borrow (Equipment Dispatch)

- Borrower search by name, ID number or email.
- Equipment catalog: 6 cards per page, search, and a category filter (All Equipment, Monitor, PC, Mouse, Keyboard, Headset, Projector). Cards show Ready, Low Stock or Depleted, and Staged when in the tray.
- Checkout tray with quantity steppers, a delete icon and Clear Tray.
- Expected return duration: 3 Days (Standard), 1 Week, or Custom (date picker).
- Issue Borrow, then a Confirm window, then a Success window with "Done & New Borrow".

### Returns Desk (Active Borrows & Returns)

- Four cards: All Active Borrows, Due Today, Overdue and Returned Today.
- Search by borrower name, product code or product name, plus Department and Status filters, with pagination.
- Each row has View Items (read-only list of items and quantities) and a **Returned** button.

### Equipment Inventory

- Three cards: Total Units, Available Stock and Currently Borrowed.
- Search, category filter, status filter and a refresh button.
- Table with photo, name, product code, total quantity, borrowed progress bar, stock status and a row menu (Edit, Delete).
- Add/Edit window: optional photo (PNG, JPG or WEBP, up to 4 MB), product name, product code, category (dropdown) and quantity. A category icon shows when there is no photo.
- Export CSV of the current list.

The notification bell is static and has no behavior.

## 7. Data and seed data

### Tables

| Table | Main fields |
|---|---|
| `admins` | id, employee_id, company_email, full_name, username, password_hash, status, must_change_credentials, activated_at |
| `borrowers` | id, borrower_code, full_name, email, type (faculty, staff or student), department_code, department_name |
| `equipment` | id, product_code, name, category, spec, image_url, total_units, available_units, is_archived |
| `borrows` | id, loan_code, borrower_id, issued_by, issued_at, due_at, returned_at, returned_by |
| `borrow_items` | id, borrow_id, equipment_id, quantity |

These are a starting point. Your plan may change them, and must say why. Which fields are unique, which can be empty, and which are calculated instead of stored are questions in Section 8.

### Seed data is required

The app cannot be used or tested without seed data, so seed the database before you start building. At minimum:

- **Admins:** pending admins, each with an Employee ID and company email. Activation only works for a seeded admin, so use emails you can open to receive the credentials email.
- **Borrowers:** faculty, staff and students across the departments (CECT, CAS, CON, CBA).
- **Equipment:** items across the six categories, with product codes and matching total and available units.
- **Borrows:** some unreturned and a few returned.

Your plan must say exactly which seed rows you need to prove that every status and flow works (see Q33).

## 8. Workflow questions

Answer every question in your plan. Each question has a number so your instructor can find your answer. Think about the person using the system **and** about what can go wrong.

### A. Account activation

- **Q1.** Who is allowed to activate an account, and what does the system ask for as proof? Why that proof?
- **Q2.** What should the system do when the Employee ID is wrong, the email is wrong, the account does not exist, or the account is already active? What should the person on screen be told in each case, and why?
- **Q3.** Write the exact steps that happen when activation succeeds, in order. What if one step fails, for example the email service is down? What state must the account be left in, and can the admin try again?
- **Q4.** What does the admin receive, and how is it created? What must be true about it, given that it travels by email?

### B. First login and credential setup

- **Q5.** What must happen the first time an admin logs in? What can they open before that is finished, and what can they not open?
- **Q6.** Where does the system enforce this rule: only on the page, only on the server, or both? Describe how someone could get around it if you chose only one place.
- **Q7.** After the admin saves new credentials, where do they go? What must change about their session? What happens if they open the setup page again later?
- **Q8.** Who checks the username and password rules: the browser, the server, or both? Why? What does the admin see when a rule fails?
- **Q9.** Is this setup something an admin does once, or can they repeat it? How does your system know it was already done?

### C. Sessions and access

- **Q10.** How does the system know who is logged in on every later request? How long does that last? What happens at sign out?
- **Q11.** Which pages need a logged-in admin? Which API requests need one? How and where will you check each?
- **Q12.** What should login say when the username or password is wrong? Should it say which one is wrong? Why?

### D. Borrowing equipment

- **Q13.** List every step an admin follows to lend equipment, in order. For each step, what must be true before the admin can move on?
- **Q14.** When should the Issue Borrow button be usable, and when must it be disabled?
- **Q15.** When a borrow is issued, what records are created or changed in the database? List each table.
- **Q16.** After the Success window, what is reset and what stays? What does "Done & New Borrow" start?
- **Q17.** The tray holds items while the admin moves between catalog pages. Where does the tray live, and what happens to it if the page is refreshed? Is that acceptable?

### E. Stock

- **Q18.** At what exact moment does available stock go down: when an item is added to the tray, when the confirm window opens, or when the borrow is issued? Defend your choice.
- **Q19.** Scenario: only 1 unit is left. Two admins both have it in their tray and click Issue within the same second. What should happen? How will you make sure it does?
- **Q20.** Scenario: an admin builds a tray, goes to lunch, and comes back. In the meantime stock for one item dropped. What should happen when they click Issue?
- **Q21.** Which stock numbers are stored in the database and which are calculated when needed? Why?

### F. Due dates and statuses

- **Q22.** How is the due date worked out for 3 Days, 1 Week and Custom? What is the earliest date Custom can be? What time of day is a borrow due, and in which time zone? Write down the problem that happens if the time zone is wrong.
- **Q23.** Define each status precisely: Active, Due Today, Overdue and Returned. What facts about a borrow decide each one?
- **Q24.** Is a borrow's status stored, or worked out each time? What happens at the moment a due time passes? Does anything need to run to make that happen?
- **Q25.** A borrow is due today. At what exact time does it change from Due Today to Overdue? Will the Dashboard, the Returns Desk cards and the table all agree at that moment?

### G. Returning equipment

- **Q26.** What exactly changes in the database when an admin clicks Returned? What should be impossible to change afterward?
- **Q27.** What if an admin double-clicks Returned, or two admins click it on the same borrow? What should happen?
- **Q28.** After a return, which numbers change and on which screens?
- **Q29.** The designs return a whole borrow at once. What real situation does that not cover? Is that acceptable for this project?

### H. Equipment inventory

- **Q30.** What makes a product code valid? What happens when it is a duplicate? Is "ab-1" the same as "AB-1"?
- **Q31.** What are the rules for Available, Low Stock and Out of Stock? Who decides the numbers, and where are they defined so they are not repeated in many places?
- **Q32.** An item has 10 total and 4 are borrowed. An admin edits the total. Which values are allowed and which are rejected? Why?
- **Q33.** What should Delete do when units are borrowed? When none are borrowed? What about the borrow history that points to that item?
- **Q34.** For the photo: what checks happen on the file, where is it stored, what is saved in the database, and what happens if the upload fails halfway through adding the item?

### I. Numbers that must agree

- **Q35.** List every number shown on the Dashboard, Returns Desk and Inventory cards, and write how each one is calculated. Then test your list: can two screens ever show different answers for the same thing?
- **Q36.** "Active Borrows" could mean number of borrows, number of units, or number of people. Which does each screen show, and how do you label it so no one is confused?

### J. Testing and process

- **Q37.** Which seed rows do you need to prove that every status, filter and flow works? List them.
- **Q38.** For each phase, write one test you will run to prove it works, and one test that tries to break it.
- **Q39.** Divide the build into phases. What is in each phase, what does each one depend on, and why that order? What must be working at the end of each phase?
- **Q40.** Which decisions will you make yourself, and which will you let the agent make? Where will you check the agent's work?

## 9. How to run your planning session

Open this folder in Antigravity, make sure the grill-me skill is available, and give the agent a prompt like this:

> Read `BorrowBox-Project-Overview-Challenge.md`. Use the grill-me skill to interview me on every question in Section 8, one question at a time. Do not answer for me. If my answer is vague, ask a follow-up. Use scenarios to test my answers. When all questions are settled, help me divide the build into phases, then write `PLAN.md` using the phase structure in Section 10.

What a good session looks like:

- You answer in your own words, and the agent pushes back when an answer is thin.
- You change your mind when a scenario shows a problem, and the plan records the new answer.
- The agent challenges your phase order, for example by asking what breaks if a phase is moved earlier or later.
- The agent does not write the plan until every question has an answer you can defend.
- Save the session transcript. You will hand it in.

## 10. What your `PLAN.md` must contain

Your plan is divided into **phases**. A phase is a slice of the app that you can build, test and tick off before you start the next one. Do not write one long list of tasks.

### Part 1: Summary

3 to 5 sentences about what BorrowBox does, in your own words, and the order of your phases in one line.

### Part 2: Phases

Write **Phase 0 (Setup)** first, then your own phases. Use at least 5 phases in total. Every phase must leave the app in a state that runs.

Use this format for every phase:

| Part | What to write |
|---|---|
| Phase name and goal | One sentence: what can a user do when this phase is done? |
| Depends on | Which earlier phases must be finished first, and why |
| Questions covered | The Q numbers from Section 8 that this phase settles. For each: your answer, your reason, and for harder questions one alternative you rejected |
| Data and seed rows | Tables or fields this phase needs, and the seed rows needed to test it |
| Screens, components and endpoints | What you build, which parts are shared and reused (buttons, cards, tables, windows), and how you apply the frontend design skill and the design system |
| Tasks | A checklist of small steps, each one testable |
| Done when | A clear statement you can check, for example "an admin can activate and log in with the emailed password" |
| Tests | One test that proves it works and one test that tries to break it (Q38) |

Rules for the phases:

1. **Every question from Q1 to Q40 appears in exactly one phase**, in the phase where it is first needed. None can be left out.
2. **Phase 0 (Setup)** covers the project, environment variables, tables, seed data and design tokens. Seed data must be done before any phase that needs it.
3. You choose the order of the other phases. Defend it in Q39.
4. A phase may not be started until the one it depends on passes its "Done when".

### Part 3: Across all phases

1. **Data model:** your final tables and fields, with what is unique, what can be empty, and what is calculated.
2. **Endpoints:** a table of every API route, who can call it, what it does, and the phase that builds it.
3. **Open questions and assumptions.**
4. **Change log:** empty at first. Every later change needs the phase, what changed, and why.

## 11. Not part of this project

Forgot-password logic, trusted workstation, 90-day password expiry, saving drafts, printing hold slips, barcode or QR scanning, reminder emails, notification behavior, per-item returns, return condition notes, and any record of where equipment is stored.
