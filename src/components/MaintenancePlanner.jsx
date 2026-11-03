import { useState } from 'react'
import { addReminder, removeReminder, updateReminder } from '../data/garageStore'
import { formatAmount, formatDate, sortReminders, summarizeReminders, todayISO } from '../data/garageStats'

/**
 * مخطط الصيانة — تذكيرات من إعداد العميل فقط.
 * لا توجد فترات مصنّع موثّقة في مصادر المشروع، لذلك كل تذكير هنا يُعرض
 * بوسم «من إعدادك» بلا أي ادعاء أنه توصية رسمية.
 */

function emptyForm(vehicle) {
  return {
    taskName: '',
    lastServiceDate: todayISO(),
    lastServiceOdometer: vehicle.odometer === null ? '' : String(vehicle.odometer),
    nextDueDate: '',
    nextDueOdometer: '',
    notes: '',
  }
}

function MaintenancePlanner({ vehicle, garage }) {
  const [form, setForm] = useState(() => emptyForm(vehicle))
  const [editingId, setEditingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmId, setConfirmId] = useState('')

  const today = todayISO()
  const odometerByKey = { [vehicle.vehicleKey]: vehicle.odometer }
  const reminders = sortReminders(
    garage.reminders.filter((reminder) => reminder.vehicleKey === vehicle.vehicleKey),
    { today, odometerByKey },
  )
  const summary = summarizeReminders(reminders)

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
    const result = editingId ? updateReminder(editingId, payload) : addReminder(payload)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
    setNotice(editingId ? 'تم تحديث التذكير.' : 'تمت إضافة التذكير.')
    resetForm()
  }

  const startEdit = (reminder) => {
    setEditingId(reminder.id)
    setError('')
    setNotice('')
    setForm({
      taskName: reminder.taskName,
      lastServiceDate: reminder.lastServiceDate,
      lastServiceOdometer: String(reminder.lastServiceOdometer),
      nextDueDate: reminder.nextDueDate || '',
      nextDueOdometer: reminder.nextDueOdometer === null ? '' : String(reminder.nextDueOdometer),
      notes: reminder.notes || '',
    })
  }

  const remove = (reminderId) => {
    const result = removeReminder(reminderId)
    setConfirmId('')
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (editingId === reminderId) resetForm()
    setNotice('تم حذف التذكير.')
  }

  return (
    <section className="garage-section" aria-labelledby="garage-maintenance-title">
      <div className="garage-section-head">
        <h3 className="garage-subhead" id="garage-maintenance-title">
          مخطط الصيانة
        </h3>
        <p className="garage-hint">
          سجّل آخر صيانة وحدّد موعد التذكير التالي بتاريخ أو بقراءة عداد — كل التذكيرات من إعدادك.
        </p>
      </div>

      <div className="garage-honesty" role="note">
        <p>
          <span className="garage-badge garage-badge-mine">من إعدادك</span> كل التذكيرات أدناه
          أنشأتها أنت، وليست فترات صيانة رسمية من المصنّع.
        </p>
        <p>
          <span className="garage-badge garage-badge-verified">توصية مصنّع موثّقة</span> غير متوفرة
          في مصادر المشروع لهذا الموديل — راجع دليل المالك أو مركز خدمة معتمد لمعرفة الفترات الصحيحة.
        </p>
      </div>

      <form className="garage-form" onSubmit={submit} noValidate>
        <h4 className="garage-form-title">{editingId ? 'تعديل تذكير' : 'إضافة تذكير جديد'}</h4>
        <div className="garage-form-grid">
          <div className="garage-field garage-field-wide">
            <label className="garage-label" htmlFor="reminder-task">
              اسم مهمة الصيانة
            </label>
            <input
              id="reminder-task"
              className="garage-input"
              type="text"
              value={form.taskName}
              onChange={setField('taskName')}
              placeholder="مثال: تغيير زيت المحرك"
              maxLength={120}
              required
            />
          </div>
          <div className="garage-field">
            <label className="garage-label" htmlFor="reminder-last-date">
              تاريخ آخر صيانة
            </label>
            <input
              id="reminder-last-date"
              className="garage-input"
              type="date"
              value={form.lastServiceDate}
              onChange={setField('lastServiceDate')}
              required
            />
          </div>
          <div className="garage-field">
            <label className="garage-label" htmlFor="reminder-last-odo">
              عداد آخر صيانة (كم)
            </label>
            <input
              id="reminder-last-odo"
              className="garage-input"
              type="text"
              inputMode="numeric"
              value={form.lastServiceOdometer}
              onChange={setNumberField('lastServiceOdometer')}
              placeholder="مثال: 4000"
              required
            />
          </div>
          <div className="garage-field">
            <label className="garage-label" htmlFor="reminder-next-date">
              موعد التذكير التالي (تاريخ)
            </label>
            <input
              id="reminder-next-date"
              className="garage-input"
              type="date"
              value={form.nextDueDate}
              onChange={setField('nextDueDate')}
            />
          </div>
          <div className="garage-field">
            <label className="garage-label" htmlFor="reminder-next-odo">
              موعد التذكير التالي (عداد كم)
            </label>
            <input
              id="reminder-next-odo"
              className="garage-input"
              type="text"
              inputMode="numeric"
              value={form.nextDueOdometer}
              onChange={setNumberField('nextDueOdometer')}
              placeholder="مثال: 5000"
            />
          </div>
          <div className="garage-field garage-field-wide">
            <label className="garage-label" htmlFor="reminder-notes">
              ملاحظات (اختياري)
            </label>
            <textarea
              id="reminder-notes"
              className="garage-input garage-textarea"
              value={form.notes}
              onChange={setField('notes')}
              maxLength={1000}
              rows={3}
            />
          </div>
        </div>

        <p className="garage-hint">أضف تاريخًا أو قراءة عداد على الأقل لموعد التذكير التالي.</p>
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
            {editingId ? 'حفظ التعديل' : 'إضافة التذكير'}
          </button>
          {editingId && (
            <button type="button" className="garage-btn" onClick={resetForm}>
              إلغاء التعديل
            </button>
          )}
        </div>
      </form>

      <p className="garage-summary-line" aria-live="polite">
        {reminders.length === 0
          ? 'لا توجد تذكيرات لهذا الموتوسيكل بعد.'
          : `${reminders.length} تذكير: ${summary.overdue} متأخر، ${summary.due} مستحق الآن، ${summary.soon} قريب، ${summary['need-odometer']} بحاجة لقراءة عداد، ${summary.upcoming} قادم.`}
      </p>

      {reminders.length === 0 ? (
        <div className="garage-empty">
          <p className="garage-empty-title">لا توجد تذكيرات صيانة</p>
          <p className="garage-empty-sub">
            أضف أول تذكير من النموذج أعلاه. التذكير يبقى محفوظًا على هذا المتصفح فقط.
          </p>
        </div>
      ) : (
        <ul className="garage-list">
          {reminders.map((reminder) => (
            <li className={`garage-item garage-item-${reminder.status}`} key={reminder.id}>
              <div className="garage-item-head">
                <h4>{reminder.taskName}</h4>
                <span className={`garage-badge garage-badge-${reminder.status}`}>{reminder.statusLabel}</span>
                <span className="garage-badge garage-badge-mine">من إعدادك</span>
              </div>
              <ul className="garage-meta">
                <li>آخر صيانة: {formatDate(reminder.lastServiceDate)}</li>
                <li>عداد آخر صيانة: {formatAmount(reminder.lastServiceOdometer)} كم</li>
                {reminder.nextDueDate && <li>موعد التذكير: {formatDate(reminder.nextDueDate)}</li>}
                {reminder.nextDueOdometer !== null && (
                  <li>عداد التذكير: {formatAmount(reminder.nextDueOdometer)} كم</li>
                )}
              </ul>
              {reminder.statusReasons.length > 0 && (
                <p className="garage-reason">{reminder.statusReasons.join(' • ')}</p>
              )}
              {reminder.notes && <p className="garage-notes">{reminder.notes}</p>}
              <div className="garage-item-actions">
                <button type="button" className="garage-btn garage-btn-small" onClick={() => startEdit(reminder)}>
                  تعديل
                </button>
                {confirmId === reminder.id ? (
                  <>
                    <button
                      type="button"
                      className="garage-btn garage-btn-small garage-btn-danger"
                      onClick={() => remove(reminder.id)}
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
                    onClick={() => setConfirmId(reminder.id)}
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

export default MaintenancePlanner
