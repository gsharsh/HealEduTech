import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanProject, emptyProject, isReadyToShare, projectLimits, projectText, sameProject } from '../src/features/community/togetherModel.ts';

test('private notebook drafts allow unfinished reflections but require a real book and title', () => {
  const draft = { ...emptyProject, book_title: '  A real book  ', title: ' My discovery ' };
  assert.equal(cleanProject(draft).book_title, 'A real book');
  assert.equal(cleanProject(draft).title, 'My discovery');
  assert.equal(isReadyToShare(draft), false);
  assert.throws(() => cleanProject({ ...draft, book_title: '  ' }));
  assert.throws(() => cleanProject({ ...draft, title: '' }));
});
test('showcase readiness requires explanation, evidence and recommendation without requiring a question', () => {
  const draft = { ...emptyProject, book_title: 'A book', title: 'A discovery', summary: 'In my own words', takeaways: 'One idea and example', recommendation: 'For curious readers' };
  assert.equal(isReadyToShare(draft), true);
  for (const key of ['summary', 'takeaways', 'recommendation'] as const) assert.equal(isReadyToShare({ ...draft, [key]: ' \n ' }), false);
});
test('every stored text field enforces its upper bound and input is not mutated', () => {
  const draft = { ...emptyProject, book_title: 'Book', title: 'Discovery' };
  for (const key of Object.keys(projectLimits) as (keyof typeof projectLimits)[]) {
    assert.doesNotThrow(() => cleanProject({ ...draft, [key]: 'x'.repeat(projectLimits[key]) }));
    assert.throws(() => cleanProject({ ...draft, [key]: 'x'.repeat(projectLimits[key] + 1) }));
  }
  assert.equal(draft.title, 'Discovery');
});
test('draft dirty tracking includes format and every public text field', () => {
  assert.equal(sameProject(emptyProject, { ...emptyProject }), true);
  assert.equal(sameProject(emptyProject, { ...emptyProject, format: 'review' }), false);
  for (const key of Object.keys(projectLimits) as (keyof typeof projectLimits)[]) assert.equal(sameProject(emptyProject, { ...emptyProject, [key]: 'new' }), false);
});
test('download is a plain text outline with no hidden identity or server fields', () => {
  const labels = { book_title: 'Book', title: 'Title', summary: 'Summary', takeaways: 'Takeaways', recommendation: 'For whom', question: 'Question' };
  const output = projectText({ ...emptyProject, book_title: 'A book', title: '<script>plain text</script>' }, labels);
  assert.match(output, /^Book\nA book/);
  assert.match(output, /<script>plain text<\/script>/);
  assert.doesNotMatch(output, /user_id|review_note|updated_at/);
});
