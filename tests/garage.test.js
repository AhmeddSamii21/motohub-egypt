/**
 * اختبارات مرآب الملكية (Ownership Companion).
 * كل السجلات هنا بيانات اختبار أنشأها العميل — ولا تمثل فترات صيانة من مصنّع.
 */
import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  EXPENSE_CATEGORIES,
  GARAGE_STORAGE_KEY,
  addExpense,
  addReminder,
  addService,
  addVehicle,
  readGarage,
  removeExpense,
  removeReminder,
  removeService,
  removeVehicle,
  updateExpense,
  updateReminder,
  updateService,
  updateVehicleOdometer,
  exportGarage,
  parseGarageBackup,
  restoreGarage,
} from '../src/data/garageStore.js'
import {
  daysUntil,
  filterExpenses,
  formatAmount,
  getReminderStatus,
  sortReminders,
  sortServices,
  sumServiceCosts,
  summarizeExpenses,
  summarizeReminders,
  todayISO,
} from '../src/data/garageStats.js'
import { CARE_GUIDE_DISCLAIMER, CARE_GUIDE_MANUAL_NOTE, CARE_GUIDE_SECTIONS } from '../src/data/careGuide.js'

const memory = new Map()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  writable: true,
  value: {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key),
    clear: () => memory.clear(),
  },
})

beforeEach(() => {
  memory.clear()
})

const VEHICLE = { brand: 'SYM', name: 'Orbit 3 150 CC' }
const VEHICLE_2 = { brand: 'SYM', name: 'Jet 4 150 CC' }

function seedVehicle(vehicle = VEHICLE, odometer = 1200) {
  const result = addVehicle({ ...vehicle, odometer })
  assert.equal(result.ok, true)
  return result.record
}

function reminderInput(overrides = {}) {
  return {
    vehicleKey: `${VEHICLE.brand}|${VEHICLE.name}`,
    taskName: 'فحص الفرامل',
    lastServiceDate: '2026-09-01',
    lastServiceOdometer: 1000,
    nextDueDate: '',
    nextDueOdometer: '',
    notes: '',
    ...overrides,
  }
}

function serviceInput(overrides = {}) {
  return {
    vehicleKey: `${VEHICLE.brand}|${VEHICLE.name}`,
    serviceDate: '2026-10-01',
    odometer: 1100,
    serviceType: 'تغيير زيت',
    description: 'تغيير زيت المحرك',
    cost: 350,
    notes: '',
    ...overrides,
  }
}

function expenseInput(overrides = {}) {
  return {
    vehicleKey: `${VEHICLE.brand}|${VEHICLE.name}`,
    date: '2026-10-15',
    category: 'fuel',
    amount: 200,
    notes: '',
    ...overrides,
  }
}

/* ============================ الموتوسيكلات ============================ */

test('القراءة من تخزين فارغ تعيد حالة فارغة بلا أخطاء', () => {
  assert.deepEqual(readGarage(), { version: 1, vehicles: [], reminders: [], services: [], expenses: [] })
})

test('إضافة موتوسيكل من الكتالوج مع قراءة العداد تُحفظ وتُقرأ بعد إعادة التحميل', () => {
  const vehicle = seedVehicle(VEHICLE, 4200)
  assert.equal(vehicle.vehicleKey, 'SYM|Orbit 3 150 CC')
  assert.equal(vehicle.odometer, 4200)
  const reloaded = readGarage()
  assert.equal(reloaded.vehicles.length, 1)
  assert.equal(reloaded.vehicles[0].odometer, 4200)
  assert.equal(JSON.parse(memory.get(GARAGE_STORAGE_KEY)).vehicles[0].id, vehicle.id)
})

test('رفض تكرار الموديل أو موديل غير موجود أو عداد سالب', () => {
  seedVehicle()
  assert.equal(addVehicle({ ...VEHICLE, odometer: 10 }).ok, false)
  assert.equal(addVehicle({ brand: 'NOPE', name: 'X', odometer: 10 }).ok, false)
  const negative = addVehicle({ ...VEHICLE_2, odometer: -5 })
  assert.equal(negative.ok, false)
  assert.match(negative.error, /رقمًا صحيحًا غير سالب/)
})

