import { useState } from 'react'
import { recommendModels, BRAND_NAMES, SHOW_LIMIT } from '../data/recommender'
import './Recommender.css'

/**
 * «ساعدني أختار موتوسيكل» — اقتراحات من الكتالوج المُتحقَّق فقط:
 * - المرشّح الفعلي: الميزانية (سعر الكتالوج) + ماركة اختيارية + شريحة سعة محرك اختيارية
 *   تُطبَّق على المواصفات المنشورة القابلة للقراءة فقط؛ الموديل بلا سعة منشورة يُستبعد
 *   عند تفعيل المرشّح ويُعرَض عددُه بصدق.
 * - سؤال الاستخدام اختياري للإرشاد فقط ولا يُرشِّح الموديلات — لا توجد بيانات استخدام منشورة.
 * - لا سؤال تقسيط: لا توجد بيانات تمويل موثوقة بعد (financingSource غير مُهيأ).
 * - الأسعار المعروضة بنفس منطق الكتالوج (modelDisplay)؛ الموديل المعلَّم * سعره مرجعي
 *   غير مُتحقَّق ولا يُقدَّم كسعر موثوق، وملاحظة التوفر تأتي من الملف المولَّد كما هي.
 * - بلا أي CTA: النتيجة تربط بصفحة الموديل فقط (نفس روابط #/m/ الموجودة).
 */

const onlyDigits = (value) => value.replace(/[^\d]/g, '')

const CAPACITY_BANDS = [
  { id: '', label: 'بدون تحديد', min: null, max: null },
  { id: 'small', label: 'حتى 150cc', min: null, max: 150 },
  { id: 'mid', label: 'أكثر من 150 حتى 200cc', min: 150, max: 200 },
  { id: 'big', label: 'أكثر من 200cc', min: 200, max: null },
]

const USAGE_OPTIONS = ['التنقل اليومي', 'التوصيل والعمل', 'رحلات أطول']

const NEEDS_REVIEW_TITLE = 'سعر مصدره قائمة قديمة — قيد المراجعة مع المصدر'

function Recommender() {
  const [budget, setBudget] = useState('')
  const [brand, setBrand] = useState('')
  const [bandId, setBandId] = useState('')
  const [usage, setUsage] = useState('')

  const band = CAPACITY_BANDS.find((b) => b.id === bandId)
  const bandActive = Boolean(band && (band.min != null || band.max != null))
  const result = recommendModels({
    budget,
    brands: brand ? [brand] : [],
    capacityBand: bandActive ? { min: band.min, max: band.max } : null,
  })

  return (
    <section className="section recommender" id="recommend-model">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">ساعدني أختار موتوسيكل</p>
          <h2 className="section-title">اقترح لك موديلًا مناسبًا من الكتالوج</h2>
          <p className="section-sub">
            أدخل ميزانيتك واختياريًا ماركة وشريحة سعة محرك، لعرض موديلات الكتالوج المطابقة مرتبة
            بالسعر تصاعديًا — الاقتراحات من الأسعار والمواصفات المنشورة فقط.
          </p>
        </div>

        <div className="rec-panel">
          <div className="rec-controls">
            <div className="rec-field">
              <label className="rec-label" htmlFor="rec-budget">
                ميزانيتك (ج.م)
              </label>
              <input
                id="rec-budget"
                className="rec-input"
                type="text"
                inputMode="numeric"
                dir="ltr"
                placeholder="مثال: 60000"
                value={budget}
                onChange={(event) => setBudget(onlyDigits(event.target.value))}
              />
            </div>

            <div className="rec-field">
              <label className="rec-label" htmlFor="rec-brand">
                الماركة (اختياري)
              </label>
              <select
                id="rec-brand"
                className="rec-select"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
              >
                <option value="">كل الماركات</option>
                {BRAND_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rec-field">
              <span className="rec-label" id="rec-band-label">
                سعة المحرك (اختياري)
              </span>
              <div className="rec-chips" role="group" aria-labelledby="rec-band-label">
                {CAPACITY_BANDS.map((b) => (
                  <button
                    key={b.id || 'any'}
                    type="button"
                    className={`rec-chip ${bandId === b.id ? 'is-active' : ''}`}
                    aria-pressed={bandId === b.id}
                    onClick={() => setBandId(b.id)}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rec-field">
              <label className="rec-label" htmlFor="rec-usage">
                الاستخدام (اختياري — إرشادي فقط)
              </label>
              <select
                id="rec-usage"
                className="rec-select"
                value={usage}
                onChange={(event) => setUsage(event.target.value)}
              >
                <option value="">بدون تحديد</option>
                {USAGE_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rec-results" aria-live="polite">
            {!result.ok ? (
              <p className="rec-hint">{result.error}</p>
            ) : result.totalCount === 0 ? (
              <p className="rec-empty">
                لا توجد موديلات ضمن هذه القيود — جرِّب رفع الميزانية أو إزالة مرشّح.
              </p>
            ) : (
              <>
                <p className="rec-count">
                  {result.totalCount} موديل مطابق
                  {result.totalCount > SHOW_LIMIT ? ` — عرض أول ${SHOW_LIMIT} بالسعر تصاعديًا` : ' — بالسعر تصاعديًا'}
                </p>
                {bandActive && (
                  <p className="rec-note">
                    {result.excludedNoCapacity > 0
                      ? `عند تفعيل مرشّح السعة: استُبعد ${result.excludedNoCapacity} موديل بلا سعة محرك منشورة قابلة للقراءة.`
                      : 'كل الموديلات المطابقة لها سعة محرك منشورة قابلة للقراءة.'}
                  </p>
                )}
                <div className="rec-grid">
                  {result.matches.map((m) => (
                    <article className="rec-card" key={`${m.brand}|${m.name}`}>
                      <p className="rec-card-brand">{m.brand}</p>
                      <h4 className="rec-card-name">{m.name}</h4>
                      <p className="rec-card-price">
                        <b>{m.displayPrice}</b> <span>ج.م</span>
                        {m.needsReview && (
                          <span className="rec-card-review" title={NEEDS_REVIEW_TITLE}>
                            *
                          </span>
                        )}
                      </p>
                      {m.availabilityNote && <p className="rec-card-availability">{m.availabilityNote}</p>}
                      <a className="rec-card-link" href={m.href}>
                        التفاصيل
                      </a>
                    </article>
                  ))}
                </div>
              </>
            )}
            {usage && (
              <p className="rec-usage-tip">
                إجابتك عن الاستخدام ({usage}) إرشادية فقط ولا تُغيِّر الاقتراحات — لتقدير تكلفة تشغيل
                أي موديل جرِّب <a href="#cost">حاسبة التشغيل</a>.
              </p>
            )}
          </div>
        </div>

        <p className="rec-disclaimer">
          الاقتراحات محسوبة من أسعار الكتالوج وسعة المحرك المنشورة فقط — لا نفترض أي ملاءمة
          استخدام أو استهلاك وقود أو خطط تقسيط، والتوفر والسعر النهائي يُعتمدان من المعرض. الأسعار
          المعلَّمة بـ * مرجعية غير مُتحقَّقة.
        </p>
      </div>
    </section>
  )
}

export default Recommender
