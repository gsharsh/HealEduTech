# HealEduTech recommendation and adaptive reading plan

**Updated:** 13 October 2026  
**Status:** Proposed design; implementation, educational review and pilot acceptance remain outstanding.  
**Target:** A small, useful release in June–July 2027.

## 1. Goal and audience

Help students discover suitable books and topics, then suggest a useful next step in English reading comprehension. The initial audience is approximately 12–16-year-olds learning English as an additional language. Development and operation will be remote, with limited local support. Reliable access to the website and library books is a user-provided planning assumption that still needs a practical pilot walkthrough.

The design has two connected parts:

1. A content-based book and topic recommender, using explicit interests and reviewed resource information.
2. A small rule-based reading progression engine, using responses to reviewed comprehension checks.

Build a baseline early and improve it while collecting meaningful evidence. Neither part requires a year of data or a trained model before it can be useful. From October 2026, June–July 2027 allows roughly eight to nine months; controlled collection starting in January would provide roughly five to six months before release.

This document proposes a bounded addition to the [main plan](PLAN.md). Adaptive reading checks expand its earlier exploration-only boundary. They do not imply a full learning management system, formal grading or a validated reading-level diagnosis. This document does not change the main plan or authorise production collection, lending activation or publication.

## 2. Current foundations and gaps

| Area | Existing foundation | Limitation for this design |
|---|---|---|
| Accounts and privacy | Authentication, account settings and owner-private reading/interests | Hosted account, email and cross-account acceptance still require verification. Staff membership does not automatically permit access to private learning records. |
| Catalogue | Book descriptions, actual content language, covers and copy availability | Books have one broad topic; structured skill, difficulty and educational review metadata are missing. |
| Interests | Editable saved interests | Only `nature`, `stories` and `science` exist. Current choices are not a historical preference stream. |
| Reading records | Current reading status and optional private reflection per learner/book | Saving updates the existing row. `updated_at` can reflect a note edit rather than completion; earlier states and repeat reads cannot be reconstructed reliably. |
| Related books | Same-topic lookup, excluding the current book, returning three alphabetical results | A useful baseline, but no personalised ranking or suitability assessment. |
| Exploration and paths | Three static topic activities and topic-filtered browsing | No skill map, assessment attempts or persistent adaptive path. Some activities assume volunteer help. |
| Evaluation | Existing frontend and database checks | No recommendation exposure, explicit usefulness feedback or skill-linked assessment pipeline. |

Relevant source boundaries are [reading persistence](src/features/learning/reading.ts), [interest selection](src/features/learning/InterestPicker.tsx), [catalogue queries](src/features/library/catalogue.ts), [activities](src/features/explore/ActivityStack.tsx) and [reading/interests permissions](supabase/migrations/20260920123406_reading_and_interests.sql).

Translated catalogue titles and descriptions do not establish that the actual book is available in Vietnamese. Interface language also does not establish English proficiency. The [sample catalogue](supabase/seed.sql) explicitly distinguishes its Vietnamese summaries from published translations. Its contents are development evidence, not a confirmed description of EVG's physical inventory.

Simply running the current website for several months would therefore produce limited evidence for adaptive recommendations. Useful collection needs deliberate records and a working student experience.

## 3. Lightweight architecture

Retain React, TypeScript, Supabase and the existing Vercel deployment. Keep ranking and progression logic separate from React so they can be tested with fictional learners. Model training, a vector database, a graph database and a separate Python service are outside the initial release.

### 3.1 Book and topic recommendations

Use the following pipeline:

1. Read the signed-in student's explicit interests, optional content-language preference and current topic request.
2. Retrieve reviewed candidates with stable IDs, accurate descriptions, topic tags, content language, access conditions and publication status.
3. Filter for approval, suitability and practical usability before ranking. For a borrow-now action, check current copy availability; ordinary browsing can still show unavailable books with accurate labels.
4. Rank primarily by the current request and explicit interests. Use explicit positive feedback as a secondary signal once available. Reading records can identify books already on the student's shelf; they do not establish enjoyment or understanding.
5. Show a small set, initially up to three suggestions, with truthful reasons and an option to explore something different. Honour a request to stay within a topic. Show fewer results when coverage is insufficient.

