import { VERIFIED_OFFERS, hasVerifiedOffers } from '../data/offers'
import './OffersCenter.css'

/**
 * مركز العروض — يعرض فقط العروض المُتحقَّق منها من مصدر بيانات العروض
 * (offers.js — VERIFIED_OFFERS). حاليًا لا توجد عروض موثوقة في المشروع، فالحالة
 * هي فراغ صادق يوضح ذلك للعميل — بلا خصومات مُختلقة ولا عدّادات ولا حملات وهمية،
 * ولا استنتاج أي «خصم» من مقارنة أسعار قديمة/حديثة (لدينا صفحة تحديثات الأسعار
 * المخصصة لذلك في #updates، والتغيّر في سعر ليس عرضًا).
 */
function OffersCenter() {
  const hasOffers = hasVerifiedOffers()

  return (
    <section className="section offers" id="offers">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">العروض</p>
          <h2 className="section-title">عروض وأعمال مؤكَّدة من المعرض</h2>
          <p className="section-sub">
            نعرض هنا فقط العروض المؤكَّدة والموثقة من المعرض — بلا خصومات استرشادية ولا
            إعلانات مؤقتة غير صحيحة.
          </p>
        </div>

        {hasOffers ? (
          <ul className="offers-grid">
            {VERIFIED_OFFERS.map((offer) => (
              <li className="offers-card" key={offer.id}>
                <p className="offers-card-brand">{offer.brand}</p>
                <h3 className="offers-card-name">{offer.name}</h3>
                <p className="offers-card-details">{offer.details}</p>
                {(offer.validFrom || offer.validUntil) && (
                  <p className="offers-card-validity" dir="ltr">
                    {offer.validFrom ? `من ${offer.validFrom}` : ''}
                    {offer.validFrom && offer.validUntil ? ' — ' : ''}
                    {offer.validUntil ? `حتى ${offer.validUntil}` : ''}
                  </p>
                )}
                {offer.terms && <p className="offers-card-terms">{offer.terms}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="offers-empty" role="status">
            <p className="offers-empty-title">لا توجد عروض منشورة مؤكَّدة حاليًا</p>
            <p className="offers-empty-sub">
              لا نعرض خصومات أو أسعارًا ترويجية غير موثقة — عندما يوثّق المعرض عرضًا رسميًا
              ستظهر تفاصيله هنا كما هو تمامًا. الأسعار المعروضة في{' '}
              <a href="#catalog">الكتالوج</a> هي الأسعار المنشورة الحالية، وتحديثاتها الموثقة
              تظهر في <a href="#updates">صفحة تحديثات الأسعار</a>.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export default OffersCenter
