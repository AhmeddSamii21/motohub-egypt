import './CTA.css'

function CTA() {
  return (
    <section className="section cta" id="cta">
      <div className="container">
        <div className="cta-panel">
          <div className="cta-decor" aria-hidden="true" />
          <p className="cta-kicker">معاينة وتجربة قيادة</p>
          <h2 className="cta-title">حاتز رحلتك؟ احجز معاينة دلوقتي</h2>
          <p className="cta-sub">
            سيب رقمك أو زور المعرض.. فريقنا هيوافيك ويحجزلك تجربة قيادة على الموديل اللي تختاره.
            (نموذج تجريبي — لا يتم إرسال أي بيانات فعليًا)
          </p>
          <div className="cta-actions">
            <a href="#book" className="btn btn-primary">احجز معاينة</a>
            <a href="#models" className="btn btn-ghost cta-ghost">استعرض الموديلات من جديد</a>
          </div>
          <p className="disclaimer">كل الأسعار والبيانات في هذا الموقع تجريبية لأغراض العرض فقط.</p>
        </div>
      </div>
    </section>
  )
}

export default CTA
