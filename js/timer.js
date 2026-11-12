/**
 * FOCUS FLOW — Pomodoro Focus Timer Engine
 * High-precision, drift-resistant countdown timer using timestamp deltas.
 */

import { soundEffects } from './audio.js';
import { formatDateISO } from './storage.js';

export class FocusTimer {
  constructor({ onTick, onComplete, onStateChange }) {
    this.onTick = onTick || (() => {});
    this.onComplete = onComplete || (() => {});
    this.onStateChange = onStateChange || (() => {});

    this.mode = 'work'; // 'work' | 'shortBreak' | 'longBreak'
    this.status = 'idle'; // 'idle' | 'running' | 'paused'
    this.round = 1;
    this.totalRounds = 4;

    // Configurable durations in minutes
    this.durations = {
      work: 25,
      shortBreak: 5,
      longBreak: 15
    };

    this.timeRemaining = this.durations.work * 60; // in seconds
    this.totalDuration = this.durations.work * 60;
    this.endTime = null;
    this.intervalId = null;

    this.linkedTask = null; // { id, title } or null
    this.autoStartBreaks = false;

    // Visibility change handler to re-sync immediately when user switches back to tab
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.status === 'running') {
          this.recalculateRemaining();
          this.notifyTick();
        }
      });
    }
  }

  setDurations({ work, shortBreak, longBreak, autoStartBreaks }) {
    if (work) this.durations.work = Number(work);
    if (shortBreak) this.durations.shortBreak = Number(shortBreak);
    if (longBreak) this.durations.longBreak = Number(longBreak);
    if (autoStartBreaks !== undefined) this.autoStartBreaks = Boolean(autoStartBreaks);

    // If idle, update current duration immediately
    if (this.status === 'idle') {
      this.resetTimeForCurrentMode();
      this.notifyTick();
    }
  }

  setLinkedTask(task) {
    this.linkedTask = task ? { id: task.id, title: task.title } : null;
    this.onStateChange(this.getState());
  }

  setMode(mode) {
    if (!['work', 'shortBreak', 'longBreak'].includes(mode)) return;
    this.stopInterval();
    this.mode = mode;
    this.status = 'idle';
    this.resetTimeForCurrentMode();
    this.notifyTick();
    this.onStateChange(this.getState());
  }

  setCustomWorkMinutes(minutes) {
    const min = Math.max(1, Math.min(180, Number(minutes)));
    this.durations.work = min;
    if (this.mode === 'work' && this.status === 'idle') {
      this.resetTimeForCurrentMode();
      this.notifyTick();
      this.onStateChange(this.getState());
    }
  }

  resetTimeForCurrentMode() {
    const mins = this.durations[this.mode] || 25;
    this.totalDuration = mins * 60;
    this.timeRemaining = this.totalDuration;
    this.endTime = null;
  }

  start() {
    if (this.status === 'running') return;

    soundEffects.init();
    soundEffects.playClick();

    // If starting fresh or resuming
    this.endTime = Date.now() + this.timeRemaining * 1000;
    this.status = 'running';

    this.stopInterval();
    this.intervalId = setInterval(() => {
      this.tick();
    }, 250); // fast polling for snappy UI, but calculations are timestamp-based

    this.notifyTick();
    this.onStateChange(this.getState());
    this.updateDocumentTitle();
  }

  pause() {
    if (this.status !== 'running') return;
    soundEffects.playClick();

    this.recalculateRemaining();
    this.stopInterval();
    this.status = 'paused';

    this.notifyTick();
    this.onStateChange(this.getState());
    this.updateDocumentTitle();
  }

  toggle() {
    if (this.status === 'running') {
      this.pause();
    } else {
      this.start();
    }
  }

  reset() {
    soundEffects.playClick();
    this.stopInterval();
    this.status = 'idle';
    this.resetTimeForCurrentMode();

    this.notifyTick();
    this.onStateChange(this.getState());
    this.resetDocumentTitle();
  }

  skip() {
    soundEffects.playClick();
    this.stopInterval();
    this.handleSessionFinished(true); // skipped = true
  }

  recalculateRemaining() {
    if (this.endTime && this.status === 'running') {
      const now = Date.now();
      const diffMs = this.endTime - now;
      this.timeRemaining = Math.max(0, Math.round(diffMs / 1000));
    }
  }

  tick() {
    this.recalculateRemaining();

    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.stopInterval();
      this.handleSessionFinished(false);
    } else {
      this.notifyTick();
      this.updateDocumentTitle();
    }
  }

  handleSessionFinished(skipped = false) {
    this.status = 'idle';
    const finishedMode = this.mode;
    const sessionDurationMinutes = this.durations[finishedMode];

    if (!skipped) {
      soundEffects.playTimerComplete();
      this.requestDesktopNotification(finishedMode);
    }

    // Determine next mode & cycle
    let nextMode = 'shortBreak';
    if (finishedMode === 'work') {
      if (this.round >= this.totalRounds) {
        nextMode = 'longBreak';
        this.round = 1; // reset rounds after long break
      } else {
        nextMode = 'shortBreak';
        this.round += 1;
      }
    } else {
      // Finished a break, go back to work
      nextMode = 'work';
    }

    // Callback with session data for persistence in analytics & task update
    if (!skipped && finishedMode === 'work') {
      this.onComplete({
        mode: finishedMode,
        durationMinutes: sessionDurationMinutes,
        taskId: this.linkedTask ? this.linkedTask.id : null,
        taskTitle: this.linkedTask ? this.linkedTask.title : 'Фокус-сессия',
        timestamp: new Date().toISOString(),
        dateStr: formatDateISO()
      });
    }

    this.mode = nextMode;
    this.resetTimeForCurrentMode();
    this.notifyTick();
    this.onStateChange(this.getState());
    this.resetDocumentTitle();

    if (this.autoStartBreaks && !skipped && nextMode !== 'work') {
      setTimeout(() => this.start(), 1000);
    }
  }

  stopInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  notifyTick() {
    const progress = this.totalDuration > 0
      ? 1 - (this.timeRemaining / this.totalDuration)
      : 0;

    const formatted = this.formatTime(this.timeRemaining);

    this.onTick({
      timeRemaining: this.timeRemaining,
      totalDuration: this.totalDuration,
      formattedTime: formatted,
      progress: Math.min(1, Math.max(0, progress)),
      mode: this.mode,
      status: this.status,
      round: this.round,
      totalRounds: this.totalRounds
    });
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  updateDocumentTitle() {
    if (typeof document === 'undefined') return;
    const formatted = this.formatTime(this.timeRemaining);
    const modeLabel = this.mode === 'work' ? 'Фокус' : 'Перерыв';
    document.title = `(${formatted}) ${modeLabel} — FOCUS FLOW`;
  }

  resetDocumentTitle() {
    if (typeof document === 'undefined') return;
    document.title = 'FOCUS FLOW — Планировщик задач и времени';
  }

  requestDesktopNotification(mode) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const title = mode === 'work' ? '🎉 Фокус-сессия завершена!' : '⏰ Перерыв окончен!';
        const body = mode === 'work'
          ? 'Отличная работа! Сделайте короткий перерыв и переведите дыхание.'
          : 'Пора возвращаться к задачам с ясной головой.';
        try {
          new Notification(title, { body, icon: './favicon.ico' });
        } catch (e) {}
      }
    }
  }

  getState() {
    return {
      mode: this.mode,
      status: this.status,
      round: this.round,
      totalRounds: this.totalRounds,
      timeRemaining: this.timeRemaining,
      totalDuration: this.totalDuration,
      formattedTime: this.formatTime(this.timeRemaining),
      durations: { ...this.durations },
      linkedTask: this.linkedTask ? { ...this.linkedTask } : null
    };
  }
}