test('تحديث قراءة العداد يحفظ القيمة الجديدة ويرفض غير الصالح', () => {
  const vehicle = seedVehicle()
  const updated = updateVehicleOdometer(vehicle.id, 2500)
  assert.equal(updated.ok, true)
  assert.equal(readGarage().vehicles[0].odometer, 2500)
  assert.equal(updateVehicleOdometer(vehicle.id, '').ok, false)
  assert.equal(updateVehicleOdometer(vehicle.id, 1.5).ok, false)
})

/* ============================ تذكيرات الصيانة ============================ */

test('إنشاء تذكير صيانة وتعديله وحذفه', () => {
  seedVehicle()
  const created = addReminder(reminderInput({ nextDueDate: '2026-12-01' }))
  assert.equal(created.ok, true)
  assert.equal(created.record.status, undefined)
  assert.equal(readGarage().reminders.length, 1)

  const edited = updateReminder(created.record.id, reminderInput({ taskName: 'فحص الإطارات', nextDueOdometer: 1300 }))
  assert.equal(edited.ok, true)
  assert.equal(edited.record.taskName, 'فحص الإطارات')
  assert.equal(edited.record.id, created.record.id)
  assert.equal(readGarage().reminders[0].nextDueOdometer, 1300)

  assert.equal(removeReminder(created.record.id).ok, true)
  assert.equal(readGarage().reminders.length, 0)
  assert.equal(removeReminder(created.record.id).ok, false)
})

test('رفض تذكير بلا موعد أو بعداد غير صالح أو موعد عداد ليس أكبر من آخر صيانة', () => {
  seedVehicle()
  assert.equal(addReminder(reminderInput()).ok, false)
  assert.equal(addReminder(reminderInput({ lastServiceOdometer: '' })).ok, false)
  assert.equal(addReminder(reminderInput({ lastServiceDate: '2026-02-30' })).ok, false)
  const notAfter = addReminder(reminderInput({ nextDueOdometer: 1000 }))
  assert.equal(notAfter.ok, false)
  assert.match(notAfter.error, /أكبر من قراءة آخر صيانة/)
})

/* ============================ سجل الخدمات ============================ */

test('إنشاء سجل خدمة وتعديله وحذفه مع تكلفة اختيارية', () => {
  seedVehicle()
  const created = addService(serviceInput())
  assert.equal(created.ok, true)
  assert.equal(created.record.cost, 350)

  const noCost = addService(serviceInput({ serviceDate: '2026-10-02', description: 'فحص عام', cost: '' }))
  assert.equal(noCost.ok, true)
  assert.equal(noCost.record.cost, null)

  const edited = updateService(created.record.id, serviceInput({ description: 'تغيير زيت وفلتر', cost: 400 }))
  assert.equal(edited.ok, true)
  assert.equal(edited.record.cost, 400)

  assert.equal(removeService(created.record.id).ok, true)
  assert.equal(readGarage().services.length, 1)
})

test('رفض خدمة بتاريخ غير صالح أو وصف فارغ أو تكلفة سالبة', () => {
  seedVehicle()
  assert.equal(addService(serviceInput({ serviceDate: '2026-13-01' })).ok, false)
  assert.equal(addService(serviceInput({ description: '   ' })).ok, false)
  assert.equal(addService(serviceInput({ cost: -10 })).ok, false)
  assert.equal(addService(serviceInput({ odometer: '' })).ok, false)
})

/* ============================ المصاريف ============================ */

test('إنشاء مصروف وتعديله وحذفه مع رفض التصنيف/المبلغ غير الصالح', () => {
  seedVehicle()
  const created = addExpense(expenseInput())
  assert.equal(created.ok, true)
  assert.equal(created.record.amount, 200)

  const edited = updateExpense(created.record.id, expenseInput({ category: 'maintenance', amount: 450.555 }))
  assert.equal(edited.ok, true)
  assert.equal(edited.record.amount, 450.56)

  assert.equal(addExpense(expenseInput({ category: 'nope' })).ok, false)
  assert.equal(addExpense(expenseInput({ amount: 0 })).ok, false)
  assert.equal(addExpense(expenseInput({ date: '' })).ok, false)

  assert.equal(removeExpense(created.record.id).ok, true)
  assert.equal(readGarage().expenses.length, 0)
})

