/**
 * اختبارات معادلات تكلفة التشغيل بعد التمديد (ownershipCost.js).
 * المعادلة: لترات الشهر = المسافة الشهرية ÷ كم/لتر؛ الوقود = اللترات × سعر اللتر؛
 * الإجمالي الشهري = الوقود + الصيانة + غيرها؛ السنوي = الشهري × 12.
 * الوضعان: يومي (كم/يوم × أيام) وشهري مباشر — وتبديل الوضع لا يقرأ قيم الوضع الآخر.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateOwnershipCost } from '../src/data/ownershipCost.js'

const BASE = { kmPerLiter: 25, fuelPrice: 14, maintenance: 200 }

test('الوضع اليومي: 30 كم × 26 يوم ÷ 25 كم/لتر × 14 = 437 ج.م وقود + 200 صيانة', () => {
  const result = calculateOwnershipCost({ ...BASE, dailyKm: 30, daysPerMonth: 26 })
  assert.equal(result.ok, true)
  assert.equal(result.monthlyKm, 780)
  assert.equal(result.monthlyLiters, 31.2)
  assert.equal(result.monthlyFuelCost, 437)
  assert.equal(result.monthlyTotal, 637)
  assert.equal(result.annualTotal, 7644)
})

test('الوضع الشهري المباشر: 780 كم يعطي نفس نتيجة اليومي تمامًا', () => {
  const result = calculateOwnershipCost({ ...BASE, distanceMode: 'monthly', monthlyKm: 780 })
  assert.equal(result.ok, true)
  assert.equal(result.monthlyKm, 780)
  assert.equal(result.monthlyLiters, 31.2)
  assert.equal(result.monthlyFuelCost, 437)
  assert.equal(result.monthlyTotal, 637)
  assert.equal(result.annualTotal, 7644)
})

test('المصاريف الأخرى المختيارية تُضاف للإجمالي الشهري والسنوي', () => {
  const result = calculateOwnershipCost({ ...BASE, dailyKm: 30, daysPerMonth: 26, otherExpenses: 100 })
  assert.equal(result.ok, true)
  assert.equal(result.monthlyTotal, 737)
  assert.equal(result.annualTotal, 737 * 12)
})

test('المصاريف الأخرى فارغة = صفر — بلا تغيير من السلوك الأساسي', () => {
  const withEmpty = calculateOwnershipCost({ ...BASE, dailyKm: 30, daysPerMonth: 26, otherExpenses: '' })
  assert.equal(withEmpty.ok, true)
  assert.equal(withEmpty.monthlyTotal, 637)
})

test('المصاريف الأخرى السالبة ترفض برسالة عربية', () => {
  const result = calculateOwnershipCost({ ...BASE, dailyKm: 30, daysPerMonth: 26, otherExpenses: -5 })
  assert.equal(result.ok, false)
  assert.match(result.error, /سالبة/)
})

test('الوضع الشهري: قيمة اليومي لا تُقرأ ولا العكس — فصل كامل بين الوضعين', () => {
  // شهري مع قيم يومي معبأة: لا تتأثر النتيجة بقيم الوضع اليومي
  const result = calculateOwnershipCost({ ...BASE, distanceMode: 'monthly', monthlyKm: 390, dailyKm: 999, daysPerMonth: 30 })
  assert.equal(result.ok, true)
  assert.equal(result.monthlyKm, 390)
  // يومي مع قيمة شهرية معبأة: لا تتأثر النتيجة بها
  const daily = calculateOwnershipCost({ ...BASE, dailyKm: 15, daysPerMonth: 26, monthlyKm: 9999 })
  assert.equal(daily.ok, true)
  assert.equal(daily.monthlyKm, 390)
})

test('الوضع الشهري بصفر أو سالب يرفض برسالة عربية', () => {
  const zero = calculateOwnershipCost({ ...BASE, distanceMode: 'monthly', monthlyKm: 0 })
  assert.equal(zero.ok, false)
  const negative = calculateOwnershipCost({ ...BASE, distanceMode: 'monthly', monthlyKm: -5 })
  assert.equal(negative.ok, false)
})

test('الوضع اليومي بصفر مجموع المسافة يرفض (كل صفر مسافة مرفوض)', () => {
  const result = calculateOwnershipCost({ ...BASE, dailyKm: 0, daysPerMonth: 26 })
  assert.equal(result.ok, false)
  assert.match(result.error, /مسافة/)
})

test('الاستهلاك الناقص أو صفر يرفض (قسمة على صفر محمية)', () => {
  assert.equal(calculateOwnershipCost({ ...BASE, kmPerLiter: '', dailyKm: 30, daysPerMonth: 26 }).ok, false)
  assert.equal(calculateOwnershipCost({ ...BASE, kmPerLiter: 0, dailyKm: 30, daysPerMonth: 26 }).ok, false)
})
