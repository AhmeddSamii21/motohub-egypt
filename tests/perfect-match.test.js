/**
 * اختبارات «اكتشف موتوسيكلك المناسب» — محرك التوصية القاعدي الشفاف في recommender.js.
 * التغطية: الميزانية، الترشيح بالنوع/السعة، معالجة الناقص، الترجيح والترتيب،
 * عدم وجود نتائج، واتساق الشرح مع البيانات الفعلية.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  recommendPerfectModels,
  recommendModels, // الواجهة القديمة يجب أن تبقى كما هي
  PURPOSES,
  PERFECT_SHOW_LIMIT,
} from '../src/data/recommender.js'
import { MODEL_DETAILS } from '../src/data/generatedModelDetails.js'
import { GENERATED_BY_KEY } from '../src/data/modelDisplay.js'

const detailsByKey = new Map(MODEL_DETAILS.map((entry) => [`${entry.brand}|${entry.name}`, entry]))
const specOf = (key, label) => {
  const details = detailsByKey.get(key)
  const spec = details && details.specs.find((s) => s.label === label)
  return spec ? spec.value : null
}

test('الواجهة القديمة recommendModels تعمل كما كان (بلا انحدار)', () => {
  const result = recommendModels({ budget: 70000 })
  assert.equal(result.ok, true)
  assert.ok(result.totalCount > 0)
  assert.ok(result.matches.every((match) => match.numericPrice <= 70000))
})

test('الميزانية: مطلوبة، ومرشِّح حاسم على أسعار الكتالوج الحقيقية', () => {
  assert.equal(recommendPerfectModels({}).ok, false)
  assert.equal(recommendPerfectModels({ budget: 0 }).ok, false)
  assert.equal(recommendPerfectModels({ budget: -5 }).ok, false)
  const result = recommendPerfectModels({ budget: 60000 })
  assert.equal(result.ok, true)
  assert.ok(result.totalCount > 0)
  assert.ok(result.matches.every((match) => match.numericPrice <= 60000))
  // حصري: سعر الكتالوج = الحد الأقصى يُقبل (شامل)، وأعلى منه يُستبعد
  const atLimit = recommendPerfectModels({ budget: 10000 })
  assert.ok(atLimit.matches.some((match) => match.numericPrice === 10000))
  assert.ok(atLimit.matches.every((match) => match.numericPrice <= 10000))
})

test('الميزانية تُحصي المستبعَد: excluded.overBudget = 82 − المطابقون', () => {
  const result = recommendPerfectModels({ budget: 55000 })
  assert.equal(result.totalCount + result.excluded.overBudget, 82)
})

test('ترشيح النوع: النموذج بلا نوع منشور يُستبعد ويُحصى (لا صفر ولا تخمين)', () => {
  const result = recommendPerfectModels({ budget: 300000, type: 'سكوتر' })
  assert.ok(result.matches.every((match) => specOf(match.key, 'نوع المركبة') === 'سكوتر'))
  // الموديل بلا مواصفات (نوع null) لا يمر — ضمن missingType
  assert.equal(result.excluded.missingType, 82 - 67)
})

test('ترشيح السعة: نفس دلالة الشرائح، والناقص يُحصى لا يُعامل صفرًا', () => {
  const result = recommendPerfectModels({ budget: 300000, capacityBand: { min: 150, max: 200 } })
  for (const match of result.matches) {
    const cc = Number((specOf(match.key, 'سعة المحرك / القدرة') || '').replace(/[^\d.]/g, ''))
    assert.ok(cc > 150 && cc <= 200)
  }
  assert.ok(result.excluded.noCapacity >= 0)
})

test('الترجيح: نقاط الغرض أولًا، ثم التوفر بسجل مخزون، ثم السعر — ترتيب حتمي', () => {
  const result = recommendPerfectModels({ budget: 300000 })
  for (let i = 1; i < result.matches.length; i++) {
    const prev = result.matches[i - 1]
    const curr = result.matches[i]
    assert.ok(prev.score >= curr.score)
    if (prev.score === curr.score && prev.inStock === curr.inStock) {
      assert.ok(prev.numericPrice <= curr.numericPrice)
    }
  }
  // أول النتائج (نقاط متساوية = استخدام عام): متاح بسجل مخزون فعلي أولًا
  const resultGeneral = recommendPerfectModels({ budget: 100000, purpose: '' })
  const scores = new Set(resultGeneral.matches.map((match) => match.score))
  if (scores.size === 1) {
    assert.equal(resultGeneral.matches[0].inStock, true)
  }
  // كل نتيجة: حالة التوفر تُقرأ من المخزن المولد نفسه
  for (const match of result.matches) {
    const info = GENERATED_BY_KEY.get(match.key)
    assert.equal(match.inStock, Boolean(info && info.stockUnits > 0))
  }
})

test('الغرض «تنقل يومي»: أوتوماتيك/سكوتر فقط هم من يكسب النقاط — من المواصفات المنشورة', () => {
  const result = recommendPerfectModels({ budget: 300000, purpose: 'commute' })
  for (const match of result.matches) {
    const transmission = specOf(match.key, 'ناقل الحركة') || ''
    const type = specOf(match.key, 'نوع المركبة') || ''
    const expected =
      (transmission.includes('أوتوماتيك') || transmission.includes('اوتوماتيك') ? 3 : 0) + (type === 'سكوتر' ? 2 : 0)
    assert.equal(match.score, expected, `نقاط ${match.key}`)
  }
})

test('الغرض «رحلات طويلة»: سرعة ≥110 و/أو تبريد ماء و/أو وقود ≥8 — كلها موثَّقة', () => {
  const result = recommendPerfectModels({ budget: 300000, purpose: 'touring' })
  for (const match of result.matches) {
    const speed = Number((specOf(match.key, 'السرعة القصوى') || '').replace(/[^\d.]/g, '')) || null
    const cooling = specOf(match.key, 'نوع تبريد الحرارة') || ''
    const fuel = Number((specOf(match.key, 'سعة الوقود / الشحنة الكاملة') || '').replace(/[^\d.]/g, '')) || null
    const expected = (speed != null && speed >= 110 ? 3 : 0) + (cooling.includes('ماء') ? 2 : 0) + (fuel != null && fuel >= 8 ? 1 : 0)
    assert.equal(match.score, expected, `نقاط ${match.key}`)
  }
})

test('الغرض «استخدام عام»: بلا نقاط غرض — الترتيب بالتوفر ثم السعر', () => {
  const result = recommendPerfectModels({ budget: 100000, purpose: '' })
  assert.ok(result.matches.every((match) => match.score === 0)) // بلا غرض = بلا نقاط
  const priced = result.matches.map((match) => match.numericPrice)
  for (let i = 1; i < priced.length; i++) {
    if (result.matches[i].score === result.matches[i - 1].score && result.matches[i].inStock === result.matches[i - 1].inStock) {
      assert.ok(priced[i - 1] <= priced[i])
    }
  }
})

test('المسافة اليومية ≥30 كم: الترجيح حصرًا لموديل بسعة وقود موثقة ≥6', () => {
  const result = recommendPerfectModels({ budget: 300000, purpose: 'delivery', dailyKm: 40 })
  for (const match of result.matches) {
    const fuelText = specOf(match.key, 'سعة الوقود / الشحنة الكاملة') || ''
    const fuel = Number(fuelText.replace(/[^\d.]/g, '')) || null
    const hasRange = fuel != null && fuel >= 6
    const hasReason = match.reasons.some((reason) => reason.includes('40 كم'))
    assert.equal(hasReason, hasRange, `اتساق الشرح مع البيانات: ${match.key}`)
  }
})

test('اتساق الشرح: كل سبب مشتق من القيم الفعلية — بلا ادعاءات أداء أو استهلاك', () => {
  const result = recommendPerfectModels({ budget: 300000, purpose: 'touring', dailyKm: 50 })
  const forbidden = ['استهلاك', 'مeconom', 'كم/لتر', 'أفضل موديل', 'مضمون']
  for (const match of result.matches) {
    for (const reason of match.reasons) {
      assert.ok(!forbidden.some((word) => reason.includes(word)))
    }
    // سبب التوفر يطابق حالة المخزون الفعلية
    const availabilityReason = match.reasons.find((reason) => reason.includes('متاح') || reason.includes('آخر سعر مسجل'))
    if (match.inStock) assert.ok(availabilityReason.includes('متاح'))
    else assert.ok(availabilityReason.includes('آخر سعر مسجل'))
  }
})

test('سقف النتائج: عدد صغير مفيد (6) والمجموع يعاد كاملًا', () => {
  assert.equal(PERFECT_SHOW_LIMIT, 6)
  assert.ok(PURPOSES.length === 4)
  const result = recommendPerfectModels({ budget: 300000 })
  assert.ok(result.shownCount <= PERFECT_SHOW_LIMIT)
})

test('سيناريو عدم المطابقة: أسباب معدودة صادقة تتيح تعديل الإجابات', () => {
  const result = recommendPerfectModels({ budget: 1000, type: 'سكوتر' })
  assert.equal(result.ok, true)
  assert.equal(result.totalCount, 0)
  assert.equal(result.excluded.overBudget, 82) // كل الأسعار أعلى من 1000 ج.م
  assert.ok(result.matches.length === 0)
})
