# Explore: an individual learning journey

**Latest presentation update:** The [warm-palette refinement](UI_REFINEMENT_2026-11-07.md) replaces the original numbered page layout with Books, Resources and Activity views. Interests are collapsed by default, and generic recommendation filler is omitted. The underlying recommendation and privacy contracts below remain applicable.

Implemented on `get-stuff-done-harshith` for review. This is local frontend work using the existing catalogue, reading, and interest data contracts; it adds no hosted migration, paid service, or AI integration.

## Product decision

Explore now answers “What could I learn next?” for a student using the EVG Vietnam library. Together answers “What could we read, discuss, make, and share as a class?” The user's 7 November clarification is the authority for this distinction. Earlier project documents that defer all recommendations describe the old scope.

The learning loop is **choose a curiosity → find a library book → follow a related resource → try a small activity → keep a reflection**. It has three numbered sections and a clear exit to My Reading or Together. It is deliberately an invitation, without scores, streaks, forced completion, or fabricated progress.

The design assumes a mix of confident and developing readers, Vietnamese and English needs, phones and shared devices, and occasional volunteer support. These are design considerations from the project setting, not findings from completed student interviews. The school/centre must still review content and language suitability with actual learners.

## Working use cases

| Actor / use case | Implemented behavior | Boundary |
| --- | --- | --- |
| Guest chooses a topic | Three accessible topic buttons change the book shelf, resources, and offline activity. The URL preserves the choice and browser Back restores it. | No private API reads or account required. |
| Learner returns after reading | The default path uses a saved interest, or a recent book's topic when interests are empty. Suggestions explain the topic connection and name the recent book when relevant. | Matching uses three broad catalogue topics; it does not infer detailed interests from text. |
| Learner changes saved interests | The existing persistent interest editor updates recommendation reasons immediately after a successful save. | Unsaved choices do not silently affect saved-interest explanations. Failed saves retain choices and quota feedback. |
| Learner chooses a next book | Up to three real catalogue suggestions open the existing book-detail flow; students can add the title to My Reading there. | Adding a title to reading is independent of borrowing at the library desk. |
| Learner follows a resource | Six fixed links cover video/transcript, reading, and a bilingual interactive simulation. Publisher, content language, format, and new-tab behavior are visible. | External content is not translated by changing the interface language. No embeds, autoplay, provider API, or click tracking. |
| Learner tries an activity | A topic-specific offline activity expands with materials, steps, and reflection prompts. | Activities are suggestions, not tracked assignments. |
| Learner keeps a discovery | Links lead to existing private reading notes or the Together experience. | Explore does not create a new unsaved text editor or claim to record completion. |
| Service fails | The resource/activity path remains useful when the book shelf fails; a retry reloads the shelf. Recent-reading failure clearly falls back to chosen topic/loaded interests with its own retry. | A failed private read is never treated as evidence about the learner. |
| Session ends | User-keyed state is discarded, pending private requests are aborted, and a guest path replaces private reasons. | No private records are persisted in a shared browser cache. |
| Developer runs demo | The same journey works with fictional books and existing in-memory demo reading/interests. | A visible practice label explains that changes reset on refresh. |

## Recommendation rules and cost

1. A valid `?topic=` chosen by the student takes priority. Otherwise select the first saved interest, then the most recent available reading topic, then Nature.
2. Make one owner-scoped query for the latest **24 reading records**, selecting only book ID, status, update time, and joined public book title/topic. Written reflections are not requested.
3. Reuse the existing interest editor's result through optional callbacks, so there is **one interest read**, not a second read for recommendations. Saving uses the returned saved list.
4. Read **one catalogue page, up to 24 books**, for the selected topic through the existing 15-second public catalogue cache. The existing bounded availability query supplies physical-stock labels; unknown availability remains unknown.
5. Exclude book IDs in those recent reading records and duplicate candidate IDs. Prefer books in the interface language or bilingual, then known availability. Title and ID give a stable order. Show at most three.
6. Give each suggestion a truthful reason: saved interest, recent reading, both, or the chosen topic. The expandable explanation exposes the 24-record/24-book limits.

A fresh signed-in path ordinarily uses four data requests: interests, joined recent reading, catalogue, and availability. A guest uses only catalogue and availability. Public cache hits can reduce these. No request is made per reading record or per recommended book. Changing topics uses the public catalogue cache; a successful interest save does not re-fetch interests or reading.

