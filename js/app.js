/**
 * FOCUS FLOW — Main Application Controller
 * Bootstraps modules, binds event handlers, handles keyboard shortcuts, and orchestrates state saves.
 */

import { loadData, saveData, getDefaultData, validateImportData, formatDateISO } from './storage.js';
import { soundEffects } from './audio.js';
import { TaskManager } from './tasks.js';
import { FocusTimer } from './timer.js';
import { CalendarView } from './calendar.js';
import { AnalyticsEngine } from './analytics.js';
import { UIManager } from './ui.js';

class AppController {
  constructor() {
    this.appData = loadData();

    // Init Sound System
    soundEffects.setSettings(
      this.appData.settings.soundEnabled,
      this.appData.settings.soundVolume
    );

    // Init Task Manager
    this.taskManager = new TaskManager(this.appData, () => {
      this.persist();
    });

    // Init Analytics Engine
    this.analyticsEngine = new AnalyticsEngine(
      this.taskManager,
      this.appData.focusSessions
    );

    // Init Focus Timer
    this.focusTimer = new FocusTimer({
      onTick: () => {
        if (this.uiManager && this.uiManager.activeView === 'timer') {
          this.uiManager.renderTimerView();
        }
      },
      onComplete: (sessionData) => {
        this.handleTimerSessionCompleted(sessionData);
      },
      onStateChange: () => {
        if (this.uiManager && this.uiManager.activeView === 'timer') {
          this.uiManager.renderTimerView();
        }
      }
    });

    // Apply saved Pomodoro settings
    this.focusTimer.setDurations({
      work: this.appData.settings.pomodoroWork,
      shortBreak: this.appData.settings.pomodoroShortBreak,
      longBreak: this.appData.settings.pomodoroLongBreak,
      autoStartBreaks: this.appData.settings.autoStartBreaks
    });

    // Init Calendar View
    this.calendarView = new CalendarView({
      onSelectDate: () => {
        if (this.uiManager) this.uiManager.renderCalendar();
      }
    });

    // Init UI Manager
    this.uiManager = new UIManager({
      appState: this.appData,
      taskManager: this.taskManager,
      focusTimer: this.focusTimer,
      calendarView: this.calendarView,
      analyticsEngine: this.analyticsEngine,
      onSaveData: () => this.persist()
    });

    this.bindEvents();
    this.setupKeyboardShortcuts();

    // Initial render
    this.uiManager.switchView('dashboard');
  }

  persist() {
    this.appData.tasks = this.taskManager.getAllTasks();
    this.appData.focusSessions = this.analyticsEngine.focusSessions;
    saveData(this.appData);
  }

  handleTimerSessionCompleted(session) {
    if (session && session.mode === 'work') {
      this.appData.focusSessions.push(session);
      this.analyticsEngine.setFocusSessions(this.appData.focusSessions);

      if (session.taskId) {
        this.taskManager.addLoggedFocusMinutes(session.taskId, session.durationMinutes);
      }

      this.persist();
      this.uiManager.showToast(
        `🎉 Сессия ${session.durationMinutes} мин завершена! Добавлено в статистику.`,
        'success',
        4000
      );

      // Re-render views
      this.uiManager.renderDashboard();
      this.uiManager.renderAnalytics();
    }
  }

