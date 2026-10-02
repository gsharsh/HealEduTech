---
phase: 01-typography-motion-system-hardening
runtime: codex-cli
assurance: self_checked
verified: 2026-10-02
status: gaps_found
score: 9/9 truths inspected; local technical checks pass; UI proof and human acceptance remain partial
delivery_posture: repo_only
evidence_contract:
  required_kinds: [code]
  recommended_kinds: [test, runtime, human]
  observed_kinds: [code, test, runtime]
  missing_kinds: []
git_delivery_check: |
  <git_delivery_check>
  branch: codex/apple-design-preview
  commits_ahead_of_main: 0
  pr_state: unknown
  </git_delivery_check>
gaps:
  - truth: UI outcomes have complete planned proof bundles
    status: partial
    severity: warning
    required_evidence: [code, test, runtime]
    observed_evidence: [code, test, runtime]
    missing_evidence: []
    reason: Five valid bundles remain partial because durable screenshot files and some exact planned observation/state linkage are absent. The mobile runtime used the built demo on 4193 rather than the planned fixture on 4191. Deterministic comparison blocks phase closure.
    missing: [Retained claim-specific screenshots, Exact planned observation linkage, Exact-state catalogue recovery proof]
human_verification:
  - test: Review bilingual typography and glass controls
    expected: Comfortable reading, clear hierarchy, legible controls and visible focus
    why_human: Visual and accessibility judgment cannot be certified by geometry checks
  - test: Try phone navigation and Home/Explore scrolling
    expected: Predictable navigation, comfortable motion and readable expanded content
    why_human: Interaction comfort and visual acceptance require user judgment
  - test: Try reflection/interests recovery, cover retry and presentation preview
    expected: Clear feedback, preserved supported drafts and honest page-only preview limits
    why_human: Workflow comprehension and content acceptance need conversational UAT
---

# Phase 01 verification

The local technical checks passed. Formal GSDD closure remains **gaps_found** because the planned UI proof comparison is partial and user UAT has not been performed. This is evidence debt, not a claim that seven or nine product features are broken. No phase-status completion was performed.

## Verification basis

Read SPEC, ROADMAP, 01-01-PLAN and 01-01-SUMMARY before app inspection. No previous phase VERIFICATION existed. The nine frontmatter truths are the strongest scope source. The summary handoff is codex-cli/self_checked, with three deltas: retrospective provenance, narrowed scope, and local-versus-hosted limits. Its judgment requires preserving private learning, normal scrolling, committed catalogue identity, disabled lending and page-only previews. The current runtime/vendor is the same; assurance remains self_checked.

`control-map --json` found no planning drift or checkpoint. `lifecycle-preflight verify 01 --expects-mutation phase-status` allowed verification, with warnings for the dirty checkout and a stale sibling worktree registration. Those warnings are not application defects. The local phase is repo_only; UI and concurrency behaviors additionally require runtime evidence. This report does not certify delivery.

## Observable truths and requirement coverage

| Requirement / truth | Technical result | Evidence and closure limit |
|---|---|---|
| UI-TYPE-01: local bilingual typography/fallbacks | Supported | Imports/tokens/local declarations wired; 15 source/build/HTTP font checks pass; EN/VI runtime renders. Human reading judgment remains open. |
| UI-GLASS-02: legible functional glass and opaque fallbacks | Supported within sampled/source scope | Material tokens consumed by header/controls; opaque writing surfaces; preference/support fallbacks inspected. Actual OS preference switching and human visual acceptance are not certified. |
| FR24-NAV: five destinations and mobile disclosure | Supported | Fresh open/focus/Escape/route/outside/back/resize checks and 20 bilingual 320/390 layout assertions pass. Exact planned environment/screenshot proof is partial. |
| FR25-ACT: three usable activities | Supported | Six bilingual Enter disclosure checks, ordered content, inert closure and related links; runtime static fallback. Touch/screen-reader and content judgments remain open. |
| NFR17-STACK: optional shared motion | Supported | Shared hook plus six viewport checks, settled oversized expansion, reversible scales and no captured warnings/errors. Enlarged-text evidence is inherited; OS reduced-motion switching is not newly executed. |
| FR11-INTERESTS: serialized replacement | Verified locally | Fresh reading SQL suite plus paired client replacement leaves exactly the later set; owner/invoker boundary retained. |
| FR07-CORRECTION: copy-first locking | Verified locally | Fresh checkout/correction contention rejects unsafe correction with SQLSTATE 55000 and coherent final copy/loan state. |
| FR23-CATALOGUE: committed-ID cover recovery | Supported | Typed error and form recovery are wired; two fresh unit tests pass; earlier fixture one-create/one-update observation retained. Exact-state durable screenshot/replay is partial. |
| QA-LOCAL-01: reproducible scoped evidence | Partial | Fresh command logs, file hashes and reports retained locally; five UI bundles validate but comparison is partial. UAT remains unperformed. |

