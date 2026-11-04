import { beforeEach, test } from 'node:test'
import assert from 'node:assert'
import { 
  readGarage, 
  addVehicle, 
  addReminder, 
  addService, 
  addExpense 
} from '../src/data/garageStore.js'
import { 
  todayISO, 
  sortReminders, 
  summarizeReminders, 
  summarizeExpenses 
} from '../src/data/garageStats.js'

/**
 * اختبارات لوحة الملكية الذكية
 * 
 * المبادئ:
 * - اختبار البيانات الحقيقية فقط — لا اختراع بيانات أو حسابات
 * - اختبار كل بطاقة على حدة ومعًا
 * - اختبار الحالات الفارغة والنقاط الحدودية
 */

// Mock localStorage for Node.js tests
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
  // مسح البيانات قبل كل اختبار
  localStorage.removeItem('motohub.garage')
  memory.clear()
})

test('تُرجع رسالة فارغة عند عدم وجود مركبات', () => {
  const garage = readGarage()
  assert.strictEqual(garage.vehicles.length, 0)
  assert.strictEqual(garage.reminders.length, 0)
  assert.strictEqual(garage.services.length, 0)
  assert.strictEqual(garage.expenses.length, 0)
})

test('تحسب الإحصائيات الأساسية عند وجود مركبة واحدة', () => {
  // إضافة موتوسيكل
  const addResult = addVehicle({
    brand: 'SYM',
    name: 'Orbit 3 150 CC',
    odometer: 5000
  })
  assert.equal(addResult.ok, true)

  const garage = readGarage()
  assert.strictEqual(garage.vehicles.length, 1)
  assert.strictEqual(garage.vehicles[0].brand, 'SYM')
  assert.strictEqual(garage.vehicles[0].name, 'Orbit 3 150 CC')
  assert.strictEqual(garage.vehicles[0].odometer, 5000)
})

test('تحسب الإحصائيات الأساسية عند وجود مركبتين', () => {
  // إضافة موتوسيكلين
  const addResult1 = addVehicle({ brand: 'SYM', name: 'Orbit 3 150 CC', odometer: 5000 })
  assert.equal(addResult1.ok, true)
  const addResult2 = addVehicle({ brand: 'ZONTES', name: 'G1 155cc ( لون فسفوري عداد ديجيتال قديم )', odometer: 3000 })
  assert.equal(addResult2.ok, true)

  const garage = readGarage()
  assert.strictEqual(garage.vehicles.length, 2)
})

test('تُظهر الإحصائيات الأساسية عند وجود مركبة واحدة', () => {
  addVehicle({ brand: 'SYM', name: 'Orbit 3 150 CC', odometer: 5000 })
  
  const garage = readGarage()
  const vehicles = garage.vehicles
  // حساب الإحصائيات يدويًا
  const totalVehicles = vehicles.length
  const activeReminders = garage.reminders.filter(r => r.vehicleKey)
  const totalReminders = activeReminders.length
  const servicesCount = garage.services.length
  const expensesCount = garage.expenses.length
  
  // التأكد من القيم الأساسية
  assert.strictEqual(totalVehicles, 1)
  assert.strictEqual(totalReminders, 0)
  assert.strictEqual(servicesCount, 0)
  assert.strictEqual(expensesCount, 0)
})

test('تُظهر الإحصائيات عند وجود تذكيرات وخدمات ومصاريف', () => {
  // إضافة موتوسيكل
  const addResult = addVehicle({ brand: 'SYM', name: 'Orbit 3 150 CC', odometer: 5000 })
  assert.equal(addResult.ok, true)
  assert.ok(addResult.record)
  const vehicleKey = addResult.record.vehicleKey
  
  // إضافة تذكير
  const reminderResult = addReminder({
    vehicleKey,
    taskName: 'تغيير الزيت',
    lastServiceDate: todayISO(),
    lastServiceOdometer: 5000,
    nextDueDate: todayISO(),
    nextDueOdometer: 6000
  })
  assert.strictEqual(reminderResult.ok, true)
  
  // إضافة خدمة
  const serviceResult = addService({
    vehicleKey,
    serviceType: 'صيانة دورية',
    serviceDate: todayISO(),
    odometer: 5500,
    cost: 300,
    description: 'تغيير الزيت والفلتر'
  })
  assert.strictEqual(serviceResult.ok, true)
  
  // إضافة مصروف
  const expenseResult = addExpense({
    vehicleKey,
    category: 'maintenance',
    amount: 350,
    date: todayISO(),
    description: 'تغيير الزيت والفلتر'
  })
  assert.strictEqual(expenseResult.ok, true)
  
  const garage = readGarage()
  const vehicles = garage.vehicles
  
  // حساب الإحصائيات
  const totalVehicles = vehicles.length
  const activeReminders = garage.reminders.filter(r => r.vehicleKey)
  const totalReminders = activeReminders.length
  const servicesCount = garage.services.length
  const expensesCount = garage.expenses.length
  
  // التأكد من القيم
  assert.strictEqual(totalVehicles, 1)
  assert.strictEqual(totalReminders, 1)
  assert.strictEqual(servicesCount, 1)
  assert.strictEqual(expensesCount, 1)
})

