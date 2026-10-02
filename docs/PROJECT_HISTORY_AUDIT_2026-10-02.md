# HealEduTech project history audit — 2 October 2026

## Assessment and evidence boundary

The public library is a useful foundation. The largest remaining gaps are a complete learning journey across visits, authentic facilitator support, and evidence that the deployed account and private-data workflows work with controlled accounts. Further visual polish should support finding, reading, exploring and presenting rather than obscure those tasks.

This audit was read-only before this document was written. It made no production changes. The findings describe the pre-implementation baseline captured on 2 October, based on commit `04e6c87` plus the existing, uncommitted 29 September work in `HealEduTech-library-ux`. Other agents are implementing improvements concurrently. Their work is not verified by this audit; use the separate implementation and QA records for the final result. Code line references below refer to the captured audit baseline and may move during those edits.

The working checkout is `/Users/gsharsh/Downloads/chat/ChatGPT/Vietnam Website/HealEduTech-library-ux`, branch `codex/apple-design-preview`. The canonical checkout is `/Users/gsharsh/Downloads/chat/ChatGPT/Vietnam Website/HealEduTech`, branch `main`. Both began the audit at `04e6c87`. The canonical checkout was clean; the working checkout had substantial uncommitted changes that must be preserved.

## History coverage

Reviewed material:

- The complete reachable Git log: **30 commits**, from the 5 September initial commit through `04e6c87` on 27 September. Both checkouts share that history. Selected relevant changes and current source were inspected; this is not a claim that every line of every historical diff was reviewed.
- **77 available turns across all 10 related Codex chats**, including their older-page cursors. The archived-chat listing returned no additional chats.
- Current `PLAN.md`, `README.md`, feature descriptions, pilot/release guidance, frontend verification, Phase 1C validation, design records, live QA, handover and September student-fix documentation.
- The 29 September simulated-student review and its consolidated evidence summaries in the workspace `outputs/` directory.
- Relevant account, navigation, reading, project/feedback and exploration code, plus migration and test inventory.

| Related chat | Chat ID | Main historical contribution |
|---|---|---|
| Plan EVG Vietnam edutech platform | `01a071a4-b2e0-70b3-8995-e6913b983b5c` | Original scope, maintainability, cold-start recommendations, account and hosting setup |
| Generate project scaffolding | `01a071fb-ef8d-7541-88b8-bb97489a884c` | React scaffold and explicit English-default decision |
| Fix auth flow and continue features | `01a0a35b-780a-7c01-9256-41e4f85e231d` | Recovery, private reading/interests and gated circulation |
| Create EVG student survey | `01a0ae1a-d43d-73b3-a7d0-9d9afbe82f88` | Simple-English survey and separate implementation questions |
| Improve admin access and book data | `01a0ae33-583e-7c32-812c-fb433350de2b` | Correct Supabase project, first administrator, sample catalogue and repository consolidation |
| Improve library UI and UX flow | `01a0c8d5-9913-7a43-b13e-d3185d23a503` | Natural catalogue flow, review-after-finishing instruction, covers and workspace boundaries |
| Create project timeline | `01a0cd0f-926a-7a51-a1e2-43fadcf18168` | Earlier estimated November pilot and December handover |
| Continue PLAN.md tasks | `01a0cf2b-9add-7ed3-9031-ef362d9cbdd0` | Learning prototypes, QA, approved cream/green design, repeated release verification |
| Fix book copy count editing | `01a0e2c9-c969-73a3-b375-63d8dd40d021` | Safe physical-copy correction and live save verification |
| Evaluate and stress-test the website | `01a0ec5b-e0e9-7531-b266-2391a2859179` | Student simulations, handover draft and local September fixes |

Coverage limits: the original EVG PDF's full contents were not available in the workspace; its scope decisions were recovered from the requirements and project chat. External team discussions, private operational registers, current vendor dashboards and new primary student research were not inspected. No new browser or SQL tests were run by this history audit. Historical verification is dated evidence, not proof that the present deployment passes every requirement.

## Delivery history and controlling decisions

| Period | Delivery and decision | Current implication |
|---|---|---|
| 5–10 September | Bilingual scaffold and structured requirements; English becomes the default while saved Vietnamese preference remains respected | Preserve simple bilingual tasks and the approved language behavior |
| 11–16 September | Supabase accounts/catalogue, email-link auth, private reading/interests and policy-gated circulation | Account and data foundations exist; hosted email and learner journeys still need direct verification |
| 17–23 September | Correct database selected, named first administrator, staff access, six sample books and fourteen copies, improved catalogue/details and covers | Keep role boundaries and physical-copy history; sample stock does not establish actual EVG holdings |
| 24–26 September | Learning/social previews, smaller eager bundle, navigation/search fixes, migration checks, local SQL concurrency/privacy tests and recovery safeguards | Separate prototype checks from hosted account and operational acceptance |
| 27 September | Approved cream/green and glass design, search-first home, matching reading panels, safe copy-count editing, page preservation during background access checks | Preserve the visual identity and unsaved-draft behavior already approved |
| 29 September | Student simulations identified usability/reliability gaps; fixes and EVG handover draft implemented locally | Preserve and integrate these changes; their local verification does not mean they are deployed |
| 2 October | Broader research/design improvement request; Explore/Together restored to intended top-level role; recommendation preparation requested for next week | Apply the new schedule and complete concrete frontend improvements with clear boundaries |

