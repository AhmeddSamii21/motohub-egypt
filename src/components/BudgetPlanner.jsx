import { useMemo, useState } from 'react'
import { CATALOG } from '../data/catalog'
import { buildDiscoveryModels, TYPE_VALUES } from '../data/catalogDiscovery'
import { buildBudgetPlan, closestOptions } from '../data/budgetPlanner'
import { formatDisplayPrice, GENERATED_BY_KEY } from '../data/modelDisplay'
import { modelHref } from '../data/modelSlug'
import { toggleFavorite, readFavorites, FAVORITES_EVENT } from '../data/favoritesStore'
import { toggleCompareKey, readCompareKeys, COMPARE_EVENT, COMPARE_LIMIT } from '../data/compareStore'
import { useEffect } from 'react'
import './BudgetPlanner.css'

/**
 * مخطط ميزانية الموتوسيكل — «مع ميزانيتي، أقدر أشتري أنهي موتوسيكل؟»
 * - الأسعار من قائمة الاكتشاف المُثراة (المصدر الوحيد للأسعار) — بلا قائمة ثانية.
 * - الفلاتر (ماركة/نوع) تُطبَّق داخل buildBudgetPlan؛ الأنواع من المواصفات المنشورة فقط.
 * - إجراءات العميل: التفاصيل / إضافة للمقارنة (المخزن المشترك بلا تغيير قواعده) / المفضلة.
 * - بلا سعر منشور ⇒ يُحصى بشفافية ولا يُعامل صفرًا.
 */

const ALL_BRANDS = 'all'
const formatEGP = (value) => value.toLocaleString('en-US')

const DISCOVERY_MODELS = buildDiscoveryModels()

function BudgetModelCard({ item, mode, fav, compared, compareDisabled, onToggleFav, onToggleCompare }) {
  const info = GENERATED_BY_KEY.get(item.key)
  const priceDisplay = formatDisplayPrice(
    String(item.numericPrice),
    info && (info.source === 'stock' || info.source === 'price-list') ? info.source : undefined,
  )
  return (
    <li className="budget-card" data-card-brand={item.brand}>
      <a className="budget-card-overlay" href={modelHref(item.brand, item.name)} aria-label={`تفاصيل ${item.brand} ${item.name}`} />
      <div className="budget-card-top">
        <p className="budget-card-brand">{item.brand}</p>
        {item.needsReview && (
          <span className="budget-card-review" title="سعر مصدره قائمة قديمة — قيد المراجعة مع المصدر">*</span>
        )}
      </div>
      <h4 className="budget-card-name">{item.name}</h4>
      <p className="budget-card-price">
        <b>{priceDisplay}</b> <span>ج.م</span>
      </p>
      {mode === 'fit' ? (
        <p className="budget-card-remaining">
          يتبقى من ميزانيتك <b dir="ltr">{formatEGP(item.remainingBudget)}</b> ج.م
        </p>
      ) : (
        <p className="budget-card-over">
          يتجاوز ميزانيتك بـ <b dir="ltr">{formatEGP(item.overBudget)}</b> ج.م
          {item.estimatedMonths != null && (
            <> — تقريبًا <b dir="ltr">{formatEGP(item.estimatedMonths)}</b> شهر ادخار</>
          )}
        </p>
      )}
      <div className="budget-card-actions">
        <a href={modelHref(item.brand, item.name)} className="budget-card-link">التفاصيل</a>
        <button
          type="button"
          className={`budget-card-compare ${compared ? 'is-selected' : ''}`}
          aria-pressed={compared}
          disabled={compareDisabled && !compared}
          onClick={() => onToggleCompare(item.key)}
        >
          قارن
        </button>
        <button
          type="button"
          className={`budget-card-fav ${fav ? 'is-active' : ''}`}
          aria-pressed={fav}
          aria-label={fav ? `إزالة ${item.brand} ${item.name} من المفضلة` : `إضافة ${item.brand} ${item.name} إلى المفضلة`}
          title={fav ? 'في المفضلة' : 'أضف إلى المفضلة'}
          onClick={() => onToggleFav(item.brand, item.name)}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
          </svg>
        </button>
      </div>
    </li>
  )
}

