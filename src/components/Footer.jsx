import './Footer.css'

function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">
            MotoHub <em>Egypt</em>
          </span>
          <p className="footer-note">
            موقع بورتفوليو خيالي لأغراض العرض فقط. لا علاقة رسمية بأي علامة تجارية ولا نقدم
            أنفسنا كوكيل معتمد. الأسعار والبيانات تجريبية.
          </p>
        </div>

        <nav aria-label="روابط سريعة" className="footer-col">
          <h3>روابط سريعة</h3>
          <ul>
            <li><a href="#home">الرئيسية</a></li>
            <li><a href="#brands">الماركات</a></li>
            <li><a href="#models">الموديلات</a></li>
            <li><a href="#book">احجز معاينة</a></li>
          </ul>
        </nav>

        <div className="footer-col">
          <h3>تواصل</h3>
          <ul>
            <li><span aria-hidden="true">📍</span> القاهرة — مناطق تجريبية</li>
            <li><span aria-hidden="true">☎️</span> <span dir="ltr">+20 10 000 0000</span></li>
            <li><span aria-hidden="true">✉️</span> hello@motohub.example</li>
          </ul>
        </div>
      </div>

      <div className="container footer-bar">
        <p>© {new Date().getFullYear()} MotoHub Egypt — مشروع تجريبي غير تجاري.</p>
      </div>
    </footer>
  )
}

export default Footer
