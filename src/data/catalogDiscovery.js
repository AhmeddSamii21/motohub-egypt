/**
 * اكتشاف الموديلات — بحث ذكي + فلاتر متقدمة + ترتيب، منطق نقي قابل للاختبار في Node.
 *
 * مصادر البيانات (بلا تكرار لمصدر الحقيقة):
 *   - CATALOG (كتالوج الأسعار المجمد — الماركة/الاسم/السعر).
 *   - generatedStock (السعر الحالي، المصدر، وحدات السجل ⇒ حالة التوفر).
 *   - MODEL_DETAILS (المواصفات المنشورة: نوع المركبة/سعة المحرك/السرعة القصوى).
 * ما يغيب (سعة/سرعة/نوع منشور) يبقى null ولا يُعامل صفرًا ولا يُخترع — الترتيب يضعه آخرًا
 * والفلاتر الرقمية تستبعه بشفافية (يُعاد عدده في excludedNoValue لكل حقل).
 *
 * البحث: تطبيع عربي/إنجليزي عملي (همزات/تاء مربوطة/ألف مقصورة/تشكيل/فواصل) مع مطابقة
 * جزئية لكل كلمة في (الماركة + الاسم) — بلا Intl ولا مكتبات.
 */
import { CATALOG } from './catalog.js'
import { GENERATED_BY_KEY, formatDisplayPrice } from './modelDisplay.js'
import { MODEL_DETAILS } from './generatedModelDetails.js'

const FIRST_NUMBER_RE = /(\d+(?:\.\d+)?)/

/** مطابقة سعر/سعة/سرعة رقمية من نص — بلا رقم قابل للقراءة ⇒ null (لا صفر مُفترَض) */
export function parseNumericText(text) {
  if (typeof text !== 'string') return null
  const match = text.replace(/,/g, '').match(FIRST_NUMBER_RE)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : null
}

