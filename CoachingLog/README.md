# Nido Coaching Log

A single-page app for the coaching office: log an interaction in a few seconds, and
see the arc of each coaching relationship over the year.

Everything is in `index.html` — markup, styles, and logic. Open it from a web server
(or GitHub Pages); Firebase auth needs an `http(s)` origin, so a `file://` open will
not sign in.

## Before first use

1. Publish the rules in `firebase_rules` to the `nido-teaching-learning` Firestore
   project. Until they are live, every read and write is rejected and the app says so.
   The same block is on the app's **Settings** tab.
2. Sign in with Google. Only `@nido.cl` accounts are accepted.

## What it does

- **Log** — one button, then an autocomplete over everyone already known, a type
  dropdown, *what happened* tags, a date already set to today, and notes. Picking from
  the list is what keeps *Tom*, *tom*, and *tferrebee* from becoming three people.
  Email and division arrive pre-filled from the coaching invite.
- **Relationships** — one row per person with invites and interactions merged, plus
  the counts that the spreadsheet could never show: who signed up and was never
  contacted, and who has gone quiet.
- **Timeline** — one lane per person; a ring for the invite, a mark per interaction,
  a dashed tail where nothing has been logged since. It opens on the current academic
  year (**Settings → Academic year**, default 1 July); **All time** widens it.
- **Import invites** — paste either Google Form tab straight from the sheet. Headers
  are matched by meaning, the division is detected from them, and re-pasting the same
  rows refreshes them in place instead of duplicating.
- **Settings** — edit the interaction-type and *what happened* tag lists, set when the
  academic year starts, and merge duplicate people.

## Two axes on an interaction

**Type** is the shape of the partnership — coaching cycle, mini cycle, drive-by
coaching, one time consulting. One per interaction; it owns the colour and mark shape
on the timeline.

**What happened** is what the interaction actually was — classroom visit, co-planning,
check-in, co-teaching, curriculum. Several per interaction, picked from a dropdown
rather than typed so they stay filterable, and available as a filter on both the log
and the timeline. Both lists live in `coaching-settings/config`
(`interactionTypes`, `interactionTags`) and are edited on the Settings tab.

## Data

Four Firestore collections: `coaching-people`, `coaching-interactions`,
`coaching-invites`, `coaching-settings`. People are keyed on email, so an invite and a
later logged conversation land on the same record.

A first sign-in writes the person's own `users/{uid}` profile with `role: 'coach'`.
The rules accept only that one value from the client and refuse to change a role that
is already set, so nobody can promote themselves and an existing admin is never
demoted. Profiles created before this app existed get `coach` backfilled on next
sign-in.

Anyone in the office reads everything. You edit and delete your own interactions;
merging duplicates may re-point anyone's interaction at a different person record, but
never changes its notes or its author.

## Design notes

- Interaction colours are a five-slot categorical palette validated for colour-vision
  deficiency against the light surface (all pairs). Slots are fixed, never cycled — a
  sixth type shares a neutral grey. Mark *shape* carries the same information as a
  second encoding, and the legend is always labelled.
- `Timestamp` is parsed by looking at the whole column to decide month-first vs
  day-first, with a manual override on the import screen.
