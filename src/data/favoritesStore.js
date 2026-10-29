/**
 * المفضلة — تخزين محلي دائم (localStorage) بلا حسابات ولا خادم ولا إرسال بيانات.
 * مفتاح كل موديل هو brand|name نفسه المستخدم في الكتالوج والمقارنة والسلة، ويُتحقَّق عند
 * القراءة من وجود الموديل في الكتالوج المُجمَّد — أي مفاتيح قديمة/مُهمَلة تُسقَط بأمان
 * (ولا يُحذف ما فُهم منه نصف). منفصلة تمامًا عن السلة: مفتاح تخزين وحدث مختلفان،
 * ولا تلمس حالة الشراء أو الدفع إطلاقًا. أي تلف/غياب في التخزين ⇒ قائمة فاضية، بلا أخطاء.
 */
import { CATALOG } from './catalog'

export const FAVORITES_STORAGE_KEY = 'motohub.favorites'

/** حدث مخصص يُطلَق عند أي تغيير — لتحديث الشارة والصفحات فورًا (نمط السلة نفسه) */
export const FAVORITES_EVENT = 'motohub:favorites-changed'

/** مفاتيح الكتالوج الصالحة حاليًا — المرجع الوحيد لقبول مفتاح محفوظ */
const CATALOG_KEYS = new Set()
for (const group of CATALOG) {
  if (!group || !Array.isArray(group.models)) continue
  for (const model of group.models) {
    if (model && typeof model.name === 'string') CATALOG_KEYS.add(`${group.brand}|${model.name}`)
  }
}

/** تنظيف آمن: عناصر نصية صحيحة + مفتاح موجود في الكتالوج + بلا تكرار */
function sanitize(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const items = []
  for (const entry of raw) {
    if (!entry || typeof entry.brand !== 'string' || typeof entry.name !== 'string') continue
    const key = `${entry.brand}|${entry.name}`
    if (!seen.has(key) && CATALOG_KEYS.has(key)) {
      seen.add(key)
      items.push({ brand: entry.brand, name: entry.name })
    }
  }
  return items
}

/** القراءة الآمنة — تلف/غياب التخزين يُرجع قائمة فاضية ولا يرمي أبدًا */
export function readFavorites() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]'))
  } catch {
    return []
  }
}

/** حفظ + إطلاق الحدث — فشل التخزين (وضع خصوصية صارم) يُتجاهَل بصمت */
function persist(items) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // التخزين غير متاح — المفضلة تبقى في الذاكرة لهذه الصفحة فقط
  }
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT))
}

/** هل الموديل في المفضلة؟ */
export function isFavorite(brand, name) {
  return readFavorites().some((item) => item.brand === brand && item.name === name)
}

/** تبديل حالة موديل — يعيد true لو صار مفضَّلًا وfalse لو أُزيل */
export function toggleFavorite(brand, name) {
  const items = readFavorites()
  const exists = items.some((item) => item.brand === brand && item.name === name)
  const next = exists
    ? items.filter((item) => !(item.brand === brand && item.name === name))
    : [...items, { brand, name }]
  persist(next)
  return !exists
}

/** إزالة موديل واحد من المفضلة (مستخدمة من عرض المفضلة) */
export function removeFavorite(brand, name) {
  persist(readFavorites().filter((item) => !(item.brand === brand && item.name === name)))
}

/** عدد الموديلات المفضَّلة (عدد الموديلات لا القطع) — للشارة في الهيدر */
export function favoritesCount() {
  return readFavorites().length
}