/** سعر الكتالوج الرقمي: "69,700" و"229000" تصلح — ما عدا ذلك ⇒ null */
export function parseCatalogPriceNumber(value) {
  if (value == null) return null
  const cleaned = String(value).replace(/,/g, '').trim()
  if (!/^\d+(?:\.\d+)?$/.test(cleaned)) return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * تطبيع نص البحث: lowercase؛ توحيد الهمزات والألف (أإآ→ا)؛ ة→ه؛ ى→ي؛
 * إزالة التشكيل والتطويل وعلامات الترقيم والمسافات الزائدة.
 */
export function normalizeSearch(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // تشكيل + تطويل
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** هل يطابق النص المطبَّع كل كلمات الاستعلام (مطابقة جزئية لكل كلمة)؟ */
export function searchMatches(haystack, query) {
  const q = normalizeSearch(query)
  if (!q) return true
  const h = normalizeSearch(haystack)
  return q.split(' ').every((token) => h.includes(token))
}

/** فهارس ثابتة من المصادر المُولَّدة — مفتاح brand|name الموحَّد نفسه في كل الموقع */
const DETAILS_BY_KEY = new Map(
  MODEL_DETAILS.map((entry) => [`${entry.brand}|${entry.name}`, entry]),
)

/** قيمة مواصفة نصية لِتسمية محددة أو null */
function specValue(details, label) {
  if (!details || !Array.isArray(details.specs)) return null
  const spec = details.specs.find((s) => s && s.label === label)
  const value = spec && typeof spec.value === 'string' ? spec.value.trim() : ''
  return value || null
}

/** أنواع المركبة الموجودة فعلًا في المواصفات المُولَّدة — بلا تخمين أنواع لم تُوثَّق */
export const TYPE_VALUES = [
  ...new Set(
    MODEL_DETAILS.flatMap((entry) => (Array.isArray(entry.specs) ? entry.specs : []))
      .map((spec) => (spec && spec.label === 'نوع المركبة' && typeof spec.value === 'string' ? spec.value.trim() : null))
      .filter(Boolean),
  ),
]

/** خيارات التوفر (نصوص صادقة حصرًا حسب سجل المخزون المُولَّد) */
export const AVAILABILITY_OPTIONS = [
  { id: 'all', label: 'كل الحالات' },
  { id: 'in-stock', label: 'متاح حسب آخر سجل مخزون' },
  { id: 'no-stock', label: 'بدون سجل مخزون — آخر سعر مسجل' },
]

/** مفاتيح الترتيب المسموحة */
export const SORT_OPTIONS = [
  { id: 'default', label: 'الترتيب الأصلي' },
  { id: 'price-asc', label: 'السعر: من الأقل للأعلى' },
  { id: 'price-desc', label: 'السعر: من الأعلى للأقل' },
  { id: 'cc-asc', label: 'سعة المحرك: من الأقل' },
  { id: 'speed-desc', label: 'السرعة القصوى: من الأعلى' },
]

/**
 * بناء قائمة الموديلات المُثراة — تُحسب مرة عند التحميل (حتمية من المصادر المُجمَّدة).
 * كل عنصر: {brand, name, key, priceText, numericPrice, needsReview, inStock, cc, topSpeed, type}
 * cc/topSpeed/type = null عند غياب المواصفة المنشورة؛ inStock = true فقط لوحدات مسجَّلة > 0.
 */
export function buildDiscoveryModels() {
  const models = []
  for (const group of CATALOG) {
    if (!group || !Array.isArray(group.models)) continue
    for (const model of group.models) {
      if (!model || typeof model.name !== 'string') continue
      const key = `${group.brand}|${model.name}`
      const info = GENERATED_BY_KEY.get(key)
      const details = DETAILS_BY_KEY.get(key)
      const display = formatDisplayPrice(info ? info.price : model.price, info && info.source)
      const numericPrice = parseCatalogPriceNumber(display)
      const type = specValue(details, 'نوع المركبة')
      const ccSpec = specValue(details, 'سعة المحرك / القدرة')
      const cc = ccSpec ? parseNumericText(ccSpec) : null
      const speedSpec = specValue(details, 'السرعة القصوى')
      const topSpeed = speedSpec ? parseNumericText(speedSpec) : null
      models.push({
        brand: group.brand,
        name: model.name,
        key,
        price: model.price, // نص الكتالوج الأصلي كما ورد — للتوافق مع البطاقات
        priceText: display,
        numericPrice,
        needsReview: Boolean(info && info.needsReview),
        inStock: Boolean(info && info.stockUnits > 0),
        cc,
        topSpeed,
        type,
        availabilityNote: info ? info.availabilityNote || info.lastPriceNote || null : null,
      })
    }
  }
  return models
}

/**
 * تطبيق الفلاتر المجمَّعة على القائمة — الفلاتر تُدمَج (AND) بحرية.
 * @param {Array} models مخرجات buildDiscoveryModels
 * @param {{query?: string, brand?: string, priceMin?: number|null, priceMax?: number|null,
 *          ccMin?: number|null, ccMax?: number|null, types?: string[], availability?: string}} filters
 * @returns {{items: Array, excludedNoValue: {cc: number, topSpeed: number, type: number}}}
 *   excludedNoValue يُحصي الموديلات المستبعدة لأن القيمة غير منشورة — شفافية بلا ادعاء.
 */
export function applyDiscoveryFilters(models, filters) {
  const f = filters ?? {}
  const excludedNoValue = { cc: 0, topSpeed: 0, type: 0 }
  const priceMin = f.priceMin != null && Number.isFinite(f.priceMin) ? f.priceMin : null
  const priceMax = f.priceMax != null && Number.isFinite(f.priceMax) ? f.priceMax : null
  const ccMin = f.ccMin != null && Number.isFinite(f.ccMin) ? f.ccMin : null
  const ccMax = f.ccMax != null && Number.isFinite(f.ccMax) ? f.ccMax : null
  const ccActive = ccMin != null || ccMax != null
  const typeActive = Array.isArray(f.types) && f.types.length > 0
  const speedActive = f.speedMin != null && Number.isFinite(f.speedMin) ? f.speedMin : null

  const items = models.filter((model) => {
    if (!searchMatches(`${model.brand} ${model.name}`, f.query ?? '')) return false
    if (f.brand && f.brand !== 'all' && model.brand !== f.brand) return false
    if (priceMin != null && (model.numericPrice == null || model.numericPrice < priceMin)) return false
    if (priceMax != null && (model.numericPrice == null || model.numericPrice > priceMax)) return false
    if (ccActive) {
      if (model.cc == null) {
        excludedNoValue.cc += 1
        return false
      }
      if (ccMin != null && model.cc <= ccMin) return false
      if (ccMax != null && model.cc > ccMax) return false
    }
    if (typeActive) {
      if (!model.type) {
        excludedNoValue.type += 1
        return false
      }
      if (!f.types.includes(model.type)) return false
    }
    if (speedActive != null) {
      if (model.topSpeed == null) {
        excludedNoValue.topSpeed += 1
        return false
      }
      if (model.topSpeed < speedActive) return false
    }
    if (f.availability && f.availability !== 'all') {
      if (f.availability === 'in-stock' && !model.inStock) return false
      if (f.availability === 'no-stock' && model.inStock) return false
    }
    return true
  })
  return { items, excludedNoValue }
}

/**
 * ترتيب حتمي — القيم غير المنشورة تذهب آخر القائمة دائمًا (لا صفر مُفترَض)،
 * وتعاد نسخة جديدة؛ التعادل يبقى بترتيب المصدر (ترتيب مستقر).
 */
export function sortDiscovery(models, sortKey) {
  const copy = [...models]
  const byIndex = new Map(copy.map((model, index) => [model, index]))
  const numeric = (model) =>
    sortKey === 'cc-asc' ? model.cc : sortKey === 'speed-desc' ? model.topSpeed : null
  if (sortKey === 'price-asc') return copy.sort((a, b) => (a.numericPrice ?? Infinity) - (b.numericPrice ?? Infinity))
  if (sortKey === 'price-desc') return copy.sort((a, b) => (b.numericPrice ?? -Infinity) - (a.numericPrice ?? -Infinity))
  if (sortKey === 'cc-asc' || sortKey === 'speed-desc') {
    const desc = sortKey === 'speed-desc'
    return copy.sort((a, b) => {
      const av = numeric(a)
      const bv = numeric(b)
      if (av == null && bv == null) return byIndex.get(a) - byIndex.get(b)
      if (av == null) return 1 // غير منشور ⇒ آخر القائمة
      if (bv == null) return -1
      return desc ? bv - av : av - bv
    })
  }
  return copy // الترتيب الأصلي كما في المصدر
}

/**
 * شرائح الفلاتر النشطة — تُستهلك لعرض شريط الفلاتر المفعّلة مع إزالة فردية.
 * كل شريحة: {id, label, clear} حيث clear كائن فلاتر جزئي يلغي هذا الفلتر تحديدًا.
 */
export function activeFilterChips(filters, labels = {}) {
  const f = filters ?? {}
  const chips = []
  const push = (id, label, clear) => chips.push({ id, label, clear })
  if ((f.query ?? '').trim()) push('query', `بحث: ${f.query.trim()}`, { query: '' })
  if (f.brand && f.brand !== 'all') push('brand', `الماركة: ${f.brand}`, { brand: 'all' })
  if (f.priceMin != null || f.priceMax != null) {
    const parts = []
    if (f.priceMin != null) parts.push(`من ${f.priceMin}`)
    if (f.priceMax != null) parts.push(`إلى ${f.priceMax}`)
    push('price', `السعر: ${parts.join(' ')} ج.م`, { priceMin: null, priceMax: null })
  }
  if (f.ccMin != null || f.ccMax != null) {
    const parts = []
    if (f.ccMin != null) parts.push(`أكبر من ${f.ccMin}cc`)
    if (f.ccMax != null) parts.push(`حتى ${f.ccMax}cc`)
    push('cc', `سعة المحرك: ${parts.join(' ')}`, { ccMin: null, ccMax: null })
  }
  if (Array.isArray(f.types) && f.types.length > 0) {
    push('types', `النوع: ${f.types.join(' / ')}`, { types: [] })
  }
  if (f.availability && f.availability !== 'all') {
    const option = AVAILABILITY_OPTIONS.find((o) => o.id === f.availability)
    push('availability', `التوفر: ${option ? option.label : f.availability}`, { availability: 'all' })
  }
  if (f.speedMin != null) push('speed', `سرعة قصوى ${f.speedMin} كم/س وأكثر`, { speedMin: null })
  if (labels && Object.keys(labels).length) return chips // يسمح بتخصيص لاحق بلا تغيير سلوك
  return chips
}
