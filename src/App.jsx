import { useEffect, useLayoutEffect, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import FeaturedModels from './components/FeaturedModels'
import Catalog from './components/Catalog'
import InstallmentCalculator from './components/InstallmentCalculator'
import Features from './components/Features'
import CTA from './components/CTA'
import BookingForm from './components/BookingForm'
import ModelPage from './components/ModelPage'
import Cart from './components/Cart'
import Footer from './components/Footer'
import './App.css'

/**
 * توجيه بسيط قائم على الهاش بدون أي اعتماديات إضافية.
 * الأقسام تبقى جميعها مُركّبة والغير نشِط مخفي بــ display:none عبر الأصناف —
 * بهذا تنجو حالات التصفية والترتيب ومفاتيح المقارنة من الضياع بين التنقّلات.
 */
const VIEWS = {
  home: 'home',
  catalog: 'catalog',
  calc: 'calc',
  book: 'book',
  model: 'model',
  cart: 'cart',
}

/** بادئة روابط صفحات الموديل الفردية — لا ماركة/موديل داخل App؛ الحلّ الدقيق في ModelPage/modelSlug */
const MODEL_ROUTE_PREFIX = '#/m/'

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
  ['#cart', VIEWS.cart],
])

function viewFromHash(hash) {
  const mapped = HASH_TO_VIEW.get(hash)
  if (mapped) return mapped
  // روابط الموديل المشاركة (#/m/...) تذهب لصفحة الموديل — الحلّ الدقيق والرجوع
  // إلى #catalog عند عدم التطابق يُدار داخل ModelPage (بلا تخمين).
  if (hash && hash.startsWith(MODEL_ROUTE_PREFIX)) return VIEWS.model
  return null
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

  // عند التنقّل بين الأقسام (أهداف الهاز على مستوى القسم): أعلى الصفحة تمامًا (0,0)
  // لتلعب حركة view-in من الأعلى طبيعيًا — useLayoutEffect يُطبِّق التمرير قبل أي رسم
  // فلا وميض ولا اعتماد على إيقاع الإطارات، وما عدا مراسٍ عناصر داخلية نادرة
  useLayoutEffect(() => {
    const hash = window.location.hash
    if (HASH_TO_VIEW.has(hash)) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      return
    }
    const target = document.getElementById(hash.slice(1))
    if (target && target.offsetParent !== null) target.scrollIntoView()
    else window.scrollTo({ top: 0, behavior: 'instant' })
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
          <Catalog />
        </div>
        <div className={`view-panel ${view === VIEWS.calc ? 'is-active' : ''}`}>
          <InstallmentCalculator />
        </div>
        <div className={`view-panel ${view === VIEWS.book ? 'is-active' : ''}`}>
          <BookingForm />
        </div>
        <div className={`view-panel ${view === VIEWS.model ? 'is-active' : ''}`}>
          <ModelPage />
        </div>
        <div className={`view-panel ${view === VIEWS.cart ? 'is-active' : ''}`}>
          <Cart />
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default App
