# Morning review — HealEduTech / EVG

**Later owner review:** the [warm-palette and simpler learning pages](UI_REFINEMENT_2026-11-07.md) supersede this report's Sorbet styling and long Explore/Together presentation. The feature and deployment boundaries below remain applicable; the screenshots in this original report show the earlier design.

Review branch: `get-stuff-done-harshith`. Based on `b32e529`. No merge to `main`, Sites hosting, hosted database migration or production frontend deployment is part of this sprint.

## Open the local site

The review server uses **http://127.0.0.1:4177**. If it has stopped:

```sh
cd "/Users/gsharsh/Downloads/chat/ChatGPT/Vietnam Website/HealEduTech-production"
npm run dev:review
```

The ignored local environment uses the existing Supabase backend with its public browser key. There are no privileged keys in the frontend or Git changes. The existing hosted backend still has the original 20 migrations. The branch has three additional migrations, described below. Consequently, the local site can show the new public design, Explore, library and existing account/staff features now; **Together saving/moderation, the new reading timeline capture, guarded catalogue removal and the server mutation budget require those migrations before they work against that backend**. Together explains this state without pretending that a save happened.

The complete new workflows are exercised with synthetic browser data and a disposable PostgreSQL/PostgREST backend. Those tests are not proof of hosted email delivery or real learner acceptance.

Existing authenticated account, reading, catalogue and circulation actions from the local review site still write to the hosted backend. The local frontend is not an isolated test database.

## What changed

### Design across the site

- Adopted the owner's Sorbet palette: `#CCCCCC`, `#EDECEC`, `#B7C396`, `#FEFEFE`, `#E0E7D7`, `#BA9A91`. Dark text and functional error/warning/destructive colours preserve legibility and meaning.
- Refined the homepage hierarchy, search, compact topic collection, book shelf and footer. The site uses its existing local typefaces, illustration and photography assets.
- Improved mobile navigation, keyboard focus, full-card book links, loading states, Help/Privacy contents navigation and narrow-screen layouts.
- Rebuilt staff dashboards around actionable metrics, follow-up work, lending trends and student support. Charts have a zero baseline, readable labels, differentiated series and exact-number tables; empty states do not invent activity.

Design sources are legitimate public author material and design-system guidance, not unauthorised copies of books. See the [design/flow map](SPRINT_DESIGN_AND_FLOWS_2026-11-07.md) and [dashboard design](DASHBOARD_DESIGN_2026-11-07.md).

Saved visual examples: [desktop homepage](review/2026-11-07/home-desktop.png), [phone homepage](review/2026-11-07/home-phone.png), [Explore](review/2026-11-07/explore-desktop.png), [Together](review/2026-11-07/together-desktop.png), and [staff dashboard](review/2026-11-07/dashboard-desktop.png). These browser-test captures use synthetic catalogue and dashboard records, not real student activity.

### Explore: individual learning

Students choose a topic and move through **book → resource → activity → reflection**. Suggestions explain their connection to saved interests or recent reading. Ranking uses bounded catalogue/reading queries, language preference and availability, without AI calls or private reflection analysis. The page offers verified links from NASA, Smithsonian, British Council, Storyline Online and PhET, with publisher/content-language labels and no automatically embedded players.

Guests can explore immediately. Signed-in learners retain the existing reliable interest editor, with separate load/save recovery. Each identity gets separate request/state lifecycles. The bounded candidate pool is explained; this is not a recommendation over every book ever read or a validated learning-impact model. [Explore design and walkthrough](EXPLORE_LEARNING_DESIGN_2026-11-07.md).

### Together: classroom learning

- Flexible five-week reading-circle pathway and book-talk, discovery-gallery and written-review activities.
- Private presentation/review notebooks with structured prompts, plain-text download, explicit save feedback, draft-preserving template changes and failed saves, conflict recovery and confirmed deletion.
- Explicit learner submission, teacher feedback, reviewed publication and author withdrawal. Submitted/published work must be withdrawn before editing.
- Public discoveries omit account identities. Signed-in readers can give reversible encouragement and submit supportive comments; only approved comments appear publicly.
- Staff can review work by student, refresh queues, preserve notes during other reviews and resolve stale-version conflicts. Learners can remove their own comments even after a discovery becomes private.
- Publication changes invalidate old encouragement and comment approval, so re-publication does not silently restore old approvals. Server-side caps and request budgets bound writes/storage.

