/**
 * sync-stock.js — fase 3: توليد src/data/generatedStock.js من IRIDE Stock.xlsx.
 * (تبويب Stock + زوج A/B من تبويب iRide Price List 2026؛ لوحة L مستبعدة.)
 *
 * Node.js built-ins فقط (node:fs, node:zlib). لا يُعدّل catalog.js ولا مكونات الواجهة
 * ولا BookingForm.jsx. أي بنية غير متوقعة أو تعارض أسعار أو تعيّن غامق => إيقاف واضح.
 *
 * أولوية السعر (معتمدة): سعر Stock صالح مُطابَق → زوج A/B صالح → سعر الكتالوج مع needsReview.
 * المطابقة: تمام (ماركة+موديل) فقط، إضافةً إلى لافتة "Other" بنفس الاسم الحرفي تحت ماركة واحدة.
 * لا مطابقة ضبابية. Zahara 200 CC تبقى منفصلة عن Vieste 200 CC. لا أسعار مخترعة.
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const WORKBOOK = process.argv[2] || path.join(process.cwd(), 'IRIDE Stock.xlsx')
const OUT_FILE = path.join(process.cwd(), 'src/data/generatedStock.js')
const CATALOG_FILE = path.join(process.cwd(), 'src/data/catalog.js')
const AVAIL_MSG = 'متوفر حسب آخر سجل، يُرجى تأكيد الكمية مع الفرع'

// ---------- zip reader (منطق مُثَبت من الفحص) ----------
function readEntries(buf) {
  const map = Object.create(null)
  let off = 0
  while (off < buf.length - 4) {
    if (buf.readUInt32LE(off) !== 0x04034b50) { off++; continue }
    const method = buf.readUInt16LE(off + 8)
    const size = buf.readUInt32LE(off + 18)
    const nameLen = buf.readUInt16LE(off + 26)
    const extraLen = buf.readUInt16LE(off + 28)
    const name = buf.slice(off + 30, off + 30 + nameLen).toString('utf8')
    const start = off + 30 + nameLen + extraLen
    if (method === 0) map[name] = buf.slice(start, start + size)
    else if (method === 8) {
      try { map[name] = zlib.inflateRawSync(buf.slice(start)) } catch { map[name] = null }
    }
    const next = buf.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]), start + Math.max(size, 1))
    if (next === -1) break
    off = next
  }
  return map
}

const decodeXml = (s) =>
  String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

function fail(message) { console.error('ABORT: ' + message); process.exit(1) }
function expect(cond, message) { if (!cond) fail(message) }

const buf = fs.readFileSync(WORKBOOK)
const zip = readEntries(buf)
const needed = ['xl/workbook.xml', 'xl/sharedStrings.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml']
for (const f of needed) expect(zip[f] && zip[f].length > 0, `الملف لا يحتوي على ${f} — بنية غير متوقعة`)

const wbXml = zip['xl/workbook.xml'].toString('utf8')
const relsXml = zip['xl/_rels/workbook.xml.rels'].toString('utf8')
const rmap = Object.create(null)
for (const m of relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="(worksheets\/sheet\d+\.xml)"/g)) rmap[m[1]] = m[2]
const tabByTarget = Object.create(null)
for (const m of wbXml.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="(rId\d+)"/g)) {
  const target = rmap[m[2]]
  if (target) tabByTarget[target] = m[1]
}
expect(tabByTarget['worksheets/sheet1.xml'] === 'Stock', `التبويب الأول (${tabByTarget['worksheets/sheet1.xml']}) ليس "Stock" — بنية غير متوقعة`)
expect(tabByTarget['worksheets/sheet2.xml'] === 'iRide Price List 2026', `التبويب الثاني (${tabByTarget['worksheets/sheet2.xml']}) ليس "iRide Price List 2026" — بنية غير متوقعة`)

const shared = []
for (const m of zip['xl/sharedStrings.xml'].toString('utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
  shared.push(decodeXml(m[1].replace(/<[^>]+>/g, '')))
}

function rowCells(rowXml) {
  const cells = Object.create(null)
  for (const c of rowXml.matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const ref = (c[1].match(/r="([A-Z]+)\d+"/) || [])[1]
    if (!ref) continue
    const type = (c[1].match(/t="([^"]+)"/) || [])[1]
    let val
    if (type === 's') {
      const v = (c[2] || '').match(/<v>([\s\S]*?)<\/v>/)
      val = v ? shared[Number(v[1])] : undefined
    } else if (type === 'inlineStr') {
      val = (c[2] || '').replace(/<[^>]+>/g, '')
    } else {
      const v = (c[2] || '').match(/<v>([\s\S]*?)<\/v>/)
      val = v ? v[1] : undefined
    }
    if (val !== undefined && String(val).trim() !== '') cells[ref] = String(val).trim()
  }
  return cells
}

const rowsOf = (xml) => [...xml.matchAll(/<row [^>]*r="(\d+)"[\s\S]*?<\/row>/g)]
// مفتاح المطابقة: حروف صغيرة + إزالة كل المسافات (حساس للترقيم ولفروق 2v/4v)
const K = (s) => String(s).replace(/\s+/g, '').toLowerCase()

// ================= 1) تبويب Stock =================
const STOCK_HEADERS = ['Brand', 'Model', 'Color', 'Comment', 'Price', 'Branch']
const STOCK_BLOCKS = [
  { name: ' اليسار (B..G)', brand: 'B', model: 'C', price: 'F' },
  { name: ' اليمين (I..N)', brand: 'I', model: 'J', price: 'M' },
]

const stockXml = zip['xl/worksheets/sheet1.xml'].toString('utf8')
const stockRows = rowsOf(stockXml)

let headerIdx = -1
let headerCells = null
for (let i = 0; i < stockRows.length; i++) {
  const cells = rowCells(stockRows[i][0])
  if ((cells['B'] || '').toLocaleLowerCase('en') === 'brand' && (cells['C'] || '').toLocaleLowerCase('en') === 'model') {
    headerIdx = i
    headerCells = cells
    break
  }
}
expect(headerIdx !== -1, 'لم يُعثر على صف الرأس (B=Brand, C=Model) في تبويب Stock')
for (const block of STOCK_BLOCKS) {
  const want = ['B', 'C', 'D', 'E', 'F', 'G']
  expect(want.length === 6 && Object.keys(block).length >= 4, 'بنية كتلة غير صالحة')
  const colLetterForLabel = block.brand
  const cellsOrder = ['B', 'I'].includes(block.brand) ? ['B', 'C', 'D', 'E', 'F', 'G'] : ['I', 'J', 'K', 'L', 'M', 'N']
  void colLetterForLabel
  const got = cellsOrder.map((c) => (headerCells[c] || '').trim())
  const ok = got.every((v, i) => v.toLocaleLowerCase('en') === STOCK_HEADERS[i].toLocaleLowerCase('en'))
  expect(ok, `أسماء أعمدة "${block.name}" غير متوقعة: [${got.join(', ')}] والمطلوب [${STOCK_HEADERS.join(', ')}]`)
}

// أُسِجّل لكل مفتاح Stock عدد الوحدات ومجموعة أسعاره الصالحة (يجب أن تكون واحدة، وإلا إيقاف)
const stockByKey = new Map()
let stockUnitsTotal = 0
for (let i = headerIdx + 1; i < stockRows.length; i++) {
  const cells = rowCells(stockRows[i][0])
  for (const block of STOCK_BLOCKS) {
    const brand = (cells[block.brand] || '').trim()
    const model = (cells[block.model] || '').trim()
    if (!brand || !model) continue
    const raw = (cells[block.price] || '').trim()
    const digits = raw.replace(/,/g, '')
    let price = null
    if (/^\d+(\.\d+)?$/.test(digits)) {
      const num = Number(digits)
      if (Number.isFinite(num) && num > 0) price = raw
    }
    const key = `${K(brand)}|${K(model)}`
    let rec = stockByKey.get(key)
    if (!rec) {
      rec = { key, brand, model, count: 0, prices: new Map() }
      stockByKey.set(key, rec)
    }
    rec.count++
    stockUnitsTotal++
    if (price) rec.prices.set(price, (rec.prices.get(price) || 0) + 1)
  }
}
const conflicts = []
for (const rec of stockByKey.values()) {
  if (rec.prices.size > 1) conflicts.push({ key: rec.key, prices: [...rec.prices.keys()] })
}
expect(conflicts.length === 0, `تعارض أسعار داخل تبويب Stock لنفس الموديل: ${JSON.stringify(conflicts)}`)

// ================= 2) تبويب iRide Price List 2026 (زوج A/B فقط) =================
const HEADER_TEXTS = new Set(['سعر البيع', 'price']) // أنماط صف العنوان المعروفة (مُثبّتة بمرحلة 2)
const priceXml = zip['xl/worksheets/sheet2.xml'].toString('utf8')
const priceRows = rowsOf(priceXml)

const priceByKey = new Map()
let plHeaders = 0, plPairs = 0, plUnpriced = 0, plAOnly = 0
const unknownB = []
let currentBrand = null
let sawTitle = false
for (const r of priceRows) {
  const cells = rowCells(r[0])
  const a = (cells['A'] ?? '').trim()
  const b = (cells['B'] ?? '').trim()
  if (!a && !b) continue
  if (b && !/^\d+(\.\d+)?$/.test(b)) {
    const folded = decodeXml(b).replace(/\s+/g, ' ').trim().toLocaleLowerCase('en')
    if (folded === 'x') { plUnpriced++; continue }
    if (HEADER_TEXTS.has(folded)) {
      // صف عنوان: بنية رسمية مُثبَتة (الصف 1 = عنوان عمود B العام بلا ماركة؛ باقي الصفوف A=م特级)
      plHeaders++
      if (a) { currentBrand = a; sawTitle = true }
      continue
    }
    unknownB.push(`A${r[1]}=${JSON.stringify(a)} B${r[1]}=${JSON.stringify(b)}`)
    continue
  }
  if (!a) continue // B فقط بلا موديل في A — لا نستنتج شيئًا
  if (!b) { plAOnly++; continue }
  if (b === 'X') { plUnpriced++; continue }
  const key = `${currentBrand ? K(currentBrand) : ''}|${K(a)}`
  const existing = priceByKey.get(key)
  expect(existing === undefined || existing === b, `تعارض أسعار في قائمة الأسعار للمفتاح ${key}: ${existing} مقابل ${b} (الصف ${r[1]})`)
  priceByKey.set(key, b)
  plPairs++
}
expect(sawTitle, 'لم يُعثر على صف عنوان ماركة في قائمة الأسعار — بنية غير متوقعة')
expect(unknownB.length === 0, `نصوص غير متوقعة في العمود B بقائمة الأسعار: ${unknownB.join(' ; ')}`)

// ================= 3) الكتالوج الحالي (مُجمد) =================
const catalogSrc = fs.readFileSync(CATALOG_FILE, 'utf8')
const catalog = []
let cur = null
for (const line of catalogSrc.split(/\r?\n/)) {
  let m = line.match(/brand:\s*"([^"]+)"/)
  if (m) { cur = { brand: m[1].trim(), models: [] }; catalog.push(cur); continue }
  m = line.match(/name:\s*"(.*)",\s*price:\s*"([^"]*)"\s*\}/)
  if (m && cur) cur.models.push({ name: m[1].trim(), price: m[2].trim() })
}
expect(catalog.length > 0 && catalog.some((g) => g.models.length > 0), 'لم يُستخرَج أي موديل من catalog.js')

// فهرس الاسم المجرد — يُستخدم فقط للافتة "Other" التي ثُبِت أنها تعني ماركة الموقع الفعلية
const byName = new Map()
for (const g of catalog) for (const mo of g.models) {
  const k = K(mo.name)
  if (!byName.has(k)) byName.set(k, new Set())
  byName.get(k).add(g.brand)
}

const STOCK_ALIAS_LABELS = new Set(['other']) // لافتات مُثبَتة يُسمح بشفاء ماركتها

// ================= 4) التوليد =================
const report = { stock: 0, priceList: 0, catalogReview: 0 }
const usedStockKeys = new Set()
const workbookOnly = []
const finalRows = []
for (const g of catalog) {
  for (const mo of g.models) {
    const siteKey = `${K(g.brand)}|${K(mo.name)}`
    // (أ) مطابقة Stock مباشرة أو عبر لافتة Other
    let rec = stockByKey.get(siteKey) || null
    if (rec) usedStockKeys.add(siteKey)
    if (!rec) {
      const candidates = [...stockByKey.values()].filter(
        (r) => !usedStockKeys.has(r.key) && K(r.model) === K(mo.name) &&
          (STOCK_ALIAS_LABELS.has(K(r.brand)) || K(r.brand) === K(g.brand))
      )
      expect(candidates.length <= 1, `تعيّن غامق لـ "${g.brand} / ${mo.name}": ${candidates.length} سجلات Stock بنفس الاسم`)
      if (candidates.length === 1) {
        rec = candidates[0]
        usedStockKeys.add(rec.key)
      }
    }
    // (ب) الأولوية
    let entry
    if (rec && rec.prices.size === 1) {
      entry = { source: 'stock', price: [...rec.prices.keys()][0], units: rec.count }
      report.stock++
    } else if (rec && rec.prices.size === 0) {
      const plPrice = priceByKey.get(siteKey)
      if (plPrice !== undefined) {
        entry = { source: 'price-list', price: plPrice, units: rec.count }
        report.priceList++
      } else {
        entry = { source: 'catalog', price: mo.price, units: rec.count, review: true }
        report.catalogReview++
      }
    } else if (!rec) {
      const plPrice = priceByKey.get(siteKey)
      if (plPrice !== undefined) {
        entry = { source: 'price-list', price: plPrice, units: null }
        report.priceList++
      } else {
        entry = { source: 'catalog', price: mo.price, units: null, review: true }
        report.catalogReview++
      }
    }
    finalRows.push({ brand: g.brand, name: mo.name, entry })
  }
}

// مفاتيح Stock غير المنشورة (طابق خارطة العمل فقط)
for (const key of stockByKey.keys()) {
  if (!usedStockKeys.has(key)) {
    const rec = stockByKey.get(key)
    workbookOnly.push(`${rec.brand} | ${rec.model}`)
  }
}

// ================= 5) كتابة الملف =================
const lines = []
lines.push('/**')
lines.push(` * ملف مُولَّد آليًا — لا تعدّل يدويًا. المصدر: ${path.basename(WORKBOOK)} عبر scripts/sync-stock.js`)
lines.push(' * القاعدة المعتمدة: أولوية السعر Stock ← قائمة الأسعار (A/B) ← الكتالوج مع مراجعة؛')
lines.push(' * استحقاق التوفّر يظهر فقط عند عدد وحدات مسجّل > 0؛ لوحة L مستبعدة؛ لا أسعار مخترعة.')
lines.push(' */')
lines.push('')
lines.push(`export const AVAILABILITY_NOTE = '${AVAIL_MSG}'`)
lines.push('')
lines.push('export const MODELS = [')
for (const { brand, name, entry } of finalRows) {
  const fields = [
    `brand: ${JSON.stringify(brand)}`,
    `name: ${JSON.stringify(name)}`,
    `source: '${entry.source}'`,
    `price: ${JSON.stringify(entry.price)}`,
  ]
  if (entry.units != null) fields.push(`stockUnits: ${entry.units}`)
  if (entry.units > 0) fields.push('availabilityNote: AVAILABILITY_NOTE')
  if (entry.review) fields.push('needsReview: true')
  lines.push('  {')
  lines.push('    ' + fields.join(', '))
  lines.push('  },')
}
lines.push(']')
lines.push('')
lines.push(`export const META = ${JSON.stringify({ generatedAt: new Date().toISOString(), workbook: path.basename(WORKBOOK), siteModels: finalRows.length, priceSources: report, stockUnitsRecorded: stockUnitsTotal, stockKeysTotal: stockByKey.size, stockKeysUnpublished: workbookOnly.length, priceList: { brandHeaders: plHeaders, pricedPairs: plPairs, unpricedX: plUnpriced, nameOnlyRows: plAOnly }, availabilityNote: AVAIL_MSG }, null, 2)}`)
lines.push('')
fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf8')

