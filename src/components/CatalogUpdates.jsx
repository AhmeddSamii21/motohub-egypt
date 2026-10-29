import { getCatalogUpdates } from '../data/catalogUpdates'
import './CatalogUpdates.css'

/**
 * «تحديثات الأسعار» — الصدق أولًا:
 * - المعروض هو تغيّرات الأسعار المُتحقَّقة فقط: سعر الكتالوج المُجمَّد (إصدار أقدم مُصدَر)
 *   مقابل السعر الحالي من آخر مزامنة مع ملف المعرض (Stock أو قائمة الأسعار).
 * - لا تواريخ تغيّر لكل موديل ولا سجل إضافة موديلات في المصادر — لا تُعرض تواريخ مُختلقة،
 *   ويُصرَّح بذلك على الصفحة. الطابع الموثوق الوحيد: تاريخ توليد بيانات الأسعار الحالية.
 * - موديلات needsReview (*) مستبعدة من المقارنة ولا تُقدَّم أسعارها كتغيير مُتحقَّق.
 */

/** ISO ⇒ «YYYY/MM/DD HH:MM» بصيغة ثابتة بلا Intl — قيم غير صالحة تُرجع نص الخام */
function formatIsoDate(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function CatalogUpdates() {
  const result = getCatalogUpdates()
  const generatedAtDisplay = result.generatedAt ? formatIsoDate(result.generatedAt) : null

  return (
    <section className="section catalog-updates" id="updates-model">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">تحديثات الأسعار</p>
          <h2 className="section-title">تغييرات الأسعار المُتحقَّقة</h2>
          <p className="section-sub">
            مقارنة مباشرة بين سعر قائمة الكتالوج المُصدَرة (الإصدار الأقدم) والسعر الحالي من
            آخر مزامنة مع ملف المعرض — تُعرض هنا التغييرات الحقيقية فقط.
          </p>
        </div>

        <div className="upd-panel">
          <div className="upd-meta">
            <p className="upd-count" aria-live="polite">
              {result.changedCount === 0
                ? 'لا توجد تغييرات أسعار مُتحقَّقة حاليًا — الأسعار الحالية مطابقة لقائمة الكتالوج.'
                : `${result.changedCount} موديل تغيّر سعره من إجمالي ${result.checkedCount} موديل قابلين للمقارنة`}
            </p>
            {generatedAtDisplay && (
              <p className="upd-timestamp">
                بيانات الأسعار الحالية مُولَّدة من ملف المعرض بتاريخ:{' '}
                <span dir="ltr">{generatedAtDisplay}</span>
              </p>
            )}
            <p className="upd-note">
              لا يوجد في مصادر البيانات سجل تواريخ لإضافة الموديلات أو لتوقيت تغيّر الأسعار —
              لهذا لا تُعرض تواريخ تغيير، ولا تُقدَّم موديلات كـ«جديدة» بلا سجل موثوق. موديلات
              الأسعار المعلَّمة بـ * (قيد المراجعة مع المصدر) مستبعدة من هذه المقارنة.
            </p>
          </div>

          {result.changedCount > 0 && (
            <ul className="upd-list">
              {result.changes.map((change) => (
                <li className="upd-row" key={`${change.brand}|${change.name}`}>
                  <div className="upd-model">
                    <span className="upd-brand">{change.brand}</span>
                    <span className="upd-name">{change.name}</span>
                  </div>
                  <div className="upd-prices">
                    <span className="upd-old">
                      كان: <b>{change.oldDisplay}</b> ج.م
                    </span>
                    <span className={`upd-arrow ${change.direction === 'up' ? 'is-up' : 'is-down'}`} aria-hidden="true">
                      {change.direction === 'up' ? '▲' : '▼'}
                    </span>
                    <span className="upd-new">
                      أصبح: <b>{change.newDisplay}</b> ج.م
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="upd-disclaimer">
            السعر النهائي يُعتمد من المعرض عند التأكيد. القديم من قائمة الكتالوج المُصدَرة
            (إصدار أقدم)، والحالي من آخر مزامنة مع ملف المعرض — كلاهما يُعرض كما ورد بلا أي
            تعديل أو تقدير.
          </p>
        </div>
      </div>
    </section>
  )
}

export default CatalogUpdates
