/**
 * اختبارات مقارنة تكاليف التشغيل (runningCost.js).
 * القواعد: الافتراضات المشتركة (مسافة شهرية + سعر لتر) واحدة للكل؛ الاستهلاك تقدير
 * العميل؛ الناقص = «غير محسوب» ولا يُرتَّب؛ التمييز «أرخص» فقط حين كل الصفوف محسوبة؛
 * تساوي تام ⇒ لا أرخص واحد؛ الفرق بين محسوبين فقط.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateSharedAssumptions,
  calculateModelRunningCost,
  buildRunningCostComparison,
  costDifference,
} from '../src/data/runningCost.js'

test('الافتراضات المشتركة: مسافة وسعر صحيحان يمران، والصفر والسالب والناقص يرفض', () => {
  const ok = validateSharedAssumptions({ monthlyKm: 780, fuelPrice: 14 })
  assert.equal(ok.ok, true)
  for (const bad of [{ monthlyKm: '', fuelPrice: 14 }, { monthlyKm: 0, fuelPrice: 14 }, { monthlyKm: -5, fuelPrice: 14 }, { monthlyKm: 780, fuelPrice: '' }, { monthlyKm: 780, fuelPrice: 0 }, { monthlyKm: 780, fuelPrice: -1 }]) {
    assert.equal(validateSharedAssumptions(bad).ok, false, JSON.stringify(bad))
  }
})

test('حساب موديل واحد: 780 كم ÷ 30 كم/لتر × 14 = 364 شهريًا و4368 سنويًا', () => {
  const shared = validateSharedAssumptions({ monthlyKm: 780, fuelPrice: 14 })
  const result = calculateModelRunningCost('30', shared)
  assert.equal(result.ok, true)
  assert.equal(result.monthlyFuelCost, 364)
  assert.equal(result.annualFuelCost, 364 * 12)
})

test('استهلاك ناقص: «غير محسوب» — بلا رقم ولا ترتيب ولا معاملة صفر', () => {
  const shared = validateSharedAssumptions({ monthlyKm: 780, fuelPrice: 14 })
  const result = calculateModelRunningCost('', shared)
  assert.equal(result.ok, false)
  assert.equal(result.missing, true)
  assert.equal(result.monthlyFuelCost, undefined)
})

test('استهلاك صفر أو سالب يرفض (قسمة على صفر محمية)', () => {
  const shared = validateSharedAssumptions({ monthlyKm: 780, fuelPrice: 14 })
  assert.equal(calculateModelRunningCost('0', shared).ok, false)
  assert.equal(calculateModelRunningCost('-3', shared).ok, false)
})

test('موديلان مختلفا الاستهلاك: نفس الافتراضات، الأرخص يُعلَّم والفرق صحيح', () => {
  const result = buildRunningCostComparison(
    [
      { key: 'A|Big', brand: 'A', name: 'Big', kmPerLiter: '20' },   // 780/20×14 = 546
      { key: 'A|Frugal', brand: 'A', name: 'Frugal', kmPerLiter: '39' }, // 780/39×14 = 280.51 → 281
    ],
    { monthlyKm: 780, fuelPrice: 14 },
  )
  assert.equal(result.ok, true)
  assert.equal(result.rows.length, 2)
  assert.equal(result.cheapestKey, 'A|Frugal')
  const [big, frugal] = result.rows
  assert.equal(big.monthlyFuelCost, 546)
  assert.equal(frugal.monthlyFuelCost, Math.round((780 / 39) * 14))
  const diff = costDifference(big, frugal)
  assert.equal(diff.monthly, Math.abs(546 - frugal.monthlyFuelCost))
  assert.equal(diff.annual, diff.monthly * 12)
})

test('ثلاثة موديلات: الترتيب بدءًا من الإدخال والتمييز للأرخص فقط', () => {
  const result = buildRunningCostComparison(
    [
      { key: 'K1', brand: 'B', name: 'S1', kmPerLiter: '26' },
      { key: 'K2', brand: 'B', name: 'S2', kmPerLiter: '32' }, // أعلى استهلاك = أقل تكلفة
      { key: 'K3', brand: 'B', name: 'S3', kmPerLiter: '26' },
    ],
    { monthlyKm: 780, fuelPrice: 14 },
  )
  assert.equal(result.ok, true)
  // K2 وحده الأرخص (استهلاكه الأعلى) — رغم تساوي K1 وK3 في التكلفة الأعلى
  assert.equal(result.cheapestKey, 'K2')
  assert.equal(result.rows[0].monthlyFuelCost, result.rows[2].monthlyFuelCost)
  assert.ok(result.rows[1].monthlyFuelCost < result.rows[0].monthlyFuelCost)
})

test('تساوي تام في التكلفة بين كل الموديلات: لا «أرخص» منفرد يُعلَّم', () => {
  const result = buildRunningCostComparison(
    [
      { key: 'T1', brand: 'B', name: 'S1', kmPerLiter: '26' },
      { key: 'T2', brand: 'B', name: 'S2', kmPerLiter: '26' },
    ],
    { monthlyKm: 780, fuelPrice: 14 },
  )
  assert.equal(result.ok, true)
  assert.equal(result.cheapestKey, null)
})

test('موديل بلا استهلاك وسط موديلين: لا «أرخص» يُعلَّم إطلاقًا (لا ترتيب زائف)', () => {
  const result = buildRunningCostComparison(
    [
      { key: 'C1', brand: 'C', name: 'With', kmPerLiter: '26' },
      { key: 'C2', brand: 'C', name: 'Missing', kmPerLiter: '' },
      { key: 'C3', brand: 'C', name: 'Cheap', kmPerLiter: '50' },
    ],
    { monthlyKm: 780, fuelPrice: 14 },
  )
  assert.equal(result.ok, true)
  assert.equal(result.cheapestKey, null)
  const missing = result.rows.find((row) => row.key === 'C2')
  assert.equal(missing.computed, false)
  assert.equal(missing.monthlyFuelCost, null)
  assert.match(missing.error, /تقدير/)
})

test('الفرق بين صفين أحدهما غير محسوب = null (لا فرق وهمي)', () => {
  const cost = { computed: true, monthlyFuelCost: 300, annualFuelCost: 3600 }
  const missing = { computed: false, monthlyFuelCost: null, annualFuelCost: null }
  assert.equal(costDifference(cost, missing), null)
  assert.equal(costDifference(missing, missing), null)
})

test('الافتراضات المشتركة المرفوعة ترفض المقارنة كلها برسالة واضحة', () => {
  const result = buildRunningCostComparison(
    [{ key: 'X', brand: 'X', name: 'M', kmPerLiter: '20' }],
    { monthlyKm: '', fuelPrice: 14 },
  )
  assert.equal(result.ok, false)
  assert.match(result.error, /المسافة الشهرية/)
})
