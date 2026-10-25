import './CTA.css'

function CTA() {
  return (
    <section className="section cta" id="cta">
      <div className="container">
        <div className="cta-panel">
          <div className="cta-decor" aria-hidden="true" />
          <p className="cta-kicker">معاينة وتجربة قيادة</p>
          <h2 className="cta-title">جاهز لرحلتك؟ احجز معاينة دلوقتي</h2>
          <p className="cta-sub">
            جرّب نموذج الحجز في العرض: عند الضغط على إرسال تُرسل البيانات التي أدخلتها
            إلى ورقة Google المرتبطة بهذا المشروع التجريبي — بدون أي حجز أو موعد فعلي.
          </p>
          <div className="cta-actions">
            <a href="#book" className="btn btn-primary">احجز معاينة</a>
            <a href="#calc" className="btn btn-ghost cta-ghost">احسب أقساط الدفعات</a>
          </div>
          <p className="disclaimer">كل الأسعار والبيانات في هذا الموقع تجريبية لأغراض العرض فقط.</p>
        </div>
      </div>
    </section>
  )
}

export default CTA
