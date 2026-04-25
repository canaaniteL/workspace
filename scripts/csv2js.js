/**
 * CSV -> data/questions.js 转换脚本
 *
 * 用法：
 *   node scripts/csv2js.js path/to/questions.csv
 *
 * CSV 要求：
 *   第一行表头：question,answer
 *   支持字段中包含逗号、换行（需用双引号包裹，双引号内的 " 用 "" 转义）
 */

const fs = require('fs')
const path = require('path')

function parseCSV(text) {
  // 兼容 BOM 与 CRLF
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  const rows = []
  let field = ''
  let row = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else { inQuotes = false }
      } else {
        field += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ',') {
        row.push(field); field = ''
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++
        row.push(field); field = ''
        // 忽略完全空行
        if (!(row.length === 1 && row[0] === '')) rows.push(row)
        row = []
      } else {
        field += c
      }
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    if (!(row.length === 1 && row[0] === '')) rows.push(row)
  }
  return rows
}

function main() {
  const input = process.argv[2]
  if (!input) {
    console.error('用法: node scripts/csv2js.js path/to/questions.csv')
    process.exit(1)
  }
  const csvPath = path.resolve(input)
  const raw = fs.readFileSync(csvPath, 'utf8')
  const rows = parseCSV(raw)
  if (rows.length < 2) {
    console.error('CSV 至少需要表头 + 一行数据')
    process.exit(1)
  }

  const header = rows[0].map(s => s.trim().toLowerCase())
  const qIdx = header.indexOf('question')
  const aIdx = header.indexOf('answer')
  if (qIdx === -1 || aIdx === -1) {
    console.error('表头必须包含: question, answer')
    process.exit(1)
  }

  const data = rows.slice(1)
    .filter(r => (r[qIdx] || '').trim() && (r[aIdx] || '').trim())
    .map(r => ({ q: r[qIdx].trim(), a: r[aIdx].trim() }))

  const outPath = path.resolve(__dirname, '..', 'data', 'questions.js')
  const content =
`// 由 scripts/csv2js.js 从 CSV 自动生成，勿手动编辑
module.exports = ${JSON.stringify(data, null, 2)}
`
  fs.writeFileSync(outPath, content, 'utf8')
  console.log(`已生成 ${outPath}，共 ${data.length} 道题`)
}

main()
