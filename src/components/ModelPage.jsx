import { useEffect, useState } from 'react'
import { resolveModelUrl } from '../data/modelSlug'
import { storeRequestedModel, REQUESTED_MODEL_EVENT } from '../data/requestedModel'
import { GENERATED_BY_KEY, formatDisplayPrice } from '../data/modelDisplay'
import { AVAILABILITY_NOTE, LAST_RECORDED_PRICE_NOTE } from '../data/generatedStock'
import './ModelPage.css'

/**
 * صفحة موديل واحد — بياناتها حصرًا: الماركة والاسم والسعر المعروض بأسلوب الكتالوج نفسه
 * (المصدر/التوفر/علامة المراجعة عبر المنطق المشترك مع بطاقات الكتالوج). لا مواصفات ولا
 * صور ولا ضمانات ولا تمويل — لا تُخترع بيانات، وتُذكر الحاجة نصًا فقط.
 * هاش غير معروف أو غير مكتمل => توجيه تام إلى #catalog (بلا تخمين وبلا صفحة فارغة).
 */
function ModelPage() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const resolved = resolveModelUrl(hash)
  useEffect(() => {
    // توجيه بديل (بدون سجل تاريخ إضافي) حصرًا عندما يأتي التطبيق بروابط #/m/ غير صالحة
    if (!resolved && hash.startsWith('#/m/')) window.location.replace('#catalog')
  }, [resolved, hash])
  if (!resolved) return null

  const { brand, model } = resolved
  const info = GENERATED_BY_KEY.get(`${brand}|${model.name}`)
  const availability = info && info.stockUnits > 0 ? AVAILABILITY_NOTE : LAST_RECORDED_PRICE_NOTE
  const needsReview = Boolean(info && info.needsReview)

  return (
    <section className="section model-page" id="model">
      <div className="container">
        <article className="model-page-card">
          <p className="catalog-card-brand">{brand}</p>
          <h1 className="catalog-card-name model-page-name">{model.name}</h1>
          <p className="catalog-card-price">
            <b>{formatDisplayPrice(info ? info.price : model.price, info && info.source)}</b> <span>ج.م</span>
            {needsReview && <span className="catalog-card-review" title="سعر مصدره قائمة قديمة — قيد المراجعة مع المصدر">*</span>}
          </p>
          <p className="catalog-card-availability">{availability}</p>

          <div className="model-page-actions">
            <a
              href="#book"
              className="catalog-card-cta"
              onClick={() => {
                storeRequestedModel(model.name)
                window.dispatchEvent(new CustomEvent(REQUESTED_MODEL_EVENT))
              }}
            >
              احجز معاينة
            </a>
            <a href="#catalog" className="model-page-back">
              كل الموديلات
            </a>
          </div>

          <p className="model-page-note">المواصفات والصور غير منشورة بعد — تُضاف حصرًا عند توفرها من المصدر المعتمد.</p>
        </article>
      </div>
    </section>
  )
}

export default ModelPage
