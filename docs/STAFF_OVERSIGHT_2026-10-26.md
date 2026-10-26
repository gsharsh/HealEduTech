# Staff oversight and overdue follow-up

Implemented locally on 26 October 2026 in `codex/apple-design-preview`. No hosted migration, production data write, commit, push or deployment was performed for this increment.

## Staff workflows

Both librarians and administrators can open `/staff/students`, student detail pages and `/staff/dashboard`. The directory includes existing non-staff Auth accounts, even those not registered for lending. Names and language are existing account metadata; email and joined dates come from Auth. Staff cannot edit another student's account from these pages. Borrower registration uses a searchable student picker and retains the existing eligibility and lending-policy checks.

The directory and reading/loan histories are paginated in the database. Staff receive only book titles, reading status and counts. The reading table's owner-only RLS is unchanged; reflections and interests are not returned by staff APIs. Learner-facing explanations distinguish staff-visible reading status from private written reflections.

## Dashboard definitions

- Loan health: unresolved loans, distinct active borrowers, all overdue loans, and unresolved loans due today through six days after today.
- Overdue ageing: unresolved loans 1–7, 8–14, or 15+ calendar days overdue.
- Reading participation: non-staff accounts with a current-reading record, plus the sum of distinct student/book records currently marked finished. These are self-reported current states, not historical monthly completions or verified reading.
- Lending trends: checkouts and actual returns by centre-local Monday-start week, including the current partial week. Lost resolutions do not count as returns.
- Popular books: top five titles by checkout count in the selected trend period. Links open full borrowing history for that title.
- Inventory: usable copies without active loans, borrowed copies, damaged copies and lost copies. Withdrawn copies are excluded.

The trend selector offers 4, 12 and 52 weeks, defaulting to 12. Other metrics remain explicitly labelled current snapshots. All totals are calculated in SQL rather than from a browser download subject to the API row limit.

## Follow-up and contact semantics

A loan is overdue the day after its due date in `circulation_policy.timezone`. It enters the shared staff alert count at seven calendar days overdue. For example, a book due 19 October raises the staff alert on 26 October. Alerts are computed from current unresolved loans and refresh when staff open/refocus the workspace or change relevant data. Contact recording does not hide an alert. Returning the book or resolving it as lost removes it from the attention queue.

Email student prepares a `mailto:` draft in the student's saved EN/VI language, with English fallback. The draft contains recipient, title, copy code, due date, days overdue and a return request. Staff review and send through their own email service. Read-only fields and a copy action provide a fallback. No email service, scheduler, automatic student messages or student notification inbox is introduced.

Record contact is a separate staff assertion that email contact took place. Append-only history contains the loan, acting staff member, recorded name, server timestamp and email channel. It is not evidence of delivery or reading. Request IDs make uncertain retries idempotent; recording contact and resolving loans are serialized without introducing a copy/loan lock-order inversion.

## Backend and release

`20261026090000_staff_oversight.sql` adds protected staff RPCs and the `loan_contacts` table. The new private schema and contact table have no direct guest/authenticated access. Public staff RPCs have explicit role checks, fixed search paths and restricted execution grants. They project the approved fields without exposing Auth tables or private reflections.

Before release, inspect the exact target project's migration state; apply any missing earlier migrations in order, including the existing secure-availability migration, then the staff-oversight migration. Deploy the matching frontend and verify actual administrator, librarian and two student accounts through PostgREST. Confirm students/guests are denied staff RPCs, private reflections stay owner-only, both staff roles see the same contact history, account switching clears private UI, and a real configured email app receives a correctly encoded draft. Record hosted results separately; local SQL tests and synthetic browser fixtures do not prove hosted behavior.

## Local verification

- `node --test tests/*.test.ts`: 44 tests passed, including seven-day/timezone follow-up boundaries, email recipient/URI encoding, missing recipient, staff sign-in return routes, page parameters and centre-local timestamp formatting.
- `npm run lint` and `npm run build`: passed.
- `python3 supabase/tests/run-local.py`: 19 migrations, seven rollback SQL suites and eight concurrent-client probes passed. Synthetic fixtures exceed 1,000 students and loans. The disposable database was removed. The runner uses a minimal local Auth shim, not GoTrue/PostgREST/JWT verification.
- Browser verification used a loopback-only synthetic API and local Vite server, never hosted credentials or student records. All 32 layout checks passed: dashboard (including 52 weeks), directory, student detail and circulation at 320, 390, 768 and 1280 CSS pixels, in both English and Vietnamese. A narrow 52-week chart overflow found during testing was fixed and rechecked.
- Browser scenarios passed for librarian/administrator access, student denial of all staff routes, staff-to-student account clearing, directory search/pagination, student profile/reading/loan displays, dashboard periods, six-day overdue versus seven-day attention, encoded Vietnamese email drafts, clipboard fallback, contact history/success feedback and return removing the attention badge. No browser console errors were observed at final verification. Mail-app launching and actual email delivery were not tested; the URL and copyable draft were inspected without sending email.
- Synthetic browser evidence and the saved preview are in the workspace's `outputs/staff-oversight-2026-10-26/` directory. SQL evidence is `/private/tmp/healedutech-staff-oversight-sql-20261026-r3/results.json`.
