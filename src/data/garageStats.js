/**
 * حسابات مرآب الملكية — دوال نقية (Node-testable) بلا React وبلا تخزين.
 *
 * - حالة التذكير تُحسب من موعد أدخله العميل فقط (تاريخ و/أو قراءة عداد)؛
 *   لا فترات مصنّع مُخترَعة ولا افتراضات. غياب قراءة العداد الحالية لا يُخمَّن:
 *   تظهر حالة «أضف قراءة العداد» بدل ادعاء أن التذكير قادم.
 * - ترتيب الخدمات زمني (الأحدث أولًا) والمجاميع من التكاليف المسجَّلة فقط.
 * - المصاريف تُجمَّع شهريًا وسنويًا وبالتصنيف، مع فلترة بالموتوسيكل ونطاق تاريخ شامل.
 */
import { EXPENSE_CATEGORIES } from './garageStore.js'

export const REMINDER_SOON_DAYS = 14
export const REMINDER_SOON_KM = 500

export const REMINDER_LABELS = Object.freeze({
  overdue: 'متأخر',
  due: 'مستحق الآن',
  soon: 'قريب',
  'need-odometer': 'أضف قراءة العداد',
  upcoming: 'قادم',
  unscheduled: 'بدون موعد',
})

const STATUS_RANK = {
  overdue: 0,
  due: 1,
  soon: 2,
  'need-odometer': 3,
  upcoming: 4,
  unscheduled: 5,
}

const DAY_MS = 86400000

