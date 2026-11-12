/**
 * FOCUS FLOW — Storage & Data Manager
 * Handles LocalStorage persistence, default demo data, validation, and JSON export/import.
 */

export const STORAGE_KEY = 'focus_flow_v1_data';

// Helper to escape HTML to prevent XSS in user-generated strings
export function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Generate unique ID
export function generateId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// Format Date YYYY-MM-DD
export function formatDateISO(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get dates relative to today
export function getRelativeDateISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return formatDateISO(d);
}

// Default initial state with realistic, inspiring seed tasks
export function getDefaultData() {
  const today = formatDateISO();
  const tomorrow = getRelativeDateISO(1);
  const yesterday = getRelativeDateISO(-1);
  const dayAfterTomorrow = getRelativeDateISO(2);

  return {
    version: 1,
    tasks: [
      {
        id: 'task_seed_1',
        title: 'Завершить дизайн-систему FOCUS FLOW',
        description: 'Проверить контрастность, типографику, микроанимации чекбоксов и адаптивную сетку.',
        category: 'Работа',
        priority: 'high',
        dueDate: today,
        dueTime: '15:00',
        estimatedMinutes: 50,
        completed: false,
        completedAt: null,
        focusedMinutes: 25,
        subtasks: [
          { id: 'sub_1', title: 'Согласовать палитру для темной и светлой тем', completed: true },
          { id: 'sub_2', title: 'Интерактивный круговой таймер Pomodoro', completed: true },
          { id: 'sub_3', title: 'Проверка доступности клавиатуры (WCAG AA)', completed: false }
        ],
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        order: 1
      },
      {
        id: 'task_seed_2',
        title: 'Глубокая фокус-сессия: рефакторинг логики',
        description: 'Разбить код на чистые модули, добавить валидацию JSON-импорта и проверку граничных условий.',
        category: 'Работа',
        priority: 'urgent',
        dueDate: today,
        dueTime: '18:30',
        estimatedMinutes: 75,
        completed: false,
        completedAt: null,
        focusedMinutes: 0,
        subtasks: [
          { id: 'sub_4', title: 'Модуль хранилища с отказоустойчивостью', completed: true },
          { id: 'sub_5', title: 'Вычисление продуктивной серии дней', completed: false }
        ],
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
        order: 2
      },
      {
        id: 'task_seed_3',
        title: 'Утренняя силовая тренировка и растяжка',
        description: 'Разминка 10 мин, комплекс упражнений на осанку, гидратация 500 мл.',
        category: 'Здоровье',
        priority: 'medium',
        dueDate: today,
        dueTime: '08:30',
        estimatedMinutes: 45,
        completed: true,
        completedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        focusedMinutes: 45,
        subtasks: [
          { id: 'sub_6', title: 'Суставная разминка', completed: true },
          { id: 'sub_7', title: 'Заминка и дыхание', completed: true }
        ],
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        order: 3
      },
      {
        id: 'task_seed_4',
        title: 'Чтение книги: "Deep Work" Кэла Ньюпорта',
        description: 'Прочитать главы 3 и 4, выписать главные тезисы о ритуалах концентрации.',
        category: 'Обучение',
        priority: 'medium',
        dueDate: today,
        dueTime: '21:00',
        estimatedMinutes: 30,
        completed: false,
        completedAt: null,
        focusedMinutes: 0,
        subtasks: [],
        createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
        order: 4
      },
      {
        id: 'task_seed_5',
        title: 'Планирование спринта и обзор целей месяца',
        description: 'Сверить прогресс по ключевым вехам, расставить приоритеты на предстоящую неделю.',
        category: 'Проекты',
        priority: 'high',
        dueDate: tomorrow,
        dueTime: '11:00',
        estimatedMinutes: 60,
        completed: false,
        completedAt: null,
        focusedMinutes: 0,
        subtasks: [
          { id: 'sub_8', title: 'Анализ метрик предыдущей недели', completed: false },
          { id: 'sub_9', title: 'Выделение трех главных фокусов', completed: false }
        ],
        createdAt: new Date().toISOString(),
        order: 5
      },
      {
        id: 'task_seed_6',
        title: 'Подготовка презентации для продуктового демо',
        description: 'Собрать скриншоты, подготовить сценарий показа интерактивного планировщика.',
        category: 'Работа',
        priority: 'low',
        dueDate: dayAfterTomorrow,
        dueTime: '16:00',
        estimatedMinutes: 40,
        completed: false,
        completedAt: null,
        focusedMinutes: 0,
        subtasks: [],
        createdAt: new Date().toISOString(),
        order: 6
      },
      {
        id: 'task_seed_7',
        title: 'Медитация и вечерняя рефлексия',
        description: '15 минут спокойной практики для восстановления нервной системы.',
        category: 'Здоровье',
        priority: 'low',
        dueDate: yesterday,
        dueTime: '22:00',
        estimatedMinutes: 15,
        completed: true,
        completedAt: new Date(Date.now() - 86400000).toISOString(),
        focusedMinutes: 15,
        subtasks: [],
        createdAt: new Date(Date.now() - 90000000).toISOString(),
        order: 7
      }
    ],
    categories: ['Работа', 'Обучение', 'Личное', 'Здоровье', 'Проекты'],
    settings: {
      theme: 'dark',
      pomodoroWork: 25,
      pomodoroShortBreak: 5,
      pomodoroLongBreak: 15,
      soundEnabled: true,
      soundVolume: 0.7,
      notificationsEnabled: false,
      autoStartBreaks: false
    },
    focusSessions: [
      {
        id: 'foc_1',
        taskId: 'task_seed_3',
        taskTitle: 'Утренняя силовая тренировка и растяжка',
        durationMinutes: 45,
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        dateStr: today,
        type: 'work'
      },
      {
        id: 'foc_2',
        taskId: 'task_seed_1',
        taskTitle: 'Завершить дизайн-систему FOCUS FLOW',
        durationMinutes: 25,
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        dateStr: today,
        type: 'work'
      },
      {
        id: 'foc_3',
        taskId: 'task_seed_7',
        taskTitle: 'Медитация и вечерняя рефлексия',
        durationMinutes: 15,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        dateStr: yesterday,
        type: 'work'
      },
      {
        id: 'foc_4',
        taskId: null,
        taskTitle: 'Фокус-сессия',
        durationMinutes: 25,
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        dateStr: getRelativeDateISO(-2),
        type: 'work'
      }
    ]
  };
}

