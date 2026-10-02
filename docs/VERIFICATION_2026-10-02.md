# Typography, motion and system verification — 2 October 2026

The local `codex/apple-design-preview` checkout now uses one bilingual type system, shared Home/Explore scroll choreography and restrained glass controls. This pass also corrected two database races, a narrow-screen administration layout, a control-font cascade issue and misleading catalogue partial-save recovery. These changes have **not been deployed**. The canonical `HealEduTech` checkout and hosted Supabase were not changed.

## What changed

- **Typography:** Be Vietnam Pro 400/500/600/700 for UI and reading; Newsreader 500, optical size 32 served instance, for selected topic/book display headings. Shared family tokens replace scattered font choices. Local WOFF2 subsets include Latin, Latin-ext and Vietnamese, with OFL notices and source/size/hash manifest. `font-display: swap`; only the 12,908-byte regular Latin face is preloaded. All 15 retained files total 212,808 bytes. Stored bytes are not a measured network transfer budget. [Research and rationale](TYPOGRAPHY_GLASS_RESEARCH_2026-10-02.md), [font provenance](../public/fonts/README.md).
- **Materials:** stronger warm glass navigation, subtle rim/shadow and consistent search/filter/secondary controls. Main reading/writing surfaces stay opaque. Strong header tint protects text over changing artwork. Unsupported backdrop filtering, increased contrast and reduced transparency use opaque fallbacks.
- **Explore:** the same shared scroll-stack hook as Home, with scale/lift on inner cards while outer measurement wrappers remain untransformed. Scroll is native, passive and animation-frame scheduled. Small/short screens, enlarged root text, reduced-motion preference and cards too tall to fit use normal flow. Expanded instructions retain their visual position when sticky enhancement turns off. Card height is independent of enhancement state to avoid a ResizeObserver enable/disable loop.
- **Resize observer follow-up:** an earlier Vite log exposed an observer-notification warning. ResizeObserver, viewport and motion-preference callbacks now coalesce into one animation frame instead of changing layout inside the observer notification. After that final adjustment, six viewport transitions, expansion/collapse and forward/reverse scrolling passed with no captured warning/error logs; lint and build passed again.
- **Navigation and controls:** Explore/Together remain in primary navigation; narrow screens use the hamburger. Button family inheritance no longer overrides role-specific size/weight. Administration now constrains its wide staff table inside a scrollable region instead of widening the whole page. Interest saving has its own EN/VI label.
- **Catalogue recovery:** metadata/copy and cover RPCs are still separate transactions. A cover-only failure now states that details/copies saved, refreshes the list, preserves the cover draft and converts a committed create into an edit of the same ID. Retry can change metadata without repeating the create operation. This improves recovery; it does not make the two RPCs atomic.
- **Database concurrency:** migration `20261002130000_serialize_interest_and_loan_corrections.sql` serialises interest replacement per user and locks copies before loan resolution/correction checks. [Backend evidence and UML](SYSTEM_UML_2026-10-02.md).

## Final automated checks

| Check | Result | Scope |
|---|---|---|
| `npm run lint` | Pass | ESLint across the project |
| `npm run build` | Pass | TypeScript build and production Vite bundling; 166 modules |
| `node --test tests/*.test.ts` | **35/35 pass** | Auth validation/redirects/recovery parsing, storage failures, catalogue state/cover handling, partial-save editor recovery and circulation date/idempotency utilities |
| `git diff --check` | Pass | An extra trailing blank line from temporary accessibility overrides was removed; final diff is clean |
| Local migration replay | **17/17 pass** | Fresh PostgreSQL 18.4, private Unix socket, no TCP listener |
| Existing database suites | **5/5 pass** | Access, circulation, reading, search and seed; these are suites containing multiple assertions |
| Paired-client database probes | **5/5 pass** | Interest replacement, copy uniqueness, borrower limit, request idempotency, old correction versus new checkout |
| Font integrity | **15/15 sizes and SHA-256 values match** | Current files and manifest; all declarations local WOFF2 with swap |
| Built font delivery | **15/15 pass** | Local production server returns valid WOFF2 signatures and bytes matching the manifest; evidence in `../outputs/typography-system-2026-10-02/built-font-http-check.json` |
| Production-bundle smoke | Pass | Home, Explore activity expansion, EN/VI switching, font-role declarations and unknown-route recovery on private port 4193; no captured warning/error logs in the sampled built pages |

The database harness runs real PostgreSQL constraints, grants, RLS, functions, locks and rollback with a minimal Auth shim. It does not run Supabase GoTrue, PostgREST or real email. See the backend report for reproducible commands, exact outcomes, hashes and cleanup evidence. Both corrected races were reproduced before the migration; success is based on post-fix concurrent outcomes and exact final state, not migration application alone.

## Browser layout coverage

Browser checks used the actual React UI through Codex's in-app browser. Dimensions below are CSS viewport targets; the nominal 1024 setting can round to 1023 because of browser zoom. A pass means the page rendered and document width did not exceed viewport width. It is not a claim that every pixel/state or assistive technology was certified.

