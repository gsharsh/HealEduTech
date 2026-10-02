# HealEduTech improvement and production-readiness review

**Date:** 2 October 2026, Singapore time.
**Working checkout:** `HealEduTech-library-ux`, `codex/apple-design-preview`, based on `04e6c87`.
**Release status:** local work; not committed, pushed or deployed by this task. The canonical `HealEduTech` checkout and hosted data/settings are unchanged.

**Later refinement on the same date:** the [typography, glass and system verification report](VERIFICATION_2026-10-02.md) supersedes the earlier check counts below. It records the shared Home/Explore motion, new font assets, 35 unit tests, expanded browser checks and corrected database concurrency behavior. Updated requirements are in [PLAN](../PLAN.md); the [current UML and backend audit](SYSTEM_UML_2026-10-02.md) separates implemented data from future learning features.

## Outcome and evidence boundary

The website has a strong public-library foundation. The largest remaining product gap is helping a learner move from reading and trying an activity to explaining a discovery and receiving real support across visits. A polished homepage improves the entry point; it does not finish that learning workflow or prove production readiness.

This review combines [the available project history](PROJECT_HISTORY_AUDIT_2026-10-02.md), [official education-service research](EDTECH_RESEARCH_2026-10-02.md), [design/motion references](DESIGN_RESEARCH_2026-10-02.md), current source and the earlier September simulation evidence. Agent personas and synthetic browser checks are engineering evidence, not observations of Vietnamese learners. Upcoming survey findings and January device/content review must be recorded separately.

## Work in this increment

| Area | Intended user outcome | Production boundary |
|---|---|---|
| Navigation | Home, Library, My reading, Explore and Together appear in the desktop header and a hamburger menu at widths up to 760px, in EN/VI. | Reuses existing routes and account boundaries. |
| Homepage | Nature, Stories and How things work form a continuous layered card stack on suitable desktop viewports, with original topic illustrations. | Mobile, short viewports, enlarged text and reduced-motion users receive a straightforward layout; browsing never depends on animation. |
| Reading reviews | Optional prompts make a finished-book reflection easier to start; moving a book back to reading preserves its existing note. | Uses the existing learner-owned reading record; no new schema or staff access. Review editing remains after finishing, as previously requested. |
| Presentations | A learner can prepare a short outline, rehearse and print it for an in-person demonstration. | Temporary page-memory preview. Nothing is submitted to a facilitator or published; leaving/reloading clears the work. Printing is an explicit learner action. |
| Quality polish | Meaningful page titles, recovery from unknown routes and automated source checks make the site easier to operate. | No production deployment or private data is changed by these checks. |
| Documentation | Separate historical implementation evidence, current local work and unfinished release acceptance. | No approval, pilot, handover or learner rollout is inferred from a document update. |

The substantial [29 September fixes](STUDENT_FIXES_2026-09-29.md) are preserved: auth return context, password visibility reset, input/error associations, resilient storage, smaller responsive covers, guided activities, staff-training boundaries and the handover draft. Review and release these with the new changes as one coherent candidate rather than accidentally dropping them.

## Highest-value next features

| Priority | Feature | Why it matters | Completion evidence |
|---|---|---|---|
| 1 | Finish the core saved-reading journey | A learner must be able to return to their own work reliably. | Actual received confirmation/recovery emails, two controlled accounts, refresh/relogin, denial of cross-account access, shared-device sign-out. |
| 2 | Private resumable goals and presentation drafts | Temporary work interrupts the learning loop. | Account-owned records, save/failure/retry, resumed draft, accessible EN/VI states, deletion/export decisions and isolation checks. |
| 3 | Assigned-facilitator feedback | Real support is the project's differentiator. | Explicit learner/facilitator assignments; author and assigned reviewer only; reviewed three-part feedback; role removal takes effect; peers excluded. |
| 4 | Staff-managed approved resources | Useful recommendations require useful content. | Reviewed topic/language/access metadata, educator picks, publish/withdraw, unsafe/withdrawn content absent from discovery. |
| 5 | Preferences-first recommendations | Explicit choices can guide a small catalogue without training data. | Optional editable preferences, reviewed diverse fallback, accurate explanation, suitability filters, synthetic evaluation and later teacher/student feedback. |
| 6 | Recognition and closed showcases | They can celebrate real learning once staff can operate them. | Approved fair criteria, verifiable awards/corrections, moderation owner, publication consent, withdrawal/reporting; no public leaderboard. |

Avoid building a full LMS, video-hosting service, live peer messaging or AI tutor merely because larger education services offer them. The existing read → explore → create → receive feedback journey is the relevant comparison.

## Recommendation work: prepare now, collect later

