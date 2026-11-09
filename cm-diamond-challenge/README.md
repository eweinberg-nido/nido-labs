# 💎 Nido Diamond Challenge | Mentor Scheduler

A serverless, real-time scheduling web application built for the **International School Nido de Aguilas** *Changemakers* and *Intro to Entrepreneurship* programs. 

This platform enables community entrepreneurs, alumni, and industry leaders to browse high school startup class blocks, volunteer for coaching sessions, and register as judges for the culminating **Diamond Challenge Demo Day**.

---

## 📁 Repository Structure

```text
├── index.html       # Public-facing mentor sign-up interface
├── roster.html      # Teacher & Coordinator management dashboard
├── README.md        # Documentation and deployment guide
└── Code.gs          # Google Apps Script (hosted in Google Sheets)
```

---

## 🌟 Key Features

### 1. Public Mentor Portal (`index.html`)
* **Live Availability Scanner:** Slots synchronize with Google Sheets in real time.
* **Automatic Past-Block Hiding:** Whether a block has already happened is computed from the current date and time in `America/Santiago` — a block disappears from the default view once its end time passes. No date flags to maintain by hand.
* **Capacity-Aware Classroom Blocks:** Most class periods take a single mentor and lock once claimed. Two cases differ:
  * **Blocks C and H** each run two concurrent sections of Changemakers, so a single listing **seats two mentors** and shows a `1 of 2 spots filled` badge until both are taken.
  * **Block F** runs a Changemakers class *and* an Intro to Entrepreneurship class at the same time. These are different courses with different teachers, so they appear as **two separate listings** on the same date and time — each taking one mentor — rather than one listing with two seats.
* **Multi-Judge Demo Day (Dec 14):** Official pitch evaluation panels support unlimited mentor registrations with live counter badges (e.g., `👥 3 Signed Up`).
* **Attendance Preference:** Mentors choose between **🏫 In Person (Campus Innovation Lab)** and **💻 Virtual (Zoom / Google Meet)**.
* **Timezone-Aware Calendar Sync:** One-click links pre-populate event times, course details, topics, and virtual/physical locations. Times are stamped with `ctz=America/Santiago`, so Google converts each block into the mentor's own calendar timezone automatically — an overseas mentor sees their local hour, not Santiago's.
* **Draft Email Confirmation:** Generates a pre-formatted email draft addressed to the coordinator (`jcancella@nido.cl`, set via `ORGANIZER_EMAIL` in `index.html`).

### 2. Coordinator Dashboard (`roster.html`)
* **Token-Gated Roster View:** Mentor emails, notes, organizations and full names are withheld by the Apps Script unless a valid access token is supplied. The dashboard page itself is served publicly like any GitHub Pages file — the data behind it is what is protected, not the URL.
* **Live Google Sheet Sync:** Fetches registrations directly from your connected spreadsheet via standard Fetch with automatic **JSONP fallback** to bypass browser CORS restrictions. Requests carry the access token stored in this browser.
* **Real-Time KPI Cards:** Displays total sign-ups, unique mentors, claimed class blocks, and In-Person vs. Virtual attendance counts. Rows with no attendance mode recorded are counted separately rather than silently folded into In-Person.
* **Header Drift Warning:** If the Sheet's header row stops matching the columns the script writes, the dashboard shows a banner naming the missing heading and the exact row to paste back.
* **Search & Filter:** Instant keyword search across mentor names, emails, courses, schedule blocks, and attendance modes.
* **Export CSV:** One-click spreadsheet export containing all 15 registration columns.
* **Copy All Emails:** Deduplicates all mentor email addresses into a comma-separated list ready to paste into Outlook or Gmail.

---

## 🗓️ Schedule & Phases

| Phase | Color Badge | Focus Area | Dates |
|---|---|---|---|
| **Phase 1** | 🔵 Blue | **Problem Research:** Empathy interviews, user problem definition, assumption challenging. | Nov 2 – Nov 6 |
| **Phase 2** | 🟢 Green | **Solution Design & Testing:** Reviewing prototypes, testing viability, analyzing customer data. | Nov 9 – Nov 20 |
| **Phase 3** | 🔴 Red | **Pitch Rehearsals:** 10–15 slide pitch decks, storytelling, timing, and Q&A practice. | Nov 23 – Dec 10 |
| **Phase 4** | 🟣 Purple | **Demo Day (Official Pitch Judging):** Live panels with 5-minute team pitches and 3-minute Q&A. | **Mon, Dec 14** |

