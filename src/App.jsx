import { useEffect, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import FeaturedModels from './components/FeaturedModels'
import Brands from './components/Brands'
import Catalog from './components/Catalog'
import InstallmentCalculator from './components/InstallmentCalculator'
import Features from './components/Features'
import CTA from './components/CTA'
import BookingForm from './components/BookingForm'
import Footer from './components/Footer'
import './App.css'

/**
 * توجيه بسيط قائم على الهاش بدون أي اعتماديات إضافية.
 * الأقسام تبقى جميعها مُركّبة مع إخفاء غير النشِط (attribute hidden) —
 * بهذا تنجو حالات التصفية والترتيب ومفاتيح المقارنة من الضياع بين التنقّلات.
 */
const VIEWS = {
  home: 'home',
  catalog: 'catalog',
  calc: 'calc',
  book: 'book',
}

/** الهاشات الحالية والقديمة معًا إلى قسم (view) — الهاش غير المعروف يحافظ على القسم الحالي */
const HASH_TO_VIEW = new Map([
  ['', VIEWS.home],
  ['#home', VIEWS.home],
  ['#brands', VIEWS.home],
  ['#models', VIEWS.home],
  ['#features', VIEWS.home],
  ['#cta', VIEWS.home],
  ['#catalog', VIEWS.catalog],
  ['#calc', VIEWS.calc],
  ['#installments', VIEWS.calc],
  ['#book', VIEWS.book],
])

function viewFromHash(hash) {
  return HASH_TO_VIEW.get(hash) ?? null
}

function App() {
  const [view, setView] = useState(() => viewFromHash(window.location.hash) ?? VIEWS.home)

  useEffect(() => {
    const onHashChange = () => {
      const next = viewFromHash(window.location.hash)
      if (next) setView(next)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // عند التنقّل بين الأقسام: صُعد لأعلى، أو وصل لعنصر الهاز المستهدف إن كان معروضًا الآن
  // (rAF يضمن التنفيذ بعد محاولة المتصفح الأصلية للتمرير للمرساة — فلا صور ولا قفزة مزدوجة)
  useEffect(() => {
    const target = document.getElementById(window.location.hash.slice(1))
    requestAnimationFrame(() => {
      if (target && target.offsetParent !== null) target.scrollIntoView()
      else window.scrollTo({ top: 0, behavior: 'instant' })
    })
  }, [view])

  return (
    <div className="app">
      <a href="#page" className="skip-link">
        تخطَّ إلى المحتوى الرئيسي
      </a>
      <Header view={view} />
      <main className="app-main" id="page">
        <div className={`view-panel ${view === VIEWS.home ? 'is-active' : ''}`}>
          <Hero />
          <FeaturedModels />
          <Features />
          <CTA />
        </div>
        <div className={`view-panel ${view === VIEWS.catalog ? 'is-active' : ''}`}>
          <Brands />
          <Catalog />
        </div>
        <div className={`view-panel ${view === VIEWS.calc ? 'is-active' : ''}`}>
          <InstallmentCalculator />
        </div>
        <div className={`view-panel ${view === VIEWS.book ? 'is-active' : ''}`}>
          <BookingForm />
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default App