The week of **5 October 2026** begins engineering planning, not student launch. Real learner use and new preference/recommendation data collection wait until **January 2027 in Vietnam**, after EVG decisions and relevant release gates. Earlier estimated November/December pilot dates are superseded. No automation or survey distribution was created by this task.

1. **Agree the preferences experience.** Make it optional, short, editable and skippable. Reuse `learner_interests` and the existing topic identifiers. Separate interface language, preferred content language and practical reading support. “Not sure” and no interests are valid. Do not ask for unnecessary identity or sensitive personal information.
2. **Prepare content metadata.** Approved/published status, topic tags, actual content language, staff-reviewed difficulty/support, access format, materials, duration and related topics. Translated titles do not make a book Vietnamese. Fill real inventory/suitability fields with EVG later.
3. **Build a synthetic rules baseline next week.** Filter for approval, suitability and practical usability before ranking. Use explicit choices and editorial picks; offer some exploration beyond selected topics. Show a truthful reason such as “You chose Nature.” Empty data gets diverse staff-reviewed picks, never invented personalisation.
4. **Specify future records without enabling collection.** Versioned preferences, resource metadata and a small optional feedback contract. Only if EVG approves later: actual displayed item IDs/strategy version and explicit useful/not useful/try next feedback. Do not infer interest from dwell time, repeated refreshes or badges.
5. **Test failure cases before January.** No interests, cleared/changed preferences, bilingual content, empty topic, unavailable/withdrawn resource, duplicated items, unknown difficulty and shared-device sign-out. Compare against educator picks and record individual failures; a tiny synthetic dataset cannot prove learning gains.
6. **Revisit after the survey and January observation.** Confirm devices, email access, language, activities and support needs. Pilot with educators and students, report counts and staff workload, then decide whether more complex ranking is justified.

See the detailed [education research and cold-start plan](EDTECH_RESEARCH_2026-10-02.md), and PLAN's existing [recommendation design](../PLAN.md#6-topic-discovery-with-little-initial-data).

## Production acceptance still required

These are actual unresolved project gates, not claims that the current implementation is broken.

| Gate | Required proof / decision | Current position |
|---|---|---|
| Accepted release | Review the combined diff, intended branch/backend, exact commit and deployment. Exercise affected routes on that deployment. | Current October and September work is local. |
| Registration and recovery | Supported production sender, received email, correct hosted link, expiry/resend/recovery success. | Historical project notes retained the default mailer; current hosted settings have not been inspected in this task. |
| Private saved data | Two synthetic controlled accounts on the actual hosted backend: own reading/interests resume; other user cannot read/update them. | Source and synthetic verification do not finish this gate. |
| Student access | EVG confirms email availability, account/recovery support, consent/retention/export/deletion and shared-device practice. | Requires programme decisions and primary evidence. |
| Content and inventory | Real shelves, physical copies, Vietnamese/bilingual resources, difficulty/support and suitable activities. | Intentionally awaits EVG library access and local review. |
| Lending | Eligibility, limits, due dates, centre timezone, loss/damage procedure, stock/paper reconciliation, operator rehearsal. | Retain the disabled policy gate until accepted. |
| Learning expansion | Private goal/project persistence, assigned feedback and authentic review outcomes. | Presentation interface improvements remain previews. |
| Devices and accessibility | Actual EVG devices/network, Vietnamese-speaking review, native zoom, keyboard and screen reader, reduced motion. | Desktop-browser emulation is limited evidence. |
| Operations | Named primary/backups, billing limit, access register, Vietnamese operating guide, independent deploy/restore drill. | The [handover plan](EVG_HANDOVER.md) is a draft. Retain creator's agreed named administrator/recovery access. |
| Historical hardening | Reconcile September documented RPC/grant drift and Auth/header follow-ups against current hosted configuration. | Historical findings must be rechecked before treating them as current defects; no live security settings changed here. |

Supabase's current official guidance identifies its default SMTP service as unsuitable for production and limited to pre-authorised project-team addresses. The project needs a verified supported email-delivery arrangement before general student onboarding. This is a vendor requirement; it does not establish the current live project's configuration. [Supabase custom SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).

## Verification record

The integrated local implementation passed:

