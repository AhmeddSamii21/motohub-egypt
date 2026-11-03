import { useEffect, useMemo, useState } from 'react'
import { buildDiscoveryModels } from '../data/catalogDiscovery'
import { readCompareKeys, COMPARE_EVENT, COMPARE_LIMIT } from '../data/compareStore'
import { buildRunningCostComparison, costDifference } from '../data/runningCost'
import './RunningCostComparison.css'

/**
 * مقارنة تكاليف التشغيل — تستخدم تحديد المقارنة المشترك نفسه (compareStore، حد 3،
 * بلا تغيير لقواعد الاختيار) لتختار العميل موديلين أو ثلاثة، ثم يُدخل تقديرات
 * الاستهلاك لكل موديل — لأنه لا توجد أي بيانات استهلاك منشورة في مصادر المشروع
 * (تم فحص generatedModelDetails.js)، فكل قيمة استهلاك «تقدير العميل» لا مواصفة موثقة.
 *
 * افتراضات مشتركة واحدة (مسافة شهرية + سعر لتر) لكل الموديلات المُقارَنة.
 * صراحة البيانات: الموديل بلا استهلاك مُدخل يظهر «غير محسوب» ولا يُرتَّب أبدًا كأرخص،
 * والفرق يُحسب فقط بين محسوبين. لا خلط بين سعر الشراء وتكلفة التشغيل.
 */

