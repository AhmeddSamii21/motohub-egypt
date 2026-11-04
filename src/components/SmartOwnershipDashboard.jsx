import { useState, useEffect } from 'react'
import { 
  GARAGE_EVENT, 
  readGarage 
} from '../data/garageStore'
import { 
  todayISO, 
  sortReminders, 
  summarizeReminders, 
  summarizeExpenses, 
  formatAmount, 
  formatDate 
} from '../data/garageStats'
import './SmartOwnershipDashboard.css'

/**
 * لوحة الملكية الذكية — نظرة شاملة على حالة الملكية باستخدام البيانات المحلية فقط.
 * 
 * المبادئ:
 * - لا اختراع بيانات أو حسابات — كل شيء مستمد من السجلات الحقيقية للعميل
 * - RTL وموبايل أولًا باستخدام نفس التصميم المتغير للثيم
 * - بطاقات قابلة للتمدد للتفاصيل عند الحاجة
 * - لا تغيير في البيانات الحالية — عرض فقط
 */

// تصنيفات البطاقات الرئيسية
const DASHBOARD_CARDS = [
  { 
    id: 'summary', 
    title: 'ملخص الملكية', 
    icon: '📊',
    description: 'إحصائيات عامة عن مركباتك وتذكيراتك'
  },
  { 
    id: 'maintenance', 
    title: 'نظرة على الصيانة', 
    icon: '🔧',
    description: 'تذكيرات الصيانة الحالة والخدمات القادمة'
  },
  { 
    id: 'expenses', 
    title: 'رؤية المصاريف', 
    icon: '💰',
    description: 'تحليل المصاريف التصنيفي والزمني'
  },
  { 
    id: 'activity', 
    title: 'نشاط الملكية', 
    icon: '📝',
    description: 'آخر الخدمات والمصاريف والتذكيرات'
  }
]

function DashboardCard({ 
  id, 
  title, 
  icon, 
  description, 
  children, 
  isExpanded, 
  onToggle 
}) {
  return (
    <div className={`dashboard-card ${isExpanded ? 'is-expanded' : ''}`}>
      <div 
        className="dashboard-card-header"
        onClick={() => onToggle(id)}
      >
        <div className="dashboard-card-icon">{icon}</div>
        <div className="dashboard-card-title">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="dashboard-card-toggle">
          {isExpanded ? '▼' : '►'}
        </div>
      </div>
      
      <div className="dashboard-card-content">
        {children}
      </div>
    </div>
  )
}

function OwnershipSummaryCard({ garage, vehicles, today }) {
  const totalVehicles = vehicles.length
  const activeReminders = garage.reminders.filter(r => r.vehicleKey)
  const servicesCount = garage.services.length
  const expensesCount = garage.expenses.length
  
  const urgentReminders = activeReminders.filter(r => {
    const status = getReminderStatus(r, { today, currentOdometer: getVehicleOdometer(r.vehicleKey, vehicles) })
    return status.status === 'overdue' || status.status === 'due'
  }).length
  
  const totalServiceCost = garage.services.reduce((sum, service) => {
    return sum + (Number.isFinite(service.cost) ? service.cost : 0)
  }, 0)
  
  const totalExpenses = garage.expenses.reduce((sum, expense) => {
    return sum + (Number.isFinite(expense.amount) ? expense.amount : 0)
  }, 0)

  return (
    <div className="dashboard-summary-grid">
      <div className="dashboard-summary-item">
        <div className="dashboard-summary-number">{totalVehicles}</div>
        <div className="dashboard-summary-label">مركبة</div>
      </div>
      <div className="dashboard-summary-item">
        <div className="dashboard-summary-number">{urgentReminders}</div>
        <div className="dashboard-summary-label">تذكير مستعجل</div>
      </div>
      <div className="dashboard-summary-item">
        <div className="dashboard-summary-number">{servicesCount}</div>
        <div className="dashboard-summary-label">خدمة مسجلة</div>
      </div>
      <div className="dashboard-summary-item">
        <div className="dashboard-summary-number">{formatAmount(totalServiceCost)}</div>
        <div className="dashboard-summary-label">تكلفة الخدمات</div>
      </div>
      <div className="dashboard-summary-item">
        <div className="dashboard-summary-number">{expensesCount}</div>
        <div className="dashboard-summary-label">مصروف مسجل</div>
      </div>
      <div className="dashboard-summary-item">
        <div className="dashboard-summary-number">{formatAmount(totalExpenses)}</div>
        <div className="dashboard-summary-label">إجمالي المصاريف</div>
      </div>
    </div>
  )
}