### Demo Day Time Slots (Monday, Dec 14)
* **Morning Mentoring:** `8:00 - 11:00` (Deck polish, pitch warm-ups, feedback)
* **Midday Networking:** `11:00 - 12:00` (Student venture showcase & mentor mixer)
* **Afternoon Judges:** `12:00 - 3:00` (Official pitch evaluations & scoring panels)
* **All Day Participation:** `8:00 - 3:00` (Mentoring, networking, and judging)

---

## 📊 Google Sheets Setup (Backend)

The scheduler uses a Google Sheet backed by a Google Apps Script Web App as its serverless database.

### Step 1: Set Up Sheet Column Headers
1. Create a new Google Sheet (or open your existing one).
2. Copy the line below and paste it directly into cell **A1** (it will split automatically into 15 columns):

```tsv
Booking ID	Block ID	Date	Time	Block	Teacher	Course	Phase	Topic	Attendance	Mentor Name	Mentor Email	Organization	Notes	Submitted At
```

### Step 2: Add Google Apps Script (`Code.gs`)
1. In your Google Sheet, open **Extensions > Apps Script**.
2. Replace all code in the script editor with the contents of [`Code.gs`](Code.gs) from this repository.
3. Save.

> **Why the script writes by header name:** `doPost` looks up each value's column by its heading rather than by a fixed position, and appends any heading the sheet is missing. An earlier version wrote 15 values into a 14-column header row, which pushed every value after *Topic* one column left — attendance modes ended up filed under **Mentor Name**. Writing by name makes that failure impossible to repeat.

### Step 3: Deploy as a Web App (Critical Settings)
To prevent browser CORS errors when mentors submit from GitHub Pages:
1. Click **Deploy > New deployment** (or *Manage deployments* if updating).
2. Choose **Web app** as the deployment type.
3. Configure the permissions:
   * **Execute as:** `Me (your email)`
   * **Who has access:** `Anyone` *(Do NOT select "Only myself" or your Google Workspace domain; restricted permissions redirect to a login prompt without CORS headers).*
4. Click **Deploy**, authorize permissions, and copy the Web App URL (ending in `/exec`).

> **⚠️ Keep the same URL when redeploying.** Use **Deploy > Manage deployments > Edit (pencil icon) > Version: New version > Deploy**. Choosing *New deployment* instead mints a brand-new `/exec` URL, which silently breaks both HTML files until you update `DEFAULT_GAS_URL` in each.

### Do I need to redeploy after updating `Code.gs`?

**No — not to fix a mislabeled header row.** Paste the correct header into **A1** and both pages work immediately, because the previously deployed script already wrote all 15 values in the right order.

Redeploy when you want the protections the current `Code.gs` adds:

| Change | Why it matters |
|---|---|
| Writes by header name | Reordering or renaming a column can no longer shift every later value. |
| `ensureHeaders()` self-repair | A missing heading is relabeled in place on the next sign-up, so the bug cannot silently return. |
| `doGet` skips unlabeled columns | Stray columns no longer surface as a `""` field in the roster. |
| Dates returned as ISO strings | The roster renders real dates instead of raw cell values. |
| Blank rows skipped | Deleted-but-not-removed rows stop inflating the sign-up count. |
| `repairHeaders()` helper | Run once from the editor to fix the header row without opening the Sheet. |

Either order is safe: `ensureHeaders()` detects a canonical-but-mislabeled header row and **relabels row 1 in place** rather than appending the heading at the far right, so already-recorded rows stay aligned.

---

## 🚀 Hosting on GitHub Pages

1. Commit `index.html`, `roster.html`, and `README.md` to your GitHub repository:
   ```bash
   git add .
   git commit -m "Update mentor scheduler and coordinator roster"
   git push origin main
   ```
