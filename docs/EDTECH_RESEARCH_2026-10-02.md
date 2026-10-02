# Education and learning feature research — 2 October 2026

**Purpose:** turn useful patterns from education services into a realistic HealEduTech improvement programme. Research uses official product documentation and education organisations. The feature designs, priorities, dates and acceptance criteria below are project proposals, not claims that an external service proves they will work for EVG.

**Timing supplied by the project owner:** recommendation engineering can begin in the week of **5 October 2026**. Real learner onboarding, new recommendation data collection and rollout wait until the team reaches Vietnam in **January 2027**, with EVG approval and operational readiness. The upcoming student survey will inform later revisions. No student pilot, primary survey findings or learning impact is claimed in this note.

## 1. What matters most

The highest-value feature improvement is a coherent **choose → read or try → explain → reflect → get support** journey. The project already has useful pieces, but students must connect them themselves. Finish that learning loop before expanding into a large course platform or adding machine learning.

Build now: clearer navigation, compact bilingual activity instructions, optional reflection prompts, a guided presentation outline, rehearsal support, print-friendly worksheets, honest saving notices and a polished home page. Prepare next week: the preference data contract, content review workflow, small deterministic recommender and synthetic evaluation cases. Activate later: real learner preference collection, recommendation telemetry, persistent project submission and assigned-facilitator feedback after EVG decisions and live access checks.

