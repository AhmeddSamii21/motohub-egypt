import fs from 'node:fs'

const data = fs.readFileSync('src/data/generatedStock.js', 'utf8')
const models = data.match(/\{[^}]*brand:\s*"[^"]*"[^}]*\}/g) || []
console.log('Total models found:', models.length)