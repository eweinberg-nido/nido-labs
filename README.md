# Changemakers Portfolio

A working prototype of a student-assembled assessment portfolio for the Grade 10 Changemakers
course, built as static HTML pages that resemble a Google Site.

## Executive summary

Work in the Changemakers course is difficult to assess through conventional assignments. Much
of what the course asks students to develop, including iteration, the gathering of
perspectives, and reflection on their own process, is not visible in a finished product. It
becomes visible in the differences between a September version and a December one, and in
what a student can say about why those differences occurred.

This prototype sets out a model in which the student assembles the evidence and proposes a
level, and the advisor reviews and confirms or adjusts it. Each student has a site with one
page for each domain of the CM10 Learning Progressions. On that page they keep a dated growth
ledger recording what they made and what changed, embed the work itself from Drive, select one
piece as their current best work, and give their reasons for the level they propose. Four
times a semester, on fixed show dates, the advisor reads what is there, records a level with a
written explanation, and identifies a single next step. Work is not assessed between show
dates.

The model is intended to have three effects.

Assessment takes place on four known dates rather than continuously. Because students organise
their own evidence before each date, advisors are not required to follow the progress of every
student in the intervening weeks.

Growth becomes part of the record. The ledger holds abandoned versions and unsuccessful
attempts alongside successful ones, and these are frequently the clearest evidence a student
has for the sub-skills concerned with iteration and reflection.

Students take a position on their own work. Assigning themselves a level and explaining it is
part of the task. Having that level adjusted, in either direction, with reasons given, is a
normal part of the process rather than a failure of it.

The repository holds two complete annotated exemplars at different levels, together with a
calibration page that places their evidence side by side. The exemplars exist principally to
support consistency: a cohort of roughly 110 students, assessed by a large advisory team,
requires a shared understanding of what each level looks like before the first show date.

This is a prototype for discussion. It has not yet been used with students.

## What is in the repository

| File | Description |
| --- | --- |
| `index.html` | The calibration page for advisors. A good place to begin. Links to both exemplars and compares them sub-skill by sub-skill. |
| `exemplar-exemplary.html` | A complete portfolio for a student working at a high level. Four sub-skills at 4.0, two at 3.5, three at 3.0 and one at 2.0. |
| `exemplar-developing.html` | A complete portfolio for a student who found the semester difficult. Two sub-skills at 3.0, three at 2.5, three at 2.0 and two at 1.0. |
| `portfolio.css` | Shared styling. All pages need to remain in the same folder. |
| `learning-progressions.md` | The CM10 progressions against which the exemplars are assessed, with the half-point convention. |
| `sample.html` | An earlier prototype built on the superseded scale. See "Known issues". |
| `proficiencyscale.md` | The superseded five-strand scale, kept for reference. |

The pages open directly in a browser. There is no build step and no dependencies.

## The assessment model

**Four domains and ten sub-skills.** The navigation follows the CM10 progressions:
Communication (verbal, written, visual), Analysis (of written text and of visual text),
Inquiry and Design Processes (gathers multiple perspectives, honors iterative process,
reflects on efficacy of process stage) and Action/Impact (refines prototypes based on
feedback, evaluates impact of action).

**Levels are recorded numerically from 1.0 to 4.0**, in half-point increments. These replace
the wording the progressions document used originally, in which 1.0 was Basic, 2.0
Foundational, 3.0 Target and 4.0 Distinguished. The descriptors themselves are unchanged and
appear verbatim on each domain page.

**A half point describes partial attainment of the next level.** A student with a 2.5 can do
what 2.0 describes consistently, and can do some of what 3.0 describes, usually in one piece of
work rather than throughout. A student with a 3.5 can do what 3.0 describes consistently, and
some of what 4.0 describes, often within a single strand of a project. A half point is not
awarded for effort, for the amount of work submitted, or for improvement considered on its own.

**Each sub-skill is assessed on its own.** A student's level in one sub-skill does not depend
on their level in another, and levels are not expected to be even across a domain. Where a
student has not yet produced evidence, no level is recorded and the page shows that the
evidence is not there yet.

**Show dates.** Four fixed dates each semester. In the exemplars these are 12 September, 10
October, 14 November and 12 December. Students update their site before the date, and advisors
review on or after it.

**One growth ledger for each domain rather than for each sub-skill.** Each row records a date,
an artifact, the sub-skills it provides evidence for, and what changed since the previous
entry. A single artifact commonly provides evidence for several sub-skills, and a separate
ledger for each of the ten would require students to write the same entry three times. The
column recording what changed is the one that carries most of the value, and it is also the one
students are most likely to leave empty.