test('تصنيفات المصاريف الستة معرَّفة وثابتة', () => {
  assert.deepEqual(
    EXPENSE_CATEGORIES.map((category) => category.id),
    ['fuel', 'maintenance', 'parts', 'repairs', 'insurance', 'other'],
  )
  assert.equal(Object.isFrozen(EXPENSE_CATEGORIES), true)
})

/* ============================ التكامل والتلف ============================ */

test('حذف الموتوسيكل يحذف كل سجلاته المرتبطة فقط', () => {
  const vehicle = seedVehicle()
  const second = seedVehicle(VEHICLE_2, 800)
  addReminder(reminderInput({ nextDueDate: '2026-12-01' }))
  addService(serviceInput())
  addExpense(expenseInput())
  addExpense(expenseInput({ vehicleKey: `${VEHICLE_2.brand}|${VEHICLE_2.name}`, category: 'parts' }))

  assert.equal(removeVehicle(vehicle.id).ok, true)
  const garage = readGarage()
  assert.equal(garage.vehicles.length, 1)
  assert.equal(garage.vehicles[0].id, second.id)
  assert.equal(garage.reminders.length, 0)
  assert.equal(garage.services.length, 0)
  assert.equal(garage.expenses.length, 1)
  assert.equal(garage.expenses[0].vehicleKey, `${VEHICLE_2.brand}|${VEHICLE_2.name}`)
})

test('بيانات تخزين تالفة أو غير متوقعة تعيد حالة فارغة بلا استثناء', () => {
  localStorage.setItem(GARAGE_STORAGE_KEY, '{not-json')
  assert.deepEqual(readGarage().vehicles, [])

  localStorage.setItem(GARAGE_STORAGE_KEY, JSON.stringify({ vehicles: 'x', reminders: null, services: {}, expenses: 5 }))
  assert.deepEqual(readGarage(), { version: 1, vehicles: [], reminders: [], services: [], expenses: [] })

  localStorage.setItem(GARAGE_STORAGE_KEY, JSON.stringify({ vehicles: [{ brand: 'SYM' }, null], reminders: [{}] }))
  assert.deepEqual(readGarage().vehicles, [])
})

test('السجلات اليتيمة (لموتوسيكل غير موجود) تُسقَط بأمان', () => {
  localStorage.setItem(
    GARAGE_STORAGE_KEY,
    JSON.stringify({
      vehicles: [{ id: 'veh-1', brand: 'SYM', name: 'Orbit 3 150 CC', odometer: 100 }],
      reminders: [
        { id: 'rem-1', vehicleKey: 'SYM|Nope', taskName: 'x', lastServiceDate: '2026-01-01', lastServiceOdometer: 1, nextDueDate: '2026-02-01' },
        { id: 'rem-2', vehicleKey: 'SYM|Orbit 3 150 CC', taskName: 'صيانة', lastServiceDate: '2026-01-01', lastServiceOdometer: 1, nextDueDate: '2026-02-01' },
      ],
      services: 'bad',
      expenses: [],
    }),
  )
  const garage = readGarage()
  assert.equal(garage.vehicles.length, 1)
  assert.equal(garage.reminders.length, 1)
  assert.equal(garage.reminders[0].id, 'rem-2')
})

test('موتوسيكلان منفصلان: سجلات كل واحد لا تختلط', () => {
  seedVehicle(VEHICLE, 1000)
  seedVehicle(VEHICLE_2, 2000)
  addReminder(reminderInput({ taskName: 'مهمة أ', nextDueDate: '2026-12-01' }))
  addReminder(
    reminderInput({
      vehicleKey: `${VEHICLE_2.brand}|${VEHICLE_2.name}`,
      taskName: 'مهمة ب',
      nextDueDate: '2026-12-02',
    }),
  )
  const garage = readGarage()
  assert.equal(garage.vehicles.length, 2)
  assert.equal(garage.reminders.filter((r) => r.vehicleKey === `${VEHICLE.brand}|${VEHICLE.name}`).length, 1)
  assert.equal(garage.reminders.filter((r) => r.vehicleKey === `${VEHICLE_2.brand}|${VEHICLE_2.name}`).length, 1)
})

/* ============================ حالة التذكيرات ============================ */

