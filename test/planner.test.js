/**
 * FOCUS FLOW — Unit Tests
 * Uses Node's built-in test runner (node:test) and node:assert/strict.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeHTML, validateImportData, getDefaultData, formatDateISO } from '../js/storage.js';
import { TaskManager } from '../js/tasks.js';
import { FocusTimer } from '../js/timer.js';
import { AnalyticsEngine } from '../js/analytics.js';

test('sanitizeHTML escapes dangerous script and HTML tags', () => {
  const unsafe = '<script>alert("XSS")</script>&"\'';
  const clean = sanitizeHTML(unsafe);
  assert.equal(clean.includes('<script>'), false);
  assert.equal(clean.includes('&lt;script&gt;'), true);
  assert.equal(clean.includes('&amp;'), true);
});

test('validateImportData validates correct schema and handles malformed input', () => {
  // Invalid inputs
  assert.equal(validateImportData(null).valid, false);
  assert.equal(validateImportData({}).valid, false);
  assert.equal(validateImportData({ tasks: 'not-an-array' }).valid, false);

  // Valid import
  const validPayload = {
    version: 1,
    tasks: [
      {
        id: 't_1',
        title: 'Тестовая задача',
        category: 'Работа',
        priority: 'high',
        dueDate: '2026-11-12',
        completed: false
      }
    ],
    categories: ['Работа', 'Обучение'],
    settings: { pomodoroWork: 30 }
  };

  const res = validateImportData(validPayload);
  assert.equal(res.valid, true);
  assert.equal(res.data.tasks.length, 1);
  assert.equal(res.data.tasks[0].title, 'Тестовая задача');
  assert.equal(res.data.settings.pomodoroWork, 30);
});

test('TaskManager creates, updates, and deletes tasks', () => {
  const initial = { tasks: [], categories: ['Работа'] };
  let changeCount = 0;
  const tm = new TaskManager(initial, () => { changeCount++; });

  // Create
  const task = tm.createTask({
    title: '  Написать документацию  ',
    category: 'Работа',
    priority: 'urgent',
    estimatedMinutes: 45
  });

  assert.equal(task.title, 'Написать документацию');
  assert.equal(task.priority, 'urgent');
  assert.equal(tm.getAllTasks().length, 1);
  assert.equal(changeCount, 1);

  // Update
  tm.updateTask(task.id, { title: 'Обновленная документация', priority: 'low' });
  const updated = tm.getTaskById(task.id);
  assert.equal(updated.title, 'Обновленная документация');
  assert.equal(updated.priority, 'low');

  // Delete
  const deleted = tm.deleteTask(task.id);
  assert.equal(deleted, true);
  assert.equal(tm.getAllTasks().length, 0);
});

test('TaskManager subtask completion updates parent state and vice versa', () => {
  const tm = new TaskManager({ tasks: [] }, () => {});

  const task = tm.createTask({
    title: 'Комплексная задача',
    subtasks: [
      { id: 's1', title: 'Шаг 1', completed: false },
      { id: 's2', title: 'Шаг 2', completed: false }
    ]
  });

  assert.equal(task.completed, false);

  // Complete step 1
  tm.toggleSubtask(task.id, 's1');
  assert.equal(task.completed, false);

  // Complete step 2 -> all subtasks done, should mark parent as complete
  tm.toggleSubtask(task.id, 's2');
  assert.equal(task.completed, true);
  assert.notEqual(task.completedAt, null);

  // Uncheck step 1 -> parent becomes incomplete
  tm.toggleSubtask(task.id, 's1');
  assert.equal(task.completed, false);
});

test('TaskManager calculates consecutive productive day streak correctly', () => {
  const today = formatDateISO();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = formatDateISO(yesterday);

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoISO = formatDateISO(twoDaysAgo);

  const initial = {
    tasks: [
      { id: 't1', title: 'T1', completed: true, completedAt: `${today}T10:00:00Z` },
      { id: 't2', title: 'T2', completed: true, completedAt: `${yesterdayISO}T10:00:00Z` },
      { id: 't3', title: 'T3', completed: true, completedAt: `${twoDaysAgoISO}T10:00:00Z` }
    ]
  };

  const tm = new TaskManager(initial, () => {});
  const streak = tm.calculateStreak();
  assert.equal(streak.current, 3);
  assert.equal(streak.best >= 3, true);
});

test('FocusTimer formats time strings and cycles rounds properly', () => {
  const timer = new FocusTimer({});

  assert.equal(timer.formatTime(1500), '25:00');
  assert.equal(timer.formatTime(65), '01:05');
  assert.equal(timer.formatTime(9), '00:09');

  // Test Round Progression
  timer.mode = 'work';
  timer.round = 1;
  timer.handleSessionFinished(true); // skip work session
  assert.equal(timer.mode, 'shortBreak');
  assert.equal(timer.round, 2);
});

test('AnalyticsEngine computes correct overview metrics and activity', () => {
  const tasks = [
    { id: 't1', completed: true, completedAt: new Date().toISOString() },
    { id: 't2', completed: true, completedAt: new Date().toISOString() },
    { id: 't3', completed: false, completedAt: null }
  ];
  const tm = new TaskManager({ tasks, categories: ['Работа', 'Личное'] }, () => {});

  const focusSessions = [
    { id: 'f1', durationMinutes: 25, dateStr: formatDateISO(), type: 'work' },
    { id: 'f2', durationMinutes: 50, dateStr: formatDateISO(), type: 'work' }
  ];

  const engine = new AnalyticsEngine(tm, focusSessions);
  const overview = engine.getOverviewStats();

  assert.equal(overview.totalTasks, 3);
  assert.equal(overview.completedTasks, 2);
  assert.equal(overview.completionRate, 67); // 2/3 = 66.6% -> 67%
  assert.equal(overview.focusTotalMinutes, 75);
  assert.equal(overview.focusFormatted, '1ч 15м');
});
