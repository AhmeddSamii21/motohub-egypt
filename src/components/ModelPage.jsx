import { useEffect, useState } from 'react'
import { resolveModelUrl } from '../data/modelSlug'
import { storeRequestedModel, REQUESTED_MODEL_EVENT } from '../data/requestedModel'
import { addItem } from '../data/cartStore'
import { isFavorite, toggleFavorite, FAVORITES_EVENT } from '../data/favoritesStore'
import { GENERATED_BY_KEY, formatDisplayPrice } from '../data/modelDisplay'
import { AVAILABILITY_NOTE, LAST_RECORDED_PRICE_NOTE } from '../data/generatedStock'
import { MODEL_DETAILS } from '../data/generatedModelDetails'
import { groupSpecsForDisplay } from '../data/specGroups.js'
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
const NOTE_COLORS = 'الألوان غير موثقة في مصدر البيانات الحالي — يُرجى تأكيد الألوان المتاحة مع المعرض.'

/** عرض مكبَّر (lightbox): صورة واحدة بالحجم الكامل مع تنقل وإغلاق بـ Escape/الخلفية */
function ModelLightbox({ images, index, onClose, onStep }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') onStep(-1)
      if (event.key === 'ArrowRight') onStep(1)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, onStep])

  return (
    <div className="model-lightbox" role="dialog" aria-modal="true" aria-label="عرض الصورة مكبَّرة" onClick={onClose}>
      <div className="model-lightbox-inner" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="model-lightbox-close" onClick={onClose} aria-label="إغلاق العرض المكبَّر">
          ×
        </button>
        <img src={images[index]} alt={`صورة ${index + 1} مكبَّرة`} />
        {images.length > 1 && (
          <div className="model-lightbox-controls">
            <button type="button" onClick={() => onStep(-1)} aria-label="الصورة السابقة">السابق</button>
            <span>{index + 1} / {images.length}</span>
            <button type="button" onClick={() => onStep(1)} aria-label="الصورة التالية">التالي</button>
          </div>
        )}
      </div>
    </div>
  )
}

/** معرض خفيف: صورة رئيسية + تالية/سابقة + صور مصغرة + عرض مكبَّر؛ الصورة المكسورة تُستبعد بصمت */
function ModelGallery({ images, altBase }) {
  const [broken, setBroken] = useState(() => new Set())
  const [idx, setIdx] = useState(0)
  const [zoom, setZoom] = useState(false)
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
      <button
        type="button"
        className="model-gallery-mainbtn"
        onClick={() => setZoom(true)}
        aria-label="تكبير الصورة"
      >
        <img
          className="model-gallery-main"
          src={src}
          alt={`${altBase} — صورة ${pos + 1}`}
          loading="lazy"
          decoding="async"
          onError={markBroken}
        />
        <span className="model-gallery-zoomhint" aria-hidden="true">تكبير ⤢</span>
      </button>
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
      {zoom && (
        <ModelLightbox
          images={usable}
          index={pos}
          onClose={() => setZoom(false)}
          onStep={step}
        />
      )}
    </figure>
  )
}

function ModelPage() {
  const [hash, setHash] = useState(() => window.location.hash)
  // تأكيد قصير بعد الإضافة إلى السلة (لا يغيّر أي سلوك قائم الحجز/الواتساب)
  const [justAdded, setJustAdded] = useState(false)
  // مشاركة رابط الموديل (نفس بنية التوجيه #/m/…) — نسخ إلى الحافظة مع بديل آمن
  const [shareCopied, setShareCopied] = useState(false)
  const shareModel = () => {
    const url = window.location.href
    const done = () => {
      setShareCopied(true)
      window.setTimeout(() => setShareCopied(false), 2000)
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, () => done())
    } else {
      done() // بديل صادق: تأكيد النسخ فقط عند توفر الحافظة، وإلا نُظهر أن الرابط هو نفسه الهاش الحالي
    }
  }
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const resolved = resolveModelUrl(hash)

  // المفضلة: قيمة مشتقة من لقطة التخزين الدائم — تُعاد القراءة فورًا عند تغيّر الموديل
  // المعروض (البطاقات تبقى مُركَّبة بين التنقّلات) وعند أي حدث مفضلة، بلا أي مساس بالسلة.
  const favBrand = resolved ? resolved.brand : null
  const favName = resolved ? resolved.model.name : null
  const favKey = favBrand && favName ? `${favBrand}|${favName}` : null
  const [favSnapshot, setFavSnapshot] = useState(() => ({
    key: favKey,
    value: favBrand && favName ? isFavorite(favBrand, favName) : false,
  }))
  // موديل مختلف عن اللقطة ⇒ قراءة جديدة من التخزين أثناء الرندر (قراءة حتمية آمنة)
  const fav =
    favSnapshot.key === favKey
      ? favSnapshot.value
      : favBrand && favName
        ? isFavorite(favBrand, favName)
        : false
  useEffect(() => {
    const refresh = () =>
      setFavSnapshot({
        key: favKey,
        value: favBrand && favName ? isFavorite(favBrand, favName) : false,
      })
    window.addEventListener(FAVORITES_EVENT, refresh)
    return () => window.removeEventListener(FAVORITES_EVENT, refresh)
  }, [favBrand, favName, favKey])
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
            <div className="model-spec-groups">
              {groupSpecsForDisplay(specs).map((group) => (
                <section key={group.id} className="model-spec-group" aria-label={group.title}>
                  <h3 className="model-spec-group-title">{group.title}</h3>
                  <dl className="model-specs">
                    {group.entries.map((entry) => (
                      <div key={`${entry.label}|${entry.value}`} className="model-spec-row">
                        <dt>{entry.label}</dt>
                        <dd>{entry.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
              <p className="model-spec-missing">
                المواصفات غير المدرجة أعلاه غير منشورة في المصدر — تُعرض «غير متاح» ولا تُخترع.
              </p>
            </div>
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
            <button
              type="button"
              className="catalog-card-cta model-page-cart-cta"
              onClick={() => {
                addItem(brand, model.name)
                setJustAdded(true)
                window.setTimeout(() => setJustAdded(false), 1800)
              }}
            >
              {justAdded ? 'تمت الإضافة ✓' : 'أضف إلى السلة'}
            </button>
            <button
              type="button"
              className={`model-page-fav-cta ${fav ? 'is-active' : ''}`}
              aria-pressed={fav}
              title={fav ? 'في المفضلة' : 'أضف إلى المفضلة'}
              onClick={() => {
                if (resolved) toggleFavorite(resolved.brand, resolved.model.name)
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill={fav ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
              </svg>
              {fav ? 'في المفضلة' : 'أضف إلى المفضلة'}
            </button>
            <button
              type="button"
              className="model-page-share"
              onClick={shareModel}
              title="نسخ رابط هذا الموديل لمشاركته"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
              </svg>
              {shareCopied ? 'تم نسخ الرابط ✓' : 'شارك الموديل'}
            </button>
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

          {/* الألوان: لا بيانات ألوان موثقة في المصدر (Stock يسجل لون لكل وحدة فعلية فقط،
              ولا صور مخصصة للألوان) — نُشير بصدق إلى الحاجة للتأكيد بلا اختراع ألوان. */}
          <p className="model-page-note">{NOTE_COLORS}</p>
          {note && <p className="model-page-note">{note}</p>}
        </article>
      </div>
    </section>
  )
}

export default ModelPage
