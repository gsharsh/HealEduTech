# Warm palette and simpler learning pages

This review update supersedes the Sorbet palette and long Explore/Together layouts described in the earlier 7 November sprint report. It remains on `get-stuff-done-harshith`.

## Colour and hierarchy

The supplied palette now has defined roles:

| Role | Colours | Use |
| --- | --- | --- |
| Main canvas | Warm off-white `#FBF8F4`, paper `#FFFDFA` | Page backgrounds and readable content surfaces |
| Supporting surfaces | Blanket `#F2E0CF`, Mushroom `#D4C7B4`, a lighter neutral `#F2EBE2` | Warm gradients, section frames, selected options and the homepage illustration |
| Primary action | Autumn Fern `#854628` | Main buttons, active navigation and actionable links |
| Text | Kimber `#2D2D23`, muted `#655E51` | Headings, body text and supporting information |
| Small supporting details | Oak `#B48954`, Khaki Moss `#7C7458` | Restrained illustration/chart details; not low-contrast small text |

The 60–30–10 reference guides relative emphasis rather than an exact pixel quota. Neutral space leads; supporting colour groups content; the strongest colour points to actions. Semantic errors, destructive actions and warnings retain their own meaning. The existing homepage SVG and favicon were recoloured to match.

Following the request to make the palette more visible, the canvas and header now have a broad warm gradient. Mushroom frames and soft warm shadows define the homepage artwork, topic cards, library filters and staff/account panels. Explore has a single cream gradient around its topic selector and tabs. Together uses a framed activity panel and a stronger Blanket-to-Mushroom selected state. Repeated badges and decorative containers remain reduced so these larger colour areas carry the hierarchy.

Calculated contrast includes 13.13:1 for body text on the canvas, 6.06:1 for muted text on the canvas and 7.12:1 for primary-button text. Exact Mushroom needs dark ink; it is not a suitable background for the smaller muted or rust text colours.

## Explore

- A plain heading, one sentence and a compact topic selector replace the decorative introduction and large topic cards.
- **Books** is the default view. **Resources** and **Activity** show one type of content at a time.
- Personal suggestion reasons remain; repeated generic “more in this topic” messages are removed.
- Resources retain publisher, language and external-link information. Optional questions sit behind a disclosure.
- Activity instructions appear directly within the activity view, without another large image and expansion step.
- Saved interests remain available under **Your interests**. The editor stays mounted, and a loading failure opens it so the recovery action is visible.
- Topic and view are represented in the URL. Keyboard users can navigate the tabs with arrow keys, Home and End.

Catalogue ranking, request bounds and identity separation are unchanged. No AI service or new connector is added.

## Together

- A short introduction leads to three concise choices: **Book talk**, **Gallery** and **Book review**.
- Only the selected activity's instructions appear, with one primary next action.
- The five-week class plan is optional. Decorative book art, repeated slogans and the full-page stack of instructions are removed.
- When the backend supports the workflows, **My work**, **Class bookshelf** and the staff-only **Teacher review** are separate views.
- Open notebooks and teacher notes stay mounted when changing views. A later failure to refresh the public bookshelf does not destroy an open draft.
- When online notebooks/sharing are unavailable, the page gives one explanation and a real downloadable text activity sheet for classroom use. It does not display a save form that cannot work.
- Private drafts, explicit submission, teacher approval, moderated feedback, version conflicts and deletion confirmation retain their existing contracts.
- Starting an activity at the 25-notebook limit opens an existing notebook and explains the limit instead of offering a new outline that the server would reject.

## Review and deployment boundary

The local review server is `http://127.0.0.1:4177`. Existing authenticated operations still use the configured hosted backend. This update does not apply database migrations, change permissions or enable a hosted learning service. The three pending migrations and acceptance checks remain documented in the [sprint report](SPRINT_RELEASE_2026-11-07.md).

The browser suite covers English/Vietnamese, desktop/phone layouts, keyboard tabs, hidden views, retained writing, failure recovery and colour contrast. The [branch's CI history](https://github.com/gsharsh/HealEduTech/actions?query=branch%3Aget-stuff-done-harshith) records the integrated verification results.

Local verification passed: ESLint, production build, 108 Node tests and a 178-check full browser run. After the stronger frames/gradients and notebook-capacity fix, 86 focused desktop/phone checks passed across accessibility, navigation, palette and Together flows. An independent source review confirmed the capacity fix. These checks do not replace the hosted acceptance items above.

## Screenshots

These browser-test captures use synthetic catalogue fixtures. The Together captures show the offline classroom fallback, matching the current hosted service boundary. The local site uses the configured real catalogue.

| View | Desktop | Phone |
| --- | --- | --- |
| Home | [Warm homepage](review/2026-11-07-autumn/autumn-home-en-desktop.png) | [Mobile homepage](review/2026-11-07-autumn/autumn-home-en-phone.png) |
| Explore | [Books view](review/2026-11-07-autumn/autumn-explore-en-desktop.png) | [Mobile books view](review/2026-11-07-autumn/autumn-explore-en-phone.png) |
| Explore in Vietnamese | [Vietnamese desktop](review/2026-11-07-autumn/autumn-explore-vi-desktop.png) | [Vietnamese phone](review/2026-11-07-autumn/autumn-explore-vi-phone.png) |
| Together | [Classroom activity](review/2026-11-07-autumn/together-classroom-plan-desktop.png) | [Mobile classroom activity](review/2026-11-07-autumn/together-classroom-plan-phone.png) |

## Design references

The supplied [60–30–10 article](https://wpmayor.com/the-60-30-10-rule-made-our-website-designs-infinitely-better/) informed the colour roles. The supplied [Blumango guidance](https://www.blumangocreative.com/blog/hows-your-colour-palette-looking-on-your-website) reinforces consistent colour use and whitespace. Apple's [layout](https://developer.apple.com/design/human-interface-guidelines/layout) and [writing](https://developer.apple.com/design/human-interface-guidelines/writing) guidance informed progressive disclosure, clear action labels and shorter copy; web controls and keyboard conventions are retained.
