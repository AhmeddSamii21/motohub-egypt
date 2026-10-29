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
import { CATALOG } from './catalog'
import { GENERATED_BY_KEY, formatDisplayPrice } from './modelDisplay'
import { modelHref } from './modelSlug'
import { MODEL_DETAILS } from './generatedModelDetails'

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