2. In your GitHub repository, open **Settings > Pages**.
3. Under **Build and deployment > Branch**, select `main` and `/ (root)`.
4. Click **Save**. Your site will be live at:
   * **Public Sign-Up:** `https://<username>.github.io/<repo>/index.html`
   * **Teacher Roster:** `https://<username>.github.io/<repo>/roster.html`

---

## 🛠️ Configuration & Webhook Override

Both HTML files include your deployed Web App URL as `DEFAULT_GAS_URL`:
```javascript
const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbxUR_f0p_U2xlVO1a3dMp2SgogK9o_ElLRGHulimn3Brv7v0e8wMDEckO1AVaWhax7h/exec";
```

If you ever deploy a new Google Sheet or need to switch to a testing sheet:
1. Open `roster.html`.
2. Click **Webhook Settings** in the top navigation.
3. Paste the new `/exec` URL and click **Test URL** to verify the connection.
4. Click **Save Connection** (saved to `localStorage` under `nido_gas_webhook_url`).

---

## 🔒 Security Model

This is a static site with a public Apps Script endpoint, so **the `/exec` URL cannot be kept secret** — it is visible in the page source of the public sign-up page, and a new deployment URL would be equally visible. Access is therefore controlled at the endpoint, not by hiding it.

### What an anonymous request can see

`doGet` returns only the fields the public sign-up page needs to grey out claimed blocks:

| Returned anonymously | Withheld without a token |
|---|---|
| Block ID, Date, Time | Mentor full name |
| Mentor **first name** only | Mentor email |
| | Organization |
| | Notes |

### Setting the access token

1. In Apps Script, run **`generateRosterToken()`** once. It writes a random token to Script Properties and logs it.
2. Copy the logged value into `roster.html` → **Webhook Settings** → **Roster Access Token**.
3. Click **Test URL** — it reports whether the token was accepted.

The token is stored in Script Properties and in the coordinator's browser `localStorage`. **It is never written to `Code.gs`, the HTML files, or this repository.** To revoke it, run `generateRosterToken()` again and redistribute.

> Until a token is set, the Apps Script **fails closed**: every request receives the restricted view, including the roster's.

### Writes

`doPost` stays open, since mentors sign up without credentials. It is validated rather than authenticated:

* Rejects entries with no mentor name, no block, or a malformed email.
* Caps requests at 25 entries and each field at 500 characters.
* Prefixes values starting with `=`, `+`, `-` or `@` with an apostrophe, so a submitted `=IMPORTRANGE(...)` is stored as text instead of executing when the Sheet or the exported CSV is opened.

Someone reading the public page source can still post a plausible-looking fake sign-up. Treat the roster as volunteer-supplied data, not verified identity.

### If mentor data may already have been exposed

The `/exec` URL has been public since the repo's first commit. Anyone who viewed source on the sign-up page could have read the full roster before token gating was added. Rotating the URL does not undo that; deploying the current `Code.gs` and setting a token stops it continuing.

---

## 🧩 Troubleshooting

### Attendance shows blank, or a mentor's name reads "Virtual"
The Sheet's header row is short a heading, so it no longer matches the 15 values each row holds. The **data is intact and in the right order** — only the labels are wrong, which shifts everything after the gap one column to the left. The public sign-up page is affected too: it reads mentor names from that same column, so claimed blocks display `Claimed by Virtual`.

**Fix (takes one paste):** copy the header line from [Step 1](#step-1-set-up-sheet-column-headers) into cell **A1** of the Sheet, then reload `roster.html`. Existing rows line up again immediately — nothing needs re-entering.

The roster shows a yellow banner naming the missing heading whenever it detects this, so you do not have to diagnose it by eye.

### A block that already happened is still listed
Make sure **Hide past blocks** is checked. Past-ness is derived from the current time in `America/Santiago`, so a block vanishes on its own once its end time passes.

### Calendar invite shows the wrong hour
The links set `ctz=America/Santiago`, so Google renders each event in the viewer's own calendar timezone. If an hour looks wrong, check the timezone configured in that Google Calendar account rather than the link.

---

## 📧 Support & Contact

* **Program:** Diamond Challenge / Changemakers Program
* **Institution:** International School Nido de Aguilas, Santiago, Chile
* **Coordinator Contact:** `jcancella@nido.cl`