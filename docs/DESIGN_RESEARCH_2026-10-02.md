# Homepage design research — 2 October 2026

This note records the research behind the homepage topic-story treatment. It is an implementation rationale, not a claim that EVG has tested these patterns with students. The next survey and observed sessions should validate whether learners understand the labels, find the library link, and prefer the longer scroll presentation to a compact topic grid.

## Principles used

- [Apple Human Interface Guidelines — Motion](https://developer.apple.com/design/human-interface-guidelines/motion) says custom motion should support the experience, remain optional, and be brief and precise. The homepage therefore uses ordinary document scrolling and changes only a decorative visual state; the topic copy and links work without motion.
- [Apple Human Interface Guidelines — Scroll views](https://developer.apple.com/design/human-interface-guidelines/scroll-views) recommends default scrolling behaviour, making scrollable content apparent, and avoiding nested scroll views with the same orientation. The topic sequence is a normal vertical page flow with no scroll interception, snap requirement, or inner vertical scroller.
- [Apple Human Interface Guidelines — Layout](https://developer.apple.com/design/human-interface-guidelines/layout) recommends clear hierarchy, alignment, progressive disclosure, and layouts that adapt to the available space. The desktop layout keeps one visual anchor beside a readable sequence; compact widths collapse to one column while retaining the same actions.
- [Apple Human Interface Guidelines — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) calls for information to be perceivable through more than one method, larger readable text, adequate contrast, and sufficiently sized controls. Each topic remains a real heading, description, and 44px-tall library link. The artwork is decorative (`aria-hidden`) and never carries the only meaning.
- [Framer Academy — Create scroll animations](https://www.framer.com/academy/lessons/scroll-animations) describes connecting named scroll sections to visual variants and checking each breakpoint. EVG adapts the idea with an `IntersectionObserver` that updates the decorative panel as a section enters view, while the page remains native HTML and does not add an animation dependency.
- [Framer Help — How animations and effects work](https://www.framer.com/help/articles/how-animations-and-effects-work-in-framer/) documents Framer's React/Motion path and reduced-motion setting. EVG keeps the implementation smaller for the current Vite app: CSS transitions only, an explicit reduced-motion rule, and no remote fonts, video, or motion package.

## Education and learning references

- [Khan Academy content principles](https://support.khanacademy.org/hc/en-us/articles/360054562832-What-are-Khan-Academy-s-Content-Principles) puts learners at the centre and describes welcoming curiosity as a content goal. EVG keeps the invitation concrete (“What would you like to read?”) and leaves browsing open to guests.
- [Learning Equality — Kolibri](https://learningequality.org/kolibri/about-kolibri/) describes an offline-first learning ecosystem where learners explore a large library at their own pace, with suggestions for what to learn next. This supports future work on low-connectivity behaviour, explicit next steps, and a preference capture flow before recommendations; it does not mean EVG currently supports offline sync or recommendations.
- [CommonLit accessibility supports](https://support.commonlit.org/article/437-how-do-i-accessibility-tools-and-reading-supports-does-commonlit-provide-for-struggling-readers-and-students-with-ieps) documents read-aloud, annotations, guided reading, and translation support. These are useful candidate features for the unfinished reading/reflection area, but each needs local safeguarding, device, and language validation before being promised.

## Applied decisions

1. **One signature moment.** The topic story is the homepage's memorable interaction: a quiet pinned illustration changes from Nature to Stories to How things work as the student moves through the sequence. The catalogue shelf stays visually quieter beneath it.
2. **Progressive disclosure without a forced journey.** The three topics are presented in reading order, but all links are visible in the DOM and keyboard order. A student can jump directly to any topic and can use the header Library link instead.
3. **Small, local visuals.** Existing inline SVG illustrations are reused. There are no image downloads, autoplay, or third-party animation libraries.
4. **Graceful fallbacks.** At compact widths the visual is a normal block followed by all topic sections. With `prefers-reduced-motion: reduce`, transitions are disabled. If `IntersectionObserver` is unavailable, the first visual remains and the topic links still work.
5. **Bilingual parity.** The new story introduction and topic action are in `homeCopy.ts` for English and Vietnamese. The page keeps the existing cream canvas, forest-green actions, opaque reading surfaces, and glass only for functional controls.

## Candidate next research

The survey should test the smallest useful questions before the recommendation system is built: preferred topics, reading language, available device and connectivity, desired reading length, whether a learner wants activity prompts after reading, and whether they are comfortable saving a preference on a shared device. Collect only what is needed, explain why it is collected, and keep a skip path.

For presentations and reflections, prototype one low-risk loop first: choose a book, answer one private reflection prompt, optionally create a short presentation outline, and preview what would be shared before any publication. CommonLit’s annotation and guided-reading examples suggest useful scaffolds, while EVG’s current project and recognition previews correctly remain non-persistent until policy and student research are complete.

## Verification limits

The references above are product/design guidance and feature examples, not evidence that a particular interaction will work for EVG learners. Validate at 320px, 390px, 768px, 1024px, and 1440px, with keyboard navigation, Vietnamese text, zoomed text, and reduced motion. Validate comprehension with representative students and staff before treating the motion treatment as final.
