# EVG Vietnam: Reading, Exploration, and Peer Learning Platform

## 1. Revised purpose and scope

Build a custom bilingual website that helps students record their reading, explore interests, set learning goals, share discoveries, receive feedback, and encourage one another.

**Product scope follows “What we currently suggest” in the EVG teaching brief and your subsequent instructions.** The removed “Software: Teaching the local students…” paragraph does not establish requirements for this project. The PDF’s later AI feasibility commentary is also not a requirements source.

The platform’s central experience is:

**Read → record → explore → create or present → receive feedback → earn recognition → share with peers.**

This replaces the previous emphasis on delivering structured lessons. There is no requirement to create a curriculum, produce 5–6 lessons, or build a formal course-management system.

### Agreed foundations

| Area | Direction |
|---|---|
| Website | Custom React and TypeScript |
| Languages | Vietnamese and English |
| Student experience | Simple navigation, minimal typing, clear actions |
| Accounts | Individual email-based accounts from the first release |
| Pilot | One centre with 20–40 learners |
| Daily operation | Nontechnical EVG staff |
| Content and moderation | EVG educator or volunteer |
| Makers’ support | Time-limited, followed by an explicit handover |
| Development approach | Small working increments, tested before expansion |
| Recommendations | Clearly labelled previews initially; functioning topic and AI recommendations come last |

Devices, connectivity, email accessibility, funding, and the technical successor remain discovery tasks.

## 2. Features and student experience

### A. Reading history and interests — first working release

Students should be able to:

- Select a book from a small staff-maintained catalogue.
- Mark it as currently reading or finished.
- See their own reading history.
- Select topics they enjoy.
- Add an optional short reflection or interest rating.
- Ask a facilitator to add a missing book.

Facilitators should be able to:

- Add and correct book records.
- Help students update reading records.
- View their assigned learners’ interests and reading histories.
- Verify reading milestones when needed for rewards.

Start with book title, author where known, language, and manually assigned topic tags. Avoid ISBN integrations, automated book analysis, and a complete lending system initially.

Reading histories remain private to the learner and authorised staff. Students choose what they share through a separate showcase.

### B. Weekly exploration and volunteer-supported goals

Provide a simple weekly learning record:

- What do I want to explore?
- What will I read, try, or make?
- What help do I need?
- What did I discover?
- What would I like to explore next?

Students and volunteers can use this to agree on a small learning goal. It should support student interests without requiring formal timetables, graded courses, or curriculum administration.

A goal may reference a physical book, an approved resource, a practical activity, or a small project.

Students can prepare a presentation or demonstrate their work in person. The website stores a short title, summary, and progress status; recording or uploading a video is not required.

### C. Feedback and interest ratings

Facilitators can leave brief private feedback using a consistent structure:

- Something the student did well.
- A question or suggestion.
- A possible next step.

Students can indicate whether a topic was interesting and whether they want to explore it further.

Distinguish:

- A student reporting that they finished.
- A facilitator reviewing a presentation or demonstration.
- Approval to publish something to peers.

These are separate actions and should not be treated as interchangeable proof of learning.

### D. Badges and rewards

Include rewards as a planned early capability.

Start with a small, understandable set recognising:

- Completing a reviewed reading milestone.
- Exploring a new topic.
- Sharing a presentation or project.
- Helping another student, confirmed by a facilitator.

Use private personal progress and visible explanations of how recognition is earned. Avoid a public leaderboard in the initial version.

Implementation requirements:

- Define each reward’s criteria.
- Record the event or staff decision that justified it.
- Prevent duplicate awards from repeated submissions.
- Allow an administrator to correct an accidental award.
- Preserve legitimate achievements when unrelated records are edited.

Physical pins or other rewards can accompany digital badges if EVG wants them. Their purchase and distribution are programme responsibilities with a separate budget.

### E. Peer showcases

Create a closed showcase for the pilot cohort where students can share discoveries and see what classmates are learning.

The first version supports:

- A project or presentation title.
- A short summary.
- Related books or topics.
- An optional staff-approved resource or image.
- An invitation to ask questions.