A new student or someone skipping preferences receives a varied reviewed default, labelled accordingly. Missing clicks are not dislikes. Explicit changed interests take precedence over older inferred context.

Use a dedicated eligible-candidate query rather than ranking only the first 24 results of the existing paginated library. For a small catalogue, a bounded complete candidate set and a pure TypeScript ranker are sufficient. Preserve ordinary browsing when personalisation fails.

### 3.2 Adaptive English reading progression

Begin with a narrow set of observable objectives. Draft examples include locating explicit information, sequencing events, identifying a main idea and making a simple inference. These examples are proposed authoring scope, not a validated curriculum or prerequisite order.

A student reads a short text and answers a short check. The next suggestion changes according to the evidence: an introductory example, supported practice, another check or a more demanding task. Interests can supply the context, such as animals or science, while check responses guide progression. Students can revisit material, pause or change direction.

Use descriptive evidence states such as **not checked**, **practising** and **ready to try the next step**. Do not infer mastery, a reading age or a CEFR level from clicks, loans, finished books or a few answers. Any question difficulty, prerequisite relationship or progression threshold remains provisional until educational review and pilot validation.

For English learners, a wrong answer may reflect vocabulary, instructions, question ambiguity or comprehension. Offer reviewed language support and simple difficulty feedback. Record assistance and repeat-attempt context so answering after seeing a solution is distinguishable from answering an unseen question independently. Avoid endless retry loops and do not promise facilitator responses without an assigned operator.

### 3.3 Minimum data and service additions

| Proposed addition | Purpose |
|---|---|
| Reviewed resource metadata and specific topics | Describe what content actually provides, its language, suitability, access conditions and review/publication state. Link books without rewriting physical inventory or loans. |
| Skills and reviewed relationships | Define observable objectives and any justified prerequisite links. Topic similarity alone is not a prerequisite. |
| Versioned check items and private answer keys | Preserve the exact text, options, objective and scoring basis used for an attempt. Multiple items reduce simple answer memorisation. |
| Learner-owned attempts | Record submitted responses, server results, item versions, assistance context and timestamps. Derive initial evidence states from these records. |
| Recommendation exposures and feedback | Record which suggestions were seen and how students responded, with the relevant strategy/content versions. |

Supabase functions derive identity from the signed-in session, score against private server-side keys and record submissions safely under retries. Learners cannot write correctness fields or another student's attempts. Published question versions retain their meaning when content is revised. Answer keys must not be bundled into the frontend.

Initially use automatically checkable, reviewed responses. Open-ended grading introduces a separate assessment and review problem. Existing private reflection text stays outside ranking inputs and analytics exports.

## 4. Meaningful data collection

Collect data because it answers a concrete design question, rather than because it might be useful to a future model.

| Evidence | Minimum useful information | What it can tell us |
|---|---|---|
| Explicit preferences | Current interests, optional content-language preference and session topic | What the student has chosen to explore. |
| Content context | Resource, skill and question IDs; versions; review state; actual language and access conditions | Whether a suggestion or check was appropriate and reproducible. |
| Recommendation exposure | Batch ID, item ID, position, strategy version and actual visible display | What the student had an opportunity to choose. |
| Choice and feedback | Open/save/start, plus distinct useful/interested, not-for-me, too-hard or broken feedback | Relevance and usability problems without treating every problem as dislike. |
| Assessment attempt | Skill/item version, selected response, server result/time and support/retry context | Evidence relevant to a specific reading objective. |
| Operational evidence | Sign-in/save failures, unavailable content and maintenance effort | Whether remote use and upkeep are practical. |

