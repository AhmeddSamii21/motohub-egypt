/**
 * تحديد الموديلات للمقارنة — تخزين محلي دائم (localStorage) بلا خادم ولا إرسال بيانات.
 * نفس النمط المستخدم في المفضلة والسلة: مفاتيح brand|name تُتحقَّق من الكتالوج المُجمَّد،
 * حد أقصى 3 موديلات (MAX_COMPARE نفسه الذي كان في Catalog)، حدث مخصص للتحديث الفوري،
 * ومنفصل تمامًا عن السلة والمفضلة والطلبات. أي تلف/غياب في التخزين ⇒ قائمة فاضية بلا أخطاء.
 * الاستمرارية عبر إعادة التحميل مقصودة: التحديد لا يضيع عند فتح صفحة المقارنة الكاملة.
 */
import { CATALOG } from './catalog.js'

export const COMPARE_STORAGE_KEY = 'motohub.compare'

/** حدث مخصص يُطلَق عند أي تغيير في تحديد المقارنة */
export const COMPARE_EVENT = 'motohub:compare-changed'

/** الحد الأقصى للمقارنة في المرة الواحدة — نفس حد أداة الكتالوج الحالية */
export const COMPARE_LIMIT = 3

/** مفاتيح الكتالوج الصالحة حاليًا — المرجع الوحيد لقبول مفتاح محفوظ */
const CATALOG_KEYS = new Set()
for (const group of CATALOG) {
  if (!group || !Array.isArray(group.models)) continue
  for (const model of group.models) {
    if (model && typeof model.name === 'string') CATALOG_KEYS.add(`${group.brand}|${model.name}`)
  }
}

/** تنظيف آمن: نصوص ماركة|اسم صحيحة وموجودة في الكتالوج وبلا تكرار وبسقف 3 */
function sanitize(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const keys = []
  for (const entry of raw) {
    if (typeof entry !== 'string') continue
    if (!seen.has(entry) && CATALOG_KEYS.has(entry)) {
      seen.add(entry)
      keys.push(entry)
    }
    if (keys.length === COMPARE_LIMIT) break
  }
  return keys
}

/** القراءة الآمنة — تلف/غياب التخزين يُرجع قائمة فاضية ولا يرمي أبدًا */
export function readCompareKeys() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(COMPARE_STORAGE_KEY) || '[]'))
  } catch {
    return []
  }
}

/** حفظ + إطلاق الحدث — فشل التخزين (وضع خصوصية صارم) يُتجاهَل بصمت */
function persist(keys) {
  try {
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(keys))
  } catch {
    // التخزين غير متاح — التحديد يبقى في الذاكرة لهذه الصفحة فقط
  }
  window.dispatchEvent(new CustomEvent(COMPARE_EVENT))
}

/** هل الموديل ضمن تحديد المقارنة؟ */
export function isCompared(key) {
  return readCompareKeys().includes(key)
}

/**
 * تبديل موديل في التحديد — نفس سلوك أداة الكتالوج الحالي:
 * موجود ⇒ يُزال، غير موجود والسقف مكتمل ⇒ لا تغيير، غير ذلك يُضاف.
 * يعيد قائمة المفاتيح بعد التغيير.
 */
export function toggleCompareKey(key) {
  const keys = readCompareKeys()
  let next
  if (keys.includes(key)) next = keys.filter((k) => k !== key)
  else if (keys.length >= COMPARE_LIMIT) next = keys
  else next = [...keys, key]
  persist(next)
  return next
}

/** إزالة موديل واحد من تحديد المقارنة */
export function removeCompareKey(key) {
  const next = readCompareKeys().filter((k) => k !== key)
  persist(next)
  return next
}

/** مسح التحديد بالكامل */
export function clearCompareKeys() {
  persist([])
  return []
}
