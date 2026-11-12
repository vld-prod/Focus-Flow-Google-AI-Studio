/**
 * FOCUS FLOW — Tasks Management Engine
 * CRUD, subtasks, filtering, search, sorting, drag & drop, and productivity streak calculation.
 */

import { generateId, formatDateISO, sanitizeHTML } from './storage.js';
import { soundEffects } from './audio.js';

export const PRIORITY_WEIGHTS = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1
};

export const PRIORITY_LABELS = {
  urgent: 'Срочный',
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий'
};

export class TaskManager {
  constructor(initialData, onDataChanged) {
    this.tasks = Array.isArray(initialData.tasks) ? [...initialData.tasks] : [];
    this.categories = Array.isArray(initialData.categories) ? [...initialData.categories] : [];
    this.onDataChanged = onDataChanged || (() => {});

    // Active filters & search
    this.currentFilter = 'all'; // 'all' | 'today' | 'upcoming' | 'overdue' | 'active' | 'completed'
    this.currentCategory = 'all';
    this.currentPriority = 'all';
    this.searchQuery = '';
    this.currentSort = 'order'; // 'order' | 'date' | 'priority' | 'title'
  }

  setData(data) {
    this.tasks = Array.isArray(data.tasks) ? [...data.tasks] : [];
    if (Array.isArray(data.categories)) this.categories = [...data.categories];
  }

  getAllTasks() {
    return this.tasks;
  }

  getTaskById(id) {
    return this.tasks.find(t => t.id === id) || null;
  }

  createTask({
    title,
    description = '',
    category = 'Работа',
    priority = 'medium',
    dueDate = formatDateISO(),
    dueTime = '',
    estimatedMinutes = 25,
    subtasks = []
  }) {
    const trimmedTitle = title ? title.trim() : '';
    if (!trimmedTitle) {
      throw new Error('Название задачи не может быть пустым');
    }

    const maxOrder = this.tasks.reduce((max, t) => Math.max(max, t.order || 0), 0);

    const newTask = {
      id: generateId('task'),
      title: trimmedTitle,
      description: description ? description.trim() : '',
      category: category || 'Работа',
      priority: ['low', 'medium', 'high', 'urgent'].includes(priority) ? priority : 'medium',
      dueDate: dueDate || formatDateISO(),
      dueTime: dueTime || '',
      estimatedMinutes: Number(estimatedMinutes) || 25,
      completed: false,
      completedAt: null,
      focusedMinutes: 0,
      subtasks: Array.isArray(subtasks)
        ? subtasks
            .filter(st => st && String(st.title || st).trim())
            .map((st, i) => ({
              id: st.id || generateId('sub'),
              title: String(st.title || st).trim(),
              completed: Boolean(st.completed)
            }))
        : [],
      createdAt: new Date().toISOString(),
      order: maxOrder + 1
    };

    this.tasks.unshift(newTask);
    this.notify();
    return newTask;
  }

  updateTask(id, updates) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;

    const existing = this.tasks[idx];
    const updated = {
      ...existing,
      ...updates
    };

    if (updates.title) {
      const trimmed = updates.title.trim();
      if (!trimmed) throw new Error('Название задачи не может быть пустым');
      updated.title = trimmed;
    }

    this.tasks[idx] = updated;
    this.notify();
    return updated;
  }

  deleteTask(id) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;

    this.tasks.splice(idx, 1);
    this.notify();
    return true;
  }

  toggleTaskComplete(id) {
    const task = this.getTaskById(id);
    if (!task) return null;

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;

    if (task.completed) {
      soundEffects.playTaskComplete();
      // If task had subtasks, also mark them as complete
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach(st => { st.completed = true; });
      }
    }

    this.notify();
    return task;
  }

  toggleSubtask(taskId, subtaskId) {
    const task = this.getTaskById(taskId);
    if (!task || !task.subtasks) return null;

    const sub = task.subtasks.find(st => st.id === subtaskId);
    if (!sub) return null;

    sub.completed = !sub.completed;

    // Auto-update parent task completion if all subtasks are done
    const allDone = task.subtasks.every(st => st.completed);
    if (allDone && !task.completed) {
      task.completed = true;
      task.completedAt = new Date().toISOString();
      soundEffects.playTaskComplete();
    } else if (!allDone && task.completed) {
      task.completed = false;
      task.completedAt = null;
    }

    this.notify();
    return task;
  }

  addLoggedFocusMinutes(taskId, minutes) {
    const task = this.getTaskById(taskId);
    if (task) {
      task.focusedMinutes = (task.focusedMinutes || 0) + Number(minutes);
      this.notify();
    }
  }

  reorderTasks(sourceIndex, targetIndex) {
    if (
      sourceIndex < 0 ||
      sourceIndex >= this.tasks.length ||
      targetIndex < 0 ||
      targetIndex >= this.tasks.length
    ) {
      return;
    }

    const [moved] = this.tasks.splice(sourceIndex, 1);
    this.tasks.splice(targetIndex, 0, moved);

    // Re-assign order sequence
    this.tasks.forEach((t, i) => {
      t.order = i + 1;
    });

    this.notify();
  }

  setFilters({ filter, category, priority, search, sort }) {
    if (filter !== undefined) this.currentFilter = filter;
    if (category !== undefined) this.currentCategory = category;
    if (priority !== undefined) this.currentPriority = priority;
    if (search !== undefined) this.searchQuery = search.trim().toLowerCase();
    if (sort !== undefined) this.currentSort = sort;
  }

  getFilteredTasks() {
    const today = formatDateISO();

    return this.tasks
      .filter(task => {
        // Status filter
        if (this.currentFilter === 'today') {
          if (task.dueDate !== today) return false;
        } else if (this.currentFilter === 'active') {
          if (task.completed) return false;
        } else if (this.currentFilter === 'completed') {
          if (!task.completed) return false;
        } else if (this.currentFilter === 'upcoming') {
          if (task.completed || task.dueDate <= today) return false;
        } else if (this.currentFilter === 'overdue') {
          if (task.completed || task.dueDate >= today) return false;
        }

        // Category filter
        if (this.currentCategory !== 'all' && task.category !== this.currentCategory) {
          return false;
        }

        // Priority filter
        if (this.currentPriority !== 'all' && task.priority !== this.currentPriority) {
          return false;
        }

        // Search query
        if (this.searchQuery) {
          const inTitle = task.title.toLowerCase().includes(this.searchQuery);
          const inDesc = task.description.toLowerCase().includes(this.searchQuery);
          const inSubtasks = (task.subtasks || []).some(st =>
            st.title.toLowerCase().includes(this.searchQuery)
          );
          if (!inTitle && !inDesc && !inSubtasks) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (this.currentSort === 'priority') {
          const wa = PRIORITY_WEIGHTS[a.priority] || 0;
          const wb = PRIORITY_WEIGHTS[b.priority] || 0;
          if (wb !== wa) return wb - wa;
          return (a.dueDate || '').localeCompare(b.dueDate || '');
        }
        if (this.currentSort === 'date') {
          const dateDiff = (a.dueDate || '').localeCompare(b.dueDate || '');
          if (dateDiff !== 0) return dateDiff;
          return (a.dueTime || '').localeCompare(b.dueTime || '');
        }
        if (this.currentSort === 'title') {
          return a.title.localeCompare(b.title);
        }
        // default 'order'
        return (a.order || 0) - (b.order || 0);
      });
  }

  getTodayStats() {
    const today = formatDateISO();
    const todayTasks = this.tasks.filter(t => t.dueDate === today);
    const completed = todayTasks.filter(t => t.completed).length;
    const total = todayTasks.length;
    const remaining = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      remaining,
      percentage
    };
  }

  // Calculate current and best productive streak based on completion timestamps
  calculateStreak() {
    const completedDates = new Set();
    this.tasks.forEach(t => {
      if (t.completed && t.completedAt) {
        completedDates.add(formatDateISO(new Date(t.completedAt)));
      }
    });

    const today = new Date();
    const todayISO = formatDateISO(today);

    // If today is completed, streak starts today; if not, check if yesterday was completed
    let checkDate = new Date(today);
    let currentStreak = 0;

    const hasToday = completedDates.has(todayISO);
    if (!hasToday) {
      // Check yesterday
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const iso = formatDateISO(checkDate);
      if (completedDates.has(iso)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate best streak from all historic sorted completed dates
    const sortedDates = Array.from(completedDates).sort();
    let bestStreak = currentStreak;
    let tempStreak = 0;
    let prevDate = null;

    for (const dateStr of sortedDates) {
      const cur = new Date(dateStr);
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((cur.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      prevDate = cur;
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
      }
    }

    return {
      current: currentStreak,
      best: Math.max(bestStreak, currentStreak)
    };
  }

  notify() {
    this.onDataChanged(this.tasks);
  }
}
