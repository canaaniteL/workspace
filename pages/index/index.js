const builtinQuestions = require('../../data/questions.js')

const STORAGE_KEY = 'flashcard_state_v3'
const QUESTIONS_CACHE_KEY = 'flashcard_questions_cache'
const RATINGS_KEY = 'flashcard_ratings_v1'

const REMOTE_CSV_URL = 'https://gist.githubusercontent.com/canaaniteL/f35c54a90eddb22434ad275ab866b149/raw/flashcards.csv'

// 评分标签
const RATING_LABELS = ['', '完全不会', '有点印象', '基本掌握', '比较熟练', '完全掌握']
const RATING_COLORS = ['', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#10B981']

Page({
  data: {
    list: [],
    index: 0,
    currentIndex: 0,
    total: 0,
    showAnswer: false,
    rightCount: 0,
    wrongCount: 0,
    source: '',
    loading: false,
    // 评分相关
    ratings: {},          // { 题目索引: 1-5 }
    showRating: false,    // 是否显示评分面板
    currentRating: 0,     // 当前题的评分
    // 模式
    mode: 'normal',       // 'normal' | 'review'
    // 统计
    ratedCount: 0,
    avgScore: 0,
    weakCount: 0
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
    const ratings = wx.getStorageSync(RATINGS_KEY) || {}
    const idx = Math.min(saved.index || 0, list.length - 1)
    this.setData({
      list,
      total: list.length,
      index: idx,
      currentIndex: idx,
      rightCount: saved.rightCount || 0,
      wrongCount: saved.wrongCount || 0,
      showAnswer: false,
      source,
      loading: false,
      ratings,
      mode: 'normal'
    })
    this.updateCurrentRating()
    this.updateStats()
  },

  // ==================== 评分系统 ====================

  updateCurrentRating() {
    const r = this.data.ratings[this.data.index] || 0
    this.setData({ currentRating: r })
  },

  updateStats() {
    const ratings = this.data.ratings
    const keys = Object.keys(ratings)
    const ratedCount = keys.length
    let sum = 0, weakCount = 0
    keys.forEach(k => {
      sum += ratings[k]
      if (ratings[k] <= 2) weakCount++
    })
    this.setData({
      ratedCount,
      avgScore: ratedCount ? (sum / ratedCount).toFixed(1) : 0,
      weakCount
    })
  },

  showRatingPanel() {
    this.setData({ showRating: true })
  },

  hideRatingPanel() {
    this.setData({ showRating: false })
  },

  rateQuestion(e) {
    const score = parseInt(e.currentTarget.dataset.score)
    const ratings = { ...this.data.ratings }
    ratings[this.data.index] = score
    this.setData({ ratings, currentRating: score, showRating: false })
    wx.setStorageSync(RATINGS_KEY, ratings)
    this.updateStats()

    // 评分后自动下一题
    if (this.data.index < this.data.total - 1) {
      setTimeout(() => this.goNext(), 200)
    }
  },

  // ==================== 复习模式 ====================

  toggleReviewMode() {
    if (this.data.mode === 'review') {
      // 切回普通模式
      const cached = wx.getStorageSync(QUESTIONS_CACHE_KEY)
      const list = (cached && cached.length) ? cached : builtinQuestions
      this.setData({ list, total: list.length, index: 0, currentIndex: 0, showAnswer: false, mode: 'normal' })
      wx.showToast({ title: '已切回全部题目', icon: 'none' })
    } else {
      // 进入复习模式：筛选评分<=2或未评分的题
      const cached = wx.getStorageSync(QUESTIONS_CACHE_KEY)
      const allList = (cached && cached.length) ? cached : builtinQuestions
      const ratings = this.data.ratings
      const reviewList = allList.filter((_, i) => !ratings[i] || ratings[i] <= 2)
      if (reviewList.length === 0) {
        wx.showToast({ title: '没有需要复习的题目！', icon: 'success' })
        return
      }
      this.setData({ list: reviewList, total: reviewList.length, index: 0, currentIndex: 0, showAnswer: false, mode: 'review' })
      wx.showToast({ title: `复习模式：${reviewList.length} 题`, icon: 'none' })
    }
  },

  // ==================== 统计面板 ====================

  showStats() {
    const { ratedCount, total, avgScore, weakCount } = this.data
    const masterCount = Object.values(this.data.ratings).filter(v => v >= 4).length
    wx.showModal({
      title: '学习统计',
      content: `总题数：${total}\n已评分：${ratedCount} / ${total}\n平均掌握：${avgScore} / 5\n薄弱题（≤2分）：${weakCount} 题\n熟练题（≥4分）：${masterCount} 题\n完成率：${total ? Math.round(ratedCount / total * 100) : 0}%`,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // ==================== 原有功能 ====================

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
      fail: () => { this.fallbackToCache('网络失败') }
    })
  },

  importCSV() {
    wx.chooseMessageFile({
      count: 1, type: 'file', extension: ['csv', 'txt'],
      success: (res) => {
        const fs = wx.getFileSystemManager()
        fs.readFile({
          filePath: res.tempFiles[0].path, encoding: 'utf8',
          success: (fileRes) => {
            const list = this.parseCSV(fileRes.data)
            if (!list.length) { wx.showToast({ title: '未解析到有效题目', icon: 'none' }); return }
            wx.setStorageSync(QUESTIONS_CACHE_KEY, list)
            wx.removeStorageSync(STORAGE_KEY)
            wx.removeStorageSync(RATINGS_KEY)
            this.applyQuestions(list, 'local')
            wx.showToast({ title: `已导入 ${list.length} 题`, icon: 'success' })
          },
          fail: () => { wx.showToast({ title: '文件读取失败', icon: 'none' }) }
        })
      }
    })
  },

  importFromURL() {
    wx.showModal({
      title: '输入 CSV 链接', editable: true, placeholderText: 'https://example.com/questions.csv',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) this.fetchRemoteCSV(res.content.trim())
      }
    })
  },

  parseCSV(text) {
    if (!text) return []
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const rows = []
    let field = '', row = [], inQuotes = false
    for (let i = 0; i < text.length; i++) {
      const c = text[i]
      if (inQuotes) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false } }
        else { field += c }
      } else {
        if (c === '"') { inQuotes = true }
        else if (c === ',') { row.push(field); field = '' }
        else if (c === '\n') { row.push(field); field = ''; if (!(row.length === 1 && row[0] === '')) rows.push(row); row = [] }
        else { field += c }
      }
    }
    if (field !== '' || row.length > 0) { row.push(field); if (!(row.length === 1 && row[0] === '')) rows.push(row) }
    if (rows.length < 2) return []
    const header = rows[0].map(s => s.trim().toLowerCase())
    let qIdx = header.indexOf('question'), aIdx = header.indexOf('answer')
    if (qIdx === -1 || aIdx === -1) { qIdx = 0; aIdx = 1 }
    return rows.slice(1)
      .filter(r => r.length > Math.max(qIdx, aIdx) && (r[qIdx] || '').trim() && (r[aIdx] || '').trim())
      .map(r => ({ q: r[qIdx].trim(), a: r[aIdx].trim() }))
  },

  // ==================== 菜单 ====================

  showMenu() {
    const items = [
      this.data.mode === 'review' ? '退出复习模式' : '复习薄弱题',
      '学习统计',
      '刷新云端题库',
      '从聊天记录导入 CSV',
      '从链接导入 CSV',
      '重置全部数据'
    ]
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        switch (res.tapIndex) {
          case 0: this.toggleReviewMode(); break
          case 1: this.showStats(); break
          case 2: this.fetchRemoteCSV(REMOTE_CSV_URL); break
          case 3: this.importCSV(); break
          case 4: this.importFromURL(); break
          case 5: this.resetAll(); break
        }
      }
    })
  },

  goFeedback() {
    const q = this.data.list[this.data.index] ? encodeURIComponent(this.data.list[this.data.index].q) : ''
    wx.navigateTo({ url: `/pages/feedback/feedback?q=${q}` })
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

  onSwiperChange(e) {
    const newIndex = e.detail.current
    if (newIndex !== this.data.currentIndex) {
      this.setData({ index: newIndex, currentIndex: newIndex, showAnswer: false, showRating: false })
      this.updateCurrentRating()
      this.persist()
    }
  },

  goPrev() {
    if (this.data.index <= 0) { wx.showToast({ title: '已经是第一题', icon: 'none' }); return }
    const idx = this.data.index - 1
    this.setData({ index: idx, currentIndex: idx, showAnswer: false, showRating: false })
    this.updateCurrentRating()
    this.persist()
  },

  goNext() {
    if (this.data.index >= this.data.total - 1) { wx.showToast({ title: '已经是最后一题', icon: 'none' }); return }
    const idx = this.data.index + 1
    this.setData({ index: idx, currentIndex: idx, showAnswer: false, showRating: false })
    this.updateCurrentRating()
    this.persist()
  },

  markWrong() {
    this.setData({ wrongCount: this.data.wrongCount + 1 })
    this.persist()
    if (this.data.index < this.data.total - 1) setTimeout(() => this.goNext(), 160)
  },

  markRight() {
    this.setData({ rightCount: this.data.rightCount + 1 })
    this.persist()
    if (this.data.index < this.data.total - 1) setTimeout(() => this.goNext(), 160)
  },

  resetAll() {
    wx.showModal({
      title: '重置全部数据',
      content: '将清空进度、评分和计数，确定吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync(RATINGS_KEY)
          this.setData({ index: 0, currentIndex: 0, rightCount: 0, wrongCount: 0, showAnswer: false, showRating: false, ratings: {}, currentRating: 0 })
          this.persist()
          this.updateStats()
        }
      }
    })
  }
})
