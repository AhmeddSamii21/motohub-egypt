/**
 * منطق عرض السعر/التوفر المشترك بين بطاقات الكتالوج وصفحة الموديل الفردي.
 * المنطق واحد (لا تكرار): المفتاح brand|name نفسه، والتنسيق بأسلوب ج.م الحالي نفسه.
 * استخرج من Catalog.jsx ليغيب تحذير fast-refresh (مكوّن واحد لكل ملف تصدير).
 */
import { MODELS as GENERATED_MODELS } from './generatedStock'

export const GENERATED_BY_KEY = new Map(GENERATED_MODELS.map((m) => [`${m.brand}|${m.name}`, m]))

// أسعار المصادر الجديدة في الكتاب ترد بلا فواصل الآلاف — نعرضها بأسلوب ج.م الحالي نفسه
export function formatDisplayPrice(display, source) {
  if (source !== 'stock' && source !== 'price-list') return display
  if (!/^\d+$/.test(display)) return display
  return display.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
