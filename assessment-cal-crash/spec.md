# SPEC.md: Assessment Calendar Crash Incident Obviator

We have a system for our assessment calendar at our international school that allows everyone to be on the same page when it comes to deciding on dates for assessments. The idea is that when a teacher wants to schedule an assessment, they go to the calendar for the week they want to give their assessment and look to see what is already scheduled. Students should not have more than two assessments on a given day. There are different calendars for grades 9, 10, 11, and 12.

One problem relates to this last fact: many classes—likely a majority—are mixed grade levels. It is difficult to gauge how many students actually have an assessment on a given day because looking across multiple calendars and identifying specific students creates a high cognitive load. If there is already a grade 10 math assessment and a grade 10 science assessment on Wednesday, another grade 10 teacher can see that easily and know that an additional assessment should not go on Wednesday.

But an elective teacher with grade 10, 11, and 12 students has to look at three different calendars to determine whether Wednesday is a good or bad day. Even if the elective teacher does schedule an assessment that day, the conflict may only affect two students in the class. Those students may need special arrangements, but identifying them currently requires manually examining calendars and class lists.

One realistic constraint - some teachers don't add mixed classes to the assessment calendar - they just paste everyone into the invite. That's faster. This also means you can't necessarily assume that a name on one day on the grade 9 assessment calendar is in grade 9. Probably true, but not necessarily.

Another problem, maybe for a later version - some teachers add the roster to the description of the event rather than invite all of the students. That's annoying, but a reality with this current system.

The software should make this process easier. A teacher should be able to select a proposed assessment date and paste or upload their class list. The system would then identify students who already have two assessments scheduled that day, flagging only the students who would be affected by adding this assessment. This would let the teacher make an informed decision: choose another date, proceed while arranging alternatives for a small number of students, or recognize that the date is clear.

A broader view would also be valuable: teachers and coordinators could see a student’s total assessment load across an entire week, not only same-day conflicts. This could surface cases where a student has an assessment in every class during one week, even if they do not exceed the two-assessment daily limit.

One practical way of looking at this is by providing a five day week view to the user. The expected procedure for teachers is to invite students to the assessment, so their email addresses should be attached to the calendar. You then create an ongoing collection of students that have assessments, look for students that have multiple assessments, and present the "crashes" of students that already have 2 (or more, perhaps with a more serious flag or designation) on a particular day. 

I could provide the calendar_ID for all of these calendars. I've created a different application that uses a Firebase users collection, Auth, and an API key that is activated for Google Calendar to get such an app access to the calendar if the user logs in.

Grade 9 assessment calendar ID: c_v27k766n9ksdeb9g0932vv8n88@group.calendar.google.com
Grade 10 assessment calendar ID: c_sdjvrf9c8012n30l8dps8h4qjc@group.calendar.google.com
Grade 11 assessment calendar ID: c_pjcg8k6hiasf7oveo9m7vhsng8@group.calendar.google.com
Grade 12 assessment calendar ID: c_3i50bet37c1soj031pvua8rvso@group.calendar.google.com


I think the goal is a zero-backend, single-page web application (SPA) that authenticates users via their `@nido.cl` Google account, accesses calendars for a five day Monday - Friday week (selectable by date), it shows assessments on the page from the calendars, and indicates students that might need extra support. Or, if a teacher wants to create an assessment on the day, it shows who on the list would be affected if that assessment is, indeed, added to the calendar.

---

## 1. System Architecture & Tech Stack

* **Frontend**: Vanilla HTML5, CSS3, and JavaScript (ES6+), self-contained in a single file (`index.html`).
* **Authentication**: Firebase Authentication SDK (v10.8.0 Compat) with Google OAuth 2.0 provider restricted to the `nido.cl` hosted domain (`hd`).
* **Data Ingestion**: Public Google Calendar `.ics` stream retrieved via `api.allorigins.win` CORS proxy.
* **Storage**: Browser `localStorage` for client-side persistence where it makes sense

---

## 2. Functional Requirements

### 2.1 Authentication & Domain Control

* Users must authenticate via Google Sign-In before accessing calendar tools 
* Auth callback strictly validates email domain suffix against `@nido.cl`. Non-matching accounts trigger an access denial alert and instantly sign out.

---

## 4. Configuration & Deployment

### Required Environment Variables / Config Objects

To deploy, update the `firebaseConfig` object in `index.html`:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyAFhiLa94zjP8IakzEd4nvtJOH-HRX10fI",
    authDomain: "nido-teaching-learning.firebaseapp.com",
    projectId: "nido-teaching-learning",
    storageBucket: "nido-teaching-learning.firebasestorage.app",
    messagingSenderId: "167104058821",
    appId: "1:167104058821:web:7ca1f5c91ddcb68df1a7ac"
};
```

### Firebase Console Prerequisites

* **Authentication**: Enable Google as a Sign-in provider.
* **Authorized Domains**: Add the hosting domain (e.g., `localhost` or GitHub Pages domain) under *Firebase Console > Authentication > Settings > Authorized domains*.