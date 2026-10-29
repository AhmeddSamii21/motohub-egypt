import { useEffect, useState } from 'react'
import { CART_EVENT, readCart, updateQty, removeItem, clearCart } from '../data/cartStore'
import { GENERATED_BY_KEY, formatDisplayPrice } from '../data/modelDisplay'
import { CATALOG } from '../data/catalog'
import { generateOrderRef, submitOrder } from '../data/ordersApi'
import './Cart.css'

/**
 * عربة الشراء — عرض ومراجعة المنتجات فقط في هذه المرحلة.
 * السعر المعروض يُقرأ وقت العرض من البيانات الحالية (المُولَّدة ← الكتالوج) بنفس منطق
 * الكتالوج وصفحة الموديل، بلا تخزين قديمة داخل السلة.
 * نموذج بيانات التسليم "قيَدي فقط": يُرسَل الطلب إلى نظام طلبات المعرض (ordersApi) —
 * الأسعار تُحسب على الخادم من ورقة Products، ولا يُرسَل أي سعر من المتصفح.
 */
const CATALOG_BY_KEY = new Map()
for (const group of CATALOG) {
  for (const model of group.models) {
    CATALOG_BY_KEY.set(`${group.brand}|${model.name}`, model)
  }
}

/** سعر الوحدة لكل سطر: {display, numeric, needsReview} أو null لو لا توجد بيانات سعر */
function linePrice(item) {
  const key = `${item.brand}|${item.name}`
  const info = GENERATED_BY_KEY.get(key)
  const base = info ? info.price : CATALOG_BY_KEY.get(key)?.price
  if (base == null) return null
  const display = formatDisplayPrice(base, info && info.source)
  const numeric = Number(String(display).replace(/[^\d]/g, ''))
  return { display, numeric, needsReview: Boolean(info && info.needsReview) }
}

/** تنسيق رقم مخزَّن كأرقام قياسية بأسلوب ج.م نفسه */
function formatTotal(total) {
  return String(total).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function Cart() {
  const [items, setItems] = useState(() => readCart())
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const [notice, setNotice] = useState('')
  // حالة إرسال الطلب: idle | sending | success | error | unknown
  // refForRetry يُحتفظ به عند الفشل/عدم التأكد — إعادة المحاولة تستخدم نفس المرجع لمنع صفوف مكررة
  const [order, setOrder] = useState({ phase: 'idle', refForRetry: null, message: '', success: null })

  useEffect(() => {
    const refresh = () => setItems(readCart())
    window.addEventListener(CART_EVENT, refresh)
    return () => window.removeEventListener(CART_EVENT, refresh)
  }, [])

  const subtotal = items.reduce((sum, item) => {
    const price = linePrice(item)
    return price && Number.isFinite(price.numeric) ? sum + price.numeric * item.qty : sum
  }, 0)

  const onChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (order.phase === 'sending') return // منع الإرسال المزدوج من النقر المتكرر
    setNotice('')
    const name = form.name.trim()
    const phone = form.phone.trim().replace(/[\s-]/g, '')
    const address = form.address.trim()
    if (!name || !phone || !address) {
      setNotice('من فضلك أكمل: الاسم، رقم الهاتف، وعنوان التوصيل.')
      return
    }
    if (!/^0\d{10}$/.test(phone)) {
      setNotice('رقم الهاتف غير صالح — أدخل رقم موبايل مصري مثل 01012345678.')
      return
    }
    // نفس المرجع عند إعادة محاولة نفس الطلب؛ مرجع جديد بعد نجاح سابق أو أول مرة
    const orderRef = order.refForRetry || generateOrderRef()
    setOrder({ phase: 'sending', refForRetry: orderRef, message: '', success: null })
    try {
      const result = await submitOrder(orderRef, { name, phone, address, notes: form.notes.trim() }, items)
      if (result.ok) {
        setOrder({
          phase: 'success',
          refForRetry: null,
          message: '',
          success: {
            orderRef: result.orderRef,
            duplicate: result.duplicate,
            depositRequired: result.depositRequired,
            depositPaid: result.depositPaid,
          },
        })
        clearCart()
        setForm({ name: '', phone: '', address: '', notes: '' })
      } else {
        setOrder({
          phase: result.unknown ? 'unknown' : 'error',
          refForRetry: orderRef,
          message: result.error,
          success: null,
        })
      }
    } catch {
      setOrder({ phase: 'unknown', refForRetry: orderRef, message: 'تعذر إرسال الطلب.', success: null })
    }
  }

  return (
    <section className="section cart" id="cart">
      <div className="container">
        <h2 className="cart-title">عربة الشراء</h2>

        {order.phase === 'success' && order.success && (
          <p className="cart-notice">
            تم استلام طلبك ✅ مرجع الطلب: {order.success.orderRef} — الحالة: قيد المراجعة (Pending).
            {order.success.duplicate && ' تنبيه: هذا المرجع وصل النظام من قبل.'}{' '}
            الدفعة المقدمة المطلوبة: {order.success.depositRequired ?? 5000} ج.م
            (غير محصّلة إلكترونيًا — تُدفع عند تأكيد المعرض). سيراجع المعرض التوفر والسعر النهائي
            ورسوم التوصيل ثم يتواصل معك.
          </p>
        )}

        {items.length === 0 ? (
          <div className="cart-empty">
            <p>عربة الشراء فاضية — اختر موديل من صفحة الموديل واضغط «أضف إلى السلة».</p>
            <a href="#catalog" className="catalog-card-cta">تصفح الكتالوج</a>
          </div>
        ) : (
          <>
            <ul className="cart-list">
              {items.map((item) => {
                const price = linePrice(item)
                const lineTotal = price && Number.isFinite(price.numeric) ? price.numeric * item.qty : null
                return (
                  <li key={`${item.brand}|${item.name}`} className="cart-line">
                    <div className="cart-line-info">
                      <span className="cart-line-brand">{item.brand}</span>
                      <span className="cart-line-name">{item.name}</span>
                      <span className="cart-line-price">
                        {price ? price.display : '—'} <span>ج.م</span>
                        {price?.needsReview && (
                          <span
                            className="catalog-card-review"
                            title="سعر مصدره قائمة قديمة — قيد المراجعة مع المصدر"
                          >
                            *
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="cart-line-qty" aria-label="الكمية">
                      <button
                        type="button"
                        aria-label="تقليل الكمية"
                        disabled={item.qty <= 1}
                        onClick={() => updateQty(item.brand, item.name, item.qty - 1)}
                      >
                        −
                      </button>
                      <span className="cart-line-qty-value">{item.qty}</span>
                      <button
                        type="button"
                        aria-label="زيادة الكمية"
                        onClick={() => updateQty(item.brand, item.name, item.qty + 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="cart-line-total">
                      {lineTotal != null ? formatTotal(lineTotal) : '—'} <span>ج.م</span>
                    </div>
                    <button
                      type="button"
                      className="cart-line-remove"
                      onClick={() => removeItem(item.brand, item.name)}
                    >
                      إزالة
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="cart-summary">
              <span className="cart-summary-count">عدد القطع: {items.reduce((sum, item) => sum + item.qty, 0)}</span>
              <span className="cart-summary-total">
                الإجمالي التقريبي: {formatTotal(subtotal)} <span>ج.م</span>
              </span>
              <button type="button" className="cart-clear" onClick={clearCart}>
                تفريغ السلة
              </button>
              <p className="cart-summary-note">
                الإجمالي إرشادي فقط بالأسعار المعروضة بالموقع حاليًا — التوفر والسعر النهائي يتأكدون مع المعرض.
              </p>
            </div>

            <form className="cart-checkout" onSubmit={onSubmit}>
              <h3>بيانات التسليم</h3>
              <p className="cart-checkout-status">
                عند الإرسال يُسجَّل طلبك في نظام طلبات المعرض بحالة «قيد المراجعة» — لا دفع إلكتروني،
                والسعر النهائي والتوفر ورسوم التوصيل يتأكدون مع المعرض، والمتبقي يُسدَّد عند التسليم.
              </p>
              <label>
                الاسم
                <input type="text" value={form.name} onChange={onChange('name')} />
              </label>
              <label>
                رقم الهاتف
                <input type="tel" value={form.phone} onChange={onChange('phone')} />
              </label>
              <label>
                منطقة / عنوان التوصيل
                <input type="text" value={form.address} onChange={onChange('address')} />
              </label>
              <label>
                ملاحظات (اختياري)
                <textarea rows="2" value={form.notes} onChange={onChange('notes')} />
              </label>
              <button type="submit" disabled={order.phase === 'sending'}>
                {order.phase === 'sending' ? 'جاري إرسال الطلب…' : 'إتمام الطلب'}
              </button>
              {notice && <p className="cart-notice">{notice}</p>}
              {order.phase === 'error' && (
                <p className="cart-notice">لم يتم حفظ الطلب: {order.message}</p>
              )}
              {order.phase === 'unknown' && (
                <p className="cart-notice">
                  لم نتمكن من تأكيد وصول الطلب ({order.message}) — أعد المحاولة وسيُستخدم نفس مرجع
                  الطلب ({order.refForRetry}) بدون إنشاء صف مكرر.
                </p>
              )}
            </form>

            <p className="cart-policy">
              ملاحظة مهمة: إرسال الطلب لا يعتبر تأكيدًا للتوفر أو السعر النهائي. المعرض يراجع طلبك أصلًا:
              التوفر، السعر النهائي، ورسوم التوصيل (تُحدَّد بعد مراجعة عنوانك). الدفعة المقدمة ثابتة
              للطلب كله (5,000 ج.م) ولا تُحصَّل إلكترونيًا — تُدفع عند تأكيد المعرض، والمتبقي
              يُحدَّد بعد المراجعة ويُسدَّد عند التسليم.
            </p>
          </>
        )}
      </div>
    </section>
  )
}

export default Cart
