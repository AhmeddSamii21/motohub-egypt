import { useState } from 'react'
import { CATALOG } from '../data/catalog'
import { GENERATED_BY_KEY } from '../data/modelDisplay'
import { calculateInstallmentPlan } from '../data/installmentMath'
import { storeRequestedModel, REQUESTED_MODEL_EVENT } from '../data/requestedModel'
import './InstallmentCalculator.css'

/**
 * حاسبة أقساط استرشادية بالكامل — مخطط تخطيط، لا عرض تمويل:
 * - السعر المُعبَّأ تلقائيًا يأتي من الأسعار الحالية المولّدة من دفتر العمل
 *   (generatedStock عبر GENERATED_BY_KEY، مفتاح brand|name) للمصادر الموثوقة فقط
 *   (stock / price-list)؛ وما ليس كذلك يبقى على سعر الكتالوج المُثبَّت،
 *   وموديلات الـ needsReview الأربعة تُعلَّم "سعر مرجعي غير مُتحقَّق" ولا تُقدَّم كسعر موثوق.
 * - الدفعة الأولى تُدخَل مباشرة بالجنيه المصري (فارغة = 0) — التحقق: سعر > 0 ودفعة ≥ 0
 *   ولا تتجاوز السعر.
 * - معدل الفائدة السنوي والرسوم مُدخلان من العميل (فارغان = 0) — لا يُفترض معدل ولا
 *   رسم صامتًا أبدًا. السيناريوهان منفصلان صراحةً: بلا فائدة (تقسيط بسيط) وبفائدة
 *   (فائدة متناقصة — معادلة الأنّوية الموثقة في installmentMath.js).
 * - مصدر جهات التمويل (Google Sheets للقراءة فقط) غير مُهيأ بعد — لا يوجد أي عرض تمويل
 *   حقيقي مُسترجَع هنا، والنواتج تقديرات تخطيط لا ضمان قبول من أي جهة.
 */
const TENORS = [6, 12, 18, 24, 36]

