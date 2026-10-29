import { useEffect, useState } from 'react'
import { readFavorites, removeFavorite, FAVORITES_EVENT } from '../data/favoritesStore'
import { CATALOG } from '../data/catalog'
import { GENERATED_BY_KEY, formatDisplayPrice } from '../data/modelDisplay'
import { modelHref } from '../data/modelSlug'
import { AVAILABILITY_NOTE, LAST_RECORDED_PRICE_NOTE } from '../data/generatedStock'
import './Favorites.css'

/**
 * «المفضلة» — عرض قائمة الموديلات المفضَّلة من التخزين المحلي الدائم:
 * - القراءة عند كل تغيير عبر حدث المفضلة؛ البيانات من الكتالوج والمصدر المولَّد فقط
 *   (السعر بنفس منطق بطاقات الكتالوج، والتوفر بنفس القاعدتين المتاح/آخر سعر مسجل).
 * - بلا أي علاقة بالسلة أو الشراء: الإزالة هنا تُغيّر المفضلة فقط.
 * - قائمة فاضية ⇒ حالة فراغ صادقة مع رابط العودة للكتالوج.
 */

const NEEDS_REVIEW_TITLE = 'سعر مصدره قائمة قديمة — قيد المراجعة مع المصدر'

/** سعر الكتالوج المُجمَّد كخط احتياطي لو غاب سجل المولَّد — كما ورد حرفيًا بلا تنسيق إضافي */
const CATALOG_PRICE_BY_KEY = new Map()
for (const group of CATALOG) {
  if (!group || !Array.isArray(group.models)) continue
  for (const model of group.models) {
    if (model && typeof model.name === 'string') CATALOG_PRICE_BY_KEY.set(`${group.brand}|${model.name}`, model.price)
  }
}

function Favorites() {
  const [favorites, setFavorites] = useState(() => readFavorites())

  useEffect(() => {
    const refresh = () => setFavorites(readFavorites())
    window.addEventListener(FAVORITES_EVENT, refresh)
    return () => window.removeEventListener(FAVORITES_EVENT, refresh)
  }, [])

  return (
    <section className="section favorites" id="favorites-model">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">المفضلة</p>
          <h2 className="section-title">موديلاتك المفضَّلة</h2>
          <p className="section-sub">
            قائمة محفوظة على هذا الجهاز فقط — بلا حساب وبلا إرسال بيانات، وتبقى بعد إغلاق
            المتصفح. منفصلة تمامًا عن عربة الشراء.
          </p>
        </div>

        <div className="fav-panel">
          <p className="fav-count" aria-live="polite">
            {favorites.length === 0
              ? 'لا توجد موديلات في المفضلة بعد.'
              : `${favorites.length} موديل في المفضلة`}
          </p>

          {favorites.length === 0 ? (
            <div className="fav-empty">
              <p className="fav-empty-title">لم تُضِف أي موديل بعد</p>
              <p className="fav-empty-sub">
                اضغط أيقونة القلب ♥ على أي بطاقة موديل في الكتالوج أو صفحة الموديل لتظهر هنا.
              </p>
              <a className="btn btn-ghost fav-empty-link" href="#catalog">
                تصفّح الكتالوج
              </a>
            </div>
          ) : (
            <ul className="fav-grid">
              {favorites.map((item) => {
                const key = `${item.brand}|${item.name}`
                const info = GENERATED_BY_KEY.get(key)
                const needsReview = Boolean(info && info.needsReview)
                const availability = info && info.stockUnits > 0 ? AVAILABILITY_NOTE : LAST_RECORDED_PRICE_NOTE
                const priceDisplay = info
                  ? formatDisplayPrice(info.price, info.source)
                  : CATALOG_PRICE_BY_KEY.get(key) ?? ''
                return (
                  <li className="fav-card" key={key}>
                    <p className="fav-card-brand">{item.brand}</p>
                    <h4 className="fav-card-name">{item.name}</h4>
                    <p className="fav-card-price">
                      <b>{priceDisplay}</b> <span>ج.م</span>
                      {needsReview && (
                        <span className="catalog-card-review" title={NEEDS_REVIEW_TITLE}>
                          *
                        </span>
                      )}
                    </p>
                    <p className="fav-card-availability">{availability}</p>
                    <div className="fav-card-actions">
                      <a className="fav-card-link" href={modelHref(item.brand, item.name)}>
                        التفاصيل
                      </a>
                      <button
                        type="button"
                        className="fav-card-remove"
                        onClick={() => removeFavorite(item.brand, item.name)}
                        aria-label={`إزالة ${item.brand} ${item.name} من المفضلة`}
                      >
                        إزالة
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

export default Favorites
