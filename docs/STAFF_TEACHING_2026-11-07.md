# Library and teaching support — 7 November 2026

The same staff may run the physical library and facilitate learning. This candidate uses the existing **librarian** role for those duties, and **administrator** for staff access and lending-policy administration. It does not invent a third teacher role with ambiguous overlapping authority.

## Roles and use cases

| Actor | Available work | Enforced boundary |
| --- | --- | --- |
| Visitor | Browse books, Explore resources, classroom activity plans and approved discoveries/comments | No private learner or staff records |
| Learner | Own reading/interests, private notebooks, submit/withdraw work, encouragement, submit/withdraw comments | No other learner's private data; cannot approve publication |
| Librarian / teaching staff | Create/update catalogue, safely remove unused titles, manage loans, inspect student reading summaries, review submitted work/comments | Private reading reflections and selected interests are excluded; unsubmitted notebook drafts are excluded |
| Administrator | Staff duties plus grant/change/revoke staff roles and administer lending policy | Last-administrator protection and server-checked authority remain in place |

Student profiles show current reading/finished counts, individual titles and topics, topic totals across the student's full reading list, borrowing history, and a direct link to that student's submitted Together work. The comments review queue is explicitly for all classroom comments. Topic counts come from reading records, not private preference selections or an inferred ability score.

## Recorded dates, without invented measurements

Migration `20261106181400_staff_reading_timeline_and_catalogue_removal.sql` adds nullable `reading_started_at` and `reading_finished_at` to reading records. A server trigger records actual status transitions:

- New **currently reading** record: recorded start, unknown finish.
- New **finished** record: recorded finish, unknown start.
- Reading → finished: retain recorded start and record finish.
- Finished → reading: begin a new recorded cycle and clear the finish. Preserve the learner's reflection.
- Reflection-only update or same-status retry: preserve dates.

Legacy dates remain unknown. Generic `created_at` / `updated_at` values are not relabelled as reading start or completion. The displayed interval is elapsed whole days between recorded changes, **not hours spent reading, comprehension, effort, or reading speed**. This is one current cycle per title, not a session/event-history service.

Clients cannot supply false timeline values or transfer the dates to another book/account. Trigger time is sampled after row locking and uses the previous timestamp as a lower bound, preserving order when concurrent writes wait. Existing RLS still restricts reading records to their owner. The staff JSON projection selects explicit fields and never includes reflection text.

The frontend tolerates the older hosted RPC projection: unavailable dates display **Not recorded**, and absent topic summaries are identified. Apply the migration before claiming new timeline capture is active.

## Safe catalogue removal

Staff can remove an unused catalogue entry after reviewing its exact title in a keyboard-accessible confirmation dialog. The RPC checks staff authority, locks the title and copies, compares the confirmed metadata/copy-count snapshot, and refuses removal if **any reading or loan history** exists. A concurrent change returns `PT409`; the dialogue requires refresh and a new confirmation. Unused copies and the unused title are removed together. A retry after a completed deletion returns an absent result without creating a second side effect.

This protects past records and concurrent checkout. It is not an archive/retirement feature for historically used books; those remain editable. Role, history, missing-backend, quota and generic failure messages keep the dialogue actionable. There is no hosted catalogue deletion in this sprint.

## Verification and morning checks

- `supabase/tests/staff_learning.sql`: recorded and legacy dates, forged timeline/identity denial, staff-only summaries, private-note exclusion, protected history, repeated deletion and copy cleanup.
- Disposable concurrent clients: removal versus checkout in both lock orders.
- `tests/teaching.test.ts`: absent/invalid/reversed timestamps do not produce fabricated durations.
- `tests/browser/teaching-workspace.spec.ts`: student dates and topic summary, old-data fallback, student-filtered review link, axe/reflow, removal cancellation, protected failure and successful removal.

Final integrated counts are in the [sprint release report](SPRINT_RELEASE_2026-11-07.md). Real staff acceptance, lending policy approval, physical stock checks and hosted migration verification are distinct release gates.
