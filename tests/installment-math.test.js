/**
 * اختبارات معادلات حاسبة الأقساط (installmentMath).
 * المعادلات الموثقة في installmentMath.js:
 * - بلا فائدة: monthly = P / n
 * - بفائدة (فائدة متناقصة/أنّوية): r = rate% /100/12، monthly = P·r / (1−(1+r)^(−n))
 * - الإجمالي = الدفعة + (القسط المقرَّب × n) + الرسوم، وتكلفة التمويل = الأقساط + الرسوم − الممول
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateInstallmentPlan } from '../src/data/installmentMath.js'

test('بلا فائدة: القسط = المبلغ ÷ الأشهر — 66000 على 12 شهرًا = 5500', () => {
  const result = calculateInstallmentPlan({ price: 66000, months: 12 })
  assert.equal(result.ok, true)
  assert.equal(result.scenario, 'zero-interest')
  assert.equal(result.financed, 66000)
  assert.equal(result.monthly, 5500)
  assert.equal(result.totalInstallments, 66000)
  assert.equal(result.financingCost, 0)
})

test('بفائدة: 66000 بمعدل 12% سنوي على 12 شهرًا — القسط من معادلة الأنّوية', () => {
  const result = calculateInstallmentPlan({ price: 66000, annualRatePercent: '12', months: 12 })
  assert.equal(result.ok, true)
  assert.equal(result.scenario, 'interest-bearing')
  const r = 0.12 / 12
  const expected = (66000 * r) / (1 - Math.pow(1 + r, -12))
  assert.equal(result.monthly, Math.round(expected))
  // صحة بنيوية: مجموع الأقساط ≥ المبلغ المُموَّل، والحساب = الفرق
  assert.ok(result.totalInstallments >= 66000)
  assert.equal(result.financingCost, result.totalInstallments - 66000)
  assert.equal(result.totalPaid, 0 + result.totalInstallments + 0)
})

test('الدفعة الأولى تُخصم من المبلغ المُموَّل وتُعاد بدقة في الإجمالي', () => {
  const result = calculateInstallmentPlan({ price: 80000, downPayment: 20000, months: 12 })
  assert.equal(result.ok, true)
  assert.equal(result.financed, 60000)
  assert.equal(result.monthly, 5000)
  assert.equal(result.totalPaid, 80000)
  assert.equal(result.financingCost, 0)
})

test('الدفعة الأولى = السعر كاملًا: تمويل صفر — القسط صفر', () => {
  const result = calculateInstallmentPlan({ price: 80000, downPayment: 80000, months: 12 })
  assert.equal(result.ok, true)
  assert.equal(result.financed, 0)
  assert.equal(result.monthly, 0)
  assert.equal(result.totalInstallments, 0)
  assert.equal(result.financingCost, 0)
})

test('الدفعة الأولى السالبة ترفض برسالة عربية', () => {
  const result = calculateInstallmentPlan({ price: 80000, downPayment: -5, months: 12 })
  assert.equal(result.ok, false)
  assert.match(result.error, /سالبة/)
})

test('الدفعة الأولى أكبر من السعر ترفض برسالة عربية', () => {
  const result = calculateInstallmentPlan({ price: 80000, downPayment: 90000, months: 12 })
  assert.equal(result.ok, false)
  assert.match(result.error, /لا تتجاوز/)
})

test('المدة الصفرية والسالبة والناقصة ترفض', () => {
  for (const months of [0, -3, '']) {
    const result = calculateInstallmentPlan({ price: 80000, months })
    assert.equal(result.ok, false, `months=${months}`)
    assert.ok(Number.isFinite(result.months ?? 0) === false || result.error.length > 0)
  }
})

test('المدة غير الصحيحة (كسرية) ترفض', () => {
  const result = calculateInstallmentPlan({ price: 80000, months: 12.5 })
  assert.equal(result.ok, false)
  assert.match(result.error, /صحيح/)
})

test('السعر الناقص أو صفر أو سالب يرفض', () => {
  assert.equal(calculateInstallmentPlan({ price: '', months: 12 }).ok, false)
  assert.equal(calculateInstallmentPlan({ price: 0, months: 12 }).ok, false)
  assert.equal(calculateInstallmentPlan({ price: -1, months: 12 }).ok, false)
})

test('الرسوم تُضاف للإجمالي وتظهر في تكلفة التمويل دون أن تُموَّل', () => {
  const zero = calculateInstallmentPlan({ price: 66000, months: 12, fees: 1500 })
  assert.equal(zero.ok, true)
  assert.equal(zero.monthly, 5500) // الرسوم لا تدخل القسط
  assert.equal(zero.totalPaid, 66000 + 1500)
  assert.equal(zero.financingCost, 1500)
})

test('الرسوم السالبة ترفض، والفائدة السالبة ترفض', () => {
  assert.equal(calculateInstallmentPlan({ price: 66000, months: 12, fees: -1 }).ok, false)
  assert.equal(calculateInstallmentPlan({ price: 66000, months: 12, annualRatePercent: -2 }).ok, false)
})

test('التقريب: القسط مقرَّب لأقرب جنيه والإجمالي = القسط × n (متسق ذاتيًا)', () => {
  const result = calculateInstallmentPlan({ price: 100000, annualRatePercent: '13.5', months: 24 })
  assert.equal(result.ok, true)
  const r = 0.135 / 12
  const expected = Math.round((100000 * r) / (1 - Math.pow(1 + r, -24)))
  assert.equal(result.monthly, expected)
  assert.equal(result.totalInstallments, expected * 24)
  assert.equal(result.totalPaid, expected * 24)
})
