/**
 * حساب تكلفة تشغيل الموتوسيكل — منطق صرف بلا تخزين ولا إرسال ولا واجهة خلفية:
 * - كل الأرقام من مُدخل المستخدم وحده: لا نفترض سعر وقود ولا رقم استهلاك لموديل بعينه.
 * - المعادلة المتفق عليها:
 *     المسافة الشهرية = (الكيلومترات اليومية × أيام الركوب) أو إدخال شهري مباشر —
 *     التبديل بين الوضعين لا يضيع البيانات: كل وضع يحتفظ بقيمته الخاصة.
 *     لترات الشهر = (المسافة الشهرية ÷ كم لكل لتر)
 *     تكلفة الوقود الشهرية = لترات الشهر × سعر اللتر
 *     الإجمالي الشهري = تكلفة الوقود + الصيانة + مصاريف أخرى (اختيارية)
 *     الإجمالي السنوي = الإجمالي الشهري × 12
 * - التحقق قبل الحساب: أرقام منتهية فقط؛ المسافة ≥ 0؛ الأيام عدد صحيح من 1 إلى 31؛
 *   الاستهلاك > 0 حصريًا (حماية من القسمة على صفر)؛ السعر ≥ 0؛ الصيانة ≥ 0 — وأول خطأ فقط يُعاد.
 * - حماية من الطفح: حتى لو كانت كل مُدخل منتهية، تُفحص النواتج الوسيطة والنهائية ضد اللانهاية
 *   (مُدخلات متطرفة جدًا) — وتُرفض برسالة عربية بدل عرض أرقام غير صالحة.
 * - التقريب لعرض أرقام متسقة ذاتيًا: المبالغ تُقرَّب لأقرب جنيه، واللترات لخانة عشرية واحدة،
 *   والسنوي = (الإجمالي الشهري المُقرَّب) × 12 بالضبط — فتتطابق الأرقام المعروضة دائمًا.
 * - الدالة لا ترمي استثناءً أبدًا: أي مُدخل غريب يُعالَج كخطأ تحقق برسالة عربية.
 */

/** أي مُدخل غير رقم منتهٍ (نص فارغ/فراغات/كلمات/NaN/Infinity) ⇒ NaN — لاحظ أن Number('') تساوي 0 فيُستبعد النص الفارغ صراحةً */
function toFiniteNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return Number.NaN
}

/** رسالة رفض القيم المتطرفة التي تُنتج نتائج غير منتهية (طفح حسابي) */
const OVERFLOW_ERROR = 'القيم المُدخلة تُنتج أرقامًا أكبر من أن تُحسب — جرِّب قيمًا أصغر'

/**
 * يتحقق من المدخلات ثم يحسب — يعيد { ok: true, ...الأرقام } أو { ok: false, error: 'رسالة عربية' }.
 * @param {{distanceMode?: 'daily'|'monthly', dailyKm?: number|string, daysPerMonth?: number|string,
 *          monthlyKm?: number|string, kmPerLiter?: number|string, fuelPrice?: number|string,
 *          maintenance?: number|string, otherExpenses?: number|string}} input
 */
