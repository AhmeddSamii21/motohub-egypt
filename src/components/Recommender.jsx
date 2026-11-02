import { useEffect, useState } from 'react'
import {
  recommendPerfectModels,
  PURPOSES,
  PERFECT_SHOW_LIMIT,
} from '../data/recommender.js'
import { TYPE_VALUES } from '../data/catalogDiscovery.js'
import { toggleCompareKey, readCompareKeys, COMPARE_EVENT, COMPARE_LIMIT } from '../data/compareStore.js'
import { readFavorites, toggleFavorite, FAVORITES_EVENT } from '../data/favoritesStore.js'
import './Recommender.css'

/**
 * «اكتشف موتوسيكلك المناسب» — استبيان قصير بخطوات + نتائج مشروحة.
 * المنطق (الترشيح والترجيح والشرح) حصرًا في src/data/recommender.js القابل للاختبار —
 * هذا المكوّن عرض فقط: خطوات قابلة للتخطي، شرائح اختيار، ونتائج بروابط واتساب/حجز/
 * مقارنة/مفضلة (كلها المسارات القائمة نفسها بلا تكرار). بلا أي بيانات مخترعة.
 */

const onlyDigits = (value) => value.replace(/[^\d]/g, '')

const CAPACITY_BANDS = [
  { id: '', label: 'لا يهم', min: null, max: null },
  { id: 'small', label: 'حتى 150cc', min: null, max: 150 },
  { id: 'mid', label: 'أكبر من 150 حتى 200cc', min: 150, max: 200 },
  { id: 'big', label: 'أكبر من 200cc', min: 200, max: null },
]

const NEEDS_REVIEW_TITLE = 'سعر مصدره قائمة قديمة — قيد المراجعة مع المصدر'

const STEPS = ['الميزانية', 'الغرض', 'النوع', 'سعة المحرك والمسافة اليومية']

