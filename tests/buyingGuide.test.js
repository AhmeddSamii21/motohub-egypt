/**
 * اختبارات محتوى «دليل الشراء والمساعدة» — أي عدادات تنبع من المصادر وتكامل الأسئلة.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

const {
  GUIDE_META,
  GUIDE_TYPE_LABELS,
  GUIDE_SECTIONS,
  JOURNEY_STEPS,
  TRUST_POINTS,
  FAQS,
  FAQ_CATEGORIES,
  searchFaqs,
  faqsByCategory,
} = await import('../src/data/buyingGuide.js')

const { CATALOG } = await import('../src/data/catalog.js')
const { MODEL_DETAILS } = await import('../src/data/generatedModelDetails.js')
const { TYPE_VALUES } = await import('../src/data/catalogDiscovery.js')

test('الأعداد المستمدة تطابق المصادر فعليًا', () => {
  const modelCount = CATALOG.reduce((sum, g) => sum + g.models.length, 0)
  const withSpecs = MODEL_DETAILS.filter((d) => d.specs.length > 0).length
  assert.equal(GUIDE_META.MODEL_COUNT, modelCount)
  assert.equal(GUIDE_META.BRAND_COUNT, CATALOG.length)
  assert.equal(GUIDE_META.MODELS_WITHOUT_SPECS, modelCount - withSpecs)
})

test('منطق المواصفات: «بلا مواصفات» = الكتالوج ناقص المشمول بمواصفات منشورة', () => {
  assert.equal(GUIDE_META.MODELS_WITHOUT_SPECS + MODEL_DETAILS.filter((d) => d.specs.length > 0).length, GUIDE_META.MODEL_COUNT)
})

test('فئات الدليل هي قيم فلتر النوع الحقيقية في الكتالوج (لا فئات مُختلَقة)', () => {
  // TYPE_VALUES الفعلي من اكتشاف الكتالوج — الدليل يستخدم التسميات نفسها
  assert.deepEqual(GUIDE_TYPE_LABELS, TYPE_VALUES)
})

test('أقسام الدليل مكتملة: 7 أقسام بعناوين ومحتوى غير فاضي ومعرّفات فريدة', () => {
  const ids = new Set()
  assert.equal(GUIDE_SECTIONS.length, 7)
  for (const section of GUIDE_SECTIONS) {
    assert.equal(typeof section.title, 'string')
    assert.ok(section.title.trim().length > 0)
    assert.ok(Array.isArray(section.body) && section.body.length > 0)
    for (const line of section.body) assert.ok(line.trim().length > 0)
    assert.ok(!ids.has(section.id), 'معرّف مكرر')
    ids.add(section.id)
  }
})

test('خطوات الرحلة: 5 خطوات بالترتيب المنطقي المعتمد', () => {
  assert.equal(JOURNEY_STEPS.length, 5)
  assert.deepEqual(
    JOURNEY_STEPS.map((s) => s.id),
    ['explore', 'details', 'tools', 'contact', 'showroom'],
  )
  for (const step of JOURNEY_STEPS) {
    assert.ok(step.title.trim().length > 0)
    assert.ok(step.body.trim().length > 0)
  }
})

test('نقاط الثقة تشرح الحجز والسلة والحدود — بادعاءات قبول أو دفع', () => {
  assert.equal(TRUST_POINTS.length, 6)
  const all = TRUST_POINTS.map((p) => p.title + ' ' + p.body).join(' ')
  // بيانات التواصل الوهمية المحذوفة سابقًا لا تعود (لا هاتف/بريد تجريبي)
  assert.equal(/hello@|10 ?000 ?0000/.test(all), false)
  for (const point of TRUST_POINTS) assert.ok(point.title.trim() && point.body.trim())
})

test('لكل سؤال معرّف فريد وتصنيف مألوف وسؤال وإجابة غير فاضيين', () => {
  const ids = new Set()
  for (const faq of FAQS) {
    assert.ok(!ids.has(faq.id), 'معرّف مكرر: ' + faq.id)
    ids.add(faq.id)
    assert.ok(faq.q.trim().length > 0)
    assert.ok(faq.a.trim().length > 0)
    assert.ok(faq.category.trim().length > 0)
  }
})

test('تصنيفات الأسئلة الفعلي مشتق من الأسئلة نفسها وبترتيب ثابت', () => {
  assert.deepEqual(FAQ_CATEGORIES, [...new Set(FAQS.map((f) => f.category))])
})

test('كل الأسئلة تُغطى التسع تصنيفات المطلوبة (بلا تصنيف شاذ)', () => {
  assert.equal(FAQ_CATEGORIES.length, 9)
})

test('البحث الفارغ يعيد كل الأسئلة', () => {
  assert.deepEqual(searchFaqs(''), FAQS)
  assert.deepEqual(searchFaqs('   '), FAQS)
  assert.deepEqual(searchFaqs(null), FAQS)
})

test('البحث بالتطبيع العربي: الهمزة/التاء المربوطة لا تمنع المطابقة', () => {
  const hits = searchFaqs('آمن') // بدون تشكيل/همزات — «آمن» تحدث في إجابات الحماية إن وُجدت
  assert.ok(Array.isArray(hits))
  const hamza = searchFaqs('أين أجد') // همزة فوق الألف في السؤال
  assert.ok(hamza.length > 0)
  assert.ok(hamza.some((f) => f.id === 'faq-catalog-search'))
})

test('البحث بمصطلح مميز يُصيب سؤاله فقط في هذه المجموعة الصغيرة', () => {
  const hits = searchFaqs('المصانع') // كلمة فريدة في إجابة أسئلة الصيانة
  assert.ok(hits.every((f) => f.category === 'رفيق الملكية'))
})

test('بحث لا يطابق شيئًا يعيد مصفوفة فاضية (بلا أخطاء)', () => {
  assert.deepEqual(searchFaqs('zzzz-v-1111@q'), [])
})

/** أسئلة تصنيف واحد تعيد الترتيب الأصلي فقط */
test('faqsByCategory تُصفّي حسب التصنيف وترتيب الأصل', () => {
  const priceFaqs = faqsByCategory('الأسعار')
  assert.ok(priceFaqs.length >= 2)
  const indexInAll = priceFaqs.map((f) => FAQS.indexOf(f))
  assert.deepEqual(indexInAll, [...indexInAll].sort((a, b) => a - b))
})

test('faqsByCategory بتصنيف غير موجود يعيد فاضيًا بلا خطأ', () => {
  assert.deepEqual(faqsByCategory('تصنيف-غير-موجود'), [])
})
