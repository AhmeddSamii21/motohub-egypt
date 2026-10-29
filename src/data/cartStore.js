/**
 * سلة الشراء المؤقتة — تخزين جلسة فقط (sessionStorage) بلا أي خادم أو إرسال بيانات.
 * كل موديل يُعرَّف بمفتاح brand|name نفسه المستخدم في الكتالوج والبيانات المُولَّدة،
 * والكمية رقم صحيح ≥ 1. لا تُخزَّن هنا أي بيانات عميل — الطلب لم يُوصَّل بأي خدمة بعد.
 * البيانات غير الصالحة أو المفقودة تُتجاهَل بأمان (تُرجع سلة فاضية) ولا تُرمي أخطاء أبدًا.
 */
export const CART_STORAGE_KEY = 'motohub.cart'

/** حدث مخصص يُطلَق عند أي تغيير في السلة — لتحديث الشارة والصفحة فورًا */
export const CART_EVENT = 'motohub:cart-changed'

/** تنظيف آمن لأي قيمة مقروءة: عناصر صالحة فقط (نصوص brand/name + كمية صحيحة ≥ 1) */
function sanitize(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const items = []
  for (const entry of raw) {
    if (!entry || typeof entry.brand !== 'string' || typeof entry.name !== 'string') continue
    if (!entry.brand || !entry.name || seen.has(`${entry.brand}|${entry.name}`)) continue
    seen.add(`${entry.brand}|${entry.name}`)
    const qty = Number(entry.qty)
    items.push({ brand: entry.brand, name: entry.name, qty: Number.isInteger(qty) && qty > 0 ? qty : 1 })
  }
  return items
}

/** القراءة الآمنة — أي تلف/غياب في التخزين يُرجع سلة فاضية (ولا يُحذف ما فهم نصفه) */
export function readCart() {
  try {
    return sanitize(JSON.parse(sessionStorage.getItem(CART_STORAGE_KEY) || '[]'))
  } catch {
    return []
  }
}

/** حفظ + إطلاق الحدث — أي فشل تخزين (وضع خصوصية صارم) يُتجاهَل بصمت مثل requestedModel */
function persist(items) {
  try {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // التخزين غير متاح — السلة تبقى في الذاكرة لهذه الجلسة فقط
  }
  window.dispatchEvent(new CustomEvent(CART_EVENT))
}

/** إضافة موديل: كمية 1 لو جديد، أو زيادة الكمية لو موجود أصلًا */
export function addItem(brand, name) {
  const items = readCart()
  const existing = items.find((i) => i.brand === brand && i.name === name)
  if (existing) existing.qty += 1
  else items.push({ brand, name, qty: 1 })
  persist(items)
}

/** تحديث كمية موديل موجود — لا يُنشئ عنصرًا ولا يقبِل كمية أقل من 1 */
export function updateQty(brand, name, qty) {
  const next = Number(qty)
  if (!Number.isInteger(next) || next < 1) return
  const items = readCart()
  const existing = items.find((i) => i.brand === brand && i.name === name)
  if (!existing || existing.qty === next) return
  existing.qty = next
  persist(items)
}

/** إزالة موديل من السلة */
export function removeItem(brand, name) {
  const filtered = readCart().filter((i) => !(i.brand === brand && i.name === name))
  persist(filtered)
}

/** تفريغ السلة بالكامل */
export function clearCart() {
  try {
    sessionStorage.removeItem(CART_STORAGE_KEY)
  } catch {
    // غير حرِج — يُطابق سلوك clearRequestedModel
  }
  window.dispatchEvent(new CustomEvent(CART_EVENT))
}

/** عدد القطع الإجمالي (مجموع الكميات لا عدد الموديلات) — للشارة في الهيدر */
export function cartCount() {
  return readCart().reduce((sum, item) => sum + item.qty, 0)
}
