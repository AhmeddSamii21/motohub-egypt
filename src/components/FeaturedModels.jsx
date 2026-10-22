import { FEATURED_MODELS, formatPrice } from '../data/content'
import './FeaturedModels.css'

function FeaturedModels() {
  return (
    <section className="section models" id="models">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">موديلات مميزة</p>
          <h2 className="section-title">مختارات من المعرض</h2>
          <p className="section-sub">
            نماذج بتصنيفات وسعة مختلفة… الأسعار والبيانات تجريبية بالكامل للعرض فقط.
          </p>
        </div>

        <div className="models-grid">
          {FEATURED_MODELS.map((model) => (
            <article className="model-card" key={model.id}>
              <div className={`model-visual cat-${model.category.replace(/\s+/g, '-')}`} aria-hidden="true">
                <span className="model-scope">{model.displacement}</span>
                <div className="model-lines">
                  <span />
                  <span />
                </div>
              </div>

              <div className="model-body">
                <p className="model-category">{model.category}</p>
                <h3 className="model-name">{model.name}</h3>
                <p className="model-spec">
                  السعة: <b>{model.displacement}</b>
                </p>
                <p className="model-price">
                  يبدأ من <b>{formatPrice(model.price)}</b> <span>ج.م</span>
                </p>
              </div>

              <a href="#book" className="model-cta">
                احجز معاينة
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
