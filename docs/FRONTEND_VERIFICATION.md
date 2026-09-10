# Frontend verification — 10 September 2026

Scope: the Phase 1A frontend prototype in [PLAN.md](../PLAN.md). These results verify fictional, in-memory interactions only. They do not verify production accounts, permissions, database integrity or actual learning outcomes.

## Completed checks

| Evidence | Check | Result |
|---|---|---|
| V01 | English home, library, details, discovery, community, staff and preview entry routes | Rendered and navigated in the browser |
| V01 | English/Vietnamese switch and saved Vietnamese after reload | Passed; page remains in the selected language |
| V01 | Vietnamese title search without accent marks | `bau troi` found the sample night-sky title |
| V01 | Topic filtering and no-results recovery | Stories filter returned two books; clearing an empty search restored the catalogue |
| V02 | Add a book, mark finished, correct back to reading | Passed; state and finished count reflect explicit reading actions |
| V02 | Home reading-list link | Opened the filtered reading list directly |
| V02 | Example goal, interests and expandable activities | Controls worked; the activity instructions opened; interests remained separate from editorial content |
| V03 | Sample return and availability | Return changed the sample title from one to two available copies and removed the sample active loan; reading remained unchanged |
| V08 | Narrow-screen EN/VI layout | Home, library, dialog, explore, community and staff checked; no horizontal page overflow in the sampled narrow views (327 CSS px actual browser viewport) |
| V08 | Keyboard dialog behaviour | Escape closed the dialog; focus remained within the modal during the sampled keyboard check; closing restored the trigger or main content when the trigger no longer existed |
| V08 | Route navigation after scrolling | New route started at the top with main-content focus |
| V08 | Browser console | No errors or warnings captured in the final production-preview session |
| V08 | `npm run lint` | Passed |
| V08 | `npm run build` | Passed; JS ~99.97 KB gzip, CSS ~4.28 KB gzip, HTML ~0.32 KB gzip |
| Documentation | SRS IDs, four Mermaid UML blocks, balanced fences and relative file links | Static checks passed; renderer compatibility was not separately automated |
| Localisation | EN/VI key parity and static translation references | 125 matching keys; checks passed |
| Repository | `git diff --check` | Passed |

The dependency load delayed the first lint attempts; the final full lint invocation completed successfully. Repeated development-server restarts interrupted an earlier browser check, so final checks used the production build through the local preview server.

## Remaining release evidence

- Observe representative EVG students and staff, including learners with little internet experience. The usability target has not yet been validated.
- Have an EVG Vietnamese speaker review terminology and sample instructions.
- Run a complete accessibility audit, including assistive technology and 200% zoom; the sampled keyboard/reflow checks are not a WCAG conformance claim.
- Measure performance on actual centre devices and connectivity. Compressed build sizes alone do not establish load time or offline capability.
- Prototype the remaining workflows incrementally: full circulation edge cases, editable goals, submissions/private feedback, recognition, and moderation.
- Verify persistence, direct API permissions, concurrent lending, retry behaviour, due dates, recovery and operational ownership when backend work begins.

No backend schema, authentication service, recommendation engine, AI integration or public deployment was added in this increment.
