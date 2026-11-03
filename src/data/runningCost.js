/**
 * مقارنة تكاليف التشغيل — منطق صرف قابل للاختبار (بلا تخزين ولا إرسال).
 *
 * قواعد البيانات الصارمة:
 * - لا توجد أي بيانات استهلاك (كم/لتر) منشورة للموديلات في مصادر المشروع
 *   (تم فحص generatedModelDetails.js — لا حقل استهلاك). لذا الاستهلاك هنا
 *   «تقدير يُدخله العميل لكل موديل» ويُعرض دائمًا كمُدخل مستخدم، لا كمواصفة موثقة.
 * - سعر اللتر والمسافة الشهرية «افتراضات مشتركة» واحدة لكل الموديلات المُقارَنة.
 * - الموديل بلا استهلاك مُدخل: يظهر «غير محسوب» ولا يُرتَّب أبدًا كأرخص —
 *   لا يُعامل استهلاكه صفرًا ولا قيمة مُختلقة.
 * - فرق التكلفة يُحسب فقط بين قيمتين محسوبتين — لا فرق وهمي عند نقص البيانات.
 *
 * المعادلة (نفس معادلة حاسبة التشغيل):
 *   تكلفة الوقود الشهرية = المسافة الشهرية ÷ (كم/لتر) × سعر اللتر
 *   التكلفة السنوية = الشهرية × 12
 *
 * الدوال لا ترمي استثناءً أبدًا.
 */

function toFiniteNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return Number.NaN
}

const OVERFLOW_ERROR = 'القيم المُدخلة تُنتج أرقامًا أكبر من أن تُحسب — جرِّب قيمًا أصغر'

/** افتراضات مشتركة واحدة لكل الموديلات المُقارَنة */
export function validateSharedAssumptions({ monthlyKm, fuelPrice }) {
  const km = toFiniteNumber(monthlyKm)
  if (Number.isNaN(km)) return { ok: false, error: 'أدخل المسافة الشهرية بالكيلومترات' }
  if (km < 0) return { ok: false, error: 'المسافة الشهرية لا تقبل قيمة سالبة' }
  if (km === 0) return { ok: false, error: 'أدخل مسافة شهرية أكبر من صفر' }

  const price = toFiniteNumber(fuelPrice)
  if (Number.isNaN(price)) return { ok: false, error: 'أدخل سعر لتر الوقود بالجنيه' }
  if (price < 0) return { ok: false, error: 'سعر اللتر لا يقبل قيمة سالبة' }
  if (price === 0) return { ok: false, error: 'أدخل سعر لتر أكبر من صفر' }

  return { ok: true, monthlyKm: km, fuelPrice: price }
}

/**
 * تكلفة تشغيل موديل واحد وفق الافتراضات المشتركة.
 * @param {{kmPerLiter: number|string|null}} entry تقدير العميل للاستهلاك (قد يكون فارغًا)
 * @returns {ok: true, monthlyFuelCost, annualFuelCost} أو { ok: false, error } أو { ok: false, missing: true }
 */
export function calculateModelRunningCost(kmPerLiter, shared) {
  const consumption = toFiniteNumber(kmPerLiter)
  // فارغ/غير رقم ⇒ «غير محسوب» — صادق بلا تخمين، ولا يُرتَّب أبدًا
  if (Number.isNaN(consumption)) return { ok: false, missing: true }
  if (consumption <= 0) return { ok: false, error: 'الاستهلاك يجب أن يكون أكبر من صفر' }

  const exactMonthly = (shared.monthlyKm / consumption) * shared.fuelPrice
  if (!Number.isFinite(exactMonthly)) return { ok: false, error: OVERFLOW_ERROR }

  const monthlyFuelCost = Math.round(exactMonthly)
  const annualFuelCost = monthlyFuelCost * 12
  if (!Number.isFinite(monthlyFuelCost) || !Number.isFinite(annualFuelCost)) {
    return { ok: false, error: OVERFLOW_ERROR }
  }
  return { ok: true, monthlyFuelCost, annualFuelCost }
}

/**
 * يبني صفوف المقارنة من مُدخلات العميل.
 * @param {Array<{key: string, brand: string, name: string, kmPerLiter?: string}>} entries
 * @param {{monthlyKm: number|string, fuelPrice: number|string}} sharedInput
 * @returns {ok, shared?, rows?: [{...entry, computed: boolean, monthlyFuelCost?, annualFuelCost?, error?}]}
 *   الصفوف بترتيب الإدخال (لا إعادة ترتيب خفي) — والأرخص يُعلَّم فقط بين الصفوف المحسوبة كلها.
 */
export function buildRunningCostComparison(entries, sharedInput) {
  const shared = validateSharedAssumptions(sharedInput ?? {})
  if (!shared.ok) return shared

  const rows = (entries ?? []).map((entry) => {
    if (!entry || !entry.key) return null
    const cost = calculateModelRunningCost(entry.kmPerLiter, shared)
    if (cost.ok) return { ...entry, computed: true, monthlyFuelCost: cost.monthlyFuelCost, annualFuelCost: cost.annualFuelCost }
    if (cost.missing) return { ...entry, computed: false, monthlyFuelCost: null, annualFuelCost: null, error: 'أدخل تقدير الاستهلاك لهذا الموديل' }
    return { ...entry, computed: false, monthlyFuelCost: null, annualFuelCost: null, error: cost.error }
  })

  const list = rows.filter(Boolean)

  // التمييز «الأرخص» فقط عندما كل الصفوف المُقارَنة محسوبة — لا ترتيب زائف عند نقص البيانات
  let cheapestKey = null
  const computed = list.filter((row) => row.computed)
  if (computed.length >= 2 && computed.length === list.length) {
    const min = Math.min(...computed.map((row) => row.monthlyFuelCost))
    const atMin = computed.filter((row) => row.monthlyFuelCost === min)
    // تساوي تام ⇒ لا «أرخص» واحد (متساوون)
    if (atMin.length === 1) cheapestKey = atMin[0].key
  }

  return { ok: true, shared, rows: list, cheapestKey }
}

/** الفرق الشهري/السنوي بين صفين محسوبين فقط — وإلا null */
export function costDifference(rowA, rowB) {
  if (!rowA?.computed || !rowB?.computed) return null
  const monthly = Math.abs(rowA.monthlyFuelCost - rowB.monthlyFuelCost)
  return { monthly, annual: monthly * 12 }
}