| Matrix | Count | Final result |
|---|---:|---|
| EN + VI × Home, Library, My reading, Explore, Together, Quick guide, Sign-in, unknown-route page × 320/390/768/1024/1440 | 80 | No document horizontal overflow |
| EN + VI × Catalogue, Circulation, Staff training, Administration × 320/390/768/1440 | 32 | No document horizontal overflow; wide table scroll stays inside its region |
| 200% root text plus line height 1.5, paragraph spacing 2em, letter spacing .12em and word spacing .16em × seven public routes × 390/1440 | 14 | No document horizontal overflow; Home/Explore enhancement disabled |
| Explore fit at 1280×650, 1280×680, 1280×700, 900×750, 1280×900 and 390×844 | 6 | Short/mobile fallback and fitting-desktop enhancement behaved as expected |

The temporary text/spacing overrides were removed before the final build. The 112 normal-layout checks were rerun after the font inheritance and administration fixes. Expanded Vietnamese activities and enlarged English instructions were visually inspected, along with the Home topic cards, glass navigation and phone layout.

## Browser interaction checks

The existing demo preview at `127.0.0.1:4187` was preserved. Configured learner/staff journeys used a separate Vite instance at `4191` and a loopback-only API fixture at `4190` with fictional `example.invalid` accounts and in-memory data. No real account, password, email or hosted record was used. These checks verify frontend behavior, not the fixture's imitation of Supabase security.

| Journey | Observed result |
|---|---|
| Signed-out learning route | Sign-in explanation shown; no private reflection exposed |
| Empty/invalid sign-in | Field feedback and safe invalid-credentials message; valid fictional learner returns to intended reading route |
| Reflection failure | Injected HTTP 503 leaves bilingual text in the editor and presents an actionable retry message |
| Reflection retry/reload | Retry shows saved state; reload restores the exact reflection through the fixture API |
| Reading language change | EN/VI labels change while the saved bilingual reflection remains intact |
| Interest selection | Nature/Stories selection saves and survives reload; clear-all then save survives reload empty |
| Interest copy | Dedicated “Save interests” / “Lưu sở thích” wording verified |
| Sign-out | Subsequent reading route shows signed-out state, with no previous private note |
| Staff access | Fictional admin gets four staff destinations; signed-out administrator route requires sign-in |
| Circulation disabled | Policy-off explanation shown; checkout button remains disabled |
| Mobile menu | Opens and includes Explore/Together; Escape closes and restores trigger focus; selecting Together closes the menu |
| Explore activities | All three Vietnamese activities open/close by keyboard; expanded content remains readable; oversized cards disable stacking |
| Stack reversibility | Scrolling back restores the first card to scale 1 / translation 0; wrappers stay untransformed |
| Project/presentation preview | Five outline prompts, reflection, rehearsal choice and sample-feedback path save in page state; focus moves to saved title |
| Preview privacy boundary | Language switch retains fictional draft; reload clears it; UI explains that nothing is sent or published |
| Catalogue outage | Injected 503 produces failure/retry UI; after restoring fixture, retry loads books and book detail correctly |
| Cover partial failure | Book appears in inventory; explicit partial-save message; new form becomes edit form with draft cover intact |
| Cover retry with changed title | Success updates the existing book. Fixture totals: **3 books, 1 create call, 1 update call** from a 2-book starting set |

The print action, real delivery/recovery email, complete screen-reader traversal, browser back/forward cache across private sessions, cold/failed font downloads and low-end physical devices were not fully revalidated in this pass. Source-level reduced-motion/reduced-transparency/contrast and unsupported-filter guards were reviewed; OS preference switching was not exercised in this browser environment.

## Contrast and visual boundaries

For header text `#286047`, the stronger 90% warm-white material gives approximately **5.77:1** over black and **7.25:1** over a light surface. The 14% green active pill gives **4.82:1** and **5.97:1**, respectively. These compositing calculations address the reported dark-background header defect. They are not a whole-site WCAG certification. Decorative edges may be subtle; focus, state and form boundaries still need representative-device review.

Vietnamese UI and mixed-language reflection text rendered in browser inspections. Official coverage metadata and Unicode ranges are retained. No exhaustive glyph-table, NFC/NFD shaping, child-reading outcome or full assistive-technology claim is made. The current effect is a CSS glass treatment inspired by Apple's material guidance, not the native adaptive Liquid Glass renderer.

## Release and next-work gates

1. Review/deploy this exact frontend and corrective migration to an explicitly verified target; then repeat hosted Auth/email, role, API-denial, cache/asset and session checks. None of today's local evidence confirms the current production bundle or database state.
2. Keep lending disabled until EVG signs off policy, inventory and operational rehearsal. Correction/eligibility/account lookup still need usable staff flows.
3. Complete real persistence and permissions for goals, presentations and facilitator feedback. The current previews are deliberately labelled and reset on navigation/reload.
4. Agree account retention/export/removal, backup/restore and handover owners. Test restoration of actual data/permissions.
5. Validate Vietnamese wording, reading comfort, motion and network cost with representative students/devices after the survey. Plan preference-led recommendations for the week of 5 October; real learner collection/rollout waits for January 2027 Vietnam and agreed research/privacy gates.

Review [functional and non-functional requirements](../PLAN.md), [implemented/planned UML and access matrix](SYSTEM_UML_2026-10-02.md), and the [rendered current domain diagram](uml/rendered.html).

The rendered domain artifact was checked as SVG and in the browser: 13 classes, all 19 source relationships, valid source hash, zoom/fit controls, class search and the accessible relationship table. The HTML is self-contained and the SVG is separately exportable; neither needs a third-party diagram service.
