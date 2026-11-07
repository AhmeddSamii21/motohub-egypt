import { useEffect, useMemo, useState } from 'react'

import {
  AVAILABILITY_OPTIONS,
  BUDGET_OPTIONS,
  DEFAULT_FINDER_FILTERS,
  TYPE_VALUES,
  buildFinderModels,
  finderBrands,
  finderFiltersAreDefault,
  normalizeFinderFilters,
  runFinder,
} from '../data/finder'
import { MODEL_DETAILS } from '../data/generatedModelDetails'
import { AVAILABILITY_NOTE, LAST_RECORDED_PRICE_NOTE } from '../data/generatedStock'
import { modelHref } from '../data/modelSlug'
import { COMPARE_EVENT, COMPARE_LIMIT, readCompareKeys, toggleCompareKey } from '../data/compareStore'
import { storeRequestedModel, REQUESTED_MODEL_EVENT } from '../data/requestedModel'
import { whatsappModelLink } from '../data/contact'
import './Finder.css'

/**
 * «اكتشف موديلك» — موجِّه شراء سريع للعميل فوق بيانات الكتالوج المُتحقَّق منها حصرًا.
 * لا بيانات جديدة ولا منطق مقارنة مكرر: الفلاتر من catalogDiscovery، المقارنة عبر
 * compareStore القائم، الحجز عبر التمهيد القائم لنموذج الحجز، والاستفسار عبر رابط
 * واتساب الرسمي. ما ينقص من بيانات يُذكر بصدق ولا يُعامل صفرًا ولا يُختَرَع.
 */

const DETAILS_BY_KEY = new Map(MODEL_DETAILS.map((d) => [`${d.brand}|${d.name}`, d]))

/** صورة البطاقة: أول صورة منشورة فعلًا إن وُجدت — وإلا لا صورة ولا صورة بديلة مُختَرَعة */
function FinderCardImage({ brand, name, altBase }) {
  const details = DETAILS_BY_KEY.get(`${brand}|${name}`)
  const src = details && Array.isArray(details.images) && details.images.length > 0 ? details.images[0] : null
  const [broken, setBroken] = useState(false)
  if (!src) return null
  if (broken) return null
  return (
    <img
      className="finder-card-img"
      src={src}
      alt={`صورة ${altBase}`}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
    />
  )
}

