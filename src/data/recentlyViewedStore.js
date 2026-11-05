/**
 * «شوهد مؤخرًا» — تخزين محلي دائم (localStorage) بلا حسابات ولا خادم ولا إرسال بيانات.
 * المفتاح brand|name نفسه المستخدم في الكتالوج والمقارنة والسلة والمفضلة، ويُتحقَّق عند
 * القراءة من وجود الموديل في الكتالوج المُجمَّد — أي مفتاح قديم/محذوف يُسقَط بأمان.
 * فتح صفحة الموديل يرفعه لأعلى القائمة (بلا تكرار) بسقف MAX_RECENT.
 * أي تلف/غياب في التخزين ⇒ قائمة فاضية، بلا أخطاء. منفصل تمامًا عن المفضلة والسلة.
 */
import { CATALOG } from './catalog.js'

export const RECENTLY_VIEWED_STORAGE_KEY = 'motohub.recentlyViewed'

/** سقف السجل — أحدث 10 موديلات فقط (أكثرها استفادة للعودة، وبلا نمو غير محدود) */
export const MAX_RECENT = 10

/** حدث مخصص يُطلَق عند أي تغيير — لتحديث العروض فورًا (نمط المفضلة والسلة نفسه) */
export const RECENTLY_VIEWED_EVENT = 'motohub:recently-viewed-changed'

/** مفاتيح الكتالوج الصالحة حاليًا — المرجع الوحيد لقبول مفتاح محفوظ */
const CATALOG_KEYS = new Set()
for (const group of CATALOG) {
  if (!group || !Array.isArray(group.models)) continue
  for (const model of group.models) {
    if (model && typeof model.name === 'string') CATALOG_KEYS.add(`${group.brand}|${model.name}`)
  }
}

/** تنظيف آمن: نصوص صحيحة + مفتاح موجود في الكتالوج + بلا تكرار */
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
export function readRecentlyViewed() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY) || '[]'))
  } catch {
    return []
  }
}

/** حفظ + إطلاق الحدث — فشل التخزين (وضع خصوصية صارم) يُتجاهَل بصمت */
function persist(items) {
  try {
    localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // التخزين غير متاح — السجل يبقى في الذاكرة لهذه الصفحة فقط
  }
  window.dispatchEvent(new CustomEvent(RECENTLY_VIEWED_EVENT))
}

/**
 * تسجيل فتح صفحة موديل: المفتاح غير الموجود في الكتالوج لا يُسجَّل أبدًا؛
 * مفتاح مدرج مسبقًا يُنقل إلى الأعلى؛ السقف MAX_RECENT يُقص من النهاية (الأقدم).
 */
export function recordModelView(brand, name) {
  if (typeof brand !== 'string' || typeof name !== 'string') return
  const key = `${brand}|${name}`
  if (!CATALOG_KEYS.has(key)) return
  const items = readRecentlyViewed()
  const next = [{ brand, name }, ...items.filter((item) => !(item.brand === brand && item.name === name))]
  persist(next.slice(0, MAX_RECENT))
}

/** إزالة موديل واحد من السجل */
export function removeRecentlyViewed(brand, name) {
  persist(readRecentlyViewed().filter((item) => !(item.brand === brand && item.name === name)))
}

/** تفريغ السجل بالكامل */
export function clearRecentlyViewed() {
  persist([])
}