All nine SPEC/ROADMAP requirements are claimed by the plan and map to evidence above; no orphan requirement exists within this phase. These aliases cover only the narrowed original FR03/FR07/FR11/FR23–25 and NFR03–05/07/09/11/15–17 slices. They do not close the full product requirements or hosted deployment gates.

## Artifact verification (exists / substantive / wired)

| Artifacts | Levels 1–3 | Key link |
|---|---|---|
| font-faces.css, typography.css, materials.css, fonts/manifest and assets | Pass | main.tsx imports → shared tokens → rendered controls; local paths → matching built/served WOFF2 |
| AppShell.tsx and app-shell.css | Pass | disclosure state → nav visibility/ARIA/focus/route handlers |
| ScrollStack.tsx, HomePage, ActivityStack, ActivityCard and CSS | Pass | both live/demo Explore routes → shared stack → content/fit/motion guards and native scroll |
| corrective migration and run-local.py | Pass | public/private functions → locks and RLS → fresh migration/suite/paired-client execution |
| catalogueErrors, catalogueEditorRecovery, BookManagement, catalogue service | Pass | RPC partial failure → committed book ID → editor recovery → update retry |
| Existing verification/UML reports | Pass for documentation | implemented/planned boundaries and current source relationships; inherited evidence is identified |
| Five observed UI proof bundles | Exists/substantive; closure wiring partial | Metadata validation passes; deterministic compare reports missing screenshot type, incomplete observation linkage, and mobile environment mismatch |

## Fresh verification

- Lint, production build and diff check: exit 0.
- Node tests: 35/35 passed.
- Disposable PostgreSQL 18.4: 17 migrations, five SQL suites and five paired-client probes passed; stopped/removed cluster; no hosted writes.
- Fonts: 15/15 source/build/HTTP hashes, sizes and WOFF2 signatures matched; 212,808 stored bytes, not a measured transfer budget.
- Browser: 20 EN/VI route geometry checks; six activity interactions; six shared-stack viewport checks; targeted menu and reversible-scroll checks passed. No captured warning/error logs in sampled fresh flows.
- Anti-pattern scan found no scoped TODO/FIXME/HACK/XXX, console-log-only handlers or empty catches. Static demo/previews are labelled intentionally, not substitutes for live persistence.

Raw local evidence is under `.planning/.local/verification-01/`: command logs, database-verified/results.json, fonts.json, source-sha256.json, browser-and-source-report.md and ui-comparison.json. It is ignored by Git and is not public proof. The earlier broad layout/private/staff fixture coverage remains in docs/VERIFICATION_2026-10-02.md and is explicitly inherited rather than newly rerun.

## Grouped proof gaps and human handoff

All five `ui-*-UI-PROOF.json` files pass metadata validation. Deterministic comparison returns partial, exit 1. CUA was the available browser equivalent; captures were displayed in chat but no durable screenshot export path was exposed. Report artifacts remain available. The checker also requires exact observation strings/state/environment equality; current bundles intentionally retain narrower actual observations instead of asserting unexecuted states. Do not mark them satisfied just to satisfy the checker. Capture the missing exact-state screenshots, reconcile the planned environment/observation mapping, then compare again.

User UAT is still needed for typography/glass, navigation, activities/motion, reading/interests recovery, catalogue partial-save comprehension and presentation-preview boundaries. No user response has been recorded as a pass. The subsequent explicit request to push all changes authorizes a separate release task; it does not retroactively turn UAT or this local phase into passed.

## Git/delivery observations

At verification, branch codex/apple-design-preview was based on 04e6c870dea3df6923e0cfb38c987723bbe5be7b, zero commits ahead of main, with intentional tracked and untracked changes. gh was unavailable, so PR state is unknown. Delivery metadata is a warning/context snapshot. Future release results must identify the actual pushed SHA, Vercel deployment and verified Supabase project independently.

Next GSDD step: collect the missing UI proof and conversational UAT, then reverify. Keep ROADMAP in progress.
