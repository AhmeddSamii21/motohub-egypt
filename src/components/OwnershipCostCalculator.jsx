import { useState } from 'react'
import { calculateOwnershipCost } from '../data/ownershipCost'
import './OwnershipCostCalculator.css'

/**
 * حاسبة تكلفة تشغيل الموتوسيكل — استرشادية بالكامل وعلى المتصفح فقط:
 * - كل المدخلات من المستخدم (مسافة/أيام/استهلاك/سعر لتر/صيانة/مصاريف أخرى) — لا نفترض
 *   أي سعر وقود ولا أي رقم استهلاك لموديل معين؛ النتائج حصيلة معادلة على مُدخل
 *   المستخدم وحده.
 * - المسافة: وضعان (يومي × أيام الركوب، أو شهري مباشر) — التبديل لا يضيع البيانات:
 *   كل وضع يحتفظ بقيمته الخاصة في الحالة.
 * - بلا واجهة خلفية ولا تخزين ولا إرسال — حساب فوري في المتصفح، وبلا أي زر إجراء/CTA
 *   (زر «انظر الشرح» الوحيد أسفل الحاسبة يفتح مقارنة التشغيل على نفس القسم).
 * - المدخلات مُرشَّحة (أرقام + نقطة عشرية واحدة) ويظهر أول خطأ تحقق برسالة عربية
 *   مكان النتائج حتى تكتمل القيم الصحيحة.
 */

const formatEGP = (value) => value.toLocaleString('en-US')
const formatLiters = (value) => value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** أرقام + نقطة عشرية واحدة فقط: النقطة الثانية وأي محارف أخرى تُهمَل */
const onlyNumber = (value) => {
  const cleaned = value.replace(/[^\d.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}

const SHARED_FIELDS = [
  { id: 'cost-efficiency', key: 'kmPerLiter', label: 'الاستهلاك (كم لكل لتر) — تقديرك أنت', placeholder: 'مثال: 25' },
  { id: 'cost-fuel-price', key: 'fuelPrice', label: 'سعر لتر الوقود (ج.م) — من منطقتك', placeholder: 'مثال: 14' },
  { id: 'cost-maintenance', key: 'maintenance', label: 'الصيانة الشهرية (ج.م) — تقديرك أنت', placeholder: 'مثال: 200' },
  { id: 'cost-other', key: 'otherExpenses', label: 'مصاريف شهرية أخرى (ج.م) — اختيارية', placeholder: 'مثال: 100' },
]

function OwnershipCostCalculator() {
  const [distanceMode, setDistanceMode] = useState('daily')
  const [values, setValues] = useState({
    dailyKm: '',
    daysPerMonth: '',
    monthlyKm: '',
    kmPerLiter: '',
    fuelPrice: '',
    maintenance: '',
    otherExpenses: '',
  })

  const result = calculateOwnershipCost({ ...values, distanceMode })

  const onChange = (key) => (event) => {
    setValues((prev) => ({ ...prev, [key]: onlyNumber(event.target.value) }))
  }

  return (
    <section className="section ownership" id="ownership-cost">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">حاسبة التشغيل</p>
          <h2 className="section-title">احسب تكلفة تشغيل موتوسيكلك شهريًا</h2>
          <p className="section-sub">
            أدخل مسافتك (يوميًا مع أيام الركوب أو شهريًا مباشرة) واستهلاك الموتوسيكل وسعر اللتر
            وتكاليف الصيانة، لترى تقديرًا لاستهلاك الوقود وتكلفة التشغيل شهريًا وسنويًا.
          </p>
        </div>

        <div className="cost-panel">
          <div className="cost-controls">
            <div className="cost-field">
              <span className="cost-label" id="cost-mode-label">
                طريقة إدخال المسافة
              </span>
              <div className="cost-chips" role="group" aria-labelledby="cost-mode-label">
                <button
                  type="button"
                  className={`cost-chip ${distanceMode === 'daily' ? 'is-active' : ''}`}
                  aria-pressed={distanceMode === 'daily'}
                  onClick={() => setDistanceMode('daily')}
                >
                  يوميًا × أيام الركوب
                </button>
                <button
                  type="button"
                  className={`cost-chip ${distanceMode === 'monthly' ? 'is-active' : ''}`}
                  aria-pressed={distanceMode === 'monthly'}
                  onClick={() => setDistanceMode('monthly')}
                >
                  مسافة شهرية مباشرة
                </button>
              </div>
              <p className="cost-hint">التبديل بين الوضعين لا يضيع ما أدخلته — كل وضع يحتفظ بقيمته.</p>
            </div>

            {distanceMode === 'daily' ? (
              <>
                <div className="cost-field">
                  <label className="cost-label" htmlFor="cost-daily-km">
                    المسافة اليومية (كم)
                  </label>
                  <input
                    id="cost-daily-km"
                    className="cost-input"
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    placeholder="مثال: 30"
                    value={values.dailyKm}
                    onChange={onChange('dailyKm')}
                  />
                </div>
                <div className="cost-field">
                  <label className="cost-label" htmlFor="cost-days">
                    أيام الركوب في الشهر
                  </label>
                  <input
                    id="cost-days"
                    className="cost-input"
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    placeholder="مثال: 26"
                    value={values.daysPerMonth}
                    onChange={onChange('daysPerMonth')}
                  />
                </div>
              </>
            ) : (
              <div className="cost-field">
                <label className="cost-label" htmlFor="cost-monthly-km">
                  المسافة الشهرية (كم)
                </label>
                <input
                  id="cost-monthly-km"
                  className="cost-input"
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="مثال: 780"
                  value={values.monthlyKm}
                  onChange={onChange('monthlyKm')}
                />
              </div>
            )}

            {SHARED_FIELDS.map((field) => (
              <div className="cost-field" key={field.key}>
                <label className="cost-label" htmlFor={field.id}>
                  {field.label}
                </label>
                <input
                  id={field.id}
                  className="cost-input"
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  placeholder={field.placeholder}
                  value={values[field.key]}
                  onChange={onChange(field.key)}
                />
              </div>
            ))}
          </div>

          <div className="cost-result" aria-live="polite">
            {result.ok ? (
              <>
                <div className="cost-result-grid">
                  <div className="cost-stat">
                    <p className="cost-stat-label">المسافة الشهرية</p>
                    <p className="cost-stat-value" dir="ltr">
                      {formatEGP(result.monthlyKm)}
                    </p>
                    <p className="cost-stat-unit">كم / شهر</p>
                  </div>
                  <div className="cost-stat">
                    <p className="cost-stat-label">استهلاك الوقود الشهري</p>
                    <p className="cost-stat-value" dir="ltr">
                      {formatLiters(result.monthlyLiters)}
                    </p>
                    <p className="cost-stat-unit">لتر / شهر</p>
                  </div>
                  <div className="cost-stat">
                    <p className="cost-stat-label">تكلفة الوقود الشهرية</p>
                    <p className="cost-stat-value" dir="ltr">
                      {formatEGP(result.monthlyFuelCost)}
                    </p>
                    <p className="cost-stat-unit">ج.م / شهر</p>
                  </div>
                  <div className="cost-stat cost-stat-focus">
                    <p className="cost-stat-label">إجمالي التشغيل الشهري</p>
                    <p className="cost-stat-value" dir="ltr">
                      {formatEGP(result.monthlyTotal)}
                    </p>
                    <p className="cost-stat-unit">ج.م / شهر</p>
                  </div>
                  <div className="cost-stat">
                    <p className="cost-stat-label">إجمالي التشغيل السنوي</p>
                    <p className="cost-stat-value" dir="ltr">
                      {formatEGP(result.annualTotal)}
                    </p>
                    <p className="cost-stat-unit">ج.م / سنة</p>
                  </div>
                </div>

                <p className="cost-note">
                  النتائج تقديرات محسوبة من القيم التي أدخلتها أنت: لترات الشهر = (المسافة الشهرية
                  ÷ كم لكل لتر)، تكلفة الوقود = اللترات × سعر اللتر، والإجمالي = الوقود + الصيانة +
                  مصاريف أخرى، والسنوي = الشهري × 12. الاستهلاك وسعر اللتر ومصاريف الصيانة كلها
                  تقديراتك أنت — ليست مواصفات موثقة من المعرض.
                </p>
              </>
            ) : (
              <p className="cost-hint">{result.error}</p>
            )}
          </div>
        </div>

        <div className="cost-compare-cta">
          <a href="#running-cost" className="btn btn-ghost">
            قارن تكلفة تشغيل موديلين — بالأسفل
          </a>
        </div>

        <p className="cost-disclaimer">
          تقديرات استرشادية من مُدخلاتك فقط — لا نفترض أي سعر وقود ولا أي رقم استهلاك لموديل بعينه،
          فادخل أرقام موتوسيكلك وأسعار منطقتك للحصول على تقدير أقرب للواقع، والأرقام الفعلية تختلف
          حسب أسعار المحروقات وطريقة القيادة وحالة الصيانة.
        </p>
      </div>
    </section>
  )
}

export default OwnershipCostCalculator
