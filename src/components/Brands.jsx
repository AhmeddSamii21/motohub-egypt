import { BRANDS } from '../data/content'
import { CATALOG } from '../data/catalog'
import './Brands.css'

// للتصنيف/المقارنة الرقمية فقط: نزلّ الفواصل، أما العرض فيبقى بنص السعر الأصلي كما ورد
const parsePrice = (price) => Number(String(price).replace(/,/g, ''))

/**
 * إحصاءات كل ماركة مشتقّة ديناميكيًا من الكتالوج المحقَّق (82 موديل / 19 ماركة):
 * عدد الموديلات المُصدَّرة + أرخص سعر مُدرَج (نعرض النص الأصلي حرفيًا).
 */
function buildBrandStats() {
  const stats = new Map()
  for (const group of CATALOG) {
    let minModel = null
    for (const model of group.models) {
      if (minModel === null || parsePrice(model.price) < parsePrice(minModel.price)) minModel = model
    }
    stats.set(group.brand, { count: group.models.length, minPrice: minModel.price })
  }
  return stats
}

function Brands() {
  const stats = buildBrandStats()

  return (
    <section className="section brands" id="brands">
      <div className="container">
        <div className="section-head brands-head">
          <p className="section-kicker">الماركات</p>
          <h2 className="section-title">ماركات داخل المعرض</h2>
          <p className="brands-note">أسماء الماركات كما وردت في قائمة أسعار 2026 — دون أي ارتباط رسمي بعلامات تجارية.</p>
        </div>

        <ul className="brands-list">
          {BRANDS.map((brand) => {
            const stat = stats.get(brand.name)
            return (
              <li className="brand-card" key={brand.id}>
                <span className="brand-name" lang="en" dir="ltr">
                  {brand.name}
                </span>
                {stat && (
                  <span className="brand-stats">
                    <span className="brand-count">عدد الموديلات: {stat.count}</span>
                    <span className="brand-from">
                      أسعار الموديلات تبدأ من <b>{stat.minPrice}</b> ج.م
                    </span>
                  </span>
                )}
                <span className="brand-belt" aria-hidden="true" />
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export default Brands
