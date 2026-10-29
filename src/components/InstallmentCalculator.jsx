import { useState } from 'react'
import { CATALOG } from '../data/catalog'
import { GENERATED_BY_KEY } from '../data/modelDisplay'
import { storeRequestedModel, REQUESTED_MODEL_EVENT } from '../data/requestedModel'
import './InstallmentCalculator.css'

/**
 * حاسبة أقساط استرشادية بالكامل:
 * - السعر المُعبَّأ تلقائيًا يأتي من الأسعار الحالية المولّدة من دفتر العمل
 *   (generatedStock عبر GENERATED_BY_KEY، مفتاح brand|name) للمصادر الموثوقة فقط
 *   (stock / price-list)؛ وما ليس كذلك يبقى على سعر الكتالوج المُثبَّت،
 *   وموديلات الـ needsReview الأربعة تُعلَّم "سعر مرجعي غير مُتحقَّق" ولا تُقدَّم كسعر موثوق.
 * - الدفعة الأولى تُدخَل مباشرة بالجنيه المصري (فارغة = 0)، بلا سقف مصطنع —
 *   والتحقق: سعر صحيح > 0 ودفعة ≥ 0 ولا تتجاوز السعر.
 * - معدل الفائدة ثابت موثّق أدناه كمثال توضيحي (فائدة بسيطة) وليس عرضًا من أي جهة تمويل فعليًا.
 * - مصدر جهات التمويل (Google Sheets للقراءة فقط) غير مُهيأ بعد — كل الأرقام استرشادية.
 * - الأرقام الناتجة حصيلة معادلة على مُدخل المستخدم، لا بيانات "واقعية" تُنسب لأحد.
 */
const MONTHLY_RATE = 0.015
const TENORS = [6, 12, 18, 24, 36]

const parsePrice = (price) => Number(String(price).replace(/,/g, ''))
const formatEGP = (value) => value.toLocaleString('en-US')
const onlyDigits = (value) => value.replace(/[^\d]/g, '')

function InstallmentCalculator() {
  const [model, setModel] = useState('')
  const [price, setPrice] = useState('')
  const [downAmount, setDownAmount] = useState('')
  const [needsReview, setNeedsReview] = useState(false)
  const [tenor, setTenor] = useState(12)

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

  const numericPrice = Number(price)
  // إدخال الدفعة فارغ ⇒ 0 — الإدخال أرقام فقط (onlyDigits) فلا NaN ولا سقف مصطنع
  const downValue = downAmount === '' ? 0 : Number(downAmount)
  const isValid = numericPrice > 0 && downValue >= 0 && downValue <= numericPrice
  const multiplier = 1 + MONTHLY_RATE * tenor
  const financed = isValid ? numericPrice - downValue : 0
  const totalPaid = isValid ? Math.round(financed * multiplier) : 0
  const monthly = isValid ? Math.round((financed * multiplier) / tenor) : 0
  // لا حد أدنى فعلي للدفعة في الوضع الاحتياطي (لا بيانات مزوّد موثوقة) — يضاف فقط عند توفره لاحقًا

  const onCtaClick = () => {
    if (!model) return
    storeRequestedModel(model)
    window.dispatchEvent(new CustomEvent(REQUESTED_MODEL_EVENT))
  }

  return (
    <section className="section finance" id="installments">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">حاسبة الأقساط</p>
          <h2 className="section-title">احسب نطاقًا استرشاديًا للأقساط</h2>
          <p className="section-sub">
            اختر موديلًا من الكتالوج أو أدخل سعرًا، وحدّد الدفعة الأولى ومدة التقسيط لترى حصيلة
            معادلة توضيحية بفائدة بسيطة.
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
              {numericPrice > 0 && downValue <= numericPrice && downAmount !== '' && (
                <p className="calc-down-value">
                  دفعة أولى {formatEGP(downValue)} ج.م — المتبقي للتمويل {formatEGP(numericPrice - downValue)} ج.م
                </p>
              )}
              {isValid && numericPrice > 0 && downAmount === '' && (
                <p className="calc-down-value">الدفعة الافتراضية: صفر ج.م — التمويل على سعر الموديل كاملًا</p>
              )}
            </div>

            <div className="calc-field">
              <span className="calc-label" id="calc-tenor-label">
                مدة التقسيط بالأشهر
              </span>
              <div className="calc-tenor-chips" role="group" aria-labelledby="calc-tenor-label">
                {TENORS.map((months) => (
                  <button
                    key={months}
                    type="button"
                    className={`calc-chip ${tenor === months ? 'is-active' : ''}`}
                    aria-pressed={tenor === months}
                    onClick={() => setTenor(months)}
                  >
                    {months}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="calc-result" aria-live="polite">
            <div className="calc-result-grid">
              <div className="calc-stat calc-stat-focus">
                <p className="calc-stat-label">القسط الشهري التقديري</p>
                <p className="calc-stat-value" dir="ltr">
                  {formatEGP(monthly)}
                </p>
                <p className="calc-stat-unit">ج.م / شهر</p>
              </div>
              <div className="calc-stat">
                <p className="calc-stat-label">الدفعة الأولى</p>
                <p className="calc-stat-value" dir="ltr">
                  {formatEGP(downValue)}
                </p>
                <p className="calc-stat-unit">ج.م</p>
              </div>
              <div className="calc-stat">
                <p className="calc-stat-label">المبلغ المُموّل</p>
                <p className="calc-stat-value" dir="ltr">
                  {formatEGP(financed)}
                </p>
                <p className="calc-stat-unit">ج.م</p>
              </div>
              <div className="calc-stat">
                <p className="calc-stat-label">إجمالي المدفوع</p>
                <p className="calc-stat-value" dir="ltr">
                  {formatEGP(totalPaid)}
                </p>
                <p className="calc-stat-unit">ج.م على {tenor} شهرًا</p>
              </div>
            </div>

            <p className="calc-note">
              الحساب بفائدة بسيطة استرشادية {(MONTHLY_RATE * 100).toFixed(1)}% شهريًا على المتبقي من
              السعر — الأرقام توضيحية فقط لعرض طريقة الحساب، وليست عرضًا فعليًا. مصدر جهات التمويل
              (Google Sheets للقراءة فقط) غير مُهيأ بعد، فلا يوجد أي عرض تمويل حقيقي مُسترجَع هنا.
            </p>

            <div className="calc-actions">
              <a
                href="#book"
                className="btn btn-primary calc-cta"
                onClick={onCtaClick}
              >
                احجز معاينة{model ? ' بتمويل' : ''}
              </a>
              {!isValid && (
                <span className="calc-cta-hint">
                  {numericPrice <= 0
                    ? 'أدخل سعرًا صحيحًا أكبر من صفر لعرض الأرقام'
                    : 'الدفعة الأولى لا تتجاوز السعر — عدِّل رقمها لعرض الأرقام'}
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="calc-disclaimer">
          أسعار الأقساط استرشادية وتختلف حسب شركة التمويل أو المعرض — والمعادلة أعلاه مثال توضيحي
          معدّل يدويًا وفق مُدخلاتك، لا ارتباطًا بعروض فعلية.
        </p>
      </div>
    </section>
  )
}

export default InstallmentCalculator
