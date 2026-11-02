/**
 * تجميع المواصفات — المصدر الوحيد لتقسيم المواصفات المُولَّدة إلى مجموعات.
 * تستهلكه صفحة المقارنة (صفوف الجدول وقواعد التمييز) وصفحة الموديل (عرض مُنظَّم) —
 * بلا تكرار لمصدر الحقيقة. التسميات حرفيًا كما في generatedModelDetails؛ الصف
 * غير الموجود في مواصفات التحديد لا يُعرض أبدًا، والمفقود يظهر «غير متاح» في المقارنة.
 *
 * قواعد التمييز (المقارنة فقط): قواعد موضوعية موثوقة وحدها:
 *   - السعر: الأقل أفضل (صف مستقل خارج هذه المجموعات).
 *   - السرعة القصوى: الأعلى أفضل (أداء مباشر).
 *   - سعة الوقود: الأكبر أفضل (مدى أطول لكل تعبئة).
 *   سعة المحرك لا تُرتَّب عمدًا: الأكبر ليس أفضل بموضوعية (يختلف حسب الاستخدام).
 *   المواصفات النصية (ناقل الحركة، الفرامل، الإضاءة...) لا تُرتَّب أبدًا.
 */

/** نص الخلية عند غياب المواصفة في جدول المقارنة */
export const MISSING_VALUE_LABEL = 'غير متاح'

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
      { label: 'سعة الوقود / الشحنة الكاملة', rule: 'higher-better', winLabel: 'سعة وقود أكبر (مدى أطول)' },
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

/** قيمة مواصفة نصية لِتسمية محددة أو null عند الغياب/الفراغ */
export function specValueOf(specs, label) {
  if (!Array.isArray(specs)) return null
  const spec = specs.find((entry) => entry && entry.label === label)
  const value = spec && typeof spec.value === 'string' ? spec.value.trim() : ''
  return value || null
}

/**
 * عرض مواصفات موديل واحد مُجمَّعة بالمجموعات المعتمدة — للصفحة الفردية.
 * فقط الصفوف الموجودة فعلًا في specs تُعاد؛ المجموعة الفارغة لا تظهر. لا قيم مخترعة.
 */
export function groupSpecsForDisplay(specs) {
  const groups = []
  for (const group of SPEC_GROUPS) {
    const entries = []
    for (const row of group.rows) {
      const value = specValueOf(specs, row.label)
      if (value) entries.push({ label: row.label, value })
    }
    if (entries.length > 0) groups.push({ id: group.id, title: group.title, entries })
  }
  return groups
}
