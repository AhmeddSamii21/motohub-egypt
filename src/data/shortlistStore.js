/**
 * القائمة القابلة للمشاركة — تخزين محلي دائم (localStorage) بلا خادم ولا إرسال بيانات.
 * يمكن للمستخدم اختيار مجموعة من الموديلات والمشاركة عبر رابط واحد.
 * مفاتيح brand|name تُتحقَّق من الكتالوج المُجمَّد، حد أقصى 10 موديلات، حدث مخصص للتحديث الفوري،
 * ومنفصل تمامًا عن المفضلة والمقارنة والسلة والسجل الحديث. أي تلف/غياب في التخزين ⇒ قائمة فاضية بلا أخطاء.
 */
import { CATALOG } from './catalog.js'

export const SHORTLIST_STORAGE_KEY = 'motohub.shortlist'

/** حدث مخصص يُطلَق عند أي تغيير في القائمة القابلة للمشاركة */
export const SHORTLIST_EVENT = 'motohub:shortlist-changed'

/** الحد الأقصى للقائمة القابلة للمشاركة في المرة الواحدة */
export const SHORTLIST_LIMIT = 10

/** مفاتيح الكتالوج الصالحة حاليًا — المرجع الوحيد لقبول مفتاح محفوظ */
const CATALOG_KEYS = new Set()
for (const group of CATALOG) {
  if (!group || !Array.isArray(group.models)) continue
  for (const model of group.models) {
    if (model && typeof model.name === 'string') CATALOG_KEYS.add(`${group.brand}|${model.name}`)
  }
}

/** تنظيف آمن: نصوص ماركة|اسم صحيحة وموجودة في الكتالوج وبلا تكرار وبسقف SHORTLIST_LIMIT */
export function sanitize(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const keys = []
  for (const entry of raw) {
    if (typeof entry !== 'string') continue
    if (!seen.has(entry) && CATALOG_KEYS.has(entry)) {
      seen.add(entry)
      keys.push(entry)
    }
    if (keys.length === SHORTLIST_LIMIT) break
  }
  return keys
}

/** القراءة الآمنة — تلف/غياب التخزين يُرجع قائمة فاضية ولا يرمي أبدًا */
export function readShortlistKeys() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(SHORTLIST_STORAGE_KEY) || '[]'))
  } catch {
    return []
  }
}

/** حفظ + إطلاق الحدث — فشل التخزين (وضع خصوصية صارم) يُتجاهَل بصمت */
function persist(keys) {
  try {
    localStorage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify(keys))
  } catch {
    // التخزين غير متاح — القائمة تبقى في الذاكرة لهذه الصفحة فقط
  }
  window.dispatchEvent(new CustomEvent(SHORTLIST_EVENT))
}

/** هل الموديل ضمن القائمة القابلة للمشاركة؟ */
export function isInShortlist(key) {
  return readShortlistKeys().includes(key)
}

/**
 * تبديل موديل في القائمة — نفس سلوك أداة المقارنة الحالي:
 * موجود ⇒ يُزال، غير موجود والسقف مكتمل ⇒ لا تغيير، غير ذلك يُضاف.
 * يعيد قائمة المفاتيح بعد التغيير.
 */
export function toggleShortlistKey(key) {
  const keys = readShortlistKeys()
  let next
  if (keys.includes(key)) next = keys.filter((k) => k !== key)
  else if (keys.length >= SHORTLIST_LIMIT) next = keys
  else next = [...keys, key]
  persist(next)
  return next
}

/** إزالة موديل واحد من القائمة القابلة للمشاركة */
export function removeShortlistKey(key) {
  const next = readShortlistKeys().filter((k) => k !== key)
  persist(next)
  return next
}

/** مسح القائمة بالكامل */
export function clearShortlistKeys() {
  persist([])
  return []
}

/** ترميز القائمة للرابط — مفتاح URL آمن */
export function encodeShortlistForUrl(keys) {
  if (!Array.isArray(keys) || keys.length === 0) return ''
  try {
    // ترميز Base64 مع استبدال الأحرف غير الآمنة في URL
    const encoded = btoa(JSON.stringify(keys))
    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  } catch {
    return ''
  }
}

/** تنظيف للمفاتيح الواردة من الرابط فقط — نصوص بلا تكرار وبسقف، بلا فحص الكتالوج
 * (فحص الكتالوج يبقى للصفحة المستقبِلة لكي تحصي الموديلات المفقودة وتحذّر بدل إسقاطها بصمت) */
function sanitizeUrlKeys(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const keys = []
  for (const entry of raw) {
    if (typeof entry !== 'string' || entry.trim() === '' || seen.has(entry)) continue
    seen.add(entry)
    keys.push(entry)
    if (keys.length === SHORTLIST_LIMIT) break
  }
  return keys
}

/** فك ترميز القائمة من الرابط — يعيد المفاتيح بلا فحص كتالوج */
export function decodeShortlistFromUrl(encoded) {
  if (!encoded) return []
  try {
    // استعادة Base64 مع إصلاح الأحرف المستبدلة
    const padding = '='.repeat((4 - encoded.length % 4) % 4)
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/') + padding
    const keys = JSON.parse(atob(base64))
    return sanitizeUrlKeys(keys)
  } catch {
    return []
  }
}

/** الحصول على بيانات الموديلات الكاملة للعرض */
export function getShortlistModels(keys) {
  const validKeys = sanitize(keys)
  const models = []
  
  for (const group of CATALOG) {
    if (!group || !Array.isArray(group.models)) continue
    for (const model of group.models) {
      if (!model || typeof model.name !== 'string') continue
      const key = `${group.brand}|${model.name}`
      if (validKeys.includes(key)) {
        models.push({
          brand: group.brand,
          name: model.name,
          key,
          price: model.price
        })
      }
    }
  }
  
  return models
}

/** الحصول على عدد الموديلات في القائمة القابلة للمشاركة */
export function shortlistCount() {
  return readShortlistKeys().length
}