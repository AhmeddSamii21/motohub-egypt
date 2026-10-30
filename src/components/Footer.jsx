import { useEffect, useState } from 'react'
import { WHATSAPP_NUMBER } from '../data/contact'
import './Footer.css'

/**
 * سنة الحقوق محسوبة لحظة التركيب (وفي كل عودة للصفحة) لتظل صحيحة
 * لو ظل التبويب مفتوحًا مع بداية سنة جديدة — بدون استدعاءات غير نقية أثناء الرندر.
 */
function getCurrentYear() {
  return new Date().getFullYear()
}

function Footer() {
  const [year, setYear] = useState(() => getCurrentYear())

  // تحديث السنة لو ظل التبويب مفتوحًا عبر بداية سنة جديدة.
  // هذه مزامنة مع نظام خارجي (حالة إظهار التبويب) — لا تحدث أثناء الرندر.
  useEffect(() => {
    const syncYear = () => setYear(getCurrentYear())
    document.addEventListener('visibilitychange', syncYear)
    return () => document.removeEventListener('visibilitychange', syncYear)
  }, [])

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
            <li><a href="#catalog">الكتالوج</a></li>
            <li><a href="#calc">حاسبة الأقساط</a></li>
            <li><a href="#book">حجز معاينة</a></li>
          </ul>
        </nav>

        <div className="footer-col">
          <h3>تواصل</h3>
          <ul>
            <li>
              {/* القناة الوحيدة المؤكَّدة (contact.js) — بلا هاتف/بريد/عنوان تجريبي */}
              <a
                className="footer-whatsapp"
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span aria-hidden="true">💬</span>
                واتساب المعرض
                <span dir="ltr">{WHATSAPP_NUMBER}</span>
              </a>
            </li>
            <li><a href="#showroom">عن المعرض</a></li>
          </ul>
        </div>
      </div>

      <div className="container footer-bar">
        <p>© {year} MotoHub Egypt — مشروع تجريبي غير تجاري.</p>
      </div>
    </footer>
  )
}

export default Footer
