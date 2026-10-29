/**
 * سجل الطلبات المحلي للعميل — ذاكرة المتصفح فقط (localStorage)، بلا أي اتصال بالخادم.
 *
 * الغرض: بعد نجاح إرسال الطلب إلى نظام طلبات المعرض (ordersApi) تُحفَظ نسخة قيادية
 * صغيرة (المرجع + تاريخ الإرسال + العناصر + الحالة كما وردت لحظة الإرسال) حتى لا يضيع
 * مرجع الطلب عند إغلاق الصفحة — العميل ينسخه أو يتابع طلبه مع المعرض بالمرجع نفسه.
 *
 * قواعد صارمة:
 * - لا طلبات ولا كتابة خارجية من هنا — هذا سجل قراءة/كتابة محلي فقط.
 * - لا تُخمَّن أي تحديثات حالة لاحقة: الحالة المحفوظة = كما وردت من الخادم لحظة الإرسال.
 * - القراءة آمنة دائمًا: بيانات تالفة/ناقصة/مجهولة البنية ⇒ تُتجاهَل بصمت ولا يُرمى استثناء أبدًا.
 * - سقف 10 سجلات (الأحدث أولًا) والمرجع مفتاح فريد — مطبَّقان على الكتابة والقراءة معًا؛
 *   إعادة حفظ نفس المرجع تستبدل سجله.
 */

/** مفتاح التخزين في localStorage */
export const ORDER_HISTORY_KEY = 'motohub.orders'

/** سقف عدد السجلات المحفوظة */
const MAX_RECORDS = 10

/** التخزين المتاح أو null — القراءة/الحفظ بأمان حتى لو localStorage غير متاح (وضع خاص/مقفل) */
function storage() {
  try {
    return globalThis.localStorage || null
  } catch {
    return null
  }
}

/** تنظيف سجل واحد: سجل نظيف أو null — لا افتراضات ولا قيم مُخترَعة */
function sanitizeRecord(value) {
  if (!value || typeof value !== 'object') return null
  const orderRef = typeof value.orderRef === 'string' ? value.orderRef.trim().slice(0, 64) : ''
  if (!orderRef) return null
  const createdAt =
    typeof value.createdAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value.createdAt) ? value.createdAt : ''
  if (!createdAt) return null
  const status = typeof value.status === 'string' && value.status ? value.status.slice(0, 32) : 'Pending'
  const depositRequired =
    Number.isInteger(value.depositRequired) && value.depositRequired >= 0 ? value.depositRequired : null
  const items = (Array.isArray(value.items) ? value.items : [])
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const brand = typeof item.brand === 'string' ? item.brand.trim().slice(0, 80) : ''
      const name = typeof item.name === 'string' ? item.name.trim().slice(0, 120) : ''
      const qty = Number.isInteger(item.qty) && item.qty > 0 ? item.qty : 0
      return brand && name && qty ? { brand, name, qty } : null
    })
    .filter(Boolean)
    .slice(0, 20)
  if (!items.length) return null
  return { orderRef, createdAt, status, depositRequired, items }
}

/** قراءة السجل (الأحدث أولًا) — تعيد [] دائمًا عند أي مشكلة، ولا تُرمي استثناءات */
export function readOrderHistory() {
  try {
    const store = storage()
    const raw = store ? store.getItem(ORDER_HISTORY_KEY) : null
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // السقف نفسه مطبَّق حتى على القراءة (تحصين ضد بيانات مُعدَّلة يدويًا)،
    // مع إزالة تكرار المرجع إن وُجد — أول ظهور يفوز (الترتيب المخزَّن كما هو)
    const seen = new Set()
    const records = []
    for (const record of parsed.map(sanitizeRecord).filter(Boolean)) {
      if (seen.has(record.orderRef)) continue
      seen.add(record.orderRef)
      records.push(record)
      if (records.length === MAX_RECORDS) break
    }
    return records
  } catch {
    return []
  }
}

/**
 * حفظ سجل بعد نجاح الإرسال فقط (يُستدعى من مسار result.ok في Cart.jsx).
 * يعيد السجل المحفوظ أو null (تخزين غير متاح) — نجاح الإرسال نفسه لا يتأثر أبدًا.
 */
export function saveOrderRecord(input) {
  if (!input || typeof input !== 'object') return null
  const record = sanitizeRecord({
    ...input,
    createdAt:
      typeof input.createdAt === 'string' && input.createdAt ? input.createdAt : new Date().toISOString(),
  })
  if (!record) return null
  const store = storage()
  if (!store) return null
  try {
    const rest = readOrderHistory().filter((saved) => saved.orderRef !== record.orderRef)
    store.setItem(ORDER_HISTORY_KEY, JSON.stringify([record, ...rest].slice(0, MAX_RECORDS)))
    return record
  } catch {
    return null
  }
}
