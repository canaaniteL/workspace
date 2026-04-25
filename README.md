# 刷题闪卡小程序

一个极简的微信小程序闪卡（Flashcard）应用：点击卡片看答案，左右按钮或滑动切换题目，支持答对/答错计数与进度记忆。

## 功能

- 📇 卡片式展示，**点击卡片**切换题面 / 答案
- ⬅️ ➡️ 底部按钮 **或左右滑动** 切换上一题 / 下一题
- ✓ / ✗ 记录答对 / 答错次数
- 💾 自动持久化当前进度（`wx.setStorageSync`）
- 🎨 深色卡片 + 右侧绿色光晕，复刻截图视觉
- 🗂 题库可通过 CSV 生成（内置转换脚本）

## 目录结构

```
flashcard-miniapp/
├── app.js / app.json / app.wxss
├── project.config.json
├── sitemap.json
├── data/
│   └── questions.js          # 题库（数组）
├── pages/
│   └── index/
│       ├── index.wxml
│       ├── index.wxss
│       ├── index.js
│       └── index.json
├── scripts/
│   └── csv2js.js             # CSV -> questions.js 转换脚本
├── sample.csv                # CSV 样例
└── README.md
```

## 运行

1. 打开 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. `导入项目` → 选择本目录（`flashcard-miniapp/`）
3. AppID 选 **测试号** 即可（`project.config.json` 中默认是 `touristappid`，可替换成你自己的）
4. 编译预览，即可看到与截图一致的效果

## 使用 CSV 导入自己的题库

CSV 文件需满足：

- 首行表头：`question,answer`
- 每行一道题；字段包含逗号、换行或引号时用双引号包裹，内部双引号用 `""` 转义

示例见 `sample.csv`。

转换命令（需要本地有 Node.js）：

```bash
node scripts/csv2js.js sample.csv
# 会覆盖 data/questions.js
```

再次编译小程序即可看到新题库。

## 常见扩展点

| 需求 | 思路 |
|------|------|
| 云端题库 | 用 `wx.request` 拉取 JSON，或接入微信云开发 `cloud.database()` |
| 多题库切换 | `data/` 下放多个 `.js`，首页增加题库选择页 |
| 乱序刷题 | 在 `onLoad` 里对 `list` 进行 Fisher–Yates 洗牌 |
| 收藏错题 | 用数组记录答错的 `index`，新增"错题本"页面 |
| 翻转动画 | 卡片加两层元素 + `transform: rotateY(180deg)` |
| 用户上传 CSV | `wx.chooseMessageFile` 选择 → `wx.getFileSystemManager().readFile` → 同款解析 |

## 开发体验提示

- 小程序不支持在运行时解析本地 CSV 到 `data/` 目录（小程序包只读），所以 **CSV → JS 的转换放在构建期** 是最简方案
- 如果你的 CSV 有中文，确保保存为 **UTF-8**（脚本已兼容带 BOM）
