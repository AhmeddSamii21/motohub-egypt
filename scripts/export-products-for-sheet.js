import fs from 'node:fs'
import path from 'node:path'

// قراءة البيانات المولّدة
const STOCK_FILE = path.join(process.cwd(), 'src/data/generatedStock.js')
const content = fs.readFileSync(STOCK_FILE, 'utf8')

// استخراج مصفوفة MODELS
const modelsStart = content.indexOf('export const MODELS = [')
if (modelsStart === -1) {
  console.error('❌ لم يتم العثور على export const MODELS')
  process.exit(1)
}

// ابدأ من بعد 'export const MODELS = [' وابحث ]; 
const afterStart = content.substring(modelsStart + 21) // +21 to skip past 'export const MODELS = ['
let modelsEnd = -1

if (afterStart.indexOf('];') !== -1) {
  modelsEnd = afterStart.indexOf('];')
} else {
  console.error('❌ لم يتم العثور على نهاية MODELS ]')
  console.log('Looking for closing bracket manually...')
  
  // manual search for ]
  let bracketCount = 0
  let foundEnd = -1
  for (let i = 0; i < afterStart.length; i++) {
    if (afterStart[i] === '{') bracketCount++
    if (afterStart[i] === '}') bracketCount--
    if (afterStart[i] === ']' && bracketCount === 0) {
      foundEnd = i
      break
    }
  }
  
  if (foundEnd === -1) {
    console.error('❌ لم يتم العثور على ] مغلق')
    process.exit(1)
  }
  
  modelsEnd = foundEnd
}

const modelsText = afterStart.substring(0, modelsEnd)
console.log('Found MODELS section, length:', modelsText.length)

// الآن استخراج الكائنات - بديل بسيط
const models = []
const lines = modelsText.split('\n')
for (const line of lines) {
  // البحث عن {brand: "NAME", name: "NAME", source: 'SOURCE', price: "PRICE", ...}
  const brandMatch = line.match(/brand:\s*"([^"]+)"/)
  const nameMatch = line.match(/name:\s*"([^"]+)"/)
  const sourceMatch = line.match(/source:\s*'([^']+)'/)
  const priceMatch = line.match(/price:\s*"([^"]+)"/)
  
  if (brandMatch && nameMatch && sourceMatch && priceMatch) {
    models.push({
      brand: brandMatch[1],
      name: nameMatch[1],
      source: sourceMatch[1],
      price: priceMatch[1]
    })
  }
}

console.log(`Successfully extracted ${models.length} models`)

// تصفية: فقط source 'stock' أو 'price-list' + سعر رقمي بحت + needsReview !== true
const trustedModels = models.filter(model => {
  const isTrustedSource = model.source === 'stock' || model.source === 'price-list'
  const isNumericPrice = /^\d+$/.test(model.price)
  const notNeedsReview = model.needsReview !== true
  return isTrustedSource && isNumericPrice && notNeedsReview
})

console.log(`Trusted models: ${trustedModels.length}`)

// إنشاء CSV
const headers = ['Brand', 'Name', 'Price', 'Source', 'NeedsReview']
const csvRows = [
  headers.join(','),
  ...trustedModels.map(model => [
    `"${model.brand}"`,
    `"${model.name}"`,
    model.price,
    `"${model.source}"`,
    model.needsReview || 'false'
  ].join(','))
]

const csvContent = csvRows.join('\n')

// اسم الملف مع التاريخ
const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const outputFile = path.join(process.cwd(), 'docs', `motohub-orders-products-${today}.csv`)

// التأكد من وجود مجلد docs
const docsDir = path.join(process.cwd(), 'docs')
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true })
}

// الكتابة
fs.writeFileSync(outputFile, csvContent, 'utf8')

console.log(`✅ تم تصدير ${trustedModels.length} موديل موثوق إلى:`)
console.log(outputFile)
console.log('\n📋 العينة (الـ 3 أسطر الأولى):')
console.log(csvRows.slice(0, 4).join('\n'))
console.log('\n🔍 التحقق:')
console.log(`- المجموع: ${models.length} موديل في generatedStock.js`)
console.log(`- المصدَّر: ${trustedModels.length} (source: stock/price-list + رقمي + !needsReview)`)
console.log(`- المُستبعَد: ${models.length - trustedModels.length} (catalog/غير رقمي/needsReview)`)

// التحقق من عدم وجود أسعار غير رقمية في المصدَّر
const nonNumericInExport = trustedModels.some(m => !/^\d+$/.test(m.price))
if (nonNumericInExport) {
  console.log('\n⚠️  تحذير: وجدت أسعار غير رقمية في المصدَّر!')
}

// التحقق من عدم وجود source: catalog في المصدَّر
const catalogInExport = trustedModels.some(m => m.source === 'catalog')
if (catalogInExport) {
  console.log('\n⚠️  تحذير:وجدت source: catalog في المصدَّر!')
}