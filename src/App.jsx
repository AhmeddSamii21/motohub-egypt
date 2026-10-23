import Header from './components/Header'
import Hero from './components/Hero'
import Brands from './components/Brands'
import FeaturedModels from './components/FeaturedModels'
import Features from './components/Features'
import CTA from './components/CTA'
import BookingForm from './components/BookingForm'
import Footer from './components/Footer'
import './App.css'

function App() {
  return (
    <div className="app">
      <a href="#page" className="skip-link">
        تخطَّ إلى المحتوى الرئيسي
      </a>
      <Header />
      <main className="app-main" id="page">
        <Hero />
        <Brands />
        <FeaturedModels />
        <Features />
        <CTA />
        <BookingForm />
      </main>
      <Footer />
    </div>
  )
}

export default App
