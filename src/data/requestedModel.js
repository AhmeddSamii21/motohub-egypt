/**
 * تخزين مؤقت للجلسة: اسم الموديل المختار من بطاقة الكتالوج
 * ليُسبق اختياره تلقائيًا في القائمة المنسدلة لنموذج الحجز.
 * القيمة حرفيًا من اسم الموديل المتوافق مع CATALOG (نفس ما تُرسله الورقة).
 */
export const REQUESTED_MODEL_KEY = 'motohub.requestedModel'

export function storeRequestedModel(name) {
  try {
    sessionStorage.setItem(REQUESTED_MODEL_KEY, name)
  } catch {
    // التخزين غير متاح (وضع خصوصية صارم) — يبقى الاختيار اليدوي يعمل
  }
}

export function readRequestedModel(allNames) {
  try {
    const stored = sessionStorage.getItem(REQUESTED_MODEL_KEY)
    return stored && allNames.includes(stored) ? stored : ''
  } catch {
    return ''
  }
}

export function clearRequestedModel() {
  try {
    sessionStorage.removeItem(REQUESTED_MODEL_KEY)
  } catch {
    // غير حرِج — ما نجح بحذف المفتاح يُتجاهل
  }
}
