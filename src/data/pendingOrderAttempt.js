/**
 * محاولة إرسال طلب غير محسومة — سجل واحد فقط في localStorage.
 *
 * المشكلة: عند فشل الشبكة أو رد غير قابل للقراءة لا يعرف المتصفح هل وصل الطلب للمعرض.
 * إن نسي المتصفح المرجع بعد إعادة التحميل قد يُنشئ طلبًا جديدًا بمرجع جديد لطلب ربما
 * سُجِّل أصلًا. لذلك نحفظ هنا المرجع + الحِمل المُرسَل بالضبط + بصمة ثابتة، ولا نحذف
 * السجل إلا بعد نتيجة قاطعة (نجاح من الخادم أو رفض صريح منه) أو تجاهل صريح من المستخدم.
 *
 * قواعد:
 * - لا اتصال بالخادم من هنا: قراءة/كتابة محلية فقط، ولا تُرمى استثناءات أبدًا.
 * - لا تُخزَّن أي بيانات دفع؛ الحِمل يحتوي الاسم/الهاتف/العنوان/الملاحظات لأن إعادة
 *   الإرسال «بنفس البيانات تمامًا» تتطلبها، ثم يُحذف السجل بعد حسم المحاولة.
 * - البصمة أداة مقارنة داخلية (ليست تشفيرًا) — تمنع إرسال حِمل مختلف تحت نفس المرجع.
 * - «sending» تعني أُرسل الطلب ولم تُحسم النتيجة بعد (أو أُغلقت الصفحة أثناء الإرسال)،
 *   و«unknown» تعني نتيجة غير مؤكدة. كلتاهما غير محسومة عند إعادة التحميل.
 * - المفتاح: motohub.pendingOrder — سجل واحد، بلا صلاحية زمنية (لا يُهمَل تلقائيًا).
 */

/** مفتاح التخزين في localStorage */
export const PENDING_ATTEMPT_KEY = 'motohub.pendingOrder'

/** الحد الأقصى لعدد أسطر الطلب المحفوظة (أكبر من أي سلة واقعية) */
const MAX_ITEMS = 100

/** قصّ نص مع تطبيع المسافات الطرفية */
function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/** التخزين المتاح أو null — حتى لو localStorage ممنوع/مقفل */
function storage() {
  try {
    return globalThis.localStorage || null
  } catch {
    return null
  }
}

/** تمثيل قانوني (مفاتيح مرتبة) — نفس الحِمل يعطي نفس النص دائمًا */
function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

/** بصمة ثابتة للحِمل — للمقارنة فقط، وليست حماية تشفيرية */
export function fingerprintPayload(payload) {
  const canonical = canonicalize(payload)
  let hash = 5381
  for (let index = 0; index < canonical.length; index += 1) {
    hash = ((hash << 5) + hash + canonical.charCodeAt(index)) >>> 0
  }
  return `${canonical.length.toString(36)}-${hash.toString(16)}`
}

/** تنظيف الحِمل: الحقول التي يرسلها ordersApi فقط، أو null إن كان غير صالح */
function sanitizePayload(payload) {
  if (!payload || typeof payload !== 'object') return null
  const orderRef = text(payload.orderRef, 64)
  const customerName = text(payload.customerName, 120)
  const phone = text(payload.phone, 32)
  const address = text(payload.address, 300)
  if (!orderRef || !customerName || !phone || !address) return null
  if (!Array.isArray(payload.items)) return null
  if (!payload.items.length || payload.items.length > MAX_ITEMS) return null
  const items = payload.items.map((item) => {
    if (!item || typeof item !== 'object') return null
    const brand = text(item.brand, 80)
    const name = text(item.name, 120)
    const qty = Number(item.qty)
    if (!brand || !name || !Number.isInteger(qty) || qty < 1 || qty > 99) return null
    return { brand, name, qty }
  })
  if (items.some((item) => item === null)) return null
  return {
    orderRef,
    customerName,
    phone,
    address,
    customerNotes: text(payload.customerNotes, 500),
    items,
  }
}

