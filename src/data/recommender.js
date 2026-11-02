/**
 * «ساعدني أختار موتوسيكل» — منطق الترشيح والترتيب، صرف وقابل للاختبار في Node:
 * - مصدران مُتحقَّق منهما فقط: كتالوج الأسعار المجمد (CATALOG — 82 موديل/19 ماركة)
 *   والمواصفات المنشورة المولّدة (MODEL_DETAILS — 67/82 موديلًا لها مواصفات).
 * - المرشّحات: الميزانية (سعر الكتالوج الرقمي) + ماركة اختيارية + شريحة سعة محرك اختيارية
 *   تُطبَّق على سعات المحرك المنشورة القابلة للقراءة فقط — لا استنتاج من الاسم، ولا افتراضات
 *   استخدام/استهلاك وقود/خطط تقسيط (لا توجد بيانات موثوقة لها).
 * - قاعدة شريحة السعة (فواصل غير متداخلة): تمر إذا (min == null || cc > min) && (max == null || cc <= max)
 *   أي: ≤150 / 150<cc≤200 / cc>200. الموديل بلا سعة منشورة قابلة للقراءة يُستبعد عند تفعيل
 *   المرشّح ويُحتسب في excludedNoCapacity (يُعرَض عدده بصدد في الواجهة).
 * - الترتيب حتمي: السعر تصاعديًا ثم الماركة ثم الاسم (مقارنة نقاط ترميز — بلا Intl).
 * - الدوال لا ترمي استثناءً أبدًا: مُدخل غريب ⇒ خطأ تحقق برسالة عربية أو نتيجة فارغة.
 */
import { CATALOG } from './catalog.js'
import { GENERATED_BY_KEY, formatDisplayPrice } from './modelDisplay.js'
import { modelHref } from './modelSlug.js'
import { MODEL_DETAILS } from './generatedModelDetails.js'

/** سقف النتائج المعروضة (المجموع الكامل يُعاد في totalCount) */
export const SHOW_LIMIT = 12

const FIRST_NUMBER_RE = /(\d+(?:\.\d+)?)/

