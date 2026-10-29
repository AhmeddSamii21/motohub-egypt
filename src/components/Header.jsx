import { useEffect, useState } from 'react'
import './Header.css'

/**
 * روابط التنقل بين أقسام الموقع (توجيه الهاز في App):
 * الرئيسية / الكتالوج / حاسبة الأقساط / حاسبة التشغيل / عربة الشراء (بشارة عدد القطع) / حجز معاينة (زر مميز).
 * القسم النشِط يُعلَّم بـ aria-current للوصولية وللتبويب المرئي.
 */
import { CART_EVENT, cartCount } from '../data/cartStore'

const LINKS = [
  { href: '#home', label: 'الرئيسية', view: 'home' },
  { href: '#catalog', label: 'الكتالوج', view: 'catalog' },
  { href: '#calc', label: 'حاسبة الأقساط', view: 'calc' },
  { href: '#cost', label: 'حاسبة التشغيل', view: 'cost' },
]

function Header({ view = 'home' }) {
  const [open, setOpen] = useState(false)
  // عدد القطع الإجمالي (مجموع الكميات) — يتحدّث فورًا عبر حدث السلة المخصص
  const [cartItems, setCartItems] = useState(() => cartCount())

  useEffect(() => {
    const refresh = () => setCartItems(cartCount())
    window.addEventListener(CART_EVENT, refresh)
    return () => window.removeEventListener(CART_EVENT, refresh)
  }, [])

  return (
    <header className="site-header" id="home">
      <div className="container header-inner">
        <a href="#home" className="site-logo" aria-label="MotoHub Egypt — الرئيسية">
          <span className="logo-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17h3m8 0h3" />
              <circle cx="5.5" cy="17" r="3" />
              <circle cx="18.5" cy="17" r="3" />
              <path d="M8.5 17l3-6-2-2h3l2.5 5 3-1" />
            </svg>
          </span>
          <span className="logo-text">
            MotoHub <em>Egypt</em>
          </span>
        </a>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">القائمة</span>
          <span className={`nav-toggle-bar ${open ? 'is-open' : ''}`} aria-hidden="true" />
        </button>

        <nav id="primary-nav" className={`site-nav ${open ? 'is-open' : ''}`}>
          <ul>
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-current={view === link.view ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#cart"
                aria-current={view === 'cart' ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                عربة الشراء
                {cartItems > 0 && (
                  <span className="nav-cart-badge" aria-label={`${cartItems} قطعة في عربة الشراء`}>
                    {cartItems}
                  </span>
                )}
              </a>
            </li>
            <li>
              <a
                href="#book"
                className="btn btn-primary nav-cta"
                aria-current={view === 'book' ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                حجز معاينة
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Header
