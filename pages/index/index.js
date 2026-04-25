const builtinQuestions = require('../../data/questions.js')

const STORAGE_KEY = 'flashcard_state_v2'
const QUESTIONS_CACHE_KEY = 'flashcard_questions_cache'

// ============================================================
// 配置区：远程 CSV 题库地址（HTTPS）
//
// 推荐方案（任选其一）：
// 1. GitHub Gist：创建 gist → 粘贴 CSV → 点 Raw 获取链接
// 2. 腾讯云 COS：上传 CSV → 设公开读 → 复制链接
// 3. 任意返回 CSV 文本的公开 HTTPS 地址
//
// 留空 = 使用内置题库，也可通过菜单手动导入
// ============================================================
const REMOTE_CSV_URL = 'https://gist.githubusercontent.com/canaaniteL/f35c54a90eddb22434ad275ab866b149/raw/flashcards.csv'

Page({
  data: {
    list: [],
    index: 0,
    total: 0,
    showAnswer: false,
    rightCount: 0,
    wrongCount: 0,
    source: '',
    loading: false,
    touchStartX: 0,
    touchStartY: 0,
    translateX: 0,
    swiping: false
  },

  onLoad() {
    if (REMOTE_CSV_URL) {
      this.fetchRemoteCSV(REMOTE_CSV_URL)
    } else {
      const cached = wx.getStorageSync(QUESTIONS_CACHE_KEY)
      if (cached && cached.length) {
        this.applyQuestions(cached, 'local')
      } else {
        this.applyQuestions(builtinQuestions, 'builtin')
      }
    }
  },

  // ==================== 题库加载 ====================

  applyQuestions(list, source) {
    const saved = wx.getStorageSync(STORAGE_KEY) || {}
    this.setData({
      list,
      total: list.length,
      index: Math.min(saved.index || 0, list.length - 1),
      rightCount: saved.rightCount || 0,
      wrongCount: saved.wrongCount || 0,
      showAnswer: false,
      source,
      loading: false
    })
  },

  fallbackToCache(reason) {
    const cached = wx.getStorageSync(QUESTIONS_CACHE_KEY)
    if (cached && cached.length) {
      this.applyQuestions(cached, 'local')
      wx.showToast({ title: reason + '，使用缓存', icon: 'none' })
    } else {
      this.applyQuestions(builtinQuestions, 'builtin')
      wx.showToast({ title: reason + '，使用内置题库', icon: 'none' })
    }
  },

  // ==================== 远程 CSV ====================

  fetchRemoteCSV(url) {
    this.setData({ loading: true })
    wx.request({
      url,
      method: 'GET',
      header: { 'content-type': 'text/plain' },
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
          const list = this.parseCSV(text)
          if (list.length) {
            wx.setStorageSync(QUESTIONS_CACHE_KEY, list)
            this.applyQuestions(list, 'remote')
            wx.showToast({ title: `云端加载 ${list.length} 题`, icon: 'success' })
            return
          }
        }
        this.fallbackToCache('远程加载失败')
      },
      fail: () => {
        this.fallbackToCache('网络失败')
      }
    })
  },

  // ==================== 本地导入 ====================

  importCSV() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['csv', 'txt'],
      success: (res) => {
        const filePath = res.tempFiles[0].path
        const fs = wx.getFileSystemManager()
        fs.readFile({
          filePath,
          encoding: 'utf8',
          success: (fileRes) => {
            const list = this.parseCSV(fileRes.data)
            if (list.length === 0) {
              wx.showToast({ title: '未解析到有效题目', icon: 'none' })
              return
            }
            wx.setStorageSync(QUESTIONS_CACHE_KEY, list)
            wx.removeStorageSync(STORAGE_KEY)
            this.applyQuestions(list, 'local')
            wx.showToast({ title: `已导入 ${list.length} 题`, icon: 'success' })
          },
          fail: () => {
            wx.showToast({ title: '文件读取失败', icon: 'none' })
          }
        })
      }
    })
  },

  importFromURL() {
    wx.showModal({
      title: '输入 CSV 链接',
      editable: true,
      placeholderText: 'https://example.com/questions.csv',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          this.fetchRemoteCSV(res.content.trim())
        }
      }
    })
  },

  // ==================== CSV 解析 ====================

  parseCSV(text) {
    if (!text) return []
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    const rows = []
    let field = '', row = [], inQuotes = false
    for (let i = 0; i < text.length; i++) {
      const c = text[i]
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++ }
          else { inQuotes = false }
        } else { field += c }
      } else {
        if (c === '"') { inQuotes = true }
        else if (c === ',') { row.push(field); field = '' }
        else if (c === '\n') {
          row.push(field); field = ''
          if (!(row.length === 1 && row[0] === '')) rows.push(row)
          row = []
        } else { field += c }
      }
    }
    if (field !== '' || row.length > 0) {
      row.push(field)
      if (!(row.length === 1 && row[0] === '')) rows.push(row)
    }
    if (rows.length < 2) return []

    const header = rows[0].map(s => s.trim().toLowerCase())
    let qIdx = header.indexOf('question')
    let aIdx = header.indexOf('answer')
    if (qIdx === -1 || aIdx === -1) { qIdx = 0; aIdx = 1 }
    return rows.slice(1)
      .filter(r => r.length > Math.max(qIdx, aIdx) && (r[qIdx] || '').trim() && (r[aIdx] || '').trim())
      .map(r => ({ q: r[qIdx].trim(), a: r[aIdx].trim() }))
  },

  // ==================== 操作菜单 ====================

  showMenu() {
    const items = ['从聊天记录导入 CSV', '从链接导入 CSV', '重置进度', '恢复内置题库']
    if (REMOTE_CSV_URL) items.unshift('刷新云端题库')

    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const offset = REMOTE_CSV_URL ? 1 : 0
        if (REMOTE_CSV_URL && res.tapIndex === 0) {
          this.fetchRemoteCSV(REMOTE_CSV_URL); return
        }
        const idx = res.tapIndex - offset
        switch (idx) {
          case 0: this.importCSV(); break
          case 1: this.importFromURL(); break
          case 2: this.resetAll(); break
          case 3: this.useBuiltin(); break
        }
      }
    })
  },

  useBuiltin() {
    wx.showModal({
      title: '恢复内置题库',
      content: '将清空导入的题库和当前进度',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync(QUESTIONS_CACHE_KEY)
          wx.removeStorageSync(STORAGE_KEY)
          this.applyQuestions(builtinQuestions, 'builtin')
        }
      }
    })
  },

  // ==================== 核心操作 ====================

  persist() {
    wx.setStorageSync(STORAGE_KEY, {
      index: this.data.index,
      rightCount: this.data.rightCount,
      wrongCount: this.data.wrongCount
    })
  },

  toggleAnswer() {
    this.setData({ showAnswer: !this.data.showAnswer })
  },

  goPrev() {
    if (this.data.index <= 0) {
      wx.showToast({ title: '已经是第一题', icon: 'none' }); return
    }
    this.setData({ index: this.data.index - 1, showAnswer: false })
    this.persist()
  },

  goNext() {
    if (this.data.index >= this.data.total - 1) {
      wx.showToast({ title: '已经是最后一题', icon: 'none' }); return
    }
    this.setData({ index: this.data.index + 1, showAnswer: false })
    this.persist()
  },

  markWrong() {
    this.setData({ wrongCount: this.data.wrongCount + 1 })
    this.persist()
    this.autoNext()
  },

  markRight() {
    this.setData({ rightCount: this.data.rightCount + 1 })
    this.persist()
    this.autoNext()
  },

  autoNext() {
    if (this.data.index < this.data.total - 1) {
      setTimeout(() => this.goNext(), 160)
    }
  },

  resetAll() {
    wx.showModal({
      title: '重置进度',
      content: '将清空当前进度与答题计数',
      success: (res) => {
        if (res.confirm) {
          this.setData({ index: 0, rightCount: 0, wrongCount: 0, showAnswer: false })
          this.persist()
        }
      }
    })
  },

  onTouchStart(e) {
    const t = e.touches[0]
    this.setData({ touchStartX: t.clientX, touchStartY: t.clientY, swiping: true, translateX: 0 })
  },
  onTouchMove(e) {
    if (!this.data.swiping) return
    const t = e.touches[0]
    const dx = t.clientX - this.data.touchStartX
    const dy = t.clientY - this.data.touchStartY
    if (Math.abs(dx) > Math.abs(dy)) {
      this.setData({ translateX: dx })
    }
  },
  onTouchEnd() {
    const dx = this.data.translateX
    this.setData({ swiping: false, translateX: 0 })
    if (dx <= -60) this.goNext()
    else if (dx >= 60) this.goPrev()
  }
})
