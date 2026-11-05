import { useEffect, useState } from 'react'
import {
  readRecentlyViewed,
  removeRecentlyViewed,
  clearRecentlyViewed,
  RECENTLY_VIEWED_EVENT,
} from '../data/recentlyViewedStore'
import { readFavorites, FAVORITES_EVENT } from '../data/favoritesStore'
import { readCompareKeys, COMPARE_EVENT } from '../data/compareStore'
import { CATALOG } from '../data/catalog'
import { GENERATED_BY_KEY, formatDisplayPrice } from '../data/modelDisplay'
import { modelHref } from '../data/modelSlug'
import { AVAILABILITY_NOTE, LAST_RECORDED_PRICE_NOTE } from '../data/generatedStock'
import './ContinueExploring.css'

/**
 * «واصل استكشافك» — قسم عودة على الصفحة الرئيسية يجمع: «شوهد مؤخرًا» (الحزمة B)
 * واختصارات: المفضلة / المقارنة / دليل الشراء / الكتالوج (الحزمة D).
 * كل شيء من المخازن المحلية القائمة (لا تكرار أنظمة) وبلا أي بيانات شخصية أو تتبع.
 */

const NEEDS_REVIEW_TITLE = 'سعر مصدره قائمة قديمة — قيد المراجعة مع المصدر'

/** سعر الكتالوج المُجمَّد كخط احتياطي لو غاب سجل المولَّد — كما ورد حرفيًا */
const CATALOG_PRICE_BY_KEY = new Map()
for (const group of CATALOG) {
  if (!group || !Array.isArray(group.models)) continue
  for (const model of group.models) {
    if (model && typeof model.name === 'string') CATALOG_PRICE_BY_KEY.set(`${group.brand}|${model.name}`, model.price)
  }
}

function ContinueExploring() {
  const [recent, setRecent] = useState(() => readRecentlyViewed())
  const [favCount, setFavCount] = useState(() => readFavorites().length)
  const [compareCount, setCompareCount] = useState(() => readCompareKeys().length)
  // تأكيد التفريغ في خطوتين — لا تفريغ بخطوة واحدة
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    const refreshRecent = () => setRecent(readRecentlyViewed())
    const refreshFav = () => setFavCount(readFavorites().length)
    const refreshCompare = () => setCompareCount(readCompareKeys().length)
    window.addEventListener(RECENTLY_VIEWED_EVENT, refreshRecent)
    window.addEventListener(FAVORITES_EVENT, refreshFav)
    window.addEventListener(COMPARE_EVENT, refreshCompare)
    return () => {
      window.removeEventListener(RECENTLY_VIEWED_EVENT, refreshRecent)
      window.removeEventListener(FAVORITES_EVENT, refreshFav)
      window.removeEventListener(COMPARE_EVENT, refreshCompare)
    }
  }, [])

  const clearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      window.setTimeout(() => setConfirmClear(false), 3500)
      return
    }
    clearRecentlyViewed()
    setConfirmClear(false)
  }

  return (
    <section className="section rx" id="continue-exploring" aria-label="واصل استكشافك">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">واصل استكشافك</p>
          <h2 className="section-title">من حيث توقفت</h2>
          <p className="section-sub">
            الموديلات التي فتحت تفاصيلها مؤخرًا ومختصراتك المحفوظة — كلها على هذا الجهاز فقط،
            بلا حساب وبلا تتبع.
          </p>
        </div>

        <div className="rx-panel">
          {/* —— شوهد مؤخرًا —— */}
          <div className="rx-recent" aria-label="شوهد مؤخرًا">
            <div className="rx-recent-head">
              <h3 className="rx-recent-title">شوهد مؤخرًا</h3>
              {recent.length > 0 && (
                <button
                  type="button"
                  className={`rx-clear ${confirmClear ? 'is-confirm' : ''}`}
                  onClick={clearAll}
                  title={confirmClear ? 'اضغط مرة أخرى للتأكيد' : 'تفريغ السجل بالكامل'}
                >
                  {confirmClear ? 'اضغط مرة أخرى للتأكيد' : 'تفريغ السجل'}
                </button>
              )}
            </div>

            {recent.length === 0 ? (
              <div className="rx-empty">
                <p className="rx-empty-title">لم تفتح أي موديل بعد</p>
                <p className="rx-empty-sub">
                  افتح تفاصيل أي موديل من الكتالوج لتظهر هنا وتواصل استكشافك لاحقًا من نفس النقطة.
                </p>
                <a className="btn btn-ghost rx-empty-link" href="#catalog">
                  تصفّح الكتالوج
                </a>
              </div>
            ) : (
              <>
                <p className="rx-count" aria-live="polite">
                  آخر {recent.length} من أصل 10 موديلًا بحد أقصى
                </p>
                <ul className="rx-grid">
                  {recent.map((item) => {
                    const key = `${item.brand}|${item.name}`
                    const info = GENERATED_BY_KEY.get(key)
                    const needsReview = Boolean(info && info.needsReview)
                    const availability = info && info.stockUnits > 0 ? AVAILABILITY_NOTE : LAST_RECORDED_PRICE_NOTE
                    const priceDisplay = info
                      ? formatDisplayPrice(info.price, info.source)
                      : CATALOG_PRICE_BY_KEY.get(key) ?? ''
                    return (
                      <li className="rx-card" key={key}>
                        <p className="rx-card-brand">{item.brand}</p>
                        <h4 className="rx-card-name">{item.name}</h4>
                        <p className="rx-card-price">
                          <b>{priceDisplay}</b> <span>ج.م</span>
                          {needsReview && (
                            <span className="catalog-card-review" title={NEEDS_REVIEW_TITLE}>
                              *
                            </span>
                          )}
                        </p>
                        <p className="rx-card-availability">{availability}</p>
                        <div className="rx-card-actions">
                          <a className="rx-card-link" href={modelHref(item.brand, item.name)}>
                            التفاصيل
                          </a>
                          <button
                            type="button"
                            className="rx-card-remove"
                            onClick={() => removeRecentlyViewed(item.brand, item.name)}
                            aria-label={`إزالة ${item.brand} ${item.name} من شوهد مؤخرًا`}
                          >
                            إزالة
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>

          {/* —— اختصارات العودة —— */}
          <nav className="rx-shortcuts" aria-label="مختصرات العودة">
            <h3 className="rx-recent-title">اختصارات</h3>
            <ul className="rx-shortcut-list">
              <li>
                <a className="rx-shortcut" href="#favorites">
                  <span className="rx-shortcut-label">المفضلة</span>
                  <span className="rx-shortcut-meta">
                    {favCount > 0 ? `${favCount} موديل محفوظ` : 'فاضية — أضف بحرف ♥'}
                  </span>
                </a>
              </li>
              <li>
                <a className="rx-shortcut" href="#compare">
                  <span className="rx-shortcut-label">صفحة المقارنة</span>
                  <span className="rx-shortcut-meta">
                    {compareCount > 0 ? `${compareCount} موديل في المقارنة` : 'اختر حتى 3 موديلات'}
                  </span>
                </a>
              </li>
              <li>
                <a className="rx-shortcut" href="#guide">
                  <span className="rx-shortcut-label">دليل الشراء والمساعدة</span>
                  <span className="rx-shortcut-meta">شرح الخيارات والأسعار والرحلة</span>
                </a>
              </li>
              <li>
                <a className="rx-shortcut" href="#catalog">
                  <span className="rx-shortcut-label">الكتالوج</span>
                  <span className="rx-shortcut-meta">بحث وفلاتر وكل الموديلات</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </section>
  )
}

export default ContinueExploring