No email notifications, file uploads, automatic grading, reward system or AI service is introduced. The five-week plan is guidance, not a persisted timetable or automatic progress tracker. [Together use cases, state model and walkthrough](TOGETHER_CLASSROOM_DESIGN_2026-11-07.md).

### Staff, library and accounts

- Staff catalogue search/pagination reaches titles beyond the old first 24 records. Unknown inventory cannot be overwritten with a guessed copy count.
- Catalogue updates retain partial-cover-save recovery and protect forms from overlapping mutations.
- Safe removal confirms the title, compares the reviewed metadata/copy count under locks, and refuses to erase reading/loan history. Concurrent changes require refresh and a fresh confirmation.
- Student profiles show reading counts, topics, recorded start/finish dates and elapsed whole days where dates are known. Historical dates remain unknown. Private written reflections and selected interests are excluded from staff reading projections.
- Teacher links lead to student-filtered submitted work. Librarians perform teaching/library duties; administrators retain separate staff-access and policy responsibilities.
- Loan resolution and staff-permission changes have explicit accessible review dialogs. Borrower failures recover; out-of-range pages have a way back; stale desk data cannot authorize a new mutation.
- Authentication mode changes are locked during requests. Browsing away while sign-in is pending does not allow a late response to hijack navigation. Reading drafts survive failures and reopening a book preserves its reflection.

[Staff teaching contracts and verification](STAFF_TEACHING_2026-11-07.md).

### Cost and request controls

- Public catalogue reads use a bounded 15-second cache and shared in-flight requests. Private learner data is excluded. Writes invalidate catalogue snapshots; inventory editing requests fresh data.
- Catalogue typing uses a 300ms debounce. Explicit retry, navigation and pagination remain immediate.
- URL-backed inputs update synchronously so fast typing cannot be overwritten by an older navigation state. Lazy routes retain their existing loading fallback.
- Focus/visibility refreshes are coalesced for five seconds. Explicit refresh and real mutation events remain immediate, including circulation batches.
- Reading histories use stable cursor pages and 100-ID book batches; reading editors reuse loaded records.
- Database SDK automatic retries are disabled. Fetches have a 15-second deadline and preserve caller cancellation. Bilingual quota/timeout feedback preserves entered work.
- A database pre-request hook enforces 120 committed write-capable requests/account per fixed 60-second window with atomic concurrency protection and HTTP 429/Retry-After.

The quota does **not** cover anonymous reads, Auth, Storage, read-only RPCs or rolled-back requests, and it is not a DDoS guarantee. Those boundaries are tested and documented rather than hidden. [Free-first architecture and future Groq/DeepSeek boundary](FREE_FIRST_ARCHITECTURE_2026-11-07.md).

## Verification

| Check | Local result |
| --- | --- |
| Node regression tests | 108 passed |
| ESLint and TypeScript/production build | Passed; eight public pages prerendered |
| Browser integration | 172 of 174 passed on the first integrated run. One axe scan exceeded the test's overall timeout under concurrent local workloads; one request-count assertion ran before navigation settled. After correcting those test timing assumptions, all 50 accessibility/request-efficiency checks passed, including both failed cases. No assertion or accessibility rule was removed. |
| Disposable PostgreSQL replay | All 23 migrations, 10 SQL suites and 18 concurrency probes passed |
| Real PostgREST 14.18 HTTP regression | 51 checks passed, including signed synthetic identities, quotas and read-only POST RPCs |
| Synthetic backup/restore drill | Passed |
| Built release HTTP checks | 39 passed; five hosted/operator acceptance checks remain explicitly unverified |
| Production dependency audit | No reported vulnerabilities |