function MaintenanceOverviewCard({ garage, vehicles, today }) {
  const odometerByKey = {}
  for (const vehicle of vehicles) {
    odometerByKey[vehicle.vehicleKey] = vehicle.odometer
  }
  
  const activeReminders = garage.reminders.filter(r => r.vehicleKey)
  const decoratedReminders = sortReminders(activeReminders, { today, odometerByKey })
  const reminderSummary = summarizeReminders(decoratedReminders)
  
  // الحصول على أحدث 5 تذكيرات
  const topReminders = decoratedReminders.slice(0, 5)
  
  return (
    <div className="dashboard-maintenance-content">
      <div className="dashboard-maintenance-stats">
        <div className="dashboard-maintenance-stat">
          <span className="dashboard-maintenance-stat-number">{reminderSummary.overdue}</span>
          <span className="dashboard-maintenance-stat-label">متأخر</span>
        </div>
        <div className="dashboard-maintenance-stat">
          <span className="dashboard-maintenance-stat-number">{reminderSummary.due}</span>
          <span className="dashboard-maintenance-stat-label">مستحق الآن</span>
        </div>
        <div className="dashboard-maintenance-stat">
          <span className="dashboard-maintenance-stat-number">{reminderSummary.soon}</span>
          <span className="dashboard-maintenance-stat-label">قريب</span>
        </div>
        <div className="dashboard-maintenance-stat">
          <span className="dashboard-maintenance-stat-number">{reminderSummary.upcoming}</span>
          <span className="dashboard-maintenance-stat-label">قادم</span>
        </div>
      </div>
      
      {topReminders.length > 0 && (
        <div className="dashboard-reminders-list">
          <h4>أهم التذكيرات</h4>
          {topReminders.map(reminder => {
            const vehicle = vehicles.find(v => v.vehicleKey === reminder.vehicleKey)
            const status = reminder.statusLabel
            return (
              <div key={reminder.id} className="dashboard-reminder-item">
                <div className="dashboard-reminder-vehicle">
                  {vehicle ? `${vehicle.brand} — ${vehicle.name}` : 'مركبة غير معروفة'}
                </div>
                <div className="dashboard-reminder-task">{reminder.taskName}</div>
                <div className={`dashboard-reminder-status ${status}`}>{status}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ExpenseInsightsCard({ garage, today }) {
  const allExpenses = summarizeExpenses(garage.expenses, { today })
  
  return (
    <div className="dashboard-expenses-content">
      <div className="dashboard-expenses-summary">
        <div className="dashboard-expenses-total">
          <div className="dashboard-expenses-amount">{formatAmount(allExpenses.total)}</div>
          <div className="dashboard-expenses-label">إجمالي المصاريف</div>
        </div>
        <div className="dashboard-expenses-periods">
          <div className="dashboard-expenses-period">
            <div className="dashboard-expenses-amount">{formatAmount(allExpenses.currentMonth)}</div>
            <div className="dashboard-expenses-label">هذا الشهر</div>
          </div>
          <div className="dashboard-expenses-period">
            <div className="dashboard-expenses-amount">{formatAmount(allExpenses.currentYear)}</div>
            <div className="dashboard-expenses-label">هذا العام</div>
          </div>
        </div>
      </div>
      
      {allExpenses.byCategory.length > 0 && (
        <div className="dashboard-expenses-categories">
          <h4>حسب التصنيف</h4>
          {allExpenses.byCategory.map(category => (
            <div key={category.id} className="dashboard-expense-category">
              <div className="dashboard-expense-category-label">{category.label}</div>
              <div className="dashboard-expense-category-amount">{formatAmount(category.total)}</div>
              <div className="dashboard-expense-category-count">({category.count})</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OwnershipActivityCard({ garage, vehicles }) {
  // الحصول على آخر 10 أحداث مرتبة زمنيًا
  const allActivities = []
  
  // إضافة الخدمات
  garage.services.forEach(service => {
    allActivities.push({
      id: service.id,
      type: 'service',
      date: service.serviceDate,
      vehicleKey: service.vehicleKey,
      title: service.serviceType,
      description: service.description,
      amount: service.cost,
      icon: '🔧'
    })
  })
  
  // إ��加 المصاريف
  garage.expenses.forEach(expense => {
    const category = EXPENSE_CATEGORIES.find(c => c.id === expense.category)
    allActivities.push({
      id: expense.id,
      type: 'expense',
      date: expense.date,
      vehicleKey: expense.vehicleKey,
      title: category ? category.label : expense.category,
      amount: expense.amount,
      icon: '💰'
    })
  })
  
  // إضافة التذكيرات
  garage.reminders.forEach(reminder => {
    allActivities.push({
      id: reminder.id,
      type: 'reminder',
      date: reminder.lastServiceDate,
      vehicleKey: reminder.vehicleKey,
      title: reminder.taskName,
      description: `آخر خدمة: ${formatDate(reminder.lastServiceDate)}`,
      icon: '⏰'
    })
  })
  
  // ترتيب الأحدث أولاً
  allActivities.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return a.id < b.id ? 1 : -1
  })
  
  const recentActivities = allActivities.slice(0, 10)
  
  return (
    <div className="dashboard-activities-content">
      <h4>آخر الأنشطة</h4>
      {recentActivities.length > 0 ? (
        <div className="dashboard-activities-list">
          {recentActivities.map(activity => {
            const vehicle = vehicles.find(v => v.vehicleKey === activity.vehicleKey)
            const vehicleName = vehicle ? `${vehicle.brand} — ${vehicle.name}` : 'مركبة غير معروفة'
            
            return (
              <div key={activity.id} className="dashboard-activity-item">
                <div className="dashboard-activity-icon">{activity.icon}</div>
                <div className="dashboard-activity-details">
                  <div className="dashboard-activity-title">{activity.title}</div>
                  <div className="dashboard-activity-vehicle">{vehicleName}</div>
                  {activity.description && (
                    <div className="dashboard-activity-description">{activity.description}</div>
                  )}
                  <div className="dashboard-activity-date">{formatDate(activity.date)}</div>
                </div>
                {activity.amount && (
                  <div className="dashboard-activity-amount">{formatAmount(activity.amount)}</div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="dashboard-empty-activities">لا توجد أنشطة مسجلة بعد</p>
      )}
    </div>
  )
}

// دالة مساعدة للحصول على حالة التذكير (يجب أن تكون في garageStats.js)
function getReminderStatus(reminder, options = {}) {
  const today = isDateString(options.today) ? options.today : todayISO()
  const currentOdometer = isOdometer(options.currentOdometer) ? options.currentOdometer : null
  const base = { status: 'unscheduled', label: 'بدون موعد', reasons: [], remainingDays: null, remainingKm: null }
  if (!reminder || typeof reminder !== 'object') return base

  const candidates = []
  const reasons = []
  let remainingDays = null
  let remainingKm = null

  if (isDateString(reminder.nextDueDate)) {
    const days = daysUntil(reminder.nextDueDate, today)
    remainingDays = days
    if (days < 0) {
      candidates.push('overdue')
      reasons.push(`تجاوزت تاريخ الاستحقاق (${formatDate(reminder.nextDueDate)})`)
    } else if (days === 0) {
      candidates.push('due')
      reasons.push(`مستحق اليوم (${formatDate(reminder.nextDueDate)})`)
    } else if (days <= REMINDER_SOON_DAYS) {
      candidates.push('soon')
      reasons.push(`باقٍ ${days} يومًا على الموعد (${formatDate(reminder.nextDueDate)})`)
    } else {
      candidates.push('upcoming')
      reasons.push(`الموعد ${formatDate(reminder.nextDueDate)} (باقٍ ${days} يومًا)`)
    }
  }

  if (isOdometer(reminder.nextDueOdometer)) {
    if (currentOdometer === null) {
      candidates.push('need-odometer')
      reasons.push(`الموعد عند ${formatAmount(reminder.nextDueOdometer)} كم — سجّل قراءة العداد الحالية`)
    } else {
      const remaining = reminder.nextDueOdometer - currentOdometer
      remainingKm = remaining
      if (remaining < 0) {
        candidates.push('overdue')
        reasons.push(`تجاوزت قراءة العداد المطلوبة (${formatAmount(reminder.nextDueOdometer)} كم)`)
      } else if (remaining === 0) {
        candidates.push('due')
        reasons.push(`وصلت قراءة العداد المطلوبة (${formatAmount(reminder.nextDueOdometer)} كم)`)
      } else if (remaining <= REMINDER_SOON_KM) {
        candidates.push('soon')
        reasons.push(`باقٍ ${formatAmount(remaining)} كم على الموعد`)
      } else {
        candidates.push('upcoming')
        reasons.push(`الموعد عند ${formatAmount(reminder.nextDueOdometer)} كم (باقٍ ${formatAmount(remaining)} كم)`)
      }
    }
  }

  if (!candidates.length) return { ...base, reasons }
  const status = candidates.sort((a, b) => STATUS_RANK[a] - STATUS_RANK[b])[0]
  return { status, label: REMINDER_LABELS[status], reasons, remainingDays, remainingKm }
}

// دوال مساعدة من garageStats.js (يجب أن تكون مكررة هنا أو مستوردة)
function isDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function isOdometer(value) {
  return Number.isInteger(value) && value >= 0
}

function daysUntil(dueDate, today) {
  if (!isDateString(dueDate) || !isDateString(today)) return null
  const DAY_MS = 86400000
  const [year, month, day] = dueDate.split('-').map(Number)
  const [year2, month2, day2] = today.split('-').map(Number)
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year2, month2 - 1, day2)) / DAY_MS)
}

function getVehicleOdometer(vehicleKey, vehicles) {
  const vehicle = vehicles.find(v => v.vehicleKey === vehicleKey)
  return vehicle ? vehicle.odometer : null
}

// استيراد التصنيفات من garageStore.js
import { EXPENSE_CATEGORIES } from '../data/garageStore.js'

const REMINDER_SOON_DAYS = 14
const REMINDER_SOON_KM = 500

const REMINDER_LABELS = Object.freeze({
  overdue: 'متأخر',
  due: 'مستحق الآن',
  soon: 'قريب',
  'need-odometer': 'أضف قراءة العداد',
  upcoming: 'قادم',
  unscheduled: 'بدون موعد',
})

const STATUS_RANK = {
  overdue: 0,
  due: 1,
  soon: 2,
  'need-odometer': 3,
  upcoming: 4,
  unscheduled: 5,
}

function SmartOwnershipDashboard() {
  const [garage, setGarage] = useState(() => readGarage())
  const [expandedCards, setExpandedCards] = useState(new Set(['summary']))
  const today = todayISO()

  useEffect(() => {
    const refresh = () => setGarage(readGarage())
    window.addEventListener(GARAGE_EVENT, refresh)
    return () => window.removeEventListener(GARAGE_EVENT, refresh)
  }, [])

  const vehicles = garage.vehicles
  const toggleCard = (cardId) => {
    const newSet = new Set(expandedCards)
    if (newSet.has(cardId)) {
      newSet.delete(cardId)
    } else {
      newSet.add(cardId)
    }
    setExpandedCards(newSet)
  }

  return (
    <section className="section dashboard" id="dashboard">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">لوحة الملكية الذكية</p>
          <h2 className="section-title">نظرة شاملة على ملكيتك</h2>
          <p className="section-sub">
            كل البيانات مأخوذة من سجلاتك المحلية — لا حسابات مخترعة، فقط نظرة واقعية على حالة ملكيتك.
          </p>
        </div>

        {vehicles.length === 0 ? (
          <div className="dashboard-empty">
            <p className="dashboard-empty-title">ابدأ بإضافة موتوسيكل</p>
            <p className="dashboard-empty-sub">
              أضف موتوسيكلًا من الكتالوج لتفعيل لوحة الملكية الذكية وإحصائياتها.
            </p>
          </div>
        ) : (
          <div className="dashboard-grid">
            {DASHBOARD_CARDS.map(card => (
              <DashboardCard
                key={card.id}
                id={card.id}
                title={card.title}
                icon={card.icon}
                description={card.description}
                isExpanded={expandedCards.has(card.id)}
                onToggle={toggleCard}
              >
                {card.id === 'summary' && (
                  <OwnershipSummaryCard 
                    garage={garage} 
                    vehicles={vehicles} 
                    today={today} 
                  />
                )}
                {card.id === 'maintenance' && (
                  <MaintenanceOverviewCard 
                    garage={garage} 
                    vehicles={vehicles} 
                    today={today} 
                  />
                )}
                {card.id === 'expenses' && (
                  <ExpenseInsightsCard 
                    garage={garage} 
                    today={today} 
                  />
                )}
                {card.id === 'activity' && (
                  <OwnershipActivityCard 
                    garage={garage} 
                    vehicles={vehicles} 
                    today={today} 
                  />
                )}
              </DashboardCard>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default SmartOwnershipDashboard