const formatEGP = (value) => value.toLocaleString('en-US')
const onlyNumber = (value) => {
  const cleaned = value.replace(/[^\d.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}

const DISCOVERY_MODELS = buildDiscoveryModels()
const MODEL_BY_KEY = new Map(DISCOVERY_MODELS.map((model) => [model.key, model]))

function RunningCostComparison() {
  const [compareKeys, setCompareKeys] = useState(() => readCompareKeys())
  const [monthlyKm, setMonthlyKm] = useState('')
  const [fuelPrice, setFuelPrice] = useState('')
  const [consumption, setConsumption] = useState({})

  useEffect(() => {
    const refresh = () => setCompareKeys(readCompareKeys())
    window.addEventListener(COMPARE_EVENT, refresh)
    return () => window.removeEventListener(COMPARE_EVENT, refresh)
  }, [])

  const selected = useMemo(
    () =>
      compareKeys
        .map((key) => {
          const model = MODEL_BY_KEY.get(key)
          return model ? { key, brand: model.brand, name: model.name } : null
        })
        .filter(Boolean)
        .slice(0, COMPARE_LIMIT),
    [compareKeys],
  )

  // التقديرات المحفوظة (كم/لتر) لكل مفتاح — أفقي مع الاختيار
  const entries = useMemo(
    () => selected.map((item) => ({ ...item, kmPerLiter: consumption[item.key] ?? '' })),
    [selected, consumption],
  )

  const comparison = useMemo(
    () => buildRunningCostComparison(entries, { monthlyKm, fuelPrice }),
    [entries, monthlyKm, fuelPrice],
  )

  return (
    <section className="section runcost" id="running-cost">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">مقارنة التشغيل</p>
          <h2 className="section-title">قارن تكلفة تشغيل الموديلات المختارة</h2>
          <p className="section-sub">
            اختر موديلين أو ثلاثة من زر «قارن» في الكتالوج، ثم أدخل تقدير استهلاك كل موديل (كم/لتر)
            مع مسافتك الشهرية وسعر اللتر — لترى تكلفة الوقود الشهرية والسنوية والفرق بينهم.
          </p>
        </div>

        <div className="runcost-shared">
          <div className="runcost-field">
            <label className="runcost-label" htmlFor="runcost-km">
              المسافة الشهرية (كم) — مشتركة بين كل الموديلات
            </label>
            <input
              id="runcost-km"
              className="runcost-input"
              type="text"
              inputMode="decimal"
              dir="ltr"
              placeholder="مثال: 780"
              value={monthlyKm}
              onChange={(event) => setMonthlyKm(onlyNumber(event.target.value))}
            />
          </div>
          <div className="runcost-field">
            <label className="runcost-label" htmlFor="runcost-price">
              سعر لتر الوقود (ج.م) — مشترك
            </label>
            <input
              id="runcost-price"
              className="runcost-input"
              type="text"
              inputMode="decimal"
              dir="ltr"
              placeholder="مثال: 14"
              value={fuelPrice}
              onChange={(event) => setFuelPrice(onlyNumber(event.target.value))}
            />
          </div>
        </div>

        {selected.length === 0 ? (
          <p className="runcost-empty">
            لم تختر موديلات للمقارنة بعد — افتح <a href="#catalog">الكتالوج</a> واضغط «قارن» على
            الموديلات التي تهمك، ثم عد إلى هنا.
          </p>
        ) : comparison.ok ? (
          <>
            <div className="runcost-table-wrap">
              <table className="runcost-table">
                <thead>
                  <tr>
                    <th scope="col">الموديل</th>
                    <th scope="col">تقدير الاستهلاك (كم/لتر) — منك</th>
                    <th scope="col">تكلفة الوقود الشهرية</th>
                    <th scope="col">تكلفة الوقود السنوية</th>
                    <th scope="col" aria-hidden="true" className="runcost-badge-col">
                      الفارق
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.rows.map((row) => (
                    <tr key={row.key} className={comparison.cheapestKey === row.key ? 'is-cheapest' : ''}>
                      <th scope="row">
                        <span className="runcost-model-brand">{row.brand}</span>
                        <span className="runcost-model-name">{row.name}</span>
                      </th>
                      <td>
                        <input
                          className="runcost-input runcost-input-inline"
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          aria-label={`تقدير استهلاك ${row.brand} ${row.name} كم لكل لتر`}
                          placeholder="مثال: 30"
                          value={consumption[row.key] ?? ''}
                          onChange={(event) =>
                            setConsumption((prev) => ({ ...prev, [row.key]: onlyNumber(event.target.value) }))
                          }
                        />
                      </td>
                      <td>
                        {row.computed ? (
                          <span dir="ltr">{formatEGP(row.monthlyFuelCost)}</span>
                        ) : (
                          <span className="runcost-missing">{row.error}</span>
                        )}
                      </td>
                      <td>
                        {row.computed ? (
                          <span dir="ltr">{formatEGP(row.annualFuelCost)}</span>
                        ) : (
                          <span className="runcost-missing">—</span>
                        )}
                      </td>
                      <td className="runcost-badge-col">
                        {comparison.cheapestKey === row.key && (
                          <span className="runcost-cheapest">أقل تكلفة وقود شهريًا بين المُحسوبة</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {comparison.cheapestKey && comparison.rows.length >= 2 && (() => {
              const cheapest = comparison.rows.find((row) => row.key === comparison.cheapestKey)
              const others = comparison.rows.filter((row) => row.key !== comparison.cheapestKey && row.computed)
              return others.map((other) => {
                const diff = costDifference(cheapest, other)
                return (
                  <p className="runcost-diff" key={other.key}>
                    فرق تكلفة الوقود بين <b>{cheapest.name}</b> و<b>{other.name}</b>:{' '}
                    <span dir="ltr">{formatEGP(diff.monthly)}</span> ج.م شهريًا —{' '}
                    <span dir="ltr">{formatEGP(diff.annual)}</span> ج.م سنويًا.
                  </p>
                )
              })
            })()}

            {comparison.cheapestKey == null && comparison.rows.length >= 2 && (
              <p className="runcost-note">
                لا يُعلَّم «أرخص» موديل إلا حين تُحسب كل الموديلات المُقارَنة — أكمل تقدير استهلاك
                كل موديل لعرض الفروق.
              </p>
            )}

            <p className="runcost-note">
              كل قيم الاستهلاك هنا تقديراتك أنت (لا توجد بيانات استهلاك منشورة للموديلات في مصادر
              المشروع) — والافتراضات (المسافة الشهرية وسعر اللتر) مشتركة بين كل الصفوف. تكلفة
              التشغيل مستقلة تمامًا عن سعر الشراء المعروض في الكتالوج.
            </p>
          </>
        ) : (
          <p className="runcost-empty">{comparison.error}</p>
        )}
      </div>
    </section>
  )
}

export default RunningCostComparison
