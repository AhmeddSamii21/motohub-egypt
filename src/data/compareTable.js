/**
 * بناء جدول المقارنة — دوال نقية (بلا React وبلا تخزين) قابلة للاختبار في Node.
 *
 * الضمانات:
 * - صف واحد لكل مواصفة عبر كل الأعمدة: الصف يُبنى من اتحاد (السعر + التسميات الموجودة
 *   فعليًا في الموديلات المختارة)، وكل خلية تُقرأ من مواصفة التسمية نفسها — لا انزياح ممكن.
 * - «غير متاح» حرفيًا عند غياب المواصفة — لا قيم مُخترعة ولا تقديرات ولا تحويل وحدات.
 * - التمييز «الأفضل» فقط عند قاعدة مقارنة موضوعية موثوقة وكل الموديلات المختارة لديها
 *   قيمة رقمية قابلة للقراءة في الصف نفسه:
 *     · السعر: الأقل أفضل.
 *     · السرعة القصوى: الأعلى أفضل (قياس أداء مباشر).
 *     · سعة الوقود: الأكبر أفضل (مدى أطول لكل تعبئة).
 *   سعة المحرك لا تُرتَّب عمدًا: الأكبر ليس «أفضل» بموضوعية (يختلف حسب الاستخدام).
 * - تساوي كل القيم ⇒ «متساوي» لكل الخلايا بلا فائز. أي نقص ⇒ بلا تمييز إطلاقًا.
 * - المواصفات النصية (ناقل الحركة، الفرامل، الإضاءة...) لا تُرتَّب أبدًا.
 * - ملخص كل موديل يُبنى فقط من نقاط التفوق الموضوعية أعلاه — بلا إعلان فائز عام.
 */
import { CATALOG } from './catalog.js'
import { MODEL_DETAILS } from './generatedModelDetails.js'
import { MODELS as GENERATED_MODELS } from './generatedStock.js'

// أسعار المصادر الجديدة ترد بلا فواصل — نفس منطق العرض المستخدم في الكتالوج وصفحة الموديل
export function formatDisplayPrice(display, source) {
  if (source !== 'stock' && source !== 'price-list') return display
  if (!/^\d+$/.test(display)) return display
  return display.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** عنوان الصفحة المطلوب حرفيًا */
export const COMPARE_PAGE_TITLE = 'مقارنة الموتوسيكلات'

/** نص الخلية عند غياب المواصفة */
export const MISSING_VALUE_LABEL = 'غير متاح'

/** نصوص مفتاح التمييز (legend) */
export const LEGEND_BETTER = 'الأفضل في هذه النقطة'
export const LEGEND_EQUAL = 'متساوي'
export const LEGEND_MISSING = 'غير متاح'

/** ملاحظة السعر قيد المراجعة (نفس علامة * في الكتالوج) */
export const PRICE_REVIEW_NOTE = '* سعر من قائمة قديمة قيد المراجعة مع المصدر.'

/** ملخص موديل بلا نقطة تفوق موضوعية */
export const SUMMARY_NONE = 'لا توجد نقطة يتفوق فيها موضوعيًا من البيانات المعروضة.'

/** تعريف مجموعات المواصفات وصفوفها بترتيب ثابت — فقط الصفوف الموجودة فعلًا في التحديد تُعرض */
export const SPEC_GROUPS = [
  {
    id: 'engine',
    title: 'المحرك والأداء',
    rows: [
      { label: 'نوع المركبة' },
      { label: 'سعة المحرك / القدرة' },
      { label: 'نوع المحرك' },
      { label: 'ناقل الحركة' },
      { label: 'السرعة القصوى', rule: 'higher-better', winLabel: 'سرعة قصوى أعلى' },
      { label: 'نوع تبريد الحرارة' },
      { label: 'نظام حقن الوقود' },
    ],
  },
  {
    id: 'brakes',
    title: 'الفرامل والتعليق',
    rows: [{ label: 'نوع الفرامل' }, { label: 'عدد المساعدين' }],
  },
  {
    id: 'wheels',
    title: 'العجلات والإطارات',
    rows: [{ label: 'مقاس الإطار الأمامي' }, { label: 'مقاس الإطار الخلفي' }],
  },
  {
    id: 'extras',
    title: 'التجهيزات والمواصفات الإضافية',
    rows: [{ label: 'نوع العداد' }, { label: 'نوع الإضائة' }, { label: 'الضمان' }],
  },
]

/** صف السعر: قاعدة موضوعية واحدة — الأقل أفضل */
const PRICE_ROW = { id: 'price', label: 'السعر', rule: 'lower-better', winLabel: 'سعر أقل' }

/** فهارس ثابتة للموديلات والمواصفات والأسعار المُولَّدة — مفتاح brand|name الموحَّد */
const CATALOG_BY_KEY = new Map()
for (const group of CATALOG) {
  for (const model of group.models) {
    CATALOG_BY_KEY.set(`${group.brand}|${model.name}`, { brand: group.brand, name: model.name, price: model.price })
  }
}
const DETAILS_BY_KEY = new Map(MODEL_DETAILS.map((entry) => [`${entry.brand}|${entry.name}`, entry]))
const GENERATED_BY_KEY = new Map(GENERATED_MODELS.map((m) => [`${m.brand}|${m.name}`, m]))

/** أول رقم قابل للقراءة داخل نص المواصفة (مع الفواصل) أو null */
function parseNumber(text) {
  if (typeof text !== 'string') return null
  const match = text.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const value = Number(match[0])
  return Number.isFinite(value) ? value : null
}

/** بناء أعمدة الموديلات من مفاتيح التحديد — السعر يُعرض كما في الكتالوج (بلا اختراع) */
export function buildCompareItems(keys) {
  const items = []
  for (const key of keys) {
    const catalogModel = CATALOG_BY_KEY.get(key)
    if (!catalogModel) continue
    const generated = GENERATED_BY_KEY.get(key)
    const priceText = formatDisplayPrice(generated ? generated.price : catalogModel.price, generated ? generated.source : undefined)
    items.push({
      key,
      brand: catalogModel.brand,
      name: catalogModel.name,
      priceText,
      priceValue: parseNumber(priceText),
      needsReview: Boolean(generated && generated.needsReview),
      specs: Array.isArray(DETAILS_BY_KEY.get(key)?.specs) ? DETAILS_BY_KEY.get(key).specs : [],
    })
  }
  return items
}

/** قيمة المواصفة لنص التسمية، أو null عند الغياب (تُعرض «غير متاح») */
function specValue(item, label) {
  const spec = item.specs.find((entry) => entry && entry.label === label)
  const value = spec && typeof spec.value === 'string' ? spec.value.trim() : ''
  return value || null
}

/**
 * بناء صفوف الجدول من أعمدة جاهزة (buildCompareItems).
 * كل صف: {id, label, rule?, cells, status} حيث cells بنفس ترتيب الأعمدة، وstatus:
 * 'better' (يوجد فائز/فائزون) أو 'equal' (كل القيم متساوية) أو 'none' (بلا تمييز موثوق).
 */
export function buildCompareRows(items) {
  const priceRow = buildRow(PRICE_ROW, items, (item) => (item.priceText ? item.priceValue : null), (item) =>
    item.priceText ? { text: item.priceText + (item.needsReview ? ' *' : ''), missing: false } : { text: MISSING_VALUE_LABEL, missing: true },
  )

  const groups = SPEC_GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    rows: group.rows
      .filter((row) => items.some((item) => specValue(item, row.label) !== null))
      .map((row) => buildRow(row, items, (item) => parseNumber(specValue(item, row.label)), (item) => {
        const value = specValue(item, row.label)
        return value ? { text: value, missing: false } : { text: MISSING_VALUE_LABEL, missing: true }
      })),
  }))
    .filter((group) => group.rows.length > 0)

  return { priceRow, groups }
}

/** بناء صف واحد: خلايا بنفس ترتيب الأعمدة + حالة التمييز الموضوعي */
function buildRow(row, items, parseFor, renderFor) {
  const cells = items.map(renderFor)
  let status = 'none'

  if (row.rule) {
    const parsed = items.map((item) => (row.id === 'price' ? (item.priceText ? item.priceValue : null) : parseFor(item)))
    if (parsed.length > 1 && parsed.every((value) => value !== null)) {
      const unique = [...new Set(parsed)]
      if (unique.length === 1) {
        status = 'equal'
      } else {
        // lower-better: الأقل أفضل؛ higher-better: الأعلى أفضل — الفائز/الفائزون فقط يُعلَّمون
        const best = row.rule === 'lower-better' ? Math.min(...parsed) : Math.max(...parsed)
        status = 'better'
        parsed.forEach((value, index) => {
          if (value !== best) cells[index].highlight = 'none'
          else cells[index].highlight = 'better'
        })
      }
    }
  }

  return { id: row.id, label: row.label, rule: row.rule, winLabel: row.winLabel, cells, status }
}

/** ملخص كل موديل: نقاط التفوق الموضوعية فقط (فوز فردي في صف ذي قاعدة) — بلا فائز عام */
export function buildSummaries(items, rows) {
  const allRows = [rows.priceRow, ...rows.groups.flatMap((group) => group.rows)]
  const summaries = items.map(() => [])
  for (const row of allRows) {
    if (!row.rule || row.status !== 'better') continue
    const winners = row.cells
      .map((cell, index) => (cell.highlight === 'better' ? index : null))
      .filter((index) => index !== null)
    if (winners.length !== 1) continue // تعادل جزئي لا يُنسب لأحد
    summaries[winners[0]].push(row.winLabel)
  }
  return summaries.map((points) => (points.length ? `يتفوق في: ${points.join(' · ')}` : SUMMARY_NONE))
}
