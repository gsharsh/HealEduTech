# EVG reading-table design preview

27 September 2026. Local comparison only; no production deployment, no push to main, no Supabase changes.

## Design review: homepage and onboarding

### Summary

Current direction: **Good**, with a high-priority first-visit improvement. This is a React web app for EVG students, not a native Apple app. Apply the HIG's clarity, accessibility, layout and writing principles; do not impose native menu bars, Apple-only authentication or phone gestures.

The proposed screen's job is to help a student choose a book immediately. Its signature is a quiet reading table with large book-shaped artwork, EVG green, and clear everyday words. It deliberately avoids dashboard statistics, rewards and features that are not part of the verified pilot.

Evidence: reviewed current `AppShell`, guest `LiveLearningPage`, `SignInPage`, shared styles, and prior live screenshots. This is not a full accessibility certification or evidence of student comprehension. Real-account/email tests remain outside this design prototype.

### Improvements

- **High — first visit prioritizes an account over discovery.** `/` redirects to `/learning`, whose guest view leads with a sign-in invitation; the catalogue is one step away. Promote “Browse books” on a welcoming homepage and make an optional guide secondary. `managing-accounts.md › Best practices`: “Delay sign-in for as long as possible.”
- **Medium — introductory language can be more concrete.** “My learning”, “Together” and “Find a little wonder” need interpretation. In this comparison, use “Home”, “Library”, “My reading”, and explain what a student can actually do. `writing.md › Getting started`: “Choose simple, plain language”. This terminology choice is design judgment, not a demand to rename the production app.
- **Medium — onboarding lacks an explicit first small success.** Let students select a topic and find a book without setting up an account. Keep “Skip” and browsing available, and offer the guide again from navigation. `onboarding.md › Best practices`: “Teach through interactivity.”
- **Medium — compact text is too small for a student-first default.** Existing shared compact rules include 10–11px header controls and 12–13px body/button text. The comparison uses 17px body, at least 14px supporting text, and at least 48px main controls. `typography.md › Ensuring legibility`: “Use font sizes that most people can read easily.” These web sizes are our chosen targets, not a claim that CSS pixels equal native points.
- **Medium — account choices need context.** Explain that an account saves a reading list and private notes; keep browsing available. Show the shared-device sign-out reminder near the account action. `managing-accounts.md › Best practices`: “Explain the benefits of creating an account and how to sign up.” Do not advertise social sign-in, passkeys or anonymous saving as live features.
- **Medium — verify whether students can use email before adopting account onboarding.** The existing registration and recovery flows require an accessible inbox. The prototype should explain this requirement and keep browsing open to students who do not have one. EVG must decide the supported assisted-account process; this preview does not invent one. This is product judgment based on the current email-only implementation.

### What works

- Keep English/Vietnamese support and EVG's green identity.
- Keep direct catalogue access, labelled fields, clear recovery errors and a guest exit from account screens.
- Keep private notes separate from public features; do not suggest they will be shared with classmates.
- Keep loading/error and empty-state next actions when connecting this design to live data later.

### Craft notes

The initial generic hero idea was reduced to one product-specific signature: books resting on a reading table. No dashboard metrics, decorative numbered badges, glass panels or large marketing claims. Numbering is only useful if it represents actual onboarding steps. Familiar HTML controls carry interaction; book shapes and EVG color carry identity.

## Plan before implementation

### Semantic color tokens

Ratios use WCAG relative luminance from exact hex values, not screenshots.

| Role | Light | Dark | Contrast check |
| --- | --- | --- | --- |
| Canvas | `#F5F7F5` | `#15221D` | Text on canvas: 13.52 / 15.06 |
| Surface | `#FFFFFF` | `#1E3028` | Muted text on surface: 6.06 / 7.41 |
| Text | `#172D28` | `#F2F6F3` | See canvas |
| Supporting text | `#566660` | `#B1C1B7` | See surface |
| Action | `#24644D` | `#93D8AE` | White on light action: 6.99; dark canvas text on dark action: 9.91 |
| Error | `#A5372A` | `#FFB4A8` | Light surface / dark canvas: 6.60 / 9.66 |

System-font stack for UI and display; weight and size create hierarchy. Body 1.0625rem, supporting 0.875rem minimum, section headings about 1.5rem, main heading 2.25–3.75rem. Book-title artwork can have its own restrained serif style. No external fonts or image downloads are necessary for the comparison.

