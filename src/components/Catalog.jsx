import { useEffect, useRef, useState } from 'react'
import { CATALOG } from '../data/catalog'
import { AVAILABILITY_NOTE, LAST_RECORDED_PRICE_NOTE } from '../data/generatedStock'
import { storeRequestedModel, REQUESTED_MODEL_EVENT } from '../data/requestedModel'
import { modelHref } from '../data/modelSlug'
import { GENERATED_BY_KEY, formatDisplayPrice } from '../data/modelDisplay'
import { readFavorites, toggleFavorite, FAVORITES_EVENT } from '../data/favoritesStore'
import {
  readCompareKeys,
  toggleCompareKey,
  clearCompareKeys,
  COMPARE_EVENT,
  COMPARE_LIMIT,
} from '../data/compareStore'
import {
  buildDiscoveryModels,
  applyDiscoveryFilters,
  sortDiscovery,
  activeFilterChips,
  TYPE_VALUES,
  AVAILABILITY_OPTIONS,
  SORT_OPTIONS,
} from '../data/catalogDiscovery.js'
import ModelCompare from './ModelCompare'
import Brands from './Brands'
import './Catalog.css'

const ALL_BRANDS = 'all'

/** حد أقصى للمقارنة في المرة الواحدة — من المخزن المشترك (يُستخدم في صفحة المقارنة أيضًا) */
const MAX_COMPARE = COMPARE_LIMIT

/** كل موديلات الكتالوج مفهرسة بمفتاح ماركة|اسم لثبات التحديد عبر التصفية والترتيب */
const ALL_MODELS_INDEXED = CATALOG.flatMap((group) =>
  group.models.map((model) => ({
    ...model,
    brand: group.brand,
    key: `${group.brand}|${model.name}`,
  }))
)
const _MODEL_BY_KEY = new Map(ALL_MODELS_INDEXED.map((model) => [model.key, model]))

/**
 * بيانات الاكتشاف المُثراة (سعر رقمي/سعة/سرعة/نوع/توفر) — تُحسب مرة من المصادر
 * المُجمَّدة نفسها (كتالوج + مخزون مُولَّد + مواصفات مُولَّدة) — بلا تكرار لمصدر الحقيقة.
 */
const DISCOVERY_MODELS = buildDiscoveryModels()

const CC_BANDS = [
  { id: '', label: 'كل السعات', min: null, max: null },
  { id: 'small', label: 'حتى 150cc', min: null, max: 150 },
  { id: 'mid', label: 'أكبر من 150 حتى 200cc', min: 150, max: 200 },
  { id: 'big', label: 'أكبر من 200cc', min: 200, max: null },
]

