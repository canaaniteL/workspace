const fs = require('fs');
const f = fs.readFileSync('c:\\Users\\canaanzhu\\Downloads\\面试\\算法\\算法.txt', 'utf-8');
const blocks = f.split(/\n#{2,3}\s+(?=【LeetCode)/);
let count = 0, cats = {};
for (const b of blocks) {
  const m = b.match(/^【LeetCode\s+(\d+)】(.+?)$/m);
  if (!m) continue;
  const catM = b.match(/\*\*分类\*\*[：:]\s*(.+?)$/m);
  const cat = catM ? catM[1].trim() : '(无分类)';
  cats[cat] = (cats[cat] ? cats[cat] : 0) + 1;
  count++;
}
console.log('解析题数:', count);
console.log('分类统计:', JSON.stringify(cats, null, 2));
