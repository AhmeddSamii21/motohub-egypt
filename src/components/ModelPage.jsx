import { useEffect, useState } from 'react'
import { resolveModelUrl } from '../data/modelSlug'
import { storeRequestedModel, REQUESTED_MODEL_EVENT } from '../data/requestedModel'
import { GENERATED_BY_KEY, formatDisplayPrice } from '../data/modelDisplay'
import { AVAILABILITY_NOTE, LAST_RECORDED_PRICE_NOTE } from '../data/generatedStock'
import { MODEL_DETAILS } from '../data/generatedModelDetails'
import { whatsappModelLink } from '../data/contact'
import './ModelPage.css'

/**
 * صفحة موديل واحد — بياناتها حصرًا: الماركة والاسم والسعر المعروض بأسلوب الكتالوج نفسه
 * (المصدر/التوفر/علامة المراجعة عبر المنطق المشترك مع بطاقات الكتالوج) + المواصفات
 * والصور الحقيقية من الملف المُولَّد (تبويب DATA) لما تُطابَق، بلا أي بيانات مخترعة.
 * هاش غير معروف أو غير مكتمل => توجيه تام إلى #catalog (بلا تخمين وبلا صفحة فارغة).
 */
const DETAILS_BY_KEY = new Map(MODEL_DETAILS.map((d) => [`${d.brand}|${d.name}`, d]))

const NOTE_ALL = 'المواصفات والصور غير منشورة بعد — تُضاف حصرًا عند توفرها من المصدر المعتمد.'
const NOTE_SPECS = 'المواصفات غير منشورة بعد — تُضاف حصرًا عند توفرها من المصدر المعتمد.'
const NOTE_IMAGES = 'الصور غير منشورة بعد — تُضاف حصرًا عند توفرها من المصدر المعتمد.'

/** معرض خفيف: صورة رئيسية + تالية/سابقة + صور مصغرة؛ الصورة المكسورة تُستبعد بصمت */
function ModelGallery({ images, altBase }) {
  const [broken, setBroken] = useState(() => new Set())
  const [idx, setIdx] = useState(0)
  const usable = images.filter((_, i) => !broken.has(i))
  if (usable.length === 0) {
    // كل الصور فشل تحميلها الآن — رسالة صادقة بدل صورة مكسورة أو ادعاء توفر
    return <p className="model-page-note">تعذّر تحميل الصور الآن — أُعيد إرفاقها لاحقًا.</p>
  }
  const pos = idx % usable.length
  const src = usable[pos]
  const realIdx = images.indexOf(src)
  const markBroken = () => setBroken((prev) => new Set(prev).add(realIdx))
  const step = (dir) => setIdx((idx + dir + usable.length) % usable.length)
  return (
    <figure className="model-gallery" aria-label={`صور ${altBase}`}>
      <img
        className="model-gallery-main"
        src={src}
        alt={`${altBase} — صورة ${pos + 1}`}
        loading="lazy"
        decoding="async"
        onError={markBroken}
      />
      {usable.length > 1 && (
        <figcaption className="model-gallery-controls">
          <button type="button" onClick={() => step(-1)}>السابق</button>
          <span>{pos + 1} / {usable.length}</span>
          <button type="button" onClick={() => step(1)}>التالي</button>
        </figcaption>
      )}
      {usable.length > 1 && (
        <div className="model-gallery-thumbs">
          {usable.map((u) => (
            <button key={u} type="button" className={u === src ? 'is-current' : ''} onClick={() => setIdx(usable.indexOf(u))}>
              <img src={u} alt="" loading="lazy" decoding="async" onError={() => setBroken((prev) => new Set(prev).add(images.indexOf(u)))} />
            </button>
          ))}
        </div>
      )}
    </figure>
  )
}

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
  const details = DETAILS_BY_KEY.get(`${brand}|${model.name}`) || null
  const specs = details && details.specs.length > 0 ? details.specs : null
  const images = details && details.images && details.images.length > 0 ? details.images : null
  const albumUrl = details ? details.albumUrl : null
  // الرسالة الصادقة فقط: ما هو متوفر يُعرض، وما ينقص يُذكر بدقة (بدون ادعاء)
  const note = !specs && !images && !albumUrl ? NOTE_ALL : !specs ? NOTE_SPECS : !images && !albumUrl ? NOTE_IMAGES : null

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

          {images && <ModelGallery images={images} altBase={`${brand} ${model.name}`} />}
          {!images && albumUrl && (
            <a className="model-page-album" href={albumUrl} target="_blank" rel="noopener noreferrer">فتح ألبوم الصور</a>
          )}

          {specs && (
            <dl className="model-specs">
              {specs.map((s) => (
                <div key={`${s.label}|${s.value}`} className="model-spec-row">
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

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
            <a
              className="model-page-whatsapp"
              href={whatsappModelLink(model.name)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              استفسر عبر واتساب
            </a>
            <a href="#catalog" className="model-page-back">
              كل الموديلات
            </a>
          </div>

          {note && <p className="model-page-note">{note}</p>}
        </article>
      </div>
    </section>
  )
}

export default ModelPage
