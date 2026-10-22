import './Hero.css'

function Hero() {
  return (
    <section className="hero">
      <div className="hero-backdrop" aria-hidden="true">
        <div className="hero-track hero-track-1" />
        <div className="hero-track hero-track-2" />
        <div className="hero-glow" />
      </div>

      <div className="container hero-inner">
        <p className="hero-kicker">معرض موتسيكلات وسكوترات — بورتفوليو خيالي</p>
        <h1 className="hero-title">
          اختار <span>رحلتك القادمة</span>
        </h1>
        <p className="hero-sub">
          تشكيلة متنوعة من الموتوسيكلات والسكوترات بمواصفات وسعر تقدره بوضوح.
          كل المعلومات والأسعار هنا تجريبية وتستخدم للعرض فقط.
        </p>

        <div className="hero-actions">
          <a href="#models" className="btn btn-primary">شاهد الموديلات</a>
          <a href="#book" className="btn btn-ghost">احجز معاينة</a>
        </div>

        <dl className="hero-stats">
          <div>
            <dt>موديلات معروضة</dt>
            <dd>+25</dd>
          </div>
          <div>
            <dt>ماركات</dt>
            <dd>5</dd>
          </div>
          <div>
            <dt>تجربة قيادة</dt>
            <dd>بداخل المعرض</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

export default Hero
