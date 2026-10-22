import { FEATURES } from '../data/content'
import './Features.css'

const ICONS = {
  warranty: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
      <path d="M9.5 12l1.8 1.8L15 10.2" />
    </svg>
  ),
  maintenance: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.5 6.5a4 4 0 0 0-5.4 4.9L4 16.5 7.5 20l5.1-5.1a4 4 0 0 0 4.9-5.4l-2.6 2.6-2.4-2.4 2-3.2z" />
    </svg>
  ),
  parts: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2.3M12 18.2v2.3M3.5 12h2.3M18.2 12h2.3M6 6l1.6 1.6M16.4 16.4L18 18M18 6l-1.6 1.6M7.6 16.4L6 18" />
    </svg>
  ),
  'test-ride': (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="17" r="2.6" />
      <circle cx="18" cy="17" r="2.6" />
      <path d="M6 17l4-6-2-2h4l2.5 5 3.5-2M11.5 9l1.5-2.5" />
    </svg>
  ),
}

function Features() {
  return (
    <section className="section features" id="features">
      <div className="container">
        <div className="section-head">
          <p className="section-kicker">لماذا MotoHub؟</p>
          <h2 className="section-title">خدمات بعد البيع والثقة قبلها</h2>
          <p className="section-sub">نخدمك من لحظة الاستفسار لحظة ما بعد التسليم.</p>
        </div>

        <ul className="features-grid">
          {FEATURES.map((feature) => (
            <li className="feature-card" key={feature.id}>
              <span className="feature-icon" aria-hidden="true">
                {ICONS[feature.id]}
              </span>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-text">{feature.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default Features
