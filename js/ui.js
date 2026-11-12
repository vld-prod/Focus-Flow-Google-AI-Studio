/**
 * FOCUS FLOW — UI & View Rendering Layer
 * Modular view rendering, modals, toast system, theme switcher, and DOM event bindings.
 */

import { sanitizeHTML, formatDateISO } from './storage.js';
import { PRIORITY_LABELS, PRIORITY_WEIGHTS } from './tasks.js';
import { CATEGORY_COLORS } from './analytics.js';
import { soundEffects } from './audio.js';

export class UIManager {
  constructor({ appState, taskManager, focusTimer, calendarView, analyticsEngine, onSaveData }) {
    this.appState = appState;
    this.taskManager = taskManager;
    this.focusTimer = focusTimer;
    this.calendarView = calendarView;
    this.analyticsEngine = analyticsEngine;
    this.onSaveData = onSaveData || (() => {});

    this.activeView = 'dashboard'; // 'dashboard' | 'tasks' | 'timer' | 'calendar' | 'analytics'
    this.editingTaskId = null;
    this.draggedTaskId = null;

    this.initDOMRefs();
    this.initTheme();
  }

  initDOMRefs() {
    this.views = {
      dashboard: document.getElementById('view-dashboard'),
      tasks: document.getElementById('view-tasks'),
      timer: document.getElementById('view-timer'),
      calendar: document.getElementById('view-calendar'),
      analytics: document.getElementById('view-analytics')
    };

    this.navButtons = document.querySelectorAll('[data-nav-target]');
    this.toastContainer = document.getElementById('toast-container');

    // Modals
    this.taskModal = document.getElementById('task-modal');
    this.taskForm = document.getElementById('task-form');
    this.deleteModal = document.getElementById('delete-modal');
    this.settingsModal = document.getElementById('settings-modal');
    this.shortcutsModal = document.getElementById('shortcuts-modal');
    this.importFileInput = document.getElementById('import-file-input');
  }

  initTheme() {
    const savedTheme = this.appState.settings.theme || 'dark';
    this.setTheme(savedTheme);
  }