GitHub Actions independently repeats the Node, lint, build, browser, database, HTTP and backup checks on branch push. Review the [branch's Actions runs](https://github.com/gsharsh/HealEduTech/actions?query=branch%3Aget-stuff-done-harshith) alongside this local evidence; the delivery message records the final remote result. These local tests ran on Node 26.4 and PostgreSQL 18.4; CI uses Node 24 and PostgreSQL 17.

Local browser logs: `/private/tmp/healedu-final-browser.log` (initial 174-case run) and `/private/tmp/healedu-timing-rerun.log` (50-case rerun). The five unverified release checks cover hosted migration parity, received confirmation/recovery email, real-account isolation/persistence, provider-backed backup recovery, and approved inventory/policy/operating ownership. A passed synthetic backup drill does not replace those operator checks.

The first remote run additionally exposed a fast-typing character-loss race: React Router deferred URL state while the search input was controlled by that URL. Router updates now use its supported synchronous mode; the API-call debounce remains separate. A staff-count test also included a late request from the departing sign-in document. It now waits for that document's initial alert response before counting the new dashboard requests, retaining the exact-one assertions. All 40 repeated request regressions passed after these fixes (five repetitions across desktop and phone), alongside fresh lint, 108 Node tests and build. See `/private/tmp/healedu-ci-race-fix.log` and the branch Actions history for the complete rerun.

Local evidence directories are ignored to avoid committing temporary test environments and bulky traces. Database evidence: `database-test-results/removal-snapshot-final-sql/results.json` and `database-test-results/removal-snapshot-final-http/results.json`. Both runners create and remove their own disposable services; they do not use hosted credentials. PostgreSQL uses an Auth shim; the separate HTTP suite uses synthetic signed JWTs with PostgREST 14.18.

Independent review found and prompted fixes for read-only POST RPC quota handling, stale catalogue deletion, teacher queue refresh and typed search request bursts. The source recheck found those issues resolved. Automated accessibility tests supplement keyboard/reflow/visual checks; they do not establish complete assistive-technology conformance.

## Morning walkthrough

1. Visit Home, Library, Explore and Together in English and Vietnamese, then inspect a narrow viewport.
2. In Explore, change topics, inspect suggestion reasons, open an activity and check external-resource language labels.
3. In Together, review the five-week pathway and activity templates. Read the service-availability notice on the unchanged hosted backend.
4. With a staff account, open the redesigned dashboard, change its period, follow a student and inspect reading/topic information. Existing dates may be unknown until new status transitions are captured after migration.
5. Review the synthetic Together and staff browser evidence for new draft/review/publication/comment/removal workflows before backend deployment.
6. Review the three migrations and release gates below, then decide which features to accept for the pilot.

## Deployment gates still open

| Migration | Enables | Required deployment check |
| --- | --- | --- |
| `20261106175337_enforce_authenticated_request_budget.sql` | Authenticated write budget | Inspect existing PostgREST hooks, apply without overwriting provider configuration, then verify real 429/Retry-After and read-only POST success |
| `20261106180831_classroom_learning_projects.sql` | Notebooks, approved showcases, moderation, feedback | Verify two learner accounts, staff role boundaries, anonymous projection, approval/withdrawal and recovery on the intended backend |
| `20261106181400_staff_reading_timeline_and_catalogue_removal.sql` | Recorded reading dates, staff topic summaries, guarded removal | Verify new transitions, legacy unknowns, history denial and stale-snapshot denial with synthetic records |

The existing full logical-backup flow includes new private schemas. Database-specific `pgrst.db_pre_request` configuration is not guaranteed by a raw database archive plus global roles export: inspect and restore that hook separately and verify it over HTTP after recovery.

Real email delivery, devices/connectivity, Vietnamese review by programme participants, content suitability, physical inventory, lending policy, safeguarding/retention arrangements and named operational owners still require programme acceptance. Free-tier limits are capacity constraints, not a client uptime SLA. No paid service was provisioned and no Groq/DeepSeek integration was enabled.