/** تاريخ اليوم المحلي بصيغة YYYY-MM-DD */
export function todayISO(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function toUTC(value) {
  const [year, month, day] = value.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

/** فرق الأيام من today إلى dueDate: سالب = فات، صفر = اليوم */
export function daysUntil(dueDate, today) {
  if (!isDateString(dueDate) || !isDateString(today)) return null
  return Math.round((toUTC(dueDate) - toUTC(today)) / DAY_MS)
}

function isOdometer(value) {
  return Number.isInteger(value) && value >= 0
}

function round2(value) {
  return Math.round(value * 100) / 100
}

/** تنسيق رقمي حتمي بفواصل الآلاف (بلا Intl) */
export function formatAmount(value) {
  if (!Number.isFinite(value)) return ''
  const rounded = Math.round(value * 100) / 100
  const [integer, fraction] = String(rounded).split('.')
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fraction ? `${grouped}.${fraction}` : grouped
}

/** عرض تاريخ YYYY-MM-DD بصيغة YYYY/MM/DD — بلا Intl */
export function formatDate(value) {
  return typeof value === 'string' && isDateString(value) ? value.replaceAll('-', '/') : ''
}

/**
 * حالة تذكير واحد.
 * @returns {{status:string,label:string,reasons:string[],remainingDays:number|null,remainingKm:number|null}}
 */
export function getReminderStatus(reminder, options = {}) {
  const today = isDateString(options.today) ? options.today : todayISO()
  const currentOdometer = isOdometer(options.currentOdometer) ? options.currentOdometer : null
  const base = { status: 'unscheduled', label: REMINDER_LABELS.unscheduled, reasons: [], remainingDays: null, remainingKm: null }
  if (!reminder || typeof reminder !== 'object') return base

  const candidates = []
  const reasons = []
  let remainingDays = null
  let remainingKm = null

  if (isDateString(reminder.nextDueDate)) {
    const days = daysUntil(reminder.nextDueDate, today)
    remainingDays = days
    if (days < 0) {
      candidates.push('overdue')
      reasons.push(`تجاوزت تاريخ الاستحقاق (${formatDate(reminder.nextDueDate)})`)
    } else if (days === 0) {
      candidates.push('due')
      reasons.push(`مستحق اليوم (${formatDate(reminder.nextDueDate)})`)
    } else if (days <= REMINDER_SOON_DAYS) {
      candidates.push('soon')
      reasons.push(`باقٍ ${days} يومًا على الموعد (${formatDate(reminder.nextDueDate)})`)
    } else {
      candidates.push('upcoming')
      reasons.push(`الموعد ${formatDate(reminder.nextDueDate)} (باقٍ ${days} يومًا)`)
    }
  }

  if (isOdometer(reminder.nextDueOdometer)) {
    if (currentOdometer === null) {
      candidates.push('need-odometer')
      reasons.push(`الموعد عند ${formatAmount(reminder.nextDueOdometer)} كم — سجّل قراءة العداد الحالية`)
    } else {
      const remaining = reminder.nextDueOdometer - currentOdometer
      remainingKm = remaining
      if (remaining < 0) {
        candidates.push('overdue')
        reasons.push(`تجاوزت قراءة العداد المطلوبة (${formatAmount(reminder.nextDueOdometer)} كم)`)
      } else if (remaining === 0) {
        candidates.push('due')
        reasons.push(`وصلت قراءة العداد المطلوبة (${formatAmount(reminder.nextDueOdometer)} كم)`)
      } else if (remaining <= REMINDER_SOON_KM) {
        candidates.push('soon')
        reasons.push(`باقٍ ${formatAmount(remaining)} كم على الموعد`)
      } else {
        candidates.push('upcoming')
        reasons.push(`الموعد عند ${formatAmount(reminder.nextDueOdometer)} كم (باقٍ ${formatAmount(remaining)} كم)`)
      }
    }
  }

  if (!candidates.length) return { ...base, reasons }
  const status = candidates.sort((a, b) => STATUS_RANK[a] - STATUS_RANK[b])[0]
  return { status, label: REMINDER_LABELS[status], reasons, remainingDays, remainingKm }
}

/** تذكيرات مزخرفة بحالتها ومرتبة: الأكثر إلحاحًا أولًا ثم الأقرب موعدًا */
export function sortReminders(reminders, options = {}) {
  const today = isDateString(options.today) ? options.today : todayISO()
  const odometerByKey = options.odometerByKey && typeof options.odometerByKey === 'object' ? options.odometerByKey : {}
  return (Array.isArray(reminders) ? reminders : [])
    .filter((reminder) => reminder && typeof reminder === 'object')
    .map((reminder) => {
      const status = getReminderStatus(reminder, { today, currentOdometer: odometerByKey[reminder.vehicleKey] })
      return { ...reminder, status: status.status, statusLabel: status.label, statusReasons: status.reasons }
    })
    .sort((a, b) => {
      const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status]
      if (rank !== 0) return rank
      const dateA = isDateString(a.nextDueDate) ? a.nextDueDate : '9999-12-31'
      const dateB = isDateString(b.nextDueDate) ? b.nextDueDate : '9999-12-31'
      if (dateA !== dateB) return dateA < dateB ? -1 : 1
      const odoA = isOdometer(a.nextDueOdometer) ? a.nextDueOdometer : Number.MAX_SAFE_INTEGER
      const odoB = isOdometer(b.nextDueOdometer) ? b.nextDueOdometer : Number.MAX_SAFE_INTEGER
      if (odoA !== odoB) return odoA - odoB
      return a.taskName < b.taskName ? -1 : a.taskName > b.taskName ? 1 : 0
    })
}

/** ملخص أعداد التذكيرات بحسب الحالة */
export function summarizeReminders(decorated) {
  const counts = { overdue: 0, due: 0, soon: 0, 'need-odometer': 0, upcoming: 0, unscheduled: 0 }
  for (const reminder of Array.isArray(decorated) ? decorated : []) {
    if (reminder && Object.hasOwn(counts, reminder.status)) counts[reminder.status] += 1
  }
  return { ...counts, total: Object.values(counts).reduce((sum, value) => sum + value, 0) }
}

/** سجل الخدمات زمنيًا: الأحدث أولًا ثم النوع ثم المعرّف (ترتيب حتمي) */
export function sortServices(services) {
  return (Array.isArray(services) ? services : [])
    .filter((service) => service && typeof service === 'object')
    .slice()
    .sort((a, b) => {
      if (a.serviceDate !== b.serviceDate) return a.serviceDate < b.serviceDate ? 1 : -1
      if (a.serviceType !== b.serviceType) return a.serviceType < b.serviceType ? -1 : 1
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    })
}

/** مجموع تكاليف الخدمات المسجَّلة فعليًا (التكلفة الفارغة لا تُحسب صفرًا مخترَعًا) */
export function sumServiceCosts(services) {
  let total = 0
  let count = 0
  let withCost = 0
  for (const service of Array.isArray(services) ? services : []) {
    if (!service || typeof service !== 'object') continue
    count += 1
    if (Number.isFinite(service.cost) && service.cost >= 0) {
      total += service.cost
      withCost += 1
    }
  }
  return { total: round2(total), count, withCost }
}

/** فلترة المصاريف: موتوسيكل (فارغ = الكل) + نطاق تاريخ شامل */
export function filterExpenses(expenses, filters = {}) {
  const vehicleKey = typeof filters.vehicleKey === 'string' && filters.vehicleKey ? filters.vehicleKey : ''
  const fromDate = isDateString(filters.fromDate) ? filters.fromDate : ''
  const toDate = isDateString(filters.toDate) ? filters.toDate : ''
  return (Array.isArray(expenses) ? expenses : []).filter((expense) => {
    if (!expense || typeof expense !== 'object') return false
    if (vehicleKey && expense.vehicleKey !== vehicleKey) return false
    if (fromDate && expense.date < fromDate) return false
    if (toDate && expense.date > toDate) return false
    return true
  })
}

function groupTotals(expenses, keyOf) {
  const groups = new Map()
  for (const expense of expenses) {
    const key = keyOf(expense)
    const group = groups.get(key) || { key, total: 0, count: 0 }
    group.total += expense.amount
    group.count += 1
    groups.set(key, group)
  }
  return [...groups.values()]
    .map((group) => ({ ...group, total: round2(group.total) }))
    .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0))
}

/** ملخص مصاريف: إجمالي + تصنيفات + شهري + سنوي + الشهر/السنة الحاليان */
export function summarizeExpenses(expenses, options = {}) {
  const today = isDateString(options.today) ? options.today : todayISO()
  const records = (Array.isArray(expenses) ? expenses : []).filter(
    (expense) => expense && typeof expense === 'object' && Number.isFinite(expense.amount) && expense.amount > 0,
  )

  const byCategory = EXPENSE_CATEGORIES.map((category) => {
    const matching = records.filter((expense) => expense.category === category.id)
    return {
      id: category.id,
      label: category.label,
      count: matching.length,
      total: round2(matching.reduce((sum, expense) => sum + expense.amount, 0)),
    }
  }).filter((category) => category.count > 0)

  const monthly = groupTotals(records, (expense) => String(expense.date).slice(0, 7))
  const yearly = groupTotals(records, (expense) => String(expense.date).slice(0, 4))
  const currentMonthKey = today.slice(0, 7)
  const currentYearKey = today.slice(0, 4)

  return {
    total: round2(records.reduce((sum, expense) => sum + expense.amount, 0)),
    count: records.length,
    byCategory,
    monthly,
    yearly,
    currentMonth: monthly.find((group) => group.key === currentMonthKey)?.total || 0,
    currentYear: yearly.find((group) => group.key === currentYearKey)?.total || 0,
  }
}