function ModelCard({ brand, model, compared, onToggleCompare, compareDisabled, fav, onToggleFav }) {
  const info = GENERATED_BY_KEY.get(`${brand}|${model.name}`)
  const needsReview = Boolean(info && info.needsReview)
  // موديل بسجل Stock مُطابَق، وبه وحدات مسجّلة: مؤشر «متاح» الموجز (بلا تحذير)
  // وسائر الحالات (قائمة الأسعار أو الكتالوج) | بلا سجل Stock: تحذير آخر سعر مسجل
  // التوفر يبقى مجهولًا ولا يُوصف الموديل بأنه غير متوفر.
  const availability = info && info.stockUnits > 0 ? AVAILABILITY_NOTE : LAST_RECORDED_PRICE_NOTE
  return (
    <li className="catalog-card" data-card-brand={brand}>
      <a
        className="catalog-card-overlay"
        href={modelHref(brand, model.name)}
        aria-label={`تفاصيل ${brand} ${model.name}`}
      />
      <div className="catalog-card-top">
        <p className="catalog-card-brand">{brand}</p>
        <div className="catalog-card-tools">
          <button
            type="button"
            className={`catalog-card-compare ${compared ? 'is-selected' : ''}`}
            aria-pressed={compared}
            disabled={compareDisabled && !compared}
            onClick={() => onToggleCompare(`${brand}|${model.name}`)}
          >
            قارن
          </button>
          <button
            type="button"
            className={`catalog-card-fav ${fav ? 'is-active' : ''}`}
            aria-pressed={fav}
            aria-label={fav ? `إزالة ${brand} ${model.name} من المفضلة` : `إضافة ${brand} ${model.name} إلى المفضلة`}
            title={fav ? 'في المفضلة' : 'أضف إلى المفضلة'}
            onClick={() => onToggleFav(brand, model.name)}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill={fav ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
            </svg>
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
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [ccBand, setCcBand] = useState('')
  const [types, setTypes] = useState([])
  const [availability, setAvailability] = useState('all')
  const [speedMin, setSpeedMin] = useState('')
  const [sort, setSort] = useState('default')
  const [compareOpen, setCompareOpen] = useState(false)

  // تحديد المقارنة: مخزن مشترك دائم (localStorage) تشاركه صفحة المقارنة الكاملة —
  // نفس نمط شارة المفضلة: حالة محلية + حدث مخصص للتحديث الفوري بين المكوّنات
  const [compareKeys, setCompareKeys] = useState([])
  
  useEffect(() => {
    const refresh = () => {
      console.log('Refreshing compareKeys:', readCompareKeys())
      setCompareKeys(readCompareKeys())
    }
    refresh() // Initial load
    window.addEventListener(COMPARE_EVENT, refresh)
    return () => window.removeEventListener(COMPARE_EVENT, refresh)
  }, [])

  // المفضلة: مجموعة المفاتيح الحالية — تُحدَّث عبر حدث المفضلة (نفس نمط شارة السلة)
  const [favKeys, setFavKeys] = useState(() => new Set(readFavorites().map((item) => `${item.brand}|${item.name}`)))
  useEffect(() => {
    const refresh = () => setFavKeys(new Set(readFavorites().map((item) => `${item.brand}|${item.name}`)))
    window.addEventListener(FAVORITES_EVENT, refresh)
    return () => window.removeEventListener(FAVORITES_EVENT, refresh)
  }, [])

  const toggleCompare = (key) => {
    toggleCompareKey(key) // المخزن يطلق الحدث فتتحدث الحالة المحلية بالمعالج أعلاه
  }

  // ===== منطق الاكتشاف: فلاتر مجمَّعة + ترتيب — المنطق النقي في catalogDiscovery.js =====
  const numeric = (value) => {
    if (value === '' || value == null) return null
    const parsed = Number(String(value).replace(/,/g, ''))
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }
  const band = CC_BANDS.find((b) => b.id === ccBand)
  const filters = {
    query,
    brand,
    priceMin: numeric(priceMin),
    priceMax: numeric(priceMax),
    ccMin: band ? band.min : null,
    ccMax: band ? band.max : null,
    types,
    availability,
    speedMin: numeric(speedMin),
  }
  const { items: filteredModels, excludedNoValue } = applyDiscoveryFilters(DISCOVERY_MODELS, filters)
  const results = sortDiscovery(filteredModels, sort)
  const chips = activeFilterChips(filters)
  const clearChip = (clear) => {
    if ('query' in clear) setQuery(clear.query)
    if ('brand' in clear) setBrand(clear.brand)
    if ('priceMin' in clear) { setPriceMin(clear.priceMin == null ? '' : String(clear.priceMin)); setPriceMax(clear.priceMax == null ? '' : String(clear.priceMax)) }
    if ('ccMin' in clear) setCcBand('')
    if ('types' in clear) setTypes(clear.types)
    if ('availability' in clear) setAvailability(clear.availability)
    if ('speedMin' in clear) setSpeedMin(clear.speedMin == null ? '' : String(clear.speedMin))
  }
  const resetFilters = () => {
    setBrand(ALL_BRANDS)
    setQuery('')
    setPriceMin('')
    setPriceMax('')
    setCcBand('')
    setTypes([])
    setAvailability('all')
    setSpeedMin('')
  }
  const filtersActive = chips.length > 0

  // العرض المجمَّع بالماركة يبقى افتراضيًا حين لا فلاتر ولا ترتيب سعري (نفس سلوك التمرير للماركة)؛
  // وإلا قائمة مسطحة من نتائج الاكتشاف (البطاقة تعرض اسم الماركة دائمًا)
  const visibleGroups =
    !filtersActive && sort === 'default'
      ? CATALOG.map((group) => ({
          ...group,
          models: results.filter((model) => model.brand === group.brand),
        })).filter((group) => group.models.length > 0)
      : []
  const visibleCount = results.length

  const compareItems = compareKeys.map((key) => {
    const model = DISCOVERY_MODELS.find(m => m.key === key)
    return model ? {
      ...model,
      brand: model.brand,
      name: model.name,
      key: model.key
    } : null
  }).filter(Boolean)

  const sortedFlatModels = results

  const hasFilters = filtersActive || sort !== 'default'

  // ===== ماركات داخل المعرض → الكتالوج =====
  // البطاق تعرض ماركة (وليس موديلًا)، لذا الهدف الموثوق: فلتر الماركة + تمرير إلى
  // مجموعة الماركة (الترتيب الأصلي) أو أول بطاقة من موديلاتها (الترتيب السعري).
  // المرجع يُستهلك مرة واحدة بعد إعادة التصيير فيصير التمرير بلا سباقات.
  const pendingBrandScrollRef = useRef(null)

  const handleBrandSelect = (brandName) => {
    pendingBrandScrollRef.current = brandName
    setBrand(brandName)
  }

  useEffect(() => {
    const wanted = pendingBrandScrollRef.current
    if (!wanted) return
    pendingBrandScrollRef.current = null
    const esc = window.CSS ? CSS.escape(wanted) : wanted.replace(/["\\]/g, '\\$&')
    const groupEl = document.querySelector(`.catalog-group[data-brand="${esc}"]`)
    const cardEl = document.querySelector(`.catalog-card[data-card-brand="${esc}"]`)
    const target = sort === 'default' ? (groupEl || cardEl) : (cardEl || groupEl)
    if (target) target.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [brand, sort])

  return (
    <>
      {/* قائمة الماركات أعلى قسم الكتالوج مباشرة — نظرة فورية على الماركات عند الوصول للقسم */}
      <Brands onBrandSelect={handleBrandSelect} />
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
          <label className="catalog-field catalog-field-search">
            <span className="catalog-field-label">ابحث عن موديل أو ماركة</span>
            <div className="catalog-search-wrap">
              <input
                type="search"
                className="catalog-search"
                placeholder="مثال: سكوتر SYM أو Jet 150…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button
                  type="button"
                  className="catalog-search-clear"
                  aria-label="مسح البحث"
                  onClick={() => setQuery('')}
                >
                  ×
                </button>
              )}
            </div>
          </label>

          <label className="catalog-field">
            <span className="catalog-field-label">الماركة</span>
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

          <div className="catalog-field catalog-field-price">
            <span className="catalog-field-label" id="catalog-price-label">السعر (ج.م)</span>
            <div className="catalog-price-inputs" role="group" aria-labelledby="catalog-price-label">
              <input
                type="text"
                inputMode="numeric"
                className="catalog-input"
                dir="ltr"
                placeholder="من"
                aria-label="أقل سعر"
                value={priceMin}
                onChange={(event) => setPriceMin(event.target.value.replace(/[^\d]/g, ''))}
              />
              <span aria-hidden="true">—</span>
              <input
                type="text"
                inputMode="numeric"
                className="catalog-input"
                dir="ltr"
                placeholder="إلى"
                aria-label="أعلى سعر"
                value={priceMax}
                onChange={(event) => setPriceMax(event.target.value.replace(/[^\d]/g, ''))}
              />
            </div>
          </div>

          <div className="catalog-field">
            <span className="catalog-field-label" id="catalog-cc-label">سعة المحرك</span>
            <div className="catalog-chips" role="group" aria-labelledby="catalog-cc-label">
              {CC_BANDS.map((b) => (
                <button
                  key={b.id || 'any'}
                  type="button"
                  className={`catalog-chip ${ccBand === b.id ? 'is-active' : ''}`}
                  aria-pressed={ccBand === b.id}
                  onClick={() => setCcBand(b.id)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="catalog-field">
            <span className="catalog-field-label" id="catalog-type-label">نوع المركبة</span>
            <div className="catalog-chips" role="group" aria-labelledby="catalog-type-label">
              <button
                type="button"
                className={`catalog-chip ${types.length === 0 ? 'is-active' : ''}`}
                aria-pressed={types.length === 0}
                onClick={() => setTypes([])}
              >
                كل الأنواع
              </button>
              {TYPE_VALUES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`catalog-chip ${types.includes(type) ? 'is-active' : ''}`}
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

          <label className="catalog-field">
            <span className="catalog-field-label">التوفر</span>
            <select
              className="catalog-select"
              value={availability}
              onChange={(event) => setAvailability(event.target.value)}
            >
              {AVAILABILITY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="catalog-field">
            <span className="catalog-field-label">الترتيب</span>
            <select
              className="catalog-select"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="catalog-results" aria-live="polite">
          {visibleCount} موديل مطابق من {CATALOG.reduce((sum, group) => sum + group.models.length, 0)}
        </p>

        {chips.length > 0 && (
          <div className="catalog-active" role="group" aria-label="الفلاتر المفعّلة">
            <span className="catalog-active-title">الفلاتر المفعّلة:</span>
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="catalog-active-chip"
                onClick={() => clearChip(chip.clear)}
                aria-label={`إزالة فلتر ${chip.label}`}
              >
                {chip.label} <span aria-hidden="true">×</span>
              </button>
            ))}
            <button type="button" className="catalog-active-clear" onClick={resetFilters}>
              مسح كل الفلاتر
            </button>
          </div>
        )}

        {filtersActive && excludedNoValue.cc + excludedNoValue.type + excludedNoValue.topSpeed > 0 && (
          <p className="catalog-excluded-note">
            موديلات مستبعدة لأن القيمة غير منشورة في البيانات:
            {excludedNoValue.cc > 0 && ` سعة المحرك ${excludedNoValue.cc}`}
            {excludedNoValue.type > 0 && ` · نوع المركبة ${excludedNoValue.type}`}
            {excludedNoValue.topSpeed > 0 && ` · السرعة القصوى ${excludedNoValue.topSpeed}`} — لا يُعامل الناقص صفرًا.
          </p>
        )}

        {visibleCount === 0 ? (
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
        ) : !filtersActive && sort === 'default' ? (
          <div className="catalog-groups">
            {visibleGroups.map((group) => (
              <div className="catalog-group" key={group.brand} data-brand={group.brand}>
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
                      fav={favKeys.has(`${group.brand}|${model.name}`)}
                      onToggleFav={toggleFavorite}
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
                {sort !== 'default'
                  ? (SORT_OPTIONS.find((option) => option.id === sort)?.label ?? 'النتائج المطابقة')
                  : 'النتائج المطابقة'}
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
                    fav={favKeys.has(model.key)}
                    onToggleFav={toggleFavorite}
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
              <a className="btn btn-ghost compare-bar-page" href="#compare">
                صفحة المقارنة الكاملة
              </a>
              <button type="button" className="btn btn-ghost compare-bar-clear" onClick={() => clearCompareKeys()}>
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
            clearCompareKeys()
            setCompareOpen(false)
          }}
        />
      </div>
    </section>
    </>
  )
}

export default Catalog
