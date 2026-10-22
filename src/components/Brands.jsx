import { BRANDS } from '../data/content'
import './Brands.css'

function Brands() {
  return (
    <section className="section brands" id="brands">
      <div className="container">
        <div className="section-head brands-head">
          <p className="section-kicker">الماركات</p>
          <h2 className="section-title">ماركات داخل المعرض</h2>
          <p className="brands-note">أسماء العارضة تجريبية لأغراض العرض فقط ولا تعني أي ارتباط رسمي.</p>
        </div>

        <ul className="brands-list">
          {BRANDS.map((brand) => (
            <li className="brand-card" key={brand.id}>
              <span className="brand-name" lang="en" dir="ltr">
                {brand.name}
              </span>
              <span className="brand-belt" aria-hidden="true" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default Brands
