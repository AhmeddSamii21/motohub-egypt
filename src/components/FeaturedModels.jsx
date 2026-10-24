import { CATALOG } from '../data/catalog'
import { storeRequestedModel, REQUESTED_MODEL_EVENT } from '../data/requestedModel'
import './FeaturedModels.css'

/**
 * مختارات المعرض مشتقة حصريًا من الكتالوج المُتحقَّق منه:
 * أعلى موديلين سعرًا من كل ماركة من الماركات الثلاث المطروحة هنا.
 * الأسماء والأسعار تُعرض حرفيًا كما في قائمة أسعار 2026 — لا مواصفات ولا سنة ولا أي حقل مخترع.
 * الانتقاء بمعيار سعري محدد (قابل للفحص) — لا ادعاء بشعبية أو توافر.
 */
const FEATURED_BRANDS = ['SYM', 'ZONTES', 'KEEWAY']
const TOP_PER_BRAND = 2

const parsePrice = (price) => Number(String(price).replace(/,/g, ''))

const FEATURED = FEATURED_BRANDS.flatMap((brand) => {
  const group = CATALOG.find((g) => g.brand === brand)
  if (!group) return []
  return [...group.models]
    .sort((a, b) => parsePrice(b.price) - parsePrice(a.price))
    .slice(0, TOP_PER_BRAND)
    .map((model) => ({ brand: group.brand, ...model }))
})

function FeaturedModels() {
  return (
    <section className="section models" id="models">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">مختارات مميزة</p>
          <h2 className="section-title">مختارات من كتالوج 2026</h2>
          <p className="section-sub">
            موديلات من كتالوج الموقع بأسعارها كما وردت في المصدر حرفيًا — والكتالوج الكامل وراء قسم
            <a href="#catalog"> الكتالوج</a>.
          </p>
        </div>

        <div className="models-grid">
          {FEATURED.map((model) => (
            <article className="model-card" key={model.name}>
              <div className="model-body">
                <p className="model-category">{model.brand}</p>
                <h3 className="model-name">{model.name}</h3>
                <p className="model-price">
                  <b>{model.price}</b> <span>ج.م</span>
                </p>
              </div>

              <a
                href="#book"
                className="model-cta"
                onClick={() => {
                  storeRequestedModel(model.name)
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
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturedModels
