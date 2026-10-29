import { useState } from 'react'
import { calculateOwnershipCost } from '../data/ownershipCost'
import './OwnershipCostCalculator.css'

/**
 * حاسبة تكلفة تشغيل الموتوسيكل — استرشادية بالكامل وعلى المتصفح فقط:
 * - كل المدخلات من المستخدم (مسافة/أيام/استهلاك/سعر لتر/صيانة) — لا نفترض أي سعر وقود
 *   ولا أي رقم استهلاك لموديل معين؛ النتائج حصيلة معادلة على مُدخل المستخدم وحده.
 * - بلا واجهة خلفية ولا تخزين ولا إرسال — حساب فوري في المتصفح، وبلا أي زر إجراء/CTA
 *   حتى لا يمسّ مسار الحجز إطلاقًا.
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

const FIELDS = [
  { id: 'cost-daily-km', key: 'dailyKm', label: 'المسافة اليومية (كم)', placeholder: 'مثال: 30' },
  { id: 'cost-days', key: 'daysPerMonth', label: 'أيام الركوب في الشهر', placeholder: 'مثال: 26' },
  { id: 'cost-efficiency', key: 'kmPerLiter', label: 'الاستهلاك (كم لكل لتر)', placeholder: 'مثال: 25' },
  { id: 'cost-fuel-price', key: 'fuelPrice', label: 'سعر لتر الوقود (ج.م)', placeholder: 'مثال: 14' },
  { id: 'cost-maintenance', key: 'maintenance', label: 'الصيانة والمصاريف الشهرية (ج.م)', placeholder: 'مثال: 200' },
]

function OwnershipCostCalculator() {
  const [values, setValues] = useState({
    dailyKm: '',
    daysPerMonth: '',
    kmPerLiter: '',
    fuelPrice: '',
    maintenance: '',
  })

  const result = calculateOwnershipCost(values)

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
            أدخل مسافتك اليومية وأيام ركوبك شهريًا واستهلاك الموتوسيكل وسعر اللتر وتكاليف الصيانة،
            لترى تقديرًا لاستهلاك الوقود وتكلفة التشغيل شهريًا وسنويًا.
          </p>
        </div>

        <div className="cost-panel">
          <div className="cost-controls">
            {FIELDS.map((field) => (
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
                  النتائج تقديرات محسوبة من القيم التي أدخلتها أنت: لترات الشهر = (المسافة اليومية ×
                  أيام الركوب ÷ كم لكل لتر)، تكلفة الوقود = اللترات × سعر اللتر، والإجمالي = الوقود +
                  الصيانة، والسنوي = الشهري × 12.
                </p>
              </>
            ) : (
              <p className="cost-hint">{result.error}</p>
            )}
          </div>
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