Controlling scope decisions:

- Follow the EVG brief's “What we currently suggest” section. Formal curriculum authoring and a full LMS were explicitly excluded (`PLAN.md:44–57`).
- Preserve the learning journey: read → record → explore → create → receive feedback → recognise → share (`PLAN.md:48`).
- The user requested **private book review after finishing**, rather than on catalogue browsing cards, in the 22 September library UX chat. Preserve that choice while improving review prompts.
- Reading, physical copies and loans are different records. Returning a book must not finish reading or award recognition (`PLAN.md:163–168`).
- Existing lending rules are not approved. Keep circulation disabled until EVG decisions and an operator rehearsal pass (`docs/SUPABASE_PILOT.md:132`).
- Catalogue suitability and physical-stock reconciliation are deferred until library access is available, as explicitly instructed on 29 September (`docs/STUDENT_FIXES_2026-09-29.md:9`).
- The creator retains a named application administrator and agreed technical recovery access at handover (`docs/EVG_HANDOVER.md:72–76,82–93,237–266`). Retained access does not replace EVG ownership and backups.
- Recommendations may be planned next week, but real student rollout and preference-data collection are intended for Vietnam in January 2027. Survey findings will refine decisions later.

## Prioritized findings

Priorities are relative to a professional release and pilot preparation. A verification gap does not by itself mean the implementation is broken.

| Priority | Finding and implication | Concrete next action | Audit-baseline evidence |
|---|---|---|---|
| P0 | The existing saved learner journey has not passed hosted success/isolation checks with real controlled accounts | Use two synthetic learner accounts and appropriate staff accounts: actual confirmation/recovery receipt, login, saved reading/interests after refresh and relogin, sign-out, shared-device checks and denied cross-account requests | `docs/LIVE_QA_2026-09-24.md:29–40,61–66`; `docs/SUPABASE_PILOT.md:108–142`; `docs/STUDENT_FIXES_2026-09-29.md:65` |
| P0 | A saved review can be erased when a finished book is changed back to currently reading | Preserve the reflection when changing status; verify the transition and subsequent save. Retain the review editor's after-finish placement | `src/features/learning/LiveLearningPage.tsx:49–63`; `src/features/learning/reading.ts:35–40,75–84`; reading/interests migration `:6` |
| P0 | Production student email cannot be assumed from the free pilot mailer | Plan supported production delivery, a verified sender, ownership and actual received-link testing. Verify current vendor restrictions before changing providers/settings | `docs/SUPABASE_PILOT.md:23–33,138`; original planning chat's localhost redirect incident |
| P0 | Policy, ownership and recovery gates remain incomplete | Assign EVG primary/backup owners, agree learner-data handling, account support, budget and lending rules; rehearse recovery before real data | `PLAN.md:151–155`; `docs/EVG_HANDOVER.md:78–95,97–112,210–267` |
| P1 | The working checkout contains valuable September fixes that have not been released | Preserve them, integrate the new work, run appropriate verification and record the exact released commit/deployment | `docs/STUDENT_FIXES_2026-09-29.md:3–24,28–37,62–67` |
| P1 | Explore and Together were only in the footer, despite the intended primary student navigation | Keep them visible in the main navigation in both languages and usable at small widths; update obsolete documentation | `PLAN.md:548–557`; `README.md:80`; September critical review `:75–81` |
| P1 | The presentation form does not guide a learner from an activity to a meaningful in-person discovery | Add short bilingual outline prompts, a book/topic connection when useful, clear draft/rehearsal actions and optional printable preparation. Keep temporary state explicitly disclosed | `src/features/community/ProjectFeedbackPrototype.tsx:6–11,19–26,69–145`; `PLAN.md:431–463` |
| P1 | The same canned feedback appears whenever the preview becomes ready for feedback | Make the example boundary obvious. Plan real author/assigned-facilitator access and genuine three-part feedback as a separate increment | `ProjectFeedbackPrototype.tsx:136–145`; `PLAN.md:124,449–463` |
| P1 | Managed approved learning resources are missing, limiting useful discovery | Implement or prepare staff-reviewed resource metadata, consistent topic IDs, source/review date, language/access needs and publish/withdraw controls | `PLAN.md:128,540–544`; `src/features/explore/LiveExplorePage.tsx:7–16`; `README.md:100` |
| P1 | Actual learner/staff usability and Vietnamese acceptance are still pending | Use survey evidence to choose devices/account support, then run formative tasks with EVG learners and staff. Record assistance, confusion and failure recovery | `docs/PHASE_1C_VALIDATION.md:18–31,47–82`; September critical review `:18–37` |
| P1 | Documented database/Auth/hosting hardening has unfinished items | Reconcile RPC/grant drift in a dedicated migration; assess compromised-password protection; inventory resources for CSP. Verify deliberate aggregate-view/bootstrap boundaries before changing them | `docs/LIVE_QA_2026-09-24.md:34–39,53–59` |
| P2 | All sampled routes share the same browser title | Add translated route and book-specific titles and verify tab/history identification | September critical review `:101`; source has no route-title update at the audit baseline |
| P2 | Unknown general URLs silently redirect home | Provide a helpful bilingual not-found destination with useful recovery links | `src/app/App.tsx:62–63`; September critical review `:110` |
| P2 | Release checks are largely manual; no checked-in `.github` workflow was found | Add a small repeatable CI gate for lint, build and meaningful tests | Reviewed repository/test inventory |