Use server timestamps and retry-stable identifiers. Define a fixed visibility rule before recording exposure; below-the-fold rendering is not enough. Keep preference, self-reported completion and assessment evidence separate. Exclude demo, staff rehearsal and synthetic test activity from learner evaluation.

Do not collect private reflection text, raw search text, mouse trails or unrestricted event payloads by default. An account UUID is linked learner data, not anonymous data. Define authorised cohort participation, access, retention and removal procedures before collection; registration alone does not establish pilot eligibility.

General book interactions cannot replace skill-linked assessment evidence. Borrowing, opening or finishing a book may help contextualise recommendations, but does not demonstrate understanding. A later adaptive model would need repeated, interpretable responses to reviewed questions, reliable item-to-skill mappings and independent evaluation.

## 5. Delivery schedule

Dates below are proposed milestones, conditional on content review, account/privacy acceptance and programme readiness. January collection and the June–July recommender release are separate events.

| Period | Proposed work | Evidence needed to move forward |
|---|---|---|
| October–December 2026 | Build the editorial/content-matching baseline, candidate metadata and collection mechanism using synthetic data. Draft the narrow reading skill/check design and arrange remote review. | Reproducible fixtures, reviewed data contract, a working prototype and an identified route to educational review. |
| January–February 2027 | Begin controlled real collection only after existing gates pass. Test accounts, preferences, useful suggestions and independent student use. | Actual email/sign-in, persistence, account isolation, understandable wording and an approved collection process. |
| March–April 2027 | Pilot the reviewed reading progression, revise confusing questions and assess recommendation usefulness and remote workload. | Skill-linked attempts, documented failure cases, content corrections and feasible support arrangements. |
| May 2027 | Freeze a release candidate and evaluate on reserved scenarios, later observations or unseen question variants. Complete failure/recovery checks. | Truthful recommendations, reliable attempts, suitable content and acceptable operator workload. |
| June–July 2027 | Release the small accepted scope and continue collecting evidence for improvements. | Separate sign-off for book/topic discovery and adaptive reading; deploy only capabilities whose gates pass. |

If educational review is unavailable, the adaptive component remains a prototype. Book/topic discovery can have its own release decision once its content and operational checks pass. Do not make recommendations depend on completing rewards, social publication, comments or the entire future learning platform.

## 6. Remote operations and acceptance

Remote operation needs explicit ownership even when the application is hosted. Before pilot use, assign a technical owner for accounts, recovery and releases; a content owner for review and corrections; and a reachable EVG contact for practical access and inventory issues. The same person can hold multiple responsibilities if the workload is realistic.

Keep the student journey self-contained: clear instructions, saved progress, safe retries, reviewed support examples and a way to pause or switch topics. Replace or exclude activities requiring unavailable volunteer assistance. Accurate physical inventory still needs a dependable local process; this plan does not enable lending.

The following are release acceptance scenarios:

- New learners and empty interests receive honest reviewed defaults. Changed interests affect suggestions, and missing content produces a useful empty state.
- Withdrawn, unsuitable or inaccessible resources do not appear as actionable recommendations. Reasons match the actual selection logic; no duplicate cards or invented resources appear.
- Question keys, private attempts and reflections remain protected. Two controlled accounts cannot access each other's records; account switches and sign-out clear personalised state on shared devices.
- Retry, reload and interrupted-network scenarios preserve correct saved state without duplicate attempts or false success messages. Recommendation failure leaves browsing usable.
- Reading checks are answerable from their intended material, have defensible keys and reviewed progression rules. Assistance and repeated answers are interpreted appropriately.
- English learner instructions, Vietnamese support where provided, keyboard access and mobile layouts are checked with representative users and devices.
- Account recovery, content withdrawal, backup/recovery and issue handling have named owners and tested procedures appropriate to the accepted scope.

