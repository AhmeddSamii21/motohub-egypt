import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  PENDING_ATTEMPT_KEY,
  applySubmissionOutcome,
  buildPendingAttempt,
  clearPendingAttempt,
  fingerprintPayload,
  matchesPendingPayload,
  readPendingAttempt,
  savePendingAttempt,
} from '../src/data/pendingOrderAttempt.js'
import { buildOrderPayload, submitOrder } from '../src/data/ordersApi.js'
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

  clear() {
    this.map.clear()
  }
}

const REF = 'MHB-1790000000000-TEST1'

function makePayload(overrides = {}) {
  return {
    orderRef: REF,
    customerName: 'عميل تجريبي',
    phone: '01000000000',
    address: 'عنوان تجريبي',
    customerNotes: '',
    items: [{ brand: 'SYM', name: 'Orbit 3 150 CC', qty: 1 }],
    ...overrides,
  }
}

function customerInfo(payload) {
  return {
    name: payload.customerName,
    phone: payload.phone,
    address: payload.address,
    notes: payload.customerNotes,
  }
}

/** يحاكي إعادة تحميل الصفحة: قراءة جديدة من التخزين فقط، بلا أي حالة في الذاكرة */
function simulateReload() {
  return readPendingAttempt()
}

beforeEach(() => {
  globalThis.localStorage = new FakeStorage()
})

afterEach(() => {
  delete globalThis.fetch
  delete globalThis.localStorage
})

test('unknown outcome is preserved across a reload', () => {
  const payload = makePayload()
  const attempt = buildPendingAttempt(REF, payload)
  assert.ok(attempt)
  assert.ok(savePendingAttempt(attempt))

  // إعادة تحميل: السجل يُقرأ من التخزين بحالة sending (غير محسومة)
  const reloaded = simulateReload()
  assert.equal(reloaded.orderRef, REF)
  assert.equal(reloaded.state, 'sending')

  const outcome = applySubmissionOutcome(reloaded, 'unknown')
  assert.equal(outcome.cleared, false)
  assert.equal(outcome.persisted, true)

  const afterReload = simulateReload()
  assert.ok(afterReload)
  assert.equal(afterReload.state, 'unknown')
  assert.equal(afterReload.orderRef, REF)
  assert.deepEqual(afterReload.payload, payload)
})

test('retry rebuilds the identical reference and payload', () => {
  const payload = makePayload()
  savePendingAttempt(buildPendingAttempt(REF, payload))
  const attempt = simulateReload()

  const rebuilt = buildOrderPayload(attempt.orderRef, customerInfo(attempt.payload), attempt.payload.items)
  assert.deepEqual(rebuilt, attempt.payload)
  assert.equal(fingerprintPayload(rebuilt), attempt.fingerprint)
  assert.equal(matchesPendingPayload(attempt, rebuilt), true)
})

test('a different payload is rejected under the same reference', () => {
  const payload = makePayload()
  savePendingAttempt(buildPendingAttempt(REF, payload))
  const attempt = simulateReload()

  assert.equal(matchesPendingPayload(attempt, makePayload({ phone: '01111111111' })), false)
  assert.equal(
    matchesPendingPayload(attempt, makePayload({ items: [{ brand: 'SYM', name: 'Orbit 3 150 CC', qty: 2 }] })),
    false,
  )
})

test('definitive success clears the pending record', () => {
  savePendingAttempt(buildPendingAttempt(REF, makePayload()))
  const attempt = simulateReload()

  const outcome = applySubmissionOutcome(attempt, 'success')
  assert.equal(outcome.cleared, true)
  assert.equal(simulateReload(), null)
})

test('definitive rejection clears the pending record', () => {
  savePendingAttempt(buildPendingAttempt(REF, makePayload()))
  const attempt = simulateReload()

  const outcome = applySubmissionOutcome(attempt, 'rejected')
  assert.equal(outcome.cleared, true)
  assert.equal(simulateReload(), null)
})

test('a network error is unknown and keeps the record', async () => {
  const payload = makePayload()
  const attempt = buildPendingAttempt(REF, payload)
  savePendingAttempt(attempt)

  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch')
  }
  const result = await submitOrder(REF, customerInfo(payload), payload.items)
  assert.equal(result.ok, false)
  assert.equal(result.unknown, true)

  applySubmissionOutcome(attempt, 'unknown')
  const afterReload = simulateReload()
  assert.ok(afterReload)
  assert.equal(afterReload.state, 'unknown')
  assert.equal(afterReload.orderRef, REF)
})

test('an unreadable reply is unknown and keeps the record', async () => {
  const payload = makePayload()
  const attempt = buildPendingAttempt(REF, payload)
  savePendingAttempt(attempt)

  globalThis.fetch = async () => ({ json: async () => { throw new Error('bad json') } })
  const result = await submitOrder(REF, customerInfo(payload), payload.items)
  assert.equal(result.unknown, true)

  applySubmissionOutcome(attempt, 'unknown')
  assert.equal(simulateReload().orderRef, REF)
})

test('successful submission regression: payload, success status and history intact', async () => {
  const payload = makePayload()
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    return {
      json: async () => ({
        ok: true,
        orderRef: REF,
        status: 'Pending',
        depositRequired: 5000,
        depositPaid: false,
      }),
    }
  }

  const attempt = buildPendingAttempt(REF, payload)
  assert.ok(savePendingAttempt(attempt))

  const result = await submitOrder(REF, customerInfo(payload), payload.items)
  assert.equal(result.ok, true)
  assert.equal(result.status, 'Pending')
  assert.equal(result.depositRequired, 5000)

  // الحِمل المُرسَل هو نفسه المحفوظ، وبلا أي سعر
  assert.equal(calls.length, 1)
  assert.deepEqual(JSON.parse(calls[0].init.body), payload)
  assert.equal(calls[0].init.body.includes('price'), false)

  applySubmissionOutcome(attempt, 'success')
  saveOrderRecord({
    orderRef: result.orderRef,
    status: result.status,
    depositRequired: result.depositRequired ?? 5000,
    items: payload.items,
  })

  assert.equal(simulateReload(), null)
  const history = readOrderHistory()
  assert.equal(history.length, 1)
  assert.equal(history[0].orderRef, REF)
  assert.equal(history[0].status, 'Pending')
})

test('malformed or tampered storage is ignored safely', () => {
  globalThis.localStorage.setItem(PENDING_ATTEMPT_KEY, '{not json')
  assert.equal(readPendingAttempt(), null)

  globalThis.localStorage.setItem(PENDING_ATTEMPT_KEY, JSON.stringify({ orderRef: REF }))
  assert.equal(readPendingAttempt(), null)

  savePendingAttempt(buildPendingAttempt(REF, makePayload()))
  const stored = JSON.parse(globalThis.localStorage.getItem(PENDING_ATTEMPT_KEY))
  stored.fingerprint = 'deadbeef'
  globalThis.localStorage.setItem(PENDING_ATTEMPT_KEY, JSON.stringify(stored))
  assert.equal(readPendingAttempt(), null)
})

test('unavailable storage never throws and never claims persistence', () => {
  const explode = () => {
    throw new Error('storage blocked')
  }
  globalThis.localStorage = { getItem: explode, setItem: explode, removeItem: explode }

  assert.equal(readPendingAttempt(), null)
  assert.equal(savePendingAttempt(buildPendingAttempt(REF, makePayload())), null)
  assert.equal(clearPendingAttempt(), false)

  const attempt = buildPendingAttempt(REF, makePayload())
  const outcome = applySubmissionOutcome(attempt, 'unknown')
  assert.equal(outcome.persisted, false)
  assert.ok(outcome.attempt)
  assert.equal(outcome.cleared, false)
})

test('the storage key stays documented and stable', () => {
  assert.equal(PENDING_ATTEMPT_KEY, 'motohub.pendingOrder')
})
