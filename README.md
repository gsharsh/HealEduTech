# EVG Learning Platform

Bilingual library, reading, exploration, and peer-learning platform for EVG Vietnam. Students will find and borrow books, track their learning, share discoveries, and explore new topics. EVG staff will manage the library and support students through simple administration screens.

## How to use these documents

- **README.md:** system overview, delivery order, current status, and local setup.
- **[PLAN.md](./PLAN.md):** SRS with use cases, FR/NFR IDs, UML diagrams, delivery gates, and handover requirements.
- **[Frontend verification](./docs/FRONTEND_VERIFICATION.md):** completed prototype checks and remaining release evidence.
- **[Phase 1C validation guide](./docs/PHASE_1C_VALIDATION.md):** simple learner/staff walkthroughs, Vietnamese review, accessibility checks, and decision record.
- **[Design research](./docs/DESIGN_RESEARCH.md):** reference platforms, EVG design decisions, and usability validation.
- **[Recommendation design](./PLAN.md#6-topic-discovery-with-little-initial-data):** the later recommendation system and its approach to limited data.
- **[October improvement and readiness review](./docs/PRODUCTION_READINESS_2026-10-02.md):** current work, remaining release gates and the January 2027 rollout boundary.
- **[Project-history audit](./docs/PROJECT_HISTORY_AUDIT_2026-10-02.md):** available project conversations, Git history and unfinished requirements.
- **[Education research](./docs/EDTECH_RESEARCH_2026-10-02.md)** and **[design research](./docs/DESIGN_RESEARCH_2026-10-02.md):** source-backed improvements and the preferences-first recommendation plan.
- **[Typography, glass and verification](./docs/VERIFICATION_2026-10-02.md):** the refined type/material system, browser coverage and local backend regression results.
- **[Current system UML and access matrix](./docs/SYSTEM_UML_2026-10-02.md):** implemented versus planned models, transaction boundaries and remaining production gates. [Open the interactive domain diagram](./docs/uml/rendered.html).

System IDs are shared with the plan. Use them in tasks and pull requests, for example `S03: record a book return`. These systems are parts of one application, not separate services.

## Systems we will build

The table below describes the full roadmap. The current implementation includes accounts, catalogue persistence, private reading/interests, and a staff circulation workflow gated by an approved lending policy. September release evidence records the reading and circulation migrations as hosted; successful real-account journeys remain to be verified. Remaining systems are planned or demonstrated with fictional data. See [Supabase pilot setup and release gates](docs/SUPABASE_PILOT.md) for configuration, permissions and verification status.

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

The approved cream-and-green reading-room design uses a slim glass navigation bar, a browse-first homepage at `/`, and an optional bilingual guide at `/start`. Existing live catalogue, account, reading and staff workflows retain their data and access boundaries. The old isolated design preview has been retired. See [design rationale and verification](docs/CREAM_GLASS_DESIGN.md).

- Primary navigation: Home, Library, My reading, Explore and Together. Home also links directly to activities. The quick guide and footer links remain available; authorised staff get their own operations links. Compact screens retain all five labelled student destinations.
- English/Vietnamese interface and a saved language preference.
- Six fictional catalogue entries with original CSS/text covers; bilingual search, topic filtering and empty-result recovery.
- Book detail dialogs, adding to the reading list, marking finished and a derived finished count.
- One editable weekly-goal preview with progress, plus editable topic interests. The goal is explicitly non-persistent and resets when leaving its page or reloading; the warning appears before editing and after saving.
- Three expandable sample activities with materials, steps, a completion reflection and a related-book link; no personalised ranking or AI calls.
- One reversible staff checkout/return demo that updates sample availability independently of reading history.
- Together starts with fictional example showcases, followed by an activity link and a project preview. The project warns before entry and after saving that leaving or reloading clears it; nothing is sent or published.
- `/staff/training` contains draft recognition criteria and fictional showcase/comment moderation exercises. On a configured site, the route requires staff access. It awards no badges and publishes no content.
- Account entry now has registration, email verification and sign-in forms when Supabase is configured.

**Without Supabase, demo learning records reset on refresh.** With Supabase configured and the relevant migrations applied:

- `/sign-in` opens on login, with separate registration, email confirmation/resend, optional magic links, and password recovery. `/reset-password` accepts a valid recovery session.
- `/library` shows catalogue records, derived copy availability, private reading actions, and the signed-in learner's loans.
- `/learning` saves reading status and optional reflections; `/explore` saves editable interests. Reading is independent of physical lending.
- `/admin` adds books/copies and lets administrators manage staff access; `/admin/circulation` supports authorised staff checkout, usable/damaged returns, and lost-copy resolution.
- The circulation desk disables checkout when lending policy is off, rejects past due dates in the centre timezone, marks overdue active loans, and distinguishes usable, damaged, and lost resolutions.
- Lending starts **disabled in the database**. EVG must approve eligibility, limits, due-date policy, timezone, and loss/damage handling before enabling it. Staff enter each due date explicitly.

The configured site is deployed at [heal-edu-tech.vercel.app](https://heal-edu-tech.vercel.app). Fifteen hosted migrations were verified on 25 September, including accent-insensitive catalogue search. Guest browsing, search/filter recovery, book details, login validation and sampled mobile layouts have been checked on the hosted site. Successful login/email delivery, saved learner-data journeys and real cross-account walkthroughs still require dedicated test accounts; they are not implied by successful deployment. See the [live QA evidence and remaining checks](docs/LIVE_QA_2026-09-24.md). Goal/project persistence, real facilitator feedback, approved reward logic, protected publication/moderation, managed learning resources and recommendations remain future work. Follow the [pilot release gates](docs/SUPABASE_PILOT.md) and use synthetic data until they pass.

See PLAN Section 7 for the route-by-route boundary and next frontend increments. The existing optional backend configuration remains untouched.

The earlier Phase 1B slices were deployed as explicitly labelled previews. The [29 September student-experience fixes](docs/STUDENT_FIXES_2026-09-29.md), including the staff-training split above, are verified locally and have not been deployed as part of this task. The previews still require Phase 1C review with EVG students and staff; this does not approve persistent social features, reward rules, lending policy, or collection of real student data.

Content suitability and matching the catalogue to physical stock will be reviewed once the project has access to EVG's library. The [EVG handover plan](docs/EVG_HANDOVER.md) records future operational ownership and the creator's retained administrator and agreed recovery access.

**2 October 2026 scope update:** this working checkout builds on the unreleased September fixes with homepage topic storytelling, restored navigation and presentation/reflection improvements. Its release and verification status is recorded in the [dated readiness review](docs/PRODUCTION_READINESS_2026-10-02.md). Recommendation engineering planning starts the week of **5 October 2026**. Real learner rollout and new preference/recommendation data collection wait until **January 2027 in Vietnam**, after EVG decisions, relevant release gates and student feedback. The upcoming survey will inform later revisions; neither simulated personas nor website research replace that primary evidence.

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

The app can run without Supabase credentials while developing the interface. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` for the pilot backend. Never place a Supabase service-role key in a Vite environment variable.

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
  seed.sql        idempotent public-domain sample catalogue for local demos
  tests/          rollback-only SQL checks for policies and seed data
```

For Vercel, select the Vite framework preset, use `npm run build`, and publish `dist`. Set the project root to the folder containing this README, `package.json`, and `vercel.json`. The rewrite in `vercel.json` sends direct requests such as `/learning` and `/library` to the React entry point, so opening or refreshing those URLs works. Redeploy after changing this configuration. See [Vercel's Vite SPA guidance](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas).

For Cloudflare Pages, use the same build command and output directory. Its equivalent routing rule is `public/_redirects`; Vercel uses `vercel.json` instead.

Current feature folders are `auth`, `learning`, `library`, `explore`, `community`, and `admin`. The demo state boundary is shared across routes; circulation is available after its migration and policy release gate. Student and staff library screens should use the same catalogue and lending logic. S12 provides staff access to feature operations rather than duplicating their business rules.
