# HealEduTech library UX — October 2026 local increment

## What We're Building

This retrospective phase records the latest local increment for the bilingual EVG library: a readable local type system, restrained glass controls, discoverable Home/Library/My reading/Explore/Together navigation, accessible Explore activities, optional Home/Explore motion, and two backend race corrections with catalogue recovery. It is a planning and evidence contract for the existing `codex/apple-design-preview` checkout, not a new production release or a claim that the full 25-FR plan is complete.

## Core Value

Learners can browse, read, explore, and recover their own work through a clear bilingual interface while local verification stays honest about what has and has not reached hosted production.

## Core Principles

- Preserve the existing account, owner-private reading/interests, staff access, and database boundaries.
- Make motion optional: native scrolling, readable static fallbacks, keyboard access, and no automatic advance.
- Keep glass treatment to functional controls; reading and writing surfaces remain opaque and readable.
- Treat local synthetic/browser/database evidence as scoped engineering evidence; do not convert it into hosted, learner, or deployment proof.
- Keep lending disabled and all goals, presentations, facilitator feedback, recommendations, and publication previews non-persistent until their separate gates pass.

## Typed Data Schemas

```typescript
type Runtime = 'codex-cli' | 'claude-code' | 'opencode' | 'other';
type Assurance = 'unreviewed' | 'self_checked' | 'cross_runtime_checked';
type EvidenceKind = 'code' | 'test' | 'runtime' | 'delivery' | 'human';
type LearnerInterest = 'nature' | 'stories' | 'science';
type LocalIncrement = {
  route: string;
  evidence: EvidenceKind[];
  productionClaim: false;
};
```

## Capability & Security Gates

- **Hosted writes:** No Supabase migration, seed, setting, account, email, or learner-record write is authorised by this phase.
- **Lending activation:** Keep the circulation policy disabled until EVG approves policy, inventory, paper reconciliation, and operator rehearsal.
- **Private learning:** Preserve owner-only reading/interests RLS; do not add cohort, facilitator, project, feedback, or recommendation access.
- **Production/release:** No deployment, merge, commit, or public proof claim belongs to this phase.

## Requirements

### Must Have (v1)

- [ ] **UI-TYPE-01**: The bilingual UI uses local Be Vietnam Pro and Newsreader declarations with explicit fallback behavior and no required remote font. [Done-When: font declarations, manifest, built-font checks, and readable fallback evidence are recorded locally.]
- [ ] **UI-GLASS-02**: Functional glass controls remain legible and use opaque fallbacks for reduced transparency, increased contrast, or unsupported filtering. [Done-When: source and local browser checks show readable controls and quiet opaque reading surfaces.]
- [ ] **FR24-NAV**: A learner can reach Home, Library, My reading, Explore, and Together at narrow widths with keyboard-safe disclosure behavior. [Done-When: EN/VI mobile checks cover open, focus, Escape, route selection, resize, and no horizontal overflow.]
- [ ] **FR25-ACT**: A learner can open and close all three Explore activities with touch or keyboard and read their materials, ordered steps, reflection, and related-book links without required motion. [Done-When: local browser checks cover activity state, focus, reduced-motion/static fallback, and bilingual layout.]
- [ ] **NFR17-STACK**: Home/Explore scroll enhancement is optional and falls back to normal flow when content cannot fit or motion is reduced. [Done-When: short/mobile/enlarged-text/reduced-motion transitions preserve usable content and no scroll hijacking.]
- [ ] **FR11-INTERESTS**: Whole-set learner-interest replacement is serialized per authenticated owner. [Done-When: paired local clients produce the later submitted set exactly, with owner RLS and rollback preserved.]
- [ ] **FR07-CORRECTION**: Loan resolution/correction checks lock the copy before rechecking active-loan state. [Done-When: paired local checkout/correction probes show no duplicate active loan and expected conflict outcomes.]
- [ ] **FR23-CATALOGUE**: A cover-only catalogue failure clearly reports the partial save, keeps the draft, and retries against the existing book ID. [Done-When: local fixture evidence shows one create, one update, preserved cover draft, and no duplicate create.]
- [ ] **QA-LOCAL-01**: The increment has repeatable local lint, build, unit, migration, browser-layout, browser-interaction, font-integrity, and bundle-smoke evidence with explicit claim limits. [Done-When: `docs/VERIFICATION_2026-10-02.md` and `docs/SYSTEM_UML_2026-10-02.md` identify commands, synthetic scope, and unverified hosted/UAT boundaries.]

### Nice to Have (v2)

- **NFR03-DEVICE**: Representative EVG learner/device and network usability sessions after survey access.
- **FR19-RECOMMENDATIONS**: Preferences-first rules baseline and later recommendation evaluation after the 5 October design work and January 2027 Vietnam rollout gate.
- **FR12-17-LEARNING**: Persistent goals, projects, assigned feedback, moderation, and managed resources with separate schemas and access tests.

### Out of Scope

- Production deployment, hosted Supabase/Auth/email/API certification, real learner accounts, student outcomes, or cross-browser/assistive-technology certification — local evidence does not establish these claims.
- Lending activation, physical checkout, fines, reservations, reservations, renewals, or operator policy changes — EVG policy and rehearsal gates remain open.
- Persistence for goals, presentations, facilitator feedback, recommendations, public sharing, awards, comments, or managed resources — current previews remain page-memory and labelled.
- Full WCAG conformance, native OS zoom/screen-reader certification, cold/failed font-download proof, low-end device performance, or January 2027 pilot evidence — these require later human/device work.

## Constraints

- **Branch**: `codex/apple-design-preview` is a dirty shared working checkout; preserve all existing user changes and do not commit.
- **Runtime**: Planning and retrospective execution are `codex-cli` with `self_checked` assurance; same-vendor helper output is not cross-runtime evidence.
- **Backend**: PostgreSQL/RLS/concurrency checks use a disposable local cluster and minimal Auth shim; hosted Supabase remains unverified.
- **UI**: React/Vite routes and local WOFF2 assets are the current surface; no new dependency or browser infrastructure is introduced.
- **Evidence**: Historical reports are inputs to this retrospective contract, not new verification; root-owned `VERIFICATION.md`, UAT, and observed UI proof remain required for closure.

## Key Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Use a single narrow retrospective phase for the latest increment | Existing implementation and evidence already cover one coherent typography/motion/backend-hardening slice | 2026-10-02 |
| Keep phase status in progress until root verification/UAT | Execution claims are reconstructed from existing artifacts; closure must be independently checked | 2026-10-02 |
| Treat font/material/navigation/activity/stack evidence as local-only | Browser and bundle checks used local servers and synthetic data; deployment and representative learners were not tested | 2026-10-02 |
| Preserve lending disabled and page-only previews | PLAN.md and SYSTEM_UML define separate EVG and persistence gates | 2026-10-02 |

## Current State

- **Active Phase:** Phase 1 — Typography, motion, and system hardening ([-])
- **Last Completed:** September student-usability and account/catalogue hardening remains inherited context; no October GSDD phase is closed.
- **In Progress:** Retrospective phase setup and root-owned verification/UAT of the existing local increment.
- **Decisions:** `commitDocs: false`; `autoAdvance: false`; runtime `codex-cli`; assurance `self_checked`.
- **Blockers:** Hosted Auth/email/API, deployment, EVG policy/rehearsal, representative student/device review, and observed UI proof are open closure gates.

---
*Last updated: 2026-10-02 after retrospective phase setup from PLAN.md and October evidence documents*
