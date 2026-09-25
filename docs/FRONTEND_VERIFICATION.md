# Frontend verification — 24 September 2026

For the subsequent hosted-site QA, regression fixes and remaining real-account checks, see [Live QA, 24–25 September](LIVE_QA_2026-09-24.md). The prototype checks below are historical evidence, separate from the hosted QA.

Scope: the Phase 1A–1B frontend prototypes and the configured circulation presentation in [PLAN.md](../PLAN.md). Fictional workflow results do not verify production accounts, permissions, persistence, database integrity or actual learning outcomes.

## Completed checks

| Evidence | Check | Result |
|---|---|---|
| V01 | English home, library, details, discovery, community, staff and preview entry routes | Rendered and navigated in the browser |
| V01 | English/Vietnamese switch and saved Vietnamese after reload | Passed; page remains in the selected language |
| V01 | Vietnamese title search without accent marks | `bau troi` found the sample night-sky title |
| V01 | Topic filtering and no-results recovery | Stories filter returned two books; clearing an empty search restored the catalogue |
| V02 | Add a book, mark finished, correct back to reading | Passed; state and finished count reflect explicit reading actions |
| V02 | Home reading-list link | Opened the filtered reading list directly |
| V02 | Editable weekly-goal preview in EN/VI | Edit, required-field validation, progress change, save feedback and reset-on-reload passed in the production preview |
| V05 | Fictional private project/feedback workflow in EN/VI | Draft/ready states, required-field recovery, cancel restoration, visibility boundary and structured example feedback passed in the production preview |
| V05 | Draft recognition criteria in EN/VI | Three proposed recognition types show the criterion, required evidence, no-award state, correction/duplicate boundary and no-leaderboard rule in the production preview |
| V05 | Fictional showcase/comment moderation in EN/VI | Reject-with-reason validation, approval, separate comment approval, temporary shutdown, withdrawal and immediate hiding passed in the production preview |
| V03 | Configured circulation edge-state presentation | Five date/retry unit tests, lint and build passed for policy-disabled checkout, centre-timezone date minimum, overdue status, and usable/damaged/lost resolution labels; an authenticated hosted walkthrough remains required |
| V03 | Sample return and availability | Return changed the sample title from one to two available copies and removed the sample active loan; reading remained unchanged |
| V08 | Narrow-screen EN/VI layout | Home, library, dialog, explore, community and staff checked; no horizontal page overflow in the sampled narrow views (327 CSS px actual browser viewport) |
| V08 | Keyboard dialog behaviour | Escape closed the dialog; focus remained within the modal during the sampled keyboard check; closing restored the trigger or main content when the trigger no longer existed |
| V08 | Route navigation after scrolling | New route started at the top with main-content focus |
| V08 | Browser console | No errors or warnings captured in the final production-preview session |
| V08 | `npm run lint` | Passed |
| V08 / NFR06 | `npm run build` with route-level splitting | Passed. Initial eager HTML/CSS/JS is ~187 KB gzip; community and staff workspaces load on demand. Main JS fell from ~647 KB to ~344 KB raw and the >500 KB chunk warning cleared. Direct community/staff URLs and learning → community navigation passed with the bilingual in-page loading state. |
| Localisation | No-backend staff route | Fixed the `circulation` namespace/label collision that exposed an object-error message; EN/VI desk label passed after rebuild |
| Documentation | SRS IDs, four Mermaid UML blocks, balanced fences and relative file links | Static checks passed; renderer compatibility was not separately automated |
| Localisation | EN/VI key parity | All new keys match; only the existing English plural-specific catalogue copy-count variants intentionally differ from Vietnamese |
| Repository | `git diff --check` | Passed |

The dependency load delayed the first lint attempts; the final full lint invocation completed successfully. Repeated development-server restarts interrupted an earlier browser check, so final checks used the production build through the local preview server.

## Remaining release evidence

- Observe representative EVG students and staff, including learners with little internet experience. The usability target has not yet been validated.
- Have an EVG Vietnamese speaker review terminology and sample instructions.
- Run a complete accessibility audit, including assistive technology and 200% zoom; the sampled keyboard/reflow checks are not a WCAG conformance claim.
- Measure performance on actual centre devices and connectivity. Compressed build sizes alone do not establish load time or offline capability.
- Run the configured circulation desk against a hosted test account and synthetic loans to verify policy-disabled, past-date, overdue, damaged and lost states end to end.
- All listed Phase 1B interface slices are implemented locally; validate them with representative EVG students and staff before choosing further backend expansion. Goal/project persistence, facilitator access, approved reward logic and protected moderation remain later work.
- Verify persistence, direct API permissions, concurrent lending, retry behaviour, due dates, recovery and operational ownership when backend work begins.

No backend schema, authentication service, recommendation engine, AI integration or public deployment was added in this increment.
