# EVG frontend design research

Research date: 10 September 2026. This is a design rationale, not a claim that another platform's outcomes will transfer to EVG. Validate the design with local students and staff before building the backend.

## Reference platforms and decisions

| Reference and evidence | Useful characteristic | EVG adaptation | Complexity we leave out |
|---|---|---|---|
| [Khan Academy learner home](https://support.khanacademy.org/hc/en-us/articles/360030629852-What-is-my-Learner-Home-page-and-what-can-I-do-there), official learner-home documentation and screenshots | A learner landing page provides access to ongoing learning and navigation | Put the current reading book first; keep navigation in the same place | Course administration, mastery dashboards, dense progress statistics |
| [Duolingo learning-path redesign](https://blog.duolingo.com/new-duolingo-home-screen-design/), official May 2022 design explanation and illustration | An obvious next step reduces the choice of where to begin | One prominent reading action and one small weekly goal | Locked course progression, currencies, competitive rankings and pressure to maintain streaks |
| [Kolibri public demo](https://kolibri-demo.learningequality.org/), guest library visually inspected | Recognisable library cards, a search field, labelled browsing choices | Book covers plus titles; one search input and one topic filter | The demo's large channel catalogue and many simultaneous filter groups |
| [Kolibri product overview](https://learningequality.org/kolibri/about-kolibri/) and [design system](https://design-system.learningequality.org/) | Designed with constrained contexts and consistent interfaces in mind | Local system fonts, small text-first screens, predictable controls, separate staff entry | No claim that EVG already supports Kolibri-style offline delivery; offline infrastructure remains a later decision |

The Duolingo article and Khan support page document specific historical designs, rather than proving their complete live signed-in interfaces today. Kolibri's guest library was inspected live. No competitor code, branding, illustrations, or content was copied.

## Our own design: a calm community library

EVG is a place to find a book and share a discovery. The visual identity combines forest-green actions, warm white surfaces, restrained botanical accents, and original typographic sample book covers. The hierarchy feels like a small library rather than a commercial course marketplace.

- **Four student destinations:** My learning, Library, Explore, Together. On phones these become a labelled bottom navigation bar. Staff preview is separate.
- **One principal task per section:** view a current book; find a title; try an activity. Secondary options appear where they are needed.
- **Progress without pressure:** an example weekly goal and explicit finished-book count, without a public leaderboard or automatic rewards.
- **Readable actions:** text accompanies symbols; search has a visible label; dialogs have a visible close control; empty searches explain how to recover.
- **Language control stays visible:** English initially, saved Vietnamese respected. Translations include help, sample descriptions, empty states, and staff screens. EVG must review Vietnamese wording with learners.
- **Honest previews:** fictional book metadata, temporary local state, no actual ebook reader, no protected staff records, no personalised recommendations. Sharing and moderation are labelled future work.
- **No decorative downloads:** book designs use CSS and text. No remote font, stock-photo dependency, animation library, autoplay video, or AI call is required.

## Prototype walkthrough

1. Open My learning and select **View my book**.
2. Close the detail dialog; open **Library** and search by an English or Vietnamese title.
3. Add another title to **My reading list** and mark it finished. Check the reading count on My learning.
4. Open **Explore**, expand a short activity, and select interests. These do not change the editorial examples.
5. Open **Staff preview**, record the sample return, then check that the library's availability changes while reading status stays separate.
6. Switch language, repeat the primary flow, and reload to demonstrate the explicit reset of demo records.

## Validation before approval

Target at least five representative students plus two EVG staff in short observed sessions. This is an initial formative sample, not statistical proof. Ask students to find a book, open its details, record reading, discover an activity, and switch language. Record task success, prompts needed, wrong turns, unfamiliar words, and recovery from mistakes. Do not coach until a participant is stuck.

Proposed initial gate: at least four of five students complete the book-finding and reading-record tasks after one brief orientation without step-by-step help. If not, revise labels, navigation, and task scope before adding features. Test real centre devices and connectivity; a desktop screenshot cannot establish low-end device performance.

Accessibility target: [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/) for applicable flows. Practical checks include keyboard access, clear focus, normal-text contrast of at least 4.5:1, no colour-only meaning, and reflow. EVG additionally targets primary touch controls at least 44 × 44 CSS pixels. Accessibility conformance and local learner usability remain release checks, not claims of this prototype.
