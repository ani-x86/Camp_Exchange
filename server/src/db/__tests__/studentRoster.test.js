import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStudentCsv } from '../studentRoster.js';

const HEADER = 'Email,Name of the Student,Password,PRN,R.N.';

test('parses a roster and preserves PRNs as strings', () => {
  const [student] = parseStudentCsv(
    `${HEADER}\nstudent@example.edu,Test Student,secret,001234,45`
  );

  assert.equal(student.prn, '001234');
  assert.equal(student.email, 'student@example.edu');
  assert.equal(student.password, 'secret');
  assert.equal(student.rollNumber, '45');
});

test('supports quoted CSV values', () => {
  const [student] = parseStudentCsv(
    `${HEADER}\nstudent@example.edu,"Student, Test","pass,word",1234,45`
  );

  assert.equal(student.name, 'Student, Test');
  assert.equal(student.password, 'pass,word');
});

test('rejects duplicate PRNs', () => {
  assert.throws(
    () => parseStudentCsv(
      `${HEADER}\nfirst@example.edu,First Student,secret,1234,1\nsecond@example.edu,Second Student,secret,1234,2`
    ),
    /duplicate PRN/
  );
});

test('rejects invalid email and PRN values', () => {
  assert.throws(
    () => parseStudentCsv(`${HEADER}\nnot-an-email,Test Student,secret,1234,1`),
    /invalid email/
  );
  assert.throws(
    () => parseStudentCsv(`${HEADER}\nstudent@example.edu,Test Student,secret,12A4,1`),
    /invalid PRN/
  );
});

test('rejects passwords that bcrypt would truncate', () => {
  assert.throws(
    () => parseStudentCsv(`${HEADER}\nstudent@example.edu,Test Student,${'x'.repeat(73)},1234,1`),
    /too long/
  );
});
