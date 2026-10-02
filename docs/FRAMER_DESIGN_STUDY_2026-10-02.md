# Framer-inspired interface study — 2 October 2026

**Direction:** build a stronger editorial identity across the existing React website and give the home page one clearly choreographed scroll scene. Preserve the current routes, bilingual copy, private-data boundaries and task behaviour. This is design research; it activates no new feature or collection.

Research covers the requested [Framer Marketplace](https://www.framer.com/marketplace/components/) and [Framer University](https://framer.university/resources). The most useful pattern is deliberate **composition + motion states + readable holds**. Small fades added to unchanged boxes will not produce the visual change the owner is asking for.

## Concrete examples and direct previews

| Example | What the primary source establishes | What to adapt | What to avoid |
|---|---|---|---|
| **Sticky Section / Analogue** — [resource](https://framer.university/resources/sticky-section-scroll-animation-in-framer), [live demo](https://analogue.learnframer.site/) | A sticky container holds background imagery while scrolling trigger sections change its layers. | One stage for Nature, Stories and How things work, with obvious changes to imagery, colour, number and text. Keep each chapter readable before the next transition. | Huge blank approach sections or turning the whole learning website into a portfolio experience. |
| **3D Image Split** — [resource](https://framer.university/resources/3d-image-split-scroll-animation-in-framer), [live demo](https://3d-split.learnframer.site/) | Three named states: single image, expansion into three cards, then a 3D flip revealing the backs. | Borrow the strong visual state change: a large image/frame becomes separate topic compositions. An image/mask transition can deliver this clarity with less complexity. | Rotating real text through unreadable intermediate frames, making all three topics inaccessible until a long scroll, or imitating the business content. |
| **Horizontal Scroll** — [resource](https://framer.university/resources/horizontal-scroll-in-framer), [live demo](https://horizontal-scroll.learnframer.site/) | Sticky positioning retains the section; scroll transforms offset its inner content horizontally. | A controlled lateral transition between home chapters, driven by normal vertical scrolling. | A sideways-only library, nested scrolling, gesture-only navigation or mandatory horizontal motion on a small phone. |
| **Card Animation / Swag** — [resource](https://framer.university/resources/card-animation-on-scroll), [live demo](https://swag-card.learnframer.site/) | A sticky hero and separate scroll triggers move cards outward at different positions. | One decorative visual composition can have depth: foreground card/illustration moves more than its backdrop, with a stable text column. | Moving every catalogue card or shifting controls while the student is trying to select a book. |
| **Unusual Navigation Item Selector** — [resource](https://framer.university/resources/unusual-navigation-item-selector-in-framer), [live demo](https://box-selector-navi.learnframer.site/) | A selector layer moves among item variants; its fill/border/visual treatment defines the selected item. | A single pill or underline travels to the active Home/Library/My reading/Explore/Together link. Use direct text colour rather than blend effects. | Background inversion that produces uncertain contrast, absolute-width assumptions for Vietnamese labels, or replacing familiar navigation with a hidden novelty control. |
| **Soulful Form Submit States** — [resource](https://framer.university/resources/soulful-form-submit-states-in-framer), [live demo](https://soulful.learnframer.site/) | A component switches to a success variant; sequential letter/stroke elements provide the flourish. | A compact success icon and gently revealed real status message after the application confirms success. Maintain the form's position and size. | Drawing English letters for Vietnamese messages, turning validation alone into “saved”, clearing a failed draft, or a long celebration that delays the next action. |
| **Scroll Text Fade** — [Marketplace listing](https://www.framer.com/marketplace/components/scroll-text-fade/), [live preview](https://scrolltextfade.framer.website/) | The active text stays centred; adjacent items fade. Listed controls include **100–500 px** scroll distance per item and **20–80 px** gaps. | Pace chapters intentionally and give the active heading clear dominance. These published ranges show that scroll distance is a design control. | Dimming essential instructions, scattering the same effect across all pages, or treating those numbers as a measured optimum for EVG. |
| **Section Timeline** — [Marketplace listing](https://www.framer.com/marketplace/components/section-timeline/), [live preview](https://section-timeline-preview.framer.website/) | Section markers track position; click-to-scroll respects a header offset. The listing documents keyboard focus, `aria-current` and reduced-motion support. | Three labelled chapter selectors and a simple progress rail beside the home scene. Clicking a topic should land at a readable hold. | A decorative rail with no labels/keyboard controls, hover-only hints, or header overlap after jumping. |
| **Spring FAQ Accordion** — [Marketplace listing](https://www.framer.com/marketplace/components/spring-faq-accordion/), [live preview](https://springfaqaccordian.framer.website/) | Number/question/open-close label hierarchy, controlled expansion, mobile stacking and separate spacing. | Clean expandable activity rows with stable headings, numbered steps and a rotating chevron. | Bouncy educational instructions or requiring hover on mobile. Verify semantic buttons and expanded state in our implementation independently. |

**Inspection limits:** written mechanics and linked live-page content were inspected for the first four examples and the form example. Initial sticky/3D demo scenes were also opened visually. Native browser automation then lost its window; a complete animation walkthrough was not achieved. Some Marketplace previews could not be fetched by the text browser. No numeric timings/easing are claimed to have been measured from those demos, and no inaccessible tutorial video is described as watched. The specification below is an original adaptation.

## Home choreography: a material visual change

Use a large split scene: topic copy on one side, a bold topic composition on the other, with one persistent chapter number/progress system. Let imagery and coloured surfaces carry the movement; the text should settle and stay legible. Keep the familiar topic links as real controls.

**Proposed desktop starting point:** a section of roughly **300 small viewport heights**, containing a stage pinned below the navigation. The available scroll travel is roughly two viewports; verify the real sticky geometry rather than mapping progress across the entire section height blindly.

| Stage progress | State |
|---|---|
| 0–10% | The scene arrives and its first composition settles. |
| 10–30% | Nature stays fully readable. |
| 30–38% | The outgoing visual shifts and the next visual enters through a large mask/scale change; short copy transition. |
| 38–60% | Stories stays fully readable. |
| 60–68% | A second obvious composition change introduces How things work. |
| 68–90% | How things work stays fully readable. |
| 90–100% | The section releases naturally into the library selection. |

Starting transform ranges for the artwork: incoming Y **40–80 px**, outgoing X **40–70 px**, image scale **1.07 → 1.00**, one soft decorative layer moving independently by **15–30 px**. These are prototype settings to refine visually. Avoid moving the link hit target with the large art transition. A mask/reveal or layered card transition should be visibly more substantial than a 5 px fade.

For movement directly tied to scroll, map progress predictably; do not add a long CSS transition to every scroll update, which makes the scene lag behind the finger. Use an eased interpolation within the short transition bands. For discrete state changes and control feedback, a starting curve of `cubic-bezier(.22, 1, .36, 1)` and approximately **180–280 ms** is a project proposal. Artwork arriving once can take **450–650 ms** if it does not delay interaction. These are not documented Framer defaults.

On phones, use a shorter stage or a straightforward stack of the three topics. Preserve the same visual identity and labels. On short viewports, at 200% zoom, or with reduced motion, use normal document flow and show all topic content. A static mode should have no invisible transformed panels or two-viewports of empty space.

Framer Academy's written guidance explicitly calls for checking the middle of the movement, clipping, overlap, trigger range and all breakpoints; it also says transformed layers must stay out of essential controls. Adopt that discipline in React. [Control scroll transforms](https://www.framer.com/academy/lessons/scroll-transforms).

## Make the whole website look designed together

| Surface | Concrete improvement |
|---|---|
| **Global hierarchy** | One spacing rhythm, one restrained radius scale, strong page titles, quieter eyebrow labels and a readable content width. Use pale surfaces for grouping and thin dividers for secondary structure. Reduce repeated shadows and thick outlines. |
| **Navigation** | Clear visible core routes and a moving active indicator. The selected state should remain obvious with animation disabled. Vietnamese text determines its natural width. Keep focus rings visible and controls large enough for touch. |
| **Buttons and links** | Consistent primary/secondary/quiet variants. Let a trailing arrow move 3–4 px on hover/focus; a press can scale very slightly. Keep the label fixed, keep touch behaviour direct and distinguish disabled/pending/success states. |
| **Library** | A spacious header, a compact filter/search surface and a disciplined cover grid. Align author/language/status metadata and the card action. Covers remain recognisable; hover can lift the card a few pixels while preserving its layout space. |
| **My reading** | Editorial header followed by calm progress/list surfaces. Give the saved status and optional reflection clear placement. Use the same card spacing, status treatment and button style as the catalogue. |
| **Explore** | Give the three existing activities distinct large compositions; use a strong title and a brief description before secondary metadata. Expanded instructions can use numbered rows, generous line height and tidy separators. |
| **Together** | A clearer split between example inspiration and preparing one's own work. Use a consistent labelled example treatment and one strong path into the current presentation preview. Keep temporary-state text close to the editing action. |
| **Forms/account** | A composed, narrower form surface with an intentional heading, visible labels and grouped help. Show errors beside the field and use quiet status animation. Appearance transitions must never remount a form or reset text. |
| **Staff screens** | Share typography, button and status tokens, while keeping operational density practical. Tables, counts and actions should align; large decorative motion is unnecessary here. |

Suggested visual direction: warm paper/cream, a strong forest-green ink/action colour, one muted accent per topic, clean sans-serif body text and a deliberate display treatment for large headings. Validate the actual palette and Vietnamese glyphs before adopting it. Attractive motion cannot compensate for mismatched type scales, cramped labels or inconsistent card anatomy.

## Adapt carefully

Use the principles inside the existing React app; this research does not require migrating the website to Framer, buying components or loading every effect. The written references explain how the examples are constructed, so individual techniques can be recreated around the project's existing data and components.

Avoid a custom pointer, magnetic controls, infinite marquees of essential text, autoplay video, heavily blurred card text, repeated 3D flips and smooth-scroll interception. Framer University's own smooth-scroll article identifies delayed responsiveness and discomfort as possible drawbacks. A native scroll-driven stage can feel sophisticated while retaining predictable input. [Smooth-scroll article](https://framer.university/blog/how-to-add-smooth-scroll-to-your-framer-website).

Respect `prefers-reduced-motion` for decorative transforms and provide the complete content in static flow. Framer's current help describes reducing parallax, transform and layout movement; adopt that behaviour rather than asking learners to change their device preference to see an effect. [Framer reduced-motion settings](https://www.framer.com/help/articles/reduced-motion-settings/).

## Review evidence required

- Compare screenshots of every main route in English and Vietnamese at phone, tablet and desktop widths; the global design change must be visible beyond Home.
- Inspect Home at each hold **and halfway through both transitions**. Test fast scroll, reversing direction and clicking each chapter selector.
- Test keyboard focus through navigation, topic links, search, activity disclosures and forms. Moving layers must not cover focused controls.
- Verify the entire topic content with reduced motion and at 200% zoom; check short phone landscape heights and long Vietnamese labels.
- Recheck failed saves and auth-refresh behaviour after form styling; visual changes must preserve current draft/persistence safeguards.
- Measure page weight and scrolling responsiveness on an agreed slow device/network. Add compositional depth before adding large media or another library.

No source code, catalogue records, production settings or learner collection were changed by this study.

## Applied in this refinement

The coordinating implementation applied these ideas locally in the existing React application:

- A continuous sticky Home wrapper and layered card stack, with scroll-linked transforms updated through `requestAnimationFrame`. Static layouts cover small or short viewports, large text and reduced-motion preferences.
- A moving active-navigation pill and consistent button, form, typography and spacing treatment across the existing routes.
- Original SVG topic artwork reused across Home, Explore and Together, together with refined book surfaces and activity accordions.

The coordinator also inspected the [stacked-scroll live demo](https://stacked-scroll.learnframer.site/) before and after scrolling, plus a Marketplace floating-pill navigation preview and its direct demo. This supplements the source-based research above; its stated inspection limits still apply to the other examples. The application uses original implementation and artwork: no third-party component was copied and no new dependency was introduced for this refinement.

This records a **local demonstration**, not a deployment or validation of hosted sign-in, email delivery, persistence or permissions. Final QA results belong in the coordinator's release evidence; no test counts or production-readiness claim are added here.
