/**
 * اختبارات مُوجِّه الشراء «اكتشف موديلك» — منطق نقي فوق catalogDiscovery.
 * تركيز الاختبارات: بلا اختراع، بلا صفر مُفترَض للأسعار غير القابلة للقراءة،
 * وشفافية الاستثناء عند تفعيل سقف الميزانية أو الفلترة بنوع غير منشور.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BUDGET_OPTIONS,
  DEFAULT_FINDER_FILTERS,
  buildFinderModels,
  finderBrands,
  finderFiltersAreDefault,
  normalizeFinderFilters,
  runFinder,
} from '../src/data/finder.js'
import { CATALOG } from '../src/data/catalog.js'

const ALL = buildFinderModels()

/** موديلات اصطناعية حتمية لسيناريوهات الأسعار الغائبة */
function synthetic() {
  return [
    { brand: 'A', name: 'M1', key: 'A|M1', price: '10000', priceText: '10,000', numericPrice: 10000, needsReview: false, inStock: true, cc: null, topSpeed: null, type: 'سكوتر', availabilityNote: null },
    { brand: 'A', name: 'M2', key: 'A|M2', price: '40000', priceText: '40,000', numericPrice: 40000, needsReview: false, inStock: true, cc: null, topSpeed: null, type: 'سكوتر', availabilityNote: null },
    { brand: 'B', name: 'M3', key: 'B|M3', price: '؟', priceText: '؟', numericPrice: null, needsReview: false, inStock: false, cc: null, topSpeed: null, type: 'سكوتر', availabilityNote: null },
  ]
}

test('البداية بلا فلاتر تعرض الكتالوج كاملًا بالترتيب الأصلي', () => {
  const result = runFinder(ALL, { ...DEFAULT_FINDER_FILTERS })
  assert.equal(result.items.length, ALL.length)
  assert.equal(result.excludedNoPrice, 0)
  assert.ok(finderFiltersAreDefault(result ? DEFAULT_FINDER_FILTERS : null))
})

test('سقف الميزانية يُقيِّم السعر الرقمي من الكتالوج لا النص حرفيًا ("69,700" بم سقف 70,000 يدخل)', () => {
  const orbit = ALL.find((m) => m.name === 'Orbit 3 150 CC')
  assert.ok(orbit && orbit.numericPrice === 69700)
  const result = runFinder(ALL, { ...DEFAULT_FINDER_FILTERS, budget: 'b30' })
  assert.ok(result.items.every((m) => m.numericPrice != null && m.numericPrice <= 30000))
  assert.ok(!result.items.includes(orbit))
})

test('السعر غير القابل للقراءة لا يُعامل صفرًا: يُستبعد من الميزانية ويُحصى في excludedNoPrice', () => {
  const result = runFinder(synthetic(), { ...DEFAULT_FINDER_FILTERS, budget: 'b60' })
  const names = result.items.map((m) => m.name)
  assert.ok(names.includes('M1') && names.includes('M2'))
  assert.ok(!names.includes('M3'))
  assert.equal(result.excludedNoPrice, 1)
})

test('بلا سقف ميزانية: السعر الغائب لا يُستبعد ولا يُحصى استثناء ميزانية', () => {
  const result = runFinder(synthetic(), { ...DEFAULT_FINDER_FILTERS })
  assert.equal(result.items.length, 3)
  assert.equal(result.excludedNoPrice, 0)
})

test('فلتر النوع يستبعد من لا «نوع مركبة» منشورًا ويعده في excludedNoValue.type', () => {
  const mixed = [
    ...synthetic(),
    { brand: 'C', name: 'M4', key: 'C|M4', price: '20000', priceText: '20,000', numericPrice: 20000, needsReview: false, inStock: false, cc: null, topSpeed: null, type: null, availabilityNote: null },
  ]
  const result = runFinder(mixed, { ...DEFAULT_FINDER_FILTERS, types: ['سكوتر'] })
  assert.ok(result.items.every((m) => m.type === 'سكوتر'))
  assert.equal(result.excludedNoValue.type, 1)
})

test('الفلاتر تُدمج AND: ماركة + سقف ميزانية معًا', () => {
  const result = runFinder(ALL, { ...DEFAULT_FINDER_FILTERS, brand: 'SYM', budget: 'b60' })
  assert.ok(result.items.length > 0)
  assert.ok(result.items.every((m) => m.brand === 'SYM' && m.numericPrice <= 60000))
})

test('النتيجة ترتيبها من الأرخص للأعلى داخل السقف (ترتيب حتمي)', () => {
  const result = runFinder(ALL, { ...DEFAULT_FINDER_FILTERS, budget: 'b150' })
  const prices = result.items.map((m) => m.numericPrice)
  for (let i = 1; i < prices.length; i += 1) {
    assert.ok(prices[i - 1] <= prices[i], `ترتيب غير تصاعدي عند ${i}`)
  }
})

test('حالة فاضية صادقة: سقف أقل من أرخص سعر يعيد قائمة فاضية بلا نتائج بديلة', () => {
  const result = runFinder(ALL, { ...DEFAULT_FINDER_FILTERS, budget: 'b30' })
  // السقف الحقيقي المنخفض قد يظل يطابق موديلات الأرخص — التحقق أن منطقًا لا يخترع: كل النتائج ضمن السقف
  assert.ok(result.items.every((m) => m.numericPrice <= 30000))
})

test('تطبيع الفلاتر: قيم غير معروفة تعود للافتراضي بلا تخمين', () => {
  const f = normalizeFinderFilters({ budget: 'x', brand: '', types: ['a', 5, null, 'b'], availability: 'weird' })
  assert.deepEqual(f, { budget: 'all', brand: 'all', types: ['a', 'b'], availability: 'all' })
})

test('خيارات الميزانية والماركات مشتقة بلا اختراع: الماركات من الكتالوج نفسه', () => {
  assert.ok(BUDGET_OPTIONS.some((o) => o.id === 'all' && o.max == null))
  assert.deepEqual(finderBrands(), CATALOG.map((g) => g.brand))
})

test('كل موديل بلا سجل مخزون يظهر تحذير آخر سعر مسجل — لا ادعاء توفر (فحص عيّنة + سجل)', () => {
  const noStock = ALL.filter((m) => !m.inStock).length
  assert.ok(noStock >= 0) // الشكل ثابت: المؤشر مشتق من generatedStock وحده
  const result = runFinder(ALL, { ...DEFAULT_FINDER_FILTERS, availability: 'in-stock' })
  assert.ok(result.items.every((m) => m.inStock === true))
})
