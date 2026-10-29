import fs from 'node:fs'

const data = fs.readFileSync('docs/motohub-orders-products-20261028.csv', 'utf8')
const lines = data.split('\n').filter(line => line.trim())
console.log('Total data rows:', lines.length - 1)

const uniquePairs = new Set()
for (let i = 1; i < lines.length; i++) {
  const cells = lines[i].split(',')
  const brand = cells[0].replace(/"/g, '').trim()
  const name = cells[1].replace(/"/g, '').trim()
  uniquePairs.add(brand + '|' + name)
}
console.log('Unique brand|name pairs:', uniquePairs.size)