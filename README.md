# EVG Learning Platform

Bilingual library, reading, exploration, and peer-learning platform for EVG Vietnam. Students will find and borrow books, track their learning, share discoveries, and explore new topics. EVG staff will manage the library and support students through simple administration screens.

## How to use these documents

- **README.md:** system overview, delivery order, current status, and local setup.
- **[PLAN.md](./PLAN.md):** SRS with use cases, FR/NFR IDs, UML diagrams, delivery gates, and handover requirements.
- **[Frontend verification](./docs/FRONTEND_VERIFICATION.md):** completed prototype checks and remaining release evidence.
- **[Design research](./docs/DESIGN_RESEARCH.md):** reference platforms, EVG design decisions, and usability validation.
- **[Recommendation design](./PLAN.md#6-topic-discovery-with-little-initial-data):** the later recommendation system and its approach to limited data.

System IDs are shared with the plan. Use them in tasks and pull requests, for example `S03: record a book return`. These systems are parts of one application, not separate services.

## Systems we will build

Production systems below are **planned**. The frontend currently demonstrates selected workflows using fictional, in-memory data; this does not implement authentication or backend persistence.

| ID | System | Main functions | First working phase |
|---|---|---|---|
| S01 | Accounts and permissions | Invite users, sign in, recover accounts, assign staff permissions, protect private records | 2A |
| S02 | Book catalogue and inventory | Store book details and topic tags; register physical copies, shelf locations, and condition | 2B |
| S03 | Borrowing, returns, and availability | Record who borrowed which copy, due dates, returns, overdue loans, and available copies | 2B |
| S04 | Reading history and interests | Track currently reading/finished books, reflections, and preferred topics | 2C |
| S05 | Weekly learning goals | Plan an exploration with volunteer support and record progress | 3 |
| S06 | Projects, presentations, and feedback | Record discoveries and provide private facilitator feedback | 3 |
| S07 | Badges and rewards | Recognise reviewed milestones, prevent duplicate awards, and correct mistakes | 3 |
| S08 | Peer showcases | Submit work for staff approval and share approved discoveries with the cohort | 4 |
| S09 | Comments and Q&A | Support moderated questions, encouragement, reporting, and removal | 4 |
| S10 | Learning resources and topics | Maintain approved resources, bilingual topic labels, metadata, and educator picks | 2C |
| S11 | Recommendations (RecSys) | Suggest topics/resources using rules, followed by reviewed AI assistance | 6, then 7 |
| S12 | Staff operations and handover | Provide task queues, authorised reports/exports, operating guides, and recovery procedures | Incremental from 2A; handover in 5 |

Shared requirements: English/Vietnamese support, accessible screens, privacy, safe errors, persistent data where required, and appropriate tests. English is the initial interface language; a saved Vietnamese preference is preserved. Content-language needs are assessed separately.

## How the systems connect

```text
S01 Accounts and permissions support all private workflows

S02 Book catalogue + physical copies → S03 Borrowing and returns
             ↓                                  ↓
S04 Reading history and interests      My loans / staff loan desk
             ↓
S05 Weekly goals → S06 Projects and feedback → S07 Rewards
                              ↓
                      S08 Approved showcases → S09 Moderated Q&A

S02 Book topics + S04 Explicit interests + S10 Approved resources
                              ↓
                      S11 Recommendations (later)

S12 Staff operations supports each system as it becomes available
```

**A catalogue entry, a physical copy, a loan, and a reading record are different records.** Three copies of the same book share catalogue information but can have different borrowers and availability. Returning a copy does not mean the student finished reading it; reading at the centre does not require a loan.

## Delivery order

| Phase | Team outcome |
|---|---|
| 0 | Confirm devices, email access, inventory, lending policy, owners, and budget |
| 1A–1C | Review the current frontend, prototype remaining workflows incrementally, then validate with EVG students and staff |
| 2A | Make accounts, permissions, and the operational foundation work |
| 2B | Complete the catalogue → checkout → return → availability workflow |
| 2C | Add reading history, interests, and the approved resource catalogue |
| 3 | Add goals, presentations, feedback, and rewards |
| 4 | Add approved showcases and moderated discussion |
| 5 | Run the pilot, verify recovery, and demonstrate EVG handover |
| 6 | Implement transparent topic recommendations using approved content |
| 7 | Evaluate limited AI assistance with staff review and usage controls |

Build and verify one usable workflow at a time. Working recommendations and AI stay at the end; earlier screens must identify examples and educator picks honestly.

## Current frontend preview

An original community-library interface informed by Khan Academy, Duolingo and Kolibri. Research sources and adaptation choices are recorded in [design research](docs/DESIGN_RESEARCH.md).

- Four student destinations: My learning, Library, Explore, Together; labelled bottom navigation on phones.
- English/Vietnamese interface and a saved language preference.
- Six fictional catalogue entries with original CSS/text covers; bilingual search, topic filtering and empty-result recovery.
- Book detail dialogs, adding to the reading list, marking finished and a derived finished count.
- One example weekly goal and editable topic interests.
- Three expandable sample activities; no personalised ranking or AI calls.
- One reversible staff checkout/return demo that updates sample availability independently of reading history.
- Community and account entry previews that explain their remaining limitations.

**All demo records reset on refresh.** Only interface language is stored locally. The staff route is open, the examples are fictional, and no ebook files are provided. Authentication, database permissions, real lending, due dates, rewards, project submission, comments, moderation, and recommendations remain future work. Never enter real student data into this preview.

See PLAN Section 7 for the route-by-route boundary and next frontend increments. The existing optional backend configuration remains untouched.

## Team task format

For each task, record:

1. **System/requirement IDs and owner:** one accountable teammate and a reviewer.
2. **User outcome:** what a learner or staff member must be able to do.
3. **Dependencies:** records or systems that must already work.
4. **Work:** interface, data/permissions, and error handling.
5. **Acceptance:** observable checks proving the outcome and appropriate access.
6. **Status:** Backlog → Ready → In progress → In review → Verified; distinguish Prototype verified from Production verified.

Example: **S03 — Return a borrowed copy.** Depends on S01 and S02. An authorised operator records the return; history is preserved; a usable copy becomes available; repeating the action does not duplicate records. See the plan for the full rules.

Mark a task Verified after its data behaviour, permissions, bilingual interface, and relevant failure cases are checked. Track individual assignments in team issues using the same system IDs.

## Local setup

Requirements: a current Node.js LTS release and npm.

```sh
npm install
cp .env.example .env.local
npm run dev
```

The app can run without Supabase credentials while developing the interface. Add a project URL and public anonymous key to `.env.local` when the Phase 2 backend is ready. Never place a Supabase service-role key in a Vite environment variable.

## Commands

```sh
npm run dev       # start the local Vite server
npm run lint      # check TypeScript and React source
npm run build     # type-check and build for production
npm run preview   # preview the production build; run npm run build first
```

## Project structure

```text
src/
  app/            application routes
  components/     shared layout and interface components
  demo/           fictional catalogue and in-memory prototype state
  features/       feature-owned pages, data access, validation, and tests
  i18n/           Vietnamese and English interface copy
  lib/            environment and Supabase setup
  styles/         shared application styles
  types/          shared domain types and future generated database types
supabase/
  functions/      server-only privileged operations
  migrations/     reviewed database schema and row-level security changes
```

For Cloudflare Pages, use `npm run build` and publish the `dist` directory. The included `_redirects` file preserves client-side routes.

Current feature folders are `auth`, `learning`, `library`, `explore`, `community`, and `admin`. The demo state boundary is shared across routes; a production circulation service is still deferred. Student and staff library screens should use the same catalogue and lending logic. S12 provides staff access to feature operations rather than duplicating their business rules.