function Finder() {
  const models = useMemo(() => buildFinderModels(), [])
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_FINDER_FILTERS }))
  // مزامنة المقارنة مع المتجر القائم — نفس حدث الكتالوج/صفحة المقارنة
  const [compareKeys, setCompareKeys] = useState(() => readCompareKeys())
  useEffect(() => {
    const refresh = () => setCompareKeys(readCompareKeys())
    window.addEventListener(COMPARE_EVENT, refresh)
    return () => window.removeEventListener(COMPARE_EVENT, refresh)
  }, [])

  const results = useMemo(() => runFinder(models, filters), [models, filters])
  const { items, excludedNoValue, excludedNoPrice } = results

  const patch = (partial) => setFilters((prev) => normalizeFinderFilters({ ...prev, ...partial }))
  const reset = () => setFilters({ ...DEFAULT_FINDER_FILTERS })
  const isDefault = finderFiltersAreDefault(filters)

  /** أسباب الاستثناء الصادقة — تُعرض فقط وهي >0، بلا ادعاء أن الموديل غير متوفر */
  const exclusionNotes = []
  if (excludedNoPrice > 0) {
    exclusionNotes.push(`${excludedNoPrice} موديل مُستبعد من مطابقة الميزانية لأن سعره غير قابل للقراءة في الكتالوج الحالي — لا يُعامل صفرًا.`)
  }
  if (excludedNoValue.type > 0) {
    exclusionNotes.push(`${excludedNoValue.type} موديل لا يملك «نوع مركبة» منشورًا في المصدر فلا يُقيَّم بفلتر النوع.`)
  }

  return (
    <section className="section finder" id="finder" aria-label="اكتشف موديلك — موجِّه الشراء">
      <div className="container">
        <header className="finder-head">
          <h2 className="section-title">اكتشف موديلك</h2>
          <p className="finder-intro">
            حدّد ميزانيتك وما يناسبك من الماركة والنوع لتصل لموديلات مطابقة من الكتالوج المُتحقَّق منه.
            النتيجة ترتيبها من الأرخص، والأسعار كما وردت في المصدر — عمّا لم يُنشر تُذكر شفافيةً.
          </p>
        </header>

        {/* الفلاتر — تحكم أصلية قابلة للتنقل بلوحة المفاتيح */}
        <form className="finder-controls" aria-label="فلاتر البحث" onSubmit={(e) => e.preventDefault()}>
          <div className="finder-field">
            <label htmlFor="finder-budget">الميزانية (ج.م)</label>
            <select
              id="finder-budget"
              value={filters.budget}
              onChange={(e) => patch({ budget: e.target.value })}
            >
              {BUDGET_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="finder-field">
            <label htmlFor="finder-brand">الماركة</label>
            <select
              id="finder-brand"
              value={filters.brand}
              onChange={(e) => patch({ brand: e.target.value })}
            >
              <option value="all">كل الماركات</option>
              {finderBrands().map((brand) => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          <div className="finder-field">
            <label htmlFor="finder-availability">حالة التوفر</label>
            <select
              id="finder-availability"
              value={filters.availability}
              onChange={(e) => patch({ availability: e.target.value })}
            >
              {AVAILABILITY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>

          <fieldset className="finder-field finder-types">
            <legend>نوع المركبة <span className="finder-types-note">(حسب ما هو منشور في المصدر)</span></legend>
            {TYPE_VALUES.length > 0 ? (
              TYPE_VALUES.map((type) => (
                <label key={type} className="finder-type-chip">
                  <input
                    type="checkbox"
                    checked={filters.types.includes(type)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...filters.types, type]
                        : filters.types.filter((t) => t !== type)
                      patch({ types: next })
                    }}
                  />
                  <span>{type}</span>
                </label>
              ))
            ) : (
              <p className="finder-types-note">لا توجد أنواع منشورة في المصدر حاليًا — الفلتر مُعطَّل ولا تُختَرَع أنواع.</p>
            )}
          </fieldset>

          <div className="finder-controls-foot">
            <button type="button" className="btn btn-ghost finder-reset" onClick={reset} disabled={isDefault}>
              إعادة ضبط الفلاتر
            </button>
          </div>
        </form>

        {/* ملخص النتائج + أسباب الاستثناء الصادقة */}
        <p className="finder-summary" role="status">
          المطابقة: <b>{items.length}</b> موديل
          {items.length > 0 && ' — مرتبة من الأرخص'}
        </p>
        {exclusionNotes.length > 0 && (
          <ul className="finder-exclusions">
            {exclusionNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}

        {/* الحالة الفاضية الصادقة — بلا نتائج بديلة ولا ادعاء توفر */}
        {items.length === 0 ? (
          <div className="finder-empty">
            <p><b>لا توجد موديلات مطابقة لهذه الفلاتر.</b></p>
            <p>جرّب رفع سقف الميزانية أو توسيع اختيار الماركة/النوع، أو أعد الضبط لعرض الكتالوج كاملًا.</p>
            <button type="button" className="btn btn-primary finder-empty-reset" onClick={reset}>
              إعادة ضبط الفلاتر
            </button>
          </div>
        ) : (
          <ul className="finder-grid">
            {items.map((model) => {
              const key = model.key
              const compared = compareKeys.includes(key)
              const compareDisabled = compareKeys.length >= COMPARE_LIMIT && !compared
              const altBase = `${model.brand} ${model.name}`
              const href = modelHref(model.brand, model.name) || '#catalog'
              return (
                <li className="finder-card" key={key}>
                  <a className="catalog-card-overlay" href={href} aria-label={`تفاصيل ${altBase}`} />
                  <FinderCardImage brand={model.brand} name={model.name} altBase={altBase} />
                  <p className="catalog-card-brand">{model.brand}</p>
                  <h3 className="catalog-card-name">{model.name}</h3>
                  <p className="catalog-card-price">
                    <b>{model.priceText}</b> <span>ج.م</span>
                    {model.needsReview && (
                      <span className="catalog-card-review" title="سعر مصدره قائمة قديمة — قيد المراجعة مع المصدر">*</span>
                    )}
                  </p>
                  <p className="catalog-card-availability">
                    {model.inStock ? AVAILABILITY_NOTE : LAST_RECORDED_PRICE_NOTE}
                  </p>
                  <div className="finder-card-actions">
                    <a className="finder-card-details" href={href}>التفاصيل</a>
                    <button
                      type="button"
                      className={`catalog-card-compare ${compared ? 'is-selected' : ''}`}
                      aria-pressed={compared}
                      disabled={compareDisabled}
                      onClick={() => setCompareKeys(toggleCompareKey(key))}
                    >
                      {compared ? 'في المقارنة ✓' : 'قارن'}
                    </button>
                    <a
                      href="#book"
                      className="catalog-card-cta"
                      onClick={() => {
                        storeRequestedModel(model.name)
                        window.dispatchEvent(new CustomEvent(REQUESTED_MODEL_EVENT))
                      }}
                    >
                      احجز معاينة
                    </a>
                    <a
                      className="finder-card-whatsapp"
                      href={whatsappModelLink(model.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="استفسار عبر واتساب عن هذا الموديل"
                    >
                      اسأل المعرض
                    </a>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* الخطوة التالية: مقارنة أو حجز — نفس المسارات القائمة بلا وعود إضافية */}
        <div className="finder-next">
          {compareKeys.length >= 2 && (
            <a className="btn btn-primary" href="#compare">
              قارن الموديلات المختارة ({compareKeys.length})
            </a>
          )}
          <a className="btn btn-ghost finder-next-book" href="#book">الانتقال إلى نموذج الحجز</a>
        </div>
      </div>
    </section>
  )
}

export default Finder
