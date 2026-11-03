/**
 * اختبارات مخطط الميزانية (budgetPlanner.js).
 * القواعد: السعر من قائمة الاكتشاف فقط؛ الناقص لا يُعامل صفرًا؛ المطابقة = السعر ≤
 * الميزانية؛ «القريب» = فوق الميزانية ضمن نافذة (ادخار شهري أو 15% افتراضيًا)؛
 * بلا مطابق إطلاقًا ⇒ أقرب الخيارات الأرخص؛ الترتيب حتمي.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildBudgetPlan, closestOptions } from '../src/data/budgetPlanner.js'

// موديلات اختبارية تحاكي مخرجات buildDiscoveryModels (numericPrice قد يكون null للموديلات بلا سعر)
const MODELS = [
  { key: 'A|Cheap', brand: 'A', name: 'Cheap', numericPrice: 50000, type: 'سكوتر' },
  { key: 'A|Mid', brand: 'A', name: 'Mid', numericPrice: 78000, type: 'سكوتر' },
  { key: 'B|Fit', brand: 'B', name: 'Fit', numericPrice: 80000, type: 'موتوسيكل' },
  { key: 'B|High', brand: 'B', name: 'High', numericPrice: 120000, type: 'موتوسيكل' },
  { key: 'C|NoPrice', brand: 'C', name: 'NoPrice', numericPrice: null, type: 'سكوتر' },
]

test('مطابقة تامة: 80000 تشمل موديلاً بسعر 80000 بالضبط والمتبقي صفر', () => {
  const result = buildBudgetPlan(MODELS, { budget: 80000 })
  assert.equal(result.ok, true)
  const keys = result.affordable.map((item) => item.key)
  assert.deepEqual(keys, ['A|Cheap', 'A|Mid', 'B|Fit'])
  const fit = result.affordable.find((item) => item.key === 'B|Fit')
  assert.equal(fit.remainingBudget, 0)
})

test('ميزانية تحت كل الأسعار: لا مطابقين والقريب فارغ (الفارق > 15%) وأقرب الخيارات الأرخص', () => {
  const result = buildBudgetPlan(MODELS, { budget: 10000 })
  assert.equal(result.ok, true)
  assert.equal(result.affordable.length, 0)
  // الفارق للأرخص 40000 أكبر من 15% من 10000 ⇒ لا «قريب»
  assert.equal(result.closeOptions.length, 0)
  const closest = closestOptions(MODELS, 2)
  assert.deepEqual(closest.map((item) => item.key), ['A|Cheap', 'A|Mid'])
})

test('ميزانية فوق كل الأسعار: كل الموديلات المُسعَّرة مطابقة', () => {
  const result = buildBudgetPlan(MODELS, { budget: 200000 })
  assert.equal(result.ok, true)
  assert.equal(result.affordable.length, 4)
})

test('الموديل بلا سعر لا يُعامل صفرًا: يُستبعد ويُحصى بشفافية', () => {
  const result = buildBudgetPlan(MODELS, { budget: 200000 })
  assert.equal(result.ok, true)
  assert.equal(result.missingPriceCount, 1)
  assert.equal(result.affordable.some((item) => item.key === 'C|NoPrice'), false)
  // ولو كانت الميزانية صفرًا (لو عُومل الناقص صفرًا لظهر!) — يرفض الميزانية 0 قبل أي شيء
  const zero = buildBudgetPlan(MODELS, { budget: 0 })
  assert.equal(zero.ok, false)
})

test('القريب مع ادخار شهري: الفارق ÷ الادخار = عدد أشهر تقريبي', () => {
  // 78000 فوق 70000 بـ 8000، والادخار 2000 ⇒ 4 أشهر، ونافذة 36 شهرًا تشمل (8000 ≤ 72000)
  const result = buildBudgetPlan(MODELS, { budget: 70000, monthlySaving: 2000 })
  assert.equal(result.ok, true)
  const close = result.closeOptions.find((item) => item.key === 'A|Mid')
  assert.ok(close, 'Mid يقرب')
  assert.equal(close.overBudget, 8000)
  assert.equal(close.estimatedMonths, 4)
  // الأغلى (فارق 50000 = 25 شهرًا ≤ 36) يقرب أيضًا
  assert.ok(result.closeOptions.some((item) => item.key === 'B|High'))
  assert.equal(result.affordable.some((item) => item.key === 'A|Cheap'), true)
})

test('بلا ادخار: نافذة 15% فوق الميزانية تحدد «القريب»', () => {
  const result = buildBudgetPlan(MODELS, { budget: 75000 })
  assert.equal(result.ok, true)
  // نافذة = 11250 ⇒ Mid (فارق 3000) وFit (فارق 5000) قريبان، High (فارق 45000) بعيد
  assert.deepEqual(result.closeOptions.map((item) => item.key), ['A|Mid', 'B|Fit'])
})

test('فلتر الماركة والنوع يُطبَّق قبل المطابقة والاستبعاد يُحصى', () => {
  const byBrand = buildBudgetPlan(MODELS, { budget: 200000, brand: 'B' })
  assert.equal(byBrand.ok, true)
  assert.deepEqual(byBrand.affordable.map((item) => item.key), ['B|Fit', 'B|High'])
  assert.equal(byBrand.filteredOutCount, 3)

  const byType = buildBudgetPlan(MODELS, { budget: 200000, types: ['موتوسيكل'] })
  assert.equal(byType.ok, true)
  assert.deepEqual(byType.affordable.map((item) => item.key), ['B|Fit', 'B|High'])
  assert.equal(byType.filteredOutCount, 3)
})

test('الترتيب حتمي داخل المطابقة: الأرخص أولًا ثم بالاسم', () => {
  const result = buildBudgetPlan(MODELS, { budget: 200000 })
  assert.deepEqual(result.affordable.map((item) => item.numericPrice), [50000, 78000, 80000, 120000])
})

test('الميزانية الناقصة أو سالبة أو صفر ترفض برسالة عربية', () => {
  assert.equal(buildBudgetPlan(MODELS, { budget: '' }).ok, false)
  assert.equal(buildBudgetPlan(MODELS, { budget: -5 }).ok, false)
  assert.equal(buildBudgetPlan(MODELS, { budget: 0 }).ok, false)
})

test('الادخار السالب يرفض، والقيم الفارغة للادخار = لا ادخار', () => {
  assert.equal(buildBudgetPlan(MODELS, { budget: 50000, monthlySaving: -1 }).ok, false)
  const empty = buildBudgetPlan(MODELS, { budget: 50000, monthlySaving: '' })
  assert.equal(empty.ok, true)
  assert.equal(empty.monthlySaving, 0)
})

test('closestOptions: موديلات بلا سعر تُستبعد من الأقرب ولا تُفترض أسعارها', () => {
  const closest = closestOptions([MODELS[4], MODELS[0], MODELS[1]], 3)
  assert.deepEqual(closest.map((item) => item.key), ['A|Cheap', 'A|Mid'])
})

test('closestOptions على قائمة فارغة أو مالئة بلا أسعار: نتيجة فارغة صادقة', () => {
  assert.equal(closestOptions([], 3).length, 0)
  assert.equal(closestOptions([MODELS[4]], 3).length, 0)
})
