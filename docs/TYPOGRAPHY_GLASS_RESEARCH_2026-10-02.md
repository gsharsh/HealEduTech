# Typography and glass materials study — 2 October 2026

Use **Be Vietnam Pro for body text and interface controls**, with **Newsreader for a small set of topic and book display headings**. Keep reading and writing surfaces visually quiet; concentrate the stronger glass treatment in the floating navigation and its interactive selection pill. This recommendation fits the bilingual library and the current React implementation without adding a runtime font service.

This is a source-backed design recommendation, not evidence that a particular typeface improves Vietnamese children's reading outcomes. Coverage, licensing, and available font axes were checked against official repositories and current Google Fonts metadata. Personality, pairing, sizes, and material recipes below are design judgments. The final handoff also checks the local asset manifest, file sizes, hashes, and loading declarations. This research task did not download fonts, change application source, operate browser UI, validate authentication, or verify a deployment.

## Four suitable options

All four current Google Fonts metadata files explicitly include the `vietnamese` subset and an OFL license. This verifies the catalog's stated coverage; the final downloaded subsets still need glyph and rendering checks.

| Face | Verified distribution and coverage | Legibility and personality assessment | Performance implications and decision |
| --- | --- | --- | --- |
| **Be Vietnam Pro** | The designer describes specific work on Vietnamese letterforms and adaptive diacritics. Google Fonts currently lists static upright/italic weights 100–900 and Latin, Latin-ext, Vietnamese coverage. [Designer repository](https://github.com/bettergui/BeVietnamPro), [official metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/bevietnampro/METADATA.pb). | My preferred body/UI face: it gives the library a contemporary identity with an explicit Vietnamese design foundation. The designer's readability intent does not establish comparative child-reading performance. | Selected implementation: static upright **400, 500, 600, 700**, self-hosted WOFF2 subsets. Each used weight can require additional requests. Retain only weights actually needed. |
| **Manrope** | Current catalog: upright variable `wght` 200–800; Vietnamese included. The official repository describes a semi-condensed geometric sans and records Vietnamese support. [Metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/METADATA.pb), [repository](https://github.com/googlefonts/manrope). | A credible alternate UI face. My assessment: clean, compact, and more technical in tone; less connected to this project's Vietnamese identity than Be Vietnam Pro. Its geometry is a stylistic choice, not a demonstrated learning benefit. | A variable upright file can consolidate weights. Current metadata does not list an italic file. Measure subsets before claiming it is smaller than the selected static Be Vietnam Pro set. Do not add it as a third face. |
| **Newsreader** | Production Type describes its purpose as continuous on-screen reading in content-rich settings and explicitly names Vietnamese support. Current catalog: upright/italic variable fonts, `wght` 200–800 and `opsz` 6–72. [Designer repository](https://github.com/productiontype/Newsreader), [metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/METADATA.pb). | My preferred optional display partner: a restrained editorial voice suits books, curiosity, and topic headings. Keep it out of navigation, form inputs, dense status labels, and numerical controls. | Final selection is the official served upright **500 / optical size 32 instance** to reduce the asset budget. The app declares weight 500; it does not claim or use a variable axis range. Load it only where used. |
| **Lora** | Current catalog: upright/italic variable `wght` 400–700 with Vietnamese coverage. Cyreal identifies Vietnamese glyph contribution and describes a screen-oriented text serif rooted in calligraphy. [Metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/lora/METADATA.pb), [designer repository](https://github.com/cyrealtype/Lora-Cyrillic). | A suitable alternate serif, especially for a warmer storybook direction. My assessment: its brushed details are more conspicuous than needed alongside the new topic artwork. | Supports a variable weight range but current metadata has no optical-size axis. Substitute it for Newsreader if the visual proof favors it; do not ship both. |

The **selected Google Fonts Be Vietnam Pro assets are static**. A separate upstream variable TTF exists in the [designer's variable-font directory](https://github.com/bettergui/BeVietnamPro/tree/main/fonts/variable), but that does not make the selected Google Fonts distribution variable. Switching distributions would require new asset, license, coverage, and metric checks; it is unnecessary for this refinement.

Both selected families permit use and redistribution under SIL OFL 1.1, subject to the license conditions. Keep the supplied copyright/license notices alongside distributed assets and review reserved-name conditions before modifying or renaming fonts. [Be Vietnam Pro license](https://raw.githubusercontent.com/google/fonts/main/ofl/bevietnampro/OFL.txt), [Newsreader license](https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/OFL.txt).

## A consistent type system

The pre-refinement stylesheet used a system sans stack and Georgia for some decorative display text. Some home headings had very tight tracking and line heights near 1.0. Replacing those fonts changes width and vertical metrics: retain the intended hierarchy, then inspect Vietnamese marks and wrapping rather than preserving every previous numeric value.

Proposed roles, expressed in `rem` with the user's root size respected:

| Role | Family and weight | Proposed size and spacing |
| --- | --- | --- |
| Body, descriptions, learning instructions | Be Vietnam Pro 400 | 1–1.125rem; line height 1.6–1.7. Prefer the upper end for primary reading instructions. |
| Navigation, buttons, short choices | Be Vietnam Pro 600 | 0.9375–1rem; line height 1.4–1.5; normal tracking. |
| Form labels and supporting text | Be Vietnam Pro 500 | 0.875–1rem; line height 1.5. Essential instructions/errors should remain comfortably readable. |
| Route/section headings | Be Vietnam Pro 700 | 1.5–2.25rem responsive; line height 1.2–1.3; tracking no tighter than roughly -0.02em as an initial proof. |
| Topic, book, and occasional editorial display | Newsreader 500 | 1.75–4.5rem responsive; line height 1.12–1.2; begin with normal to -0.025em tracking. Allow long Vietnamese labels to wrap. |
| Small category captions | Be Vietnam Pro 600 | Prefer 0.875rem; modest tracking. Avoid relying on tiny all-caps captions for meaning. |

These values are starting points for local visual proof, not WCAG-prescribed font sizes. Use at most two families across all routes; a single Be Vietnam Pro hierarchy remains a good lower-bandwidth fallback. Keep browser/OS text preferences effective. Use left-aligned reading text and a comfortable proposed measure of about **50–68ch** for instructions and reflections; `ch` is an approximate sizing tool, not a literal character count. W3C's visual-presentation criterion discusses line width and unjustified text at **AAA**, so an attractive paragraph width alone does not establish AA or AAA conformance. [W3C visual presentation](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html).

Use this fallback hierarchy:

```css
/* Proposed family roles; asset declarations belong to the implementation. */
--font-ui: "Be Vietnam Pro", system-ui, -apple-system,
  BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-display: "Newsreader", Georgia, "Times New Roman", serif;
```

The selected Newsreader instance is requested at optical size 32, so this implementation does not depend on automatic optical-size adjustment or a variable range. If a future asset retains `opsz`, inspect that file before opting into automatic sizing. Keep the visual roles discrete even when a family offers a continuous range. Do not animate font weight or optical size in reading text. Variable axes are font-specific and need to be inspected rather than assumed. [web.dev variable-font guidance](https://web.dev/articles/variable-fonts).

## Local assets and low-bandwidth behavior

Serve local WOFF2 files with the application. WOFF2, conservative preloading, subsetting, and avoiding a third-party connection are supported by web.dev's performance guidance. `font-display: swap` immediately displays fallback text, but metric differences can visibly move content. Preloaded fonts need `crossorigin`, including same-origin files. Excessive preloading can compete with other critical resources. [web.dev font optimization](https://web.dev/learn/performance/optimize-web-fonts).

Project-specific implementation choices:

1. Keep an asset manifest with source URL, family, style, weight or retained range, subset, license path, and byte size. A family advertised as variable can still be delivered as an instance; check actual files before setting `font-weight: 500 600` in a face declaration.
2. Be Vietnam Pro uses four exact static face declarations per necessary language subset; selected Newsreader uses weight 500 declarations. A future shared variable WOFF2 would require asset inspection and measurement. Avoid declaring a static instance as a weight range or depending on synthesized bold for the chosen roles. Google Fonts distinguishes individual requested weights from requested continuous ranges. [Official CSS API guidance](https://developers.google.com/fonts/docs/css2).
3. Preserve basic Latin **and** Vietnamese coverage. Copy the provider's matching `unicode-range` declarations when storing provider-generated subsets; do not point all ranges at one subset. Include required combining marks and Latin extensions for decomposed input, names, and future bilingual book titles. CSS subset/style declarations let the browser request the resources it needs. [web.dev font loading](https://web.dev/articles/optimize-webfont-loading).
4. Do not subset to today's interface strings: future book metadata and student-written reflections are dynamic. Remove unrelated scripts only after verifying the intended coverage. A Vietnamese-only subset does not replace the basic Latin subset.
5. Preload the most critical visible body/UI file only when its measured loading path warrants it. Let unused weights and optional display assets remain demand-loaded; a generic global preload of every weight defeats the subset strategy. Make the preload path match the CSS URL and check the deployed asset cache headers. [web.dev loading and caching](https://web.dev/articles/optimize-webfont-loading).
6. Keep the system/Georgia fallback readable if all custom-font requests fail. Inspect cold loading on a throttled connection, fallback-only layout, repeat navigation, and font arrival. If layout shifts remain significant, derive fallback metric adjustments from the actual font; do not copy guessed percentages. `font-size-adjust` can help align perceived fallback size. [web.dev fallback sizing](https://web.dev/blog/font-size-adjust).
7. Record actual transferred bytes and requests separately from stored asset bytes. An initial design objective is **under 150 KB of fonts on a cold home view**, and less on a core learning route; this is a proposed project budget, not a measured result or an externally mandated threshold. Prioritize coverage and immediate readable fallback over meeting an arbitrary number. Remove a weight/face if it adds little after measuring.

Proof sample in each real weight, at body size and heading size:

> Tiếng Việt · Đọc và khám phá · Những điều em học được · Cùng nhau kể chuyện · Ă Â Ê Ô Ơ Ư Đ · ắ ằ ẵ ặ ấ ề ộ ở ự

Test both NFC and NFD forms, repeated lines, punctuation, and English/Vietnamese switching. Check accent clipping inside rounded buttons, inputs, badges, card overflow, and sticky headings. A metadata subset entry is insufficient evidence that the downloaded file renders every sample correctly.

## A stronger glass appearance with a clear role

Apple's current materials guidance places Liquid Glass in a distinct controls/navigation layer above content, calls for restrained custom use, and explains that more opaque materials can preserve legibility. It distinguishes regular and clear variants, with the latter suited to visually rich media backgrounds. These are native Apple-platform rules and effects; CSS blur does not reproduce their adaptive rendering. The useful web principle is a clear relationship between floating controls and the reading surface. [Apple materials guidance](https://developer.apple.com/design/human-interface-guidelines/materials), [Apple Liquid Glass overview](https://developer.apple.com/documentation/technologyoverviews/liquid-glass).

My proposed web treatment:

| Surface | Treatment | Purpose |
| --- | --- | --- |
| Floating primary navigation | A substantially opaque warm-white tint, restrained backdrop blur, bright upper rim, fine lower edge, and soft shadow. Let the topic artwork remain faintly visible behind it. | Gives the page a deliberate top layer while keeping navigation readable on changing backgrounds. |
| Moving active navigation pill | Slightly denser tint, a subtle inset highlight, and a short eased positional transition. Preserve text weight/contrast and keyboard focus. | Makes the selected destination easy to follow without turning labels into an animation. |
| Search/filter control group | One coherent tinted toolbar surface, with solid editable input interiors and clear field boundaries. | Groups controls while protecting typed text and error messages. |
| Topic artwork and home scroll stack | Original colorful artwork, readable headings, and the existing spatial transitions; use small glass badges only when they behave like controls. | Artwork and choreography already provide richness. Glass need not cover every card. |
| Books, presentation steps, reflections, forms | Warm paper/solid surfaces, generous spacing, measured shadows, and strong text. | The content should be the calm destination after exploration. |

A possible visual proof starts with approximately 80–90% light tint and a moderate blur, with a separate edge highlight and shadow. These are aesthetic starting values. The combined material must be assessed after compositing over the actual home artwork and every scroll state; transparency and blur do not guarantee contrast. Keep blur regions small, avoid nested blurred layers, and inspect scrolling on a lower-powered device before making performance claims. A solid background fallback should preserve the same hierarchy when filtering is unavailable or disabled. Do not animate continuous shimmer, refraction, noise, or blur strength behind reading text.

## Readability and material acceptance checks

The checks below are relevant acceptance evidence, not a declaration that the app meets all of WCAG:

- **Text contrast:** normal text must meet at least 4.5:1; qualifying large text at least 3:1. Include placeholders, muted helper text, hover text, and nav labels over their real composited background. Thin serif strokes may warrant additional margin beyond the minimum. [W3C contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- **Control and state cues:** required custom visual cues must meet 3:1 against adjacent colors. A decorative glass rim can be subtle, but it should not be the sole inadequate cue identifying an input or active state. [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
- **Resize and reflow:** retain all content/actions at 200% text resizing and test normal vertical pages at a 320 CSS-pixel equivalent width. Sticky or floating surfaces must not hide controls or force two-dimensional reading. [W3C resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
- **User spacing:** no content/functionality loss when line height becomes 1.5, paragraph spacing 2em, letter spacing 0.12em, and word spacing 0.16em together. These are override-test values, not mandatory authored defaults. Pay special attention to fixed-height navigation pills and clipped chapter panels. [W3C text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html).
- **Project proof:** English/Vietnamese, desktop/mobile, cold-load/fallback-only, keyboard focus, and the existing reduced-motion/static-scroll mode should retain the hierarchy. Compare the professional impression of the pair with a Be Vietnam Pro-only view. No student preference or reading-outcome result should be claimed before primary research.

## Final implementation handoff

The refinement uses **Be Vietnam Pro static 400/500/600/700** for body/UI and a single **Newsreader 500, optical size 32 official served instance** replacing Georgia in the topic/book display roles. Catalog variable capabilities are distinct from the selected instance; no `fvar` range is claimed here. The root agent reported that the earlier complete font bundle, using a Newsreader candidate retaining the full optical-size range, totaled **347,144 bytes**; that rejected comparison is an implementation measurement, not part of the current manifest.

Direct checks of `public/fonts/manifest.json` and the actual files establish:

| Retained assets | File count | Bytes |
| --- | ---: | ---: |
| Be Vietnam Pro: four weights × Latin, Vietnamese, Latin-ext | 12 | 101,464 |
| Newsreader: 500/32 instance × Latin, Vietnamese, Latin-ext | 3 | 111,344 |
| **All retained WOFF2 assets** | **15** | **212,808** |
| All four Be Vietnam Pro basic-Latin files | 4 | 53,008 |
| Newsreader basic-Latin file | 1 | 60,820 |
| **Basic-Latin files, both families combined** | **5** | **113,828** |

All 15 manifest byte sizes and SHA-256 values match the current local files. These are stored-file totals, not a browser waterfall measurement: language, actual text, weights used, caching, and route styles determine which files are downloaded. Vietnamese and Latin-ext subsets are retained so English/basic-Latin totals are not presented as a bilingual transfer guarantee.

`index.html` preloads only Be Vietnam Pro 400 Latin: **12,908 bytes**, with `crossorigin`. All 15 declarations in `src/styles/font-faces.css` use `font-display: swap` and local `/fonts/…` URLs. License notices and per-file source/size/hash records are in `public/fonts`; font loading has no runtime Google Fonts request. [Font asset README](../public/fonts/README.md).

Complete glyph rendering, fallback layout, glass contrast, font transfers on actual routes, and production behavior still require the root agent's implementation verification. This task establishes local asset integrity and declarations, not deployment, authentication, or comprehensive visual/accessibility validation.
