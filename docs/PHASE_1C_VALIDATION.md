# Phase 1C validation guide

Use this guide with EVG learners and staff before expanding the backend. It checks whether the current interface is understandable and practical. It does **not** approve lending rules, social publication, rewards, or collection of real student data.

## Before the session

- Assign one EVG session lead and one note-taker.
- Ask an EVG safeguarding owner to confirm the session format and consent process.
- Use the design preview with fictional information only. Do not ask for names, email addresses, passwords, reading histories, photos, or personal stories.
- Test on the actual phones, tablets, computers, browsers, and network learners are likely to use.
- Prepare the English and Vietnamese interfaces. Have an EVG Vietnamese speaker present.
- Explain that the site is a preview: changes can reset and nothing in the project, reward, or moderation examples is published.

Record the session date, device, browser, interface language, connection type, participant role, and whether help was needed. Do not record unnecessary identifying details.

## Learner walkthrough

Ask at least five representative learners to try the tasks. Read the task aloud only when needed. Do not tell them which button to press unless they are stuck; record that help was needed.

| Task | Ask the learner to… | Pass evidence |
|---|---|---|
| L1 Language | Change the interface language and return to their preferred language | Finds the control; the page changes language; no confusing mixed labels |
| L2 Find a book | Open Library and find a nature, story, or science book without being given a title | Uses browsing or topic filter; opens a book; understands whether a physical copy is available |
| L3 Recover from no results | Search for a made-up title, then return to all books | Understands the empty state and clears the search without help |
| L4 Reading | Add or open a book in the reading area and explain the difference between borrowing and recording reading | Does not assume that recording reading borrows or returns the physical copy |
| L5 Weekly goal | Edit the example goal and change its progress | Understands the progress choices and notices that the preview resets on reload |
| L6 Interests | Choose and remove an interest | Understands that interests can change and are not a test |
| L7 Project | Create a fictional project draft, fix an empty-field error, and choose whether it is ready for feedback | Can recover from validation; understands that nothing was sent or published |
| L8 Sharing boundary | Explain whether draft work, private feedback, and approved showcase work are the same | Understands that finishing, review, and publication are separate actions |
| L9 Presentation | Add an optional outline, rehearse a fictional discovery, edit/cancel and print it | Understands the prompts and what the printed sheet contains; knows the temporary preview has not been sent for real review |
| L10 Navigation and motion | Find Explore and Together from the header; browse each home topic at their own pace | Can use the site with or without animation; notices no hidden action or forced scrolling |

Target for the main learner flow: at least four of five learners complete L2–L5 without step-by-step help after one orientation. Record where learners hesitate even when they eventually pass.

## Staff walkthrough

Use fictional records. Do not enable live lending or enter real learner details.

| Task | Ask the staff member to… | Pass evidence |
|---|---|---|
| S1 Catalogue | Find a book, inspect its availability, and explain the difference between a title and a physical copy | Correctly identifies book metadata, copy ID, and available count |
| S2 Circulation states | Explain what should happen when lending is disabled, no copy is usable, a due date is in the past, a loan is overdue, or a copy is damaged/lost | Expected state and recovery action are clear; no borrower identity is exposed to learners |
| S3 Project feedback | Review the fictional three-part feedback example | Understands “done well,” “question/suggestion,” and “next step”; does not treat it as publication approval |
| S4 Recognition | Review the draft badge criteria | Can identify the criterion and evidence; agrees no award should be automatic or public ranking-based |
| S5 Showcase moderation | Try approval, rejection without a reason, rejection with a reason, withdrawal, and immediate hiding | Pending/rejected/hidden work never appears visible in the fictional cohort state |
| S6 Comment moderation | Open fictional comments, approve one, pause comments, and hide it | Pending text stays private; pausing removes approved text from the fictional cohort view |
| S7 Ownership | Name the primary and backup people for catalogue, lending, moderation, account recovery, and technical support | Every routine and urgent task has an accountable person or is recorded as unresolved |

## Vietnamese review

For every primary page and validation message, ask the EVG reviewer:

- Would a learner naturally use these words?
- Is the tone respectful and easy to understand?
- Are “borrow,” “return,” “due date,” “private,” “feedback,” “draft,” “approved,” “hidden,” and “report” unambiguous?
- Does any translation sound like grading, punishment, competition, or guaranteed privacy when the preview cannot provide it?
- Are labels still clear on the smallest real device?

Record the exact replacement wording requested. Do not silently machine-translate unresolved terms.

## Accessibility and device checks

- Complete the main tasks using only a keyboard.
- Check visible focus and that dialogs close with Escape and return focus safely.
- Test at 200% browser zoom.
- Test the smallest actual device in both languages with no horizontal page scrolling.
- Check that status is never communicated by colour alone.
- Check the homepage with reduced motion and on a short landscape viewport; every topic link remains usable. Test header reflow with enlarged English and Vietnamese text.
- After saving, editing or cancelling a presentation, check where keyboard/screen-reader focus moves. Check long text and the actual print preview without unrelated page content.
- With the available screen reader, confirm form labels, errors, status messages, navigation landmarks, and heading order.
- Test on the centre network and record slow or failed page loads.

These checks support review; they are not a WCAG conformance claim.

## Decision record

After the sessions, record:

1. Tasks passed without help, passed with help, or failed.
2. Confusing Vietnamese and English wording.
3. Device, network, keyboard, zoom, or screen-reader problems.
4. Safeguarding, privacy, lending, reward, or moderation decisions still unresolved.
5. The smallest backend backlog EVG approves next.
6. The named owner and reviewer for every approved item.

Do not move a feature to “Production verified” from this walkthrough alone. Backend features still need permission, persistence, failure, retry, and cross-account tests. Conditional rewards, publication, comments, recommendations, and AI require their separate approval gates in [PLAN.md](../PLAN.md).
