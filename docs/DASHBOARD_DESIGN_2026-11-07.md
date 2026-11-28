# Staff dashboard and Sorbet design system

Candidate review, 7 November 2026. This document describes the branch implementation, not a production deployment. The user's six-colour Sorbet reference supersedes the earlier cream-and-green visual direction. Older dated design notes remain historical records.

## Product decisions

The staff workspace serves librarians who also teach. Its first job is to show the state of the library and make the next useful action clear: follow up on a loan, open a student profile, maintain the catalogue, or review work submitted to Together.

The overview now separates current counts from selected-period activity:

- **Loan health:** active loans, distinct borrowers, overdue loans and loans due within seven days. Each number opens its matching records. A zero overdue count does not receive an amber warning treatment.
- **Priority work:** the overdue follow-up list sits beside the lending chart on desktop and comes first on narrow screens. Student, title, copy, due date, lateness and recorded contact remain visible. No contact is inferred when none was recorded.
- **Lending activity:** checkouts and returns use a shared zero baseline, integer axis ticks, distinct solid/patterned bars, period totals and a keyboard-accessible table of exact weekly values. Lost-copy resolutions remain excluded from returns. Empty activity is explained directly rather than drawn as fabricated bars.
- **Supporting records:** reading participation, overdue ageing, registered copy counts and ranked books are separate, scannable panels. Registered copies include lost records and exclude withdrawn copies, matching the existing API. Reading counts remain self-reported and are not presented as learning achievement.
- **Teaching:** the dashboard and library desk link to student records and the Together review desk. Written reading reflections remain private. Teacher shortcuts introduce no additional API requests.

The library desk and administration page share a restrained heading scale, functional outline icons, aligned actions and smaller supporting text. Workspaces are not numbered as though they must be completed in order. Most-borrowed books retain rank numbers because those numbers communicate actual ordering.

## Source-backed design rationale

These references were consulted directly. The claims below use their publicly available guidance, not an assumed reading of paid books.

| Reference | Applied decision |
| --- | --- |
| [Refactoring UI — official design example](https://refactoringui.com/) | Its public example recommends reducing unnecessary borders. Nested coloured metric boxes were replaced with spacing, a few quiet dividers, pale grey summary tiles and one enclosing surface per analytical panel. |
| [Practical UI — public guidelines and chapter descriptions](https://www.practical-ui.com/) | Descriptive headings, consistent spacing and purposeful colour informed the hierarchy. Headings make sense independently; amber denotes pending overdue work, while sage and rose distinguish ordinary reading/teaching surfaces. |
| [IBM Carbon — data visualization overview](https://www.carbondesignsystem.com/building-blocks/data-visualization/overview) | The chart prioritizes accurate and accessible communication: a common zero baseline, labelled scale, distinguishable series and a complete numeric alternative. No percentage growth, trend claim, target or total was invented. |

The visual arrangement is a product-specific design judgment, not a claim of conformance to an entire external design system.

## Authoritative Sorbet palette

The exact user-supplied colours are declared once in `src/styles/global.css`. Feature styles use their semantic aliases. Photographs, book images and the attributed Storyset illustration remain unchanged.

| Colour | Token | Role |
| --- | --- | --- |
| `#CCCCCC` | `--sorbet-grey` | Dividers and neutral surface borders |
| `#EDECEC` | `--sorbet-pale` | Secondary surfaces, subdued fields and dashboard summary tiles |
| `#B7C396` | `--sorbet-olive` | Primary action fills, selected accents and illustration details |
| `#FEFEFE` | `--sorbet-white` | Page canvas, reading surfaces and form fields |
| `#E0E7D7` | `--sorbet-sage` | Reading panels, light navigation selection and topic surfaces |
| `#BA9A91` | `--sorbet-rose` | Story highlights and teaching accents; a white mixture supports longer content |

Dark neutral `#2F352D`, muted `#5B6056`, olive text `#465336`, and stronger olive `#303D27` supply readable text and interactive states. Controls use a darker neutral border where the supplied light grey would not distinguish a field adequately. Red destructive actions and amber operational warnings retain their semantic colours.

Measured WCAG contrast from the actual opaque colour values:

| Foreground / background | Ratio |
| --- | ---: |
| Main text / white | 12.48:1 |
| Muted text / white | 6.40:1 |
| Main text / olive action | 6.75:1 |
| Main text / rose highlight | 4.87:1 |
| Muted text / sage surface | 5.10:1 |
| Olive link / white | 8.16:1 |
| White / destructive red | 8.05:1 |

The palette change covers home, navigation, library, account, authentication, reading, Explore, Together, information pages, staff tools, dialogs and shared controls. Hardcoded cream and old theme-green surfaces were replaced rather than left behind a new token file. Card layout, existing media, bilingual content and operational behaviour are preserved. Staff navigation uses an intentional second row at intermediate widths so long Vietnamese account controls do not wrap awkwardly by themselves.

## Verification

`tests/browser/dashboard-design.spec.ts` supplies intercepted synthetic records for populated dashboard review. It verifies values, totals, 4/12/52-week chart/table behaviour, empty-versus-failed states, retry, role-appropriate shortcuts, EN/VI rendering, responsive overflow and unfiltered axe results. Changing language does not issue another dashboard request. Fixtures are test-only; no demo metrics or learner names are inserted into the application or a database.

`tests/browser/palette-design.spec.ts` verifies all six exact palette values, the white canvas, responsive overflow and unfiltered axe checks on Home, Explore and Together in both languages. Both suites run in desktop Chromium and phone-sized Chromium, and save full-page screenshots for review.

Run from the repository root:

```sh
npx tsc -b
npm run lint
npx playwright test tests/browser/dashboard-design.spec.ts tests/browser/palette-design.spec.ts
```

Final focused result: **20 checks passed in 44.3 seconds**, with no axe violations. TypeScript project builds and the whitespace check also passed. Full-page screenshots of Home, Explore, Together and the populated Vietnamese dashboard were inspected after the palette change. Screenshots are generated in the ignored `test-results/` directory; they are synthetic UI evidence, not usage statistics. Automated Chromium/axe checks do not establish real-device Safari or a completed screen-reader usability study.
