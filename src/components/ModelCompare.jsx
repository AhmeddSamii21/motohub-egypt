import { useEffect } from 'react'
import { storeRequestedModel, REQUESTED_MODEL_EVENT } from '../data/requestedModel'

/**
 * نافذة مقارنة الموديلات — تعرض الأعمدة جنبًا إلى جنب.
 * كل حقل معروض يأتي حرفيًا من CATALOG: الماركة، الاسم، السعر.
 */
function ModelCompare({ open, items, onClose, onRemove, onClear }) {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('compare-modal-open')
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('compare-modal-open')
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="compare-overlay">
      <div className="compare-modal" role="dialog" aria-modal="true" aria-labelledby="compare-title">
        <div className="compare-head">
          <h2 className="compare-title" id="compare-title">
            مقارنة الموديلات
            <span className="compare-title-count">{items.length}</span>
          </h2>
          <button type="button" className="compare-close" onClick={onClose} autoFocus>
            <span className="sr-only">إغلاق المقارنة</span>
            ×
          </button>
        </div>

        <div className={`compare-grid compare-grid-${items.length}`}>
          {items.map((item) => (
            <div className="compare-col" key={item.key}>
              <button
                type="button"
                className="compare-remove"
                onClick={() => onRemove(item.key)}
              >
                إزالة <span aria-hidden="true">×</span>
              </button>
              <p className="compare-col-brand">{item.brand}</p>
              <h3 className="compare-col-name">{item.name}</h3>
              <p className="compare-col-price">
                <b>{item.price}</b> <span>ج.م</span>
              </p>
              <a
                href="#book"
                className="btn btn-primary compare-col-cta"
                onClick={() => {
                  storeRequestedModel(item.name)
                  window.dispatchEvent(new CustomEvent(REQUESTED_MODEL_EVENT))
                  onClose()
                }}
              >
                احجز معاينة
              </a>
            </div>
          ))}
        </div>

        <div className="compare-foot">
          <button type="button" className="btn btn-ghost compare-clear" onClick={onClear}>
            مسح المقارنة
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModelCompare
