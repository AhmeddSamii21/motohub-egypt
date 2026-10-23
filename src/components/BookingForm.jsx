import { useState } from 'react'
import { FEATURED_MODELS } from '../data/content'
import './BookingForm.css'

/**
 * رابط Google Apps Script Web App — يُرسل إليه الطلب عبر fetch.
 * ملاحظة: مع mode:"no-cors" يكون الرد opaque لذلك نكتفي بغياب خطأ الشبكة كنتيجة نجاح.
 */
const WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbwaqp6PRUhE_cyGUO6MDqLd8VJTyfa9SwCDXHgr76o2mfeZ3E8OC27MnRK1XrjWPwiP9g/exec'

const EMPTY = {
  fullName: '',
  phone: '',
  motorcycleModel: '',
  preferredDate: '',
  notes: '',
}

/**
 * تحقق عربي بسيط وواضح — يرجع كائن أخطاء لكل حقل (فارغ = صحيح).
 */
function validate(values) {
  const errors = {}

  if (!values.fullName.trim()) {
    errors.fullName = 'الاسم الكامل مطلوب.'
  } else if (values.fullName.trim().length < 3) {
    errors.fullName = 'اكتب الاسم الكامل (3 أحرف على الأقل).'
  }

  if (!values.phone.trim()) {
    errors.phone = 'رقم الهاتف مطلوب.'
  } else {
    const digits = values.phone.replace(/[\s-]/g, '')
    if (!/^\+?\d{8,15}$/.test(digits)) {
      errors.phone = 'ادخل رقم هاتف صحيح (8 إلى 15 رقمًا، أرقام فقط).'
    }
  }

  if (!values.motorcycleModel) {
    errors.motorcycleModel = 'اختر الموديل المطلوب.'
  }

  return errors
}

/**
 * حساب أدنى تاريخ مسموح (اليوم) خارج دورة الرندر —
 * يُعاد حسابه عند فتح حقل التاريخ ليبقى صحيحًا لو ظل التبويب مفتوحًا عبر منتصف الليل.
 */
function computeMinDate() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function BookingForm() {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | success | error
  const [minDate, setMinDate] = useState(() => computeMinDate())

  const refreshMinDate = () => setMinDate(computeMinDate())

  const handleChange = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }))
    // نشيل رسالة خطأ الحقل أول ما يبدأ المستخدم بتصحيحه
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
    if (status === 'error') setStatus('idle')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)
    const hasErrors = Object.values(nextErrors).some(Boolean)
    if (hasErrors) return

    setStatus('sending')

    const payload = new URLSearchParams({
      fullName: values.fullName.trim(),
      phone: values.phone.trim(),
      motorcycleModel: values.motorcycleModel,
      preferredDate: values.preferredDate,
      notes: values.notes.trim(),
    })

    try {
      await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: payload,
      })
      // مع no-cors لا يمكن قراءة الرد؛ غياب الشذوذ يعتبر نجاحًا
      setValues(EMPTY)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="section booking" id="book">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">حجز معاينة</p>
          <h2 className="section-title">احجز معاينة في المعرض</h2>
          <p className="section-sub">
            سجّل بياناتك وسيتواصل معك الفريق لتأكيد الموعد. (نموذج تجريبي ضمن بورتفوليو)
          </p>
        </div>

        <form className="booking-form" noValidate onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="full-name">الاسم الكامل <span className="req">*</span></label>
            <input
              id="full-name"
              name="fullName"
              type="text"
              value={values.fullName}
              onChange={handleChange('fullName')}
              placeholder="مثال: أحمد محمد علي"
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? 'error-full-name' : undefined}
            />
            {errors.fullName && (
              <p className="field-error" id="error-full-name" role="alert">{errors.fullName}</p>
            )}
          </div>

          <div className="field">
            <label htmlFor="phone">رقم الهاتف <span className="req">*</span></label>
            <input
              id="phone"
              name="phone"
              type="tel"
              dir="ltr"
              inputMode="tel"
              value={values.phone}
              onChange={handleChange('phone')}
              placeholder="01xxxxxxxxx"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'error-phone' : undefined}
            />
            {errors.phone && (
              <p className="field-error" id="error-phone" role="alert">{errors.phone}</p>
            )}
          </div>

          <div className="field">
            <label htmlFor="motorcycle-model">الموديل المطلوب <span className="req">*</span></label>
            <select
              id="motorcycle-model"
              name="motorcycleModel"
              value={values.motorcycleModel}
              onChange={handleChange('motorcycleModel')}
              aria-invalid={Boolean(errors.motorcycleModel)}
              aria-describedby={errors.motorcycleModel ? 'error-motorcycle-model' : undefined}
            >
              <option value="">— اختر الموديل —</option>
              {FEATURED_MODELS.map((model) => (
                <option key={model.id} value={model.name}>
                  {model.name}
                </option>
              ))}
              <option value="موديل آخر">موديل آخر / مش متأكد</option>
            </select>
            {errors.motorcycleModel && (
              <p className="field-error" id="error-motorcycle-model" role="alert">
                {errors.motorcycleModel}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="preferred-date">التاريخ المفضل</label>
            <input
              id="preferred-date"
              name="preferredDate"
              type="date"
              min={minDate}
              value={values.preferredDate}
              onChange={handleChange('preferredDate')}
              onFocus={refreshMinDate}
            />
          </div>

          <div className="field field-full">
            <label htmlFor="notes">ملاحظات (اختياري)</label>
            <textarea
              id="notes"
              name="notes"
              rows="3"
              value={values.notes}
              onChange={handleChange('notes')}
              placeholder="أي تفاصيل إضافية تود إبلاغنا بها…"
            />
          </div>

          <div className="field-full form-footer">
            <button
              type="submit"
              className="btn btn-primary booking-submit"
              disabled={status === 'sending'}
            >
              {status === 'sending' ? 'جارٍ إرسال الطلب…' : 'إرسال طلب الحجز'}
            </button>

            <p className="disclaimer">
              بياناتك تُرسل مباشرة لأرشيف الحجز الخاص بالمعرض وتُستخدم للتواصل بخصوص موعدك فقط.
            </p>

            <div aria-live="polite">
              {status === 'success' && (
                <p className="form-msg form-msg-success" role="status">
                  ✅ تم إرسال طلب الحجز بنجاح — هنتواصل معك قريب لتأكيد الرحلة.
                </p>
              )}
              {status === 'error' && (
                <p className="form-msg form-msg-error" role="alert">
                  ⚠️ حصل خطأ وقت إرسال الطلب. جرّب تاني أو تواصل معنا هاتفيًا.
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}

export default BookingForm