// In-memory fallback if LocalStorage is disabled/blocked in strict sandbox
let memoryStorage = null;

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getDefaultData();
      saveData(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.tasks)) {
      throw new Error('Invalid data structure');
    }
    // Ensure all required fields exist
    if (!parsed.settings) parsed.settings = getDefaultData().settings;
    if (!parsed.categories) parsed.categories = getDefaultData().categories;
    if (!parsed.focusSessions) parsed.focusSessions = [];
    return parsed;
  } catch (err) {
    console.warn('LocalStorage error or unavailable, using in-memory state:', err);
    if (!memoryStorage) {
      memoryStorage = getDefaultData();
    }
    return memoryStorage;
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('LocalStorage write failed:', err);
    memoryStorage = data;
  }
}

// Validate imported JSON file
export function validateImportData(imported) {
  if (!imported || typeof imported !== 'object') {
    return { valid: false, error: 'Файл не содержит корректный JSON-объект.' };
  }
  if (!Array.isArray(imported.tasks)) {
    return { valid: false, error: 'В файле отсутствует список задач (поле "tasks").' };
  }

  // Sanitize each task
  const validTasks = imported.tasks.map((t, idx) => ({
    id: t.id ? String(t.id) : generateId('imported_task'),
    title: t.title ? String(t.title).trim() : `Импортированная задача #${idx + 1}`,
    description: t.description ? String(t.description) : '',
    category: t.category ? String(t.category) : 'Личное',
    priority: ['low', 'medium', 'high', 'urgent'].includes(t.priority) ? t.priority : 'medium',
    dueDate: t.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate) ? t.dueDate : formatDateISO(),
    dueTime: t.dueTime || '',
    estimatedMinutes: Number(t.estimatedMinutes) || 25,
    completed: Boolean(t.completed),
    completedAt: t.completedAt || null,
    focusedMinutes: Number(t.focusedMinutes) || 0,
    subtasks: Array.isArray(t.subtasks)
      ? t.subtasks.map((st, sidx) => ({
          id: st.id ? String(st.id) : `sub_${sidx}`,
          title: String(st.title || 'Подзадача'),
          completed: Boolean(st.completed)
        }))
      : [],
    createdAt: t.createdAt || new Date().toISOString(),
    order: typeof t.order === 'number' ? t.order : idx + 1
  }));

  const validSettings = Object.assign({}, getDefaultData().settings, imported.settings || {});
  const validCategories = Array.isArray(imported.categories) && imported.categories.length > 0
    ? imported.categories.map(String)
    : getDefaultData().categories;
  const validFocusSessions = Array.isArray(imported.focusSessions)
    ? imported.focusSessions.map(f => ({
        id: f.id || generateId('foc'),
        taskId: f.taskId || null,
        taskTitle: f.taskTitle || 'Фокус-сессия',
        durationMinutes: Number(f.durationMinutes) || 25,
        timestamp: f.timestamp || new Date().toISOString(),
        dateStr: f.dateStr || formatDateISO(),
        type: f.type || 'work'
      }))
    : [];

  return {
    valid: true,
    data: {
      version: 1,
      tasks: validTasks,
      categories: validCategories,
      settings: validSettings,
      focusSessions: validFocusSessions
    }
  };
}