The recommender's biggest initial dependency is **good approved content metadata**, rather than many users. A preference page helps, but it cannot compensate for missing Vietnamese materials, unsuitable activities or unreviewed links. Content-based matching can work without other learners' histories; Google also warns that its quality depends on the item features and it tends to stay within existing interests. Deliberate educator picks should provide broader discovery. [Google: content-based advantages and limitations](https://developers.google.com/machine-learning/recommendation/content-based/summary).

## 2. Current project evidence and unfinished links

This is a source audit of the worktree on 2 October, not a new hosted acceptance test. Other agents may improve these files during this task; the table records the inspected starting point.

| Area | Inspected starting point | Useful next change |
|---|---|---|
| Interests | `InterestPicker.tsx` and `reading.ts` already load/save learner-owned `nature`, `stories`, `science` choices through `replace_my_interests`. Empty selection is valid. | Reuse this private contract. Plan an optional preferences surface around it rather than creating a second incompatible profile. |
| Explore | `LiveExplorePage.tsx` displays three editorial activities, the interest picker and a future-recommendations notice. | Keep activities useful without recommendations; make the next step into a presentation/reflection easy to find. |
| Reading | `LiveLearningPage.tsx` persists reading status and optional reflection through `saveReading`; the inspected editor shows reflection after marking a book finished, consistent with the owner's earlier finish-first review request. | Add light prompts while retaining the finish-first editor. Preserve previous text if a learner changes status back to reading. |
| Reflection integrity | In the inspected editor, `nextReflection` is an empty string while status is `currently_reading`; saving a finished record back to reading can clear its reflection. | Review this behaviour before release. A status correction should not silently erase evidence the student wanted to keep. |
| Projects/presentations | `ProjectFeedbackPrototype.tsx` has title, summary, further-interest choice, draft/ready state and fictional feedback. It is held in component state. | Add a short presentation scaffold and practice mode now; keep temporary-state and example-feedback labels visible. |
| Facilitator support | PLAN describes assigned facilitator feedback, but the current roles documented in `EVG_HANDOVER.md` do not establish that learner-support permission. | Design explicit learner/facilitator assignments before any real review queue or private-record access. Library access must not imply feedback access. |
| Resource management | Activities are authored in the frontend; PLAN calls for managed, approved bilingual resources later. | Prepare staff review and withdrawal requirements, content fields and fixtures before ranking live links. |
| Production readiness | `EVG_HANDOVER.md` distinguishes source implementation and guest QA from real email, recovery, saved-record and cross-account walkthroughs. | Treat these as launch work with named evidence, even while design work progresses. |
| Survey | Prior project work produced learner questions and an observation checklist; no results were supplied for this research. | Preserve short learner questions separately from internal policy/engineering questions. Observe actual tasks when access becomes possible. |

Relevant local sources: [PLAN](../PLAN.md), [handover preparation](EVG_HANDOVER.md), [29 September fixes and their verification boundaries](STUDENT_FIXES_2026-09-29.md), [Explore source](../src/features/explore/LiveExplorePage.tsx), [reading source](../src/features/learning/LiveLearningPage.tsx), [interest source](../src/features/learning/InterestPicker.tsx), [project preview source](../src/features/community/ProjectFeedbackPrototype.tsx).

## 3. Education services: patterns worth adapting

These are research references, not recommended subscriptions or pre-approved content integrations. Product descriptions do not establish that their reading levels, languages, privacy choices or classroom model fit EVG.

| Reference | Verified useful pattern | Adaptation for HealEduTech | Scope decision |
|---|---|---|---|
| **Learning Equality / Kolibri** | Offline-first content delivery; educators choose resources and track classes/groups; learners can learn independently or with a coach. | Text-first activity cards, explicit materials, a practical next step and staff support. Keep the website usable when an image fails. If connectivity later proves a serious barrier, assess a separate local content-server solution. | Borrow the delivery principles now. Full offline write synchronisation is a separate operational project. [Kolibri](https://learningequality.org/kolibri/about-kolibri/), [coach guide](https://kolibri.readthedocs.io/en/latest/coach/index.html). |
| **Seesaw** | Student-owned portfolios collect learning artifacts and reflections over time, including work done away from the platform. | A student can explain a paper model, drawing, story or reading discovery in a short project summary. Make revision and a small highlight portfolio possible later. | Keep text and in-person demonstration first. Photos/audio/video need storage, permissions and operational decisions before implementation. [Digital portfolios](https://seesaw.com/features/digital-portfolio/). |
| **Google Classroom** | Reusable rubrics can be scored or unscored; teachers can expose criteria and give structured feedback. | Show a short, unscored “ready to explain” checklist before presenting. Later use a reusable feedback structure: one observed strength, one question, one next action. | Adopt consistent criteria; formal grading, standards mapping and gradebooks are unnecessary for this project. [Rubric documentation](https://support.google.com/edu/classroom/answer/9335069?hl=en). |
| **ReadTheory** | Distinguishes class reports from individual reports and permits date-range review. | A future facilitator workspace should answer “who asked for help?” and “what needs feedback?” with clear empty states and a date filter. | Do not add inferred grade/reading levels or copy proprietary assessment metrics. EVG does not yet have the validated reading tests these metrics require. [Progress reports](https://help.readtheory.org/progress-reports). |
| **Pratham Books / StoryWeaver** | Official indexed pages describe multilingual stories with download/print/offline options and list Vietnamese among available languages. | A source pool for staff to review; show content language, optional Vietnamese support and a printable route. One reviewed story can lead to a drawing, retelling or short explanation. | No bulk import or automatic suitability claim. Verify the exact story, translation, licence and format before publication. Direct page fetching was unavailable during this research; these findings are limited to the official indexed page. [Read at home](https://storyweaver.org.in/v0/read_at_home_with_storyweaver). |
| **Scratch Foundation / MIT** | Official resources offer guided projects, tutorials and educator support; starter projects provide a concrete way to begin. | Activities should include a simple example and first action, then allow a student variation. A paper/story/science project can use the same scaffold without coding. | Coding is optional enrichment after device access is known. Do not require a Scratch account for the core website. [Educator resources](https://www.scratchfoundation.org/learn/for-educators), [starter projects](https://www.scratchfoundation.org/learn/learning-library/starter-projects). |
| **British Council LearnEnglish Kids** | Short stories pair watching/reading with printable activities; getting-started guidance suggests preparation before reading and follow-up afterward. | Add a tiny “before you begin” prompt and optional vocabulary support, followed by a concrete output such as retelling or drawing. | External English content is a reviewed supplement; it is not a substitute for Vietnamese-first support where learners need it. [Short stories](https://learnenglishkids.britishcouncil.org/listen-watch/short-stories), [getting started](https://learnenglishkids.britishcouncil.org/getting-started-for-kids). |

Learning Equality's design principles explicitly address unreliable internet, older devices, low digital experience, varied languages and community ownership. This is particularly relevant to this project's intended context. The practical inference is to make every activity understandable as text and let EVG own content selection; it does not mean that we know the centre's network or devices already. [Kolibri design principles](https://design-system.learningequality.org/principles/).

## 4. Improve presentations and reflections now

### 4.1 Give students a small structure

Replace the pressure of a large blank summary box with four short, optional prompts that can assemble a presentation outline:

1. **My question:** “What did you want to find out?”
2. **My discovery:** “What did you read, notice or make?”
3. **My example:** “What can you show or explain?”
4. **My next step:** “What would you like to try next?”

Allow a student to use one sentence per prompt, keep writing in Vietnamese or English, and skip optional prompts. Do not require four answers just to save a draft. Support an in-person explanation with a short written summary; a polished slide deck or uploaded video is unnecessary.

The Education Endowment Foundation's updated metacognition guidance recommends explicit planning, monitoring and evaluation embedded in actual learning activities. These prompts are an application of that principle to EVG's read-and-create journey. They are not a validated EVG teaching rubric. [EEF metacognition guidance, second edition](https://educationendowmentfoundation.org.uk/education-evidence/guidance-reports/metacognition).

### 4.2 Add rehearsal support

Offer a calm “Practise your explanation” view showing only the student's outline and a short checklist:

- I can say what I explored.
- I can show or explain one example.
- I can say what I found difficult or surprising.
- I have one question or next step.

Use visible **Previous / Next** buttons if the outline is split into steps. An optional timer can be added after usability feedback; it should default off and should not score students. The practice view and any print action must display the temporary-state notice until persistent project storage is ready.

Provide a print stylesheet or a print-friendly worksheet so the student can bring notes to an in-person presentation or use them during an interrupted session. Printing should be an explicit user action. The worksheet needs simple prompts, generous writing space and the same bilingual wording as the web flow.

### 4.3 Make reflections optional and easy to start

Keep the existing free-text reflection, add three example starters beneath its label and let students choose any one:

- “One thing I learned was…”
- “Something that surprised me was…”
- “I still want to know…”

Do not insert example text automatically into a saved reflection or count clicking a starter as a learning outcome. Do not use written length as a quality score. Retain the owner's previously requested finish-first review editor in this increment. A separate optional “notes while reading” concept could be reviewed later if the survey or observed use supports it; it is not authorised as a replacement for that review flow.

Keep the meaning of each record clear: a reflection belongs to reading; a presentation belongs to a project or activity; returning a physical book is a library operation. Link related records later through explicit choices rather than automatically treating a loan, click or completion as evidence of understanding.

### 4.4 Close the feedback loop later

The useful production loop is **draft → ask for feedback → facilitator replies → student revises → student chooses whether to share**. Asking for feedback must be separate from publishing work. The first facilitator reply can be short and structured, with one actionable next step; the student should be able to respond by revising a sentence or trying the next task.

EEF's feedback guidance notes that feedback can help or harm depending on its quality and that staff time matters. Our inference is to design a manageable response-and-revision workflow before adding many comment channels. [EEF teacher feedback guidance](https://educationendowmentfoundation.org.uk/education-evidence/guidance-reports/feedback).

**Production dependencies:** project persistence, assigned-facilitator permissions, safe draft/submission/revision state transitions, private feedback history, failed-save handling, staff capacity and a clear way to withdraw sharing. The present prototype's example reply does not satisfy these dependencies.

### 4.5 Acceptance for this frontend increment

- A student can start with an activity or book and find the presentation/reflection next step.
- The distinction between an optional prompt and a required title is visible before validation.
- English/Vietnamese labels, help, validation, practice controls and print output agree.
- Keyboard and touch users can complete the flow; no gesture is the sole control.
- A saved reading reflection survives a harmless reading-status correction unless the student explicitly clears it.
- Temporary project work says when it resets and that no real teacher receives it.
- No example feedback is visually presented as a real teacher's response.

## 5. Low bandwidth, language and shared-device improvements

| Improvement | Why it is useful | Build boundary |
|---|---|---|
| Text and lightweight illustrations before remote media | A failed cover or slow connection should not block instructions. | Now. Reuse the existing responsive-cover approach; measure total page transfer rather than assuming a smaller image proves page speed. |
| Activity duration and materials | Students and staff can choose something feasible before opening it. | Now, with honest rough estimates and locally plausible materials. Validate availability in Vietnam. |
| Printable activity/reflection/presentation notes | Supports in-person work and interruptions without implementing a complex sync system. | Now for previews, with visible saving/privacy context. |
| Separate interface and content language | English navigation does not establish the ability to read an English book. | Now for accurate labels; plan preferences next week. Record both resource language and support language later. |
| Plain bilingual help | Long instructions can become a language barrier even with translation. | Now; EVG Vietnamese review remains a release gate. |
| Explicit saving and retry | Students need to know whether their work reached the server. | Now. Preserve entered text during failures; an offline message must not claim a successful save. |
| Shared-device walkthrough | Sign-out, Back, reload and the next account must not reveal the previous learner's work. | Required live rehearsal with synthetic accounts. Existing tab storage is useful source behaviour, not proof of every hosted privacy boundary. |
| Public-only offline content cache | Could make approved instructions available after loss of connectivity. | Assess after device/network findings. Do not cache private reflection or project responses by default; define withdrawal and cache invalidation first. |
| Local content-server partnership | Kolibri shows an established path where centre connectivity is too weak for a cloud-only flow. | January investigation if the observed need is real; it needs hardware, ownership and training. |

Avoid automatically retaining private drafts in `localStorage` on a shared computer. Persistent draft convenience needs an explicit data decision, account separation, expiry and a cleanup design. At present, clear temporary-preview notices are more honest than an unverified “saved for later” promise.

UNICEF's EdTech data-governance review identifies privacy, profiling and commercial-use risks around student data. It supports treating data governance as part of product delivery. The recommendations here are design guidance; EVG still needs its own applicable privacy/safeguarding decisions and local review. [UNICEF/UNESCO/Global Privacy Assembly landscape review](https://www.unicef.org/innocenti/reports/data-governance-edtech).

## 6. Preference onboarding: specification for next week

### 6.1 Experience

Use a standalone **Your preferences** page accessible from Explore and My Learning. On first authorised learner use in January, offer a short invitation; browsing and reading must remain possible after **Skip for now**. A skipped page should not return as a blocking modal every session.

Suggested flow:

1. **What do you want to explore?** Start with the existing three broad topics. Show examples inside each; allow zero, one or several interests. Add narrower topics only once approved content supports them.
2. **What language helps you learn?** Optional Vietnamese, English, either, or “choose each time”. Keep this separate from the UI language switch.
3. **What would you like to do today?** Optional read, listen/watch, or make/try. This can be a session choice initially rather than a long-term claim about a child's learning style.
4. **Review and save.** Explain in simple language that choices help select ideas, are private and can change. Include **Clear my choices** and **Skip for now**.

Do not collect exact age, date of birth, school details, gender, location or diagnostic learning labels merely to recommend a topic. A school/cohort or eligibility field may be needed for access operations, but that is a separate purpose to be justified by EVG. Do not add an open-ended personal biography to onboarding.

An example preference is “I want to learn about animals”; it is not a claim that the student is good at science. A preferred format is “what I want to try”, not a scientifically diagnosed fixed learning style.

### 6.2 Minimum data contract

All fields below are proposed. Real learner collection remains off until the authorised January launch. Existing reading/interests tables should be preserved and migration planning should be explicit.

| Record | Proposed fields | Purpose and boundary |
|---|---|---|
| Existing learner interest | Authenticated `user_id`, stable `topic_id`, recorded/update timestamp | Reuse/extend existing `learner_interests`; topic IDs remain language-independent. Clearing interests is valid. |
| Optional learner preferences | `user_id`, `content_language_preference` (`vi`/`en`/`either`/unset), optional `format_preferences`, `updated_at`, `schema_version` | Store only learner-selected values; unset is meaningful. Session choices need not be permanently stored. |
| Onboarding state | `user_id`, `status` (`not_started`/`skipped`/`completed`), `schema_version`, optional `updated_at` | Avoid repeated blocking invitations. This is not a consent record and must not be used as one. |
| Topic | `id`, `label_en`, `label_vi`, `description_en`, `description_vi`, active/review state | One vocabulary for books, activities, interests and goals. Add only reviewed terms. |
| Resource | `id`, bilingual title/summary, reviewed `topic_ids`, `content_languages`, `support_languages`, `format`, `duration_minutes`, materials/device/network needs, source URL, licence/reference, `review_status`, `reviewed_at`, `published_at`, `withdrawn_at` | Suitability and access constraints come before ranking. Duration is a staff estimate, not measured student ability. |
| Resource suitability | Reviewed audience guidance, accessibility support and any prerequisites | Unknown suitability cannot become “safe for this student” through a high similarity score. Avoid invented age/reading levels. |
| Topic relationship | `from_topic_id`, `to_topic_id`, relation type, bilingual reason, approval state | Enables related discovery such as birds → flight → paper planes. A related topic is not automatically a formal prerequisite. |
| Recommendation batch | Opaque batch ID, authenticated learner ID where authorised, strategy version, catalogue version, generation timestamp | Reproduce which policy created a set. A generated batch is not an impression. |
| Recommendation event | Opaque event ID, batch ID, resource/topic ID, event type, position where applicable, server timestamp, approved session identifier if needed | January-only instrumentation after policy approval; avoid raw text or identifiable details in event payloads. |
| Explicit feedback | Resource/batch ID, learner ID where authorised, feedback code (`interested`/`not_interested`/`too_hard`/`broken`/`try_later`) | Different problems need different responses. A missing click is not a negative preference. |

Do not include the full reflection or feedback text in ranking-event payloads. Do not send identifiable learner data to a model for tag enrichment. An authenticated UUID is still linked learner data, not anonymous data. Access, deletion and retention requirements apply to events as well as reading records.

## 7. Cold-start recommendation design

### 7.1 Start with content-based rules

Use explicit topic preferences and reviewed resource tags. No trained model, collaborative-filtering system or vector database is required for the first implementation. Google describes content-based recommendations as matching item features to a user profile, while its collaborative-filtering guide documents problems with fresh items and the need for interaction evidence. [Content-based basics](https://developers.google.com/machine-learning/recommendation/content-based/basics), [collaborative-filtering trade-offs](https://developers.google.com/machine-learning/recommendation/collaborative/summary).

Proposed pipeline:

```text
authenticated context / explicit session topic
    → approved, usable resources only
    → content-language and access filters
    → matching explicit interests + reviewed related topics + educator pool
    → bounded transparent scoring
    → diversity and repetition control
    → up to three cards with a truthful reason and practical action
```

Filtering is a requirement, not a score. Publication approval, withdrawal, language/support, device/network needs and reviewed suitability cannot be overridden by relevance. For a physical book, show real availability as a constraint on borrowing; a zero-copy book may still be useful for reading context if a learner owns it. Make these actions distinct.

An illustrative first score can reuse PLAN's approach:

```text
4 × explicit session topic match
+ 3 × selected interest match
+ 2 × recent explicit positive feedback
+ 1 × reviewed related-topic match
- 2 × recently shown
```

Bound each signal to avoid rewarding resources merely for having more tags. These weights are provisional engineering settings, not learned educational measurements. Before January, positive-history and recently-shown inputs are synthetic fixtures only.

Default composition: one close match, one related discovery, one varied educator pick, when enough eligible resources exist. If the learner asks to stay with a topic, honour that. If fewer eligible resources exist, show fewer cards. A sparse catalogue should not manufacture variety by relaxing review or language requirements.

### 7.2 Explain and allow correction

Reasons should match the actual selecting rule:

- “You chose Nature.”
- “Try flight after learning about birds.”
- “An educator pick to explore something new.”

Avoid “We know you will love this”, “You are ready for advanced science”, or implied AI personalisation. Let students change preferences beside recommendations and choose a different topic for this session. An **Ask a facilitator** path is useful only when someone is assigned to receive it; otherwise show an in-person suggestion without claiming to send anything.

### 7.3 Hard cases to design explicitly

| Case | Correct behaviour |
|---|---|
| No preferences / onboarding skipped | Varied reviewed educator picks, labelled as such. |
| Interests but no history | Match explicit interests; no invented proficiency or enthusiasm. |
| Unknown or untagged book | Use declared interests; flag missing metadata for staff review. |
| Only English content; Vietnamese requested | Show the real coverage limitation or reviewed supported alternatives. Do not silently treat translated titles as Vietnamese books. |
| Resource needs video; connectivity is limited | Prefer an eligible text/print/physical alternative; show the access requirement clearly. |
| Withdrawn or broken resource | Exclude it from new results and recheck when opening; provide reviewed alternatives where available. |
| Repeated display after refresh | Do not count repeated generation as interest; deduplicate actual-display events according to the agreed event contract. |
| New interest replaces old interest | Explicit new choices override stale history; retained reading records remain intact. |
| No eligible resources | Honest empty state with a useful browse or in-person support route. |
| Too difficult | Reduce challenge where reviewed alternatives exist; do not remove a whole topic as “not interested”. |
| Shared-device account changes | Cancel stale responses, clear previous learner context, and fetch only the new learner's authorised data. |

### 7.4 Event collection after launch approval

Count a recommendation as **displayed** only when the card is actually visible using a documented browser threshold; rendering below the fold is not enough. Keep that threshold fixed during evaluation. Count an **open** separately from a **save/selection**, and record explicit feedback separately from both. Use idempotency keys for retries so a weak connection does not inflate counts.

Do not log keystrokes, raw search text, mouse movement, precise location or unrestricted page histories for this feature. Dwell time and a completed book are weak signals of enjoyment or understanding. Do not maximise time spent, streaks or reward points as the educational objective.

A pseudonymous evaluation extract can contain batch/resource IDs, approved event codes and coarse dates, but it remains governed data if it can be re-linked. The operator should be able to explain which fields exist, who can access them, how long they remain and how correction/removal works before collection begins.

## 8. What to do in the week of 5 October 2026

This is an engineering sequence, not an automation or a promise that every task fits five days. Reduce scope if review capacity is limited.

| Sequence | Deliverable | Evidence |
|---|---|---|
| 1. Monday 5 October | Inventory current book/activity metadata and translation/content-language gaps; agree one topic vocabulary and preference contract. | A reviewed matrix of known versus missing fields. No invented catalogue content. |
| 2. Tuesday 6 October | Build a preferences prototype with skip/edit/clear behaviour and mock content-language choices. | EN/VI walkthrough, keyboard/touch access, denied-storage behaviour, no new learner-data writes. |
| 3. Wednesday 7 October | Create the small pure ranking function and reviewed/synthetic resource fixtures. | Deterministic examples, truthful localised reasons and all hard filters enforced. |
| 4. Thursday 8 October | Prepare synthetic scenarios and a staff content-review/withdrawal design; draft any needed schema migration separately. | Scenario report, RLS/access design, rollback/migration plan; do not apply new production collection tables as part of research. |
| 5. Friday 9 October | Review with the project owner; record content coverage, unresolved EVG decisions and the January activation checklist. | Clear prototype boundaries and a named next step for every unresolved question. |

Preparation can continue during October–December: curate materials, improve bilingual copy, inspect survey responses when available, rehearse accounts/recovery with controlled test identities, and prepare operator instructions. Content metadata is safe to improve independently of collecting real learner behaviour, provided publication follows the normal project scope.

## 9. Evaluation plan

### 9.1 Before Vietnam: synthetic behaviour and educator review

Create approximately 20–30 fictional cases covering the hard cases above and multiple combinations of preferences. This is a practical project target, not a statistical sample-size claim. Use a small educator-curated list as the baseline.

Evaluate four separate questions:

1. **Correctness:** Are all results approved, current, eligible and deduplicated?
2. **Relevance:** Does the selected resource relate to the stated interest or honest discovery reason?
3. **Usability:** Can a student understand the card and actually do the task with its language, materials and access needs?
4. **Learning/support value:** Can a facilitator use the task and prompt to elicit one understandable explanation or next question?

Proposed release criteria for the fixture stage: zero eligibility/withdrawal failures, zero false explanations, zero duplicate cards, correct empty states, and documented educator review of remaining relevance/usability weaknesses. A passed fixture suite proves rule behaviour, not student impact.

### 9.2 January 2027: formative local validation first

After EVG approval, observe a small representative group on actual devices. Use brief tasks: skip onboarding and find a resource; choose/edit an interest; explain why a card appeared; switch language; try an activity; write or say one reflection; ask for support; sign out safely. The existing plan's proposed 20–40 learner centre size is an unverified planning assumption, not a known study cohort.

Report counts and specific failures alongside percentages: how many learners completed each task, where assistance was needed, unsuitable/broken content reports and staff review minutes. Include language and access failures so headline engagement does not hide underserved learners. Do not publish learner names or very small identifiable subgroup tables.

### 9.3 Compare with the simplest baseline

Use a short, educator-approved formative comparison between rotating educator picks and preference-based suggestions. Document which method actually produced the displayed cards, content coverage and any changes to the catalogue. A very small pilot cannot establish reliable statistical superiority.

Useful outcomes: an eligible choice, explicit “useful/interesting” feedback, a completed feasible activity, a student's explanation and a manageable staff workload. Click-through rate is a secondary interaction measure; it cannot substitute for relevance, language accessibility or learning evidence.

Do not optimise the rules from the same handful of cases and then claim an independent win. Preserve some reviewed scenarios for later checks, version the rules and retain a list of failure cases. Reconsider more complex models only when a measured limitation remains and held-out evidence demonstrates a useful improvement.

## 10. Teacher and operator workflow

Before adding a large dashboard, design three compact queues:

| Queue | Minimum useful information | Practical action |
|---|---|---|
| **Needs feedback** | Assigned learner, submitted project, age of request, status | Open the submitted summary, add strength/question/next step, return it for revision. |
| **Needs help** | Assigned learner, resource and an explicit help/difficulty flag | Offer an easier reviewed alternative or in-person support; close the request with a visible outcome. |
| **Needs content review** | Resource/book, missing metadata, broken-link report or withdrawal need | Correct metadata, replace a link, approve/withdraw, and verify affected recommendations. |

These are future workflows. Do not fabricate a populated queue now or infer that every student who did not click needs intervention. Private learner-support access must use explicit assignments and server-side checks; staff role names alone are insufficient. Export access and bulk learner views need their own purposes and permissions.

A content reviewer needs a short checklist: title/description accurate; content language and support language correct; accessible format; materials/device needs explicit; licence/source recorded; learning task feasible; external account requirement visible; review date; publish/withdraw controls. Broken-resource reports should reach a real owner and result in removal/replacement, not just a counter on a dashboard.

Agree staff capacity before promising response times or notifications. Use a review queue and in-person support first; email, push and messaging channels create additional operational work. No third-party messages or notifications were sent during this research.

## 11. Priorities and build boundaries

| Priority | Change | Do now | Later dependency |
|---|---|---|---|
| **P0: release integrity** | Navigation exposes all core destinations; saving states truthful; avoid reflection loss; shared-device/account rehearsals; bilingual/accessibility checks. | UI/code fixes and local verification; controlled hosted rehearsal under existing scope. | Actual EVG devices, email receipt and live isolation evidence. |
| **P1: learning loop** | Guided project outline, optional reflection starters, rehearsal checklist, print-friendly notes, activity → presentation link. | Improve the existing preview with explicit non-persistence labels. | Persistent projects, assigned facilitator feedback and staff capacity. |
| **P1: content coverage** | Distinguish translated metadata from actual content language; reviewed materials and vocabulary; useful instructions without remote media. | Audit and curate. | Inventory access and EVG review in Vietnam. |
| **P1: professional design** | Clear hierarchy, polished bilingual typography, strong navigation and restrained home motion. | Implement progressive enhancement without blocking tasks. | Actual device/network and reduced-motion validation. Detailed UI research belongs in the parallel design audit. |
| **P2: recommendation preparation** | Optional preferences, topic/resource contract, deterministic rules, fake-user fixtures, source coverage matrix. | Week of 5 October engineering work. | January authorisation, usable content and approved collection/retention design. |
| **P2: facilitator workspace** | Explicitly assigned support, project revision queue, help request handling. | Design and prototype. | Server permissions, named operators, privacy decisions, live tests. |
| **P3: optional enrichment** | Public offline content caching, optional audio/photo evidence, moderated showcase highlights. | Specification only where useful. | Observed need, storage/licences/access, moderation and withdrawal operations. |
| **P3: later AI** | Reviewed tag suggestions or multilingual semantic matching. | Record measured limitations; no learner-facing AI promise. | Evaluation against deterministic baseline, cost/owner/review decisions. |

Defer public leaderboards, unmoderated comments, private messaging, compulsory daily streaks, automatic learning-level predictions, a full graded LMS and collaborative filtering. They add data or operational commitments while the core journey and local context are still being established.

## 12. Survey findings: how they should change the plan

When the survey arrives, record which product assumption each answer actually supports. A student requesting a feature does not alone resolve programme policy or technical suitability.

| Evidence to look for | Product consequence |
|---|---|
| Shared devices or weak email access | Revisit onboarding/recovery and supported sign-in arrangements with EVG; do not solve this by sharing passwords. |
| Unstable internet, limited mobile data | Prioritise lightweight instructions and print routes; investigate local content delivery if necessary. |
| Vietnamese preferred for reading or explanations | Curate Vietnamese/supported content and check actual translations; translated titles alone are insufficient. |
| Difficulty starting written reflections | Short starters, in-person explanation and guided examples; consider optional audio only if the operational need is clear. |
| Student interest topics beyond the three current groups | Add specific topics when reviewed resources exist; record unmet requests without pretending the catalogue covers them. |
| Low willingness to publish work | Keep projects private and presentation support in-person; sharing remains optional. |
| Students want teacher help but operators have limited time | A small assigned queue, short structured feedback and realistic cadence before notifications or open discussions. |
| Students cannot find Explore/Together | Navigation and task labels need correction independently of adding more features. |

Keep learner questions short and concrete. Internal questions about lending rules, consent, retention, permissions, storage and maintenance belong with EVG stakeholders and operators. Observe task completion, language choices and help requests alongside survey answers. Prior research materials are a starting point; they are not primary findings.

## 13. Source register and limits

All sources checked on **2 October 2026**. Official product pages verify patterns/features; they are not independent evidence that adopting those features improves EVG outcomes. The EEF guidance informs teaching design; local application still needs observation and review. UNICEF is governance guidance here, not a claim of legal compliance.

- [Learning Equality: About Kolibri](https://learningequality.org/kolibri/about-kolibri/) — offline-first ecosystem and educator/resource workflows.
- [Kolibri User Guide: Coach your learners](https://kolibri.readthedocs.io/en/latest/coach/index.html) — assigned class/group resources and actionable progress views.
- [Kolibri Design System: Design principles](https://design-system.learningequality.org/principles/) — equitable access, effective learning and local ownership.
- [Seesaw: Digital portfolios](https://seesaw.com/features/digital-portfolio/) — learning artifacts, reflections and student ownership.
- [Google Classroom: Create or reuse a rubric](https://support.google.com/edu/classroom/answer/9335069?hl=en) — reusable scored/unscored criteria and feedback structure.
- [ReadTheory: View student progress](https://help.readtheory.org/progress-reports) — separate class/individual reports and review periods.
- [StoryWeaver: Read at home](https://storyweaver.org.in/v0/read_at_home_with_storyweaver) — official search-index evidence only; direct page fetch failed. Exact resource suitability/licensing must be checked before use.
- [Scratch Foundation: Educators](https://www.scratchfoundation.org/learn/for-educators) and [starter projects](https://www.scratchfoundation.org/learn/learning-library/starter-projects) — scaffolded creative projects and educator materials.
- [British Council: Short stories](https://learnenglishkids.britishcouncil.org/listen-watch/short-stories) and [getting started](https://learnenglishkids.britishcouncil.org/getting-started-for-kids) — preparation, read/watch and printable follow-up patterns.
- [EEF: Metacognition and Self-Regulated Learning](https://educationendowmentfoundation.org.uk/education-evidence/guidance-reports/metacognition) — explicit plan/monitor/evaluate strategies embedded in activities; second edition published 13 November 2025.
- [EEF: Teacher Feedback to Improve Pupil Learning](https://educationendowmentfoundation.org.uk/education-evidence/guidance-reports/feedback) — feedback quality, student action and staff workload.
- [UNICEF Innocenti: Data Governance for EdTech](https://www.unicef.org/innocenti/reports/data-governance-edtech) — student-data governance and profiling/privacy considerations.
- [Google: Content-based basics](https://developers.google.com/machine-learning/recommendation/content-based/basics), [advantages/limitations](https://developers.google.com/machine-learning/recommendation/content-based/summary), and [collaborative-filtering trade-offs](https://developers.google.com/machine-learning/recommendation/collaborative/summary) — technical basis for explicit-preference matching and cold-start boundaries.

This note makes no procurement recommendation, applies no migrations, changes no production policy, enrols no students and activates no data collection. Any proposed field, threshold, weight or date not explicitly supplied by the project owner is a planning default to review, rather than a discovered fact about EVG.
