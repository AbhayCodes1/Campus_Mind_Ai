import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuery, resolveAssistantQuery } from './assistant.ts';
import { sqlite } from './sqlite.ts';

const access = { role: 'admin', source: 'demo' } as const;

test('parses a student count query by name', () => {
  assert.equal(parseQuery('how many abhay singh').intent, 'student_count');
});

test('parses a department count query', () => {
  assert.equal(parseQuery('How many students are in CSE?').intent, 'student_count');
  assert.equal(parseQuery('How many students are in CSE?').department, 'Computer Science');
});

test('parses attendance threshold query', () => {
  const parsed = parseQuery('Show attendance below 75 percent.');
  assert.equal(parsed.intent, 'attendance');
  assert.equal(parsed.threshold, 75);
  assert.equal(parsed.studentName, undefined);
});

test('parses pending fee query', () => {
  assert.equal(parseQuery('Who has pending fees?').intent, 'fees');
});

test('parses full student report query', () => {
  const parsed = parseQuery("Show Abhay Singh's complete report.");
  assert.equal(parsed.intent, 'student_report');
  assert.equal(parsed.studentName?.includes('abhay'), true);
});

test('resolves a general count query against the database', () => {
  const result = resolveAssistantQuery('How many students are enrolled?', access);
  assert.match(result.answer, /\d+.*student/i);
});

test('resolves attendance query against threshold', () => {
  const result = resolveAssistantQuery('Show attendance below 75 percent.', access);
  assert.match(result.answer, /below 75%|No visible student|above the 75%/i);
});

test('resolves pending fee query', () => {
  const result = resolveAssistantQuery('Who has pending fees?', access);
  assert.match(result.answer, /Pending fees|no pending fee|outstanding/i);
});

test('filters exam queries by the requested course', () => {
  const parsed = parseQuery('Show exam schedule for DBMS');
  assert.equal(parsed.intent, 'exams');
  assert.equal(parsed.courseCode, 'DBMS');

  const result = resolveAssistantQuery('Show exam schedule for DBMS', access);
  assert.match(result.answer, /DBMS/i);
  assert.match(result.answer, /no upcoming exam schedule/i);
});

test('handles unsupported query safely', () => {
  const result = resolveAssistantQuery('Tell me the weather in Tokyo', access);
  assert.equal(result.intent, 'unsupported');
  assert.match(result.answer, /student records|attendance|fees|results|exams/i);
});

test('database contains students and courses', () => {
  const students = sqlite.prepare('SELECT COUNT(*) AS count FROM students').get() as { count: number };
  const courses = sqlite.prepare('SELECT COUNT(*) AS count FROM courses').get() as { count: number };
  assert.ok(students.count > 0);
  assert.ok(courses.count > 0);
});
