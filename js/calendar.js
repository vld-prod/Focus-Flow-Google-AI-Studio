/**
 * FOCUS FLOW — Interactive Calendar View
 * Monthly view, day selection, task indicators, and quick scheduling.
 */

import { formatDateISO } from './storage.js';

export const MONTH_NAMES_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export const WEEKDAY_NAMES_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export class CalendarView {
  constructor({ onSelectDate, onQuickAddTask, onToggleTask }) {
    this.currentDate = new Date(); // viewed month
    this.selectedDateISO = formatDateISO(new Date()); // currently selected day
    this.onSelectDate = onSelectDate || (() => {});
    this.onQuickAddTask = onQuickAddTask || (() => {});
    this.onToggleTask = onToggleTask || (() => {});
  }

  prevMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
  }

  jumpToToday() {
    this.currentDate = new Date();
    this.selectedDateISO = formatDateISO(new Date());
  }

  setSelectedDate(dateISO) {
    this.selectedDateISO = dateISO;
  }

  getMonthTitle() {
    const month = MONTH_NAMES_RU[this.currentDate.getMonth()];
    const year = this.currentDate.getFullYear();
    return `${month} ${year}`;
  }

  // Returns days array for the month grid (including padding days from previous and next months)
  getMonthGridData(tasks = []) {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const totalDays = lastDayOfMonth.getDate();

    // Monday is index 0 in RU (Sunday is 0 in JS Date)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const todayISO = formatDateISO(new Date());

    // Group tasks by date
    const tasksByDate = {};
    tasks.forEach(t => {
      if (t.dueDate) {
        if (!tasksByDate[t.dueDate]) tasksByDate[t.dueDate] = [];
        tasksByDate[t.dueDate].push(t);
      }
    });

    const days = [];

    // Prev month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const iso = formatDateISO(prevDate);
      days.push({
        dayNumber: dayNum,
        iso,
        isCurrentMonth: false,
        isToday: iso === todayISO,
        isSelected: iso === this.selectedDateISO,
        tasks: tasksByDate[iso] || []
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      const iso = formatDateISO(date);
      days.push({
        dayNumber: d,
        iso,
        isCurrentMonth: true,
        isToday: iso === todayISO,
        isSelected: iso === this.selectedDateISO,
        tasks: tasksByDate[iso] || []
      });
    }

    // Next month padding (make complete 35 or 42 cells)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const iso = formatDateISO(nextDate);
      days.push({
        dayNumber: d,
        iso,
        isCurrentMonth: false,
        isToday: iso === todayISO,
        isSelected: iso === this.selectedDateISO,
        tasks: tasksByDate[iso] || []
      });
    }

    return days;
  }

  formatDateForDisplay(dateISO) {
    if (!dateISO) return '';
    const [y, m, d] = dateISO.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDate();
    const month = MONTH_NAMES_RU[date.getMonth()];
    const weekday = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'][date.getDay()];
    return `${weekday}, ${day} ${month} ${y}`;
  }
}
