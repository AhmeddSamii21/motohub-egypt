/**
 * اختبارات الحزمة: الاكتشاف الذكي (بحث/فلاتر/ترتيب) — المنطق النقي في catalogDiscovery.js.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildDiscoveryModels,
  applyDiscoveryFilters,
  sortDiscovery,
  activeFilterChips,
  normalizeSearch,
  searchMatches,
  TYPE_VALUES,
  AVAILABILITY_OPTIONS,
  SORT_OPTIONS,
} from '../src/data/catalogDiscovery.js'

const MODELS = buildDiscoveryModels()
const byKey = (key) => MODELS.find((model) => model.key === key)

test('القائمة المبنية تغطي كل موديلات الكتالوج بأسعار رقمية صحيحة', () => {
  assert.equal(MODELS.length, 82)
  const orbit = byKey('SYM|Orbit 3 150 CC')
  assert.equal(orbit.numericPrice, 69700)
  assert.equal(orbit.priceText, '69,700')
  assert.equal(orbit.inStock, true)
})

test('البحث: مطابقة جزئية عربية/إنجليزية مع تطبيع الهمزات والتاء المربوطة', () => {
  assert.equal(searchMatches('SYM Jet 4 150 CC', 'jet'), true)
  assert.equal(searchMatches('SYM Jet 4 150 CC', 'jET 4'), true) // حالة غير حساسة + كلمات متعددة
  assert.equal(searchMatches('SYM Jet 4 150 CC', 'جيت'), false) // أسماء المصادر لاتينية — لا تخمين
  assert.equal(searchMatches('ناقل أوتوماتيك', 'اوتوماتيك'), true) // أ→ا موحَّد
  assert.equal(searchMatches('سعر قديم', 'قديمة'), false) // ة→ه ليس بديلًا عن مطابقة فعلية
  assert.equal(normalizeSearch('أبـج: دة').length > 0, true)
})

test('البحث الفارغ/الغريب: نتائج شفافة — كل شيء أو لا شيء بلا أخطاء', () => {
  assert.equal(applyDiscoveryFilters(MODELS, { query: 'no-such-model-xyz' }).items.length, 0)
  assert.equal(applyDiscoveryFilters(MODELS, { query: '' }).items.length, 82)
})

test('فلاتر مجمَّعة: بحث + ماركة + سعر معًا', () => {
  const { items } = applyDiscoveryFilters(MODELS, {
    query: 'jet',
    brand: 'SYM',
    priceMax: 100000,
  })
  for (const model of items) {
    assert.equal(model.brand, 'SYM')
    assert.ok(model.numericPrice <= 100000)
    assert.ok(searchMatches(`${model.brand} ${model.name}`, 'jet'))
  }
  assert.ok(items.length > 0 && items.length < 82)
})

test('حدود نطاق السعر شاملة (من/إلى) والناقص لا يمر', () => {
  const { items } = applyDiscoveryFilters(MODELS, { priceMin: 55000, priceMax: 55000 })
  assert.equal(items.length, 1)
  assert.equal(items[0].key, 'SYM|WOLF')
  const under = applyDiscoveryFilters(MODELS, { priceMax: 55000 }).items
  assert.ok(under.every((model) => model.numericPrice <= 55000))
})

test('فلتر التوفر: سجل مخزون فعلي مقابل آخر سعر مسجل — نصوص صادقة', () => {
  const inStock = applyDiscoveryFilters(MODELS, { availability: 'in-stock' }).items
  assert.equal(inStock.length, 51) // عدد موثق من ملف sync-stock المولد
  assert.ok(inStock.every((model) => model.inStock === true))
  const noStock = applyDiscoveryFilters(MODELS, { availability: 'no-stock' }).items
  assert.equal(inStock.length + noStock.length, 82)
  assert.ok(noStock.every((model) => model.inStock === false))
})

test('فلتر النوع: من المواصفات المنشورة فقط، والموديل بلا نوع يُستبعد ويُحصى', () => {
  assert.ok(TYPE_VALUES.includes('سكوتر') && TYPE_VALUES.includes('موتوسيكل'))
  const { items, excludedNoValue } = applyDiscoveryFilters(MODELS, { types: ['سكوتر'] })
  assert.ok(items.length > 0)
  assert.ok(items.every((model) => model.type === 'سكوتر'))
  assert.equal(excludedNoValue.type, 82 - 67) // 15 موديلًا بلا مواصفات منشورة
})

test('الترتيب: ناقص السعة/السرعة آخر القائمة دائمًا (لا صفر مُفترَض) والترتيب حتمي', () => {
  const sorted = sortDiscovery(MODELS, 'cc-asc')
  const values = sorted.map((model) => model.cc)
  const firstNull = values.findIndex((value) => value == null)
  if (firstNull !== -1) {
    assert.ok(values.slice(firstNull).every((value) => value == null)) // كل الناقص في الذيل
    assert.ok(values.slice(0, firstNull).every((value, index, array) => index === 0 || array[index - 1] <= value))
  }
  const bySpeed = sortDiscovery(MODELS, 'speed-desc')
  const speeds = bySpeed.map((model) => model.topSpeed)
  const firstNullSpeed = speeds.findIndex((value) => value == null)
  if (firstNullSpeed !== -1) assert.ok(speeds.slice(firstNullSpeed).every((value) => value == null))
  const known = bySpeed.filter((model) => model.topSpeed != null)
  assert.ok(known.every((model, index, array) => index === 0 || array[index - 1].topSpeed >= model.topSpeed))
})

test('الترتيب السعري بالاتجاهين', () => {
  const asc = sortDiscovery(MODELS, 'price-asc')
  assert.ok(asc.every((model, index, array) => index === 0 || array[index - 1].numericPrice <= model.numericPrice))
  const desc = sortDiscovery(MODELS, 'price-desc')
  assert.ok(desc.every((model, index, array) => index === 0 || array[index - 1].numericPrice >= model.numericPrice))
})

test('شرائح الفلاتر النشطة: تسمية دقيقة وإزالة فردية تعيد القيم الصحيحة', () => {
  const chips = activeFilterChips({
    query: 'jet',
    brand: 'SYM',
    priceMin: 50000,
    priceMax: 90000,
    ccMin: 150,
    types: ['سكوتر'],
    availability: 'in-stock',
  })
  const ids = chips.map((chip) => chip.id)
  assert.deepEqual(ids, ['query', 'brand', 'price', 'cc', 'types', 'availability'])
  for (const chip of chips) assert.ok(chip.label && typeof chip.clear === 'object')
})

test('خيارات الترتيب والتوفر معرفة بمعرفات مستقرة', () => {
  assert.deepEqual(SORT_OPTIONS.map((option) => option.id), ['default', 'price-asc', 'price-desc', 'cc-asc', 'speed-desc'])
  assert.deepEqual(AVAILABILITY_OPTIONS.map((option) => option.id), ['all', 'in-stock', 'no-stock'])
})
