/**
 * روابط موديلات الكتالوج — توليد (modelHref) وحلّ دقيق (resolveModelUrl).
 * بلا اعتماديات ولا مطابقة ضبابية: الحل يعني بالمطابقة التامة على جدول مُحكوم مبني من
 * CATALOG نفسه. أسماء الموديلات تحوي العربية والقوائم والرموز/الإيموجي؛ slugify يحفظ
 * أرقامًا وحروفًا لاتينية وفواصل فقط، وأي تعارض داخل نفس الماركة يُحلّ بلصق رقم التتابع
 * (الترتيب التوثيقي للكتالوج مجمد، فيبقى العنوان المولّد ثابتًا ومتنبأًا). لا تخمين أبدًا.
 */
import { CATALOG } from './catalog'

const MODEL_ROUTE_RE = /^#\/m\/([^/]+)\/([^/]+)$/

/** حروف وأرقام وفواصل فقط — أي شيء آخر (عربية/أقواس/إيموجي) يُقرَص؛ الفارغ يصير 'model' */
const slugify = (text) =>
  String(text).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '') || 'model'

const byBrandSlug = new Map()
const hrefByModelKey = new Map() // 'brand|name' → '#/m/<brandSlug>/<modelSlug>' (نفس مفتاح المقارنة)

for (const group of CATALOG) {
  const brandSlug = slugify(group.brand)
  let byModelSlug = byBrandSlug.get(brandSlug)
  if (!byModelSlug) {
    byModelSlug = new Map()
    byBrandSlug.set(brandSlug, byModelSlug)
  }
  const occurrence = new Map() // عدد مرات القاعدة نفسها داخل هذه الماركة
  for (const model of group.models) {
    const base = slugify(model.name)
    const seen = (occurrence.get(base) || 0) + 1
    occurrence.set(base, seen)
    let slug = seen > 1 ? `${base}-${seen}` : base
    while (byModelSlug.has(slug)) slug += '-x' // حماية من تعارض نظري شديد الندرة — حتمي أيضًا
    byModelSlug.set(slug, { brand: group.brand, model })
    hrefByModelKey.set(`${group.brand}|${model.name}`, `#/m/${brandSlug}/${slug}`)
  }
}

/** رابط صفحة الموديل لمفتاح (brand|name) — دائمًا محكوم من الجدول أعلاه */
export function modelHref(brand, name) {
  return hrefByModelKey.get(`${brand}|${name}`) || null
}

/**
 * حلّ الهاش #/m/<brand>/<model> بمطابقة تامة على الجدول — بلا تخمين.
 * يُعيد { brandSlug, modelSlug, brand, model:{name,price} } أو null إن لم يتطابق شيء.
 */
export function resolveModelUrl(hash) {
  const match = typeof hash === 'string' ? hash.match(MODEL_ROUTE_RE) : null
  if (!match) return null
  let brandSlug, modelSlug
  try {
    brandSlug = decodeURIComponent(match[1])
    modelSlug = decodeURIComponent(match[2])
  } catch {
    return null // بروسينغ سيّئ يُتراجع عنه بصمت — التوجيه إلى الكتالوج
  }
  const byModelSlug = byBrandSlug.get(brandSlug)
  if (!byModelSlug) return null
  const entry = byModelSlug.get(modelSlug)
  return entry ? { brandSlug, modelSlug, brand: entry.brand, model: entry.model } : null
}
