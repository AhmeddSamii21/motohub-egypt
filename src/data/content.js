/**
 * بيانات تجريبية (Placeholder) — أرقام وأسعار غير حقيقية للأغراض التجريبية فقط.
 * لا تمثل أي ارتباط رسمي بعلامات تجارية.
 */

export const BRANDS = [
  { id: 'zontes', name: 'Zontes' },
  { id: 'keeway', name: 'Keeway' },
  { id: 'sym', name: 'SYM' },
  { id: 'benelli', name: 'Benelli' },
  { id: 'haojing', name: 'Haojing' },
]

export const FEATURED_MODELS = [
  {
    id: 'zt-125',
    name: 'Zontes ZT125-U',
    category: 'موتسيكل شارع',
    displacement: '125cc',
    price: 86500,
  },
  {
    id: 'rfs-150',
    name: 'Keeway RKF 150',
    category: 'موتسيكل شارع',
    displacement: '150cc',
    price: 72900,
  },
  {
    id: 'sym-jet',
    name: 'SYM Jet X 125',
    category: 'سكوتر',
    displacement: '125cc',
    price: 68400,
  },
  {
    id: 'bn-251',
    name: 'Benelli 251S',
    category: 'موتسيكل شارع',
    displacement: '250cc',
    price: 149000,
  },
  {
    id: 'hj-150',
    name: 'Haojing HJ150',
    category: 'موتسيكل عملي',
    displacement: '150cc',
    price: 52000,
  },
  {
    id: 'sym-fiddle',
    name: 'SYM Fiddle IV',
    category: 'سكوتر',
    displacement: '125cc',
    price: 61000,
  },
]

export const FEATURES = [
  {
    id: 'warranty',
    title: 'ضمان موثّق',
    text: 'عرض توضيحي لميزة خدمة ما بعد البيع — بلا التزامات فعلية.',
  },
  {
    id: 'maintenance',
    title: 'صيانة دورية',
    text: 'عرض توضيحي لميزة صيانة — بلا التزامات فعلية.',
  },
  {
    id: 'parts',
    title: 'قطع غيار',
    text: 'عرض توضيحي لتوفر قطع الاستهلاك — بلا التزامات فعلية.',
  },
  {
    id: 'test-ride',
    title: 'تجربة قيادة',
    text: 'عرض توضيحي — حجز المعاينة عبر النموذج في الموقع التجريبي فقط.',
  },
]

// أرقام لاتينية بفواصل عادية — أوضح للعرض من الفواصل العربية في بعض الخطوط
export const formatPrice = (value) =>
  new Intl.NumberFormat('ar-EG-u-nu-latn', { maximumFractionDigits: 0 }).format(value)
