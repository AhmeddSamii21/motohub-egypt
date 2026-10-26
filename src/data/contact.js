/**
 * بيانات التواصل الرسمي — رقم واتساب المعتمد من صاحب المعرض (تم تزويده مؤكدًا).
 * الرقم بصيغة أرقام دولية فقط لرابط wa.me — لا نشر لأي وسيلة تواصل غير مُتحقَّق منها.
 * لا يُسجَّل أي طلب هنا: هذا رابط محادثة فقط، والحجز الرسمي يبقى عبر نموذج الحجز.
 */
export const WHATSAPP_NUMBER = '201140668488'

/** نص رسالة الاستفسار عن موديل محدد — الاسم يأتي من بيانات الكتالوج (لا من رابط غير موثوق) */
export function whatsappModelMessage(modelName) {
  return `أهلاً، أنا مهتم بـ ${modelName} من MotoHub Egypt. ممكن أعرف السعر والتوفر الحالي؟`
}

/** رابط محادثة واتساب جاهز — Arabic مُشفَّر بـ encodeURIComponent (المعيار الموصى به لـ wa.me) */
export function whatsappModelLink(modelName) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappModelMessage(modelName))}`
}
