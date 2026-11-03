import { CARE_GUIDE_DISCLAIMER, CARE_GUIDE_MANUAL_NOTE, CARE_GUIDE_SECTIONS } from '../data/careGuide'

/**
 * دليل العناية — عرض ثابت لإرشادات عامة فقط.
 * لا يحتوي أي فترة صيانة أو قيمة ضغط إطارات خاصة بموديل، ويوجّه صراحة
 * إلى دليل المالك أو مركز خدمة معتمد عند الحاجة لتعليمات الموديل.
 */
function CareGuide() {
  return (
    <section className="garage-guide" aria-labelledby="garage-guide-title">
      <h3 className="garage-subhead" id="garage-guide-title">
        دليل العناية بالموتوسيكل
      </h3>
      <p className="garage-callout">{CARE_GUIDE_DISCLAIMER}</p>
      <p className="garage-callout garage-callout-muted">{CARE_GUIDE_MANUAL_NOTE}</p>

      <div className="garage-guide-grid">
        {CARE_GUIDE_SECTIONS.map((section) => (
          <article className="garage-guide-card" key={section.id}>
            <h4>{section.title}</h4>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {section.note && <p className="garage-guide-note">{section.note}</p>}
          </article>
        ))}
      </div>

      <p className="garage-guide-footer">
        هذه إرشادات عامة لا تُغني عن الفحص المتخصص. عند الشك في الفرامل أو التوجيه أو أي جزء
        ميكانيكي، توقف عن القيادة وراجع مركز خدمة معتمدًا.
      </p>
    </section>
  )
}

export default CareGuide
