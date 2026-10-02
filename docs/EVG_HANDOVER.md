# EVG project handover plan

**Status:** draft for a future handover; handover has not happened.
**Prepared:** 29 September 2026.
**Approvers:** EVG programme owner, EVG technical successor and project creator — names and date to be recorded.

## 1. Intended outcome

EVG will run the platform, manage its library, support learners and pay the agreed operating costs. Its staff should complete normal tasks without the project creator's daily involvement.

**The project creator will retain their own named application `administrator` account as a backup if something goes wrong.** They will also retain the GitHub, Vercel and Supabase access agreed with EVG for technical recovery. Application administration and vendor access are separate: keeping the website's administrator role alone does not allow a deployment rollback or database restoration.

EVG will have its own primary and backup administrators and a technical successor. Everyone uses an individual account. The creator's access is documented support access, not a shared password or EVG's only recovery path. No access is granted, removed or transferred by this document.

## 2. Current starting point and unfinished work

This section records the starting point, not final acceptance.

The 29 September student-experience fixes are [verified locally](STUDENT_FIXES_2026-09-29.md) and need release verification before being treated as deployed. Content suitability and catalogue-to-stock reconciliation will be reviewed once access to EVG's physical library is available.

| Area | Position at preparation | Evidence needed before handover |
|---|---|---|
| Public website | Hosted at [heal-edu-tech.vercel.app](https://heal-edu-tech.vercel.app). September guest tests exercised browsing, Vietnamese switching, search, filters and book details. | Repeat on the exact accepted deployment and EVG's devices/network. |
| Catalogue | The 29 September simulated student audit found six titles, all labelled as English-language books, with Vietnamese title/description translations. | Verify actual stock; agree suitable Vietnamese/bilingual content and reading difficulty with EVG. |
| Accounts and private learner records | Implemented in source; this audit had no dedicated test accounts or mailbox. | Real email receipt, verification, successful sign-in/recovery, saved reading/interests, sign-out and live cross-account isolation remain unverified. |
| Staff operations | Source supports catalogue/copy management, staff roles and circulation. | EVG operators demonstrate these with controlled accounts and fixtures; verify deployed permissions. |
| Lending | Intentionally subject to the circulation policy gate; previous release evidence records lending disabled. | Recheck live setting. Keep it disabled until EVG approves rules, reconciles inventory/paper loans and passes the rehearsal. |
| Later features | Weekly goals and several learning/community screens are previews; some reset when leaving the page or reloading. | Each feature must be implemented and verified before inclusion, or explicitly deferred from the accepted scope. |
| Recovery and ownership | Requirements exist; this handover has not verified current vendor owners, billing, backup retention or a restore drill. | Complete the access register and recovery exercise below. |

Use [README](../README.md), [PLAN](../PLAN.md), [Supabase pilot guide](SUPABASE_PILOT.md) and [dated live QA](LIVE_QA_2026-09-24.md) together. Older “migration still required” notes describe earlier stages; verify the deployed migration history rather than repeating them as current facts. A successful build or guest audit does not prove a signed-in journey.

## 3. Completion and acceptance gates

EVG and the creator first agree a **handover scope list**: included workflows, deferred features, known limitations and the accepted commit/deployment. “Project complete” means that list has passed its checks; it does not automatically mean every long-term roadmap item is finished.

All required gates below need a named reviewer, date and evidence. An unchecked gate remains open.

- [ ] **Scope and quality:** critical defects resolved; remaining issues have an EVG-approved disposition and owner. English/Vietnamese learner and staff journeys work on representative phones and shared computers. Actual EVG learners/staff review the experience; simulated agents are supporting evidence.
- [ ] **Content and inventory:** book descriptions/languages are accurate; physical copies, identifiers, condition, location and active paper loans are reconciled. EVG accepts the starter collection.
- [ ] **Accounts and privacy:** the synthetic-account tests in Section 6 pass against the intended hosted setup. EVG agrees learner access, privacy, safeguarding, retention and account-removal procedures before real learner enrolment.
- [ ] **Lending:** approved rules, named operators and checkout/return/outage rehearsals are complete before enabling circulation. A browsing-only handover must explicitly retain lending as disabled.
- [ ] **Access and ownership:** primary/backup EVG people and the creator can independently sign in with their own accounts. Vendor permissions and recovery methods are verified, not merely invited.
- [ ] **Technical recovery:** the successor deploys a reviewed change, rehearses code rollback and restores synthetic data in an isolated environment; results meet the agreed recovery targets.
- [ ] **Operations:** staff complete training independently; instructions, contacts, incident handling, costs and renewals are available to EVG.
- [ ] **Acceptance:** EVG signs the release scope, remaining limitations and support agreement. Unimplemented previews are clearly identified or hidden from normal use.

## 4. People, roles and retained creator access

Fill the named assignments before the pilot. A backup is a different person who has tested their access.

| Responsibility | Primary | Backup | Required access / duty |
|---|---|---|---|
| Programme decisions and funding | EVG: TBD | EVG: TBD | Approves scope, policy, budget and incidents affecting operation. |
| Application administration | EVG: TBD | EVG: TBD | Each has `administrator`; grants/revokes staff access and supports library operations. |
| Catalogue and library desk | EVG: TBD | EVG: TBD | `librarian`, or an administrator carrying out the duty; manages books and approved circulation. |
| Technical maintenance | Successor: TBD | Agreed backup: TBD | Reviews code, deploys, checks permissions, maintains backups and leads recovery. |
| Retained support administrator | Project creator: name/account in private register | EVG technical successor | Creator keeps `administrator`; agreed vendor access recorded separately. Contact under the support agreement. |
| Learner support and content review | EVG: TBD | EVG: TBD | Helps students and reviews content; no extra software role is implied. |

### What current roles allow

- **Student account:** own permitted reading/interests/loan views. It is not a staff membership.
- **`librarian`:** staff catalogue and circulation routes, subject to the database's permissions and lending gate.
- **`administrator`:** staff operations plus staff access management at `/admin/settings`.

There is no implemented `facilitator` role to assign. Administrators do not automatically receive access to every learner's private reading notes. Staff permissions come from `staff_members`, not display names or editable signup metadata. The database protects the last administrator; this does not replace the need for two reachable EVG administrators. It does not provide an undeletable owner role: another administrator can revoke the creator's role while another administrator remains. Retaining the creator's access is an agreed operating arrangement, recorded and reviewed by EVG, not a special technical exemption.

### Access setup and review

1. EVG primary/backup staff create and confirm individual accounts through the approved account process.
2. An existing administrator grants the necessary `librarian` or `administrator` role at `/admin/settings`. Verify each person sees the appropriate workspace and cannot perform excluded actions.
3. Verify the creator's existing named administrator remains active. Record why each retained vendor permission is needed, the contact route and an agreed review date.
4. Give EVG independent organisational access and recovery methods for the assets below. Complete any ownership transfer as a separately planned change; test integrations afterwards.
5. Store passwords, tokens and recovery codes in the agreed secure vault. Use vendor MFA where supported. Store only account identifiers and vault references in the private register; no passwords in this repository, chat or training screenshots.
6. Review access on staff departure, after a security incident and at the agreed interval: **TBD**. Any change to the creator's retained role is an explicit joint decision, not an automatic step at handover.

## 5. Asset, access and cost register

Keep the completed register in EVG's restricted operational folder. This public template contains no credentials. For every row record the actual owner, primary/backup contacts, creator access retained, verification date, billing contact and renewal/usage alert destination.

| Asset | Identifier / location | EVG owner and backup | Creator access retained | Billing / renewal owner |
|---|---|---|---|---|
| GitHub repository and release history | Repository URL and production branch: verify and record | TBD / TBD | Agreed maintainer/recovery permission: TBD | TBD |
| Vercel website | Project `heal-edu-tech`; verify team and production connection | TBD / TBD | Agreed deployment/recovery permission: TBD | TBD |
| Supabase database and Auth | Expected project `znftduqfbwfrprhawgxh`; verify before changes | TBD / TBD | Agreed database/Auth recovery permission: TBD | TBD |
| Application staff accounts | `/admin/settings`; private list of named accounts | Two EVG administrators | Creator's own `administrator` retained | Not a separate vendor bill |
| Email delivery and sender domain | Provider, sender and SMTP owner: verify | TBD / TBD | Only if required for support: TBD | TBD |
| Domain/DNS, if EVG adopts a custom domain | Registrar, DNS and renewal date: TBD | TBD / TBD | Agreed emergency access: TBD | TBD |
| Environment and secret vault | Vault reference; separate production/test values | TBD / TBD | Scoped recovery access: TBD | TBD |
| Backups and restoration tools | Verified method, storage, retention and last drill | TBD / TBD | Agreed recovery access: TBD | TBD |
| Operational documents and incident log | EVG-controlled folder: TBD | TBD / TBD | Support access: TBD | TBD |
| Content/cover assets and permissions | Source register and any future file storage | TBD / TBD | As needed: TBD | TBD |

Agree the payer and monthly limit for hosting, database, email, domain, backup storage and technical support. Record current quotes, taxes/currency, renewal dates, usage alerts and who acts before a limit is reached. Older planning allowances in PLAN are not a current quote. Free-tier assumptions and vendor seat/backup limits must be checked against the selected accounts. Recommendations or AI need a separate approved scope and budget.

## 6. Required live rehearsal with synthetic accounts

Use authorised disposable accounts, non-student inboxes and labelled test records. An approved staging setup should hold destructive or concurrency tests. For production smoke checks, agree fixtures, permitted actions and cleanup beforehand. Do not use real learners as test data or send passwords in chat.

| Test | Required result |
|---|---|
| Email and account entry | Recipient confirms receipt; signup verification, sign-in, optional magic link, recovery and invalid/expired/reused links behave correctly. Resend limits are understandable. |
| Persistence | Learner A saves a reading status, optional reflection and interests; refresh and sign-out/re-login retain expected records. Errors do not claim a save succeeded. |
| Isolation | Learner B cannot see/edit A's private records through UI or direct permitted test requests. Guests cannot read private data or write staff data. |
| Shared computer | A signs out; Back, refresh and B's next login reveal none of A's private information. Repeat across supported tabs/devices; do not assume closing a tab signs out all devices. |
| Role boundaries | Librarian can perform approved library duties but cannot grant staff roles. Administrator can manage roles. Revoked access is denied by the backend; the UI responds safely. Verify last-admin protection in isolated test data. |
| Catalogue/copies | Add/edit a synthetic book; compare physical-copy and available-copy counts; refresh; test retry/correction without duplicate records or deletion of loan history. |
| Circulation, if in scope | Exact-copy checkout, due dates/timezone, overdue display, usable/damaged returns, lost resolution, duplicate retries and simultaneous requests maintain one valid state. |
| Reading versus lending | Returning a copy does not mark a book finished; recording reading does not create a loan. |
| Connectivity/recovery | Interrupted saves show failure or pending state and retry safely; paper records can be reconciled. Restored availability matches copy conditions and active loans. |

Record environment, deployed commit, test identity labels, steps, expected/actual result, screenshots without sensitive data, reviewer and cleanup confirmation. The September audit's missing mailbox/account remains an open gate until this evidence exists. Do not disable email confirmation or loosen permissions to make a test pass.

### Lending policy approval

EVG must sign off borrower eligibility, loan limits, loan period/due-date entry, centre timezone, overdue handling, damaged/lost procedure, correction authority and outage records. Reconcile existing paper loans before digital checkout starts. Only the authorised technical owner changes the live circulation setting after the approval and rehearsal; record who, when and why.

## 7. Training and operating instructions

Prepare short Vietnamese instructions with English technical references where useful. Each trainee completes the relevant tasks without the creator taking over.

**EVG library operator**

- [ ] Sign in/out on a shared device and find `/staff/catalogue` and `/staff/circulation`.
- [ ] Add/edit a book, identify its physical copies, verify availability and correct a routine mistake safely.
- [ ] Explain the difference between reading history and a loan.
- [ ] If lending is enabled, complete checkout, return and damaged/lost procedures.
- [ ] Handle a failed save, use the paper outage log and escalate an unresolved issue.

**EVG administrator**

- [ ] Grant/revoke the correct staff role using a test account and verify the result.
- [ ] Help a user request recovery without asking for their password.
- [ ] Locate the private access/cost register, approved policy and support contacts.
- [ ] Check that the backup administrator and creator's retained account remain reachable.

**Technical successor**

- [ ] Build/test from a clean checkout and identify the production branch, deployment and database project.
- [ ] Deploy through the reviewed release process and verify the published site.
- [ ] Rehearse code rollback and a separate database restore.
- [ ] Check backup freshness, failed jobs/email, vendor usage and permission changes.
- [ ] Document incident handling and rotate a compromised credential through the correct service when required.

**Routine ownership:** operators check catalogue/loan discrepancies each operating day; the technical owner checks backup failures and service alerts at an agreed frequency; programme/billing owners review costs and unresolved issues on the agreed schedule. Fill frequencies and named backups before sign-off.

## 8. Deployment and recovery runbook

The successor must finish and rehearse the environment-specific details below. Neither a restore capability nor a response time is considered verified until demonstrated.

### A. Deploy a reviewed release

1. Identify the approved repository, branch, commit, Vercel project and target Supabase project. Record them in the release log.
2. Review migrations and API/schema compatibility before deployment. Prepare a tested recovery path and current backup for database changes.
3. From a clean checkout using the agreed Node version, run `npm ci`, `npm run lint`, `npm run build`, `node --test tests/*.test.ts` and relevant database/browser checks. Use synthetic environments for database tests.
4. Test the preview with its intended backend; do not silently connect a destructive preview to production.
5. Publish through the verified Git/Vercel workflow. Record the deployment ID, commit and applied migrations. Recheck public browsing, sign-in, saved data and staff permissions on the deployed URL.
6. Store only the required public Supabase configuration in Vite variables. Service-role and SMTP secrets stay outside the frontend. Record environment-variable names and vault locations, not secret values.

### B. Roll back website code

1. Stop further releases, capture the failing deployment and inform the incident owner.
2. Choose a previously verified deployment that is compatible with the **current** database and Auth configuration.
3. Use the rollback option available for the team's Vercel plan; verify the deployment and domain before confirming. Recheck environment assumptions and core journeys afterward.
4. Record the restored deployment, then review how production deployment assignment will resume before the next release.

Vercel rollback restores a previous deployment and can retain its older build-time configuration. Eligible targets depend on the plan, and automatic production assignment changes after rollback. Confirm current behaviour in [Vercel's rollback guide](https://vercel.com/docs/instant-rollback).

**A website rollback does not reverse a Supabase migration or restore deleted records.** Do not delete migration files or assume reverting Git reverts the database. A database problem needs a reviewed corrective migration or the restoration process below.

### C. Establish database backup and restoration

Before handover, the technical owner must complete a private backup worksheet:

- Verified backup method and plan capability: **TBD**.
- Data included/excluded: schema, records, Auth/roles, RLS policies, functions, migration history, settings/secrets and any stored files — document each separately.
- Schedule, retention, protected off-site location and failure-alert owner: **TBD**.
- Acceptable lost work (**RPO**) and recovery time (**RTO**): **TBD, approved by EVG after a funded drill**. PLAN's proposed 24-hour/one-working-day targets are not a service guarantee.
- Exact tested export/restore commands or dashboard steps, tool versions and last successful drill: **TBD**.

Supabase's available backup methods depend on the plan. Its documentation recommends regular CLI exports and off-site backups for Free projects. Database backups exclude actual Storage objects, so any future uploads need separate file recovery. Check the selected project's current capabilities in [Supabase's backup guide](https://supabase.com/docs/guides/platform/backups); this document does not claim automatic backups or point-in-time recovery are enabled here.

**Restore drill and real-incident sequence**

1. Identify the damage, record the intended restore point and estimate which later changes would be lost. EVG's incident owner approves any production restoration affecting data.
2. Pause affected writes/lending through a tested control or agreed operational pause. Keep a paper log. Preserve the current state and relevant evidence where feasible.
3. Restore the chosen backup into an isolated environment using the tested worksheet. Prevent test email/notifications reaching real users.
4. Validate accounts and role boundaries, catalogue/copies, active and historical loans, private reading/interests, RLS/functions and migration compatibility. Recalculate/check availability. Validate any other accepted features and files.
5. Measure elapsed time and data loss; resolve omissions. For a real incident, agree the production restoration/cutover and communicate downtime before proceeding.
6. Verify the restored production site with controlled accounts; reconcile paper operations and any recoverable changes after the restore point. EVG authorises resuming normal operation.
7. Record the incident/drill, backup used, omissions, verification and follow-up. A downloaded CSV alone is not a successful restore drill.

## 9. Outages, support and escalation

EVG's operator is the first contact for a learner. The technical successor investigates technical faults; the creator is a retained backup contact under the agreed support arrangement. Vendor support is used for provider faults. This does not promise the creator is continuously available.

| Incident | First action | Escalation | Acknowledgement / update target |
|---|---|---|---|
| Suspected data exposure, account misuse or corrupt loans | Stop the affected activity, preserve minimal evidence, contact the programme/technical owners | Technical successor + creator; relevant vendor as needed | TBD / TBD |
| Site/sign-in unavailable for everyone | Check scope, connection and provider status; record when it started | Technical successor, then agreed backup/creator | TBD / TBD |
| Library save fails or connectivity drops | Do not assume success; use the approved paper log and avoid repeated blind submissions | Library lead, then technical owner | TBD / TBD |
| One user's account/recovery problem | Check the documented recovery route; never request their password | EVG administrator, then technical support | TBD / TBD |
| Content correction or enhancement | Record clear steps and expected result in the backlog | Content owner or technical successor | TBD / TBD |

Agree support hours, timezone, contact channels, escalation delay, who may approve emergency production changes, and the initial support period. Acknowledgement targets are separate from repair estimates. Put private contact details in the operational pack.

For lending outages, record time, operator, borrower identifier, exact copy, action and intended due date in a secured paper log. When service returns, one assigned operator checks current state, reconciles each action once, and a second person checks discrepancies before normal digital lending resumes. Do not promise automatic offline synchronisation.

## 10. Handover pack and staged transition

### Pack to deliver

| Item | Starting reference / required completion |
|---|---|
| Accepted release and scope | Commit/deployment/migration list, included workflows and known limitations: complete at sign-off. |
| Requirements and policy | [PLAN](../PLAN.md); signed EVG scope, lending and learner-data decisions. |
| Setup, permissions and Auth | [README](../README.md), [Supabase pilot guide](SUPABASE_PILOT.md); update routes/settings to match the accepted build. |
| Test evidence | [Live QA](LIVE_QA_2026-09-24.md), [validation guide](PHASE_1C_VALIDATION.md), dated September student-simulation audit, and new real-account/EVG acceptance records. Copy the complete audit evidence into EVG's agreed pack. |
| Vietnamese operating runbook | Catalogue, copy counts, circulation, role management, recovery, shared devices and outages: finish and test with staff. |
| Technical runbook | Deployment/migration/recovery steps from Section 8, completed worksheet and witnessed drill results. |
| Private administration pack | Named access/asset register, vault references, billing/renewal record and incident contacts. |
| Training and ongoing work | Training sign-offs, open issue list with owners, support agreement and next review date. |

### Transition stages

1. **Prepare:** agree scope/owners; complete content, tests and runbooks; retain creator access; establish EVG primary/backup access.
2. **Practice:** EVG staff operate synthetic scenarios while the creator observes; the successor independently deploys and restores in isolation.
3. **Controlled pilot:** use only approved features after their gates pass; log issues and rehearse outages. Define pilot dates and exit criteria jointly.
4. **EVG leads:** staff handle routine operations and support while the creator is on the agreed backup arrangement. Duration and check-in frequency: **TBD**.
5. **Sign off and review:** accept the release, record remaining scope, verify cost/recovery ownership and schedule a follow-up. The creator retains the documented administrator and agreed technical recovery access.

## 11. Final sign-off record

Complete this record only after the required gates pass.

```text
Handover date:
EVG programme owner:
EVG primary / backup application administrators:
EVG primary / backup library operators:
Technical successor / backup:
Project creator's retained named application administrator:
Creator's retained GitHub / Vercel / Supabase permissions:
Private access register and vault reference:

Accepted site URL / repository / production branch:
Accepted commit / deployment ID / migration list:
Included workflows:
Deferred previews/features and known limitations:
Critical acceptance-test evidence:
Real-account and cross-account test evidence:
EVG learner/staff validation evidence:
Inventory reconciliation and lending-policy approval:
Circulation enabled or intentionally disabled, with reason:
Backup method / retention / last restore drill:
Measured and agreed RPO / RTO:
Staff and successor training evidence:
Billing owners / approved monthly limit / renewal dates:
Support hours / contacts / acknowledgement targets / initial period:
Outstanding issues, owners and dates:
Next access and service review:

EVG acceptance — name / date:
Technical successor acceptance — name / date:
Project creator acceptance — name / date:
```

Handover is complete when EVG can run the accepted service and recover through its agreed support arrangements. The creator's retained access supports that continuity; it does not replace EVG ownership or a working operational team.
