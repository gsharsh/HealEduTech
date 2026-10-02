# Local fonts

These WOFF2 assets provide the website's English/Vietnamese typography without a runtime Google Fonts connection.

- **Be Vietnam Pro:** upright static weights 400, 500, 600, 700 for body text and UI. [Designer source](https://github.com/bettergui/BeVietnamPro), [Google Fonts metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/bevietnampro/METADATA.pb).
- **Newsreader:** upright weight 500, optical size 32 official served instance for topic/book display headings. The upstream family offers variable axes, but these selected assets and CSS are treated as a single instance, not a declared variable range. [Designer source](https://github.com/productiontype/Newsreader), [Google Fonts metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/METADATA.pb).

Each weight/instance retains separate Latin, Vietnamese, and Latin-ext subsets. The matching `unicode-range` declarations are in `src/styles/font-faces.css`. Preserve the Latin and Vietnamese ranges together when updating; dynamic book titles and learner text must not be restricted to today's UI strings.

## Source and licensing

The files were acquired from the official Google Fonts delivery service during this local refinement on 2 October 2026. [manifest.json](manifest.json) records the exact `fonts.gstatic.com` URL, byte size, SHA-256, family, weight, and subset for each retained file. It is the source of truth for the acquired binaries.

Corresponding CSS API requests, used only to acquire the font assets:

- [Be Vietnam Pro 400/500/600/700](https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap)
- [Newsreader optical size 32 / weight 500](https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@32,500&display=swap)

The API can vary its returned format/subsets by client and evolve over time. Do not silently replace files from a fresh response: review the returned CSS, exact asset URLs, coverage, sizes, hashes, and declarations. [Official CSS API documentation](https://developers.google.com/fonts/docs/css2).

Both families are licensed under **SIL Open Font License 1.1**. The supplied notices are retained as [be-vietnam-pro-OFL.txt](be-vietnam-pro-OFL.txt) and [newsreader-OFL.txt](newsreader-OFL.txt). Keep them with distributed fonts. Review the license's redistribution and reserved-name conditions before modifying or renaming fonts.

## File budget and loading

The manifest sizes and SHA-256 values were checked against all 15 local files:

| Files | Bytes |
| --- | ---: |
| Be Vietnam Pro, all four weights and three subsets | 101,464 |
| Newsreader 500/32, all three subsets | 111,344 |
| **Total retained WOFF2 files** | **212,808** |
| Be Vietnam Pro, four basic-Latin files only | 53,008 |
| Newsreader basic-Latin file only | 60,820 |
| **Combined basic-Latin files** | **113,828** |

Stored asset totals are not per-view download totals. The browser requests subsets/weights needed by the rendered text; language, route styles, and caching change the actual transfer. A bilingual page may need more than basic Latin. The implementation comparison rejected a full-optical-range Newsreader candidate reported at 347,144 bytes across its subsets; that candidate is not retained in this manifest.

Only `be-vietnam-pro-400-latin.woff2` (**12,908 bytes**) is preloaded by `index.html`, using `crossorigin`. Every local face uses `font-display: swap`; all other weights/subsets remain demand-loaded. Body/UI fall back to the system sans stack, and display headings fall back to Georgia/Times New Roman. The runtime stylesheet uses local `/fonts/…` paths.

Before release, inspect English/Vietnamese marks, both NFC/NFD text, cold-load fallback/wrapping, and route-specific transferred bytes. Changing the font assets or CSS is separate from this README and should retain those checks.