- `npm run lint` — exit 0.
- `npm run build` — TypeScript and Vite production build, exit 0; no large-chunk warning in this run.
- `node --test tests/*.test.ts` — **33 passed**, no failures or skips.
- `git diff --check` — exit 0.
- **27 improvement browser scenarios:** five labelled routes in EN/VI at 320, 390, 768, 900, 1024 and 1440 CSS pixels; active navigation; presentation validation, optional fields, saved preview, edit/cancel focus and print action; long text at 320px; all three desktop scroll states; short viewport; keyboard navigation/search; bilingual titles and nested invalid-route recovery; reduced motion; 200% root-font reflow at 1280/1440/1920; reflection preservation through reopening, failed save, retry, reload and language switching.
- **29 regression browser scenarios:** existing auth context, validation, password visibility, storage failures, shared-device reminder, temporary work reset, bilingual activities and staff boundaries. Both browser suites recorded **zero uncaught page errors**.
- EN/VI printed outlines rendered to single A4 pages and inspected as PNGs: readable margins, white paper, no unrelated showcases/navigation/example feedback, no clipping in the exercised outline.
- Independent code review covered state/access boundaries, HTML semantics, printing, motion, route metadata and CI. The GitHub Actions workflow is authored and reviewed but has **not run on GitHub**.

The browser suites used isolated local Vite servers: port **4185** with a fake `student-audit.supabase.co` URL/public fixture key and intercepted responses; port **4186** with Supabase configuration cleared. They did not create accounts, send email or change production records. Synthetic mock state retained across a page reload proves frontend behavior only, not hosted persistence. Desktop Chrome viewport/text emulation does not establish native zoom, Safari or screen-reader conformance.

The review preview at port **4187** uses the checkout's existing configuration; in this run it is **disconnected demo mode**, as its visible banner states. Its catalogue examples and screenshots must not be described as the live inventory. No successful production account journey or January student outcome may be inferred from these local pass counts.

Evidence folder: [October local QA](../../outputs/improvements-2026-10-02/). Existing September evidence remains in [the earlier integration folder](../../outputs/student-fixes-2026-09-29/integration/).

## Framer-inspired refinement follow-up

The user's motion feedback prompted a second design pass, informed by [Framer University and Marketplace research](FRAMER_DESIGN_STUDY_2026-10-02.md). The earlier browser-suite counts above describe the first increment, not a rerun against every visual refinement below.

The follow-up replaces abrupt topic changes with continuously overlapping cards. Sticky wrappers and transformed inner cards are separate, so transforms cannot feed back into scroll measurements. Header height and card fit determine whether the enhancement is enabled. Keyboard focus brings the relevant card forward. Original SVG artwork, a moving desktop navigation indicator, animated activity disclosures, book surfaces, forms and reading/presentation typography share the same palette and spacing. Shared base CSS now loads before feature CSS, fixing feature styles that were being overwritten. No animation package, remote media or purchased component was added.

Local follow-up evidence in the in-app Chromium browser:

- Sixty layout combinations: Home, Library, My reading, Explore, Together and Quick guide in EN/VI at 320, 390, 768, approximately 1024 and 1440 CSS pixels. Document scroll width did not exceed client width. Sign-in's disconnected state was also inspected separately.
- Desktop stack inspected at partial overlaps; card scale changed continuously with scrolling. A covered topic link was brought forward by keyboard focus and was visibly unobscured.
- A temporary 200% root-font override exercised five main pages at 320, 390, 768 and 1280 widths. It exposed a narrow navigation/reading layout issue, which was repaired and checked again at 320/390. The temporary override was removed. This is text-size stress testing, not an OS/browser native-zoom conformance claim.
- Activity open/close was exercised: closed content has zero height and is inert; opening exposes the instructions and related-book link. Fictional presentation title/outline/checklist were saved locally, editing restored the values and Cancel restored the saved title.
- Catalogue search/empty-result recovery and opening/closing a book dialog were exercised; Escape returned focus to the catalogue card.
- After the user's hamburger-menu request, all five routes were verified in the disclosure in EN/VI at 320, 390 and 760px. Escape restored toggle focus; opening moved focus into the links; keyboard Tab, route selection, browser Back, outside click and resizing to 768px were exercised. Desktop retained its full navigation. Closed mobile links were absent from the accessibility tree.
- Additional mobile focus checks: selecting the already-current route closes the panel and focuses the main content; shrinking desktop navigation moves focus to the visible menu button. Keyboard search navigation followed by browser Back was repaired and retested so the menu does not reopen from stale state. The Vietnamese 320px header fits on one row at the default text size.
- Phone Home, My reading, Library, Explore and Together views and desktop topic transitions were visually inspected. Authenticated staff screens received shared styling but were not exercised with a real staff account.
- Current source has reduced-motion CSS and JavaScript guards. System-level reduced-motion, Safari, actual EVG devices, hosted account/persistence and the revised print layout remain outside this follow-up's browser verification.

This follow-up remains a local demo on port 4187. Presentation/goal previews remain temporary; no recommendation data collection or production deployment was enabled.

Final source checks after the hamburger follow-up: lint, TypeScript/Vite production build and `git diff --check` passed. All 33 Node tests passed during this refinement. Browser findings above are manual tool-driven local checks; they do not establish production readiness.