function BudgetPlanner() {
  const [budget, setBudget] = useState('')
  const [monthlySaving, setMonthlySaving] = useState('')
  const [brand, setBrand] = useState(ALL_BRANDS)
  const [types, setTypes] = useState([])
  const [favKeys, setFavKeys] = useState(() => new Set(readFavorites().map((item) => `${item.brand}|${item.name}`)))
  const [compareKeys, setCompareKeys] = useState(() => readCompareKeys())

  useEffect(() => {
    const refresh = () => {
      setFavKeys(new Set(readFavorites().map((item) => `${item.brand}|${item.name}`)))
      setCompareKeys(readCompareKeys())
    }
    window.addEventListener(FAVORITES_EVENT, refresh)
    window.addEventListener(COMPARE_EVENT, refresh)
    return () => {
      window.removeEventListener(FAVORITES_EVENT, refresh)
      window.removeEventListener(COMPARE_EVENT, refresh)
    }
  }, [])

  // الفلاتر تُمرَّر للمنطق الصرف — نفس نتيجة التصفية في الكتالوج (أنواع منشورة فقط)
  const plan = useMemo(
    () => buildBudgetPlan(DISCOVERY_MODELS, { budget, monthlySaving, brand, types }),
    [budget, monthlySaving, brand, types],
  )

  // أقرب الخيارات عندما لا شيء يطابق: أرخص الموديلات المُسعَّرة بعد الفلاتر
  const closest = useMemo(() => {
    if (!plan.ok || plan.affordable.length > 0) return []
    const filtered = DISCOVERY_MODELS.filter(
      (model) =>
        (brand === ALL_BRANDS || model.brand === brand) &&
        (types.length === 0 || (model.type && types.includes(model.type))),
    )
    return closestOptions(filtered, 3)
  }, [plan, brand, types])

  const toggleCompare = (key) => toggleCompareKey(key)

  const onlyDigits = (value) => value.replace(/[^\d]/g, '')

  return (
    <section className="section budget" id="budget-planner">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">مخطط الميزانية</p>
          <h2 className="section-title">مع ميزانيتي، أقدر أشتري أنهي موتوسيكل؟</h2>
          <p className="section-sub">
            أدخل ميزانيتك المتاحة لترى كل الموديلات التي تتسع لأسعارها الحالية المنشورة — وإن لم
            تتسع أي موديلات، نعرض أقرب الخيارات مع المبلغ الزائد بصراحة، بلا ادعاء أنها داخل ميزانيتك.
          </p>
        </div>

        <div className="budget-panel">
          <div className="budget-controls">
            <div className="budget-field">
              <label className="budget-label" htmlFor="budget-amount">
                ميزانيتك المتاحة (ج.م)
              </label>
              <input
                id="budget-amount"
                className="budget-input"
                type="text"
                inputMode="numeric"
                dir="ltr"
                placeholder="مثال: 80000"
                value={budget}
                onChange={(event) => setBudget(onlyDigits(event.target.value))}
              />
            </div>

            <div className="budget-field">
              <label className="budget-label" htmlFor="budget-saving">
                ادخار شهري إضافي (ج.م) — اختياري
              </label>
              <input
                id="budget-saving"
                className="budget-input"
                type="text"
                inputMode="numeric"
                dir="ltr"
                placeholder="مثال: 3000"
                value={monthlySaving}
                onChange={(event) => setMonthlySaving(onlyDigits(event.target.value))}
              />
              <p className="budget-hint">
                يساعدك على رؤية الموديلات القريبة من ميزانيتك وعدد أشهر الادخار التقريبية للوصول
                إليها — تقدير تخطيطي من أرقامك أنت.
              </p>
            </div>

            <div className="budget-field">
              <label className="budget-label" htmlFor="budget-brand">
                الماركة
              </label>
              <select
                id="budget-brand"
                className="budget-select"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
              >
                <option value={ALL_BRANDS}>كل الماركات</option>
                {CATALOG.map((group) => (
                  <option key={group.brand} value={group.brand}>
                    {group.brand}
                  </option>
                ))}
              </select>
            </div>

            <div className="budget-field">
              <span className="budget-label" id="budget-type-label">
                نوع المركبة
              </span>
              <div className="budget-chips" role="group" aria-labelledby="budget-type-label">
                <button
                  type="button"
                  className={`budget-chip ${types.length === 0 ? 'is-active' : ''}`}
                  aria-pressed={types.length === 0}
                  onClick={() => setTypes([])}
                >
                  كل الأنواع
                </button>
                {TYPE_VALUES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`budget-chip ${types.includes(type) ? 'is-active' : ''}`}
                    aria-pressed={types.includes(type)}
                    onClick={() =>
                      setTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
                    }
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="budget-result" aria-live="polite">
            {!plan.ok ? (
              <p className="budget-hint">{plan.error}</p>
            ) : (
              <>
                <p className="budget-summary">
                  {plan.affordable.length > 0 ? (
                    <>
                      <b>{plan.affordable.length}</b> موديل ضمن ميزانيتك
                      {plan.monthlySaving > 0 && <> + <b>{plan.closeOptions.length}</b> قريب منها بالادخار</>}
                    </>
                  ) : (
                    <>لا يوجد موديل مُسعَّر ضمن هذه الميزانية بعد الفلاتر</>
                  )}
                  {plan.missingPriceCount > 0 && (
                    <> · {plan.missingPriceCount} موديل بلا سعر منشور لم يُحسب</>
                  )}
                </p>

                {plan.affordable.length > 0 && (
                  <ul className="budget-grid">
                    {plan.affordable.map((item) => (
                      <BudgetModelCard
                        key={item.key}
                        item={item}
                        mode="fit"
                        fav={favKeys.has(item.key)}
                        compared={compareKeys.includes(item.key)}
                        compareDisabled={compareKeys.length >= COMPARE_LIMIT}
                        onToggleFav={toggleFavorite}
                        onToggleCompare={toggleCompare}
                      />
                    ))}
                  </ul>
                )}

                {plan.closeOptions.length > 0 && (
                  <>
                    <h3 className="budget-subhead">قريبة من ميزانيتك — غير مُدرجة ضمنها</h3>
                    <ul className="budget-grid">
                      {plan.closeOptions.map((item) => (
                        <BudgetModelCard
                          key={item.key}
                          item={item}
                          mode="close"
                          fav={favKeys.has(item.key)}
                          compared={compareKeys.includes(item.key)}
                          compareDisabled={compareKeys.length >= COMPARE_LIMIT}
                          onToggleFav={toggleFavorite}
                          onToggleCompare={toggleCompare}
                        />
                      ))}
                    </ul>
                  </>
                )}

                {plan.affordable.length === 0 && closest.length > 0 && (
                  <>
                    <h3 className="budget-subhead">أقرب الخيارات المتاحة — أسعارها أعلى من ميزانيتك</h3>
                    <ul className="budget-grid">
                      {closest.map((item) => (
                        <BudgetModelCard
                          key={item.key}
                          item={{ ...item, overBudget: item.numericPrice - plan.budget, estimatedMonths: null }}
                          mode="close"
                          fav={favKeys.has(item.key)}
                          compared={compareKeys.includes(item.key)}
                          compareDisabled={compareKeys.length >= COMPARE_LIMIT}
                          onToggleFav={toggleFavorite}
                          onToggleCompare={toggleCompare}
                        />
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <p className="budget-disclaimer">
          الأسعار المعروضة هي الأسعار الحالية المنشورة بالموقع (من قائمة الأسعار وسجلات المخزون
          المُزامَنة) — التأكيد النهائي للسعر والتوفر يتم مع المعرض. الموديلات بلا سعر منشور لا
          تُفترض أسعارها ولا تُدرَج ضمن المطابقة.
        </p>
      </div>
    </section>
  )
}

export default BudgetPlanner