Publication workflow:

**Student draft → submit for review → facilitator approves → visible to the cohort.**

Sharing is optional. Full reading histories, emails, and private feedback never become visible automatically.

Students should be able to request withdrawal of their work. Authorised staff can immediately hide a published item.

### F. Comments and questions

Implement **moderated comments and Q&A attached to showcases** as the initial peer communication feature.

This supports asking for help and offering encouragement while keeping discussions connected to learning.

Initial behaviour:

- Comments use plain text.
- Student comments require approval before other learners see them.
- Facilitators can approve, reject, hide, or respond.
- Students can report inappropriate content.
- Staff can temporarily disable comments if moderation coverage is unavailable.
- Direct private messaging is outside the first version.

Comments are an intended feature, not an indefinite “maybe.” Activating them requires a named moderator and backup.

### G. Topic and AI recommendation previews

Include recommendation areas in the prototype so the intended future experience is visible.

During early releases:

- Use a small set of educator-selected examples.
- Label them “Educator picks,” “Example suggestions,” or “Coming later,” as appropriate.
- Do not describe examples as personalised or AI-generated unless that is actually true.
- Avoid fabricated explanations such as “Recommended because you read…” when no matching logic exists.
- Keep previews optional to the main reading and sharing workflow.
- Make no AI API calls.

Working recommendations are implemented only in the final phases.

### Student navigation and bilingual design

Use three primary destinations:

| Destination | Contents |
|---|---|
| My Learning | Current books, reading history, interests, weekly goals, and badges |
| Explore | Approved resources and clearly labelled recommendation previews |
| Community | Approved showcases and moderated questions |

Provide a prominent next action, such as “Add a book” or “Continue my goal,” rather than showing every feature with equal emphasis.

Design requirements:

- Vietnamese by default, with a visible English switch.
- Preserve the current screen and unsaved work when switching language.
- Translate navigation, instructions, errors, emails, moderation notices, and staff guidance.
- Use icons with text labels.
- Support keyboard navigation, readable contrast, zoom, and large touch controls.
- Avoid mandatory long written reflections.
- Test younger and older learners separately.
- Keep videos optional, with an alternative where they are essential to understanding.

Physical reading spaces and optional dance activities remain part of EVG’s programme environment. The website can support them through approved resources, but furnishing a lounge or implementing a dance-game system is outside website development.

## 3. Implementation, privacy, and maintainability

### Architecture

Retain the proposed small managed architecture:

| Component | Choice |
|---|---|
| Frontend | React, TypeScript, Vite |
| Hosting | Cloudflare Pages |
| Database, authentication, storage | Managed Supabase |
| Privileged account operations | Server-side functions |
| Authentication email | Production SMTP provider |
| Staff tools | Bilingual administration screens within the same website |
| Source and deployments | One EVG-controlled repository |

Build reusable interface components and keep the application in one repository. Avoid microservices and a separate content-management platform for this scale.

The staff interface must support routine work without editing source code or using the database console.

### Data and application interfaces

Replace the previous lesson-centric model with these concepts:

| Concept | Purpose |
|---|---|
| Learner and cohort | Identity, access, language, and facilitator assignment |
| Book | Staff-maintained catalogue entry |
| Reading record | Learner, book, status, dates, and optional reflection |
| Interest | Learner-selected topic |
| Learning goal | Weekly exploration plan and progress |
| Project or presentation | Student’s summary and facilitator review |
| Reward award | Recognition linked to qualifying evidence |
| Showcase | Approved cohort-visible presentation of work |
| Comment or question | Moderated discussion attached to a showcase |
| Resource | Educator-approved supporting material |
| Administrative record | Necessary access changes and moderation decisions |

Application interfaces should cover:

- Managing a learner’s own reading records, interests, and goals.
- Reviewing assigned learners.
- Awarding and correcting rewards.
- Submitting and moderating showcases and comments.
- Managing books and approved resources.
- Exporting authorised records.

Recommendation previews use clearly identified editorial content. Personalisation services and AI interfaces are added in later phases.

