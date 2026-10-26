/**
 * sync-model-details.js — توليد src/data/generatedModelDetails.js من تبويب DATA
 * في IRIDE Stock.xlsx: مواصفات تقنية + ألبومة صور مباشرة (أو رابط ألبوم خارجي).
 *
 * Node.js built-ins فقط. لا يعدّل أي ملف آخر. قواعد مُثبَتة:
 *  - المطابقة: تمام (ماركة|موديل) أولاً؛ ثم مرشّح بالاسم المطابق حرفيًا (بعد توحيد
 *    الحالة/المسافات) بشرط أن يكون مرشّحًا فريدًا واحدًا — لا تخمين، لا تشابه جزئي.
 *  - سجل DATA الواحد يُستهلك مرة واحدة على الأكثر؛ أي تعارض أو غموض => إيقاف واضح.
 *  - لا تُصدَّر بيانات حسّية: وكيل مصر (D)، تفاصيل التوفر/الفرع (V)، سعر DATA نفسه (F)،
 *    العربي B، الموديل/السنة U، عمود البحث Y — الكتالوج هو مصدر الأسماء والأسعار المُعروضة.
 *  - القيم "-" أو الفارغة تُهمل (لا placeholders).
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const WORKBOOK = process.argv[2] || path.join(process.cwd(), 'IRIDE Stock.xlsx')
const OUT_FILE = path.join(process.cwd(), 'src/data/generatedModelDetails.js')
const CATALOG_FILE = path.join(process.cwd(), 'src/data/catalog.js')

// ------------------------------------------------ reader (منطق مُثَبت في sync-stock.js)
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
const wbXml = zip['xl/workbook.xml'].toString('utf8')
const relsXml = zip['xl/_rels/workbook.xml.rels'].toString('utf8')
const rmap = Object.create(null)
for (const m of relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="(worksheets\/sheet\d+\.xml)"/g)) rmap[m[1]] = m[2]
const dataTarget = Object.create(null)
for (const m of wbXml.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="(rId\d+)"/g)) {
  if (rmap[m[2]]) dataTarget[m[1]] = rmap[m[2]]
}
expect(dataTarget.DATA === 'worksheets/sheet3.xml', `تبويب DATA غير موجود في الموضع المتوقع (${dataTarget.DATA || 'الأصل'}) `)

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

// ------------------------------------------------ DATA sheet
const SPEC_COLS = [
  { col: 'E', expect: 'نوع المركبة' },
  { col: 'G', expect: 'سعة المحرك / القدرة' },
  { col: 'H', expect: 'نوع المحرك' },
  { col: 'I', expect: 'ناقل الحركة' },
  { col: 'J', expect: 'السرعة القصوى' },
  { col: 'K', expect: 'سعة الوقود / الشحنة الكاملة' },
  { col: 'L', expect: 'نوع الفرامل' },
  { col: 'M', expect: 'نوع تبريد الحرارة' },
  { col: 'N', expect: 'نظام حقن الوقود' },
  { col: 'O', expect: 'نوع العداد' },
  { col: 'P', expect: 'نوع الإضائة' },
  { col: 'Q', expect: 'عدد المساعدين' },
  { col: 'R', expect: 'مقاس الإطار الأمامي' },
  { col: 'S', expect: 'مقاس الإطار الخلفي' },
  { col: 'T', expect: 'الضمان' },
]

const dataRows = rowsOf(zip[`xl/${dataTarget.DATA}`].toString('utf8'))
expect(dataRows.length > 0, 'تبويب DATA فارغ — بنية غير متوقعة')

// الصف 1 = صف الرأس؛ نتحقق من المفاتيح التي نستخدمها حرفيًا — لا إكمال
const headerCells = rowCells(dataRows[0][0])
const headerExpect = { A: 'Name', C: 'Brand', W: 'ألبوم صور', ...Object.fromEntries(SPEC_COLS.map((s) => [s.col, s.expect])) }
for (const [col, want] of Object.entries(headerExpect)) {
  expect(headerCells[col]?.trim() === want, `رأس العمود ${col} في DATA غير متوقع: ${JSON.stringify(headerCells[col] || '')} والمطلوب ${JSON.stringify(want)}`)
}

// ------------------------------------------------ سجلات DATA
const records = []
for (let i = 1; i < dataRows.length; i++) {
  const n = Number(dataRows[i][0].match(/r="?(\d+)/)[1])
  const cells = rowCells(dataRows[i][0])
  const name = (cells['A'] || '').trim()
  if (!name) continue
  records.push({ row: n, name, brand: (cells['C'] || '').trim(), cells })
}
expect(records.length > 0, 'لا سجلات في تبويب DATA')

const K = (s) => String(s).replace(/\s+/g, '').toLowerCase()

// صور W: روابط صور مباشرة مفصولة بفواصل (لاتينية/عربية) أو أسطر — تحقق شكل URL ثم تجريد الفواصل
function parseImages(raw) {
  if (!raw) return []
  const parts = String(raw).split(/[\n,،;]+/)
  const seen = new Set()
  const out = []
  for (const p of parts) {
    const u = p.trim().replace(/,،?$/, '').trim()
    if (!/^https:\/\/[^\s]+\.?(png|jpe?g|webp)$/i.test(u.replace(/[?#].*$/, ''))) continue
    if (seen.has(u)) continue
    seen.add(u)
    out.push(u)
  }
  return out
}
// رابط ألبوم X: صفحة ألبوم عامة (Google Photos share) — نستخدمها كرابط خارجي فقط
function parseAlbum(raw) {
  const u = (raw || '').trim()
  return /^https:\/\//.test(u) ? u : null
}

// ------------------------------------------------ الكتالوج (مجمد) — نفس مستخرج sync-stock المُثبَت
const catalogSrc = fs.readFileSync(CATALOG_FILE, 'utf8')
const catalog = []
let cur = null
for (const line of catalogSrc.split(/\r?\n/)) {
  let m = line.match(/brand:\s*"([^"]+)"/)
  if (m) { cur = { brand: m[1].trim(), models: [] }; catalog.push(cur); continue }
  m = line.match(/name:\s*"(.*)",\s*price:\s*"([^"]*)"\s*\}/)
  if (m && cur) cur.models.push({ name: m[1].trim(), price: m[2].trim() })
}
expect(catalog.length > 0 && catalog.some((g) => g.models.length > 0), 'لم يُستخرج أي موديل من catalog.js')

const byRecordBrandName = new Map()
const byRecordName = new Map()
for (const r of records) {
  const bk = `${K(r.brand)}|${K(r.name)}`
  const nk = K(r.name)
  // مفتاح مكرر (كخوذ Axor) يظل مُسمومًا: لا يُستهلك أبدًا، والاستهلاك المحتمل يُوقف بوضوح
  if (byRecordBrandName.has(bk)) r.dup = true
  byRecordBrandName.set(bk, r)
  if (!byRecordName.has(nk)) byRecordName.set(nk, [])
  byRecordName.get(nk).push(r)
}

// ------------------------------------------------ المطابقة
const usedRows = new Set()
const nameOnlyApproved = []
const generated = []
for (const g of catalog) {
  for (const mo of g.models) {
    let rec = byRecordBrandName.get(`${K(g.brand)}|${K(mo.name)}`) || null
    let via = rec ? 'brand|name' : null
    if (!rec) {
      const candidates = byRecordName.get(K(mo.name)) || []
      expect(candidates.length <= 1, `تعيّن غامق للاسم "${mo.name}" (${g.brand}): ${candidates.length} سجلات DATA بنفس الاسم المطابق حرفيًا`)
      if (candidates.length === 1) { rec = candidates[0]; via = 'name-only' }
    }
    if (!rec) continue
    expect(!rec.dup, `تعيّن غامق: مفتاح DATA المكرر "${rec.brand}" / "${rec.name}" طابَق موديل الكتالوج ${g.brand} / ${mo.name} — ممنوع الدمج بلا قرار`)
    expect(!usedRows.has(rec.row), `سجل DATA صف ${rec.row} استُهلك مرتين (${g.brand} / ${mo.name})`)
    usedRows.add(rec.row)
    if (via === 'name-only') nameOnlyApproved.push(`${g.brand} / ${mo.name} -> DATA صف ${rec.row}`)

    const specs = []
    for (const { col } of SPEC_COLS) {
      const v = (rec.cells[col] || '').trim()
      if (!v || v === '-') continue
      specs.push({ label: headerCells[col].trim(), value: v })
    }
    const images = parseImages(rec.cells['W'])
    const album = parseAlbum(rec.cells['X'])
    if (specs.length === 0 && images.length === 0 && !album) continue // لا قيمة جديدة منشورة لهذا الموديل
    const entry = { brand: g.brand, name: mo.name, specs }
    if (images.length > 0) entry.images = images
    else if (album) entry.albumUrl = album
    generated.push(entry)
  }
}

// ------------------------------------------------ كتابة الملف المُولَّد
const lines = [
  '/**',
  ' * ملف مُولَّد آليًا — لا تُعدّل يدويًا.',
  ` * المصدر: ${path.basename(WORKBOOK)} (تبويب DATA) عبر scripts/sync-model-details.js`,
  ' * المواصفات والصور من سجلات DATA المُطابَقة (تام brand|name، أو اسم مطابق حرفيًا فريدًا) —',
  ' * بلا قيم مخترعة، وتُهمل القيم الفارغة/"-". لا بيانات توزيع/فرع/أسعار داخلية هنا؛',
  ' * الأسعار والأسماء المُعروضة تظل من الكتالوج المجمد ومنطق المزامنة الحالي.',
  ' */',
  '',
  'export const MODEL_DETAILS = [',
]
for (const e of generated) {
  lines.push('  {')
  lines.push(`    brand: ${JSON.stringify(e.brand)},`)
  lines.push(`    name: ${JSON.stringify(e.name)},`)
  lines.push('    specs: [')
  for (const s of e.specs) lines.push(`      { label: ${JSON.stringify(s.label)}, value: ${JSON.stringify(s.value)} },`)
  lines.push('    ],')
  if (e.images) {
    lines.push('    images: [')
    for (const u of e.images) lines.push(`      ${JSON.stringify(u)},`)
    lines.push('    ],')
  }
  if (e.albumUrl) lines.push(`    albumUrl: ${JSON.stringify(e.albumUrl)},`)
  lines.push('  },')
}
lines.push(']')
lines.push('')

fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf8')
console.log(`OK: ${generated.length} سجل موديل (من ${usedRows.size} سجل DATA مُطابَق)`)
console.log(`  مواصفات: ${generated.filter((e) => e.specs.length > 0).length}`)
console.log(`  ألبومة صور مباشرة: ${generated.filter((e) => e.images).length}`)
console.log(`  رابط ألبوم خارجي فقط: ${generated.filter((e) => e.albumUrl).length}`)
if (nameOnlyApproved.length) {
  console.log('مطابقات الاسم الفريد (مراجعة يدوية):')
  for (const n of nameOnlyApproved) console.log('  ' + n)
}