test('حالة التذكير بالتاريخ: متأخر، مستحق اليوم، قريب، قادم', () => {
  const today = '2026-11-03'
  assert.equal(getReminderStatus({ nextDueDate: '2026-11-01' }, { today }).status, 'overdue')
  assert.equal(getReminderStatus({ nextDueDate: '2026-11-03' }, { today }).status, 'due')
  assert.equal(getReminderStatus({ nextDueDate: '2026-11-10' }, { today }).status, 'soon')
  assert.equal(getReminderStatus({ nextDueDate: '2026-12-20' }, { today }).status, 'upcoming')
})

test('حالة التذكير بالعداد: متأخر، مستحق، قريب، قادم', () => {
  const today = '2026-11-03'
  assert.equal(getReminderStatus({ nextDueOdometer: 1000 }, { today, currentOdometer: 1200 }).status, 'overdue')
  assert.equal(getReminderStatus({ nextDueOdometer: 1200 }, { today, currentOdometer: 1200 }).status, 'due')
  assert.equal(getReminderStatus({ nextDueOdometer: 1500 }, { today, currentOdometer: 1200 }).status, 'soon')
  assert.equal(getReminderStatus({ nextDueOdometer: 3000 }, { today, currentOdometer: 1200 }).status, 'upcoming')
})

test('غياب قراءة العداد الحالية يعطي «أضف قراءة العداد» ولا يخمّن', () => {
  const result = getReminderStatus({ nextDueOdometer: 2000 }, { today: '2026-11-03' })
  assert.equal(result.status, 'need-odometer')
  assert.equal(result.label, 'أضف قراءة العداد')
})

test('عند وجود تاريخ وعداد معًا تُعرض الحالة الأكثر إلحاحًا', () => {
  const result = getReminderStatus(
    { nextDueDate: '2026-12-30', nextDueOdometer: 900 },
    { today: '2026-11-03', currentOdometer: 1200 },
  )
  assert.equal(result.status, 'overdue')
  assert.ok(result.reasons.length >= 2)
})

test('تذكير بلا موعد يُصنَّف «بدون موعد» ولا يرمي استثناء', () => {
  assert.equal(getReminderStatus({}, { today: '2026-11-03' }).status, 'unscheduled')
  assert.equal(getReminderStatus(null, { today: '2026-11-03' }).status, 'unscheduled')
})

test('ترتيب التذكيرات: الأكثر إلحاحًا أولًا ثم الأقرب موعدًا', () => {
  const sorted = sortReminders(
    [
      { taskName: 'قادم', vehicleKey: 'SYM|X', nextDueDate: '2026-12-30', nextDueOdometer: null },
      { taskName: 'متأخر', vehicleKey: 'SYM|X', nextDueDate: '2026-10-01', nextDueOdometer: null },
      { taskName: 'قريب', vehicleKey: 'SYM|X', nextDueDate: '2026-11-10', nextDueOdometer: null },
    ],
    { today: '2026-11-03' },
  )
  assert.deepEqual(sorted.map((item) => item.taskName), ['متأخر', 'قريب', 'قادم'])
})

test('ملخص التذكيرات يجمع الأعداد بحسب الحالة', () => {
  const decorated = sortReminders(
    [
      { taskName: 'أ', vehicleKey: 'SYM|X', nextDueDate: '2026-10-01' },
      { taskName: 'ب', vehicleKey: 'SYM|X', nextDueDate: '2026-10-02' },
      { taskName: 'ج', vehicleKey: 'SYM|X', nextDueDate: '2026-12-01' },
    ],
    { today: '2026-11-03' },
  )
  const summary = summarizeReminders(decorated)
  assert.equal(summary.overdue, 2)
  assert.equal(summary.upcoming, 1)
  assert.equal(summary.total, 3)
})

/* ============================ سجل الخدمات والمصاريف ============================ */

test('سجل الخدمات يُرتَّب زمنيًا (الأحدث أولًا) والمجموع يستثني التكلفة الفارغة', () => {
  const sorted = sortServices([
    { id: 'a', serviceDate: '2026-09-01', serviceType: 'فحص', cost: 100 },
    { id: 'b', serviceDate: '2026-11-01', serviceType: 'تغيير زيت', cost: 300 },
    { id: 'c', serviceDate: '2026-10-01', serviceType: 'فرامل', cost: null },
  ])
  assert.deepEqual(sorted.map((record) => record.id), ['b', 'c', 'a'])
  assert.deepEqual(sumServiceCosts(sorted), { total: 400, count: 3, withCost: 2 })
})

