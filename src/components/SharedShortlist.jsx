import { useEffect, useState } from 'react'
import { decodeShortlistFromUrl } from '../data/shortlistStore'
import { modelHref } from '../data/modelSlug'
import { GENERATED_BY_KEY, formatDisplayPrice } from '../data/modelDisplay'
import { AVAILABILITY_NOTE, LAST_RECORDED_PRICE_NOTE } from '../data/generatedStock'
import { CATALOG } from '../data/catalog'
import './SharedShortlist.css'

/**
 * صفحة لعرض القائمة المشاركة - تستقبل معرّف مشفر من الرابط
 * - تعرض الموديلات الموجودة في القائمة
 * - تتعامل مع الموديلات غير الموجودة أو المعطوبة
 * - توفر روابط للعودة إلى الكتالوج
 * كل حالة مشتقة من الرابط لحظة الرندر (بلا تحميل ولا أخطاء كحالة منفصلة)
 */

/** مفاتيح الكتالوج الصالحة — تُبنى مرة واحدة */
const ALL_CATALOG_KEYS = new Set()
for (const group of CATALOG) {
  if (!group || !Array.isArray(group.models)) continue
  for (const model of group.models) {
    if (model && typeof model.name === 'string') ALL_CATALOG_KEYS.add(`${group.brand}|${model.name}`)
  }
}

function SharedShortlist() {
  // استخراج المعرف المشفر من الرابط — القيمة الابتدائية من الهاز الحالي،
  // والتحديث عند التنقل بين روابط مشاركة متعددة في نفس التبويب عبر hashchange
  const readSharedHash = () => {
    const match = window.location.hash.match(/^#shared\/(.+)$/)
    return match && match[1] ? match[1] : ''
  }
  const [encoded, setEncoded] = useState(readSharedHash)

  useEffect(() => {
    const onHashChange = () => setEncoded(readSharedHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // الحالة مشتقة من الرابط: بلا مسار أو فك ترميز فاشل/فاضي ⇒ رابط غير صالح
  const hasRoute = encoded !== ''
  const keys = hasRoute ? decodeShortlistFromUrl(encoded) : []
  const invalidLink = hasRoute && keys.length === 0

  // الموديلات الصالحة + المفقودة مشتقة من الكتالوج المجمد — بلا افتراضات
  const models = []
  if (keys.length > 0) {
    for (const group of CATALOG) {
      if (!group || !Array.isArray(group.models)) continue
      for (const model of group.models) {
        if (!model || typeof model.name !== 'string') continue
        if (keys.includes(`${group.brand}|${model.name}`)) {
          models.push({
            brand: group.brand,
            name: model.name,
            key: `${group.brand}|${model.name}`,
            price: model.price,
          })
        }
      }
    }
  }
  const missingCount = keys.filter((key) => !ALL_CATALOG_KEYS.has(key)).length

  if (!hasRoute || invalidLink) {
    return (
      <div className="shared-shortlist error">
        <div className="container">
          <h1>قائمة الموديلات المشاركة</h1>
          <div className="error-message">
            <p>رابط غير صالح أو معطوب.</p>
            <p>تأكد من الرابط أو اطلب من الشخص المشارك رابطًا جديدًا.</p>
            <a href="#catalog" className="btn btn-primary">العودة إلى الكتالوج</a>
          </div>
        </div>
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <div className="shared-shortlist empty">
        <div className="container">
          <h1>قائمة الموديلات المشاركة</h1>
          <div className="empty-message">
            <p>لا توجد موديلات صالحة في هذه القائمة.</p>
            <p>قد تكون الموديلات محذوفة من الكتالوج أو الرابط معطوب.</p>
            <a href="#catalog" className="btn btn-primary">العودة إلى الكتالوج</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="shared-shortlist">
      <div className="container">
        <h1>قائمة موديلات MotoHub Egypt المشاركة</h1>

        {missingCount > 0 && (
          <div className="missing-models-warning">
            <p>⚠️ {missingCount} موديل{missingCount > 1 ? 'ات' : ''} غير متوف{missingCount > 1 ? 'رة' : 'ر'} حاليًا في الكتالوج</p>
            <p>قد تكون هذه الموديلات محذوفة أو غير متوفرة مؤقتًا</p>
          </div>
        )}

        <div className="shared-models">
          {models.map((model) => {
            const info = GENERATED_BY_KEY.get(model.key)
            const availability = info && info.stockUnits > 0 ? AVAILABILITY_NOTE : LAST_RECORDED_PRICE_NOTE

            return (
              <div key={model.key} className="shared-model">
                <a
                  href={modelHref(model.brand, model.name)}
                  className="shared-model-link"
                  aria-label={`تفاصيل ${model.brand} ${model.name}`}
                >
                  <div className="shared-model-image">
                    {/* صورة افتراضية - سيتم استبدالها بالصور الحقيقية عند توفرها */}
                    <div className="model-placeholder">
                      <span>{model.brand.charAt(0)}</span>
                    </div>
                  </div>
                  <div className="shared-model-info">
                    <h3>{model.brand} {model.name}</h3>
                    <p className="shared-model-price">
                      <b>{formatDisplayPrice(info ? info.price : model.price, info && info.source)}</b> <span>ج.م</span>
                    </p>
                    <p className="shared-model-availability">{availability}</p>
                  </div>
                </a>
              </div>
            )
          })}
        </div>

        <div className="shared-shortlist-footer">
          <div className="shortlist-actions">
            <a href="#catalog" className="btn btn-primary">تصفح الكتالوج الكامل</a>
            <a href="#finder" className="btn btn-secondary">ابحث عن موديل مناسب</a>
          </div>
          <p className="shortlist-note">
            هذه القائمة مشاركة من MotoHub Egypt — جميع البيانات تعتمد على الكتالوج الحالي
          </p>
        </div>
      </div>
    </div>
  )
}

export default SharedShortlist