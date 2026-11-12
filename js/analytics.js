/**
 * FOCUS FLOW — Productivity Analytics Engine
 * Calculates metrics from tasks and focus logs, generating responsive SVG charts.
 */

import { formatDateISO } from './storage.js';

export const CATEGORY_COLORS = {
  'Работа': '#6366f1',   // Indigo
  'Обучение': '#0ea5e9', // Sky
  'Личное': '#10b981',   // Emerald
  'Здоровье': '#f43f5e', // Rose
  'Проекты': '#f59e0b',  // Amber
  'Другое': '#8b5cf6'    // Violet
};

export class AnalyticsEngine {
  constructor(taskManager, focusSessions = []) {
    this.taskManager = taskManager;
    this.focusSessions = focusSessions;
  }

  setFocusSessions(sessions) {
    this.focusSessions = Array.isArray(sessions) ? sessions : [];
  }

  getOverviewStats() {
    const tasks = this.taskManager.getAllTasks();
    const completedTasks = tasks.filter(t => t.completed);
    const totalCount = tasks.length;
    const completedCount = completedTasks.length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Total focus minutes from focusSessions + logged task minutes
    const sessionMinutes = this.focusSessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);
    const hours = Math.floor(sessionMinutes / 60);
    const mins = sessionMinutes % 60;

    const streak = this.taskManager.calculateStreak();

    return {
      totalTasks: totalCount,
      completedTasks: completedCount,
      activeTasks: totalCount - completedCount,
      completionRate,
      focusTotalMinutes: sessionMinutes,
      focusFormatted: `${hours}ч ${mins}м`,
      currentStreak: streak.current,
      bestStreak: streak.best
    };
  }

  // Activity over the last 7 days
  getLast7DaysActivity() {
    const days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = formatDateISO(d);
      const weekday = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][d.getDay()];

      // Count completed tasks on this date
      const completedOnDay = this.taskManager.getAllTasks().filter(t => {
        if (!t.completed || !t.completedAt) return false;
        return formatDateISO(new Date(t.completedAt)) === iso;
      }).length;

      // Sum focus minutes on this date
      const focusOnDay = this.focusSessions
        .filter(s => s.dateStr === iso)
        .reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0);

      days.push({
        iso,
        weekday,
        dayNum: d.getDate(),
        completedCount: completedOnDay,
        focusMinutes: focusOnDay
      });
    }

    return days;
  }

  // Distribution by category
  getCategoryDistribution() {
    const tasks = this.taskManager.getAllTasks();
    const categories = this.taskManager.categories || ['Работа', 'Обучение', 'Личное', 'Здоровье', 'Проекты'];
    const total = tasks.length;

    const distribution = categories.map(cat => {
      const catTasks = tasks.filter(t => t.category === cat);
      const count = catTasks.length;
      const completed = catTasks.filter(t => t.completed).length;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      const color = CATEGORY_COLORS[cat] || '#64748b';

      return {
        category: cat,
        count,
        completed,
        percentage,
        color
      };
    });

    // Sort by count descending
    return distribution.sort((a, b) => b.count - a.count);
  }

  // Generate SVG code for Weekly Activity Bar Chart
  renderWeeklyBarChartSVG(days) {
    const maxVal = Math.max(4, ...days.map(d => Math.max(d.completedCount, Math.round(d.focusMinutes / 30))));
    const width = 500;
    const height = 180;
    const padX = 35;
    const padY = 25;
    const chartW = width - padX * 2;
    const chartH = height - padY * 2;

    const colWidth = chartW / days.length;
    const barWidth = 24;

    let barsSVG = '';

    days.forEach((day, idx) => {
      const cx = padX + idx * colWidth + colWidth / 2;
      const barH = (day.completedCount / maxVal) * chartH;
      const y = height - padY - barH;

      const isToday = day.iso === formatDateISO();
      const fillColor = isToday ? 'var(--primary, #6366f1)' : 'var(--chart-bar, #4f46e5)';
      const focusH = Math.min(chartH, (day.focusMinutes / 120) * chartH);

      barsSVG += `
        <g class="chart-col-group" data-tooltip="${day.weekday} (${day.iso}): ${day.completedCount} задач, ${day.focusMinutes} мин фокуса">
          <!-- Background track -->
          <rect x="${cx - barWidth / 2}" y="${padY}" width="${barWidth}" height="${chartH}" rx="6" fill="var(--chart-track, rgba(255,255,255,0.04))" />
          
          <!-- Tasks bar -->
          <rect x="${cx - barWidth / 2}" y="${y}" width="${barWidth}" height="${Math.max(4, barH)}" rx="6" fill="${fillColor}" class="chart-bar" />
          
          <!-- Value label -->
          ${day.completedCount > 0 ? `<text x="${cx}" y="${y - 6}" font-size="11" text-anchor="middle" font-weight="600" fill="var(--text-main)" font-family="JetBrains Mono, monospace">${day.completedCount}</text>` : ''}
          
          <!-- Day label -->
          <text x="${cx}" y="${height - 6}" font-size="12" text-anchor="middle" fill="${isToday ? 'var(--primary, #6366f1)' : 'var(--text-muted)'}" font-weight="${isToday ? '700' : '500'}">${day.weekday}</text>
        </g>
      `;
    });

    return `
      <svg viewBox="0 0 ${width} ${height}" class="w-full h-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="График активности за неделю">
        <!-- Grid lines -->
        <line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" stroke="var(--border-subtle)" stroke-width="1" />
        <line x1="${padX}" y1="${padY + chartH / 2}" x2="${width - padX}" y2="${padY + chartH / 2}" stroke="var(--border-subtle)" stroke-dasharray="3 3" stroke-width="1" opacity="0.4" />
        ${barsSVG}
      </svg>
    `;
  }

  // Generate SVG code for Category Donut Chart
  renderCategoryDonutSVG(categories) {
    const total = categories.reduce((sum, c) => sum + c.count, 0);
    const size = 180;
    const center = size / 2;
    const radius = 64;
    const strokeWidth = 20;
    const circumference = 2 * Math.PI * radius;

    if (total === 0) {
      return `
        <svg viewBox="0 0 ${size} ${size}" class="w-full max-w-[180px] mx-auto" role="img" aria-label="Распределение категорий пусто">
          <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="var(--border-subtle)" stroke-width="${strokeWidth}" />
          <text x="${center}" y="${center + 4}" text-anchor="middle" font-size="12" fill="var(--text-muted)">Нет задач</text>
        </svg>
      `;
    }

    let accumulatedAngle = 0;
    let paths = '';

    categories.forEach(cat => {
      if (cat.count === 0) return;
      const ratio = cat.count / total;
      const strokeDash = ratio * circumference;
      const offset = circumference - strokeDash;
      const rotate = accumulatedAngle;

      paths += `
        <circle cx="${center}" cy="${center}" r="${radius}"
          fill="none"
          stroke="${cat.color}"
          stroke-width="${strokeWidth}"
          stroke-dasharray="${strokeDash} ${circumference}"
          stroke-dashoffset="0"
          transform="rotate(${rotate - 90} ${center} ${center})"
          class="donut-segment"
          data-cat="${cat.category}"
          data-count="${cat.count}"
        />
      `;

      accumulatedAngle += ratio * 360;
    });

    return `
      <svg viewBox="0 0 ${size} ${size}" class="w-full max-w-[180px] mx-auto" role="img" aria-label="Круговая диаграмма распределения категорий">
        <!-- Background track -->
        <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="var(--border-subtle)" stroke-width="${strokeWidth}" opacity="0.3" />
        ${paths}
        <!-- Center count -->
        <text x="${center}" y="${center - 2}" text-anchor="middle" font-size="22" font-weight="700" fill="var(--text-main)" font-family="JetBrains Mono, monospace">${total}</text>
        <text x="${center}" y="${center + 14}" text-anchor="middle" font-size="10" fill="var(--text-muted)" font-weight="500">ЗАДАЧ</text>
      </svg>
    `;
  }
}
