import { useMemo, useState } from 'react'
import {
  GUIDE_SECTIONS,
  JOURNEY_STEPS,
  TRUST_POINTS,
  FAQS,
  FAQ_CATEGORIES,
  searchFaqs,
  GUIDE_META,
} from '../data/buyingGuide'
import { WHATSAPP_NUMBER } from '../data/contact'
import './BuyingGuide.css'

/**
 * «دليل الشراء والمساعدة» (#guide) — صفحة واحدة من ثلاثة أقسام:
 * دليل الشراء (إرشاد عام)، رحلة الشراء ونقاط الثقة (ما يفعله الموقع فعليًا وحدوده)،
 * والمساعدة/FAQ قابل للبحث والتصنيف. كل النصوص من data/buyingGuide.js الموثقة،
 * والتواصل عبر واتساب المعرض المعتمد فقط — بلا وعود تأكيد أو دفع أو ضمان.
 */
function BuyingGuide() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')

  // مشتق بالكامل من المدخلات — بلا تأثيرات جانبية
  const visibleFaqs = useMemo(() => {
    const base = category ? searchFaqs(query).filter((f) => f.category === category) : searchFaqs(query)
    return base
  }, [query, category])

  return (
    <section className="section guide" id="guide-top">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">دليل الشراء</p>
          <h2 className="section-title">دليل الشراء والمساعدة</h2>
          <p className="section-sub">
            شرح مبسّط لقرار شراء الموتوسيكل، ولمسار الشراء الفعلي على الموقع وما لا يوفره —
            مبني على {GUIDE_META.MODEL_COUNT} موديلًا من {GUIDE_META.BRAND_COUNT} ماركة بمصادر
            معتمدة، وبلا وعود حجز أو دفع أو توفر.
          </p>
        </div>

        <p className="guide-note" role="note">
          الموقع بورتفوليو تجريبي للعرض فقط: كل البيانات من المصادر المرفقة ولا نرى أنفسنا
          وكيلًا معتمدًا — التأكيد النهائي مع المعرض عبر القنوات المعتمدة أدناه.
        </p>

        {/* ==== أ. دليل الشراء ==== */}
        <h3 className="guide-group-title">أولًا: دليل الشراء</h3>
        <ul className="guide-sections">
          {GUIDE_SECTIONS.map((section) => (
            <li className="guide-card" key={section.id}>
              <h4 className="guide-card-title">{section.title}</h4>
              <ul className="guide-card-body">
                {section.body.map((line, i) => (
                  <li key={line.slice(0, 24) + i}>{line}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        {/* ==== ج. رحلة الشراء ==== */}
        <h3 className="guide-group-title">رحلة الشراء على الموقع</h3>
        <ol className="guide-journey">
          {JOURNEY_STEPS.map((step, index) => (
            <li className="guide-step" key={step.id}>
              <span className="guide-step-num" aria-hidden="true">{index + 1}</span>
              <div>
                <h4 className="guide-step-title">{step.title}</h4>
                <p className="guide-step-body">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* ==== ج. نقاط الثقة ==== */}
        <h3 className="guide-group-title">معلومات الثقة وحدود الموقع</h3>
        <ul className="guide-trust">
          {TRUST_POINTS.map((point) => (
            <li className="guide-card" key={point.title}>
              <h4 className="guide-card-title">{point.title}</h4>
              <p className="guide-card-p">{point.body}</p>
            </li>
          ))}
        </ul>

        {/* ==== التواصل المعتمد ==== */}
        <div className="guide-contact">
          <p className="guide-card-title">لتأكيد التوفر والسعر النهائي والسياسات</p>
          <div className="guide-contact-actions">
            <a
              className="btn btn-ghost guide-contact-link"
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span aria-hidden="true">💬</span>
              واتساب المعرض <span dir="ltr">{WHATSAPP_NUMBER}</span>
            </a>
            <a className="btn btn-primary" href="#book">حجز معاينة</a>
            <a className="btn btn-ghost" href="#showroom">عن المعرض</a>
          </div>
        </div>

        {/* ==== ب. المساعدة / الأسئلة الشائعة ==== */}
        <h3 className="guide-group-title guide-faq-title">المساعدة — الأسئلة الشائعة</h3>
        <div className="guide-faq">
          <div className="guide-faq-tools">
            <input
              type="search"
              className="guide-faq-search"
              placeholder="ابحث في الأسئلة الشائعة…"
              aria-label="البحث في الأسئلة الشائعة"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="guide-faq-chips" role="group" aria-label="تصفية حسب التصنيف">
              <button
                type="button"
                className={`guide-faq-chip ${category === '' ? 'is-active' : ''}`}
                aria-pressed={category === ''}
                onClick={() => setCategory('')}
              >
                الكل ({FAQS.length})
              </button>
              {FAQ_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`guide-faq-chip ${category === cat ? 'is-active' : ''}`}
                  aria-pressed={category === cat}
                  onClick={() => setCategory(category === cat ? '' : cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <p className="guide-faq-count" aria-live="polite">
            {visibleFaqs.length === FAQS.length
              ? `كل الأسئلة (${FAQS.length})`
              : `${visibleFaqs.length} سؤالًا مطابقًا`}
          </p>

          {visibleFaqs.length === 0 ? (
            <div className="guide-faq-empty">
              <p className="guide-faq-empty-title">لا توجد أسئلة مطابقة لبحثك</p>
              <p className="guide-faq-empty-sub">
                جرّب كلمة أقصر أو تصنيفًا آخر — أو اسأل المعرض مباشرة عبر واتساب.
              </p>
            </div>
          ) : (
            <ul className="guide-faq-list">
              {visibleFaqs.map((faq) => (
                <li className="guide-faq-item" key={faq.id}>
                  <details name="motohub-faq" className="guide-faq-details">
                    <summary className="guide-faq-q">
                      <span className="guide-faq-cat" aria-hidden="true">{faq.category}</span>
                      {faq.q}
                    </summary>
                    <p className="guide-faq-a">{faq.a}</p>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

export default BuyingGuide