The reflection issue is a confirmed source-level data-loss path: `LiveLearningPage.tsx:56` computes an empty reflection for currently-reading status, and `reading.ts:83` sends it through normalization to `null`. The database does not require a reflection to be cleared when reading status changes.

The September hardening record states that staff checks and RLS still block unauthorized operations. It is not evidence of an exploitable live breach. Four basic hosting header protections were added later in that same record; do not treat them as absent merely because an older entry says they were missing.

## Requirements still deferred or only demonstrated

| System / requirement | Audit status | What completion requires |
|---|---|---|
| S01 / FR01–02 | Accounts, recovery and staff boundaries implemented; real hosted success evidence incomplete; account invitations/support model remains partial | Actual received-email flows, permissions/isolation, shared-device behavior, and an agreed learner recovery process |
| S03 / FR06–09 | Protected circulation exists and remains disabled | EVG-approved eligibility, due dates/limits/timezone, loss/damage handling, paper reconciliation and operator rehearsal |
| S04 / FR10–11 | Learner-owned reading/interests implemented | Hosted persistence/cross-account verification; correct reflection behavior; assigned-facilitator support remains separate |
| S05 / FR12 | Editable weekly-goal preview | Persistent resumable goals, actual facilitator support and useful progress evidence |
| S06 / FR13 | Temporary title/summary/status project and example feedback | Private persistent author/reviewer records, assigned facilitator access, real review/status workflows and clear submission boundaries |
| S07 / FR14 | Draft recognition criteria/exercises | EVG-approved fair criteria, qualifying evidence, duplicate prevention, authorized corrections and operational owner |
| S08 / FR15 | Fictional showcase/moderation exercises | Cohort access, actual submissions, approval/rejection, revision, withdrawal and immediate hiding |
| S09 / FR16 | Fictional moderation exercises | Named moderator/backup, reporting, approval/hiding, disable control and safe direct API behavior |
| S10 / FR17 | Three sample activities and hardcoded topics | Staff-managed approved resources and topics, reviewed metadata and publish/withdraw behavior |
| S11 / FR19 | Recommendation design and placeholders | Useful approved catalogue, optional preferences, explainable cold-start rules/fallbacks, evaluation and educator review |
| S11 / FR20 | AI deferred | A measured rules-based limitation, demonstrated benefit, separate budget and reviewed fallback |
| S12 / FR21–22 | Some staff UI and handover template exist | Routine exports/account support as accepted scope, completed ownership/runbooks and witnessed deploy/restore exercises |

Sources: requirement table `PLAN.md:110–134`, roadmap `:335–344`, current boundaries `README.md:84–104`, and learner/staff roles `PLAN.md:63–85`.

The two existing staff roles—librarian and administrator—do not establish the assigned-facilitator/cohort model required for learning feedback. Do not grant every staff member access to all private learner records to bypass that missing design. Existing private reading/interests policies intentionally do not provide staff-wide access (`docs/SUPABASE_PILOT.md:136`).

Recognition, peer showcases and moderated questions remain part of the intended roadmap. They should not be deleted as decorative scope, nor marked complete because a fictional simulator exists. Activation requires their own operating owner and acceptance evidence.

## Content and design implications

The approved cream/green visual identity, real-cover treatment, public browsing before login, simple language switch, visible focus and restrained copy are worth preserving. Historical dissatisfaction repeatedly concerned clutter, inconsistent panels, redundant cover overlays, confusing reading actions and release/local mismatches. Improve those task relationships rather than introduce another wholesale visual reset.