  bindEvents() {
    // 1. Navigation Buttons (Sidebar & Mobile Bar)
    document.querySelectorAll('[data-nav-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-nav-target');
        this.uiManager.switchView(target, true);
      });
    });

    // 2. Theme Toggle Button
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        this.uiManager.toggleTheme();
      });
    }

    // 3. Quick Action Buttons on Dashboard & Header
    const globalAddBtn = document.getElementById('global-add-task-btn');
    if (globalAddBtn) {
      globalAddBtn.addEventListener('click', () => {
        soundEffects.playClick();
        this.uiManager.openCreateTaskModal();
      });
    }

    const dashAddBtn = document.getElementById('dash-quick-add-btn');
    if (dashAddBtn) {
      dashAddBtn.addEventListener('click', () => {
        soundEffects.playClick();
        this.uiManager.openCreateTaskModal();
      });
    }

    const dashStartTimerBtn = document.getElementById('dash-start-timer-btn');
    if (dashStartTimerBtn) {
      dashStartTimerBtn.addEventListener('click', () => {
        this.uiManager.switchView('timer');
        this.focusTimer.start();
      });
    }

    // 4. Task Search & Filters
    const searchInput = document.getElementById('tasks-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.taskManager.setFilters({ search: e.target.value });
        this.uiManager.renderTasks();
      });
    }

    // Status Filter Tabs
    document.querySelectorAll('[data-task-filter]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('[data-task-filter]').forEach(t => t.classList.remove('filter-tab-active'));
        tab.classList.add('filter-tab-active');
        const filterVal = tab.getAttribute('data-task-filter');
        this.taskManager.setFilters({ filter: filterVal });
        soundEffects.playClick();
        this.uiManager.renderTasks();
      });
    });

    // Category Filter Select
    const catSelect = document.getElementById('tasks-category-select');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.taskManager.setFilters({ category: e.target.value });
        this.uiManager.renderTasks();
      });
    }

    // Priority Filter Select
    const prioSelect = document.getElementById('tasks-priority-select');
    if (prioSelect) {
      prioSelect.addEventListener('change', (e) => {
        this.taskManager.setFilters({ priority: e.target.value });
        this.uiManager.renderTasks();
      });
    }

    // Sort Select
    const sortSelect = document.getElementById('tasks-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.taskManager.setFilters({ sort: e.target.value });
        this.uiManager.renderTasks();
      });
    }

    // 5. Task Modal Form Submit
    if (this.uiManager.taskForm) {
      this.uiManager.taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleTaskFormSubmit();
      });
    }

    // Add subtask row button in modal
    const addSubtaskBtn = document.getElementById('task-form-add-subtask-btn');
    if (addSubtaskBtn) {
      addSubtaskBtn.addEventListener('click', () => {
        this.uiManager.addSubtaskRowToForm();
      });
    }

    // Close Modal Buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        const modal = document.getElementById(modalId);
        if (modal) this.uiManager.closeModal(modal);
      });
    });

    // 6. Timer Controls
    const timerPlayBtn = document.getElementById('timer-play-pause-btn');
    if (timerPlayBtn) {
      timerPlayBtn.addEventListener('click', () => {
        this.focusTimer.toggle();
      });
    }

    const timerResetBtn = document.getElementById('timer-reset-btn');
    if (timerResetBtn) {
      timerResetBtn.addEventListener('click', () => {
        this.focusTimer.reset();
      });
    }

    const timerSkipBtn = document.getElementById('timer-skip-btn');
    if (timerSkipBtn) {
      timerSkipBtn.addEventListener('click', () => {
        this.focusTimer.skip();
      });
    }

    // Timer Mode Tabs (Work, Short Break, Long Break)
    document.querySelectorAll('[data-timer-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-timer-mode]').forEach(b => b.classList.remove('timer-tab-active'));
        btn.classList.add('timer-tab-active');
        const mode = btn.getAttribute('data-timer-mode');
        this.focusTimer.setMode(mode);
      });
    });

    // Quick duration preset buttons (15m, 25m, 45m, 60m)
    document.querySelectorAll('[data-timer-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mins = Number(btn.getAttribute('data-timer-preset'));
        this.focusTimer.setCustomWorkMinutes(mins);
        document.querySelectorAll('[data-timer-preset]').forEach(b => b.classList.remove('preset-btn-active'));
        btn.classList.add('preset-btn-active');
        this.uiManager.showToast(`Установлена длительность ${mins} мин`, 'info');
      });
    });

    // Timer Task Picker Select
    const timerTaskSelect = document.getElementById('timer-task-select');
    if (timerTaskSelect) {
      timerTaskSelect.addEventListener('change', (e) => {
        const taskId = e.target.value;
        const task = taskId ? this.taskManager.getTaskById(taskId) : null;
        this.focusTimer.setLinkedTask(task);
      });
    }

    const timerUnlinkBtn = document.getElementById('timer-unlink-task-btn');
    if (timerUnlinkBtn) {
      timerUnlinkBtn.addEventListener('click', () => {
        this.focusTimer.setLinkedTask(null);
        if (timerTaskSelect) timerTaskSelect.value = '';
      });
    }

    // 7. Calendar Controls
    const calPrevBtn = document.getElementById('cal-prev-month-btn');
    if (calPrevBtn) {
      calPrevBtn.addEventListener('click', () => {
        this.calendarView.prevMonth();
        soundEffects.playClick();
        this.uiManager.renderCalendar();
      });
    }

    const calNextBtn = document.getElementById('cal-next-month-btn');
    if (calNextBtn) {
      calNextBtn.addEventListener('click', () => {
        this.calendarView.nextMonth();
        soundEffects.playClick();
        this.uiManager.renderCalendar();
      });
    }

    const calTodayBtn = document.getElementById('cal-today-btn');
    if (calTodayBtn) {
      calTodayBtn.addEventListener('click', () => {
        this.calendarView.jumpToToday();
        soundEffects.playClick();
        this.uiManager.renderCalendar();
      });
    }

    const calQuickAddBtn = document.getElementById('cal-quick-add-btn');
    if (calQuickAddBtn) {
      calQuickAddBtn.addEventListener('click', () => {
        const date = calQuickAddBtn.getAttribute('data-date') || formatDateISO();
        this.uiManager.openCreateTaskModal(date);
      });
    }

    // 8. Settings Modal Open
    const openSettingsBtn = document.getElementById('open-settings-btn');
    if (openSettingsBtn) {
      openSettingsBtn.addEventListener('click', () => {
        soundEffects.playClick();
        this.populateSettingsForm();
        this.uiManager.openModal(this.uiManager.settingsModal);
      });
    }

    // Settings Form Submit / Save
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSettingsFromForm();
      });
    }

    // Test Sound Button in Settings
    const testSoundBtn = document.getElementById('settings-test-sound-btn');
    if (testSoundBtn) {
      testSoundBtn.addEventListener('click', () => {
        soundEffects.init();
        soundEffects.playTimerComplete();
      });
    }

    // Export Data JSON
    const exportBtn = document.getElementById('settings-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportDataJSON();
      });
    }

    // Import Data Trigger
    const importBtn = document.getElementById('settings-import-btn');
    if (importBtn && this.uiManager.importFileInput) {
      importBtn.addEventListener('click', () => {
        this.uiManager.importFileInput.click();
      });

      this.uiManager.importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.importDataJSON(file);
        }
      });
    }

    // Reset All Data button
    const resetDataBtn = document.getElementById('settings-reset-data-btn');
    const resetConfirmModal = document.getElementById('reset-confirm-modal');
    const resetConfirmBtn = document.getElementById('reset-confirm-action-btn');

    if (resetDataBtn && resetConfirmModal) {
      resetDataBtn.addEventListener('click', () => {
        this.uiManager.openModal(resetConfirmModal);
      });
    }

    if (resetConfirmBtn && resetConfirmModal) {
      resetConfirmBtn.addEventListener('click', () => {
        this.appData = {
          version: 1,
          tasks: [],
          categories: ['Работа', 'Обучение', 'Личное', 'Здоровье', 'Проекты'],
          settings: getDefaultData().settings,
          focusSessions: []
        };
        this.taskManager.setData(this.appData);
        this.analyticsEngine.setFocusSessions([]);
        this.persist();
        this.uiManager.closeModal(resetConfirmModal);
        this.uiManager.closeModal(this.uiManager.settingsModal);
        this.uiManager.showToast('Все данные приложения очищены', 'info');
        this.uiManager.renderDashboard();
        this.uiManager.renderTasks();
        this.uiManager.renderCalendar();
        this.uiManager.renderAnalytics();
      });
    }

    // Load Demo Data button
    const loadDemoBtn = document.getElementById('settings-load-demo-btn');
    if (loadDemoBtn) {
      loadDemoBtn.addEventListener('click', () => {
        this.appData = getDefaultData();
        this.taskManager.setData(this.appData);
        this.analyticsEngine.setFocusSessions(this.appData.focusSessions);
        this.persist();
        this.uiManager.closeModal(this.uiManager.settingsModal);
        this.uiManager.showToast('Демонстрационные данные успешно загружены', 'success');
        this.uiManager.renderDashboard();
        this.uiManager.renderTasks();
        this.uiManager.renderCalendar();
        this.uiManager.renderAnalytics();
      });
    }

    // Shortcuts Modal trigger
    const shortcutsBtn = document.getElementById('open-shortcuts-btn');
    if (shortcutsBtn) {
      shortcutsBtn.addEventListener('click', () => {
        this.uiManager.openModal(this.uiManager.shortcutsModal);
      });
    }
  }

  handleTaskFormSubmit() {
    const title = document.getElementById('task-input-title').value;
    const description = document.getElementById('task-input-desc').value;
    const category = document.getElementById('task-input-category').value;
    const priority = document.getElementById('task-input-priority').value;
    const dueDate = document.getElementById('task-input-date').value;
    const dueTime = document.getElementById('task-input-time').value;
    const estimatedMinutes = document.getElementById('task-input-duration').value;

    // Extract dynamic subtasks
    const subtaskInputs = document.querySelectorAll('.subtask-row-input');
    const subtasks = Array.from(subtaskInputs)
      .map(input => input.value.trim())
      .filter(val => val.length > 0)
      .map(title => ({ title, completed: false }));

    try {
      if (this.uiManager.editingTaskId) {
        this.taskManager.updateTask(this.uiManager.editingTaskId, {
          title,
          description,
          category,
          priority,
          dueDate,
          dueTime,
          estimatedMinutes: Number(estimatedMinutes) || 25,
          subtasks
        });
        this.uiManager.showToast('Задача обновлена', 'success');
      } else {
        this.taskManager.createTask({
          title,
          description,
          category,
          priority,
          dueDate,
          dueTime,
          estimatedMinutes: Number(estimatedMinutes) || 25,
          subtasks
        });
        this.uiManager.showToast('Задача успешно создана', 'success');
      }

      this.persist();
      this.uiManager.closeModal(this.uiManager.taskModal);
      this.uiManager.renderDashboard();
      this.uiManager.renderTasks();
      this.uiManager.renderCalendar();
      this.uiManager.renderAnalytics();
    } catch (err) {
      this.uiManager.showToast(err.message || 'Ошибка сохранения задачи', 'error');
    }
  }

  populateSettingsForm() {
    const s = this.appData.settings;
    document.getElementById('settings-input-work').value = s.pomodoroWork || 25;
    document.getElementById('settings-input-short-break').value = s.pomodoroShortBreak || 5;
    document.getElementById('settings-input-long-break').value = s.pomodoroLongBreak || 15;
    document.getElementById('settings-input-sound').checked = s.soundEnabled !== false;
    document.getElementById('settings-input-volume').value = Math.round((s.soundVolume ?? 0.7) * 100);
    document.getElementById('settings-input-notifications').checked = Boolean(s.notificationsEnabled);
    document.getElementById('settings-input-auto-breaks').checked = Boolean(s.autoStartBreaks);

    const themeRadio = document.querySelector(`input[name="theme-choice"][value="${s.theme || 'dark'}"]`);
    if (themeRadio) themeRadio.checked = true;
  }

  saveSettingsFromForm() {
    const work = Number(document.getElementById('settings-input-work').value) || 25;
    const shortBreak = Number(document.getElementById('settings-input-short-break').value) || 5;
    const longBreak = Number(document.getElementById('settings-input-long-break').value) || 15;
    const soundEnabled = document.getElementById('settings-input-sound').checked;
    const volume = Number(document.getElementById('settings-input-volume').value) / 100;
    const notificationsEnabled = document.getElementById('settings-input-notifications').checked;
    const autoStartBreaks = document.getElementById('settings-input-auto-breaks').checked;

    const selectedTheme = document.querySelector('input[name="theme-choice"]:checked')?.value || 'dark';

    this.appData.settings = {
      ...this.appData.settings,
      pomodoroWork: work,
      pomodoroShortBreak: shortBreak,
      pomodoroLongBreak: longBreak,
      soundEnabled,
      soundVolume: volume,
      notificationsEnabled,
      autoStartBreaks,
      theme: selectedTheme
    };

    soundEffects.setSettings(soundEnabled, volume);
    this.focusTimer.setDurations({ work, shortBreak, longBreak, autoStartBreaks });
    this.uiManager.setTheme(selectedTheme);

    // Request notification permission if enabled
    if (notificationsEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    this.persist();
    this.uiManager.closeModal(this.uiManager.settingsModal);
    this.uiManager.showToast('Настройки сохранены', 'success');
  }

  exportDataJSON() {
    try {
      const dataStr = JSON.stringify(this.appData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `focus-flow-backup-${formatDateISO()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.uiManager.showToast('Данные успешно экспортированы', 'success');
    } catch (e) {
      this.uiManager.showToast('Ошибка при экспорте данных', 'error');
    }
  }

  importDataJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const validated = validateImportData(parsed);
        if (!validated.valid) {
          this.uiManager.showToast(validated.error, 'error', 5000);
          return;
        }

        this.appData = validated.data;
        this.taskManager.setData(this.appData);
        this.analyticsEngine.setFocusSessions(this.appData.focusSessions);
        this.persist();

        this.uiManager.closeModal(this.uiManager.settingsModal);
        this.uiManager.showToast('Данные успешно импортированы!', 'success');
        this.uiManager.renderDashboard();
        this.uiManager.renderTasks();
        this.uiManager.renderCalendar();
        this.uiManager.renderAnalytics();
      } catch (err) {
        this.uiManager.showToast('Не удалось распарсить JSON файл', 'error');
      }
    };
    reader.readAsText(file);
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when user is typing in inputs or textareas
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        if (e.key === 'Escape') {
          document.activeElement.blur();
        }
        return;
      }

      if (e.key === 'Escape') {
        // Close modals
        const openModal = document.querySelector('.modal-overlay:not(.hidden)');
        if (openModal) {
          this.uiManager.closeModal(openModal);
        }
        return;
      }

      if (e.key === 'n' || e.key === 'N' || e.key === 'т' || e.key === 'Т') {
        e.preventDefault();
        this.uiManager.openCreateTaskModal();
      } else if (e.code === 'Space') {
        if (this.uiManager.activeView === 'timer') {
          e.preventDefault();
          this.focusTimer.toggle();
        }
      } else if (e.key === '1') {
        this.uiManager.switchView('dashboard');
      } else if (e.key === '2') {
        this.uiManager.switchView('tasks');
      } else if (e.key === '3') {
        this.uiManager.switchView('timer');
      } else if (e.key === '4') {
        this.uiManager.switchView('calendar');
      } else if (e.key === '5') {
        this.uiManager.switchView('analytics');
      } else if (e.key === '?') {
        e.preventDefault();
        this.uiManager.openModal(this.uiManager.shortcutsModal);
      }
    });
  }
}

// Bootstrap on DOMContentLoaded
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.focusFlowApp = new AppController();
  });
}
