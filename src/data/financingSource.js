/**
 * مصدر بيانات جهات التمويل — قراءة فقط من Google Sheets CSV.
 *
 * المرحلة 1 فقط: مُحمِّل بيانات مستقل ليس موصولًا بأي واجهة بعد.
 *
 * - المصدر: رابط CSV عام للقراءة فقط بنمط ‎/export?format=csv&gid=0‎
 *   (نمط مُختبَر ضد ورقة عرضية عامة من مستندات Google نفسها: 200، text/csv،
 *    وترويسة access-control-allow-origin: * ⇒ استدعاء fetch متصفحي عابر للمصدر يعمل).
 * - لا يوجد رابط ورقة حقيقي بعد — FINANCING_SHEET_URL فارغ عمدًا وتُعلَم الحالة
 *   "غير مُهيأ" بوضوح. المالك (وحده) يضع رابط ورقة "شروط التمويل" التي تحقق
 *   من كل صف فيها بنفسه؛ لا اسم شركة ولا معدل ولا رسم يُخترَع هنا.
 * - لا اعتماد على ورقة الحجز أو Apps Script أو دفتر العمل الخاص بأي شكل.
 * - لا يرمي استثناءات أبدًا: كل فشل (غير مُهيأ/شبكة/HTTP/HTML بدل CSV/CSV تالف/صف غير صالح)
 *   يُعاد كحالة ورسالة في النتيجة — عرض رسالة الاحتياطي مسؤولية واجهة المرحلة 2.
 * - كل قيمة رقمية/تصنيفية يجب أن يجيب عنها المالك وفق تعاقده مع الجهة الفعلية؛
 *   الصف الناقص أو الغامق ⇒ يُرفض الصف، لا يُخمَّن مطلقًا.
 */

/** رابط ورقة شروط التمويل العام للقراءة فقط — فارغ = غير مُهيأ (يملؤه المالك لاحقًا) */
export const FINANCING_SHEET_URL = ''

/** أنماط الإجابات الرسمية للحقول التصنيفية — أي قيمة أخرى تُرفض */
const ENABLED_VALUES = ['yes', 'no']
const RATE_PERIOD_VALUES = ['monthly', 'annual']
const METHOD_VALUES = ['flat', 'reducing']
const MIN_DOWN_TYPE_VALUES = ['percent', 'fixed']
const FEES_METHOD_VALUES = ['upfront', 'financed']

/** رؤوس CSV المطلوبة — عمود ناقص ⇒ الورقة كلها مرفوضة (لا يُخمَّن عمود من موقعه) */
const REQUIRED_HEADERS = [
  'companyId',
  'companyName',
  'enabled',
  'interestRate',
  'interestRatePeriod',
  'interestMethod',
  'minimumDownPaymentType',
  'minimumDownPaymentValue',
  'availableTenuresMonths',
  'administrativeFees',
  'feesPaymentMethod',
  'eligibleModels',
  'displayOrder',
  'lastUpdated',
]

/** ترميز حالات التحميل — تفرّق صريح بين "غير مُهيأ" و"فشل" و"بيانات نظيفة" */
export const FINANCING_STATUS = {
  UNCONFIGURED: 'unconfigured', // لا رابط بعد — واجهة المرحلة 2 تعرض خطة الاحتياطي المُعلَّمة
  ERROR: 'error',               // شبكة/HTTP/محتوى غير CSV/رؤوس مفقودة
  OK: 'ok',                     // تحليل ناجح (companies قد تكون فارغة لو رُفضت كل الصفوف)
}

const NO_COMPANIES = Object.freeze([]) // ثابت مشترك — لا مصفوفة جديدة لكل نتيجة فشل

/**
 * مُحلِّل CSV صغير بلا اعتماديات: يتعامل مع الحقول المقتبسة والفواصل داخلها
 * والاقتباس المزدوج الهارب و \r\n و BOM. الصفوف الفارغة تمامًا تُسقَط.
 */
export function parseCsvRows(raw) {
  const text = String(raw).replace(/^\uFEFF/, '')
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else {
      cell += ch
    }
  }
  row.push(cell)
  if (row.length > 1 || row[0] !== '') rows.push(row)
  return rows
}

/** "12" ⇒ 12 صارم ودون فواصل آلاف أو مسافات — أي غموض ⇒ null */
function toStrictNumber(value) {
  const trimmed = String(value ?? '').trim()
  if (trimmed === '' || /[,\s]/.test(trimmed)) return null
  const num = Number(trimmed)
  return Number.isFinite(num) ? num : null
}

/** تحليل صف الرؤوس: trim + lowercase + خريطة اسم ⇒ فهرس أول ظهور */
function buildHeaderIndex(headerCells) {
  const byName = new Map()
  headerCells.forEach((cell, index) => {
    const normalized = String(cell).trim().toLowerCase()
    if (normalized && !byName.has(normalized)) byName.set(normalized, index)
  })
  const missing = REQUIRED_HEADERS.filter((name) => !byName.has(name.toLowerCase()))
  return { byName, missing }
}

