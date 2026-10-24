import { useState } from 'react'
import { CATALOG } from '../data/catalog'
import { storeRequestedModel, REQUESTED_MODEL_EVENT } from '../data/requestedModel'
import './Catalog.css'

const ALL_BRANDS = 'all'

/**
 * أسعار الكتالوج نصوص كما وردت في المصدر ("69,700" أو "229000") — تُحوَّل للأرقام
 * للترتيب/التصفية فقط، والنص الأصلي يبقى كما هو للعرض.
 */
function parsePrice(price) {
  return Number(String(price).replace(/,/g, ''))
}

const PRICE_FILTERS = {
  all: () => true,
  under60: (num) => num < 60000,
  '60to100': (num) => num >= 60000 && num <= 100000,
  above100: (num) => num > 100000,
}

function sortModels(models, sort) {
  if (sort === 'asc') return [...models].sort((a, b) => parsePrice(a.price) - parsePrice(b.price))
  if (sort === 'desc') return [...models].sort((a, b) => parsePrice(b.price) - parsePrice(a.price))
  return models // الترتيب الأصلي كما في المصدر
}

function ModelCard({ brand, model }) {
  return (
    <li className="catalog-card">
      <p className="catalog-card-brand">{brand}</p>
      <h4 className="catalog-card-name">{model.name}</h4>
      <p className="catalog-card-price">
        <b>{model.price}</b> <span>ج.م</span>
      </p>
      <a
        href="#book"
        className="catalog-card-cta"
        onClick={() => {
          storeRequestedModel(model.name)
          // حدث مخصص: الضغط على نفس الهاش (#book مجددًا) لا يُطلق hashchange
          window.dispatchEvent(new CustomEvent(REQUESTED_MODEL_EVENT))
        }}
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
  )
}

function Catalog() {
  const [brand, setBrand] = useState(ALL_BRANDS)
  const [query, setQuery] = useState('')
  const [priceRange, setPriceRange] = useState('all')
  const [sort, setSort] = useState('default')

  const normalizedQuery = query.trim().toLowerCase()

  const visibleGroups = CATALOG.filter((group) => brand === ALL_BRANDS || group.brand === brand)
    .map((group) => {
      let models = group.models.filter((model) => model.name.toLowerCase().includes(normalizedQuery))
      if (priceRange !== 'all') {
        models = models.filter((model) => PRICE_FILTERS[priceRange](parsePrice(model.price)))
      }
      models = sortModels(models, sort)
      return { ...group, models }
    })
    .filter((group) => group.models.length > 0)

  const visibleCount = visibleGroups.reduce((sum, group) => sum + group.models.length, 0)

  // عند تفعيل ترتيب سعري: قائمة واحدة مسطحة مرتبة عالميًا (البطاقة تعرض اسم الماركة دائمًا)
  const sortedFlatModels = sortModels(
    visibleGroups.flatMap((group) =>
      group.models.map((model) => ({ ...model, brand: group.brand }))
    ), 
    sort
  )

  const resetFilters = () => {
    setBrand(ALL_BRANDS)
    setQuery('')
    setPriceRange('all')
    setSort('default')
  }

  const hasFilters =
    brand !== ALL_BRANDS || query.trim() !== '' || priceRange !== 'all' || sort !== 'default'

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

          <label className="catalog-field">
            <span className="catalog-field-label">نطاق السعر</span>
            <select
              className="catalog-select"
              value={priceRange}
              onChange={(event) => setPriceRange(event.target.value)}
            >
              <option value="all">كل الأسعار</option>
              <option value="under60">أقل من 60 ألف ج.م</option>
              <option value="60to100">60 إلى 100 ألف ج.م</option>
              <option value="above100">أعلى من 100 ألف ج.م</option>
            </select>
          </label>

          <label className="catalog-field">
            <span className="catalog-field-label">الترتيب حسب السعر</span>
            <select
              className="catalog-select"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="default">الترتيب الأصلي</option>
              <option value="asc">من الأقل للأعلى</option>
              <option value="desc">من الأعلى للأقل</option>
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
        ) : sort === 'default' ? (
          <div className="catalog-groups">
            {visibleGroups.map((group) => (
              <div className="catalog-group" key={group.brand}>
                <h3 className="catalog-brand">
                  {group.brand}
                  <span className="catalog-brand-count">{group.models.length}</span>
                </h3>
                <ul className="catalog-grid">
                  {group.models.map((model) => (
                    <ModelCard key={model.name} brand={group.brand} model={model} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="catalog-groups">
            <div className="catalog-group">
              <h3 className="catalog-brand">
                {sort === 'asc' ? 'مرتبة من الأقل للأعلى' : 'مرتبة من الأعلى للأقل'}
                <span className="catalog-brand-count">{visibleCount}</span>
              </h3>
              <ul className="catalog-grid">
                {sortedFlatModels.map((model) => (
                  <ModelCard key={model.name} brand={model.brand} model={model} />
                ))}
              </ul>
            </div>
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
