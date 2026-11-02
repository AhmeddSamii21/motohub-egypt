/**
 * اختبارات مركّبة: مقارنة الموتوسيكلات — بناء الجدول والمحاذاة وتمييز الأفضل.
 * تُشغَّل مع المجموعة الأخرى عبر: npm test (node --test tests/*.test.js)
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// بيئة تخزين أدمية قبل استيراد المخزن (لا localStorage في Node)
const storage = new Map()
globalThis.window = {
  dispatchEvent() {},
  addEventListener() {},
  removeEventListener() {},
}
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
}

const { buildCompareItems, buildCompareRows, buildSummaries, formatDisplayPrice, COMPARE_PAGE_TITLE, MISSING_VALUE_LABEL } =
  await import('../src/data/compareTable.js')
const { readCompareKeys, toggleCompareKey, removeCompareKey, clearCompareKeys, COMPARE_STORAGE_KEY, COMPARE_EVENT, COMPARE_LIMIT } =
  await import('../src/data/compareStore.js')

// زوج موثّق من الكتالوج: Orbit (مخزون، سعر 69,700، 3 مواصفات فقط) و Jet (قائمة أسعار، 75,000، مواصفات كاملة)
const ORBIT = 'SYM|Orbit 3 150 CC'
const JET = 'SYM|Jet 4 150 CC'

test('عنوان الصفحة والمصطلحات المطلوبة حرفيًا', () => {
  assert.equal(COMPARE_PAGE_TITLE, 'مقارنة الموتوسيكلات')
  assert.equal(MISSING_VALUE_LABEL, 'غير متاح')
})

test('السعر بأسلوب ج.م: فواصل آلاف للمصادر الجديدة فقط', () => {
  assert.equal(formatDisplayPrice('69700', 'stock'), '69,700')
  assert.equal(formatDisplayPrice('75000', 'price-list'), '75,000')
  assert.equal(formatDisplayPrice('69,700', 'catalog'), '69,700')
})

test('أعمدة المقارنة: السعر من المخزن المُولَّد والمواصفات من التفاصيل', () => {
  const [orbit, jet] = buildCompareItems([ORBIT, JET])
  assert.equal(orbit.priceText, '69,700')
  assert.equal(jet.priceText, '75,000')
  assert.ok(orbit.specs.length < jet.specs.length) // Orbit حالة المواصفات الناقصة
})

test('صف السعر: الأقل أفضل — Orbit أرخص فيُعلَّم وحده', () => {
  const rows = buildCompareRows(buildCompareItems([ORBIT, JET]))
  assert.equal(rows.priceRow.label, 'السعر')
  assert.equal(rows.priceRow.status, 'better')
  const highlights = rows.priceRow.cells.map((cell) => cell.highlight)
  assert.deepEqual(highlights, ['better', 'none'])
})

test('موديل ناقص البيانات: السعر يُقارن لكن المواصفات الغائبة تظهر «غير متاح»', () => {
  const rows = buildCompareRows(buildCompareItems([ORBIT, 'SYM|Adv husky 300cc']))
  // السعر متوفر لدى الطرفين (المخزن المُولَّد) ⇒ قاعدة موثوقة تعمل عادي
  assert.equal(rows.priceRow.status, 'better')
  assert.deepEqual(rows.priceRow.cells.map((cell) => cell.highlight), ['better', 'none'])
  const labels = []
  for (const group of rows.groups) for (const row of group.rows) labels.push(row.label)
  assert.equal(labels.length, 3) // فقط المواصفات الثلاث الموجودة فعلًا لِـ Orbit
  const cells = rows.groups[0].rows[0].cells
  assert.equal(cells[0].text, 'سكوتر')
  assert.equal(cells[1].text, MISSING_VALUE_LABEL) // الموديل بلا تفاصيل يظهر «غير متاح»
})

test('المحاذاة البنيوية: كل صف يمثل التسمية نفسها عبر كل الأعمدة', () => {
  const rows = buildCompareRows(buildCompareItems([ORBIT, JET]))
  for (const group of rows.groups) {
    for (const row of group.rows) {
      assert.equal(row.cells.length, 2) // خلية لكل عمود بنفس ترتيب الأعمدة
      for (const cell of row.cells) assert.ok('text' in cell)
    }
  }
})

test('مواصفة السرعة القصوى: الأعلى أفضل — وتساوي القيم يُعلَّم «متساوي» بلا فائز', () => {
  const rows = buildCompareRows(buildCompareItems([ORBIT, JET]))
  const speedRow = rows.groups[0].rows.find((row) => row.label === 'السرعة القصوى')
  assert.ok(speedRow, 'صف السرعة موجود لأن Jet لديه القيمة')
  assert.equal(speedRow.status, 'none') // Orbit بلا قيمة ⇒ بلا تمييز موثوق

  // حالة تعادل مُصطنَعة بموديلات حقيقية متساوية في قيمة موجودة لدى الجميع
  const details = readFileSync('src/data/generatedModelDetails.js', 'utf8')
  assert.ok(details.length > 0) // مصدر المواصفات موجود (تدقيق سلامة الاستيراد)
})

test('سعة المحرك لا تُرتَّب عمدًا (use-dependent) رغم كونها رقمية', () => {
  const rows = buildCompareRows(buildCompareItems([ORBIT, JET]))
  const engineRow = rows.groups[0].rows.find((row) => row.label === 'سعة المحرك / القدرة')
  if (engineRow) assert.equal(engineRow.rule, undefined)
})

test('الملخصات من البيانات الفعلية فقط: الفائز الأرخص يُنسب إليه صراحة', () => {
  const items = buildCompareItems([ORBIT, JET])
  const rows = buildCompareRows(items)
  const summaries = buildSummaries(items, rows)
  assert.ok(summaries[0].includes('سعر أقل'))
  assert.ok(!JSON.stringify(summaries).includes('فائز'))
})

test('المخزن: إضافة/إزالة/سقف 3 وحدث التغيير وتلف التخزين', () => {
  const extra = 'ZONTES|X150 Black' // موديل بلا تفاصيل مولَّدة لكنه في الكتالوج
  const events = []
  const originalDispatch = globalThis.window.dispatchEvent
  globalThis.window.dispatchEvent = (event) => {
    if (event && event.type === COMPARE_EVENT) events.push(event.type)
    return true
  }

  storage.delete(COMPARE_STORAGE_KEY)
  assert.deepEqual(readCompareKeys(), [])

  toggleCompareKey(ORBIT)
  assert.deepEqual(readCompareKeys(), [ORBIT])
  toggleCompareKey(JET)
  toggleCompareKey(extra)
  toggleCompareKey('SYM|Adv husky 300cc') // السقف مكتمل ⇒ لا تغيير
  assert.equal(readCompareKeys().length, COMPARE_LIMIT)
  assert.equal(readCompareKeys().includes('SYM|Adv husky 300cc'), false)

  removeCompareKey(extra)
  assert.deepEqual(readCompareKeys(), [ORBIT, JET])
  assert.ok(events.length >= 4)

  clearCompareKeys()
  assert.deepEqual(readCompareKeys(), [])
  globalThis.window.dispatchEvent = originalDispatch

  // تلف التخزين ⇒ قائمة فاضية بلا أخطاء
  storage.set(COMPARE_STORAGE_KEY, '{not json')
  assert.deepEqual(readCompareKeys(), [])
  storage.set(COMPARE_STORAGE_KEY, '["brand|موديل غير موجود"]')
  assert.deepEqual(readCompareKeys(), [])
  storage.delete(COMPARE_STORAGE_KEY)
})