const parsePrice = (price) => Number(String(price).replace(/,/g, ''))
const formatEGP = (value) => value.toLocaleString('en-US')
const onlyDigits = (value) => value.replace(/[^\d]/g, '')
/** نسبة مئوية: أرقام + نقطة عشرية واحدة */
const onlyPercent = (value) => {
  const cleaned = value.replace(/[^\d.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}

function InstallmentCalculator() {
  const [model, setModel] = useState('')
  const [price, setPrice] = useState('')
  const [downAmount, setDownAmount] = useState('')
  const [annualRate, setAnnualRate] = useState('')
  const [fees, setFees] = useState('')
  const [customMonths, setCustomMonths] = useState('')
  const [tenor, setTenor] = useState(12)
  const [needsReview, setNeedsReview] = useState(false)

  const onModelChange = (name) => {
    setModel(name)
    setNeedsReview(false)
    if (!name) return
    const group = CATALOG.find((g) => g.models.some((m) => m.name === name))
    const found = group?.models.find((m) => m.name === name)
    if (!group || !found) return
    // السعر الحالي المولّد للمصادر الموثوقة فقط؛ المحتاج للمراجعة أو الغائب يعود لسعر الكتالوج المُثبَّت
    const generated = GENERATED_BY_KEY.get(`${group.brand}|${name}`)
    if (generated && (generated.source === 'stock' || generated.source === 'price-list')) {
      setPrice(generated.price) // أرقام صرفة بلا فواصل — دون تغيير طريقة عرض أسعار الكتالوج
    } else {
      const marked = Boolean(generated?.needsReview)
      setNeedsReview(marked)
      setPrice(String(parsePrice(found.price))) // سلسلة الكتالوج كما هي بعد إزالة الفواصل — لا اختراع سعر
    }
  }

  // المدة: إدخال حر، والشرائح اختصارات تملأ نفس الإدخال — مصدر الحقيقة واحد
  const months = customMonths === '' ? tenor : Number(customMonths)
  const result = calculateInstallmentPlan({
    price,
    downPayment: downAmount,
    annualRatePercent: annualRate,
    months,
    fees,
  })
  const isValid = result.ok
  const interestBearing = isValid && result.scenario === 'interest-bearing'

  const onCtaClick = () => {
    if (!model) return
    storeRequestedModel(model)
    window.dispatchEvent(new CustomEvent(REQUESTED_MODEL_EVENT))
  }

  const pickTenor = (value) => {
    setTenor(value)
    setCustomMonths('')
  }

  return (
    <section className="section finance" id="installments">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">حاسبة الأقساط</p>
          <h2 className="section-title">خطّط أقساطك بأرقامك أنت</h2>
          <p className="section-sub">
            اختر موديلًا من الكتالوج، وحدّد الدفعة الأولى والمدة — وإن كنت تعرف معدل فائدة أو
            رسومًا من جهة تمويل فأدخلها، وإلا فاتركها فارغة وسيحسب التقسيط بلا فائدة. الناتج
            تخطيط استرشادي وليس عرض تمويل.
          </p>
        </div>

        <div className="calc-panel">
          <div className="calc-controls">
            <div className="calc-field">
              <label className="calc-label" htmlFor="calc-model">
                الموديل أو السعر
              </label>
              <select
                id="calc-model"
                className="calc-select"
                value={model}
                onChange={(event) => onModelChange(event.target.value)}
              >
                <option value="">اختر موديلًا من الكتالوج (اختياري)</option>
                {CATALOG.map((group) => (
                  <optgroup key={group.brand} label={group.brand}>
                    {group.models.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name} — {item.price} ج.م
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="calc-field">
              <label className="calc-label" htmlFor="calc-price">
                السعر (ج.م){model ? ' — تم تعبئته تلقائيًا' : ''}
              </label>
              <input
                id="calc-price"
                className="calc-input"
                type="text"
                inputMode="numeric"
                dir="ltr"
                placeholder={model ? '' : 'مثال: 55000'}
                value={price}
                onChange={(event) => setPrice(onlyDigits(event.target.value))}
              />
              {needsReview && (
                <p className="calc-down-value">
                  ⚠ سعر مرجعي غير مُتحقَّق من مصدر الأسعار الحالي — استرشادي فقط
                </p>
              )}
            </div>

            <div className="calc-field">
              <label className="calc-label" htmlFor="calc-down">
                الدفعة الأولى (ج.م) — اختيارية، والافتراضي صفر
              </label>
              <input
                id="calc-down"
                className="calc-input"
                type="text"
                inputMode="numeric"
                dir="ltr"
                placeholder="مثال: 20000"
                value={downAmount}
                onChange={(event) => setDownAmount(onlyDigits(event.target.value))}
              />
              {isValid && downAmount !== '' && result.downPayment > 0 && (
                <p className="calc-down-value">
                  دفعة أولى {formatEGP(result.downPayment)} ج.م — المتبقي للتمويل {formatEGP(result.financed)} ج.م
                </p>
              )}
            </div>

            <div className="calc-field">
              <label className="calc-label" htmlFor="calc-rate">
                معدل الفائدة السنوي % — من جهة التمويل إن عرفته، فارغ = بلا فائدة
              </label>
              <input
                id="calc-rate"
                className="calc-input"
                type="text"
                inputMode="decimal"
                dir="ltr"
                placeholder="مثال: 14.5"
                value={annualRate}
                onChange={(event) => setAnnualRate(onlyPercent(event.target.value))}
              />
            </div>

            <div className="calc-field">
              <label className="calc-label" htmlFor="calc-fees">
                رسوم إضافية معروفة (ج.م) — اختيارية
              </label>
              <input
                id="calc-fees"
                className="calc-input"
                type="text"
                inputMode="numeric"
                dir="ltr"
                placeholder="مثال: 1500"
                value={fees}
                onChange={(event) => setFees(onlyDigits(event.target.value))}
              />
            </div>

            <div className="calc-field">
              <span className="calc-label" id="calc-tenor-label">
                مدة التقسيط بالأشهر
              </span>
              <div className="calc-tenor-chips" role="group" aria-labelledby="calc-tenor-label">
                {TENORS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`calc-chip ${customMonths === '' && tenor === value ? 'is-active' : ''}`}
                    aria-pressed={customMonths === '' && tenor === value}
                    onClick={() => pickTenor(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <input
                className="calc-input calc-tenor-custom"
                type="text"
                inputMode="numeric"
                dir="ltr"
                aria-label="مدة تقسيط مخصصة بالأشهر"
                placeholder="أو أدخل عدد أشهر مخصصًا"
                value={customMonths}
                onChange={(event) => setCustomMonths(onlyDigits(event.target.value))}
              />
            </div>
          </div>

          <div className="calc-result" aria-live="polite">
            {isValid ? (
              <>
                <div className="calc-result-grid">
                  <div className="calc-stat calc-stat-focus">
                    <p className="calc-stat-label">القسط الشهري التقديري</p>
                    <p className="calc-stat-value" dir="ltr">
                      {formatEGP(result.monthly)}
                    </p>
                    <p className="calc-stat-unit">ج.م / شهر × {result.months}</p>
                  </div>
                  <div className="calc-stat">
                    <p className="calc-stat-label">المبلغ المُموَّل</p>
                    <p className="calc-stat-value" dir="ltr">
                      {formatEGP(result.financed)}
                    </p>
                    <p className="calc-stat-unit">ج.م</p>
                  </div>
                  <div className="calc-stat">
                    <p className="calc-stat-label">إجمالي الأقساط</p>
                    <p className="calc-stat-value" dir="ltr">
                      {formatEGP(result.totalInstallments)}
                    </p>
                    <p className="calc-stat-unit">ج.م</p>
                  </div>
                  <div className="calc-stat">
                    <p className="calc-stat-label">إجمالي المدفوع التقديري</p>
                    <p className="calc-stat-value" dir="ltr">
                      {formatEGP(result.totalPaid)}
                    </p>
                    <p className="calc-stat-unit">ج.م (دفعة + أقساط{result.fees > 0 ? ' + رسوم' : ''})</p>
                  </div>
                </div>

                {interestBearing && (
                  <p className="calc-cost-line">
                    تكلفة التمويل التقديرية فوق السعر:{' '}
                    <b dir="ltr">{formatEGP(result.financingCost)}</b> ج.م
                    {result.fees > 0 && <> (تشمل رسومًا {formatEGP(result.fees)} ج.م أدخلتها أنت)</>}
                  </p>
                )}

                <p className="calc-note">
                  {interestBearing ? (
                    <>
                      سيناريو بفائدة (مُدخل منك): فائدة متناقصة — القسط = المبلغ المُموَّل ×
                      المعدل الشهري ÷ (1 − (1 + المعدل الشهري)<sup>−n</sup>)، والمعدل الشهري =
                      النسبة السنوية ÷ 12. القسط مُقرَّب لأقرب جنيه.
                    </>
                  ) : (
                    <>سيناريو بلا فائدة (فارغ المعدل): القسط = المبلغ المُموَّل ÷ عدد الأشهر — تقسيط بسيط بلا أي افتراض فائدة.</>
                  )}{' '}
                  {result.fees > 0 && <>الرسوم التي أدخلتها تُضاف للإجمالي وتظهر سطرًا مستقلًا — لا نفترض كيف تعالجها أي جهة. </>}
                  هذه تقديرات تخطيط من أرقامك أنت — ليست عرضًا من معرض MotoHub ولا من أي جهة
                  تمويل، ولا ضمانًا لقبول أي سيناريو. لموصل شروط تمويل حقيقية، اتفق مع المعرض
                  مباشرة.
                </p>

                <div className="calc-actions">
                  <a
                    href="#book"
                    className="btn btn-primary calc-cta"
                    onClick={onCtaClick}
                  >
                    احجز معاينة{model ? ' بتمويل' : ''}
                  </a>
                </div>
              </>
            ) : (
              <>
                <p className="calc-cta-hint">{result.error}</p>
                <div className="calc-actions">
                  <a
                    href="#book"
                    className="btn btn-primary calc-cta"
                    onClick={onCtaClick}
                  >
                    احجز معاينة{model ? ' بتمويل' : ''}
                  </a>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="calc-disclaimer">
          كل الأرقام ناتج معادلة على مُدخلاتك (السعر من قوائم المعرض المنشورة، والفائدة والرسوم
          والمدة منك) — لا ارتباط بأي عرض تمويل فعلي، ومصدر جهات التمويل غير مُهيأ بعد.
        </p>
      </div>
    </section>
  )
}

export default InstallmentCalculator
