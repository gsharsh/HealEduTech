# EVG Learning Platform

**Latest visual review, 7 November:** the [warm-palette and learning-page refinement](docs/UI_REFINEMENT_2026-11-07.md) replaces the Sorbet colours and simplifies Explore and Together into focused views. The review branch and local URL below are unchanged.

**7 November 2026 review candidate — `get-stuff-done-harshith`:** the current sprint improves the visual system, learner and staff workflows, request efficiency, server-enforced mutation quotas, and the individual Explore / classroom Together journeys. Start the local review with `npm run dev:review` at `http://127.0.0.1:4177`. The [sprint report](docs/SPRINT_RELEASE_2026-11-07.md) records the delivered features, verification and remaining deployment gates; the [free-first architecture decision](docs/FREE_FIRST_ARCHITECTURE_2026-11-07.md) explains costs and request protection. This is a branch candidate, not a main merge or production deployment. New migrations remain pending on the hosted backend.

The [1 November production-readiness report](docs/PRODUCTION_RELEASE_2026-11-01.md) and older dated notes below are historical evidence. The hosted backend had 20 migrations at the start of this sprint; use the current sprint report for the candidate's migration and test status.

Bilingual library, reading, exploration, and peer-learning platform for EVG Vietnam. Students will find and borrow books, track their learning, share discoveries, and explore new topics. EVG staff will manage the library and support students through simple administration screens.

## How to use these documents

- **README.md:** system overview, delivery order, current status, and local setup.
- **[PLAN.md](./PLAN.md):** SRS with use cases, FR/NFR IDs, UML diagrams, delivery gates, and handover requirements.
- **[Frontend verification](./docs/FRONTEND_VERIFICATION.md):** completed prototype checks and remaining release evidence.
- **[Phase 1C validation guide](./docs/PHASE_1C_VALIDATION.md):** simple learner/staff walkthroughs, Vietnamese review, accessibility checks, and decision record.
- **[Design research](./docs/DESIGN_RESEARCH.md):** reference platforms, EVG design decisions, and usability validation.
- **[Explore learning design](./docs/EXPLORE_LEARNING_DESIGN_2026-11-07.md):** current deterministic suggestions and their limits; [the wider recommendation roadmap](./PLAN.md#6-topic-discovery-with-little-initial-data) includes future AI evaluation.
- **[October improvement and readiness review](./docs/PRODUCTION_READINESS_2026-10-02.md):** current work, remaining release gates and the January 2027 rollout boundary.
- **[Project-history audit](./docs/PROJECT_HISTORY_AUDIT_2026-10-02.md):** available project conversations, Git history and unfinished requirements.
- **[Education research](./docs/EDTECH_RESEARCH_2026-10-02.md)** and **[design research](./docs/DESIGN_RESEARCH_2026-10-02.md):** source-backed improvements and the preferences-first recommendation plan.
- **[Typography, glass and verification](./docs/VERIFICATION_2026-10-02.md):** the refined type/material system, browser coverage and local backend regression results.
- **[Historical system UML and access matrix](./docs/SYSTEM_UML_2026-10-02.md):** October models and transaction boundaries. [The interactive domain diagram](./docs/uml/rendered.html) is historical; use the [current design and flow map](./docs/SPRINT_DESIGN_AND_FLOWS_2026-11-07.md) for this candidate.

System IDs are shared with the plan. Use them in tasks and pull requests, for example `S03: record a book return`. These systems are parts of one application, not separate services.

## Systems we will build

The table below describes the full roadmap and its original phase allocation. The current candidate implements accounts, catalogue persistence, private reading/interests, staff circulation and oversight, deterministic Explore suggestions, and Together notebooks, teacher review, approved publication and moderated feedback. The new Together, reading-timeline, guarded-removal and quota migrations remain pending on the hosted backend. Goals, rewards, resource authoring and AI remain roadmap work. Use the [current sprint report](docs/SPRINT_RELEASE_2026-11-07.md) for verification and deployment gates, alongside [Supabase pilot setup](docs/SUPABASE_PILOT.md).

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
                      S11 Deterministic suggestions (candidate); AI later

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

This is the original delivery sequence. The 7 November candidate advances bounded deterministic suggestions and parts of projects, showcases and feedback; goals, rewards and AI remain deferred. Each capability still needs its documented deployment and acceptance checks.

## Historical frontend preview (through 1 November)

This section preserves the previous delivery record. For current Explore, Together, and reliability changes, use the [7 November sprint report](docs/SPRINT_RELEASE_2026-11-07.md).

**26 October 2026 local staff increment:** `/staff/students` adds student profiles and reading/borrowing summaries; `/staff/dashboard` adds current library metrics and weekly lending trends. Circulation now supports searchable, paginated loans, seven-day overdue staff alerts, email drafts and shared contact history. Staff can see reading titles, status and counts; written reflections remain private. Apply the new staff-oversight migration before deploying these pages. This increment has not been applied to the hosted project. See [staff oversight and release verification](docs/STAFF_OVERSIGHT_2026-10-26.md).

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
npm run dev:review # review at http://127.0.0.1:4177 (strict port)
npm run lint      # check TypeScript and React source
npm run build     # type-check and build for production
npm run preview   # preview the production build; run npm run build first
npm test          # domain, request, security and tooling regressions
npm run test:browser # isolated desktop/phone journeys; install Playwright Chromium first
npm run test:accessibility # automated axe checks (not a complete accessibility audit)
npm run test:db   # disposable local PostgreSQL: migrations, permissions and concurrency
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
  migrations/     reviewed database schema and row-level security changes
  seed.sql        idempotent public-domain sample catalogue for local demos
  tests/          rollback-only SQL checks for policies and seed data
```

For Vercel, select the Vite framework preset, use `npm run build`, and publish `dist`. Set the project root to the folder containing this README, `package.json`, and `vercel.json`. The rewrite in `vercel.json` sends direct requests such as `/learning` and `/library` to the React entry point, so opening or refreshing those URLs works. Redeploy after changing this configuration. See [Vercel's Vite SPA guidance](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas).

For Cloudflare Pages, use the same build command and output directory. Its equivalent routing rule is `public/_redirects`; Vercel uses `vercel.json` instead.

Current feature folders are `auth`, `learning`, `library`, `explore`, `community`, and `admin`. The demo state boundary is shared across routes; circulation is available after its migration and policy release gate. Student and staff library screens should use the same catalogue and lending logic. S12 provides staff access to feature operations rather than duplicating their business rules.
