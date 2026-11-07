/**
 * مُوجِّه الشراء «اكتشف موديلك» — منطق نقي فوق منطق الاكتشاف القائم بلا تكرار لمصدر الحقيقة.
 *
 * التكوين فقط (لا بيانات ولا منطق مقارنة جديد):
 *   - buildDiscoveryModels  ← CATALOG + generatedStock + MODEL_DETAILS (Same as Catalog)
 *   - applyDiscoveryFilters ← فلاتر الماركة/النوع/التوفر/السعر (AND، شفافية القيم الغائبة)
 *   - sortDiscovery         ← ترتيب حتمي من الأرخص
 *
 * الفلاتر المدعومة فعلًا من البيانات المنشورة: الميزانية حتى سقف، الماركة،
 * نوع المركبة (من المواصفات المنشورة حصرًا)، حالة سجل المخزون. ما لا تدعمه
 * البيانات (سنة/لون/ضمان…) لا يُقدَّم أصلًا — بلا اختراع.
 * السعر غير القابل للقراءة لا يُعامل صفرًا: عند تفعيل سقف الميزانية يُستبعد
 * ويُحصى في excludedNoPrice ليُعرض للمستخدم بشفافية.
 */
import { CATALOG } from './catalog.js'
import { AVAILABILITY_OPTIONS, applyDiscoveryFilters, buildDiscoveryModels, sortDiscovery } from './catalogDiscovery.js'

export { AVAILABILITY_OPTIONS }
export { TYPE_VALUES } from './catalogDiscovery.js'

/** خيارات الميزانية — سقف ج.م على السعر الرقمي المُحلَّل من الكتالوج (بلا ادعاء عروض) */
export const BUDGET_OPTIONS = [
  { id: 'all', label: 'كل الميزانيات', max: null },
  { id: 'b30', label: 'حتى 30,000 ج.م', max: 30000 },
  { id: 'b60', label: 'حتى 60,000 ج.م', max: 60000 },
  { id: 'b90', label: 'حتى 90,000 ج.م', max: 90000 },
  { id: 'b150', label: 'حتى 150,000 ج.م', max: 150000 },
]

/** قيم مُوجِّه افتراضية — كل شيء: بلا بحث مسبق وبلا افتراضات عن الميزانية أو النوع */
export const DEFAULT_FINDER_FILTERS = Object.freeze({
  budget: 'all',
  brand: 'all',
  types: [],
  availability: 'all',
})

/** قائمة الموديلات المُثراة — تُبنى من المصادر المجمدة نفسها (نفس منطق الكتالوج) */
export function buildFinderModels() {
  return buildDiscoveryModels()
}

/** كائن فلاتر نظيف من مدخلات المستخدم — قيم غير معروفة تعود للافتراضي بلا تخمين */
export function normalizeFinderFilters(raw) {
  const f = raw ?? {}
  const budget = BUDGET_OPTIONS.some((o) => o.id === f.budget) ? f.budget : 'all'
  const brand = typeof f.brand === 'string' && f.brand ? f.brand : 'all'
  const types = Array.isArray(f.types) ? f.types.filter((t) => typeof t === 'string' && t) : []
  const availability = AVAILABILITY_OPTIONS.some((o) => o.id === f.availability) ? f.availability : 'all'
  return { budget, brand, types, availability }
}

/**
 * تشغيل المُوجِّه: تطبيق الفلاتر المجمَّعة ثم ترتيب تنازليًا حسب الأرخص (حتمي).
 * عند تفعيل سقف الميزانية، الموديلات التي تطابق باقي الفلاتر لكن سعرها غير قابل
 * للقراءة تُحصى في excludedNoPrice — تُستبعد من النتائج ولا تُعامل صفرًا.
 */
export function runFinder(models, rawFilters) {
  const f = normalizeFinderFilters(rawFilters)
  const budgetMax = (BUDGET_OPTIONS.find((o) => o.id === f.budget) ?? {}).max ?? null
  const common = { brand: f.brand, types: f.types, availability: f.availability }

  const withBudget = applyDiscoveryFilters(models, { ...common, priceMax: budgetMax })
  const items = budgetMax != null ? withBudget.items.sort((a, b) => (a.numericPrice ?? Infinity) - (b.numericPrice ?? Infinity)) : sortDiscovery(withBudget.items, 'default')

  let excludedNoPrice = 0
  if (budgetMax != null) {
    const withoutBudget = applyDiscoveryFilters(models, common)
    excludedNoPrice = withoutBudget.items.length - withBudget.items.length
  }
  return { items, excludedNoValue: withBudget.excludedNoValue, excludedNoPrice }
}

/** هل الفلاتر الحالية هي الافتراضية؟ (لإظهار/إخفاء زر إعادة الضبط دون بيانات وهمية) */
export function finderFiltersAreDefault(filters) {
  const f = normalizeFinderFilters(filters)
  return f.budget === 'all' && f.brand === 'all' && f.types.length === 0 && f.availability === 'all'
}

/** ماركات الكتالوج بترتيب المصدر — قائمة الاختيار مشتقة من الكتالوج نفسه */
export function finderBrands() {
  return CATALOG.map((group) => group && group.brand).filter(Boolean)
}
