import { useEffect, useState } from 'react'
import { CATALOG } from '../data/catalog'
import { 
  GARAGE_EVENT, 
  addVehicle, 
  readGarage, 
  removeVehicle, 
  updateVehicleOdometer, 
  exportGarage, 
  parseGarageBackup, 
  restoreGarage 
} from '../data/garageStore'
import { formatAmount, formatDate, sortReminders, summarizeExpenses, summarizeReminders, todayISO } from '../data/garageStats'
import MaintenancePlanner from './MaintenancePlanner'
import ServiceHistory from './ServiceHistory'
import ExpenseTracker from './ExpenseTracker'
import CareGuide from './CareGuide'
import SmartOwnershipDashboard from './SmartOwnershipDashboard'
import './OwnershipCompanion.css'

/**
 * «رفيق الملكية» — أدوات العميل بعد الشراء: مخطط صيانة، سجل خدمات، متتبّع مصاريف،
 * ودليل عناية عام. كل البيانات محلية (localStorage) ولا تُرسل لأي خدمة خارجية.
 * لا توجد فترات صيانة مصنّعة: كل تذكير يُنشئه العميل ويُوسم بذلك صراحة.
 */

const TABS = [
  { id: 'dashboard', label: 'لوحة الملكية' },
  { id: 'maintenance', label: 'مخطط الصيانة' },
  { id: 'services', label: 'سجل الخدمات' },
  { id: 'expenses', label: 'مصاريف الملكية' },
  { id: 'guide', label: 'دليل العناية' },
]

const BRANDS = CATALOG.map((group) => group.brand)