**Dated process notes.** Short notes written during the work rather than about it afterwards.
These are what allow a portfolio to be read as a record of learning rather than as a
collection of finished pieces, and they are the clearest point of difference between the two
exemplars. The first holds twelve notes running from late August to December. The second holds
six, the earliest dated 24 October, so the first ten weeks of that semester have no record at
all.

**Self-assessment followed by verification.** The student proposes a level and gives reasons,
in writing or on video. The advisor records a level with a written explanation and identifies
one next step. In the final round, Exemplar B contains four adjustments, three downward and
one upward; Exemplar A contains none, though its show date log records an adjustment made in
October.

**Live Drive embeds.** Students embed Docs, Slides and video rather than uploading copies. A
file edited in Drive updates on the page without the Site being republished, which addresses
one of the specific difficulties encountered in the earlier middle school rollout.

## Background to the design

Three earlier attempts were unsuccessful, and most of the decisions in this prototype respond
to what happened in them.

**A slides-based portfolio in the first year.** Students tended to imitate the exemplars rather
than reflect on their own work. There was no dependable way of seeing what had changed since
the previous review, since version history proved cumbersome and using comment timestamps
failed because students resolved comments incorrectly. Running Schoology alongside a slide deck
and a portfolio created too many locations for the same work. Assessing creativity through
written justifications tended to measure writing.

The growth ledger is intended to replace version history with a record the student writes
deliberately. Reflection may be submitted on video, so that a level depends less on written
fluency. The calibration set is deliberately uneven and includes a strong portfolio with a 2.0
in it, since a set drawn only from top-level work encourages imitation.

**Google Sites in the middle school.** This was discontinued after implementation proved
inconsistent between advisors, after a difficult reception when it was extended to around 50
teachers at once, and because sharing and publishing permissions added friction, Sites not
updating live in the way Docs do.

This prototype uses a fixed template so that advisors encounter the same layout each time, live
Drive embeds so that publishing is not part of the student's workflow, and a calibration page
prepared before rollout rather than after it.

**The current arrangement using folders**, which has its own unresolved difficulties.

The principle underlying all of this is that the work of assembling evidence belongs to the
student.

## Known issues

**The descriptors for visual analysis cannot be applied as written.** In
`learning-progressions.md`, the four descriptors for *Analysis > Analysis of visual text* are a
copy of the *Communication > Visual* row, and describe the making of visual work rather than
the analysis of it. Both exemplars note this on the page and use a clearly marked placeholder,
so the levels recorded against that sub-skill are provisional. The row needs to be written
before the set is shared with staff.

**`sample.html` and `proficiencyscale.md` are out of date.** Both use the earlier five-strand
scale of Creativity, Adaptive Thinking, Collaboration, Communication, and Advocacy and Action,
scored from 0.0 to 4.0. They are kept for reference. There is at present no blank template
built on the current progressions, and one should be prepared from the exemplars.

**Consistency across a large team remains the open question.** The exemplars give advisors a
shared reference, and the comparison table on `index.html` is written so that a difference of
view can be discussed in terms of a particular piece of work. Whether that holds across a full
advisory team has not been tested.

**There is no rule for combining levels.** Each student has ten levels each semester, and
nothing in this prototype describes how those become a reported grade. This is a deliberate
gap rather than an oversight, but it needs to be resolved.

## About the exemplar content

Both portfolios are set in an international school in Santiago, and the students' own writing
was drafted to sound like Grade 10 students rather than like rubric descriptors. The students,
projects and staff are fictional.

**Exemplar A. Josefina Marchant, "Semana Uno."** A card and a WhatsApp group for students who
transfer in during the year, covering Bip! cards, which micro passes the gate, and what to do
when a phone plan runs out of data. Four tested versions. She set aside her first design after
counting 31 unclaimed booklets in October.

**Exemplar B. Tomás Ibáñez, "¿Se Puede Salir?"** A poster and a 45-second video explaining what
preemergencia days mean and what to do on them. The finished pieces are capable, the process
behind them is thin, and nothing was uploaded at the first show date.

Three decisions in the set are deliberate and are open to discussion.

The developing student is recorded higher than the stronger student in one sub-skill. If the
exemplars never cross over in this way, there is a risk of advisors levelling the student
rather than the evidence.

The strong portfolio is not uniformly at 4.0. It includes a 2.0, and the student proposes that
level herself and explains her reasoning.

The developing student has not disengaged. He cares about his project, and his strongest single
piece of evidence is better than what many higher-scoring students hold in that sub-skill. An
exemplar that appeared careless would misrepresent the students advisors will actually be
assessing.

## Reference

The interactive sample transcript published by the Mastery Transcript Consortium is the closest
existing model for what students should eventually be able to produce:
<https://www.mastery.org/>