// ================= 6) الملخص =================
const reviewModels = finalRows.filter((r) => r.entry.review).map((r) => `${r.brand} ${r.name}`)
const priceListModels = finalRows.filter((r) => r.entry.source === 'price-list').length
// الأزواج الرقمية في قائمة الأسعار غير المستخدمة — تُذكر بالأسماء (لا استنتاج صامت)
const unmatchedPlPairs = [...priceByKey.entries()]
  .filter(([k]) => !finalRows.some((r) => `${K(r.brand)}|${K(r.name)}` === k))
  .map(([k, v]) => `${k}=${v}`)
console.log(
  JSON.stringify(
    {
      generatedFile: path.relative(process.cwd(), OUT_FILE),
      siteModels: finalRows.length,
      priceSources: report,
      stockUnitsRecorded: stockUnitsTotal,
      stockKeysTotal: stockByKey.size,
      stockKeysUnpublished: workbookOnly.length,
      priceListModelsUsed: priceListModels,
      unmatchedPriceListPairs: unmatchedPlPairs,
      needsReviewModels: reviewModels,
      workbookOnlyExamples: workbookOnly.slice(0, 10),
      notes: 'لوحة L مستبعدة؛ Zahara 200 CC لم تُطابَق بـ Vieste 200 CC (منفصلة).',
    },
    null,
    2
  )
)