function Recommender() {
  const [step, setStep] = useState(0) // 0..3 أسئلة، 4 = النتائج
  const [budget, setBudget] = useState('')
  const [purpose, setPurpose] = useState('')
  const [type, setType] = useState('')
  const [bandId, setBandId] = useState('')
  const [dailyKm, setDailyKm] = useState('')

  // تحديد المقارنة والمفضلة: المخازن المشتركة نفسها المستخدمة في الكتالوج وصفحة المقارنة
  const [compareKeys, setCompareKeys] = useState(readCompareKeys)
  useEffect(() => {
    const refresh = () => setCompareKeys(readCompareKeys())
    window.addEventListener(COMPARE_EVENT, refresh)
    return () => window.removeEventListener(COMPARE_EVENT, refresh)
  }, [])
  const [favKeys, setFavKeys] = useState(() => new Set(readFavorites().map((item) => `${item.brand}|${item.name}`)))
  useEffect(() => {
    const refresh = () => setFavKeys(new Set(readFavorites().map((item) => `${item.brand}|${item.name}`)))
    window.addEventListener(FAVORITES_EVENT, refresh)
    return () => window.removeEventListener(FAVORITES_EVENT, refresh)
  }, [])

  const band = CAPACITY_BANDS.find((b) => b.id === bandId)
  const bandActive = Boolean(band && (band.min != null || band.max != null))
  const result = recommendPerfectModels({
    budget,
    purpose,
    type: type || null,
    capacityBand: bandActive ? { min: band.min, max: band.max } : null,
    dailyKm,
  })
  const budgetReady = budget !== '' && Number(budget) > 0

  const stepVisible = step <= 3

  return (
    <section className="section recommender" id="recommend-model">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">اكتشف موتوسيكلك المناسب</p>
          <h2 className="section-title">اكتشف موتوسيكلك المناسب في خطوات قليلة</h2>
          <p className="section-sub">
            أجب عن أسئلة قصيرة — التوصية تعتمد حصرًا على الأسعار والمواصفات المنشورة من المصدر،
            وكل نتيجة تشرح سبب اقتراحها. لا توجد ادعاءات أداء أو استهلاك وقود.
          </p>
        </div>

        <div className="rec-panel">
          {stepVisible && (
            <div className="rec-steps" role="group" aria-label={`خطوة ${step + 1} من ${STEPS.length}`}>
              <p className="rec-step-count">خطوة {step + 1} من {STEPS.length}</p>
              <div className="rec-progress" aria-hidden="true">
                {STEPS.map((label, index) => (
                  <span key={label} className={`rec-progress-dot ${index <= step ? 'is-done' : ''}`} />
                ))}
              </div>

              {step === 0 && (
                <div className="rec-step">
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
                  {!budgetReady && <p className="rec-hint">هذه الخطوة مطلوبة — تدخل الميزانية كمرشِّح حقيقي على أسعار الكتالوج.</p>}
                </div>
              )}

              {step === 1 && (
                <div className="rec-step">
                  <span className="rec-label" id="rec-purpose-label">الغرض الأساسي (اختياري)</span>
                  <div className="rec-chips" role="group" aria-labelledby="rec-purpose-label">
                    {PURPOSES.map((p) => (
                      <button
                        key={p.id || 'general'}
                        type="button"
                        className={`rec-chip ${purpose === p.id ? 'is-active' : ''}`}
                        aria-pressed={purpose === p.id}
                        onClick={() => setPurpose(p.id)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <p className="rec-hint">
                    الترجيح يعتمد مواصفات موثَّقة فقط (ناقل أوتوماتيك، سعة وقود، سرعة قصوى، تبريد) — ما لا تُوثَّق مواصفته لا يكسب نقاطًا.
                  </p>
                </div>
              )}

              {step === 2 && (
                <div className="rec-step">
                  <span className="rec-label" id="rec-type-label">نوع المركبة المفضل (اختياري)</span>
                  <div className="rec-chips" role="group" aria-labelledby="rec-type-label">
                    <button
                      type="button"
                      className={`rec-chip ${type === '' ? 'is-active' : ''}`}
                      aria-pressed={type === ''}
                      onClick={() => setType('')}
                    >
                      أي نوع
                    </button>
                    {TYPE_VALUES.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`rec-chip ${type === value ? 'is-active' : ''}`}
                        aria-pressed={type === value}
                        onClick={() => setType(value)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <p className="rec-hint">الأنواع كما وردت في المواصفات المنشورة فقط — الموديل بلا نوع منشور يُستبعد ويُذكر عدده.</p>
                </div>
              )}

              {step === 3 && (
                <div className="rec-step">
                  <span className="rec-label" id="rec-band-label">سعة المحرك المفضلة (اختياري)</span>
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
                  <label className="rec-label rec-label-km" htmlFor="rec-km">
                    المسافة المتوقعة يوميًا (كم — اختياري)
                  </label>
                  <input
                    id="rec-km"
                    className="rec-input rec-input-km"
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    placeholder="مثال: 40"
                    value={dailyKm}
                    onChange={(event) => setDailyKm(onlyDigits(event.target.value))}
                  />
                  <p className="rec-hint">30 كم يوميًا أو أكثر تضيف ترجيح سعة وقود أكبر (مدى أطول بين تعبئة) — حصرًا عند توثيق السعة.</p>
                </div>
              )}

              <div className="rec-step-actions">
                {step > 0 && (
                  <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>
                    السابق
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary rec-next"
                  disabled={step === 0 && !budgetReady}
                  onClick={() => setStep(step + 1)}
                >
                  {step === 3 ? 'اعرض التوصيات' : 'التالي'}
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="rec-results" aria-live="polite">
              <div className="rec-step-actions rec-step-actions-top">
                <button type="button" className="btn btn-ghost" onClick={() => setStep(3)}>
                  تعديل الإجابات
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setPurpose('')
                    setType('')
                    setBandId('')
                    setDailyKm('')
                    setStep(1)
                  }}
                >
                  ابدأ من جديد
                </button>
              </div>

              {!result.ok ? (
                <p className="rec-hint">{result.error}</p>
              ) : result.totalCount === 0 ? (
                <div className="rec-empty">
                  <p>لا يوجد موديل مطابق لإجاباتك الحالية — الأسباب بحسب البيانات الفعلية:</p>
                  <ul>
                    <li>{result.excluded.overBudget} موديل أغلى من الميزانية المحددة.</li>
                    {bandActive && <li>{result.excluded.noCapacity} موديل بلا سعة محرك منشورة (لا يُعامل صفرًا).</li>}
                    {type && <li>{result.excluded.missingType} موديل بلا نوع منشور، و{result.excluded.typeMismatch} من نوع آخر.</li>}
                  </ul>
                  <p>عدّل إجاباتك (ميزانية أعلى، أو تخطَّ النوع/السعة) ثم أعد العرض.</p>
                </div>
              ) : (
                <>
                  <p className="rec-count">
                    {result.totalCount} موديل ضمن ميزانيتك
                    {result.totalCount > PERFECT_SHOW_LIMIT ? ` — أفضل ${PERFECT_SHOW_LIMIT} من حيث مطابقة إجاباتك` : ' — مطابقة لإجاباتك'}
                  </p>
                  {bandActive && result.excluded.noCapacity > 0 && (
                    <p className="rec-note">
                      استُبعد {result.excluded.noCapacity} موديل لأن سعته غير منشورة — لا يُعامل الناقص صفرًا.
                    </p>
                  )}
                  <p className="rec-note">
                    الترتيب: الأقرب لإجاباتك (نقاط الغرض/التوفر من البيانات) ثم الأرخص — لا يُعلَن «أفضل موديل» مطلقًا.
                  </p>
                  <div className="rec-grid">
                    {result.matches.map((m) => {
                      const key = `${m.brand}|${m.name}`
                      const compared = compareKeys.includes(key)
                      const fav = favKeys.has(key)
                      return (
                        <article className="rec-card" key={key}>
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
                          <ul className="rec-card-reasons">
                            {m.reasons.map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                          {m.keySpecs.length > 0 && (
                            <p className="rec-card-specs">
                              {m.keySpecs.map((spec) => (
                                <span key={spec.label} className="rec-card-spec" title={spec.label}>
                                  {spec.value}
                                </span>
                              ))}
                            </p>
                          )}
                          <div className="rec-card-actions">
                            {m.href && (
                              <a className="rec-card-link" href={m.href}>
                                التفاصيل
                              </a>
                            )}
                            <button
                              type="button"
                              className="rec-card-tool"
                              disabled={!compared && compareKeys.length >= COMPARE_LIMIT}
                              onClick={() => toggleCompareKey(key)}
                            >
                              {compared ? 'في المقارنة ✓' : 'قارن'}
                            </button>
                            <button
                              type="button"
                              className={`rec-card-tool ${fav ? 'is-active' : ''}`}
                              onClick={() => toggleFavorite(m.brand, m.name)}
                            >
                              {fav ? 'في المفضلة ✓' : 'مفضلة'}
                            </button>
                            <a href="#book" className="rec-card-tool rec-card-book">
                              احجز معاينة
                            </a>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <p className="rec-disclaimer">
          التوصيات مبنية حصريًا على أسعار الكتالوج والمواصفات المنشورة من المصدر المعتمد — لا ادعاءات أداء أو
          استهلاك وقود أو خطط تقسيط، ولا يُعلَن موديل «أفضل» مطلقًا. الموديلات بعلامة * أسعارها من قائمة قديمة
          قيد المراجعة مع المصدر.
        </p>
      </div>
    </section>
  )
}

export default Recommender
