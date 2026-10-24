import { useState } from 'react'
import { CATALOG } from '../data/catalog'
import { storeRequestedModel } from '../data/requestedModel'
import './Catalog.css'

const ALL_BRANDS = 'all'

function Catalog() {
  const [brand, setBrand] = useState(ALL_BRANDS)
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()

  const visibleGroups = CATALOG.filter((group) => brand === ALL_BRANDS || group.brand === brand)
    .map((group) => ({
      ...group,
      models: group.models.filter((model) => model.name.toLowerCase().includes(normalizedQuery)),
    }))
    .filter((group) => group.models.length > 0)

  const visibleCount = visibleGroups.reduce((sum, group) => sum + group.models.length, 0)

  const resetFilters = () => {
    setBrand(ALL_BRANDS)
    setQuery('')
  }

  const hasFilters = brand !== ALL_BRANDS || query.trim() !== ''

  return (
    <section className="section catalog" id="catalog">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">الكتالوج الكامل</p>
          <h2 className="section-title">كل الموديلات حسب الماركة</h2>
          <p className="section-sub">
            قائمة شاملة من قائمة أسعار 2026 — الأسعار كما وردت في المصدر، والموديلات بدون سعر غير مُدرجة.
          </p>
        </div>

        <div className="catalog-tools">
          <label className="catalog-field">
            <span className="catalog-field-label">ابحث عن موديل</span>
            <input
              type="search"
              className="catalog-search"
              placeholder="اكتب اسم الموديل…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <label className="catalog-field">
            <span className="catalog-field-label">تصفية حسب الماركة</span>
            <select
              className="catalog-select"
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
          </label>
        </div>

        <p className="catalog-results" aria-live="polite">
          {visibleCount} موديل من {CATALOG.reduce((sum, group) => sum + group.models.length, 0)}
        </p>

        {visibleGroups.length === 0 ? (
          <div className="catalog-empty">
            <p className="catalog-empty-title">لا توجد نتائج مطابقة</p>
            <p className="catalog-empty-sub">
              جرّب كلمة بحث أخرى أو أعد ضبط الفلاتر لعرض كل الموديلات.
            </p>
            {hasFilters && (
              <button type="button" className="btn btn-ghost catalog-empty-reset" onClick={resetFilters}>
                إعادة ضبط البحث والفلاتر
              </button>
            )}
          </div>
        ) : (
          <div className="catalog-groups">
            {visibleGroups.map((group) => (
              <div className="catalog-group" key={group.brand}>
                <h3 className="catalog-brand">
                  {group.brand}
                  <span className="catalog-brand-count">{group.models.length}</span>
                </h3>
                <ul className="catalog-grid">
                  {group.models.map((model) => (
                    <li className="catalog-card" key={`${group.brand}-${model.name}`}>
                      <p className="catalog-card-brand">{group.brand}</p>
                      <h4 className="catalog-card-name">{model.name}</h4>
                      <p className="catalog-card-price">
                        <b>{model.price}</b> <span>ج.م</span>
                      </p>
                      <a
                        href="#book"
                        className="catalog-card-cta"
                        onClick={() => storeRequestedModel(model.name)}
                      >
                        احجز معاينة
                        <svg
                          viewBox="0 0 24 24"
                          width="15"
                          height="15"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M19 12H5m7-7l-7 7 7 7" />
                        </svg>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <p className="disclaimer">
          بيانات الكتالوج مستخرجة من قائمة الأسعار المرفقة بالمشروع للعرض فقط — بدون إنفنتار أو أرقام مخزون فعلية.
        </p>
      </div>
    </section>
  )
}

export default Catalog
