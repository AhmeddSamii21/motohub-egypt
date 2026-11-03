/**
 * مخطط ميزانية الموتوسيكل — منطق صرف قابل للاختبار (بلا تخزين ولا إرسال).
 *
 * السؤال الذي يجيب عليه: «مع ميزانيتي، أقدر أشتري أنهي موتوسيكل؟»
 *
 * قواعد البيانات الصارمة:
 * - السعر الرقمي يأتي من قائمة الاكتشاف المُثراة (buildDiscoveryModels) — المصدر الوحيد
 *   للأسعار (المولَّدة من دفتر العمل ← الكتالوج المُجمَّد). لا قائمة أسعار ثانية هنا.
 * - الموديل بلا سعر منشور (numericPrice == null) لا يُعامَل صفرًا أبدًا: يُستبعد من
 *   المطابقة ويُحصى في missingPriceCount بشفافية.
 * - موديلات needsReview سعرها الكتالوج القديم نفسه — تُعرض مع علامتها لكنها تُحسب
 *   في المطابقة (سعرها رقمي من الكتالوج المُثبَّت، مع إظهار علامة المراجعة كما هي).
 *
 * المنطق:
 * - المطابق (fits): numericPrice <= الميزانية المتاحة الآن.
 * - القريب (close): غير مطابق لكن الفرق <= المقدار الشهري الادخاري × الشهور المقدَّرة
 *   (أو ضمن النافذة الافتراضية 15% عندما لا يوجد ادخار) — يُعرض بلا ادعاء أنه داخل
 *   الميزانية، مع إظهار المبلغ الزائد عن الميزانية صراحةً.
 * - الترتيب حتمي: الأرخص أولًا داخل كل مجموعة، ثم بالاسم.
 *
 * الدوال لا ترمي استثناءً أبدًا: مُدخل غريب ⇒ نتيجة فارغة/خطأ برسالة عربية.
 */

/** النافذة النسبية للخيارات «القريبة» حين لا يوجد ادخار شهري — 15% فوق الميزانية */
const CLOSE_WINDOW_RATIO = 0.15

/** أي مُدخل غير رقم منتهٍ ⇒ NaN (النص الفارغ يُستبعد صراحةً لأن Number('') === 0) */
function toFiniteNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return Number.NaN
}

/**
 * خطة الميزانية من قائمة الموديلات المُثراة.
 * @param {Array} models مخرجات buildDiscoveryModels
 * @param {{budget: number|string, monthlySaving?: number|string, brand?: string, types?: string[]}} input
 * @returns
 *   ok=false + رسالة عربية عند مُدخل غير صالح، أو:
 *   { ok, budget, monthlySaving, estimatedMonths, affordable: [...], closeOptions: [...],
 *     missingPriceCount, filteredOutCount }
 *   كل عنصر: {...الموديل, remainingBudget | overBudget}
 */
export function buildBudgetPlan(models, input) {
  const values = input ?? {}
  const budget = toFiniteNumber(values.budget)

  if (Number.isNaN(budget)) return { ok: false, error: 'أدخل ميزانيتك المتاحة بالجنيه المصري' }
  if (budget < 0) return { ok: false, error: 'الميزانية لا تقبل قيمة سالبة' }
  if (budget === 0) return { ok: false, error: 'أدخل ميزانية أكبر من صفر لعرض الموديلات' }

  let monthlySaving = 0
  if (values.monthlySaving != null && String(values.monthlySaving).trim() !== '') {
    monthlySaving = toFiniteNumber(values.monthlySaving)
    if (Number.isNaN(monthlySaving)) return { ok: false, error: 'أدخل مبلغ الادخار الشهري بالجنيه أو اتركه فارغًا' }
    if (monthlySaving < 0) return { ok: false, error: 'الادخار الشهري لا يقبل قيمة سالبة' }
  }

  // الميزانية المتاحة الآن + تقدير مدى الادخار: عند وجود ادخار شهري، «القريب»
  // يُقاس بالفارق مقسومًا على الادخار (شهور حتى الوصول) بحد أقصى 36 شهرًا للعرض.
  const brand = typeof values.brand === 'string' && values.brand && values.brand !== 'all' ? values.brand : null
  const types = Array.isArray(values.types) && values.types.length > 0 ? values.types : null

  const affordable = []
  const closeOptions = []
  let missingPriceCount = 0
  let filteredOutCount = 0

  for (const model of models ?? []) {
    if (!model) continue
    if (brand && model.brand !== brand) {
      filteredOutCount += 1
      continue
    }
    if (types && !types.includes(model.type)) {
      // موديل بلا نوع منشور يُحصى كمستبعد عند تفعيل فلتر النوع — شفافية بلا تخمين
      filteredOutCount += 1
      continue
    }

    const price = toFiniteNumber(model.numericPrice)
    if (Number.isNaN(price) || price == null) {
      // لا سعر منشور — لا يُعامل صفرًا ولا يُخمَّن: يُحصى بشفافية
      missingPriceCount += 1
      continue
    }

    if (price <= budget) {
      affordable.push({ ...model, numericPrice: price, remainingBudget: Math.round(budget - price) })
      continue
    }

    const over = price - budget
    let qualifiesAsClose = false
    let estimatedMonths = null
    if (monthlySaving > 0 && over <= monthlySaving * 36) {
      qualifiesAsClose = true
      estimatedMonths = Math.ceil(over / monthlySaving)
    } else if (monthlySaving === 0 && over <= budget * CLOSE_WINDOW_RATIO) {
      qualifiesAsClose = true
    }
    if (qualifiesAsClose) {
      closeOptions.push({
        ...model,
        numericPrice: price,
        overBudget: Math.round(over),
        estimatedMonths,
      })
    }
  }

  // ترتيب حتمي: السعر ثم الاسم (بلا Intl — مقارنة نقاط ترميز)
  const byPriceThenName = (a, b) =>
    a.numericPrice - b.numericPrice || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
  affordable.sort(byPriceThenName)
  closeOptions.sort(byPriceThenName)

  return {
    ok: true,
    budget: Math.round(budget),
    monthlySaving: Math.round(monthlySaving),
    affordable,
    closeOptions,
    missingPriceCount,
    filteredOutCount,
  }
}

/** أقرب الخيارات حين لا مطابق إطلاقًا — الأرخص أولًا، بلا ادعاء أنها داخل الميزانية */
export function closestOptions(models, count = 3) {
  const priced = (models ?? [])
    .map((model) => {
      const price = toFiniteNumber(model?.numericPrice)
      return Number.isNaN(price) ? null : { ...model, numericPrice: price }
    })
    .filter(Boolean)
    .sort(byPriceThenName)
  return priced.slice(0, Math.max(0, count))
}

function byPriceThenName(a, b) {
  return a.numericPrice - b.numericPrice || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
}