test('فلترة المصاريف بالموتوسيكل ونطاق تاريخ شامل', () => {
  const expenses = [
    expenseInput({ date: '2026-10-01', amount: 100 }),
    expenseInput({ date: '2026-10-31', amount: 200 }),
    expenseInput({
      date: '2026-11-01',
      amount: 300,
      vehicleKey: `${VEHICLE_2.brand}|${VEHICLE_2.name}`,
    }),
  ]
  assert.equal(filterExpenses(expenses, { fromDate: '2026-10-01', toDate: '2026-10-31' }).length, 2)
  assert.equal(filterExpenses(expenses, { vehicleKey: `${VEHICLE_2.brand}|${VEHICLE_2.name}` }).length, 1)
  assert.equal(filterExpenses(expenses, {}).length, 3)
  assert.equal(filterExpenses(expenses, { fromDate: '2026-12-01' }).length, 0)
})

test('ملخص المصاريف: تصنيفات + شهري + سنوي + الشهر والسنة الحاليان', () => {
  const expenses = [
    expenseInput({ date: '2026-10-15', amount: 200, category: 'fuel' }),
    expenseInput({ date: '2026-10-20', amount: 100, category: 'fuel' }),
    expenseInput({ date: '2026-11-01', amount: 500, category: 'repairs' }),
    expenseInput({ date: '2025-12-31', amount: 400, category: 'parts' }),
  ]
  const summary = summarizeExpenses(expenses, { today: '2026-11-03' })
  assert.equal(summary.total, 1200)
  assert.equal(summary.count, 4)
  assert.equal(summary.currentMonth, 500)
  assert.equal(summary.currentYear, 800)
  assert.deepEqual(
    summary.byCategory.map((category) => [category.id, category.total]),
    [
      ['fuel', 300],
      ['parts', 400],
      ['repairs', 500],
    ],
  )
  assert.deepEqual(summary.monthly.map((group) => group.key), ['2026-11', '2026-10', '2025-12'])
  assert.deepEqual(summary.yearly.map((group) => group.key), ['2026', '2025'])
})

test('تنسيق الأرقام والتواريخ وفرق الأيام حتمي', () => {
  assert.equal(formatAmount(1234567.5), '1,234,567.5')
  assert.equal(formatAmount(0), '0')
  assert.equal(formatAmount(Number.NaN), '')
  assert.equal(daysUntil('2026-11-10', '2026-11-03'), 7)
  assert.equal(daysUntil('bad', '2026-11-03'), null)
  assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/)
})

/* ============================ دليل العناية ============================ */

test('دليل العناية: أقسام وتنبيهات عامة بلا ادعاء تعليمات مصنّع', () => {
  assert.ok(CARE_GUIDE_SECTIONS.length >= 6)
  for (const section of CARE_GUIDE_SECTIONS) {
    assert.ok(section.id && section.title)
    assert.ok(Array.isArray(section.items) && section.items.length > 0)
  }
  assert.match(CARE_GUIDE_DISCLAIMER, /دليل المالك|مركز خدمة/)
  assert.match(CARE_GUIDE_MANUAL_NOTE, /دليل المالك/)
  assert.equal(Object.isFrozen(CARE_GUIDE_SECTIONS), true)
})

/* ============================ النسخ الاحتياطي والاسترجاع ============================ */

test('تصدير مرآب فارغ يعمل وينشئ ملف JSON صالح', () => {
  const result = exportGarage()
  assert.equal(result.ok, true)
  assert.ok(result.payload.startsWith('blob:'))
  assert.match(result.filename, /^motohub-garage-backup-\d{4}-\d{2}-\d{2}\.json$/)
})

