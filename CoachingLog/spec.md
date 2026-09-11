
REFERENCE NOTES - Data pipeline

Hi team.

As I shared earlier this week, I want to let you all in on some of my thinking in the work that we do about data collection and analysis. One of the reasons I see things differently now is that the tools we have available make it inexpensive in time, and cost, to think ambitiously about the ways we interact with data. Having AI nearby means that we can define a problem, share some of our thoughts around what makes it a problem, and then design a tool that helps us solve that problem either directly, or by giving us tools we can use to simplify the process of solving that problem as a team.

I used Claude AI to do a bit of research into some of my thinking on this - I knew I wasn't the first to have these thoughts. Here are the connections it made.

1. THE LAST MILE PROBLEM
Source: Development Dimensions International (DDI), a leadership/talent
consultancy, cited in workplace learning analytics research.
Stat: DDI research found 79% of analytics programs fail because of the
"last mile problem" - insights never make it from the dashboard into
actual action.

McKinsey frames the fix as delivering the right insight to the right
person at the right moment, in a form that actually informs their
decision. That's what we want here - not just making an insight,
but showing it in the same place or time where the decision gets made.

2. LAW OF THE INSTRUMENT (Maslow's hammer)
"If the only tool you have is a hammer, everything looks like a nail."
Usually attributed to Abraham Maslow. Explains why people default to
spreadsheets, and it isn't because it's the best tool, but because it's the
tool already on the desk. When we think about data, we think about
spreadsheets, so we start there.

3. BACKWARD DESIGN (Wiggins & McTighe, Understanding by Design, 1998)
Curriculum planning framework: start with the desired result, then
decide what evidence would show it, then build the activities/materials.
Contrast: teachers (and data builders) traditionally start with the
familiar tool or activity instead of the outcome.
Same logic applied to data tools: define what question the tool needs
to answer before deciding what it looks like.

4. JIM KNIGHT'S IMPACT CYCLE (Instructional Coaching: A Partnership
Approach to Improving Instruction, 2007; also "The Impact Cycle")
Coaching model built around partnership, ongoing relationship, and
data from the teacher's own classroom - individualized and continuous,
not a series of disconnected check-ins.
Connection: a spreadsheet log of coaching touches captures individual
events. Knight's model is about the arc of an ongoing relationship. The
log itself is part of that, but a row on a sheet doesn't show an arc.
It shows a date and a topic, not where the relationship started or
where it's headed.

5. DATA WISE (Boudett, City, Murnane - Harvard data-use protocol)
Common failure pattern in school data teams: form -> meeting ->
spreadsheet -> someone's interpretation. Data teams stall at the
"presentation" step because nobody designed how the data would be
looked at until after it already existed.

6. THE SPREADSHEET EXAMPLE (the actual artifact)
This year's coaching invite form responses. Two tabs, EYSES and MSHS,
one per division. Each is the raw export of a Google Form: timestamp,
email, name, grade, subject, a free text student learning goal, a free
text instructional goal, preferred blocks for co-planning and
co-teaching, an anticipated start date, and a guess at what kind of
partnership this might become.

Somebody was already fighting the sheet by hand. There's an experience
tag in a column with no header - "New to Nido," "New to Coaching (this
year)" - and next to it, every row just says "10," because it's
October and that was easier to type than to build a real field for it.
That's what happens when a form is the whole plan. A teacher signs up
with real intent, it lands in a spreadsheet, and every attempt to make
it usable later means adding another column and hoping you remember
what it means next time.

The deeper problem: this sheet answers "who signed up and what did
they ask for." It doesn't connect to anything that happens after. The
invite is step one of a coaching relationship, and the sheet stops
there.

So - here's the idea.

We want a single tool that helps us answer the question: what are the
coaching relationships that are happening?

What kind of cycle is it?

How does that relationship evolve over time?

All of us in the coaching office are experiencing different aspects of
this at different times. And yes, it is a simple ask to log when we
have a meeting with a teacher. But when we do that, it is important to
not then put the analysis off to another time. The tools we have can
create something that helps us continuously see how things are going
and notice patterns outside of the data itself. That is what is new.

So we want a tool that helps us visualize coaching relationships over
time. We want to make it as easy as possible to capture a conversation.
We want to minimize the times we have to manually type in elements of
data that are part of what we want to filter on.

For example, to know how many times Tom shows up in the data, if we
type tom, Tom, tferrebee, or Tom F because we don't know how he
already exists in our data, that's two problems at once. It's
cognitive load to remember how we entered him last time. And it's not
useful to type a whole name when we could see a list filter
automatically as we type and click what we mean.

I'm imagining a log page that simply offers a button to log an
interaction. A field pops up with an autocomplete, pulling from a list
of staff we already have, or from people we've already entered.

A dropdown for the type of interaction. That's coming from the sheet -
the different options for how we might want to log it.

A date picker for the date, with today already selected since we
assume it just happened.

And a field for notes. What was discussed, a quick overview, maybe a
transcript with notes.

That's the way we input information about our interaction.

Another source of data we might want to use is our coaching invites.
We want our own data in the way we've already collected it, if possible.

That means we aren't necessarily opening a need to manually input our data into a new system. If we can copy from the spreadsheet we have into our new app and have all that data added in, it would save us a lot of time. We want to bring that
information into our tool so we're not keeping track of different
sources ourselves. That's something computers do really well.

 We might want to use Google Login so we have
access to  the name tied to an email.
That makes it easier to put in information and track our own coaching interactions. If we know we'll want an
email address to reach someone or share their info later, we can ask
for that access at the start.


These are the headers from across the spreadsheet for MS/HS:
Timestamp	Email Address	Your name	For which grade would you like to partner?	For which subject or course would you like to partner?	What student learning goal are you interested in looking at during this coaching cycle?	What instructional goal is currently of interest to you? 	What are the best blocks for co-planning?	What are the best blocks for co-teaching? 	Please indicate an anticipated approximate start date. (Optional)	Is this a flexible start date?	I'm imagining this work might be most like a...	

These are the headers for EYS/ES:
Timestamp	Email Address	Your name	For which grade would you like to partner?	For which subject or topic would you like to partner?	What student learning goal are you interested in looking at?	What instructional goal is currently of interest to you? 	If signing up for a cycle, what days and times are best for co-planning? (Optional)	If signing up for a cycle, what days and times are best for co-teaching? (Optional)	Please indicate an anticipated approximate start date. (Optional)	Is this a flexible start date? 	I'm imagining this work might be most like a...	I'm imagining this work might be most like a...	Month	tags

The tags column is something new I added in to address the colors in the spreadsheet. 

I ultimately want a single page HTML file for this app. You can use CDNs for libraries if needed, but I'll leave it to you to find the best approach.

I've included a firebase.js file with my Firebase credentials. I've also included a firebase_rules document to show what exists in the database already.

If you have any questions for me before beginning building, let me know.
