/**
 * وصف نتيجة الطلب بصدق — دوال ونصوص نقية (بلا React وبلا شبكة) قابلة للاختبار في Node.
 *
 * القواعد:
 * - كل ما يُنسب إلى «النظام» يجب أن يكون قد وصل فعلاً في رد الخادم — لا قيم افتراضية.
 * - ما هو سياسة منشورة على الموقع يُذكر صراحة كسياسة، لا كتأكيد من النظام.
 * - لا يُؤكَّد أي دفع إلكتروني: الموقع لا يحصّل أي مبلغ.
 * - لا ادعاء بأن المعرض سيتواصل مع العميل، ولا ضمان لمنع تكرار الطلب.
 */

/** الدفعة المقدمة المنشورة في سياسة الموقع (ثابتة للطلب كله) — سياسة لا قيمة من النظام */
export const PUBLISHED_DEPOSIT_EGP = 5000

/** نص الحالة عند غياب حالة صالحة في رد النظام */
export const STATUS_UNKNOWN_LABEL = 'غير متاحة (لم يُرسلها النظام)'

/** نص بديل عند غياب قيمة الدفعة من النظام */
export const DEPOSIT_UNKNOWN_LABEL = 'لم يُرسلها النظام'

/** شرح إعادة المحاولة — يذكر حدود المتصفح صراحة بلا أي ضمان */
export const RETRY_EXPLANATION =
  'إعادة الإرسال تستخدم نفس المرجع ونفس البيانات تمامًا، لكن منع تكرار الطلب يعتمد على سلوك نظام الطلبات في المعرض — ولم يُتحقق منه من هذا الموقع، لذلك لا يضمن المتصفح عدم التكرار.'

/** ملاحظة سجل الطلبات المحلي — لا تدّعي أي تواصل أو تحديث تلقائي */
export const HISTORY_NOTE =
  'محفوظة في هذا المتصفح فقط — الحالة المعروضة كما وردت لحظة الإرسال، وقد لا تعكس الحالة الحالية. هذه الصفحة لا تتلقى تحديثات تلقائية.'

/** ما تؤكده الصفحة بعد نجاح الإرسال — بلا أي وعد تواصل من المعرض */
export const SUCCESS_CONTACT_NOTE =
  'هذه الصفحة تؤكد فقط ما ورد في رد النظام أعلاه. أي تفاصيل أخرى (التوفر، السعر النهائي، رسوم التوصيل، الدفع) تُتابَع مع المعرض بالمرجع نفسه.'

/** تنسيق مبلغ بأرقام قياسية مع فواصل الآلاف */
export function formatAmount(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** حالة صالحة من رد النظام أو null — لا قيمة افتراضية ولا تخمين */
export function normalizeStatus(value) {
  if (typeof value !== 'string') return null
  const status = value.trim().slice(0, 32)
  return status || null
}

/** الدفعة المطلوبة: رقم منتهٍ غير سالب من رد النظام، وإلا null */
export function normalizeDepositRequired(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

/** حالة سداد الدفعة: boolean فقط من رد النظام، وإلا null (لا استنتاج) */
export function normalizeDepositPaid(value) {
  return typeof value === 'boolean' ? value : null
}

/** تسمية الحالة للعرض — ترجمة Pending فقط، وأي حالة أخرى تُعرض كما وردت */
export function statusLabel(status) {
  return status === 'Pending' ? 'قيد المراجعة (Pending)' : status
}

/** سطر الحالة: من رد النظام إن وُجد، وإلا إفصاح صريح بأنها غير متاحة */
export function statusLine(result) {
  const status = normalizeStatus(result && result.status)
  return status ? `الحالة حسب رد النظام: ${statusLabel(status)}` : `الحالة: ${STATUS_UNKNOWN_LABEL}`
}

/**
 * أسطر الدفعة المقدمة: القيم من رد النظام عند وجودها، وإلا يُفصل بوضوح
 * بين سياسة المعرض المنشورة (5,000 ج.م) وبين ما لم يؤكده النظام.
 */
export function depositLines(result) {
  const required = normalizeDepositRequired(result && result.depositRequired)
  const paid = normalizeDepositPaid(result && result.depositPaid)
  const lines = []

  if (required != null) {
    lines.push(`الدفعة المقدمة المطلوبة حسب رد النظام: ${formatAmount(required)} ج.م`)
  } else {
    lines.push(
      `الدفعة المقدمة: ${DEPOSIT_UNKNOWN_LABEL}. سياسة المعرض المنشورة على الموقع: ${formatAmount(
        PUBLISHED_DEPOSIT_EGP,
      )} ج.م تُدفع عند تأكيد الطلب في المعرض (سياسة منشورة، وليست قيمة مؤكدة من النظام).`,
    )
  }

  if (paid === true) {
    lines.push('رد النظام يسجّل الدفعة المقدمة كمحصّلة.')
  } else if (paid === false) {
    lines.push('رد النظام يسجّل الدفعة المقدمة كغير محصّلة — تُدفع عند تأكيد المعرض.')
  } else {
    lines.push('حالة سداد الدفعة المقدمة: لم يُرسلها النظام.')
  }

  lines.push('لا يُحصَّل أي دفع إلكتروني عبر هذا الموقع، ولا تؤكد الصفحة أي دفع لم يذكره النظام.')
  return lines
}

/** كل أسطر تأكيد الطلب: الحالة الفعلية + الدفعة + حدود ما تؤكده الصفحة */
export function successLines(result) {
  return [statusLine(result), ...depositLines(result), SUCCESS_CONTACT_NOTE]
}

/**
 * إزالة لافتة فشل/عدم تأكد قديمة عند بدء محاولة أو تحقق جديد.
 * تمسّ كائن حالة الإرسال فقط — المحاولة المعلّقة محفوظة في حالة مستقلة ولا تُمس هنا.
 */
export function clearStaleResult(order) {
  if (!order || typeof order !== 'object') return { phase: 'idle', message: '', success: null }
  if (order.phase === 'error' || order.phase === 'unknown') {
    return { phase: 'idle', message: '', success: null }
  }
  return order
}
