import fs from 'node:fs'
import path from 'node:path'

// قراءة البيانات المولّدة
const STOCK_FILE = path.join(process.cwd(), 'src/data/generatedStock.js')
const content = fs.readFileSync(STOCK_FILE, 'utf8')

// اطبع النص حول مصفوفة MODELS لفهم المشكلة
console.log('البحث عن MODELS...')
const modelsStart = content.indexOf('export const MODELS = [')
console.log('modelsStart:', modelsStart)

// اطبع بعض النص بعد للبحث عن ];
const afterStart = content.substring(modelsStart + 20)
console.log('Text after MODELS [ (first 300 chars):')
console.log(afterStart.substring(0, 300))

// ابحث عن ]; في النسخة المتبقية
const modelsEnd = afterStart.indexOf('];')
console.log('modelsEnd relative:', modelsEnd)