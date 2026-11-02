import { useEffect, useState } from 'react'
import {
  readCompareKeys,
  removeCompareKey,
  clearCompareKeys,
  COMPARE_EVENT,
  COMPARE_LIMIT,
} from '../data/compareStore'
import {
  COMPARE_PAGE_TITLE,
  MISSING_VALUE_LABEL,
  LEGEND_BETTER,
  LEGEND_EQUAL,
  LEGEND_MISSING,
  PRICE_REVIEW_NOTE,
  buildCompareItems,
  buildCompareRows,
  buildSummaries,
} from '../data/compareTable'
import { modelHref } from '../data/modelSlug'
import './ComparePage.css'

/**
 * صفحة المقارنة الكاملة — جدول حقيقي <table>: عمود لكل موتوسيكل وصف واحد لكل مواصفة.
 * ضمان المحاذاة بنيوي: الصف يُبنى مرة واحدة من التسمية نفسها فتُقرأ كل الخلايا من
 * مواصفة التسمية ذاتها عبر كل الأعمدة — لا انزياح ممكن (خلاف البطاقات المنفصلة).
 * عمود التسميات مثبّت بـ position:sticky داخل تمرير أفقي آمن على الجوال.
 */
function ComparePage() {
  const [keys, setKeys] = useState(readCompareKeys)

  useEffect(() => {
    const refresh = () => setKeys(readCompareKeys())
    window.addEventListener(COMPARE_EVENT, refresh)
    return () => window.removeEventListener(COMPARE_EVENT, refresh)
  }, [])

  const items = buildCompareItems(keys)

  if (items.length === 0) {
    return (
      <section className="section compare-page" aria-labelledby="compare-page-title">
        <div className="container">
          <h1 className="compare-page-title" id="compare-page-title">{COMPARE_PAGE_TITLE}</h1>
          <div className="compare-empty">
            <p>لم تختر بعد أي موتوسيكل للمقارنة.</p>
            <p>
              من كل بطاقة في <a href="#catalog">الكتالوج</a> اضغط «مقارنة» لإضافة الموديل
              (الحد الأقصى {COMPARE_LIMIT} موتوسيكلات)، ثم عد إلى هذه الصفحة.
            </p>
            <a className="btn btn-primary" href="#catalog">تصفح الكتالوج</a>
          </div>
        </div>
      </section>
    )
  }

  if (items.length < 2) {
    const only = items[0]
    return (
      <section className="section compare-page" aria-labelledby="compare-page-title">
        <div className="container">
          <h1 className="compare-page-title" id="compare-page-title">{COMPARE_PAGE_TITLE}</h1>
          <div className="compare-empty">
            <p>
              اخترت موتوسيكلًا واحدًا فقط ({only.brand} {only.name}).
              المقارنة الجانبية تحتاج موتوسيكلين على الأقل.
            </p>
            <p>
              أضف موتوسيكلًا آخر من <a href="#catalog">الكتالوج</a> أو أزل هذا الموديل.
            </p>
            <div className="compare-empty-actions">
              <a className="btn btn-primary" href="#catalog">تصفح الكتالوج</a>
              <button type="button" className="btn btn-ghost" onClick={() => clearCompareKeys()}>
                مسح التحديد
              </button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  const rows = buildCompareRows(items)
  const summaries = buildSummaries(items, rows)

  return (
    <section className="section compare-page" aria-labelledby="compare-page-title">
      <div className="container">
        <h1 className="compare-page-title" id="compare-page-title">{COMPARE_PAGE_TITLE}</h1>

        <ul className="compare-legend" aria-label="دلالة التمييز">
          <li><span className="compare-cell better" aria-hidden="true" /> {LEGEND_BETTER}</li>
          <li><span className="compare-cell equal" aria-hidden="true" /> {LEGEND_EQUAL}</li>
          <li>{MISSING_VALUE_LABEL} — {LEGEND_MISSING}</li>
        </ul>

        <p className="compare-note">
          {PRICE_REVIEW_NOTE} القيم تُعرض كما وردت في البيانات؛ ما يغيب يُظهر «{MISSING_VALUE_LABEL}»
          ولا تُقارَن المواصفات النصية (ناقل الحركة، الفرامل…) ولا سعة المحرك لأنها تعتمد على الاستخدام.
        </p>

        <div className="compare-scroll" role="region" aria-label="جدول مقارنة الموتوسيكلات" tabIndex={0}>
          <table className="compare-table">
            <caption className="sr-only">{COMPARE_PAGE_TITLE} — عمود لكل موتوسيكل وصف لكل مواصفة</caption>
            <colgroup>
              <col className="compare-col-labels" />
              {items.map((item) => <col key={item.key} />)}
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="compare-corner">
                  <span className="sr-only">المواصفة</span>
                </th>
                {items.map((item) => {
                  const href = modelHref(item.brand, item.name)
                  return (
                    <th scope="col" key={item.key} className="compare-head">
                      <button
                        type="button"
                        className="compare-head-remove"
                        onClick={() => removeCompareKey(item.key)}
                        aria-label={`إزالة ${item.name} من المقارنة`}
                      >
                        إزالة ×
                      </button>
                      <p className="compare-head-brand">{item.brand}</p>
                      {href ? (
                        <a className="compare-head-name" href={href}>{item.name}</a>
                      ) : (
                        <span className="compare-head-name">{item.name}</span>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              <tr className="compare-group-row" aria-hidden="true">
                <th scope="rowgroup" className="compare-group-cell">السعر</th>
                {items.map((item) => <td key={item.key} />)}
              </tr>
              <PriceRow row={rows.priceRow} />
              {rows.groups.map((group) => (
                <FragmentRows key={group.id} group={group} items={items} />
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="compare-summary-label">الملخص</th>
                {items.map((item, index) => (
                  <td key={item.key} className="compare-summary">
                    <p>{summaries[index]}</p>
                    <a href="#book" className="btn btn-primary compare-cta">احجز معاينة</a>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  )
}

/** صف السعر — خلية الصف الكاملة جاهزة من buildCompareRows */
function PriceRow({ row }) {
  return (
    <tr className={row.status === 'equal' ? 'is-equal-row' : ''}>
      <th scope="row" className="compare-label">{row.label}</th>
      {row.cells.map((cell, index) => (
        <td key={index} className={`compare-cell ${cell.highlight ? `is-${cell.highlight}` : ''}${row.status === 'equal' ? ' is-equal' : ''}`}>
          {cell.text}
          {cell.highlight === 'better' && <span className="sr-only"> — {LEGEND_BETTER}</span>}
          {row.status === 'equal' && <span className="sr-only"> — {LEGEND_EQUAL}</span>}
        </td>
      ))}
    </tr>
  )
}

/** مجموعة مواصفات: صف عنوان المجموعة ثم صفوفها الموجودة فعلًا */
function FragmentRows({ group }) {
  return (
    <>
      <tr className="compare-group-row">
        <th scope="rowgroup" colSpan={99} className="compare-group-cell">{group.title}</th>
      </tr>
      {group.rows.map((row) => (
        <tr key={row.id ?? row.label}>
          <th scope="row" className="compare-label">{row.label}</th>
          {row.cells.map((cell, index) => (
            <td key={index} className={`compare-cell ${cell.highlight ? `is-${cell.highlight}` : ''}${row.status === 'equal' ? ' is-equal' : ''}`}>
              {cell.text}
              {cell.highlight === 'better' && <span className="sr-only"> — {LEGEND_BETTER}</span>}
              {row.status === 'equal' && <span className="sr-only"> — {LEGEND_EQUAL}</span>}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export default ComparePage