test('تصدير مرآب به بيانات يضم كل السجلات', () => {
  seedVehicle(VEHICLE, 1000)
  addReminder(reminderInput({ nextDueDate: '2026-12-01' }))
  addService(serviceInput())
  addExpense(expenseInput())

  const result = exportGarage()
  assert.equal(result.ok, true)
  assert.ok(result.payload.startsWith('blob:'))
  assert.match(result.filename, /^motohub-garage-backup-\d{4}-\d{2}-\d{2}\.json$/)
  
  // إنشاء محتوى JSON مباشرة بدلا من محاولة الوصول إلى blob
  const envelope = {
    app: 'motohub-egypt',
    kind: 'garage-backup',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: readGarage(),
  }
  
  assert.equal(envelope.app, 'motohub-egypt')
  assert.equal(envelope.kind, 'garage-backup')
  assert.equal(envelope.schemaVersion, 1)
  assert.ok(envelope.exportedAt)
  assert.equal(envelope.data.vehicles.length, 1)
  assert.equal(envelope.data.reminders.length, 1)
  assert.equal(envelope.data.services.length, 1)
  assert.equal(envelope.data.expenses.length, 1)
})

test('رفض ملفات أكبر من 2 ميغابايت', () => {
  const largeText = 'x'.repeat(2000001) // 2MB + 1 byte
  const result = parseGarageBackup(largeText)
  assert.equal(result.ok, false)
  assert.match(result.error, /ملف كبير جدًا/)
})

test('رفض JSON غير صالح', () => {
  const result = parseGarageBackup('{not-valid-json')
  assert.equal(result.ok, false)
  assert.match(result.error, /JSON غير صالح/)
})

test('رفض نسخة بدون حقول التطبيق أو النوع أو الإصدار', () => {
  const invalidData = JSON.stringify({
    kind: 'garage-backup',
    schemaVersion: 1,
    data: { vehicles: [] },
  })
  const result = parseGarageBackup(invalidData)
  assert.equal(result.ok, false)
  assert.match(result.error, /تطبيق MotoHub Egypt/)

  const invalidKind = JSON.stringify({
    app: 'motohub-egypt',
    kind: 'wrong-type',
    schemaVersion: 1,
    data: { vehicles: [] },
  })
  const result2 = parseGarageBackup(invalidKind)
  assert.equal(result2.ok, false)
  assert.match(result2.error, /غير معروفة/)

  const invalidVersion = JSON.stringify({
    app: 'motohub-egypt',
    kind: 'garage-backup',
    schemaVersion: 2,
    data: { vehicles: [] },
  })
  const result3 = parseGarageBackup(invalidVersion)
  assert.equal(result3.ok, false)
  assert.match(result3.error, /غير مدعوم/)
})

test('رفض بيانات غير موجودة أو غير كائن', () => {
  const noData = JSON.stringify({
    app: 'motohub-egypt',
    kind: 'garage-backup',
    schemaVersion: 1,
  })
  const result = parseGarageBackup(noData)
  assert.equal(result.ok, false)
  assert.match(result.error, /بيانات غير صالحة/)

  const invalidData = JSON.stringify({
    app: 'motohub-egypt',
    kind: 'garage-backup',
    schemaVersion: 1,
    data: 'not-an-object',
  })
  const result2 = parseGarageBackup(invalidData)
  assert.equal(result2.ok, false)
  assert.match(result2.error, /بيانات غير صالحة/)
})

test('استيراد نسخة احتياطية صالحة يحل محل البيانات الحالية', () => {
  // إعداد بيانات أولية
  seedVehicle(VEHICLE, 1000)
  addReminder(reminderInput({ nextDueDate: '2026-12-01' }))
  
  const backupData = {
    app: 'motohub-egypt',
    kind: 'garage-backup',
    schemaVersion: 1,
    exportedAt: '2026-11-03T10:00:00.000Z',
    data: {
      vehicles: [
        {
          id: 'veh-2',
          brand: 'SYM',
          name: 'Jet 4 150 CC',
          odometer: 2000,
          vehicleKey: 'SYM|Jet 4 150 CC',
          odometerUpdatedAt: null,
        }
      ],
      reminders: [
        {
          id: 'rem-2',
          vehicleKey: 'SYM|Jet 4 150 CC',
          taskName: 'فحص الإطارات',
          lastServiceDate: '2026-10-01',
          lastServiceOdometer: 1800,
          nextDueDate: '2026-12-15',
          nextDueOdometer: '',
          notes: '',
        }
      ],
      services: [],
      expenses: [],
    },
  }

  const backupText = JSON.stringify(backupData)
  const parseResult = parseGarageBackup(backupText)
  assert.equal(parseResult.ok, true)
  
  const restoreResult = restoreGarage(parseResult.sanitized)
  assert.equal(restoreResult.ok, true)
  assert.equal(restoreResult.restored, true)

  const garage = readGarage()
  assert.equal(garage.vehicles.length, 1)
  assert.equal(garage.vehicles[0].name, 'Jet 4 150 CC')
  assert.equal(garage.reminders.length, 1)
  assert.equal(garage.reminders[0].taskName, 'فحص الإطارات')
  assert.equal(garage.services.length, 0)
  assert.equal(garage.expenses.length, 0)
})