Layout: one direct invitation beside a shelf illustration, followed by topic choices and books; on compact screens all content follows one reading order.

```text
Regular
[ EVG             Home  Library  My reading      Language ]
[ Welcome + Browse books       |       Reading table      ]
[ Topic choices                                          ]
[ Book       Book       Book       Book                   ]
[ Optional quick guide / help                            ]

Compact
[ EVG                                  Language ]
[ Home           Library             My reading ]
[ Welcome                                      ]
[ Browse books / optional guide                ]
[ Reading table                                ]
[ Topics                                       ]
[ Book                  Book                   ]
```

No autoplay, carousel or introductory animation. Solid surfaces need no reduced-transparency fallback. Use visible keyboard focus, wrapping content, dark appearance through system preference, reduced-motion and increased-contrast rules. Review at 320px and a wide desktop size, with enlarged text where supported.

## Prototype boundaries

- Entry: `/design-preview`; existing app routes remain unchanged.
- Sample catalogue and reading state only. No production availability claims.
- Account walkthrough uses a demo continuation, not email/password collection or real signup.
- Any saved demo notes are temporary; no Supabase writes.
- No borrowing, public sharing, recommendations or AI implied.
- Account-provider mounting is bypassed on the preview route. The existing app's imported Supabase client may still initialize if environment configuration exists, but the prototype does not call it.
- Adoption requires a separate decision and integration pass; it is not approved by viewing this preview.

## Onboarding acceptance criteria

1. A first visitor can reach books without an account or tutorial.
2. The optional guide explains one task at a time and has a clear way out.
3. A topic selection leads to the corresponding filtered books.
4. Selecting a book shows details with an obvious return path.
5. Saving prompts an honest demonstration of why an account is useful; it never asks for real credentials.
6. Reading state is visibly sample data and can be cleared by leaving the demo account.
7. English and Vietnamese preserve the same actions and meanings; EVG language review remains necessary.

## Verification

- Local preview: `http://127.0.0.1:5178/design-preview`, branch `codex/apple-design-preview`. No commit, push or deployment for this comparison.
- Build, lint, existing 17 automated regression tests and whitespace validation passed. The existing main-bundle size warning remains; preview code is lazy-loaded separately.
- Browser exercised optional guide → Nature → two sample books → unaccented Vietnamese search `hat` → one matching sample → detail → account explanation → demo continuation → saved sample note → demo sign-out → empty reading state.
- English/Vietnamese homepage and navigation checked. Sample cover artwork intentionally stays English and is language-tagged; displayed book names and descriptions are translated. EVG Vietnamese review remains needed.
- Compact and wide layouts checked with 320px and 1440px viewport requests. Browser zoom reported approximately 291px and 1309px inner widths; document widths did not exceed those inner widths.
- System dark appearance was visually checked, including primary action text `#15221D` on `#93D8AE` (9.91:1). Light tokens were calculated, but a full light-appearance browser pass was not performed.
- No backend operations are performed by the prototype. All fictional sample catalogue/account/reading data is clearly labelled and temporary.
- Largest accessibility text/200% zoom, full screen-reader traversal and representative student comprehension are not certified by these checks. Contrast calculations validate the token pairs only, not every decorative artwork label.

### Final design judgment

The preview is **Good** as a comparison prototype: it gives guests an immediate useful action and introduces saving only after choosing a book. Removed the extra artwork badge so the book illustration does not compete with navigation. It is not yet a production integration or proof that students prefer it; ask students to find a book, change language and explain what saving does before choosing this direction.
# Cream and glass revision — 27 September 2026

This revision supersedes the initial preview's automatic dark palette. The user's preferred cream canvas (#f8f5ed), deep green text and green actions now apply regardless of device theme. The Apple Singapore navigation reference informed a slim, full-width, evenly spaced desktop navigation bar; mobile keeps labelled links and account access.

Following apple-design's Materials and Liquid Glass guidance, CSS glass effects are limited to navigation and functional controls: sticky header, secondary actions, onboarding topic controls and the library filter toolbar. Reading surfaces stay opaque. These are web approximations, not Apple's native Liquid Glass. Reduced-transparency, increased-contrast and unsupported-filter fallbacks use opaque surfaces.

Browser checks confirmed the cream canvas and header blur, desktop and 375px mobile layouts without horizontal overflow, navigation to the library, search filtering to one sample result, and Vietnamese labels. This remains an isolated sample-data preview; no main push, production deployment or database changes.