export function calculateOwnershipCost(input) {
  const values = input ?? {}
  const kmPerLiter = toFiniteNumber(values.kmPerLiter)
  const fuelPrice = toFiniteNumber(values.fuelPrice)
  const maintenance = toFiniteNumber(values.maintenance)

  // وضع المسافة: يومي (كم/يوم × أيام) أو شهري مباشر — كل وضع قيمته الخاصة ولا ضياع عند التبديل
  const mode = values.distanceMode === 'monthly' ? 'monthly' : 'daily'
  let exactMonthlyKm
  if (mode === 'monthly') {
    const monthlyKm = toFiniteNumber(values.monthlyKm)
    if (Number.isNaN(monthlyKm)) return { ok: false, error: 'أدخل المسافة الشهرية المقطوعة بالكيلومترات' }
    if (monthlyKm < 0) return { ok: false, error: 'المسافة الشهرية لا تقبل قيمة سالبة' }
    if (monthlyKm === 0) return { ok: false, error: 'أدخل مسافة شهرية أكبر من صفر' }
    exactMonthlyKm = monthlyKm
  } else {
    const dailyKm = toFiniteNumber(values.dailyKm)
    const daysPerMonth = toFiniteNumber(values.daysPerMonth)
    if (Number.isNaN(dailyKm)) return { ok: false, error: 'أدخل المسافة اليومية المقطوعة بالكيلومترات' }
    if (dailyKm < 0) return { ok: false, error: 'المسافة اليومية لا تقبل قيمة سالبة' }

    if (Number.isNaN(daysPerMonth)) return { ok: false, error: 'أدخل عدد أيام الركوب في الشهر' }
    if (!Number.isInteger(daysPerMonth)) return { ok: false, error: 'أيام الركوب يجب أن تكون عددًا صحيحًا من 1 إلى 31' }
    if (daysPerMonth < 1 || daysPerMonth > 31) return { ok: false, error: 'أيام الركوب يجب أن تكون بين 1 و31 يومًا في الشهر' }
    exactMonthlyKm = dailyKm * daysPerMonth
    if (exactMonthlyKm === 0) return { ok: false, error: 'أدخل مسافة أكبر من صفر' }
  }

  // مصاريف أخرى اختيارية (فارغة = 0) — لا سالب
  let otherExpenses = 0
  if (values.otherExpenses != null && String(values.otherExpenses).trim() !== '') {
    otherExpenses = toFiniteNumber(values.otherExpenses)
    if (Number.isNaN(otherExpenses)) return { ok: false, error: 'أدخل المصاريف الأخرى بالجنيه أو اتركها فارغة' }
    if (otherExpenses < 0) return { ok: false, error: 'المصاريف الأخرى لا تقبل قيمة سالبة' }
  }

  if (Number.isNaN(kmPerLiter)) return { ok: false, error: 'أدخل استهلاك الموتوسيكل (كم لكل لتر)' }
  if (kmPerLiter <= 0) return { ok: false, error: 'الاستهلاك يجب أن يكون أكبر من صفر — لا يمكن القسمة على صفر' }

  if (Number.isNaN(fuelPrice)) return { ok: false, error: 'أدخل سعر لتر الوقود بالجنيه' }
  if (fuelPrice < 0) return { ok: false, error: 'سعر اللتر لا يقبل قيمة سالبة' }

  if (Number.isNaN(maintenance)) return { ok: false, error: 'أدخل تكلفة الصيانة والمصاريف الشهرية بالجنيه' }
  if (maintenance < 0) return { ok: false, error: 'تكلفة الصيانة والمصاريف لا تقبل قيمة سالبة' }

  const exactLiters = exactMonthlyKm / kmPerLiter
  const exactFuelCost = exactLiters * fuelPrice

  // حماية من طفح الحساب (مراجعة 2026-10-29): مُدخلات متطرفة قد تُنتج قيمًا غير منتهية —
  // تُرفض برسالة عربية قبل التقريب بدل عرض Infinity في النتائج
  if (!Number.isFinite(exactLiters) || !Number.isFinite(exactFuelCost)) {
    return { ok: false, error: OVERFLOW_ERROR }
  }

  const monthlyLiters = Math.round(exactLiters * 10) / 10
  const monthlyFuelCost = Math.round(exactFuelCost)
  const monthlyTotal = monthlyFuelCost + Math.round(maintenance) + Math.round(otherExpenses)
  const annualTotal = monthlyTotal * 12

  // نفس الحماية على النتائج النهائية: جمع/ضرب قيم منتهية قد يطفح هو الآخر في الحالات المتطرفة جدًا
  if (
    !Number.isFinite(monthlyLiters) ||
    !Number.isFinite(monthlyFuelCost) ||
    !Number.isFinite(monthlyTotal) ||
    !Number.isFinite(annualTotal)
  ) {
    return { ok: false, error: OVERFLOW_ERROR }
  }

  return { ok: true, monthlyKm: Math.round(exactMonthlyKm), monthlyLiters, monthlyFuelCost, monthlyTotal, annualTotal }
}
