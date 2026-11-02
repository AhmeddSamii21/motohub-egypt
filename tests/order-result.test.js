import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  HISTORY_NOTE,
  PUBLISHED_DEPOSIT_EGP,
  RETRY_EXPLANATION,
  STATUS_UNKNOWN_LABEL,
  SUCCESS_CONTACT_NOTE,
  clearStaleResult,
  depositLines,
  formatAmount,
  normalizeDepositPaid,
  normalizeDepositRequired,
  normalizeStatus,
  statusLabel,
  successLines,
} from '../src/data/orderResult.js'
import { submitOrder } from '../src/data/ordersApi.js'
import { readOrderHistory, saveOrderRecord } from '../src/data/orderHistory.js'

/** تخزين وهمي بسيط يحاكي localStorage */
class FakeStorage {
  constructor() {
    this.map = new Map()
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null
  }

  setItem(key, value) {
    this.map.set(key, String(value))
  }

  removeItem(key) {
    this.map.delete(key)
  }
}

const CUSTOMER = { name: 'عميل تجريبي', phone: '01000000000', address: 'عنوان تجريبي' }
const ITEMS = [{ brand: 'SYM', name: 'Orbit 3 150 CC', qty: 1 }]

function fakeServer(body) {
  globalThis.fetch = async () => ({ json: async () => body })
}

afterEach(() => {
  delete globalThis.fetch
  delete globalThis.localStorage
})

test('the confirmation shows the actual server status', () => {
  const lines = successLines({ status: 'Confirmed', depositRequired: 5000, depositPaid: false })
  assert.equal(statusLabel('Confirmed'), 'Confirmed')
  assert.ok(lines[0].includes('Confirmed'))
  assert.equal(lines.join(' ').includes('Pending'), false)
})

test('a missing or invalid status is shown as unavailable, never as Pending', () => {
  for (const value of [undefined, null, '', '   ', 42, {}]) {
    assert.equal(normalizeStatus(value), null)
  }
  const lines = successLines({})
  assert.ok(lines[0].includes(STATUS_UNKNOWN_LABEL))
  assert.equal(lines.join(' ').includes('Pending'), false)
  // سطر «الحالة حسب رد النظام» لا يظهر بلا رد فعلي
  assert.equal(lines[0].includes('حسب رد النظام'), false)
})

test('deposit values are shown when the server sends them', () => {
  const lines = depositLines({ depositRequired: 12000, depositPaid: true })
  assert.ok(lines[0].includes('12,000'))
  assert.ok(lines[0].includes('حسب رد النظام'))
  assert.ok(lines[1].includes('كمحصّلة'))
  // 0 قيمة صالحة (غير سالبة) وليست مفقودة
  assert.equal(normalizeDepositRequired(0), 0)
  assert.ok(depositLines({ depositRequired: 0 })[0].includes(': 0 ج.م'))
})

test('missing deposit data is separated from the published policy and never invented', () => {
  assert.equal(normalizeDepositRequired(undefined), null)
  assert.equal(normalizeDepositRequired(-1), null)
  assert.equal(normalizeDepositRequired('5000'), null)
  assert.equal(normalizeDepositPaid(undefined), null)
  assert.equal(normalizeDepositPaid('true'), null)

  const lines = depositLines({})
  const text = lines.join(' ')
  assert.ok(text.includes('لم يُرسلها النظام'))
  assert.ok(text.includes('سياسة المعرض المنشورة'))
  assert.ok(text.includes(formatAmount(PUBLISHED_DEPOSIT_EGP)))
  assert.ok(text.includes('ليست قيمة مؤكدة من النظام'))
  // السياسة المنشورة لا تُقدَّم كقيمة من الخادم
  assert.equal(lines[0].startsWith('الدفعة المقدمة المطلوبة حسب رد النظام'), false)
  // ولا تُدَّعى محصّلة بلا تأكيد
  assert.equal(text.includes('كمحصّلة'), false)
})

test('depositPaid: true is not contradicted by fixed copy', () => {
  const text = depositLines({ depositRequired: 5000, depositPaid: true }).join(' ')
  assert.ok(text.includes('كمحصّلة'))
  assert.equal(text.includes('غير محصّلة'), false)
  assert.equal(text.includes('لم يُرسلها النظام'), false)
  // لا يُدَّعى أي دفع إلكتروني، ولا تُنسَب أي عملية دفع إلكتروني للنظام
  assert.equal(text.includes('تم الدفع إلكترونيًا'), false)
  assert.ok(text.includes('لا يُحصَّل أي دفع إلكتروني عبر هذا الموقع'))
})