test('تُصنّف التذكيرات بشكل صحيح', () => {
  // إضافة موتوسيكل
  const addResult = addVehicle({ brand: 'SYM', name: 'Orbit 3 150 CC', odometer: 5000 })
  assert.equal(addResult.ok, true)
  assert.ok(addResult.record)
  const vehicleKey = addResult.record.vehicleKey
  
  // إضافة تذكير متأخر
  const reminderResult1 = addReminder({
    vehicleKey,
    taskName: 'تغيير الزيت',
    lastServiceDate: '2022-12-01',
    lastServiceOdometer: 5000,
    nextDueDate: '2023-01-01', // تاريخ متأخر
    nextDueOdometer: 6000
  })
  assert.strictEqual(reminderResult1.ok, true)
  
  // إضافة تذكير قريب
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowISO = tomorrow.toISOString().split('T')[0]
  
  const reminderResult2 = addReminder({
    vehicleKey,
    taskName: 'فحص الفرامل',
    lastServiceDate: todayISO(),
    lastServiceOdometer: 5000,
    nextDueDate: tomorrowISO,
    nextDueOdometer: 5500
  })
  assert.strictEqual(reminderResult2.ok, true)
  
  const garage = readGarage()
  const vehicles = garage.vehicles
  const today = todayISO()
  
  // ترتيب التذكيرات
  const odometerByKey = {}
  for (const vehicle of vehicles) {
    odometerByKey[vehicle.vehicleKey] = vehicle.odometer
  }
  
  const activeReminders = garage.reminders.filter(r => r.vehicleKey)
  const decoratedReminders = sortReminders(activeReminders, { today, odometerByKey })
  const reminderSummary = summarizeReminders(decoratedReminders)
  
  // التأكد من التصنيف
  assert.strictEqual(reminderSummary.overdue, 1)
  assert.strictEqual(reminderSummary.due, 0)
  assert.strictEqual(reminderSummary.soon, 1)
  assert.strictEqual(reminderSummary.upcoming, 0)
})

test('تُجمّع المصاريف بشكل صحيح', () => {
  // إضافة موتوسيكل
  const addResult = addVehicle({ brand: 'SYM', name: 'Orbit 3 150 CC', odometer: 5000 })
  assert.equal(addResult.ok, true)
  const vehicleKey = addResult.record.vehicleKey
  
  // إضافة مصاريف متعددة
  const expenseResult1 = addExpense({
    vehicleKey,
    category: 'fuel',
    amount: 200,
    date: todayISO(),
    description: 'شراء وقود'
  })
  assert.strictEqual(expenseResult1.ok, true)
  
  const expenseResult2 = addExpense({
    vehicleKey,
    category: 'maintenance',
    amount: 300,
    date: todayISO(),
    description: 'صيانة'
  })
  assert.strictEqual(expenseResult2.ok, true)
  
  const garage = readGarage()
  const today = todayISO()
  
  // تجميع المصاريف
  const allExpenses = summarizeExpenses(garage.expenses, { today })
  
  // التأكد من المجاميع
  assert.strictEqual(allExpenses.total, 500)
  assert.strictEqual(allExpenses.currentMonth, 500)
  assert.strictEqual(allExpenses.currentYear, 500)
  
  // التأكد من التصنيفات
  assert.strictEqual(allExpenses.byCategory.length, 2)
  assert.strictEqual(allExpenses.byCategory[0].id, 'fuel')
  assert.strictEqual(allExpenses.byCategory[0].total, 200)
  assert.strictEqual(allExpenses.byCategory[1].id, 'maintenance')
  assert.strictEqual(allExpenses.byCategory[1].total, 300)
})