/** تحليل أدوار القسط: "12, 18,24" ⇒ [12,18,24] مرتّبًا — أي فترة غير صحيحة ⇒ null */
function parseTenures(value) {
  const tenors = []
  const seen = new Set()
  for (const part of String(value ?? '').split(',')) {
    const num = toStrictNumber(part)
    if (num === null || !Number.isInteger(num) || num <= 0 || seen.has(num)) return null
    seen.add(num)
    tenors.push(num)
  }
  if (tenors.length === 0) return null
  return tenors.sort((a, b) => a - b)
}

/** تحليل الموديلات المؤهلة: حرفيًا "all" ⇒ []، وإلا قائمة أسماء غير فارغة وإلا null */
function parseEligibleModels(value) {
  const trimmed = String(value ?? '').trim()
  if (trimmed.toLowerCase() === 'all') return []
  const names = trimmed.split(',').map((name) => name.trim()).filter((name) => name !== '')
  return names.length > 0 ? names : null
}

/**
 * تحليل + تحقق صارم من CSV الجهات. دالة نقية بلا شبكة — قابلة للفحص مباشرة.
 * لا ترمي استثناءات: رفض الصف يُسجَّل والبقية تُكمَل.
 * @returns {{ companies: Array, rejected: Array<{row: number, reason: string}> } | null}
 *          null فقط لو الرؤوس المطلوبة ناقصة أو لا صفوف بيانات بعد الرأس —
 *          يُفسَّر ثم كورقة غير صالحة كلية.
 */
export function parseFinancingCsv(raw) {
  const rows = parseCsvRows(raw)
  if (rows.length === 0) return null
  const { byName, missing } = buildHeaderIndex(rows[0])
  if (missing.length > 0) return null

  const getCell = (row, name) => {
    const cell = row[byName.get(name.toLowerCase())]
    return cell === undefined ? '' : String(cell).trim()
  }

  const companies = []
  const rejected = []
  const seenIds = new Set()

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]
    const reject = (reason) => rejected.push({ row: rowIndex, reason })

    // صف فارغ تمامًا (كل خلاياه فارغة) يُسقَط بصمت — ليست نية إدخال بيت
    if (row.every((cell) => String(cell).trim() === '')) continue

    // 1) الهوية والاسم — مطلوبان حرفيًا، المعرّف مكرر يمنع الالتباس
    const companyId = getCell(row, 'companyId')
    const companyName = getCell(row, 'companyName')
    if (companyId === '') { reject('companyId فارغ'); continue }
    if (seenIds.has(companyId.toLowerCase())) { reject(`companyId مكرر: ${companyId}`); continue }
    if (companyName === '') { reject('companyName فارغ'); continue }

    // 2) الحقول التصنيفية — فقط الأنماط الرسمية أعلاه
    const enabled = getCell(row, 'enabled').toLowerCase()
    if (!ENABLED_VALUES.includes(enabled)) { reject(`enabled غير صالح: "${getCell(row, 'enabled')}"`); continue }

    const interestRate = toStrictNumber(getCell(row, 'interestRate'))
    if (interestRate === null || interestRate < 0) { reject(`interestRate غير صالح: "${getCell(row, 'interestRate')}"`); continue }

    const interestRatePeriod = getCell(row, 'interestRatePeriod').toLowerCase()
    if (!RATE_PERIOD_VALUES.includes(interestRatePeriod)) { reject(`interestRatePeriod غير صالح: "${getCell(row, 'interestRatePeriod')}"`); continue }

    const interestMethod = getCell(row, 'interestMethod').toLowerCase()
    if (!METHOD_VALUES.includes(interestMethod)) { reject(`interestMethod غير صالح: "${getCell(row, 'interestMethod')}"`); continue }

    const minimumDownPaymentType = getCell(row, 'minimumDownPaymentType').toLowerCase()
    if (!MIN_DOWN_TYPE_VALUES.includes(minimumDownPaymentType)) { reject(`minimumDownPaymentType غير صالح: "${getCell(row, 'minimumDownPaymentType')}"`); continue }

    // 3) المبلغ الأدنى للدفعة الأولى — نسبة 0..100 أو مبلغ EGP ≥ 0 (السقف نفسه يتحقق لكل موديل لاحقًا)
    const minimumDownPaymentValue = toStrictNumber(getCell(row, 'minimumDownPaymentValue'))
    if (minimumDownPaymentValue === null
      || (minimumDownPaymentType === 'percent' && (minimumDownPaymentValue <= 0 || minimumDownPaymentValue > 100))
      || (minimumDownPaymentType === 'fixed' && minimumDownPaymentValue < 0)) {
      reject(`minimumDownPaymentValue غير صالح: "${getCell(row, 'minimumDownPaymentValue')}"`); continue
    }

    // 4) الأدوار والرسوم — كلها مطلوبة صراحة، لا افتراض صامت
    const availableTenuresMonths = parseTenures(getCell(row, 'availableTenuresMonths'))
    if (!availableTenuresMonths) { reject(`availableTenuresMonths غير صالح: "${getCell(row, 'availableTenuresMonths')}"`); continue }

    const administrativeFees = toStrictNumber(getCell(row, 'administrativeFees'))
    if (administrativeFees === null || administrativeFees < 0) { reject(`administrativeFees غير صالح: "${getCell(row, 'administrativeFees')}"`); continue }

    const feesPaymentMethod = getCell(row, 'feesPaymentMethod').toLowerCase()
    if (!FEES_METHOD_VALUES.includes(feesPaymentMethod)) { reject(`feesPaymentMethod غير صالح: "${getCell(row, 'feesPaymentMethod')}"`); continue }

    // 5) الموديلات المؤهلة — قائمة أسماء من كتالوج الموقع (تدقيق المطابقة مع الكتالوج مسؤولية المرحلة 2)
    const eligibleModels = parseEligibleModels(getCell(row, 'eligibleModels'))
    if (eligibleModels === null) { reject(`eligibleModels غير صالح: "${getCell(row, 'eligibleModels')}"`); continue }

    // 6) الترتيب وتاريخ التحديث — صريحان دائمًا
    const displayOrder = toStrictNumber(getCell(row, 'displayOrder'))
    if (displayOrder === null || !Number.isInteger(displayOrder) || displayOrder < 0) { reject(`displayOrder غير صالح: "${getCell(row, 'displayOrder')}"`); continue }

    const lastUpdated = getCell(row, 'lastUpdated')
    if (lastUpdated === '') { reject('lastUpdated فارغ'); continue }

    seenIds.add(companyId.toLowerCase())
    companies.push({
      companyId,
      companyName,
      enabled: enabled === 'yes',
      // المعدل رقم مئوي كما ورد في التعاقد (1.5 = 1.5%) — التحويل والفرع الحسابي في المرحلة 2
      interestRatePercent: interestRate,
      interestRatePeriod,
      interestMethod,
      minimumDownPaymentType,
      minimumDownPaymentValue,
      availableTenuresMonths,
      administrativeFees,
      feesPaymentMethod,
      // [] تعني "الكل" — تمييز صريح عن قائمة محددة
      eligibleModels,
      displayOrder,
      lastUpdated,
    })
  }

  return { companies, rejected }
}