### Access rules

- Learners can access their own private records.
- Educators can access assigned learners and authorised moderation functions.
- Cohort members can see approved showcases and approved comments.
- Administrators manage staff access and organisational settings.
- Learners cannot award themselves verified rewards or approve their own submissions.
- Privileged credentials remain server-side.
- Database and storage permissions enforce access independently of the interface.

Use separate test and production environments. Test data must be synthetic; preview deployments must not write to production records.

### Email and shared devices

Use staff-invited email/password accounts with bilingual recovery guidance.

Confirm that every intended learner has appropriate access to a distinct email address. A single guardian email cannot identify several independent learners under the initial account model. Resolve shared-inbox cases before enrolling affected students.

On shared devices, provide clear sign-out, avoid persistent sign-in by default, and clear the previous learner’s displayed and cached data.

### Connectivity

The first working release requires internet for authentication and saving records.

It should:

- Load mainly text and compressed images.
- Show when something has not saved.
- Support retries without duplicate reading records, comments, or rewards.
- Avoid autoplay and large student media uploads.
- Allow printable weekly-goal or reflection sheets for interrupted sessions.

Full offline synchronisation remains a separate capability. If field testing finds that internet availability prevents the core workflow, reassess delivery before extending the platform.

### Children’s records and moderation

Before live enrolment, EVG must establish the applicable consent, privacy, retention, and safeguarding arrangements, including review of external service providers and international data processing.

Collect only necessary information. Keep email addresses and personal records out of peer-facing screens, and avoid identifying student information in routine technical logs.

Use staff-approved resources and record their sources. Provide quick withdrawal controls for unsuitable material.

### Backups and technical continuity

Maintain database backups and separate file backups. Supabase database backups do not include the actual objects stored through its Storage API. [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups)

Recovery testing must verify accounts, permissions, reading history, rewards, showcases, moderation state, and files—not merely that a CSV can be downloaded.

A technical successor remains necessary after the makers leave. Managed hosting does not maintain the application’s code or permission rules.

## 4. Bottom-up delivery roadmap

### Phase 0 — Validate the operating environment

Confirm:

- Devices, connectivity, shared-device practices, and email access.
- EVG’s existing reading and learner records.
- The first catalogue of books and interest categories.
- Who approves rewards, showcases, and comments.
- Programme ownership, funding, and technical succession.
- Required privacy and safeguarding arrangements.

**Output:** a verified pilot brief and a small prioritised backlog.

### Phase 1 — Prototype the complete intended experience

Create a bilingual prototype containing:

- Reading history and interest selection.
- Weekly exploration goals.
- Presentation summaries and feedback.
- Badges.
- Peer showcases and comment approval.
- Clearly labelled recommendation previews.
- Staff administration.

Use fictional learners and example content. Test the primary tasks with representative students and EVG operators.

**Output:** an agreed interface and workflow before implementing every feature.

### Phase 2 — Build accounts, reading history, and interests

Implement the first live foundation:

- Staff invitations and email authentication.
- Learner profiles and cohort permissions.
- Book catalogue.
- Reading records and interests.
- Staff editing and support tools.
- Deployment, email, backups, and basic monitoring.

**Acceptance:** a student records a book and interests, returns later, and sees the correct history; staff can manage the process independently.

### Phase 3 — Add goals, presentations, feedback, and rewards

Implement:

- Weekly exploration goals.
- Volunteer-supported next steps.
- Short project or presentation summaries.
- Private facilitator feedback.
- Topic-interest ratings.
- A small reward system with duplicate prevention and correction.

**Acceptance:** one student completes the reading-to-sharing cycle, receives reviewed feedback, and earns an appropriate reward.

### Phase 4 — Add peer showcases and moderated discussion

Implement:

- Optional showcase submission.
- Staff review and cohort publication.
- Moderated comments and questions.
- Reporting, withdrawal, and immediate hiding.
- A clear moderation queue.

**Acceptance:** students can share and ask questions while unpublished or rejected material remains inaccessible to peers.

### Phase 5 — Run the full pilot and demonstrate handover