test('تُعرض الأنشطة الزمنية بشكل صحيح', () => {
  // إضافة موتوسيكل
  const addResult = addVehicle({ brand: 'SYM', name: 'Orbit 3 150 CC', odometer: 5000 })
  assert.equal(addResult.ok, true)
  assert.ok(addResult.record)
  const vehicleKey = addResult.record.vehicleKey
  
  // إضافة خدمة
  const serviceResult = addService({
    vehicleKey,
    serviceType: 'صيانة دورية',
    serviceDate: '2023-02-01',
    odometer: 5500,
    cost: 300,
    description: 'تغيير الزيت'
  })
  assert.strictEqual(serviceResult.ok, true)
  
  // إضافة مصروف
  const expenseResult = addExpense({
    vehicleKey,
    category: 'fuel',
    amount: 200,
    date: '2023-01-15',
    description: 'شراء وقود'
  })
  assert.strictEqual(expenseResult.ok, true)
  
  const garage = readGarage()
  
  // إنشاء قائمة الأنشطة
  const allActivities = []
  
  // إضافة الخدمات
  garage.services.forEach(service => {
    allActivities.push({
      id: service.id,
      type: 'service',
      date: service.serviceDate,
      vehicleKey: service.vehicleKey,
      title: service.serviceType,
      amount: service.cost,
      icon: '🔧'
    })
  })
  
  // إضافة المصاريف
  garage.expenses.forEach(expense => {
    allActivities.push({
      id: expense.id,
      type: 'expense',
      date: expense.date,
      vehicleKey: expense.vehicleKey,
      title: expense.category,
      amount: expense.amount,
      icon: '💰'
    })
  })
  
  // ترتيب الأحدث أولاً
  allActivities.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return a.id < b.id ? 1 : -1
  })
  
  const recentActivities = allActivities.slice(0, 10)
  
  // التأكد من الترتيب
  assert.strictEqual(recentActivities.length, 2)
  assert.strictEqual(recentActivities[0].date, '2023-02-01')
  assert.strictEqual(recentActivities[0].type, 'service')
  assert.strictEqual(recentActivities[1].date, '2023-01-15')
  assert.strictEqual(recentActivities[1].type, 'expense')
})

test('تعامل مع تذكير مستقبلي', () => {
  // إضافة موتوسيكل
  const addResult = addVehicle({ brand: 'SYM', name: 'Orbit 3 150 CC', odometer: 5000 })
  assert.equal(addResult.ok, true)
  assert.ok(addResult.record)
  const vehicleKey = addResult.record.vehicleKey
  
  // إضافة تذكير بتاريخ مستقبلي
  const futureDate = new Date()
  futureDate.setFullYear(futureDate.getFullYear() + 1) // تاريخ مستقبلي بعد سنة
  const futureDateISO = futureDate.toISOString().split('T')[0]
  
  const reminderResult = addReminder({
    vehicleKey,
    taskName: 'فحص عام',
    lastServiceDate: todayISO(),
    lastServiceOdometer: 5000,
    nextDueDate: futureDateISO
  })
  assert.strictEqual(reminderResult.ok, true)
  
  const garage = readGarage()
  const vehicles = garage.vehicles
  const today = todayISO()
  
  // ترتيب التذكيرات
  const odometerByKey = {}
  for (const vehicle of vehicles) {
    odometerByKey[vehicle.vehicleKey] = vehicle.odometer
  }
  
  const activeReminders = garage.reminders.filter(r => r.vehicleKey)
  const decoratedReminders = sortReminders(activeReminders, { today, odometerByKey })
  
  // التأكد من أن التذكير المستقبلي يتم تصنيفه بشكل صحيح
  assert.strictEqual(decoratedReminders.length, 1)
  assert.strictEqual(decoratedReminders[0].status, 'upcoming')
})

test('تعامل مع مصاريف كبيرة', () => {
  // إضافة موتوسيكل
  const addResult = addVehicle({ brand: 'SYM', name: 'Orbit 3 150 CC', odometer: 5000 })
  assert.equal(addResult.ok, true)
  const vehicleKey = addResult.record.vehicleKey
  
  // إضافة مصروف كبير
  const expenseResult = addExpense({
    vehicleKey,
    category: 'repairs',
    amount: 5000,
    date: todayISO(),
    description: 'إصلاح محرك'
  })
  assert.strictEqual(expenseResult.ok, true)
  
  const garage = readGarage()
  const today = todayISO()
  
  // تجميع المصاريف
  const allExpenses = summarizeExpenses(garage.expenses, { today })
  
  // التأكد من التعامل مع المبالغ الكبيرة
  assert.strictEqual(allExpenses.total, 5000)
})