/** تحميل جهات التمويل من الرابط المُعدّ — كل فشل يُعاد كحالة ورسالة، لا استثناء أبدًا */
export async function loadFinancingCompanies() {
  if (!FINANCING_SHEET_URL) {
    return {
      status: FINANCING_STATUS.UNCONFIGURED,
      companies: NO_COMPANIES,
      rejected: NO_COMPANIES,
      message: 'FINANCING_SHEET_URL is not set yet — financing source unconfigured, no data loaded',
    }
  }

  let response
  try {
    response = await fetch(FINANCING_SHEET_URL, { redirect: 'follow' })
  } catch (error) {
    return {
      status: FINANCING_STATUS.ERROR,
      companies: NO_COMPANIES,
      rejected: NO_COMPANIES,
      message: `Network error: ${error && error.message ? error.message : 'unknown'}`,
    }
  }

  if (!response.ok) {
    return {
      status: FINANCING_STATUS.ERROR,
      companies: NO_COMPANIES,
      rejected: NO_COMPANIES,
      message: `HTTP ${response.status}`,
    }
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase()
  let text = ''
  try {
    text = await response.text()
  } catch (error) {
    return {
      status: FINANCING_STATUS.ERROR,
      companies: NO_COMPANIES,
      rejected: NO_COMPANIES,
      message: `Response read error: ${error && error.message ? error.message : 'unknown'}`,
    }
  }

  // صفحة خطأ HTML بدل CSV (خطأ Sheet الشائع) — والرأس text/html يُرفض أيضًا
  const looksLikeHtml = /^\s*<(!doctype|html)/i.test(text)
  if (looksLikeHtml || contentType.includes('text/html')) {
    return { status: FINANCING_STATUS.ERROR, companies: NO_COMPANIES, rejected: NO_COMPANIES, message: 'Received HTML instead of CSV' }
  }

  const parsed = parseFinancingCsv(text)
  if (!parsed) {
    return { status: FINANCING_STATUS.ERROR, companies: NO_COMPANIES, rejected: NO_COMPANIES, message: 'Rejected CSV: missing required headers or no data rows' }
  }
  return { status: FINANCING_STATUS.OK, companies: parsed.companies, rejected: parsed.rejected, message: '' }
}
