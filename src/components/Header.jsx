import { useState } from 'react'
import './Header.css'

const LINKS = [
  { href: '#home', label: 'الرئيسية' },
  { href: '#brands', label: 'الماركات' },
  { href: '#models', label: 'الموديلات' },
  { href: '#contact', label: 'تواصل معنا' },
]

function Header() {
  const [open, setOpen] = useState(false)

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
                <a href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a href="#book" className="btn btn-primary nav-cta" onClick={() => setOpen(false)}>
                احجز معاينة
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Header
