/**
 * معادلات حاسبة الأقساط — منطق صرف قابل للاختبار (بلا تخزين ولا إرسال ولا أي عرض تمويل).
 *
 * سيناريوهان منفصلان صراحةً:
 * 1) بلا فائدة (annualRatePercent فارغ/0):  القسط = المبلغ المُموَّل ÷ عدد الأشهر (تقسيط بسيط).
 * 2) بفائدة (فائدة متناقصة/أنّويتي — الطريقة القياسية عالميًا):
 *        r = المعدل السنوي % ÷ 100 ÷ 12          (المعدل الشهري كعدد عشري)
 *        القسط = P × r ÷ (1 − (1 + r)^(−n))
 *    حيث P = المبلغ المُموَّل (السعر − الدفعة الأولى) و n = عدد الأشهر.
 *    المعادلة موثّقة ومُختبرة بمقارنة محافظة: مجموع (القسط × n) ≥ P، والقسط ≥ P/n.
 *
 * الرسوم الإضافية (إن عرفها العميل): تُعامل كتكلفة تُضاف إلى إجمالي المدفوع
 * (لا تُموَّل ولا تُخمَّن طريقة معالجتها من أي جهة) — وتظهر سطرًا مستقلًا.
 *
 * المعدل والرسوم والمدة كلها مُدخلات العميل — لا يُفترض معدل ولا رسم صامتًا أبدًا.
 * النواتج «تقديرات تخطيط» وليست عرض تمويل أو ضمان قبول من أي جهة.
 *
 * الدوال لا ترمي استثناءً أبدًا: مُدخل غريب ⇒ { ok: false, error: 'رسالة عربية' }.
 */

/** حماية من طفح الحساب في القيم المتطرفة جدًا */
const OVERFLOW_ERROR = 'القيم المُدخلة تُنتج أرقامًا أكبر من أن تُحسب — جرِّب قيمًا أصغر'

function toFiniteNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return Number.NaN
}

/**
 * حساب خطة الأقساط.
 * @param {{price: number|string, downPayment?: number|string, annualRatePercent?: number|string,
 *          months?: number|string, fees?: number|string}} input
 * @returns {ok: true, scenario: 'zero-interest'|'interest-bearing', financed, monthly, totalInstallments,
 *           totalPaid, financingCost, downPayment, fees} أو { ok: false, error }
 */
export function calculateInstallmentPlan(input) {
  const values = input ?? {}
  const price = toFiniteNumber(values.price)
  const months = toFiniteNumber(values.months)

  if (Number.isNaN(price)) return { ok: false, error: 'أدخل سعر الموتوسيكل بالجنيه المصري' }
  if (price <= 0) return { ok: false, error: 'السعر يجب أن يكون أكبر من صفر' }

  if (Number.isNaN(months)) return { ok: false, error: 'أدخل مدة التقسيط بالأشهر' }
  if (!Number.isInteger(months)) return { ok: false, error: 'مدة التقسيط يجب أن تكون عددًا صحيحًا من الأشهر' }
  if (months < 1 || months > 120) return { ok: false, error: 'مدة التقسيط يجب أن تكون بين 1 و120 شهرًا' }

  // الدفعة الأولى: فارغة ⇒ 0 — لا سالب ولا تجاوز للسعر
  let downPayment = 0
  if (values.downPayment != null && String(values.downPayment).trim() !== '') {
    downPayment = toFiniteNumber(values.downPayment)
    if (Number.isNaN(downPayment)) return { ok: false, error: 'أدخل الدفعة الأولى بالجنيه أو اتركها فارغة' }
    if (downPayment < 0) return { ok: false, error: 'الدفعة الأولى لا تقبل قيمة سالبة' }
    if (downPayment > price) return { ok: false, error: 'الدفعة الأولى لا تتجاوز سعر الموتوسيكل' }
  }

  // الرسوم: فارغة ⇒ 0 — لا سالب (طريقة معالجتها لدى أي جهة غير معروفة، فتظهر سطرًا مستقلًا)
  let fees = 0
  if (values.fees != null && String(values.fees).trim() !== '') {
    fees = toFiniteNumber(values.fees)
    if (Number.isNaN(fees)) return { ok: false, error: 'أدخل الرسوم الإضافية بالجنيه أو اتركها فارغة' }
    if (fees < 0) return { ok: false, error: 'الرسوم الإضافية لا تقبل قيمة سالبة' }
  }

  // المعدل السنوي: فارغ/0 ⇒ سيناريو بلا فائدة (منفصل صراحةً — لا افتراض صامت لمعدل)
  let annualRatePercent = 0
  if (values.annualRatePercent != null && String(values.annualRatePercent).trim() !== '') {
    annualRatePercent = toFiniteNumber(values.annualRatePercent)
    if (Number.isNaN(annualRatePercent)) return { ok: false, error: 'أدخل معدل الفائدة السنوي كنسبة مئوية أو اتركه فارغًا' }
    if (annualRatePercent < 0) return { ok: false, error: 'معدل الفائدة لا يقبل قيمة سالبة' }
    if (annualRatePercent > 500) return { ok: false, error: 'معدل الفائدة أكبر من المعقول — تأكد من النسبة المئوية' }
  }

  const financed = Math.round((price - downPayment) * 100) / 100
  const scenario = annualRatePercent > 0 ? 'interest-bearing' : 'zero-interest'

  let exactMonthly
  if (scenario === 'zero-interest') {
    exactMonthly = financed / months
  } else {
    const r = annualRatePercent / 100 / 12
    // الأنّوية: القسط = P·r ÷ (1 − (1+r)^(−n)) — r > 0 هنا دائمًا فلا قسمة على صفر
    exactMonthly = (financed * r) / (1 - Math.pow(1 + r, -months))
  }

  // حماية طفح على القيمة الوسيطة قبل التقريب
  if (!Number.isFinite(exactMonthly)) return { ok: false, error: OVERFLOW_ERROR }

  const monthly = Math.round(exactMonthly)
  const totalInstallments = monthly * months
  const totalPaid = downPayment + totalInstallments + fees
  const financingCost = totalInstallments + fees - financed

  const final = { monthly, totalInstallments, totalPaid, financingCost }
  if (Object.values(final).some((v) => !Number.isFinite(v))) return { ok: false, error: OVERFLOW_ERROR }

  return {
    ok: true,
    scenario,
    financed: Math.round(financed),
    monthly,
    totalInstallments,
    totalPaid: Math.round(totalPaid),
    financingCost: Math.round(financingCost),
    downPayment: Math.round(downPayment),
    fees: Math.round(fees),
    annualRatePercent,
    months,
  }
}