This is a small explainable recommendation system, not semantic similarity, collaborative filtering, or AI. It does not search the entire catalogue or exclude every book from an arbitrarily long reading history. If a student's recent shelf consumes all candidates, the empty state offers the full topic and other paths instead of inventing titles or filling it with recently read books. This bound is appropriate for the current pilot; a larger catalogue can move candidate selection into a paginated database query after usage evidence justifies it.

## Content sources

Public pages were checked on **7 November 2026**. Descriptions and activity prompts are short original copy. The app links to authorised publisher pages; it does not copy books or download videos.

| Topic | Publisher and resource | What the learner can do |
| --- | --- | --- |
| Nature | [NASA Space Place: Earth's water](https://spaceplace.nasa.gov/water/en/) | Watch a short video or read its transcript. |
| Nature | [Smithsonian National Zoo: Asian elephant](https://nationalzoo.si.edu/animals/asian-elephant) | Explore animal features and how they help it live. |
| Stories | [SAG-AFTRA Foundation / Storyline Online: Library Lion](https://storylineonline.net/books/library-lion/) | Listen to a picture-book reading. |
| Stories | [British Council: The lion and the mouse](https://learnenglishkids.britishcouncil.org/listen-watch/short-stories/lion-mouse) | Watch a story or use its printable text/activity. |
| Science | [NASA Space Place: rocket launches](https://spaceplace.nasa.gov/launching-into-space/en/) | Watch and use the illustrated explanation. |
| Science | [PhET Balancing Act, English](https://phet.colorado.edu/en/simulations/balancing-act) / [Vietnamese](https://phet.colorado.edu/vi/simulations/balancing-act) | Try a virtual balance; the link follows the interface language. |

The PhET landing pages and language variants were verified; this does not establish that every simulated interaction is accessible on every device. External sites can change, show their own comments/links, or require more bandwidth than this app. Students are offered volunteer support, and external content is labelled accurately rather than described as approved by EVG. A staff-owned resource catalogue, age/reading-level tags, and a periodic link-review process remain useful follow-ups.

## Implementation and verification

- `LearningJourney.tsx`: shared live/demo page structure; visible step hierarchy, topic choices, resources, activity and reflection links.
- `LiveExplorePage.tsx`: identity-scoped request lifecycle, resilient shelf and preference integration.
- `ExplorePage.tsx`: clearly labelled fictional demo using existing demo state.
- `exploration.ts`: pure deterministic recommendation rules and URL topic parsing.
- `exploreData.ts`: bounded owner-scoped reading/title/topic query; no reflection text.
- `learningResources.ts`: fixed bilingual resource metadata and educator URLs.
- `InterestPicker.tsx`: backward-compatible load/save callbacks; existing errors, draft retention and explicit saves remain.

Six focused Node tests cover exclusions/deduplication, language/stock ordering, truthful reasons, deterministic bounds, safe topic parsing/defaults, and educator-link constraints. Four browser scenarios (desktop and phone) cover the guest learning path, Vietnamese resource selection, expanded-activity axe checks, real request counts and selection fields, saved-interest refresh, loading failure recovery, and late-result isolation after sign-out. The parent sprint report records final integrated pass counts and rendered review evidence.

Scoped verification completed: **6 Node tests passed; 16 focused desktop/phone browser checks passed**, comprising the four new journeys, existing interest load/save recovery, Vietnamese quota feedback, and public/learner Explore axe checks. TypeScript and scoped ESLint passed. The Vietnamese expanded Science path was rendered and inspected at desktop and phone sizes; no horizontal overflow was found. Browser artifacts are under `/private/tmp/healedu-explore-consultant`. These synthetic checks do not establish real-account persistence or educator approval of external content.

Primary technical reference: [Supabase nested joins](https://supabase.com/docs/guides/database/joins-and-nesting), using the existing `reading_records.book_id → books.id` foreign key and existing ownership policies.

## Morning walkthrough

1. Open `/explore` as a guest. Pick Science, then Stories; use Back and confirm the previous path returns.
2. Switch to Vietnamese. Science's PhET link should point to the Vietnamese page; English resources should still say English.
3. Expand the selected activity. Follow its short steps, then use My Reading or Together.
4. Sign in with a synthetic learner. Save an interest, read/finish a book, return to Explore, and inspect “Why this book?” and “How these suggestions work.”
5. Change saved interests and confirm the reasons update without refreshing the page.
6. On a phone, check that the topic choices, book cards, resource links and expanded activity remain readable and reachable by keyboard/touch.

Remaining product validation: age/reading-level fit, native Vietnamese review, useful recommendation diversity with the actual EVG inventory, and a supervised learner walkthrough. No claim of completed field validation is made.
