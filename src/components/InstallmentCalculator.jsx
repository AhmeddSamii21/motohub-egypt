import { useState } from 'react'
import { CATALOG } from '../data/catalog'
import { storeRequestedModel, REQUESTED_MODEL_EVENT } from '../data/requestedModel'
import './InstallmentCalculator.css'

/**
 * حاسبة أقساط استرشادية بالكامل:
 * - الأسعار المعروضة من الكتالوج تُستخدم كما هي (سلاسل حرفية من قائمة أسعار 2026) للعملية الحسابية فقط.
 * - معدل الفائدة ثابت موثّق أدناه كمثال توضيحي (فائدة بسيطة) وليس عرضًا من أي جهة تمويل فعليًا.
 * - الأرقام الناتجة (قسط/إجمالي/دفعة أولى) حصيلة معادلة على مُدخل المستخدم، لا بيانات "واقعية" تُنسب إلاحد.
 */
const MONTHLY_RATE = 0.015
const DOWN_CHIPS = [20, 30, 50]
const TENORS = [6, 12, 18, 24, 36]

const parsePrice = (price) => Number(String(price).replace(/,/g, ''))
const formatEGP = (value) => value.toLocaleString('en-US')
const onlyDigits = (value) => value.replace(/[^\d]/g, '')

function InstallmentCalculator() {
  const [model, setModel] = useState('')
  const [price, setPrice] = useState('')
  const [downPct, setDownPct] = useState(30)
  const [tenor, setTenor] = useState(12)

  const onModelChange = (name) => {
    setModel(name)
    if (!name) return
    const group = CATALOG.find((g) => g.models.some((m) => m.name === name))
    const found = group?.models.find((m) => m.name === name)
    if (found) setPrice(String(parsePrice(found.price)))
  }

  const numericPrice = Number(price)
  const isValid = numericPrice > 0 && downPct >= 0 && downPct < 100
  const multiplier = 1 + MONTHLY_RATE * tenor
  const downAmount = isValid ? Math.round((numericPrice * downPct) / 100) : 0
  const financed = isValid ? numericPrice - downAmount : 0
  const totalPaid = isValid ? Math.round(financed * multiplier) : 0
  const monthly = isValid ? Math.round((financed * multiplier) / tenor) : 0

  const onCtaClick = () => {
    if (!model) return
    storeRequestedModel(model)
    window.dispatchEvent(new CustomEvent(REQUESTED_MODEL_EVENT))
  }

  return (
    <section className="section finance" id="installments">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">حاسبة الأقساط</p>
          <h2 className="section-title">احسب نطاقًا استرشاديًا للأقساط</h2>
          <p className="section-sub">
            اختر موديلًا من الكتالوج أو أدخل سعرًا، وحدّد الدفعة الأولى ومدة التقسيط لترى حصيلة
            معادلة توضيحية بفائدة بسيطة.
          </p>
        </div>

        <div className="calc-panel">
          <div className="calc-controls">
            <div className="calc-field">
              <label className="calc-label" htmlFor="calc-model">
                الموديل أو السعر
              </label>
              <select
                id="calc-model"
                className="calc-select"
                value={model}
                onChange={(event) => onModelChange(event.target.value)}
              >
                <option value="">اختر موديلًا من الكتالوج (اختياري)</option>
                {CATALOG.map((group) => (
                  <optgroup key={group.brand} label={group.brand}>
                    {group.models.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name} — {item.price} ج.م
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="calc-field">
              <label className="calc-label" htmlFor="calc-price">
                السعر (ج.م){model ? ' — تم تعبئته من الكتالوج' : ''}
              </label>
              <input
                id="calc-price"
                className="calc-input"
                type="text"
                inputMode="numeric"
                dir="ltr"
                placeholder={model ? '' : 'مثال: 55000'}
                value={price}
                onChange={(event) => setPrice(onlyDigits(event.target.value))}
              />
            </div>

            <div className="calc-field">
              <label className="calc-label" htmlFor="calc-down">
                الدفعة الأولى: <b className="calc-down-value">{downPct}%</b>
              </label>
              <div className="calc-down-chips" role="group" aria-label="نسب جاهزة للدفعة الأولى">
                {DOWN_CHIPS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    className={`calc-chip ${downPct === pct ? 'is-active' : ''}`}
                    aria-pressed={downPct === pct}
                    onClick={() => setDownPct(pct)}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <div className="calc-down-slider">
                <input
                  id="calc-down"
                  className="calc-range"
                  type="range"
                  min="0"
                  max="80"
                  step="5"
                  value={downPct}
                  onChange={(event) => setDownPct(Number(event.target.value))}
                />
                <input
                  className="calc-num"
                  type="number"
                  min="0"
                  max="99"
                  dir="ltr"
                  aria-label="نسبة الدفعة الأولى المخصصة"
                  value={downPct}
                  onChange={(event) => {
                    const next = Number(onlyDigits(event.target.value.replace('-', '')))
                    setDownPct(Number.isFinite(next) ? Math.min(99, next) : 0)
                  }}
                />
              </div>
            </div>

            <div className="calc-field">
              <span className="calc-label" id="calc-tenor-label">
                مدة التقسيط بالأشهر
              </span>
              <div className="calc-tenor-chips" role="group" aria-labelledby="calc-tenor-label">
                {TENORS.map((months) => (
                  <button
                    key={months}
                    type="button"
                    className={`calc-chip ${tenor === months ? 'is-active' : ''}`}
                    aria-pressed={tenor === months}
                    onClick={() => setTenor(months)}
                  >
                    {months}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="calc-result" aria-live="polite">
            <div className="calc-result-grid">
              <div className="calc-stat calc-stat-focus">
                <p className="calc-stat-label">القسط الشهري التقديري</p>
                <p className="calc-stat-value" dir="ltr">
                  {formatEGP(monthly)}
                </p>
                <p className="calc-stat-unit">ج.م / شهر</p>
              </div>
              <div className="calc-stat">
                <p className="calc-stat-label">الدفعة الأولى</p>
                <p className="calc-stat-value" dir="ltr">
                  {formatEGP(downAmount)}
                </p>
                <p className="calc-stat-unit">ج.م</p>
              </div>
              <div className="calc-stat">
                <p className="calc-stat-label">المبلغ المُموّل</p>
                <p className="calc-stat-value" dir="ltr">
                  {formatEGP(financed)}
                </p>
                <p className="calc-stat-unit">ج.م</p>
              </div>
              <div className="calc-stat">
                <p className="calc-stat-label">إجمالي المدفوع</p>
                <p className="calc-stat-value" dir="ltr">
                  {formatEGP(totalPaid)}
                </p>
                <p className="calc-stat-unit">ج.م على {tenor} شهرًا</p>
              </div>
            </div>

            <p className="calc-note">
              الحساب بفائدة بسيطة استرشادية {(MONTHLY_RATE * 100).toFixed(1)}% شهريًا على المتبقي من
              السعر — الأرقام توضيحية فقط لعرض طريقة الحساب، وليست عرضًا فعليًا.
            </p>

            <div className="calc-actions">
              <a
                href="#book"
                className="btn btn-primary calc-cta"
                onClick={onCtaClick}
              >
                احجز معاينة{model ? ' بتمويل' : ''}
              </a>
              {!isValid && <span className="calc-cta-hint">أدخل سعرًا صحيحًا ودفعة أولى أقل من 100% لعرض الأرقام</span>}
            </div>
          </div>
        </div>

        <p className="calc-disclaimer">
          أسعار الأقساط استرشادية وتختلف حسب شركة التمويل أو المعرض — والمعادلة أعلاه مثال توضيحي
          معدّل يدويًا وفق مُدخلاتك، لا ارتباطًا بعروض فعلية.
        </p>
      </div>
    </section>
  )
}

export default InstallmentCalculator
