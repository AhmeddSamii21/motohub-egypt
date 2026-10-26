import { useState } from 'react'
import { CATALOG } from '../data/catalog'
import { AVAILABILITY_NOTE, LAST_RECORDED_PRICE_NOTE } from '../data/generatedStock'
import { storeRequestedModel, REQUESTED_MODEL_EVENT } from '../data/requestedModel'
import { modelHref } from '../data/modelSlug'
import { GENERATED_BY_KEY, formatDisplayPrice } from '../data/modelDisplay'
import ModelCompare from './ModelCompare'
import Brands from './Brands'
import './Catalog.css'

const ALL_BRANDS = 'all'

/** حد أقصى للمقارنة في المرة الواحدة */
const MAX_COMPARE = 3

/** كل موديلات الكتالوج مفهرسة بمفتاح ماركة|اسم لثبات التحديد عبر التصفية والترتيب */
const ALL_MODELS_INDEXED = CATALOG.flatMap((group) =>
  group.models.map((model) => ({
    ...model,
    brand: group.brand,
    key: `${group.brand}|${model.name}`,
  }))
)
const MODEL_BY_KEY = new Map(ALL_MODELS_INDEXED.map((model) => [model.key, model]))

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

// بيانات السعر والتوفّر المُولَّدة — مفتاح المطابقة نفس مفتاح المقارنة (brand|name)
// الملف المُولَّد يغطي جميع موديلات الكتالوج؛ عند فشل مفتاح نرجع للعرض القديم كما هو.
// المنطق المشترك (المفتاح + تنسيق السعر) يعيش في src/data/modelDisplay.js لصفحة الموديل أيضًا.

function ModelCard({ brand, model, compared, onToggleCompare, compareDisabled }) {
  const info = GENERATED_BY_KEY.get(`${brand}|${model.name}`)
  const needsReview = Boolean(info && info.needsReview)
  // موديل بسجل Stock مُطابَق، وبه وحدات مسجّلة: مؤشر «متاح» الموجز (بلا تحذير)
  // وسائر الحالات (قائمة الأسعار أو الكتالوج) | بلا سجل Stock: تحذير آخر سعر مسجل
  // التوفر يبقى مجهولًا ولا يُوصف الموديل بأنه غير متوفر.
  const availability = info && info.stockUnits > 0 ? AVAILABILITY_NOTE : LAST_RECORDED_PRICE_NOTE
  return (
    <li className="catalog-card">
      <div className="catalog-card-top">
        <p className="catalog-card-brand">{brand}</p>
        <div className="catalog-card-actions">
          <a className="catalog-card-details" href={modelHref(brand, model.name)}>
            التفاصيل
          </a>
          <button
            type="button"
            className={`catalog-card-compare ${compared ? 'is-selected' : ''}`}
            aria-pressed={compared}
            disabled={compareDisabled && !compared}
            onClick={() => onToggleCompare(`${brand}|${model.name}`)}
          >
            قارن
          </button>
        </div>
      </div>
      <h4 className="catalog-card-name">{model.name}</h4>
      <p className="catalog-card-price">
        <b>{formatDisplayPrice(info ? info.price : model.price, info && info.source)}</b> <span>ج.م</span>
        {needsReview && <span className="catalog-card-review" title="سعر مصدره قائمة قديمة — قيد المراجعة مع المصدر">*</span>}
      </p>
      <p className="catalog-card-availability">{availability}</p>
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
  const [compareKeys, setCompareKeys] = useState([])
  const [compareOpen, setCompareOpen] = useState(false)

  const toggleCompare = (key) => {
    setCompareKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key)
      if (prev.length >= MAX_COMPARE) return prev
      return [...prev, key]
    })
  }

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

  const compareItems = compareKeys.map((key) => MODEL_BY_KEY.get(key)).filter(Boolean)

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
    <>
      {/* قائمة الماركات أعلن قسم الكتالوج مباشرة — نظرة فورية على الماركات عند الوصول للقسم */}
      <Brands />
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
                    <ModelCard
                      key={model.name}
                      brand={group.brand}
                      model={model}
                      compared={compareKeys.includes(`${group.brand}|${model.name}`)}
                      onToggleCompare={toggleCompare}
                      compareDisabled={compareKeys.length >= MAX_COMPARE}
                    />
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
                  <ModelCard
                    key={model.name}
                    brand={model.brand}
                    model={model}
                    compared={compareKeys.includes(model.key)}
                    onToggleCompare={toggleCompare}
                    compareDisabled={compareKeys.length >= MAX_COMPARE}
                  />
                ))}
              </ul>
            </div>
          </div>
        )}

        <p className="disclaimer">
          بيانات الكتالوج مستخرجة من قائمة الأسعار المرفقة بالمشروع للعرض فقط — بدون إنفنتار أو أرقام مخزون فعلية.
        </p>

        {compareItems.length > 0 && !compareOpen && (
          <div className="compare-bar" role="region" aria-label="الموديلات المختارة للمقارنة">
            <div className="compare-bar-chips">
              {compareItems.map((item) => (
                <span className="compare-chip" key={item.key}>
                  <span className="compare-chip-name" title={item.brand}>{item.name}</span>
                  <button
                    type="button"
                    className="compare-chip-remove"
                    onClick={() => toggleCompare(item.key)}
                    aria-label={`إزالة ${item.name} من المقارنة`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="compare-bar-actions">
              {compareKeys.length >= MAX_COMPARE && (
                <span className="compare-bar-note">الحد الأقصى {MAX_COMPARE} موديلات</span>
              )}
              <button
                type="button"
                className="btn btn-primary compare-bar-open"
                onClick={() => setCompareOpen(true)}
              >
                قارن ({compareItems.length})
              </button>
              <button type="button" className="btn btn-ghost compare-bar-clear" onClick={() => setCompareKeys([])}>
                مسح
              </button>
            </div>
          </div>
        )}

        <ModelCompare
          open={compareOpen}
          items={compareItems}
          onClose={() => setCompareOpen(false)}
          onRemove={(key) => toggleCompare(key)}
          onClear={() => {
            setCompareKeys([])
            setCompareOpen(false)
          }}
        />
      </div>
    </section>
    </>
  )
}

export default Catalog