  setTheme(theme) {
    this.appState.settings.theme = theme;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.setAttribute('aria-label', theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
      themeToggleBtn.innerHTML = theme === 'dark'
        ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`
        : `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`;
    }
    this.onSaveData();
  }

  toggleTheme() {
    soundEffects.playClick();
    const newTheme = this.appState.settings.theme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
    this.showToast(`Установлена ${newTheme === 'dark' ? 'тёмная' : 'светлая'} тема`, 'info');
  }

  // View Switching
  switchView(viewName, isUserAction = false) {
    if (!this.views[viewName]) return;
    this.activeView = viewName;

    if (isUserAction) {
      soundEffects.playClick();
    }

    // Update active class on views
    Object.keys(this.views).forEach(key => {
      if (this.views[key]) {
        if (key === viewName) {
          this.views[key].classList.remove('hidden');
          this.views[key].classList.add('view-active');
        } else {
          this.views[key].classList.add('hidden');
          this.views[key].classList.remove('view-active');
        }
      }
    });

    // Update active state on nav buttons
    this.navButtons.forEach(btn => {
      const target = btn.getAttribute('data-nav-target');
      if (target === viewName) {
        btn.classList.add('nav-btn-active');
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.classList.remove('nav-btn-active');
        btn.removeAttribute('aria-current');
      }
    });

    // Re-render specific views when displayed
    if (viewName === 'dashboard') this.renderDashboard();
    if (viewName === 'tasks') this.renderTasks();
    if (viewName === 'timer') this.renderTimerView();
    if (viewName === 'calendar') this.renderCalendar();
    if (viewName === 'analytics') this.renderAnalytics();

    // Scroll to top of main view
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Toast System
  showToast(message, type = 'info', duration = 3200) {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-slide-in`;

    const iconSvg = {
      success: `<svg class="w-5 h-5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`,
      error: `<svg class="w-5 h-5 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`,
      info: `<svg class="w-5 h-5 shrink-0 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
    }[type] || '';

    toast.innerHTML = `
      <div class="flex items-center gap-3">
        ${iconSvg}
        <span class="text-sm font-medium text-main">${sanitizeHTML(message)}</span>
      </div>
      <button class="toast-close-btn p-1 text-muted hover:text-main" aria-label="Закрыть">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    `;

    toast.querySelector('.toast-close-btn').addEventListener('click', () => {
      toast.remove();
    });

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('animate-fade-out');
        setTimeout(() => toast.remove(), 250);
      }
    }, duration);
  }

  // DASHBOARD RENDERING
  renderDashboard() {
    const greetingEl = document.getElementById('dash-greeting');
    const dateEl = document.getElementById('dash-date');

    const now = new Date();
    const hours = now.getHours();
    let greeting = 'Добрый день';
    if (hours >= 5 && hours < 12) greeting = 'Доброе утро';
    else if (hours >= 12 && hours < 17) greeting = 'Добрый день';
    else if (hours >= 17 && hours < 23) greeting = 'Добрый вечер';
    else greeting = 'Доброй ночи';

    if (greetingEl) greetingEl.textContent = `${greeting}!`;

    if (dateEl) {
      const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      dateEl.textContent = now.toLocaleDateString('ru-RU', options);
    }

    // Today's Stats
    const stats = this.taskManager.getTodayStats();
    const streak = this.taskManager.calculateStreak();
    const overview = this.analyticsEngine.getOverviewStats();

    const todayDoneEl = document.getElementById('dash-today-done');
    const todayRemainEl = document.getElementById('dash-today-remain');
    const todayPctEl = document.getElementById('dash-today-pct');
    const todayProgressCircle = document.getElementById('dash-progress-ring-circle');
    const streakEl = document.getElementById('dash-streak-count');
    const focusTimeEl = document.getElementById('dash-focus-time');

    if (todayDoneEl) todayDoneEl.textContent = stats.completed;
    if (todayRemainEl) todayRemainEl.textContent = stats.remaining;
    if (todayPctEl) todayPctEl.textContent = `${stats.percentage}%`;
    if (streakEl) {
      streakEl.innerHTML = `<span class="font-mono text-xl font-bold">${streak.current}</span> <span class="text-xs text-muted font-normal">${this.pluralizeDays(streak.current)}</span>`;
    }
    if (focusTimeEl) focusTimeEl.textContent = overview.focusFormatted;

    // Update global task count badge in sidebar
    const counterEl = document.getElementById('tasks-count-badge');
    if (counterEl) {
      const activeCount = this.taskManager.getAllTasks().filter(t => !t.completed).length;
      counterEl.textContent = activeCount;
    }

    // Progress Ring (r=38, C = 2 * PI * 38 = 238.76)
    if (todayProgressCircle) {
      const circumference = 2 * Math.PI * 38;
      const offset = circumference - (stats.percentage / 100) * circumference;
      todayProgressCircle.style.strokeDashoffset = offset;
    }

    // Weekly Activity Mini-Chart
    const weeklyContainer = document.getElementById('dash-weekly-chart');
    if (weeklyContainer) {
      const days = this.analyticsEngine.getLast7DaysActivity();
      weeklyContainer.innerHTML = this.analyticsEngine.renderWeeklyBarChartSVG(days);
    }

    // Today's Tasks preview list (up to 5 tasks)
    const todayListContainer = document.getElementById('dash-today-tasks-list');
    const todayEmptyState = document.getElementById('dash-today-empty');
    const today = formatDateISO();
    const todayTasks = this.taskManager.getAllTasks().filter(t => t.dueDate === today);

    if (todayListContainer) {
      if (todayTasks.length === 0) {
        todayListContainer.innerHTML = '';
        if (todayEmptyState) todayEmptyState.classList.remove('hidden');
      } else {
        if (todayEmptyState) todayEmptyState.classList.add('hidden');
        todayListContainer.innerHTML = todayTasks
          .map(task => this.renderTaskCardHTML(task, false))
          .join('');
        this.bindTaskCardEvents(todayListContainer);
      }
    }

    // Upcoming queue (up to 4 upcoming tasks)
    const upcomingContainer = document.getElementById('dash-upcoming-tasks-list');
    const upcomingTasks = this.taskManager.getAllTasks()
      .filter(t => !t.completed && t.dueDate > today)
      .slice(0, 4);

    if (upcomingContainer) {
      if (upcomingTasks.length === 0) {
        upcomingContainer.innerHTML = `<p class="text-sm text-muted py-3">Нет запланированных задач на ближайшие дни.</p>`;
      } else {
        upcomingContainer.innerHTML = upcomingTasks
          .map(task => this.renderTaskCardHTML(task, false))
          .join('');
        this.bindTaskCardEvents(upcomingContainer);
      }
    }
  }

  // TASKS LIST RENDERING
  renderTasks() {
    const listContainer = document.getElementById('tasks-container');
    const emptyState = document.getElementById('tasks-empty-state');
    const counterEl = document.getElementById('tasks-count-badge');

    const filtered = this.taskManager.getFilteredTasks();

    if (counterEl) {
      counterEl.textContent = `${filtered.length} задач`;
    }

    if (filtered.length === 0) {
      listContainer.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
    } else {
      if (emptyState) emptyState.classList.add('hidden');
      listContainer.innerHTML = filtered
        .map(task => this.renderTaskCardHTML(task, true))
        .join('');
      this.bindTaskCardEvents(listContainer);
    }
  }

  renderTaskCardHTML(task, isFullList = true) {
    const isCompleted = task.completed;
    const catColor = CATEGORY_COLORS[task.category] || '#6366f1';
    const priorityLabel = PRIORITY_LABELS[task.priority] || 'Средний';

    // Subtasks summary
    const subtasks = task.subtasks || [];
    const subDone = subtasks.filter(s => s.completed).length;
    const hasSubtasks = subtasks.length > 0;

    // Check overdue
    const isOverdue = !isCompleted && task.dueDate < formatDateISO();

    return `
      <div class="task-card ${isCompleted ? 'task-card-completed' : ''} ${isOverdue ? 'task-card-overdue' : ''}"
        data-task-id="${task.id}"
        draggable="${isFullList ? 'true' : 'false'}"
      >
        <div class="flex items-start gap-3">
          ${isFullList ? `
            <div class="drag-handle cursor-grab text-muted hover:text-main shrink-0 mt-1" aria-label="Перетащить задачу">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path></svg>
            </div>
          ` : ''}

          <!-- Complete Checkbox -->
          <button class="task-checkbox-btn shrink-0 mt-0.5" data-action="toggle-complete" data-task-id="${task.id}" aria-label="${isCompleted ? 'Отметить невыполненной' : 'Отметить выполненной'}">
            <span class="custom-checkbox ${isCompleted ? 'checked' : ''}">
              <svg class="w-3.5 h-3.5 ${isCompleted ? 'opacity-100' : 'opacity-0'} transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
              </svg>
            </span>
          </button>

          <!-- Task Body -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <h3 class="task-title font-medium text-main text-sm truncate ${isCompleted ? 'line-through text-muted' : ''}">
                ${sanitizeHTML(task.title)}
              </h3>
            </div>

            ${task.description ? `
              <p class="text-xs text-muted mb-2 line-clamp-2">${sanitizeHTML(task.description)}</p>
            ` : ''}

            <!-- Metadata Row -->
            <div class="flex items-center gap-3 text-xs text-muted flex-wrap">
              <!-- Category Indicator -->
              <span class="inline-flex items-center gap-1.5 font-medium" style="color: ${catColor};">
                <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${catColor};"></span>
                <span>${sanitizeHTML(task.category)}</span>
              </span>

              <span aria-hidden="true" class="text-border">·</span>

              <!-- Priority -->
              <span class="priority-tag priority-${task.priority}">
                ${priorityLabel}
              </span>

              <span aria-hidden="true" class="text-border">·</span>

              <!-- Due Date & Time -->
              <span class="inline-flex items-center gap-1 ${isOverdue ? 'text-rose-500 font-medium' : ''}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span>${this.formatDisplayDate(task.dueDate)}</span>
                ${task.dueTime ? `<span>${task.dueTime}</span>` : ''}
              </span>

              ${task.estimatedMinutes ? `
                <span aria-hidden="true" class="text-border">·</span>
                <span class="inline-flex items-center gap-1 font-mono">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span>${task.estimatedMinutes}м</span>
                </span>
              ` : ''}

              ${hasSubtasks ? `
                <span aria-hidden="true" class="text-border">·</span>
                <button class="subtasks-toggle-btn text-xs hover:text-main inline-flex items-center gap-1" data-action="toggle-subtasks-view" data-task-id="${task.id}">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                  <span>${subDone}/${subtasks.length}</span>
                </button>
              ` : ''}
            </div>

            <!-- Expandable Subtasks Checklist -->
            ${hasSubtasks ? `
              <div class="subtasks-list-panel mt-2.5 pt-2 border-t border-subtle hidden" id="subtasks-${task.id}">
                ${subtasks.map(st => `
                  <div class="flex items-center gap-2 py-1 text-xs">
                    <button class="subtask-check-btn" data-action="toggle-subtask" data-task-id="${task.id}" data-subtask-id="${st.id}">
                      <span class="custom-checkbox custom-checkbox-sm ${st.completed ? 'checked' : ''}">
                        <svg class="w-2.5 h-2.5 ${st.completed ? 'opacity-100' : 'opacity-0'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </span>
                    </button>
                    <span class="${st.completed ? 'line-through text-muted' : 'text-main'}">${sanitizeHTML(st.title)}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Card Actions Menu -->
          <div class="task-card-actions flex items-center gap-1 shrink-0">
            <button class="task-action-btn" data-action="focus-task" data-task-id="${task.id}" title="Привязать к таймеру фокуса">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </button>
            <button class="task-action-btn" data-action="edit-task" data-task-id="${task.id}" title="Редактировать">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            </button>
            <button class="task-action-btn hover:text-rose-500" data-action="delete-task" data-task-id="${task.id}" title="Удалить">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  bindTaskCardEvents(container) {
    if (!container) return;

    // Toggle Complete
    container.querySelectorAll('[data-action="toggle-complete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-task-id');
        this.taskManager.toggleTaskComplete(id);
        this.onSaveData();
        this.renderDashboard();
        this.renderTasks();
        this.renderCalendar();
      });
    });

    // Subtasks Accordion Toggle
    container.querySelectorAll('[data-action="toggle-subtasks-view"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-task-id');
        const panel = document.getElementById(`subtasks-${id}`);
        if (panel) panel.classList.toggle('hidden');
      });
    });

    // Toggle Subtask checkbox
    container.querySelectorAll('[data-action="toggle-subtask"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        const subtaskId = btn.getAttribute('data-subtask-id');
        this.taskManager.toggleSubtask(taskId, subtaskId);
        this.onSaveData();
        this.renderDashboard();
        this.renderTasks();
      });
    });

    // Focus on this task (sets in timer)
    container.querySelectorAll('[data-action="focus-task"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-task-id');
        const task = this.taskManager.getTaskById(id);
        if (task) {
          this.focusTimer.setLinkedTask(task);
          this.switchView('timer');
          this.showToast(`Задача "${task.title}" привязана к таймеру фокуса`, 'info');
        }
      });
    });

    // Edit Task
    container.querySelectorAll('[data-action="edit-task"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-task-id');
        this.openEditTaskModal(id);
      });
    });

    // Delete Task
    container.querySelectorAll('[data-action="delete-task"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-task-id');
        this.openDeleteConfirmModal(id);
      });
    });

    // Drag and drop
    container.querySelectorAll('.task-card[draggable="true"]').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        this.draggedTaskId = card.getAttribute('data-task-id');
        card.classList.add('opacity-50', 'dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        card.classList.add('border-indigo-500');
      });

      card.addEventListener('dragleave', () => {
        card.classList.remove('border-indigo-500');
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('border-indigo-500');
        const targetId = card.getAttribute('data-task-id');
        if (this.draggedTaskId && this.draggedTaskId !== targetId) {
          const all = this.taskManager.getAllTasks();
          const sourceIdx = all.findIndex(t => t.id === this.draggedTaskId);
          const targetIdx = all.findIndex(t => t.id === targetId);
          if (sourceIdx !== -1 && targetIdx !== -1) {
            this.taskManager.reorderTasks(sourceIdx, targetIdx);
            this.onSaveData();
            this.renderTasks();
            this.showToast('Порядок задач обновлён', 'info');
          }
        }
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('opacity-50', 'dragging', 'border-indigo-500');
        this.draggedTaskId = null;
      });
    });
  }

  // TIMER VIEW RENDERING
  renderTimerView() {
    const timerState = this.focusTimer.getState();

    const timeDisplay = document.getElementById('timer-time-display');
    const modeBadge = document.getElementById('timer-mode-badge');
    const roundBadge = document.getElementById('timer-round-badge');
    const progressCircle = document.getElementById('timer-progress-ring-circle');
    const playPauseBtn = document.getElementById('timer-play-pause-btn');
    const linkedTaskBanner = document.getElementById('timer-linked-task-banner');
    const linkedTaskTitle = document.getElementById('timer-linked-task-title');

    if (timeDisplay) timeDisplay.textContent = timerState.formattedTime;

    if (modeBadge) {
      const modeLabels = {
        work: 'Фокус-сессия',
        shortBreak: 'Короткий перерыв',
        longBreak: 'Длинный перерыв'
      };
      modeBadge.textContent = modeLabels[timerState.mode] || 'Фокус';
    }

    if (roundBadge) {
      roundBadge.textContent = `Раунд ${timerState.round} из ${timerState.totalRounds}`;
    }

    // SVG Progress ring (r=120, C = 2 * PI * 120 = 753.98)
    if (progressCircle) {
      const circumference = 2 * Math.PI * 120;
      const progress = timerState.totalDuration > 0
        ? 1 - (timerState.timeRemaining / timerState.totalDuration)
        : 0;
      const offset = circumference - progress * circumference;
      progressCircle.style.strokeDashoffset = offset;

      // Color based on mode
      if (timerState.mode === 'work') {
        progressCircle.style.stroke = 'var(--primary, #6366f1)';
      } else {
        progressCircle.style.stroke = 'var(--accent-emerald, #10b981)';
      }
    }

    if (playPauseBtn) {
      const isRunning = timerState.status === 'running';
      playPauseBtn.setAttribute('aria-label', isRunning ? 'Пауза' : 'Старт');
      playPauseBtn.innerHTML = isRunning
        ? `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 9v6m4-6v6"></path></svg>`
        : `<svg class="w-8 h-8 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path></svg>`;
    }

    // Linked Task
    if (linkedTaskBanner) {
      if (timerState.linkedTask) {
        linkedTaskBanner.classList.remove('hidden');
        if (linkedTaskTitle) linkedTaskTitle.textContent = timerState.linkedTask.title;
      } else {
        linkedTaskBanner.classList.add('hidden');
      }
    }

    // Populate Task Picker Select in Timer
    const taskSelect = document.getElementById('timer-task-select');
    if (taskSelect) {
      const activeTasks = this.taskManager.getAllTasks().filter(t => !t.completed);
      taskSelect.innerHTML = `<option value="">-- Без привязки к задаче --</option>` +
        activeTasks.map(t => `
          <option value="${t.id}" ${timerState.linkedTask && timerState.linkedTask.id === t.id ? 'selected' : ''}>
            ${sanitizeHTML(t.title)} (${t.category})
          </option>
        `).join('');
    }
  }

  // CALENDAR RENDERING
  renderCalendar() {
    const titleEl = document.getElementById('cal-month-title');
    const gridEl = document.getElementById('cal-days-grid');
    const selectedDateTitle = document.getElementById('cal-selected-date-title');
    const selectedTasksContainer = document.getElementById('cal-selected-tasks-list');
    const selectedEmptyState = document.getElementById('cal-selected-empty');
    const quickAddBtn = document.getElementById('cal-quick-add-btn');

    if (titleEl) titleEl.textContent = this.calendarView.getMonthTitle();

    const tasks = this.taskManager.getAllTasks();
    const days = this.calendarView.getMonthGridData(tasks);

    if (gridEl) {
      gridEl.innerHTML = days.map(d => {
        const hasTasks = d.tasks.length > 0;
        const taskDots = d.tasks.slice(0, 3).map(t => {
          const color = CATEGORY_COLORS[t.category] || '#6366f1';
          return `<span class="w-1.5 h-1.5 rounded-full" style="background-color: ${t.completed ? '#94a3b8' : color};"></span>`;
        }).join('');

        return `
          <button class="cal-day-cell ${d.isCurrentMonth ? '' : 'cal-day-muted'} ${d.isToday ? 'cal-day-today' : ''} ${d.isSelected ? 'cal-day-selected' : ''}"
            data-date-iso="${d.iso}"
            aria-label="${d.iso}, задач: ${d.tasks.length}"
          >
            <span class="cal-day-number font-mono text-xs font-medium">${d.dayNumber}</span>
            <div class="cal-day-dots flex items-center justify-center gap-1 mt-1">
              ${taskDots}
              ${d.tasks.length > 3 ? `<span class="text-[9px] text-muted font-mono leading-none">+${d.tasks.length - 3}</span>` : ''}
            </div>
          </button>
        `;
      }).join('');

      // Bind Day Clicks
      gridEl.querySelectorAll('.cal-day-cell').forEach(cell => {
        cell.addEventListener('click', () => {
          const iso = cell.getAttribute('data-date-iso');
          this.calendarView.setSelectedDate(iso);
          soundEffects.playClick();
          this.renderCalendar();
        });
      });
    }

    // Selected Day Tasks
    const selectedISO = this.calendarView.selectedDateISO;
    if (selectedDateTitle) {
      selectedDateTitle.textContent = this.calendarView.formatDateForDisplay(selectedISO);
    }

    if (quickAddBtn) {
      quickAddBtn.setAttribute('data-date', selectedISO);
    }

    const selectedTasks = tasks.filter(t => t.dueDate === selectedISO);

    if (selectedTasksContainer) {
      if (selectedTasks.length === 0) {
        selectedTasksContainer.innerHTML = '';
        if (selectedEmptyState) selectedEmptyState.classList.remove('hidden');
      } else {
        if (selectedEmptyState) selectedEmptyState.classList.add('hidden');
        selectedTasksContainer.innerHTML = selectedTasks
          .map(t => this.renderTaskCardHTML(t, false))
          .join('');
        this.bindTaskCardEvents(selectedTasksContainer);
      }
    }
  }

  // ANALYTICS RENDERING
  renderAnalytics() {
    const overview = this.analyticsEngine.getOverviewStats();

    const totalEl = document.getElementById('stat-total-tasks');
    const completedEl = document.getElementById('stat-completed-tasks');
    const rateEl = document.getElementById('stat-completion-rate');
    const focusHoursEl = document.getElementById('stat-focus-hours');
    const streakCurrentEl = document.getElementById('stat-current-streak');
    const streakBestEl = document.getElementById('stat-best-streak');

    if (totalEl) totalEl.textContent = overview.totalTasks;
    if (completedEl) completedEl.textContent = overview.completedTasks;
    if (rateEl) rateEl.textContent = `${overview.completionRate}%`;
    if (focusHoursEl) focusHoursEl.textContent = overview.focusFormatted;
    if (streakCurrentEl) streakCurrentEl.textContent = `${overview.currentStreak} дн.`;
    if (streakBestEl) streakBestEl.textContent = `${overview.bestStreak} дн.`;

    // Weekly SVG Chart
    const weeklyChartContainer = document.getElementById('analytics-weekly-chart');
    if (weeklyChartContainer) {
      const days = this.analyticsEngine.getLast7DaysActivity();
      weeklyChartContainer.innerHTML = this.analyticsEngine.renderWeeklyBarChartSVG(days);
    }

    // Category Distribution Donut Chart
    const donutContainer = document.getElementById('analytics-donut-chart');
    const legendContainer = document.getElementById('analytics-category-legend');
    if (donutContainer) {
      const categories = this.analyticsEngine.getCategoryDistribution();
      donutContainer.innerHTML = this.analyticsEngine.renderCategoryDonutSVG(categories);

      if (legendContainer) {
        legendContainer.innerHTML = categories.map(cat => `
          <div class="flex items-center justify-between text-xs py-1.5 border-b border-subtle last:border-none">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${cat.color};"></span>
              <span class="text-main font-medium">${sanitizeHTML(cat.category)}</span>
            </div>
            <div class="flex items-center gap-3 font-mono">
              <span class="text-muted">${cat.count} задач</span>
              <span class="font-semibold text-main">${cat.percentage}%</span>
            </div>
          </div>
        `).join('');
      }
    }

    // Recent Focus Sessions Table
    const sessionsTableBody = document.getElementById('analytics-sessions-tbody');
    const sessionsEmpty = document.getElementById('analytics-sessions-empty');
    const sessions = this.analyticsEngine.focusSessions || [];

    if (sessionsTableBody) {
      if (sessions.length === 0) {
        sessionsTableBody.innerHTML = '';
        if (sessionsEmpty) sessionsEmpty.classList.remove('hidden');
      } else {
        if (sessionsEmpty) sessionsEmpty.classList.add('hidden');
        sessionsTableBody.innerHTML = sessions.slice().reverse().slice(0, 8).map(s => `
          <tr class="border-b border-subtle hover:bg-surface-hover transition-colors text-xs">
            <td class="py-2.5 px-3 font-medium text-main">${sanitizeHTML(s.taskTitle || 'Фокус-сессия')}</td>
            <td class="py-2.5 px-3 text-muted font-mono">${s.dateStr || ''}</td>
            <td class="py-2.5 px-3 text-right font-mono font-medium text-indigo-500">${s.durationMinutes} мин</td>
          </tr>
        `).join('');
      }
    }
  }

  // MODALS MANAGEMENT
  openCreateTaskModal(prefilledDate = null) {
    this.editingTaskId = null;
    const modalTitle = document.getElementById('task-modal-title');
    const submitBtn = document.getElementById('task-modal-submit-btn');

    if (modalTitle) modalTitle.textContent = 'Новая задача';
    if (submitBtn) submitBtn.textContent = 'Создать задачу';

    // Reset Form
    if (this.taskForm) {
      this.taskForm.reset();
      const dateInput = document.getElementById('task-input-date');
      if (dateInput) {
        dateInput.value = prefilledDate || formatDateISO();
      }
      const durInput = document.getElementById('task-input-duration');
      if (durInput) durInput.value = 25;

      // Clear dynamic subtasks
      const subtasksContainer = document.getElementById('task-form-subtasks-container');
      if (subtasksContainer) subtasksContainer.innerHTML = '';
    }

    this.openModal(this.taskModal);
    setTimeout(() => {
      const titleInput = document.getElementById('task-input-title');
      if (titleInput) titleInput.focus();
    }, 50);
  }

  openEditTaskModal(id) {
    const task = this.taskManager.getTaskById(id);
    if (!task) return;

    this.editingTaskId = id;
    const modalTitle = document.getElementById('task-modal-title');
    const submitBtn = document.getElementById('task-modal-submit-btn');

    if (modalTitle) modalTitle.textContent = 'Редактировать задачу';
    if (submitBtn) submitBtn.textContent = 'Сохранить изменения';

    // Populate Fields
    document.getElementById('task-input-title').value = task.title || '';
    document.getElementById('task-input-desc').value = task.description || '';
    document.getElementById('task-input-category').value = task.category || 'Работа';
    document.getElementById('task-input-priority').value = task.priority || 'medium';
    document.getElementById('task-input-date').value = task.dueDate || formatDateISO();
    document.getElementById('task-input-time').value = task.dueTime || '';
    document.getElementById('task-input-duration').value = task.estimatedMinutes || 25;

    // Subtasks
    const subtasksContainer = document.getElementById('task-form-subtasks-container');
    if (subtasksContainer) {
      subtasksContainer.innerHTML = '';
      (task.subtasks || []).forEach(st => {
        this.addSubtaskRowToForm(st.title, st.id);
      });
    }

    this.openModal(this.taskModal);
  }

  addSubtaskRowToForm(title = '', id = null) {
    const container = document.getElementById('task-form-subtasks-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 mb-2 subtask-form-row';
    row.innerHTML = `
      <input type="text" class="subtask-row-input flex-1 px-3 py-1.5 text-xs rounded-lg bg-surface border border-subtle focus:border-indigo-500 focus:outline-none" placeholder="Пункт чек-листа..." value="${sanitizeHTML(title)}" />
      <button type="button" class="subtask-row-del-btn p-1 text-muted hover:text-rose-500" aria-label="Удалить подзадачу">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    `;

    row.querySelector('.subtask-row-del-btn').addEventListener('click', () => {
      row.remove();
    });

    container.appendChild(row);
  }

  openDeleteConfirmModal(id) {
    const task = this.taskManager.getTaskById(id);
    if (!task) return;

    const confirmTitle = document.getElementById('delete-modal-task-title');
    if (confirmTitle) confirmTitle.textContent = `"${task.title}"`;

    const confirmBtn = document.getElementById('delete-modal-confirm-btn');
    if (confirmBtn) {
      // Replace button clone to clean old listeners
      const newBtn = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
      newBtn.addEventListener('click', () => {
        this.taskManager.deleteTask(id);
        this.onSaveData();
        this.closeModal(this.deleteModal);
        this.showToast('Задача удалена', 'info');
        this.renderDashboard();
        this.renderTasks();
        this.renderCalendar();
      });
    }

    this.openModal(this.deleteModal);
  }

  openModal(modal) {
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
  }

  closeModal(modal) {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
  }

  formatDisplayDate(iso) {
    if (!iso) return '';
    const today = formatDateISO();
    if (iso === today) return 'Сегодня';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (iso === formatDateISO(tomorrow)) return 'Завтра';

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (iso === formatDateISO(yesterday)) return 'Вчера';

    const [y, m, d] = iso.split('-');
    return `${d}.${m}`;
  }

  pluralizeDays(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 19) return 'дней подряд';
    if (mod10 === 1) return 'день подряд';
    if (mod10 >= 2 && mod10 <= 4) return 'дня подряд';
    return 'дней подряд';
  }
}
