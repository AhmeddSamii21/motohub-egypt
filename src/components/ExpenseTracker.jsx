import { useState } from 'react'
import { EXPENSE_CATEGORIES, addExpense, removeExpense, updateExpense } from '../data/garageStore'
import { filterExpenses, formatAmount, formatDate, summarizeExpenses, todayISO } from '../data/garageStats'

/**
 * متتبّع مصاريف الملكية — يسجّل مبالغ أنفقها العميل فعلًا.
 * ليس تقديرًا وليس بديلًا عن حاسبة التشغيل: الأرقام هنا من إدخال العميل فقط.
 * الفلترة بالموتوسيكل ونطاق تاريخ شامل، والمجاميع تُحسب من السجلات المفلترة.
 */

function emptyForm(vehicleKey) {
  return { vehicleKey, date: todayISO(), category: 'fuel', amount: '', notes: '' }
}

function ExpenseTracker({ garage, defaultVehicleKey }) {
  const [filters, setFilters] = useState({ vehicleKey: defaultVehicleKey, fromDate: '', toDate: '' })
  const [form, setForm] = useState(() => emptyForm(defaultVehicleKey))
  const [editingId, setEditingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmId, setConfirmId] = useState('')

  const today = todayISO()
  const filtered = filterExpenses(garage.expenses, filters)
  const summary = summarizeExpenses(filtered, { today })
  const vehicleLabel = (vehicleKey) => {
    const vehicle = garage.vehicles.find((entry) => entry.vehicleKey === vehicleKey)
    return vehicle ? `${vehicle.brand} — ${vehicle.name}` : vehicleKey
  }

  const setFilter = (key) => (event) => setFilters((previous) => ({ ...previous, [key]: event.target.value }))
  const setField = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))
  const setAmount = (event) => setForm((previous) => ({ ...previous, amount: event.target.value.replace(/[^\d.]/g, '') }))

  const resetForm = () => {
    setEditingId('')
    setError('')
    setForm(emptyForm(defaultVehicleKey))
  }

  const submit = (event) => {
    event.preventDefault()
    setNotice('')
    const result = editingId ? updateExpense(editingId, form) : addExpense(form)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
    setNotice(editingId ? 'تم تحديث المصروف.' : 'تمت إضافة المصروف.')
    resetForm()
  }

  const startEdit = (expense) => {
    setEditingId(expense.id)
    setError('')
    setNotice('')
    setForm({
      vehicleKey: expense.vehicleKey,
      date: expense.date,
      category: expense.category,
      amount: String(expense.amount),
      notes: expense.notes || '',
    })
  }

  const remove = (expenseId) => {
    const result = removeExpense(expenseId)
    setConfirmId('')
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (editingId === expenseId) resetForm()
    setNotice('تم حذف المصروف.')
  }

  return (
    <section className="garage-section" aria-labelledby="garage-expenses-title">
      <div className="garage-section-head">
        <h3 className="garage-subhead" id="garage-expenses-title">
          متتبّع مصاريف الملكية
        </h3>
        <p className="garage-hint">
          سجّل ما أنفقته فعلًا على الوقود والصيانة وقطع الغيار وغيرها. هذه أرقام مسجَّلة أدخلتها
          أنت — وليست تقديرات حاسبة التشغيل.
        </p>
      </div>

      <form className="garage-form" onSubmit={submit} noValidate>
        <h4 className="garage-form-title">{editingId ? 'تعديل مصروف' : 'إضافة مصروف'}</h4>
        <div className="garage-form-grid">
          <div className="garage-field">
            <label className="garage-label" htmlFor="expense-vehicle">
              الموتوسيكل
            </label>
            <select
              id="expense-vehicle"
              className="garage-select"
              value={form.vehicleKey}
              onChange={setField('vehicleKey')}
            >
              {garage.vehicles.map((vehicle) => (
                <option key={vehicle.vehicleKey} value={vehicle.vehicleKey}>
                  {vehicle.brand} — {vehicle.name}
                </option>
              ))}
            </select>
          </div>
          <div className="garage-field">
            <label className="garage-label" htmlFor="expense-date">
              التاريخ
            </label>
            <input
              id="expense-date"
              className="garage-input"
              type="date"
              value={form.date}
              onChange={setField('date')}
              required
            />
          </div>
          <div className="garage-field">
            <label className="garage-label" htmlFor="expense-category">
              التصنيف
            </label>
            <select
              id="expense-category"
              className="garage-select"
              value={form.category}
              onChange={setField('category')}
            >
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <div className="garage-field">
            <label className="garage-label" htmlFor="expense-amount">
              المبلغ (ج.م)
            </label>
            <input
              id="expense-amount"
              className="garage-input"
              type="text"
              inputMode="decimal"
              value={form.amount}
              onChange={setAmount}
              placeholder="مثال: 250"
              required
            />
          </div>
          <div className="garage-field garage-field-wide">
            <label className="garage-label" htmlFor="expense-notes">
              ملاحظات (اختياري)
            </label>
            <input
              id="expense-notes"
              className="garage-input"
              type="text"
              value={form.notes}
              onChange={setField('notes')}
              maxLength={1000}
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
            {editingId ? 'حفظ التعديل' : 'إضافة المصروف'}
          </button>
          {editingId && (
            <button type="button" className="garage-btn" onClick={resetForm}>
              إلغاء التعديل
            </button>
          )}
        </div>
      </form>

      <div className="garage-filters" role="group" aria-label="فلترة المصاريف">
        <div className="garage-field">
          <label className="garage-label" htmlFor="expense-filter-vehicle">
            الموتوسيكل
          </label>
          <select
            id="expense-filter-vehicle"
            className="garage-select"
            value={filters.vehicleKey}
            onChange={setFilter('vehicleKey')}
          >
            <option value="">كل الموتوسيكلات</option>
            {garage.vehicles.map((vehicle) => (
              <option key={vehicle.vehicleKey} value={vehicle.vehicleKey}>
                {vehicle.brand} — {vehicle.name}
              </option>
            ))}
          </select>
        </div>
        <div className="garage-field">
          <label className="garage-label" htmlFor="expense-filter-from">
            من تاريخ
          </label>
          <input
            id="expense-filter-from"
            className="garage-input"
            type="date"
            value={filters.fromDate}
            onChange={setFilter('fromDate')}
          />
        </div>
        <div className="garage-field">
          <label className="garage-label" htmlFor="expense-filter-to">
            إلى تاريخ
          </label>
          <input
            id="expense-filter-to"
            className="garage-input"
            type="date"
            value={filters.toDate}
            onChange={setFilter('toDate')}
          />
        </div>
        <button
          type="button"
          className="garage-btn"
          onClick={() => setFilters({ vehicleKey: '', fromDate: '', toDate: '' })}
        >
          مسح الفلاتر
        </button>
      </div>

      <div className="garage-stat-grid">
        <div className="garage-stat">
          <span className="garage-stat-label">إجمالي المصاريف المفلترة</span>
          <b>{formatAmount(summary.total)} ج.م</b>
          <small>{summary.count} مصروف مسجَّل</small>
        </div>
        <div className="garage-stat">
          <span className="garage-stat-label">هذا الشهر (من المفلتر)</span>
          <b>{formatAmount(summary.currentMonth)} ج.م</b>
          <small>{today.slice(0, 7).replace('-', '/')}</small>
        </div>
        <div className="garage-stat">
          <span className="garage-stat-label">هذه السنة (من المفلتر)</span>
          <b>{formatAmount(summary.currentYear)} ج.م</b>
          <small>{today.slice(0, 4)}</small>
        </div>
      </div>

      {summary.byCategory.length > 0 && (
        <div className="garage-breakdown">
          <h4 className="garage-form-title">التوزيع حسب التصنيف</h4>
          <ul>
            {summary.byCategory.map((category) => {
              const percent = summary.total > 0 ? Math.round((category.total / summary.total) * 100) : 0
              return (
                <li key={category.id}>
                  <div className="garage-breakdown-head">
                    <span>
                      {category.label} <small>({category.count})</small>
                    </span>
                    <b>
                      {formatAmount(category.total)} ج.م — {percent}%
                    </b>
                  </div>
                  <div className="garage-bar" aria-hidden="true">
                    <span style={{ width: `${percent}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {summary.monthly.length > 0 && (
        <div className="garage-totals-grid">
          <div>
            <h4 className="garage-form-title">الإجمالي الشهري</h4>
            <ul className="garage-totals">
              {summary.monthly.map((group) => (
                <li key={group.key}>
                  <span>{group.key.replace('-', '/')}</span>
                  <b>{formatAmount(group.total)} ج.م</b>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="garage-form-title">الإجمالي السنوي</h4>
            <ul className="garage-totals">
              {summary.yearly.map((group) => (
                <li key={group.key}>
                  <span>{group.key}</span>
                  <b>{formatAmount(group.total)} ج.م</b>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="garage-empty">
          <p className="garage-empty-title">لا توجد مصاريف مطابقة</p>
          <p className="garage-empty-sub">أضف مصروفًا أو غيّر الموتوسيكل/نطاق التاريخ في الفلاتر.</p>
        </div>
      ) : (
        <ul className="garage-list">
          {filtered
            .slice()
            .sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1))
            .map((expense) => {
              const category = EXPENSE_CATEGORIES.find((entry) => entry.id === expense.category)
              return (
                <li className="garage-item" key={expense.id}>
                  <div className="garage-item-head">
                    <h4>{category ? category.label : expense.category}</h4>
                    <b className="garage-amount">{formatAmount(expense.amount)} ج.م</b>
                  </div>
                  <ul className="garage-meta">
                    <li>التاريخ: {formatDate(expense.date)}</li>
                    <li>الموتوسيكل: {vehicleLabel(expense.vehicleKey)}</li>
                  </ul>
                  {expense.notes && <p className="garage-notes">{expense.notes}</p>}
                  <div className="garage-item-actions">
                    <button type="button" className="garage-btn garage-btn-small" onClick={() => startEdit(expense)}>
                      تعديل
                    </button>
                    {confirmId === expense.id ? (
                      <>
                        <button
                          type="button"
                          className="garage-btn garage-btn-small garage-btn-danger"
                          onClick={() => remove(expense.id)}
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
                        onClick={() => setConfirmId(expense.id)}
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
        </ul>
      )}

      <p className="garage-hint">
        السجلات المعروضة أعلاه مبالغ مسجَّلة فعليًا. لا تُقارَن مباشرة بتقديرات حاسبة التشغيل،
        لأن تلك الحاسبة تعتمد على مدخلات افتراضية وليست فواتير حقيقية.
      </p>
    </section>
  )
}

export default ExpenseTracker