/** تنظيف سجل محفوظ: البصمة تُعاد حسابها وتجب مطابقتها، وإلا يُعتبر تالفًا */
function sanitizeAttempt(value) {
  if (!value || typeof value !== 'object') return null
  const orderRef = text(value.orderRef, 64)
  if (!orderRef) return null
  const payload = sanitizePayload(value.payload)
  if (!payload) return null
  // المرجع نفسه في السجل وفي الحِمل — أي اختلاف يعني سجلًا تالفًا
  if (payload.orderRef !== orderRef) return null
  const fingerprint = fingerprintPayload(payload)
  if (value.fingerprint !== fingerprint) return null
  const createdAt =
    typeof value.createdAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value.createdAt) ? value.createdAt : ''
  if (!createdAt) return null
  // أي حالة غير معروفة تُعامَل كمحاولة غير محسومة (الأكثر أمانًا)
  const state = value.state === 'sending' ? 'sending' : 'unknown'
  return { orderRef, payload, fingerprint, state, createdAt }
}

/** إنشاء سجل محاولة بحالة sending — أو null إن كان الحِمل غير صالح */
export function buildPendingAttempt(orderRef, payload) {
  const ref = text(orderRef, 64)
  const clean = sanitizePayload(payload)
  if (!ref || !clean) return null
  return {
    orderRef: ref,
    payload: clean,
    fingerprint: fingerprintPayload(clean),
    state: 'sending',
    createdAt: new Date().toISOString(),
  }
}

/** حفظ المحاولة — يعيد السجل المحفوظ أو null عند أي فشل (لا ادعاء بحفظ لم يحدث) */
export function savePendingAttempt(attempt) {
  const clean = sanitizeAttempt(attempt)
  if (!clean) return null
  const store = storage()
  if (!store) return null
  try {
    store.setItem(PENDING_ATTEMPT_KEY, JSON.stringify(clean))
    return clean
  } catch {
    return null
  }
}

/** قراءة المحاولة غير المحسومة — null عند الغياب/التلف/عدم توفر التخزين */
export function readPendingAttempt() {
  try {
    const store = storage()
    const raw = store ? store.getItem(PENDING_ATTEMPT_KEY) : null
    if (!raw) return null
    return sanitizeAttempt(JSON.parse(raw))
  } catch {
    return null
  }
}

/** حذف المحاولة — true إن أمكن إزالة السجل/كان غير موجود، false عند فشل التخزين */
export function clearPendingAttempt() {
  const store = storage()
  if (!store) return false
  try {
    store.removeItem(PENDING_ATTEMPT_KEY)
    return true
  } catch {
    return false
  }
}

/** هل الحِمل المعطى مطابق تمامًا للحِمل المحفوظ؟ (مقارنة بصمة) */
export function matchesPendingPayload(attempt, payload) {
  if (!attempt) return false
  const clean = sanitizePayload(payload)
  if (!clean) return false
  return fingerprintPayload(clean) === attempt.fingerprint
}

/**
 * تطبيق نتيجة إرسال على المحاولة:
 * - success | rejected (نتيجة قاطعة من الخادم) ⇒ حذف السجل.
 * - أي شيء آخر (شبكة/رد غير مقروء) ⇒ إبقاء السجل بحالة unknown.
 * يعيد {attempt, cleared, persisted} حيث persisted=false يعني أن الكتابة لم تنجح
 * فيبقى السجل في الذاكرة فقط (إعادة تحميل الصفحة ستفقده).
 */
export function applySubmissionOutcome(attempt, outcome) {
  if (!attempt) return { attempt: null, cleared: false, persisted: false }
  if (outcome === 'success' || outcome === 'rejected') {
    return { attempt: null, cleared: clearPendingAttempt(), persisted: false }
  }
  const next = { ...attempt, state: 'unknown' }
  const saved = savePendingAttempt(next)
  return { attempt: saved || next, cleared: false, persisted: Boolean(saved) }
}
