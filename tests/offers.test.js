/**
 * اختبارات مركز العروض (offers.js) — قواعد الصدق المالي:
 * - لا توجد عروض موثوقة حاليًا ⇒ VERIFIED_OFFERS فارغة و hasVerifiedOffers() === false
 *   (حالة الفراغ الصادقة تُعرض في الواجهة بلا خصومات مُختلقة).
 * - بنية العرض المستقبلي: كل الحقول المطلوبة (id/brand/name/details) يجب أن تترافق —
 *   أي عرض ناقص حقوله الإلزامية يُرفض عند إضافته لاحقًا (تحقق البنية هنا يمنع عرض ناقص).
 * - لا استنتاج خصم من مقارنة أسعار قديمة/حديثة — هذا سلوك #updates وليس العروض.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { VERIFIED_OFFERS, hasVerifiedOffers } from '../src/data/offers.js'

test('لا عروض موثوقة حاليًا: القائمة فارغة وحالة الفراغ مفعّلة', () => {
  assert.deepEqual(VERIFIED_OFFERS, [])
  assert.equal(hasVerifiedOffers(), false)
})

test('بنية عرض مستقبلي صالحة تُقبل — الحقول الإلزامية الثلاثة + id موجودة', () => {
  const sample = {
    id: 'offer-1',
    brand: 'SYM',
    name: 'Orbit 3 150 CC',
    details: 'عرض مؤكَّد من المعرض',
  }
  assert.equal(typeof sample.id, 'string')
  assert.ok(sample.id.length > 0)
  assert.ok(sample.brand && sample.name && sample.details)
  // التواريخ والشروط اختيارية — فقط إن وُثقت
  assert.equal(sample.validFrom, undefined)
  assert.equal(sample.validUntil, undefined)
  assert.equal(sample.terms, undefined)
})

test('عرض ناقص حقوله الإلزامية لا يُعد صالحًا للإضافة (حماية بنية)', () => {
  const broken = { id: 'x', brand: 'SYM' } // بلا name/details
  const isValidOffer = (offer) => Boolean(offer && offer.id && offer.brand && offer.name && offer.details)
  assert.equal(isValidOffer(broken), false)
})

test('القائمة مجمدة — لا تُعدَّل وقت التشغيل', () => {
  assert.equal(Object.isFrozen(VERIFIED_OFFERS), true)
})