/** سعر الكتالوج الرقمي: "69,700" و"229000" تصلح — أي شيء آخر ⇒ null */
export function parseCatalogPrice(value) {
  if (value == null) return null
  const cleaned = String(value).replace(/,/g, '').trim()
  if (!/^\d+(?:\.\d+)?$/.test(cleaned)) return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

/** أول رقم في قيمة مواصفة — "150 cc" و"150cc" ⇒ 150؛ بلا رقم ⇒ null */
export function parseCapacityCc(value) {
  if (typeof value !== 'string') return null
  const match = value.match(FIRST_NUMBER_RE)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/** سعة المحرك من المواصفات المنشورة فقط (تسمية "سعة المحرك") — من الاسم لا يُستنتج شيء */
const capacityByModelKey = (() => {
  const map = new Map()
  for (const entry of MODEL_DETAILS) {
    if (!entry || typeof entry !== 'object' || !Array.isArray(entry.specs)) continue
    const spec = entry.specs.find((s) => s && typeof s.label === 'string' && s.label.includes('سعة المحرك'))
    const cc = spec ? parseCapacityCc(spec.value) : null
    if (cc != null) map.set(`${entry.brand}|${entry.name}`, cc)
  }
  return map
})()

/** سعة المحرك المنشورة لموديل — null = غير منشورة/غير قابلة للقراءة */
export function getModelCapacityCc(brand, name) {
  if (typeof brand !== 'string' || typeof name !== 'string') return null
  return capacityByModelKey.get(`${brand}|${name}`) ?? null
}

/** أسماء الماركات الـ19 كما في الكتالوج المجمد */
export const BRAND_NAMES = CATALOG.map((group) => group.brand)

/**
 * يرشّح ويرتّب مطابقات الكتالوج — يعيد { ok:false, error } أو
 * { ok:true, totalCount, shownCount, excludedNoCapacity, matches }.
 * @param {{budget?: number|string, brands?: string[], capacityBand?: {min: number|null, max: number|null}|null}} input
 */
export function recommendModels(input) {
  const values = input ?? {}
  const budget = parseCatalogPrice(values.budget)
  if (budget == null || budget <= 0) return { ok: false, error: 'أدخل ميزانيتك بالجنيه (رقم أكبر من صفر)' }

  const brandFilter = Array.isArray(values.brands)
    ? values.brands.filter((b) => typeof b === 'string' && b !== '')
    : []
  const band = values.capacityBand && typeof values.capacityBand === 'object' ? values.capacityBand : null
  const bandMin = band && Number.isFinite(band.min) ? band.min : null
  const bandMax = band && Number.isFinite(band.max) ? band.max : null
  const bandActive = bandMin != null || bandMax != null

  const matches = []
  let excludedNoCapacity = 0
  for (const group of CATALOG) {
    if (!group || !Array.isArray(group.models)) continue
    for (const model of group.models) {
      if (!model || typeof model.name !== 'string') continue
      const numericPrice = parseCatalogPrice(model.price)
      if (numericPrice == null || numericPrice > budget) continue
      if (brandFilter.length && !brandFilter.includes(group.brand)) continue
      if (bandActive) {
        const cc = getModelCapacityCc(group.brand, model.name)
        const bandPass =
          (bandMax == null || (cc != null && cc <= bandMax)) && (bandMin == null || (cc != null && cc > bandMin))
        if (!bandPass) {
          if (cc == null) excludedNoCapacity += 1
          continue
        }
      }
      const info = GENERATED_BY_KEY.get(`${group.brand}|${model.name}`)
      matches.push({
        brand: group.brand,
        name: model.name,
        numericPrice,
        // نفس منطق عرض الكتالوج: سعر المصدر المولَّد بصيغة ج.م، وإلا سعر الكتالوج كما هو
        displayPrice: formatDisplayPrice(info ? info.price : model.price, info && info.source),
        needsReview: Boolean(info && info.needsReview),
        // الملف المولَّد يضع الملاحظة الصحيحة لكل موديل («متاح» بسجل Stock بوحدات، أو «آخر سعر مسجل»)
        availabilityNote: info ? info.availabilityNote || info.lastPriceNote || null : null,
        href: modelHref(group.brand, model.name),
      })
    }
  }

  matches.sort(
    (a, b) =>
      a.numericPrice - b.numericPrice ||
      (a.brand < b.brand ? -1 : a.brand > b.brand ? 1 : 0) ||
      (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  )

  return {
    ok: true,
    totalCount: matches.length,
    shownCount: Math.min(matches.length, SHOW_LIMIT),
    excludedNoCapacity: bandActive ? excludedNoCapacity : 0,
    matches: matches.slice(0, SHOW_LIMIT),
  }
}

/* ================= «اكتشف موتوسيكلك المناسب» — محرك التوصية القاعدي =================
 * محرك قواعد شفاف حتمي على المواصفات المنشورة فقط — بلا أي API خارجي أو ادعاءات:
 * - المرشّح الحاسم الوحيد: السعر ≤ الميزانية (سعر الكتالوج الرقمي الحقيقي).
 * - النوع وسعة المحرك: مرشّحان فقط عندما يختارهما العميل؛ النموذج بلا نوع/سعة منشورة
 *   يُستبعد ويُحصى في excluded (لا يُعامل صفرًا ولا يُخمَّن من الاسم).
 * - الغرض والاستخدام اليومي: نقاط ترجيح من مواصفات موثَّقة تبرّرها فعلًا فقط:
 *     · التنقل اليومي: ناقل أوتوماتيك (وثَّق) + نوع سكوتر (وثَّق) — سهولة الاستخدام اليومي.
 *     · شغل/توصيل: سعة وقود ≥ 6 لتر (مدى) + نوع سكوتر — المعتاد في هذا الغرض.
 *     · رحلات طويلة: سرعة قصوى ≥ 110 (وثَّق) + تبريد ماء (وثَّق) + سعة وقود ≥ 8.
 *     · استخدام عام: بلا نقاط غرض — الترتيب حسب السعر ثم التوفر.
 *   ما يغيب من مواصفة لا يكسب نقاطًا ولا يُعاقَب — بلا افتراضات.
 * - الترجيح الحتمي: النقاط تنازليًا، ثم التوفر بسجل مخزون فعلي أولًا (بيانات حقيقية من
 *   generatedStock)، ثم السعر تصاعديًا، ثم الماركة ثم الاسم (بلا Intl).
 * - الشرح لكل نتيجة يُبنى حرفيًا من القيم الفعلية التي كسبت النقاط — اتساق مضمون بالبنية.
 */

/** قيم الغرض المسموحة — كل قيمة تُشرح للمستخدم في الواجهة */
export const PURPOSES = [
  { id: '', label: 'استخدام عام / شخصي' },
  { id: 'commute', label: 'تنقل يومي' },
  { id: 'delivery', label: 'شغل / توصيل' },
  { id: 'touring', label: 'رحلات طويلة' },
]

/** سقف نتائج التوصية المعروضة — عدد صغير مفيد حسب المطلوب */
export const PERFECT_SHOW_LIMIT = 6

const DETAILS_INDEX = new Map(MODEL_DETAILS.map((entry) => [`${entry.brand}|${entry.name}`, entry]))

function specOf(key, label) {
  const details = DETAILS_INDEX.get(key)
  if (!details || !Array.isArray(details.specs)) return null
  const spec = details.specs.find((s) => s && s.label === label)
  const value = spec && typeof spec.value === 'string' ? spec.value.trim() : ''
  return value || null
}

/** أول رقم > 0 من نص مواصفة أو null — بلا صفر مُفترَض */
function firstNumber(text) {
  if (typeof text !== 'string') return null
  const match = text.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : null
}

/** نقاط الغرض + شرح فعلي لكل قاعدة مُطبَّقة — الشرح مشتق من القيمة نفسها */
function purposeScore(purpose, specs) {
  let score = 0
  const reasons = []
  const transmission = specOf(specs, 'ناقل الحركة')
  // تطبيع عربي أساسي فقط (همزة/تاء مربوطة) — 'أوتوماتيك' و'اوتوماتيك' كلاهما مطابَق
  const isAutomatic =
    typeof transmission === 'string' &&
    transmission.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').includes('اوتوماتيك')
  const type = specOf(specs, 'نوع المركبة')
  const fuel = firstNumber(specOf(specs, 'سعة الوقود / الشحنة الكاملة'))
  const speed = firstNumber(specOf(specs, 'السرعة القصوى'))
  const cooling = specOf(specs, 'نوع تبريد الحرارة')

  if (purpose === 'commute') {
    if (isAutomatic) {
      score += 3
      reasons.push('ناقل حركة أوتوماتيك — قيادة يومية بأسهل')
    }
    if (type === 'سكوتر') {
      score += 2
      reasons.push('من نوع سكوتر — عملي للتنقل اليومي')
    }
  } else if (purpose === 'delivery') {
    if (fuel != null && fuel >= 6) {
      score += 3
      reasons.push(`سعة وقود ${fuel} لتر — مدى أطول بين تعبئة`)
    }
    if (type === 'سكوتر') {
      score += 2
      reasons.push('من نوع سكوتر — عملي لشغل التوصيل')
    }
  } else if (purpose === 'touring') {
    if (speed != null && speed >= 110) {
      score += 3
      reasons.push(`سرعة قصوى ${speed} كم/س — كافية للرحلات الطويلة`)
    }
    if (typeof cooling === 'string' && cooling.includes('ماء')) {
      score += 2
      reasons.push('تبريد ماء — أفضل للاستخدام المتواصل')
    }
    if (fuel != null && fuel >= 8) {
      score += 1
      reasons.push(`سعة وقود ${fuel} لتر — تعبئات أقل`)
    }
  }
  return { score, reasons }
}

/**
 * توصية «اكتشف موتوسيكلك المناسب» — حتمية وقابلة للاختبار، بلا API خارجي.
 * @param {{budget?: number|string, purpose?: string, type?: string,
 *          capacityBand?: {min: number|null, max: number|null}|null, dailyKm?: number|string}} input
 * @returns {ok:false, error} أو
 * { ok:true, totalCount, shownCount, excluded:{overBudget,noCapacity,typeMismatch,missingType},
 *   matches:[{brand,name,displayPrice,numericPrice,needsReview,availabilityNote,href,inStock,
 *             score,reasons[],keySpecs[{label,value}]}] }
 */
export function recommendPerfectModels(input) {
  const values = input ?? {}
  const budget = parseCatalogPrice(values.budget)
  if (budget == null || budget <= 0) return { ok: false, error: 'أدخل ميزانيتك بالجنيه (رقم أكبر من صفر)' }
  const purpose = PURPOSES.some((p) => p.id === values.purpose) ? values.purpose : ''
  const chosenType = typeof values.type === 'string' && values.type ? values.type : null
  const dailyKm = Number(values.dailyKm)
  const dailyKmActive = Number.isFinite(dailyKm) && dailyKm > 0
  const band = values.capacityBand && typeof values.capacityBand === 'object' ? values.capacityBand : null
  const bandMin = band && Number.isFinite(band.min) ? band.min : null
  const bandMax = band && Number.isFinite(band.max) ? band.max : null
  const bandActive = bandMin != null || bandMax != null

  const excluded = { overBudget: 0, noCapacity: 0, typeMismatch: 0, missingType: 0 }
  const candidates = []
  for (const group of CATALOG) {
    if (!group || !Array.isArray(group.models)) continue
    for (const model of group.models) {
      if (!model || typeof model.name !== 'string') continue
      const key = `${group.brand}|${model.name}`
      const numericPrice = parseCatalogPrice(model.price)
      if (numericPrice == null || numericPrice > budget) {
        excluded.overBudget += 1
        continue
      }
      if (bandActive) {
        const cc = getModelCapacityCc(group.brand, model.name)
        const bandPass =
          (bandMax == null || (cc != null && cc <= bandMax)) && (bandMin == null || (cc != null && cc > bandMin))
        if (!bandPass) {
          if (cc == null) excluded.noCapacity += 1
          continue
        }
      }
      const modelType = specOf(key, 'نوع المركبة')
      if (chosenType) {
        if (!modelType) {
          excluded.missingType += 1
          continue
        }
        if (modelType !== chosenType) {
          excluded.typeMismatch += 1
          continue
        }
      }
      candidates.push({
        key,
        brand: group.brand,
        name: model.name,
        numericPrice,
        modelType,
        specs: key,
      })
    }
  }

  const matches = candidates.map((candidate) => {
    const info = GENERATED_BY_KEY.get(candidate.key)
    const { score, reasons } = purposeScore(purpose, candidate.specs)
    const inStock = Boolean(info && info.stockUnits > 0)
    const reasons2 = []
    // أساس التوصية: ضمن الميزانية + التوفر الفعلي من سجل المخزون — كلها بيانات حقيقية
    reasons2.push(`ضمن ميزانيتك — ${formatDisplayPrice(info ? info.price : candidate.numericPrice, info && info.source)} ج.م`)
    reasons2.push(inStock ? 'متاح حاليًا حسب آخر سجل مخزون' : 'آخر سعر مسجل — التوفر يُأكَّد مع المعرض')
    if (dailyKmActive && dailyKm >= 30) {
      const fuel = firstNumber(specOf(candidate.specs, 'سعة الوقود / الشحنة الكاملة'))
      if (fuel != null && fuel >= 6) reasons2.push(`يوميًا ${dailyKm} كم: سعة وقود ${fuel} لتر تناسب المسافات`)
    }
    reasons2.push(...reasons)
    const keySpecs = []
    for (const label of ['نوع المركبة', 'سعة المحرك / القدرة', 'ناقل الحركة', 'السرعة القصوى', 'سعة الوقود / الشحنة الكاملة']) {
      const value = specOf(candidate.specs, label)
      if (value) keySpecs.push({ label, value })
    }
    return {
      key: candidate.key,
      brand: candidate.brand,
      name: candidate.name,
      displayPrice: formatDisplayPrice(info ? info.price : candidate.numericPrice, info && info.source),
      numericPrice: candidate.numericPrice,
      needsReview: Boolean(info && info.needsReview),
      availabilityNote: info ? info.availabilityNote || info.lastPriceNote || null : null,
      href: modelHref(candidate.brand, candidate.name),
      inStock,
      score,
      reasons: reasons2,
      keySpecs,
    }
  })

  matches.sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.inStock) - Number(a.inStock) || // متاح بسجل مخزون فعلي أولًا
      a.numericPrice - b.numericPrice ||
      (a.brand < b.brand ? -1 : a.brand > b.brand ? 1 : 0) ||
      (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  )

  return {
    ok: true,
    totalCount: matches.length,
    shownCount: Math.min(matches.length, PERFECT_SHOW_LIMIT),
    excluded,
    matches: matches.slice(0, PERFECT_SHOW_LIMIT),
  }
}