Run the working features with 20–40 learners.

Measure:

- Whether students can record and revisit reading without help.
- Whether weekly goals and feedback are useful.
- Whether rewards encourage meaningful participation.
- Whether peer interactions support learning.
- Staff time spent on administration and moderation.
- Recovery requests, failed saves, and performance problems.

Complete documentation, ownership transfer, restore testing, and an independent operating period.

**Acceptance:** EVG can run normal sessions without routine maker intervention, and a technical successor can deploy and recover the system.

### Phase 6 — Implement topic recommendations

Only after the core platform is working reliably:

- Match manually assigned book topics and learner interests to approved resources.
- Begin with straightforward rules.
- Explain recommendations using the actual matching reason.
- Let educators correct tags and remove resources.
- Gather simple “useful / not useful” feedback.
- Provide educator picks when there is insufficient information.

**Acceptance:** recommendations use real records, remain within approved resources, and are understandable to students and staff.

### Phase 7 — Add limited AI assistance

AI is the final increment.

Start with educator-facing assistance:

- Suggest topic tags from authorised book descriptions.
- Draft possible follow-up topics.
- Suggest matches within the approved resource catalogue.

Require review before AI-generated material becomes student-facing. Avoid sending identifiable learner records to the model.

Set usage limits, track spending, and retain the rules-based system when AI is unavailable.

**Acceptance:** AI produces a measured improvement in recommendation quality or educator workload, within an agreed budget. A direct student chatbot is not part of this phase.

## 5. Cost, ownership, and release criteria

### Budget

Retain **US$35–50/month before tax** as an initial infrastructure planning allowance for the small pilot, excluding AI, equipment, internet, staff time, and technical support.

Supabase Pro starts at US$25/month for the baseline configuration. Additional environments, storage, and usage can increase the total. [Supabase pricing](https://supabase.com/pricing)

The recommendation prototype has no AI usage cost. Working AI receives a separate budget in Phase 7.

The expanded feature scope primarily increases:

- Development and testing effort.
- Moderation time.
- Staff support.
- Content and resource review.

Text-first showcases keep early storage costs small. Reassess costs before adding substantial image or video uploads.

### Ownership and handover

Assign named owners for:

- Programme priorities and funding.
- Book and resource management.
- Rewards and learner support.
- Showcase and comment moderation.
- Technical maintenance and recovery.

EVG should control the domain, vendor accounts, repository, billing, and recovery methods. At least two authorised people should have organisational recovery access.

The handover package must include:

- Vietnamese operating instructions.
- Technical setup and deployment instructions.
- Account-recovery and moderation procedures.
- Backup and restore instructions.
- Known limitations.
- Recurring costs and renewal dates.
- Support contacts and responsibilities.

### Required tests

| Area | Acceptance scenarios |
|---|---|
| Reading records | Add, update, correct, and revisit history; repeated retries do not create duplicates |
| Interests and goals | Changes persist correctly and remain private |
| Rewards | Correct eligibility, no duplicate awards, authorised correction |
| Showcases | Drafts stay private; only approved items reach the cohort; withdrawal works |
| Comments | Approval, rejection, reporting, hiding, and disabled-comment states |
| Permissions | No cross-learner private access or student-to-staff privilege escalation |
| Shared devices | Sign-out, Back, refresh, and next login reveal no previous learner’s information |
| Languages | Student and staff flows, errors, emails, and moderation messages work in both languages |
| Connectivity | Interrupted saves remain visible and retry safely |
| Recommendation previews | Clearly labelled, no fabricated personalisation, no AI requests |
| Recovery | Accounts, records, rewards, moderation states, and files restore successfully |
| Handover | EVG staff run routine workflows; the technical successor deploys and restores independently |

Plan approximately **10–16 weeks for discovery, the core working features, pilot, and handover**, assuming steady developer availability and timely EVG participation. Topic recommendations and AI follow afterward as separately reviewed increments.

The first implementation milestone is **accounts + books + reading history + interests**, accompanied by a prototype showing how rewards, showcases, discussion, and future recommendations will fit.