A home-page scroll sequence is compatible with the request when each topic still has a direct usable destination, readable text and a static reduced-motion/mobile fallback. The plan already targets compressed resources, no autoplay and usable slow-network behavior (`PLAN.md:147–148,652–660`). Motion QA and performance measurements belong to the new implementation record; this history audit has not verified them.

Content preparation can proceed without inventing actual stock. The six seeded books are English-language material even when metadata is displayed in Vietnamese. Reading level, shelf location, length and actual stock need later educator/library review. Prepare the fields and reconciliation process now, then populate them when access and primary evidence are available. Sources: September critical review `:41–51`; `docs/STUDENT_FIXES_2026-09-29.md:9,66`.

## Revised schedule and data boundaries

These dates replace the earlier estimated November 2026 student pilot and December handover. They describe preparation windows, not completed approvals or guaranteed release dates.

| Window | Authorized preparation | Boundary / exit evidence |
|---|---|---|
| 2–4 October 2026 | Integrate reviewed navigation/design/learning improvements and preserve September fixes; update audit and roadmap | Record local QA and exact release state; frontend polish alone is not production acceptance |
| Week of 5 October 2026 | Begin recommendation planning and data-foundation design | Design an optional, editable preferences page; resource metadata; explainable rules and diverse educator fallback. Use synthetic examples |
| October–December 2026 | Review upcoming survey evidence; prepare resources, account support, SMTP, permissions, device/accessibility checks, operations and handover | Decisions remain conditional on EVG evidence. Do not collect real learner preference data just because a prototype is ready |
| January 2027, in Vietnam | Conduct actual device/network and learner/staff validation, reconcile the physical library, and begin an approved student rollout | Real student preference/data collection starts only after the relevant consent/retention, account, content and release gates pass |
| After initial January evidence | Refine preferences and rules; evaluate suggestions against educator picks and observed learner outcomes | Recommendations should demonstrate usefulness and safe fallbacks before expanding; AI remains a separately justified increment |

Do not assume collaborative filtering is useful with almost no interactions. Reuse the existing learner-interest foundation while planning content-based matching from stated preferences. Metadata and approved actionable resources are the immediate dependency. Plan language/access needs, optionality, “not interested” feedback, explanations and measurement without fabricated personalization claims. The recommendation appendix already addresses cold start; the new technical plan should reconcile it with this schedule.

Survey results will help rectify assumptions about email access, shared devices, language, reading routines, practical activity support and interests. A survey is not a replacement for observing people complete the actual website tasks.

## Documentation inconsistencies to reconcile

| Audit-baseline inconsistency | Correct interpretation |
|---|---|
| `README.md:18` says reading/circulation migrations are not yet applied | `docs/SUPABASE_PILOT.md:124–130` lists them as applied; retain the real-account verification gaps separately |
| `PLAN.md:35–37` retains historical hosted-migration gates | The implementation update acknowledges hosted migrations, but migration presence is not learner-flow acceptance |
| `PLAN.md:575–588` says no backend work is in the frontend increment and lists Cloudflare Pages | Historical architecture guidance; current production uses Vercel and a hosted Supabase backend |
| `README.md:80` lists only three primary student links | The new user instruction and original learning architecture require Explore and Together in the navigation |
| Some preview/dialog and operation routes in `README.md:82–96` describe older behavior | Align setup/runbooks with current detail pages and student/staff routes at the accepted release |
| Earlier timeline predicts November pilot/December handover | Latest instruction sets real student rollout/data collection in Vietnam in January 2027 |

Use an explicit status matrix—implemented, locally verified, hosted guest verified, hosted account verified, EVG accepted—to prevent repeated confusion between a local fix and the live website. The September “it still refreshed” incident occurred because the user was viewing production while the fix remained local; the later exact deployed-bundle check was the appropriate closure.

## Source and evidence index

- [Requirements and delivery plan](../PLAN.md)
- [Current system overview](../README.md)
- [Supabase pilot and release gates](SUPABASE_PILOT.md)
- [Live QA and outstanding operational checks](LIVE_QA_2026-09-24.md)
- [Phase 1C learner/staff validation](PHASE_1C_VALIDATION.md)
- [Existing September fixes and local verification](STUDENT_FIXES_2026-09-29.md)
- [EVG handover template](EVG_HANDOVER.md)
- [September simulated-student critical review](../../outputs/student-audit-2026-09-29/CRITICAL_REVIEW.md)
- [September simulated-student coverage](../../outputs/student-audit-2026-09-29/COVERAGE.md)

The September fixes record 33 tests, 29 integration browser scenarios, six cover scenarios and two recovery scenarios, plus visual inspection. Account scenarios used synthetic responses; the public cover downloads were real. That evidence belongs to the local September implementation, not this audit or an unverified October deployment.