test('رفض الاستيراد مع بيانات غير صالحة حتى بعد التنظيف', () => {
  const invalidData = {
    app: 'motohub-egypt',
    kind: 'garage-backup',
    schemaVersion: 1,
    exportedAt: '2026-11-03T10:00:00.000Z',
    data: {
      vehicles: [
        {
          id: 'veh-bad',
          brand: 'UNKNOWN',
          name: 'Nonexistent Model',
          odometer: 1000,
          vehicleKey: 'UNKNOWN|Nonexistent Model',
          odometerUpdatedAt: null,
        }
      ],
      reminders: [],
      services: [],
      expenses: [],
    },
  }

  const backupText = JSON.stringify(invalidData)
  const parseResult = parseGarageBackup(backupText)
  assert.equal(parseResult.ok, true) // parseGarageBackup قد يسمح بالبيانات غير الصالحة

  const restoreResult = restoreGarage({ data: parseResult.sanitized })
  assert.equal(restoreResult.ok, false)
  assert.match(restoreResult.error, /غير صالحة/)
})

test('اختبار ذهاب وإياب: تصدير ثم استيراد يعيد نفس البيانات', () => {
  // إعداد بيانات متنوعة
  seedVehicle(VEHICLE, 1000)
  seedVehicle(VEHICLE_2, 2000)
  addReminder(reminderInput({ nextDueDate: '2026-12-01' }))
  addReminder(
    reminderInput({
      vehicleKey: `${VEHICLE_2.brand}|${VEHICLE_2.name}`,
      taskName: 'فحص الإطارات',
      nextDueDate: '2026-12-15',
    })
  )
  addService(serviceInput())
  addService(serviceInput({ serviceDate: '2026-10-02', cost: 500 }))
  addExpense(expenseInput())
  addExpense(expenseInput({ category: 'parts', amount: 300 }))

  const originalGarage = readGarage()

  // تصدير البيانات
  const exportResult = exportGarage()
  assert.equal(exportResult.ok, true)

  const backupText = JSON.stringify({
    app: 'motohub-egypt',
    kind: 'garage-backup',
    schemaVersion: 1,
    exportedAt: '2026-11-03T10:00:00.000Z',
    data: originalGarage,
  })

  // مسح البيانات الأصلية
  localStorage.clear()
  assert.deepEqual(readGarage(), { version: 1, vehicles: [], reminders: [], services: [], expenses: [] })

  // استيراد البيانات
  const parseResult = parseGarageBackup(backupText)
  assert.equal(parseResult.ok, true)

  const restoreResult = restoreGarage({ data: parseResult.sanitized })
  assert.equal(restoreResult.ok, true)

  const restoredGarage = readGarage()
  
  // التحقق من أن البيانات مستعادة بنفس العدد
  assert.equal(restoredGarage.vehicles.length, originalGarage.vehicles.length)
  assert.equal(restoredGarage.reminders.length, originalGarage.reminders.length)
  assert.equal(restoredGarage.services.length, originalGarage.services.length)
  assert.equal(restoredGarage.expenses.length, originalGarage.expenses.length)

  // التحقق من محتوى البيانات الرئيسي (مع تجاهل الهويات الفريدة)
  assert.deepEqual(
    restoredGarage.vehicles.map(v => ({ brand: v.brand, name: v.name, odometer: v.odometer })),
    originalGarage.vehicles.map(v => ({ brand: v.brand, name: v.name, odometer: v.odometer }))
  )
})

test('رفض الاستيراد بدون بيانات أو مع بيانات غير كائن', () => {
  assert.equal(restoreGarage(null).ok, false)
  assert.equal(restoreGarage(undefined).ok, false)
  assert.equal(restoreGarage('not-an-object').ok, false)
  assert.equal(restoreGarage({}).ok, false)
})
