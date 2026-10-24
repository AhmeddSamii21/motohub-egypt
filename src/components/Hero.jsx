import { CATALOG } from '../data/catalog'
import './Hero.css'

// إحصائيات الـHero مشتقة ديناميكيًا من الكتالوج — تتحدث تلقائيًا لو تغيّرت البيانات
const TOTAL_MODELS = CATALOG.reduce((sum, group) => sum + group.models.length, 0)
const TOTAL_BRANDS = CATALOG.length

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
          تشكيلة متنوعة من الموتوسيكلات والسكوترات بمواصفات وسعر تقدرها بوضوح.
          الكتالوج مستخرج من قائمة أسعار 2026 — والمختارات المميزة تبقى بيانات توضيحية للعرض.
        </p>

        <div className="hero-actions">
          <a href="#models" className="btn btn-primary">شاهد الموديلات</a>
          <a href="#book" className="btn btn-ghost">احجز معاينة</a>
        </div>

        <dl className="hero-stats">
          <div>
            <dt>موديلات في الكتالوج</dt>
            <dd>{TOTAL_MODELS}</dd>
          </div>
          <div>
            <dt>ماركة في الكتالوج</dt>
            <dd>{TOTAL_BRANDS}</dd>
          </div>
          <div>
            <dt>كتالوج أسعار</dt>
            <dd>2026</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

export default Hero
