import { useEffect, useState } from 'react'
import { 
  readShortlistKeys, 
  toggleShortlistKey, 
  clearShortlistKeys,
  encodeShortlistForUrl,
  getShortlistModels,
  SHORTLIST_EVENT,
  SHORTLIST_LIMIT
} from '../data/shortlistStore'
import { GENERATED_BY_KEY, formatDisplayPrice } from '../data/modelDisplay'
import { AVAILABILITY_NOTE, LAST_RECORDED_PRICE_NOTE } from '../data/generatedStock'
import './ShortlistShare.css'

/**
 * مكون لعرض وإدارة القائمة القابلة للمشاركة
 * - يعرض الموديلات المختارة
 * - يسمح بإضافة/إزالة الموديلات
 - يوصل مشاركة القائمة عبر رابط واحد
 */
function ShortlistShare() {
  const [keys, setKeys] = useState(readShortlistKeys())
  // رابط المشاركة مشتق مباشرة من المفاتيح عند كل رندر — بلا حالة ولا أثر جانبي إضافي
  const encodedKeys = keys.length > 0 ? encodeShortlistForUrl(keys) : ''
  const shareUrl = encodedKeys ? `${window.location.origin}${window.location.pathname}#shared/${encodedKeys}` : ''
  const [shareFailed, setShareFailed] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [showConfirmClear, setShowConfirmClear] = useState(false)

  // تحديث القائمة عند التغييرات في التخزين
  useEffect(() => {
    const refresh = () => setKeys(readShortlistKeys())
    window.addEventListener(SHORTLIST_EVENT, refresh)
    return () => window.removeEventListener(SHORTLIST_EVENT, refresh)
  }, [])

  const toggleModel = (key) => {
    toggleShortlistKey(key)
  }

  const handleClear = () => {
    if (showConfirmClear) {
      clearShortlistKeys()
      setShowConfirmClear(false)
    } else {
      setShowConfirmClear(true)
      // إعادة تعيين تأكيد المسح بعد ثانيتين
      setTimeout(() => setShowConfirmClear(false), 2000)
    }
  }

  const copyLink = () => {
    if (!shareUrl) return
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareMsg('تم نسخ الرابط ✓')
      setShareFailed(false)
      window.setTimeout(() => setShareMsg(''), 2000)
    }).catch(() => {
      setShareFailed(true)
      setShareMsg('تعذّر نسخ الرابط')
    })
  }

  const shareShortlist = () => {
    if (!shareUrl) return
    
    // بعد فشل حقيقي: الزر يصبح «نسخ الرابط» — النسخ اختيار صريح من المستخدم
    if (shareFailed) {
      copyLink()
      return
    }
    
    const title = 'قائمة موديلات MotoHub Egypt'
    const text = `قائمة موديلات MotoHub Egypt المختارة`
    
    // Try native sharing first
    if (navigator.share) {
      navigator.share({
        title: title,
        text: text,
        url: shareUrl
      }).then(() => {
        // مشاركة أصلية ناجحة — رسالة مشاركة لا رسالة نسخ
        setShareFailed(false)
        setShareMsg('تمت المشاركة ✓')
        window.setTimeout(() => setShareMsg(''), 2000)
      }).catch((error) => {
        // إلغاء المستخدم (AbortError): بلا نسخ وبلا رسالة وبلا خطأ
        if (error && error.name === 'AbortError') return
        // فشل حقيقي: رسالة فاشلة صادقة، وبلا نسخ تلقائي — النسخ بقرار المستخدم
        setShareFailed(true)
        setShareMsg('تعذّرت المشاركة — يمكنك نسخ الرابط')
      })
    } else {
      // لا مشاركة أصلية: نسخ إلى الحافظة (البديل القائم) مع رسالة صادقة
      copyLink()
    }
  }

  const models = getShortlistModels(keys)

  if (models.length === 0) {
    return (
      <div className="shortlist-share">
        <h2>قائمة الموديلات القابلة للمشاركة</h2>
        <p>لا يوجد موديلات في القائمة بعد.</p>
        <p>
          من صفحة <a href="#catalog">الكتالوج</a>، يمكنك اختيار الموديلات التي تريد مشاركتها.
        </p>
      </div>
    )
  }

  return (
    <div className="shortlist-share">
      <h2>قائمة الموديلات القابلة للمشاركة</h2>
      <p className="shortlist-count">اخترت {models.length} موديل{models.length > 1 ? 'ات' : ''} (الحد الأقصى {SHORTLIST_LIMIT})</p>
      
      <div className="shortlist-models">
        {models.map((model) => {
          const info = GENERATED_BY_KEY.get(model.key)
          const availability = info && info.stockUnits > 0 ? AVAILABILITY_NOTE : LAST_RECORDED_PRICE_NOTE
          
          return (
            <div key={model.key} className="shortlist-model">
              <div className="shortlist-model-info">
                <h3>{model.brand} {model.name}</h3>
                <p className="shortlist-model-price">
                  <b>{formatDisplayPrice(info ? info.price : model.price, info && info.source)}</b> <span>ج.م</span>
                </p>
                <p className="shortlist-model-availability">{availability}</p>
              </div>
              <button
                type="button"
                className="shortlist-model-remove"
                onClick={() => toggleModel(model.key)}
                aria-label={`إزالة ${model.brand} ${model.name} من القائمة`}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      <div className="shortlist-actions">
        <button
          type="button"
          className={`btn btn-primary ${shareFailed ? 'show-copy' : ''}`}
          onClick={shareShortlist}
        >
          {shareFailed ? 'نسخ الرابط' : 'شارك القائمة'}
        </button>
        
        {shareUrl && (
          <div className="shortlist-share-url">
            <input 
              type="text" 
              value={shareUrl} 
              readOnly 
              onClick={(e) => e.target.select()}
              aria-label="رابط المشاركة"
            />
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={copyLink}
              aria-label="نسخ الرابط"
            >
              نسخ
            </button>
          </div>
        )}
        
        {shareMsg && (
          <div className={`shortlist-message ${shareFailed ? 'error' : 'success'}`}>
            {shareMsg}
          </div>
        )}
      </div>

      <div className="shortlist-clear">
        <button
          type="button"
          className={`btn ${showConfirmClear ? 'btn-danger confirm' : 'btn-ghost'}`}
          onClick={handleClear}
        >
          {showConfirmClear ? 'تأكيد المسح' : 'مسح القائمة'}
        </button>
        {showConfirmClear && !shareFailed && (
          <p className="shortlist-confirm">اضغط مرة أخرى للتأكيد</p>
        )}
      </div>
    </div>
  )
}

export default ShortlistShare