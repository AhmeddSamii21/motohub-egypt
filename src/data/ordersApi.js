/**
 * ربط عربة الشراء بنظام طلبات MotoHub Orders (Google Apps Script مستقل تمامًا عن الحجوزات).
 * الاتفاق المُوثَّق من اختبار حي (2026-10-28/29):
 * - POST JSON: {orderRef, customerName, phone, address, customerNotes, items:[{brand, name, qty}]}
 * - الرد: {ok, saved, orderRef, status?, message?, depositRequired?, depositPaid?, duplicate?}
 * - الأسعار تُحسب على الخادم من ورقة Products — لا يُرسَل أي سعر أو إجمالي من المتصفح.
 * ملاحظة CORS (مُتحقَّق منها في متصفح حقيقي 2026-10-29): إرسال Content-Type: application/json
 * يُفشل الطلب (preflight مرفوض)، لذلك يُرسَل نفس جسم JSON بـ Content-Type: text/plain —
 * طلب بسيط بلا preflight والرد يُقرأ طبيعيًا. لا يُستخدم mode:"no-cors" حتى تُقرأ النتيجة الفعلية.
 * الرابط ثابت هنا فقط (مثل WEB_APP_URL في BookingForm) — لا يُنسخ إلى التوثيق أو التقارير.
 */
export const ORDERS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycby9Do8QuvJ8lmcqomrJSLE4VUZd4PLlxS7pqOlaxezyur20VT99OjY4phdUcRKluR-N/exec'

/** مرجع طلب فريد بالبادئة المتفق عليها MHB- (يتحقق منها الخادم) */
export function generateOrderRef() {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `MHB-${Date.now()}-${rand}`
}

/**
 * بناء الحِمل المُرسَل بالضبط — دالة واحدة يستخدمها الإرسال وحفظ المحاولة
 * حتى تكون إعادة المحاولة بنفس البيانات حرفيًا (لا نسختين تتفرّقان مع الوقت).
 */
export function buildOrderPayload(orderRef, customerInfo, cartItems) {
  return {
    orderRef,
    customerName: customerInfo.name,
    phone: customerInfo.phone,
    address: customerInfo.address,
    customerNotes: customerInfo.notes || '',
    // الأسماء والكميات فقط — السعر يُحسب على الخادم من ورقة Products
    items: cartItems.map((item) => ({ brand: item.brand, name: item.name, qty: item.qty })),
  }
}

/**
 * إرسال الطلب. النتيجة دائمًا كائن واحد:
 * - {ok:true, orderRef, status, duplicate, depositRequired, depositPaid}
 * - {ok:false, unknown:true, error}  → لم يتأكد الوصول (شبكة/رد غير متوقع) — آمن إعادة المحاولة بنفس المرجع
 * - {ok:false, unknown:false, error} → رفض من الخادم (تحقق/منتج غير معروف...)
 */
export async function submitOrder(orderRef, customerInfo, cartItems) {
  const payload = buildOrderPayload(orderRef, customerInfo, cartItems)

  let response
  try {
    response = await fetch(ORDERS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    })
  } catch {
    // فشل شبكة — لم يتأكد وصول الطلب، يُعاد استخدام نفس المرجع عند إعادة المحاولة
    return { ok: false, unknown: true, error: 'تعذر الاتصال بخدمة الطلبات.' }
  }

  let data
  try {
    data = await response.json()
  } catch {
    // رد غير قابل للقراءة — لا يُفترض نجاح ولا فشل حفظ
    return { ok: false, unknown: true, error: 'رد غير متوقع من خدمة الطلبات.' }
  }

  if (data && data.ok) {
    return {
      ok: true,
      orderRef: data.orderRef || orderRef,
      status: data.status || 'Pending',
      duplicate: Boolean(data.duplicate),
      depositRequired: typeof data.depositRequired === 'number' ? data.depositRequired : null,
      depositPaid: Boolean(data.depositPaid),
    }
  }
  return { ok: false, unknown: false, error: (data && data.error) || 'لم يتم حفظ الطلب.' }
}