Compare personalised suggestions with a rotating editorial baseline using the same eligible catalogue. Assess relevance, explanation accuracy, usable choices, difficulty feedback and maintenance effort. For reading progression, use reviewed unseen checks rather than completion counts as evidence of performance. Report counts and individual failures; a small pilot does not establish statistical superiority or learning gains. Keep evaluation cases separate from the observations used to tune rules.

## 7. Optional LLM assistance

An LLM is an optional component of this system, not a substitute for the catalogue, permissions, assessment evidence or educational review.

The first useful application is offline authoring: draft topic tags, descriptions, passages, questions and explanations for human inspection. Save and version accepted material so it can be reused and evaluated. No reviewer is currently available, so generated assessment drafts remain unapproved until that dependency is resolved.

Separately evaluate an LLM that interprets a student's request or ranks a supplied set of approved catalogue IDs. Compare it with the simple baseline on identical scenarios. Check relevance, invalid selections, response time, cost and review effort. Adopt it only where the measured benefit justifies operation.

Any live model call belongs behind a server endpoint. Supply only the minimum authorised context, validate returned IDs and eligibility, and fall back to ordinary recommendations on failure. Keep private reflections outside model inputs. Model-generated claims about difficulty or mastery are not educational evidence.

Keep model training outside the initial release. Bayesian Knowledge Tracing or other trained approaches are later research options only if skill-linked coverage and held-out evaluation justify them; a year of general clicks is not an automatic upgrade threshold.

## 8. References and unresolved dependencies

### Project references

- [Main plan and existing recommendation design](PLAN.md#6-topic-discovery-with-little-initial-data).
- [Education research and cold-start design](docs/EDTECH_RESEARCH_2026-10-02.md).
- [Readiness priorities and collection gates](docs/PRODUCTION_READINESS_2026-10-02.md).
- [Pilot configuration and acceptance](docs/SUPABASE_PILOT.md).
- [Representative learner validation](docs/PHASE_1C_VALIDATION.md).
- [Remote ownership, recovery and handover](docs/EVG_HANDOVER.md).
- [Implemented versus planned system boundaries](docs/SYSTEM_UML_2026-10-02.md).

### External design references

- [Google: Content-based filtering](https://developers.google.com/machine-learning/recommendation/content-based/basics) — matching explicit preferences and item features without other learners' histories.
- [Google: Collaborative filtering trade-offs](https://developers.google.com/machine-learning/recommendation/collaborative/summary) — interaction-based approaches and new-item limitations.
- [Khan Academy: Mastery mechanics](https://support.khanacademy.org/hc/en-us/articles/5548760867853--How-do-Khan-Academy-s-Mastery-levels-work) — an example of assessment-based state changes; its thresholds are not adopted here.
- [Badrinath et al.: pyBKT](https://arxiv.org/abs/2105.00385) — a possible later knowledge-tracing research direction.
- [Hou et al.: LLMs as zero-shot rankers](https://arxiv.org/abs/2305.08845) — candidate-ranking potential and observed prompt/order biases, to be evaluated on this project rather than assumed transferable.
- [Xiao et al.: Generated English reading exercises](https://aclanthology.org/2023.bea-1.52/) — educational content generation evaluated with educator input; not evidence that unreviewed generation is suitable for this cohort.

### Dependencies still to resolve

- Arrange an educational reviewer for English additional-language objectives, texts, question quality and progression rules, plus Vietnamese wording review where needed. This is the main dependency for learner-facing adaptive progression.
- Confirm the first cohort, starting reading needs, independent device/email access and usable inventory through EVG. Ages 12–16 and reliable website/book access are planning inputs, not observed pilot findings.
- Establish content sources, usage permissions, review capacity and enough suitable alternatives for each supported objective/topic.
- Complete hosted account, migration/configuration and private-data acceptance; local checks do not establish live behaviour.
- Agree collection eligibility, access, retention/removal, remote support responsibilities and the release scope with EVG.

All educational thresholds, content quantities and progression relationships remain proposed until review. Creating this document implements no recommendation feature, changes no production policy and activates no learner data collection.