test('retry wording reuses the reference but promises no duplicate prevention', () => {
  for (const phrase of ['نضمن', 'ضمان عدم', 'بدون تكرار', 'لن يتكرر', 'لا يتكرر', 'يمنع التكرار']) {
    assert.equal(RETRY_EXPLANATION.includes(phrase), false, phrase)
  }
  assert.ok(RETRY_EXPLANATION.includes('نفس المرجع'))
  assert.ok(RETRY_EXPLANATION.includes('نفس البيانات'))
  assert.ok(RETRY_EXPLANATION.includes('لم يُتحقق'))
  assert.ok(RETRY_EXPLANATION.includes('لا يضمن'))
})

test('no copy promises that the showroom will contact the customer', () => {
  const texts = [
    ...successLines({ status: 'Pending', depositRequired: 5000, depositPaid: false }),
    HISTORY_NOTE,
    SUCCESS_CONTACT_NOTE,
  ].join(' ')
  for (const phrase of ['يتواصل معك', 'سيتواصل', 'التواصل معك', 'يتواصل مع العميل', 'سيتم التواصل']) {
    assert.equal(texts.includes(phrase), false, phrase)
  }
  // ما تؤكده الصفحة محدود برد النظام
  assert.ok(SUCCESS_CONTACT_NOTE.includes('تؤكد فقط ما ورد في رد النظام'))
})

test('a new validation attempt clears a stale failure banner without abandoning the pending attempt', () => {
  const attempt = { orderRef: 'MHB-1790000000000-TEST1', state: 'unknown' }
  const state = { order: { phase: 'unknown', message: 'تعذر الاتصال بخدمة الطلبات.', success: null }, pendingAttempt: attempt }
  const next = {
    ...state,
    order: clearStaleResult(state.order),
    notice: 'من فضلك أكمل: الاسم، رقم الهاتف، وعنوان التوصيل.',
  }

  assert.equal(next.order.phase, 'idle')
  assert.equal(next.order.message, '')
  assert.equal(next.notice.length > 0, true)
  // المحاولة غير المحسومة ما زالت في حالتها: لا تُلغى لإخفاء لافتة
  assert.equal(next.pendingAttempt, attempt)
  assert.equal(next.pendingAttempt.state, 'unknown')

  assert.deepEqual(clearStaleResult({ phase: 'error', message: 'خطأ', success: null }), {
    phase: 'idle',
    message: '',
    success: null,
  })
  const sending = { phase: 'sending', message: '', success: null }
  assert.equal(clearStaleResult(sending), sending)
  const success = { phase: 'success', message: '', success: { orderRef: 'MHB-1' } }
  assert.equal(clearStaleResult(success), success)
})

test('submitOrder never fabricates status or deposit fields', async () => {
  fakeServer({ ok: true, orderRef: 'MHB-1790000000001-TEST2' })
  const result = await submitOrder('MHB-1790000000001-TEST2', CUSTOMER, ITEMS)
  assert.equal(result.ok, true)
  assert.equal(result.status, null)
  assert.equal(result.depositRequired, null)
  assert.equal(result.depositPaid, null)
})

test('submitOrder keeps the server status and explicit deposit values', async () => {
  fakeServer({
    ok: true,
    orderRef: 'MHB-1790000000002-TEST3',
    status: 'Confirmed',
    depositRequired: 0,
    depositPaid: true,
  })
  const result = await submitOrder('MHB-1790000000002-TEST3', CUSTOMER, ITEMS)
  assert.equal(result.status, 'Confirmed')
  assert.equal(result.depositRequired, 0)
  assert.equal(result.depositPaid, true)
})

test('history keeps the server status verbatim and null when absent', () => {
  globalThis.localStorage = new FakeStorage()
  saveOrderRecord({ orderRef: 'MHB-1790000000003-TEST4', status: 'Confirmed', depositRequired: 7000, items: ITEMS })
  saveOrderRecord({ orderRef: 'MHB-1790000000004-TEST5', items: ITEMS })

  const history = readOrderHistory()
  const confirmed = history.find((record) => record.orderRef === 'MHB-1790000000003-TEST4')
  const missing = history.find((record) => record.orderRef === 'MHB-1790000000004-TEST5')

  assert.equal(confirmed.status, 'Confirmed')
  assert.equal(confirmed.depositRequired, 7000)
  // لا «Pending» مُخترعة ولا دفعة 5,000 افتراضية
  assert.equal(missing.status, null)
  assert.equal(missing.depositRequired, null)
  assert.equal(statusLabel(missing.status) || STATUS_UNKNOWN_LABEL, STATUS_UNKNOWN_LABEL)
})
