# Student-experience fixes — 29 September 2026

**Status:** implemented and verified locally on `codex/apple-design-preview`, based on `04e6c87`. These changes have not been committed, pushed or deployed as part of this task. The production checkout was left unchanged.

## Scope

This follows the simulated Vietnamese-student review and the user's approval to fix confusing saved-work notices, account-flow defects, storage failures, large cover downloads and student-page clarity. Simulated personas help find problems; they do not replace testing with EVG students.

Content suitability, reading difficulty and matching books to physical stock are deferred until access to EVG's library is available. This change does not edit catalogue records, change lending policy or add persistent project/goal records.

## What changed

| Area | Result |
|---|---|
| Temporary work | Goal and project previews say, before editing and after saving, that leaving the page or reloading clears the work. Project copy also explains that nothing is sent or published. |
| Search and sign-in | The book → sign-in → continue-browsing route retains the validated catalogue query, topic and page context. Callback URLs retain the same safe local destination. |
| Password visibility | Switching account modes clears passwords and returns fields to hidden. Successful password recovery uses the same reset, including when subsequent sign-out fails. |
| Form errors | Errors identify and describe the relevant input, focus the first invalid field and clear when corrected. Combined credential failures remain a form-level message. |
| Shared devices | The shared-device sign-out reminder is visible before signing in. Auth uses tab storage, with page-memory fallback if access is denied; it never falls back to localStorage. A failed deletion of known persisted auth data surfaces as a sign-out failure and can be retried. |
| Storage failure | Denied localStorage/sessionStorage access or throwing storage methods no longer blank the app. Language switching still works within the page when the preference cannot be saved. |
| Cover downloads | Catalogue, book-detail and saved-reading covers use lazy image elements, responsive Wikimedia thumbnails and fallbacks. Other valid HTTP(S) cover URLs retain their source. |
| Together | Fictional examples come first, followed by an activity link and a clearly temporary project preview. |
| Staff exercises | Recognition/moderation demonstrations moved to `/staff/training`, guarded by the existing staff boundary on configured sites. Disconnected demo mode still allows fictional previews. |
| Activities | English/Vietnamese cards now give materials, short steps, a completion reflection and a related-topic book link. Home has a direct activities link. |

## Verification

All checks below passed on the local implementation:

- `npm run lint`
- `npm run build`
- `node --test tests/*.test.ts` — **33 tests**
- `git diff --check`
- **29 integration browser scenarios:** account validation and return paths; EN/VI activity flows in configured and disconnected modes; preview notices/reset behavior; staff route guards; storage faults; and page reflow at 320, 390, 768 and 1440 pixels. No uncaught page errors were recorded by the main scenario page or storage-fault checks.
- **6 cover browser scenarios:** resized catalogue/detail downloads, supported larger candidate, failed-image fallback, deferred offscreen request and saved-reading thumbnail source.
- **2 recovery browser scenarios:** successful password update/sign-out and blocked session deletion, including retry after storage recovers and hidden password fields afterwards.
- Visual inspection of Vietnamese sign-in validation, Together, expanded activities, catalogue/detail covers and desktop Together. Viewport captures were used to inspect fixed navigation; full-page screenshots taken after scrolling can position fixed UI partway down the capture.

The original bird image was 1,345,144 bytes. Real public CDN responses during verification were:

| Candidate | Response body | HTTP status |
|---|---:|---:|
| Mobile catalogue, 500 px | 58,093 bytes | 200 |
| Detail, 960 px | 197,842 bytes | 200 |
| Larger detail candidate, 1280 px | 329,235 bytes | 200 |

The mobile catalogue response is approximately **95.7% smaller** than the original. Actual candidate selection depends on viewport and pixel density; this is a measured response-body comparison, not a total-page speed claim.

### Evidence and reproduction

The workspace retains scripts, JSON results and screenshots in [the integration evidence folder](../../outputs/student-fixes-2026-09-29/integration/):

- `browser-checks.mjs` / `results.json`
- `cover-checks.mjs` / `cover-results.json`
- `recovery-checks.mjs` / `recovery-results.json`
- `visual-checks.mjs` and PNG captures

The browser checks used local Vite servers at ports 4185 and 4186. Port 4185 used a fake `student-audit.supabase.co` URL and public fixture key, with Playwright intercepting that host's requests. Port 4186 had Supabase configuration cleared for disconnected demo mode. The scripts use the local bundled Playwright runtime and installed Chrome. Start the same isolated preview configurations before rerunning them; never substitute production credentials. No live database writes, real accounts or email delivery were used. Public Wikimedia image requests were real.

The earlier critical review remains a historical record in `outputs/student-audit-2026-09-29/CRITICAL_REVIEW.md` at the workspace level.

## Remaining release and pilot checks

1. Publish the reviewed change through the project's normal release process, then repeat the affected routes against the exact deployed commit.
2. Verify real email delivery, account recovery, saved learner records and cross-account isolation with controlled accounts. Synthetic auth responses and role guards do not prove production permissions or email delivery.
3. Ask EVG students and staff to try the revised pages on their actual devices and network. Review content suitability when the physical library becomes available.
4. Keep goal/project persistence, production moderation and reward rules in their existing deferred scope. Follow the [pilot gates](SUPABASE_PILOT.md) and [EVG handover plan](EVG_HANDOVER.md), including the creator's retained administrator/recovery access.
