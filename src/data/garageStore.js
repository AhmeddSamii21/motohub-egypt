/**
 * مرآب الملكية (Ownership Companion) — سجلات محلية للعميل بعد الشراء.
 *
 * كل شيء في هذا الملف محلي بالكامل: localStorage فقط، بلا حساب، بلا خادم، بلا إرسال
 * بيانات إلى Google Sheets أو أي خدمة خارجية. المفتاح الوحيد `motohub.garage`.
 *
 * القواعد الصارمة:
 * - أي بيانات تالفة/ناقصة/غير متوقعة تُنظَّف بصمت ولا تُرمى استثناءات أبدًا.
 * - السجلات مرتبطة بالموديل عبر مفتاح الكتالوج نفسه `brand|name` (لا اختراع مفاتيح).
 * - قراءة العداد رقم صحيح غير سالب، والتواريخ بصيغة YYYY-MM-DD صالحة فقط.
 * - حذف الموتوسيكل يحذف تذكيرات/خدمات/مصاريفه المرتبطة به (لا سجلات يتيمة).
 * - كل التذكيرات هنا من إعداد العميل — الملف لا يخترع أي فترات صيانة من المصنّع.
 */
import { CATALOG } from './catalog.js'

export const GARAGE_STORAGE_KEY = 'motohub.garage'

/** حدث مخصص يُطلَق بعد أي تغيير ناجح — لتحديث كل الأقسام فورًا */
export const GARAGE_EVENT = 'motohub:garage-changed'

/** تصنيفات المصاريف — القائمة الوحيدة المقبولة */
export const EXPENSE_CATEGORIES = Object.freeze([
  { id: 'fuel', label: 'وقود' },
  { id: 'maintenance', label: 'صيانة' },
  { id: 'parts', label: 'قطع غيار' },
  { id: 'repairs', label: 'إصلاحات' },
  { id: 'insurance', label: 'تأمين أو ترخيص' },
  { id: 'other', label: 'أخرى' },
])

const CATEGORY_IDS = new Set(EXPENSE_CATEGORIES.map((entry) => entry.id))

/** مفاتيح الكتالوج الصالحة — المرجع الوحيد لقبول موديل */
const CATALOG_KEYS = new Set()
for (const group of CATALOG) {
  if (!group || !Array.isArray(group.models)) continue
  for (const model of group.models) {
    if (model && typeof model.name === 'string') CATALOG_KEYS.add(`${group.brand}|${model.name}`)
  }
}

const MAX_VEHICLES = 10
const MAX_REMINDERS = 200
const MAX_SERVICES = 500
const MAX_EXPENSES = 1000

const STORAGE_ERROR = 'تعذّر حفظ البيانات على هذا المتصفح — قد يكون التخزين المحلي غير متاح'

/** التخزين المتاح أو null — آمن حتى لو localStorage ممنوع */
function storage() {
  try {
    return globalThis.localStorage || null
  } catch {
    return null
  }
}

