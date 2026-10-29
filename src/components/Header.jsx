import { useEffect, useState } from 'react'
import './Header.css'

/**
 * روابط التنقل بين أقسام الموقع (توجيه الهاز في App):
 * الرئيسية / الكتالوج / ساعدني أختار موتوسيكل / تحديثات الأسعار / حاسبة الأقساط / حاسبة التشغيل / عن المعرض / المفضلة (بشارة العدد) / عربة الشراء (بشارة عدد القطع) / حجز معاينة (زر مميز).
 * القسم النشِط يُعلَّم بـ aria-current للوصولية وللتبويب المرئي.
 */
import { CART_EVENT, cartCount } from '../data/cartStore'
import { FAVORITES_EVENT, favoritesCount } from '../data/favoritesStore'

const LINKS = [
  { href: '#home', label: 'الرئيسية', view: 'home' },
  { href: '#catalog', label: 'الكتالوج', view: 'catalog' },
  { href: '#recommend', label: 'ساعدني أختار موتوسيكل', view: 'recommend' },
  { href: '#updates', label: 'تحديثات الأسعار', view: 'updates' },
  { href: '#calc', label: 'حاسبة الأقساط', view: 'calc' },
  { href: '#cost', label: 'حاسبة التشغيل', view: 'cost' },
  { href: '#showroom', label: 'عن المعرض', view: 'showroom' },
]

function Header({ view = 'home' }) {
  const [open, setOpen] = useState(false)
  // عدد القطع الإجمالي (مجموع الكميات) — يتحدّث فورًا عبر حدث السلة المخصص
  const [cartItems, setCartItems] = useState(() => cartCount())
  // عدد الموديلات المفضَّلة — يتحدّث فورًا عبر حدث المفضلة المخصص
  const [favCount, setFavCount] = useState(() => favoritesCount())

  useEffect(() => {
    const refresh = () => {
      setCartItems(cartCount())
      setFavCount(favoritesCount())
    }
    window.addEventListener(CART_EVENT, refresh)
    window.addEventListener(FAVORITES_EVENT, refresh)
    return () => {
      window.removeEventListener(CART_EVENT, refresh)
      window.removeEventListener(FAVORITES_EVENT, refresh)
    }
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
                href="#favorites"
                aria-current={view === 'favorites' ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                المفضلة
                {favCount > 0 && (
                  <span className="nav-cart-badge" aria-label={`${favCount} موديل في المفضلة`}>
                    {favCount}
                  </span>
                )}
              </a>
            </li>
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