function AddVehicleForm({ onAdded }) {
  const [brand, setBrand] = useState(BRANDS[0] || '')
  const [name, setName] = useState('')
  const [odometer, setOdometer] = useState('')
  const [error, setError] = useState('')

  const models = CATALOG.find((group) => group.brand === brand)?.models || []

  const submit = (event) => {
    event.preventDefault()
    const result = addVehicle({ brand, name, odometer })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
    setName('')
    setOdometer('')
    if (onAdded) onAdded(result.record.vehicleKey)
  }

  return (
    <form className="garage-add-form" onSubmit={submit} noValidate>
      <h3 className="garage-subhead">إضافة موتوسيكل من الكتالوج</h3>
      <p className="garage-hint">
        اختر موديلك من كتالوج الموقع، وسجّل قراءة العداد الحالية إن أردت. يمكنك إضافة أكثر من موتوسيكل.
      </p>
      <div className="garage-form-grid">
        <div className="garage-field">
          <label className="garage-label" htmlFor="garage-add-brand">
            الماركة
          </label>
          <select
            id="garage-add-brand"
            className="garage-select"
            value={brand}
            onChange={(event) => {
              setBrand(event.target.value)
              setName('')
            }}
          >
            {BRANDS.map((brandName) => (
              <option key={brandName} value={brandName}>
                {brandName}
              </option>
            ))}
          </select>
        </div>
        <div className="garage-field">
          <label className="garage-label" htmlFor="garage-add-model">
            الموديل
          </label>
          <select
            id="garage-add-model"
            className="garage-select"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          >
            <option value="">اختر الموديل</option>
            {models.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        <div className="garage-field">
          <label className="garage-label" htmlFor="garage-add-odometer">
            قراءة العداد الحالية (كم، اختياري)
          </label>
          <input
            id="garage-add-odometer"
            className="garage-input"
            type="text"
            inputMode="numeric"
            value={odometer}
            onChange={(event) => setOdometer(event.target.value.replace(/[^\d]/g, ''))}
            placeholder="مثال: 1200"
          />
        </div>
      </div>
      {error && (
        <p className="garage-error" role="alert">
          {error}
        </p>
      )}
      <div className="garage-actions">
        <button type="submit" className="garage-btn garage-btn-primary">
          إضافة الموتوسيكل
        </button>
      </div>
    </form>
  )
}

function OdometerEditor({ vehicle }) {
  const [value, setValue] = useState(vehicle.odometer === null ? '' : String(vehicle.odometer))
  const [error, setError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    const result = updateVehicleOdometer(vehicle.id, value)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
  }

  return (
    <form className="garage-odometer" onSubmit={submit} noValidate>
      <div className="garage-field">
        <label className="garage-label" htmlFor="garage-odometer">
          قراءة العداد الحالية (كم)
        </label>
        <input
          id="garage-odometer"
          className="garage-input"
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/[^\d]/g, ''))}
          placeholder="مثال: 1200"
        />
      </div>
      <button type="submit" className="garage-btn garage-btn-primary">
        تحديث العداد
      </button>
      {vehicle.odometer !== null && (
        <p className="garage-hint garage-odometer-hint">
          آخر قراءة محفوظة: {formatAmount(vehicle.odometer)} كم
          {vehicle.odometerUpdatedAt ? ` — ${formatDate(vehicle.odometerUpdatedAt.slice(0, 10))}` : ''}
        </p>
      )}
      {error && (
        <p className="garage-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}

function RemoveVehicle({ vehicle }) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  if (!confirming) {
    return (
      <button type="button" className="garage-btn garage-btn-danger" onClick={() => setConfirming(true)}>
        إزالة الموتوسيكل
      </button>
    )
  }

  const confirm = () => {
    const result = removeVehicle(vehicle.id)
    setConfirming(false)
    if (!result.ok) setError(result.error)
  }

  return (
    <div className="garage-confirm" role="group" aria-label="تأكيد إزالة الموتوسيكل">
      <p>سيُحذف هذا الموتوسيكل وكل تذكيرات/خدمات/مصاريفه المحلية. لا يمكن التراجع.</p>
      <div className="garage-actions">
        <button type="button" className="garage-btn garage-btn-small garage-btn-danger" onClick={confirm}>
          تأكيد الإزالة
        </button>
        <button type="button" className="garage-btn garage-btn-small" onClick={() => setConfirming(false)}>
          إلغاء
        </button>
      </div>
      {error && (
        <p className="garage-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function GarageBackupRestore() {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const garage = readGarage()
  const currentCounts = {
    vehicles: garage.vehicles.length,
    reminders: garage.reminders.length,
    services: garage.services.length,
    expenses: garage.expenses.length,
  }

  const handleExport = () => {
    setExporting(true)
    setError('')
    
    try {
      const result = exportGarage()
      if (!result.ok) {
        setError(result.error)
        return
      }
      
      // Create download link
      const a = document.createElement('a')
      a.href = result.payload
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      setSuccess(`تم تصدير ${result.filename} بنجاح`)
      URL.revokeObjectURL(result.payload)
    } catch {
      setError('فشل التصدير')
    } finally {
      setExporting(false)
    }
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (!file) return

    setImporting(true)
    setError('')
    setPreview(null)
    setSuccess('')

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const result = parseGarageBackup(e.target.result)
        if (!result.ok) {
          setError(result.error)
          return
        }
        
        setPreview(result)
        setSuccess(`تم تحليل الملف بنجاح — ${result.counts.vehicles} مركبة، ${result.counts.reminders} تذكير، ${result.counts.services} خدمة، ${result.counts.expenses} مصروف`)
      } catch {
        setError('فشل قراءة الملف')
      } finally {
        setImporting(false)
      }
    }
    reader.onerror = () => {
      setError('فشل قراءة الملف')
      setImporting(false)
    }
    reader.readAsText(file)
    
    // Reset file input
    event.target.value = ''
  }

  const handleConfirm = () => {
    if (!preview) return

    try {
      const result = restoreGarage(preview.sanitized)
      if (!result.ok) {
        setError(result.error)
        return
      }
      
      setSuccess('تم استرجاع البيانات بنجاح')
      setPreview(null)
      setError('')
    } catch {
      setError('فشل الاسترجاع')
    }
  }

  const handleCancel = () => {
    setPreview(null)
    setSuccess('')
    setError('')
  }

  return (
    <div className="garage-backup">
      <div className="garage-backup-actions">
        <button 
          type="button" 
          className="garage-btn garage-btn-secondary"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? 'جاري التصدير...' : 'تصدير البيانات'}
        </button>
        
        <label className="garage-btn garage-btn-secondary">
          استيراد نسخة احتياطية
          <input
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            disabled={importing}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {error && (
        <p className="garage-error" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p className="garage-success" role="status">
          {success}
        </p>
      )}

      {preview && (
        <div className="garage-backup-preview">
          <h3 className="garage-subhead">مراجعة النسخة الاحتياطية</h3>
          
          <div className="garage-backup-stats">
            <div className="garage-backup-stat">
              <span className="garage-backup-stat-label">البيانات المستوردة</span>
              <b>{preview.counts.vehicles}</b> مركبة
            </div>
            <div className="garage-backup-stat">
              <span className="garage-backup-stat-label">البيانات الحالية</span>
              <b>{currentCounts.vehicles}</b> مركبة
            </div>
            <div className="garage-backup-stat">
              <span className="garage-backup-stat-label">التاريخ</span>
              <b>{new Date(preview.exportedAt).toLocaleDateString('ar-EG')}</b>
            </div>
          </div>

          <div className="garage-backup-notice">
            <p className="garage-warning">
              ⚠️ سيتم <strong>استبدال</strong> جميع البيانات الحالية بالنسخة المستوردة. لا يمكن التراجع.
            </p>
          </div>

          <div className="garage-actions">
            <button 
              type="button" 
              className="garage-btn garage-btn-primary garage-btn-danger"
              onClick={handleConfirm}
            >
              تأكيد الاستبدال
            </button>
            <button 
              type="button" 
              className="garage-btn garage-btn-small"
              onClick={handleCancel}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function OwnershipCompanion() {
  const [garage, setGarage] = useState(() => readGarage())
  const [activeKey, setActiveKey] = useState('')
  const [tab, setTab] = useState('dashboard')

  useEffect(() => {
    const refresh = () => setGarage(readGarage())
    window.addEventListener(GARAGE_EVENT, refresh)
    return () => window.removeEventListener(GARAGE_EVENT, refresh)
  }, [])

  const vehicles = garage.vehicles
  const activeVehicle = vehicles.find((vehicle) => vehicle.vehicleKey === activeKey) || vehicles[0] || null
  const today = todayISO()

  const odometerByKey = {}
  for (const vehicle of vehicles) odometerByKey[vehicle.vehicleKey] = vehicle.odometer

  const activeReminders = activeVehicle
    ? sortReminders(
        garage.reminders.filter((reminder) => reminder.vehicleKey === activeVehicle.vehicleKey),
        { today, odometerByKey },
      )
    : []
  const reminderSummary = summarizeReminders(activeReminders)
  const activeServices = activeVehicle
    ? garage.services.filter((service) => service.vehicleKey === activeVehicle.vehicleKey)
    : []
  const serviceTotal = activeServices.reduce((sum, service) => sum + (Number.isFinite(service.cost) ? service.cost : 0), 0)
  const allExpenses = summarizeExpenses(garage.expenses, { today })
  const urgentCount = reminderSummary.overdue + reminderSummary.due
  const tabIsGuide = tab === 'guide'

  return (
    <section className="section garage" id="garage">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">رفيق الملكية</p>
          <h2 className="section-title">أدوات ما بعد الشراء</h2>
          <p className="section-sub">
            نظّم صيانة موتوسيكلك، وسجّل خدماته ومصاريفه، وتابع إرشادات العناية — كل ذلك على جهازك
            دون حساب أو إرسال بيانات.
          </p>
        </div>

        <p className="garage-privacy" role="note">
          <b>خصوصية:</b> تُحفظ كل السجلات في متصفح هذا الجهاز فقط (تخزين محلي) ولا تُرسل إلى المعرض
          أو أي خدمة خارجية. قد لا تنتقل السجلات بين المتصفحات أو الأجهزة، وقد تُفقد إذا حذفت بيانات
          المتصفح.
        </p>

        {activeVehicle ? (
          <div className="garage-vehicle-bar">
            <div className="garage-field garage-vehicle-select">
              <label className="garage-label" htmlFor="garage-active-vehicle">
                الموتوسيكل الحالي
              </label>
              <select
                id="garage-active-vehicle"
                className="garage-select"
                value={activeVehicle.vehicleKey}
                onChange={(event) => setActiveKey(event.target.value)}
              >
                {vehicles.map((vehicle) => (
                  <option key={vehicle.vehicleKey} value={vehicle.vehicleKey}>
                    {vehicle.brand} — {vehicle.name}
                  </option>
                ))}
              </select>
            </div>
            <OdometerEditor key={activeVehicle.id} vehicle={activeVehicle} />
            <RemoveVehicle key={`remove-${activeVehicle.id}`} vehicle={activeVehicle} />
            <GarageBackupRestore />
          </div>
        ) : null}

        {vehicles.length === 0 ? (
          <div className="garage-onboarding">
            <AddVehicleForm onAdded={(vehicleKey) => setActiveKey(vehicleKey)} />
            <div className="garage-empty">
              <p className="garage-empty-title">ابدأ بإضافة موتوسيكلك</p>
              <p className="garage-empty-sub">
                بعد الإضافة ستظهر لك أدوات الصيانة والخدمات والمصاريف. دليل العناية متاح دائمًا من
                التبويب أعلاه.
              </p>
            </div>
          </div>
        ) : (
          <details className="garage-add">
            <summary>إضافة موتوسيكل آخر</summary>
            <AddVehicleForm onAdded={(vehicleKey) => setActiveKey(vehicleKey)} />
          </details>
        )}

        {activeVehicle && (
          <>
            <div className="garage-stat-grid">
              <div className="garage-stat">
                <span className="garage-stat-label">تذكيرات مستحقة أو متأخرة</span>
                <b>{urgentCount}</b>
                <small>من إعدادك — ليست فترات مصنّع</small>
              </div>
              <div className="garage-stat">
                <span className="garage-stat-label">تذكيرات قريبة</span>
                <b>{reminderSummary.soon}</b>
                <small>خلال 14 يومًا أو 500 كم</small>
              </div>
              <div className="garage-stat">
                <span className="garage-stat-label">تكاليف خدمة مسجَّلة</span>
                <b>{formatAmount(Math.round(serviceTotal * 100) / 100)} ج.م</b>
                <small>{activeServices.length} سجل خدمة</small>
              </div>
              <div className="garage-stat">
                <span className="garage-stat-label">مصاريف هذا الشهر (كل الموتوسيكلات)</span>
                <b>{formatAmount(allExpenses.currentMonth)} ج.م</b>
                <small>{allExpenses.count} مصروف مسجَّل إجمالًا</small>
              </div>
            </div>
            {reminderSummary['need-odometer'] > 0 && (
              <p className="garage-warning" role="status">
                {reminderSummary['need-odometer']} تذكير بحاجة إلى قراءة عداد حالية لتحديد حالته — حدّث
                العداد أعلاه.
              </p>
            )}
          </>
        )}

        <div className="garage-tabs" role="tablist" aria-label="أقسام رفيق الملكية">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              id={`garage-tab-${entry.id}`}
              aria-selected={tab === entry.id}
              aria-controls={`garage-panel-${entry.id}`}
              className={`garage-tab ${tab === entry.id ? 'is-active' : ''}`}
              disabled={!activeVehicle && entry.id !== 'guide' && entry.id !== 'dashboard'}
              onClick={() => setTab(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div
          className="garage-tab-panel"
          role="tabpanel"
          id={`garage-panel-${tab}`}
          aria-labelledby={`garage-tab-${tab}`}
        >
          {!activeVehicle && tab === 'dashboard' && <SmartOwnershipDashboard />}
          {!activeVehicle && !tabIsGuide && tab !== 'dashboard' && (
            <div className="garage-empty">
              <p className="garage-empty-title">أضف موتوسيكلًا للبدء</p>
              <p className="garage-empty-sub">
                مخطط الصيانة وسجل الخدمات ومتتبّع المصاريف تحتاج موتوسيكلًا مضافًا من الكتالوج.
              </p>
            </div>
          )}
          {!activeVehicle && tabIsGuide && <CareGuide />}
          {activeVehicle && tab === 'dashboard' && <SmartOwnershipDashboard />}
          {activeVehicle && tab === 'maintenance' && (
            <MaintenancePlanner key={activeVehicle.vehicleKey} vehicle={activeVehicle} garage={garage} />
          )}
          {activeVehicle && tab === 'services' && (
            <ServiceHistory key={activeVehicle.vehicleKey} vehicle={activeVehicle} garage={garage} />
          )}
          {activeVehicle && tab === 'expenses' && (
            <ExpenseTracker
              key={activeVehicle.vehicleKey}
              garage={garage}
              defaultVehicleKey={activeVehicle.vehicleKey}
            />
          )}
          {activeVehicle && tabIsGuide && <CareGuide />}
        </div>
      </div>
    </section>
  )
}

export default OwnershipCompanion