/** معرّف فريد بلا اعتماديات — crypto.randomUUID عند توفره */
function makeId(prefix) {
  const random =
    globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${random}`
}

function isDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1970 || year > 2100 || month < 1 || month > 12 || day < 1) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

/** عداد صحيح 0..2,000,000 أو null (الفراغ مسموح في إضافة الموتوسيكل فقط) */
function toOdometer(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = typeof value === 'number' ? value : Number(String(value).trim())
  return Number.isInteger(number) && number >= 0 && number <= 2000000 ? number : null
}

/** مبلغ موجب بحد أقصى معقول — يُقرَّب لقرشين */
function toAmount(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isFinite(number) || number <= 0 || number > 1000000000) return null
  return Math.round(number * 100) / 100
}

/** تكلفة اختيارية: 0 مسموح، السالب مرفوض */
function toCost(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isFinite(number) || number < 0 || number > 1000000000) return null
  return Math.round(number * 100) / 100
}

function fail(error) {
  return { ok: false, error }
}

function emptyGarage() {
  return { version: 1, vehicles: [], reminders: [], services: [], expenses: [] }
}

function sanitizeVehicle(value) {
  if (!value || typeof value !== 'object') return null
  const brand = cleanText(value.brand, 80)
  const name = cleanText(value.name, 120)
  const vehicleKey = `${brand}|${name}`
  if (!brand || !name || !CATALOG_KEYS.has(vehicleKey)) return null
  const id = cleanText(value.id, 80)
  if (!id) return null
  const odometer = toOdometer(value.odometer)
  const odometerUpdatedAt =
    odometer !== null && typeof value.odometerUpdatedAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value.odometerUpdatedAt)
      ? value.odometerUpdatedAt
      : null
  return { id, brand, name, vehicleKey, odometer, odometerUpdatedAt }
}

function sanitizeReminder(value, vehicleKeys) {
  if (!value || typeof value !== 'object') return null
  const id = cleanText(value.id, 80)
  const vehicleKey = cleanText(value.vehicleKey, 220)
  const taskName = cleanText(value.taskName, 120)
  const lastServiceDate = isDateString(value.lastServiceDate) ? value.lastServiceDate : ''
  const lastServiceOdometer = toOdometer(value.lastServiceOdometer)
  const nextDueDate = isDateString(value.nextDueDate) ? value.nextDueDate : ''
  const nextDueOdometer = toOdometer(value.nextDueOdometer)
  if (!id || !vehicleKeys.has(vehicleKey) || !taskName || !lastServiceDate || lastServiceOdometer === null) return null
  if (!nextDueDate && nextDueOdometer === null) return null
  if (nextDueOdometer !== null && nextDueOdometer <= lastServiceOdometer) return null
  return {
    id,
    vehicleKey,
    taskName,
    lastServiceDate,
    lastServiceOdometer,
    nextDueDate,
    nextDueOdometer,
    notes: cleanText(value.notes, 1000),
  }
}

function sanitizeService(value, vehicleKeys) {
  if (!value || typeof value !== 'object') return null
  const id = cleanText(value.id, 80)
  const vehicleKey = cleanText(value.vehicleKey, 220)
  const serviceDate = isDateString(value.serviceDate) ? value.serviceDate : ''
  const odometer = toOdometer(value.odometer)
  const serviceType = cleanText(value.serviceType, 80)
  const description = cleanText(value.description, 1000)
  const cost = toCost(value.cost)
  if (!id || !vehicleKeys.has(vehicleKey) || !serviceDate || odometer === null || !serviceType || !description) return null
  return { id, vehicleKey, serviceDate, odometer, serviceType, description, cost, notes: cleanText(value.notes, 1000) }
}

function sanitizeExpense(value, vehicleKeys) {
  if (!value || typeof value !== 'object') return null
  const id = cleanText(value.id, 80)
  const vehicleKey = cleanText(value.vehicleKey, 220)
  const date = isDateString(value.date) ? value.date : ''
  const category = cleanText(value.category, 40)
  const amount = toAmount(value.amount)
  if (!id || !vehicleKeys.has(vehicleKey) || !date || !CATEGORY_IDS.has(category) || amount === null) return null
  return { id, vehicleKey, date, category, amount, notes: cleanText(value.notes, 1000) }
}

function sanitizeGarage(raw) {
  const garage = emptyGarage()
  if (!raw || typeof raw !== 'object') return garage

  const vehicleKeys = new Set()
  const vehicleIds = new Set()
  for (const entry of Array.isArray(raw.vehicles) ? raw.vehicles : []) {
    const vehicle = sanitizeVehicle(entry)
    if (!vehicle) continue
    if (vehicleKeys.has(vehicle.vehicleKey) || vehicleIds.has(vehicle.id)) continue
    vehicleKeys.add(vehicle.vehicleKey)
    vehicleIds.add(vehicle.id)
    garage.vehicles.push(vehicle)
    if (garage.vehicles.length >= MAX_VEHICLES) break
  }

  const ids = new Set()
  for (const entry of Array.isArray(raw.reminders) ? raw.reminders : []) {
    const reminder = sanitizeReminder(entry, vehicleKeys)
    if (!reminder || ids.has(reminder.id)) continue
    ids.add(reminder.id)
    garage.reminders.push(reminder)
    if (garage.reminders.length >= MAX_REMINDERS) break
  }

  const serviceIds = new Set()
  for (const entry of Array.isArray(raw.services) ? raw.services : []) {
    const service = sanitizeService(entry, vehicleKeys)
    if (!service || serviceIds.has(service.id)) continue
    serviceIds.add(service.id)
    garage.services.push(service)
    if (garage.services.length >= MAX_SERVICES) break
  }

  const expenseIds = new Set()
  for (const entry of Array.isArray(raw.expenses) ? raw.expenses : []) {
    const expense = sanitizeExpense(entry, vehicleKeys)
    if (!expense || expenseIds.has(expense.id)) continue
    expenseIds.add(expense.id)
    garage.expenses.push(expense)
    if (garage.expenses.length >= MAX_EXPENSES) break
  }

  return garage
}

/** القراءة الآمنة — أي تلف/غياب يُرجع حالة فارغة بلا استثناء */
export function readGarage() {
  try {
    const store = storage()
    const raw = store ? store.getItem(GARAGE_STORAGE_KEY) : null
    if (!raw) return emptyGarage()
    return sanitizeGarage(JSON.parse(raw))
  } catch {
    return emptyGarage()
  }
}

/** حفظ + إطلاق الحدث — أي فشل يُبلَّغ عنه بصراحة */
function persist(garage) {
  try {
    const store = storage()
    if (!store) return false
    store.setItem(GARAGE_STORAGE_KEY, JSON.stringify(garage))
  } catch {
    return false
  }
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent(GARAGE_EVENT))
    }
  } catch {
    // الحدث اختياري — الفشل فيه لا يُفقد البيانات
  }
  return true
}

/** أي تعديل: نقرأ الحالة النظيفة، نطبّق، ثم نحفظ (أو نبلّغ بالفشل) */
function commit(garage, result) {
  return persist(garage) ? result : fail(STORAGE_ERROR)
}

/* ============================ الموتوسيكلات ============================ */

export function addVehicle(input = {}) {
  const brand = cleanText(input.brand, 80)
  const name = cleanText(input.name, 120)
  if (!brand || !name) return fail('اختر الماركة والموديل من الكتالوج')
  const vehicleKey = `${brand}|${name}`
  if (!CATALOG_KEYS.has(vehicleKey)) return fail('هذا الموديل غير موجود في كتالوج الموقع')

  const garage = readGarage()
  if (garage.vehicles.some((vehicle) => vehicle.vehicleKey === vehicleKey)) return fail('هذا الموتوسيكل مضاف بالفعل')
  if (garage.vehicles.length >= MAX_VEHICLES) return fail(`يمكن إضافة ${MAX_VEHICLES} موتوسيكلات كحد أقصى`)

  const hasOdometer = !(input.odometer === '' || input.odometer === null || input.odometer === undefined)
  const odometer = toOdometer(input.odometer)
  if (hasOdometer && odometer === null) return fail('قراءة العداد يجب أن تكون رقمًا صحيحًا غير سالب')

  const record = {
    id: makeId('veh'),
    brand,
    name,
    vehicleKey,
    odometer,
    odometerUpdatedAt: odometer === null ? null : new Date().toISOString(),
  }
  garage.vehicles.push(record)
  return commit(garage, { ok: true, record })
}

export function updateVehicleOdometer(vehicleId, odometerValue) {
  const odometer = toOdometer(odometerValue)
  if (odometer === null) return fail('أدخل قراءة العداد كرقم صحيح غير سالب')
  const garage = readGarage()
  const vehicle = garage.vehicles.find((entry) => entry.id === vehicleId)
  if (!vehicle) return fail('الموتوسيكل غير موجود')
  vehicle.odometer = odometer
  vehicle.odometerUpdatedAt = new Date().toISOString()
  return commit(garage, { ok: true, record: vehicle })
}

export function removeVehicle(vehicleId) {
  const garage = readGarage()
  const vehicle = garage.vehicles.find((entry) => entry.id === vehicleId)
  if (!vehicle) return fail('الموتوسيكل غير موجود')
  garage.vehicles = garage.vehicles.filter((entry) => entry.id !== vehicleId)
  garage.reminders = garage.reminders.filter((entry) => entry.vehicleKey !== vehicle.vehicleKey)
  garage.services = garage.services.filter((entry) => entry.vehicleKey !== vehicle.vehicleKey)
  garage.expenses = garage.expenses.filter((entry) => entry.vehicleKey !== vehicle.vehicleKey)
  return commit(garage, { ok: true, removed: true })
}

/* ============================ تذكيرات الصيانة ============================ */

function buildReminder(input, vehicleKeys, id) {
  const vehicleKey = cleanText(input.vehicleKey, 220)
  if (!vehicleKeys.has(vehicleKey)) return fail('اختر موتوسيكلًا مضافًا أولًا')
  const taskName = cleanText(input.taskName, 120)
  if (!taskName) return fail('اكتب اسم مهمة الصيانة')
  if (!isDateString(input.lastServiceDate)) return fail('أدخل تاريخ آخر صيانة صحيحًا')
  const lastServiceOdometer = toOdometer(input.lastServiceOdometer)
  if (lastServiceOdometer === null) return fail('أدخل قراءة عداد آخر صيانة كرقم صحيح غير سالب')
  const nextDueDate = isDateString(input.nextDueDate) ? input.nextDueDate : ''
  const nextDueOdometer = toOdometer(input.nextDueOdometer)
  if (!nextDueDate && nextDueOdometer === null) return fail('أضف موعد التذكير: تاريخًا أو قراءة عداد (أو كليهما)')
  if (nextDueOdometer !== null && nextDueOdometer <= lastServiceOdometer) {
    return fail('قراءة العداد التالية يجب أن تكون أكبر من قراءة آخر صيانة')
  }
  return {
    ok: true,
    record: {
      id,
      vehicleKey,
      taskName,
      lastServiceDate: input.lastServiceDate,
      lastServiceOdometer,
      nextDueDate,
      nextDueOdometer,
      notes: cleanText(input.notes, 1000),
    },
  }
}

export function addReminder(input = {}) {
  const garage = readGarage()
  if (garage.reminders.length >= MAX_REMINDERS) return fail(`يمكن حفظ ${MAX_REMINDERS} تذكيرًا كحد أقصى`)
  const vehicleKeys = new Set(garage.vehicles.map((vehicle) => vehicle.vehicleKey))
  const built = buildReminder(input, vehicleKeys, makeId('rem'))
  if (!built.ok) return built
  garage.reminders.push(built.record)
  return commit(garage, { ok: true, record: built.record })
}

export function updateReminder(reminderId, input = {}) {
  const garage = readGarage()
  const index = garage.reminders.findIndex((entry) => entry.id === reminderId)
  if (index === -1) return fail('التذكير غير موجود')
  const vehicleKeys = new Set(garage.vehicles.map((vehicle) => vehicle.vehicleKey))
  const built = buildReminder(input, vehicleKeys, reminderId)
  if (!built.ok) return built
  garage.reminders[index] = built.record
  return commit(garage, { ok: true, record: built.record })
}

export function removeReminder(reminderId) {
  const garage = readGarage()
  const exists = garage.reminders.some((entry) => entry.id === reminderId)
  if (!exists) return fail('التذكير غير موجود')
  garage.reminders = garage.reminders.filter((entry) => entry.id !== reminderId)
  return commit(garage, { ok: true, removed: true })
}

/* ============================ سجل الخدمات ============================ */

function buildService(input, vehicleKeys, id) {
  const vehicleKey = cleanText(input.vehicleKey, 220)
  if (!vehicleKeys.has(vehicleKey)) return fail('اختر موتوسيكلًا مضافًا أولًا')
  if (!isDateString(input.serviceDate)) return fail('أدخل تاريخ الخدمة صحيحًا')
  const odometer = toOdometer(input.odometer)
  if (odometer === null) return fail('أدخل قراءة العداد كرقم صحيح غير سالب')
  const serviceType = cleanText(input.serviceType, 80)
  if (!serviceType) return fail('اختر نوع الخدمة')
  const description = cleanText(input.description, 1000)
  if (!description) return fail('اكتب وصفًا موجزًا للخدمة')
  const hasCost = !(input.cost === '' || input.cost === null || input.cost === undefined)
  const cost = toCost(input.cost)
  if (hasCost && cost === null) return fail('التكلفة يجب أن تكون رقمًا غير سالب أو تُترك فارغة')
  return {
    ok: true,
    record: {
      id,
      vehicleKey,
      serviceDate: input.serviceDate,
      odometer,
      serviceType,
      description,
      cost,
      notes: cleanText(input.notes, 1000),
    },
  }
}

export function addService(input = {}) {
  const garage = readGarage()
  if (garage.services.length >= MAX_SERVICES) return fail(`يمكن حفظ ${MAX_SERVICES} سجل خدمة كحد أقصى`)
  const vehicleKeys = new Set(garage.vehicles.map((vehicle) => vehicle.vehicleKey))
  const built = buildService(input, vehicleKeys, makeId('svc'))
  if (!built.ok) return built
  garage.services.push(built.record)
  return commit(garage, { ok: true, record: built.record })
}

export function updateService(serviceId, input = {}) {
  const garage = readGarage()
  const index = garage.services.findIndex((entry) => entry.id === serviceId)
  if (index === -1) return fail('سجل الخدمة غير موجود')
  const vehicleKeys = new Set(garage.vehicles.map((vehicle) => vehicle.vehicleKey))
  const built = buildService(input, vehicleKeys, serviceId)
  if (!built.ok) return built
  garage.services[index] = built.record
  return commit(garage, { ok: true, record: built.record })
}

export function removeService(serviceId) {
  const garage = readGarage()
  const exists = garage.services.some((entry) => entry.id === serviceId)
  if (!exists) return fail('سجل الخدمة غير موجود')
  garage.services = garage.services.filter((entry) => entry.id !== serviceId)
  return commit(garage, { ok: true, removed: true })
}

/* ============================ مصاريف الملكية ============================ */

function buildExpense(input, vehicleKeys, id) {
  const vehicleKey = cleanText(input.vehicleKey, 220)
  if (!vehicleKeys.has(vehicleKey)) return fail('اختر موتوسيكلًا مضافًا أولًا')
  if (!isDateString(input.date)) return fail('أدخل تاريخ المصروف صحيحًا')
  const category = cleanText(input.category, 40)
  if (!CATEGORY_IDS.has(category)) return fail('اختر تصنيف المصروف من القائمة')
  const amount = toAmount(input.amount)
  if (amount === null) return fail('أدخل مبلغًا أكبر من صفر')
  return { ok: true, record: { id, vehicleKey, date: input.date, category, amount, notes: cleanText(input.notes, 1000) } }
}

export function addExpense(input = {}) {
  const garage = readGarage()
  if (garage.expenses.length >= MAX_EXPENSES) return fail(`يمكن حفظ ${MAX_EXPENSES} مصروف كحد أقصى`)
  const vehicleKeys = new Set(garage.vehicles.map((vehicle) => vehicle.vehicleKey))
  const built = buildExpense(input, vehicleKeys, makeId('exp'))
  if (!built.ok) return built
  garage.expenses.push(built.record)
  return commit(garage, { ok: true, record: built.record })
}

export function updateExpense(expenseId, input = {}) {
  const garage = readGarage()
  const index = garage.expenses.findIndex((entry) => entry.id === expenseId)
  if (index === -1) return fail('المصروف غير موجود')
  const vehicleKeys = new Set(garage.vehicles.map((vehicle) => vehicle.vehicleKey))
  const built = buildExpense(input, vehicleKeys, expenseId)
  if (!built.ok) return built
  garage.expenses[index] = built.record
  return commit(garage, { ok: true, record: built.record })
}

export function removeExpense(expenseId) {
  const garage = readGarage()
  const exists = garage.expenses.some((entry) => entry.id === expenseId)
  if (!exists) return fail('المصروف غير موجود')
  garage.expenses = garage.expenses.filter((entry) => entry.id !== expenseId)
  return commit(garage, { ok: true, removed: true })
}
