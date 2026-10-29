/**
 * «تحديثات الأسعار» — مقارنة حتمية بين سعر قائمة الكتالوج المُجمَّدة (الإصدار الأقدم)
 * والسعر الحالي من ملف البيانات المُولَّد (أولوية السعر: Stock ← قائمة الأسعار ← الكتالوج مع مراجعة).
 * - التغيّر يُعرض فقط عندما يكون للطرفين سعر رقمي قابل للقراءة والمصدر الحالي موثوق
 *   (stock أو price-list). موديلات needsReview (مصدرها الكتالوج نفسه) مستبعدة من المقارنة —
 *   سعرها هو سعر الكتالوج أصلاً ومعلَّم للمراجعة، ولا يُقدَّم أبدًا كتغيير مُتحقَّق.
 * - لا يوجد في المصادر سجل تواريخ لإضافة الموديلات أو لتوقيت تغيّر الأسعار — لا تُختلق
 *   تواريخ إطلاقًا؛ الطابع الزمني الوحيد الموثوق هو META.generatedAt (توليد بيانات الأسعار الحالية).
 * - الدوال لا ترمي استثناءً أبدًا: مُدخل/بنية غريبة ⇒ نتيجة فارغة صادقة.
 */
import { CATALOG } from './catalog'
import { GENERATED_BY_KEY, formatDisplayPrice } from './modelDisplay'
import { META } from './generatedStock'
import { parseCatalogPrice } from './recommender'

/**
 * يجمع تغيّرات الأسعار المُتحقَّقة بين الكتالوج المُجمَّد والأسعار الحالية المولَّدة.
 * يعيد { ok, generatedAt, checkedCount, changedCount, changes[] } — الترتيب حتمي:
 * الماركة ثم الاسم (مقارنة نقاط ترميز — بلا Intl).
 */
export function getCatalogUpdates() {
  const changes = []
  let checkedCount = 0
  for (const group of CATALOG) {
    if (!group || !Array.isArray(group.models)) continue
    for (const model of group.models) {
      if (!model || typeof model.name !== 'string') continue
      const info = GENERATED_BY_KEY.get(`${group.brand}|${model.name}`)
      // بلا سجل مولَّد مُطابَق ⇒ لا سعر حالي موثوق للمقارنة؛ needsReview ⇒ مستبعد بالكامل
      if (!info || info.needsReview) continue
      const oldPrice = parseCatalogPrice(model.price)
      const newPrice = parseCatalogPrice(info.price)
      if (oldPrice == null || newPrice == null) continue
      checkedCount += 1
      if (newPrice === oldPrice) continue
      changes.push({
        brand: group.brand,
        name: model.name,
        oldPrice,
        newPrice,
        // القديمة من قائمة أسعار مُصدَرة (تنسيق آلاف ج.م نفسه) والحالية من مصدرها المولَّد
        oldDisplay: formatDisplayPrice(model.price, 'price-list'),
        newDisplay: formatDisplayPrice(info.price, info.source),
        direction: newPrice > oldPrice ? 'up' : 'down',
      })
    }
  }
  changes.sort(
    (a, b) =>
      (a.brand < b.brand ? -1 : a.brand > b.brand ? 1 : 0) ||
      (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  )
  return {
    ok: true,
    generatedAt: META && typeof META.generatedAt === 'string' ? META.generatedAt : null,
    checkedCount,
    changedCount: changes.length,
    changes,
  }
}
