import { useState } from 'react'
import { addService, removeService, updateService } from '../data/garageStore'
import { formatAmount, formatDate, sortServices, sumServiceCosts, todayISO } from '../data/garageStats'

/**
 * سجل الخدمات — سجل شخصي أنشأه العميل، وليس سجلًا رسميًا من المعرض.
 * يُرتَّب زمنيًا (الأحدث أولًا)، والمجموع يعرض التكاليف المسجَّلة فعلًا فقط.
 */

const SERVICE_TYPES = ['صيانة دورية', 'تغيير زيت', 'فحص فرامل', 'إطارات', 'سلسلة أو حزام', 'كهرباء', 'إصلاح', 'أخرى']

function emptyForm(vehicle) {
  return {
    serviceDate: todayISO(),
    odometer: vehicle.odometer === null ? '' : String(vehicle.odometer),
    serviceType: SERVICE_TYPES[0],
    description: '',
    cost: '',
    notes: '',
  }
}

function ServiceHistory({ vehicle, garage }) {
  const [form, setForm] = useState(() => emptyForm(vehicle))
  const [editingId, setEditingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmId, setConfirmId] = useState('')

  const services = sortServices(garage.services.filter((service) => service.vehicleKey === vehicle.vehicleKey))
  const totals = sumServiceCosts(services)

  const setField = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))
  const setNumberField = (key) => (event) =>
    setForm((previous) => ({ ...previous, [key]: event.target.value.replace(/[^\d]/g, '') }))

  const resetForm = () => {
    setEditingId('')
    setError('')
    setForm(emptyForm(vehicle))
  }

  const submit = (event) => {
    event.preventDefault()
    setNotice('')
    const payload = { ...form, vehicleKey: vehicle.vehicleKey }
    const result = editingId ? updateService(editingId, payload) : addService(payload)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
    setNotice(editingId ? 'تم تحديث سجل الخدمة.' : 'تمت إضافة سجل الخدمة.')
    resetForm()
  }

  const startEdit = (service) => {
    setEditingId(service.id)
    setError('')
    setNotice('')
    setForm({
      serviceDate: service.serviceDate,
      odometer: String(service.odometer),
      serviceType: service.serviceType,
      description: service.description,
      cost: service.cost === null ? '' : String(service.cost),
      notes: service.notes || '',
    })
  }

  const remove = (serviceId) => {
    const result = removeService(serviceId)
    setConfirmId('')
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (editingId === serviceId) resetForm()
    setNotice('تم حذف سجل الخدمة.')
  }

  return (
    <section className="garage-section" aria-labelledby="garage-services-title">
      <div className="garage-section-head">
        <h3 className="garage-subhead" id="garage-services-title">
          سجل الخدمات
        </h3>
        <p className="garage-hint">
          سجّل الصيانات والإصلاحات المكتملة. هذا سجل شخصي على جهازك — وليس سجلًا رسميًا من المعرض
          أو مركز الخدمة.
        </p>
      </div>

      <form className="garage-form" onSubmit={submit} noValidate>
        <h4 className="garage-form-title">{editingId ? 'تعديل سجل خدمة' : 'إضافة سجل خدمة'}</h4>
        <div className="garage-form-grid">
          <div className="garage-field">
            <label className="garage-label" htmlFor="service-date">
              تاريخ الخدمة
            </label>
            <input
              id="service-date"
              className="garage-input"
              type="date"
              value={form.serviceDate}
              onChange={setField('serviceDate')}
              required
            />
          </div>
          <div className="garage-field">
            <label className="garage-label" htmlFor="service-odometer">
              قراءة العداد (كم)
            </label>
            <input
              id="service-odometer"
              className="garage-input"
              type="text"
              inputMode="numeric"
              value={form.odometer}
              onChange={setNumberField('odometer')}
              placeholder="مثال: 4500"
              required
            />
          </div>
          <div className="garage-field">
            <label className="garage-label" htmlFor="service-type">
              نوع الخدمة
            </label>
            <select
              id="service-type"
              className="garage-select"
              value={form.serviceType}
              onChange={setField('serviceType')}
            >
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="garage-field">
            <label className="garage-label" htmlFor="service-cost">
              التكلفة (ج.م، اختياري)
            </label>
            <input
              id="service-cost"
              className="garage-input"
              type="text"
              inputMode="decimal"
              value={form.cost}
              onChange={setField('cost')}
              placeholder="مثال: 350"
            />
          </div>
          <div className="garage-field garage-field-wide">
            <label className="garage-label" htmlFor="service-description">
              وصف الخدمة
            </label>
            <input
              id="service-description"
              className="garage-input"
              type="text"
              value={form.description}
              onChange={setField('description')}
              placeholder="مثال: تغيير زيت وفلتر"
              maxLength={1000}
              required
            />
          </div>
          <div className="garage-field garage-field-wide">
            <label className="garage-label" htmlFor="service-notes">
              ملاحظات (اختياري)
            </label>
            <textarea
              id="service-notes"
              className="garage-input garage-textarea"
              value={form.notes}
              onChange={setField('notes')}
              maxLength={1000}
              rows={2}
            />
          </div>
        </div>

        {error && (
          <p className="garage-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="garage-notice" role="status">
            {notice}
          </p>
        )}

        <div className="garage-actions">
          <button type="submit" className="garage-btn garage-btn-primary">
            {editingId ? 'حفظ التعديل' : 'إضافة السجل'}
          </button>
          {editingId && (
            <button type="button" className="garage-btn" onClick={resetForm}>
              إلغاء التعديل
            </button>
          )}
        </div>
      </form>

      <div className="garage-stat-grid">
        <div className="garage-stat">
          <span className="garage-stat-label">إجمالي تكاليف الخدمات المسجَّلة</span>
          <b>{formatAmount(totals.total)} ج.م</b>
          <small>
            {totals.count} سجل — {totals.withCost} بتكلفة مسجَّلة
          </small>
        </div>
        <div className="garage-stat">
          <span className="garage-stat-label">آخر خدمة مسجَّلة</span>
          <b>{services.length > 0 ? formatDate(services[0].serviceDate) : '—'}</b>
          <small>{services.length > 0 ? services[0].serviceType : 'لا توجد سجلات بعد'}</small>
        </div>
      </div>

      <p className="garage-hint">
        المجموع يشمل التكاليف التي أدخلتها فقط؛ السجلات بلا تكلفة لا تُحسب صفرًا.
      </p>

      {services.length === 0 ? (
        <div className="garage-empty">
          <p className="garage-empty-title">لا توجد سجلات خدمة</p>
          <p className="garage-empty-sub">أضف أول صيانة أو إصلاح من النموذج أعلاه ليظهر هنا زمنيًا.</p>
        </div>
      ) : (
        <ul className="garage-list">
          {services.map((service) => (
            <li className="garage-item" key={service.id}>
              <div className="garage-item-head">
                <h4>{service.serviceType}</h4>
                <span className="garage-badge garage-badge-mine">سجل شخصي</span>
              </div>
              <ul className="garage-meta">
                <li>التاريخ: {formatDate(service.serviceDate)}</li>
                <li>العداد: {formatAmount(service.odometer)} كم</li>
                <li>
                  التكلفة:{' '}
                  {service.cost === null ? 'غير مسجَّلة' : `${formatAmount(service.cost)} ج.م`}
                </li>
              </ul>
              <p className="garage-description">{service.description}</p>
              {service.notes && <p className="garage-notes">{service.notes}</p>}
              <div className="garage-item-actions">
                <button type="button" className="garage-btn garage-btn-small" onClick={() => startEdit(service)}>
                  تعديل
                </button>
                {confirmId === service.id ? (
                  <>
                    <button
                      type="button"
                      className="garage-btn garage-btn-small garage-btn-danger"
                      onClick={() => remove(service.id)}
                    >
                      تأكيد الحذف
                    </button>
                    <button type="button" className="garage-btn garage-btn-small" onClick={() => setConfirmId('')}>
                      إلغاء
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="garage-btn garage-btn-small garage-btn-danger"
                    onClick={() => setConfirmId(service.id)}
                  >
                    حذف
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default ServiceHistory
