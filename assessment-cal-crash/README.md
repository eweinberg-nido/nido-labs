# Assessment Calendar — Crash Incident Obviator

A zero-backend single-page app that answers the question the spec sets out:

> *If I put my assessment on Wednesday, **which of my students** would end up with more than two that day?*

It reads the four grade-level assessment calendars, aggregates every assessment
**by student email rather than by grade**, and flags the individuals who are at or over
the limit. Everything is in [index.html](index.html) — no build step, no server.

## The three views

| View | What it answers |
|---|---|
| **Week view** | Mon–Fri grid of all four calendars, with a per-day count of students at / over the limit, and a conflict list naming them. Click any assessment to see its roster and each student's load that day. |
| **Check a class** | Paste or upload a class list, pick a proposed date, get the affected students named — split into *would exceed the limit*, *would reach the limit*, and *clear*. |
| **Student load** | Every student's per-day and whole-week totals, sortable and exportable to CSV. Surfaces the "assessment in every class this week" case even when no daily limit is broken. |

## How it handles the messy realities in the spec

- **Mixed-grade classes.** Students are keyed on email and aggregated across all four
  calendars, so a name appearing on the grade 9 calendar is never *assumed* to be a
  grade 9 student. The elective teacher no longer has to cross-read three calendars.
- **"Just paste everyone into the invite."** Attendees are read straight off the event,
  whichever calendar it landed on.
- **Roster in the description instead of the invite.** Any email addresses found in an
  event description are picked up as a secondary source and labelled *from description*
  in the event detail panel.
- **Teachers are not students.** The event organiser is excluded automatically, as are
  room resources and group-calendar addresses. If staff still leak into the counts, the
  editable exclusion list at the bottom of **Student load** takes emails or patterns
  (`*@example.com`), saved to `localStorage`.
- **Names instead of emails.** Class lists match on email first, then on name —
  accent-insensitive, word-order-insensitive, and tolerant of `Last, First` and of CSV
  rows with extra columns. A name matching two different students is reported as
  ambiguous rather than silently guessed.
- **The same assessment on two calendars.** Copies sharing an `iCalUID` are merged into
  one event, so a mixed-grade assessment posted to both the G10 and G11 calendars is
  counted once per student, not twice.

## Data source — important

The primary source is the **Google Calendar API v3**, called with the OAuth token from
Google sign-in (`calendar.readonly`). This is a deliberate departure from the spec's
`.ics`-over-CORS-proxy approach, for one reason:

> Google's public `basic.ics` export **strips the attendee list**. Attendee emails are
> the entire basis of per-student crash detection, so an `.ics`-only app could show
> *that* Wednesday is busy but never *who* is affected.

The `.ics` path via `api.allorigins.win` is retained as a **fallback**: if the API call
fails for a calendar, the app falls back to the public feed, still shows the events, and
displays a banner saying student-level detection is unavailable for those. The header
badge shows which mode is live (`calendar API` / `public feed (limited)` / `cached`).

## Setup

### 1. Google Cloud / Firebase console

The project is `nido-teaching-learning` (config is already in `index.html`).

- **Firebase → Authentication → Sign-in method**: enable **Google**.
- **Firebase → Authentication → Settings → Authorized domains**: add the hosting
  domain — `localhost` for local use, plus your GitHub Pages / hosting domain.
- **Google Cloud console → APIs & Services → Library**: enable the **Google Calendar API**
  for the same project. (Sign-in works without this; reading calendars does not.)
- **OAuth consent screen → Scopes**: add
  `https://www.googleapis.com/auth/calendar.readonly`. Publish the app internally for
  the `nido.cl` workspace so teachers do not see an unverified-app warning.

### 2. Calendar access

Each signed-in teacher needs at least **"See all event details"** on the four grade
calendars — the app reads them as that user, not through a service account. Teachers who
already use the calendars normally have this.

### 3. Run it

Firebase's sign-in popup requires an `http(s)` origin, so `file://` will not work:

```sh
cd AssessmentCalendar
python3 -m http.server 8000
# open http://localhost:8000
```

To deploy, serve `index.html` as a static file (GitHub Pages, Firebase Hosting, any web
server) and add that domain to the authorized-domains list.

## Notes and limitations

- **Access is restricted to `@nido.cl`.** The sign-in request sets `hd=nido.cl`, and the
  callback re-checks the email suffix and signs out non-matching accounts — the client
  check is a usability guard, and the real boundary is calendar permissions.
- **The Google access token lasts about an hour** and Firebase does not refresh it. When
  it expires a **Reconnect calendars** button appears in the header; one click restores
  full detection.
- **The daily limit is 2**, set by `DAILY_LIMIT` in `index.html`. Amber means a student
  is *at* 2 (the day is closed for them), red means *over* 2.
- **Only the loaded Mon–Fri week is analysed.** Checking a date outside the visible week
  is flagged rather than answered from empty data.
- **Recurrence in fallback mode** is expanded only for simple `DAILY`/`WEEKLY`/`MONTHLY`
  rules. The API path handles recurrence properly via `singleEvents=true`.
- **Stored locally** in `localStorage`: saved class lists, the exclusion list, the last
  viewed week, and a per-week event cache used only when every calendar fetch fails.
  Nothing is sent anywhere except to Google's own APIs — and, in fallback mode only, the
  public `.ics` URL passes through the `allorigins` proxy.

### Possible v2

Fuzzy name matching for description rosters that list names without emails; a persisted
"provisional booking" so a teacher can pencil in a date and have colleagues see it;
Firestore-backed shared exclusion/staff list instead of per-browser `localStorage`.
