import assert from 'node:assert/strict';
import test from 'node:test';
import { staffAccessErrorKey } from '../src/features/admin/staffAccessErrors.ts';

test('staff access errors explain known corrective actions without exposing backend details', () => {
  assert.equal(staffAccessErrorKey({ code: '42501', message: 'Administrator access required' }), 'permission');
  assert.equal(staffAccessErrorKey({ code: '23503', message: 'No Auth account exists for that email' }), 'missingAccount');
  assert.equal(staffAccessErrorKey({ code: '55000', message: 'At least one administrator must remain' }), 'lastAdministrator');
  assert.equal(staffAccessErrorKey({ code: '55000', message: 'An internal database object is unavailable' }), 'failed');
  assert.equal(staffAccessErrorKey(new Error('Database connection details')), 'failed');
  assert.equal(staffAccessErrorKey(null), 'failed');
});
