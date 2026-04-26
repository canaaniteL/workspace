const builtinFrench = require('../../data/questions.js')

// 题库分类配置
const DECKS = [
  {
    id: 'french', name: '法语学习', icon: '🇫🇷',
    csvUrl: 'https://gist.githubusercontent.com/canaaniteL/f35c54a90eddb22434ad275ab866b149/raw/flashcards.csv',
    format: 'csv'
  },
  {
    id: 'algorithm', name: '算法学习', icon: '🧮',
    csvUrl: 'https://gist.githubusercontent.com/canaaniteL/85a5119037df5a08196c17e5557faffc/raw/gistfile1.txt',
    format: 'leetcode-md'
  }
]

function storageKey(deckId, base) { return `fc_${deckId}_${base}` }

Page({
  data: {
    list: [],
    index: 0,
    currentIndex: 0,
    total: 0,
    showAnswer: 0, // 0=题面 1=思路 2=代码
    rightCount: 0,
    wrongCount: 0,
    source: '',
    loading: false,
    ratings: {},
    showRating: false,
    currentRating: 0,
    mode: 'normal',
    ratedCount: 0,
    avgScore: 0,
    weakCount: 0,
    // 分类
    currentDeckId: 'french',
    currentDeckName: '🇫🇷 法语学习',
    decks: DECKS
  },

  onLoad() {
    const deckId = wx.getStorageSync('fc_current_deck') || 'french'
    this.loadDeck(deckId)
  },

  // ==================== 分类选择 ====================

  showDeckPicker() {
    const items = DECKS.map(d => d.icon + ' ' + d.name)
    wx.showActionSheet({
      itemList: items,
      success: (res) => { this.loadDeck(DECKS[res.tapIndex].id) }
    })
  },

  loadDeck(deckId) {
    const deck = DECKS.find(d => d.id === deckId)
    if (!deck) return
    wx.setStorageSync('fc_current_deck', deckId)
    this.setData({ currentDeckId: deckId, currentDeckName: deck.icon + ' ' + deck.name })

    if (deck.csvUrl) {
      this.fetchDeckData(deck)
    } else {
      const cached = wx.getStorageSync(storageKey(deckId, 'cache'))
      this.applyQuestions(cached && cached.length ? cached : builtinFrench, cached ? 'local' : 'builtin')
    }
  },

  fetchDeckData(deck) {
    this.setData({ loading: true })
    wx.request({
      url: deck.csvUrl,
      method: 'GET',
      header: { 'content-type': 'text/plain' },
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
          const list = deck.format === 'leetcode-md' ? this.parseLeetCodeMD(text) : this.parseCSV(text)
          if (list.length) {
            wx.setStorageSync(storageKey(this.data.currentDeckId, 'cache'), list)
            this.applyQuestions(list, 'remote')
            wx.showToast({ title: `加载 ${list.length} 题`, icon: 'success' })
            return
          }
        }
        this.fallbackToCache()
      },
      fail: () => { this.fallbackToCache() }
    })
  },

  fallbackToCache() {
    const cached = wx.getStorageSync(storageKey(this.data.currentDeckId, 'cache'))
    if (cached && cached.length) {
      this.applyQuestions(cached, 'local')
    } else {
      this.applyQuestions(builtinFrench, 'builtin')
    }
    this.setData({ loading: false })
  },

  // ==================== 题库加载 ====================

  applyQuestions(list, source) {
    const dk = this.data.currentDeckId
    const saved = wx.getStorageSync(storageKey(dk, 'state')) || {}
    const ratings = wx.getStorageSync(storageKey(dk, 'ratings')) || {}
    const idx = Math.min(saved.index || 0, Math.max(list.length - 1, 0))
    this.setData({
      list, total: list.length, index: idx, currentIndex: idx,
      rightCount: saved.rightCount || 0, wrongCount: saved.wrongCount || 0,
      showAnswer: 0, source, loading: false, ratings, mode: 'normal', showRating: false
    })
    this.updateCurrentRating()
    this.updateStats()
  },

  // ==================== LeetCode MD 解析 ====================

  parseLeetCodeMD(raw) {
    let text = raw
    text = text.replace(/\\\*\\\*/g, '**')
    text = text.replace(/\\`\\`\\`/g, '```')
    text = text.replace(/\\`/g, '`')
    text = text.replace(/\\\[/g, '[').replace(/\\\]/g, ']')
    text = text.replace(/\\_/g, '_')
    text = text.replace(/\\\*/g, '*')
    text = text.replace(/\\#/g, '#')
    text = text.replace(/\\-/g, '-')
    text = text.replace(/\\>/g, '>').replace(/\\\|/g, '|')

    const questions = []
    const blocks = text.split(/\n#{2,3}\s+(?=【LeetCode)/)
    for (const block of blocks) {
      const m = block.match(/^【LeetCode\s+(\d+)】(.+?)$/m)
      if (!m) continue
      const num = m[1], name = m[2].trim()
      let desc = ''
      const dm = block.match(/\*\*题目\*\*[：:]\s*([\s\S]+?)(?=\n\n|\n\*\*核心)/m)
      if (dm) desc = dm[1].trim().replace(/\*\*/g, '')
      let idea = ''
      const im = block.match(/\*\*核心思路\*\*[：:]\s*([\s\S]+?)(?=\n\n*```|\n- +\*\*时间|\n---)/m)
      if (im) idea = im[1].trim().replace(/\*\*/g, '')
      let cplx = ''
      const cm = block.match(/\*\*时间复杂度\*\*[：:]\s*(.+?)$/m)
      if (cm) cplx = cm[1].replace(/\*\*/g, '').trim()
      let code = ''
      const cd = block.match(/```(?:cpp|c\+\+|java|python|javascript)?\s*\n([\s\S]+?)```/)
      if (cd) code = cd[1].trim()

      let front = `【LeetCode ${num}】${name}`
      if (desc) front += '\n\n' + desc
      let answer = ''
      if (idea) answer += '💡 ' + idea
      if (cplx) answer += '\n\n⏱ ' + cplx
      if (!answer) answer = name

      questions.push({ q: front, a: answer, code: code })
    }
    return questions
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

  // ==================== 评分系统 ====================

  updateCurrentRating() {
    this.setData({ currentRating: this.data.ratings[this.data.index] || 0 })
  },

  updateStats() {
    const keys = Object.keys(this.data.ratings)
    let sum = 0, weakCount = 0
    keys.forEach(k => { sum += this.data.ratings[k]; if (this.data.ratings[k] <= 2) weakCount++ })
    this.setData({ ratedCount: keys.length, avgScore: keys.length ? (sum / keys.length).toFixed(1) : 0, weakCount })
  },

  showRatingPanel() { this.setData({ showRating: true }) },

  rateQuestion(e) {
    const score = parseInt(e.currentTarget.dataset.score)
    const ratings = { ...this.data.ratings }
    ratings[this.data.index] = score
    this.setData({ ratings, currentRating: score, showRating: false })
    wx.setStorageSync(storageKey(this.data.currentDeckId, 'ratings'), ratings)
    this.updateStats()
    if (this.data.index < this.data.total - 1) setTimeout(() => this.goNext(), 200)
  },

  // ==================== 复习模式 ====================

  toggleReviewMode() {
    if (this.data.mode === 'review') {
      const cached = wx.getStorageSync(storageKey(this.data.currentDeckId, 'cache'))
      const list = (cached && cached.length) ? cached : builtinFrench
      this.setData({ list, total: list.length, index: 0, currentIndex: 0, showAnswer: 0, mode: 'normal' })
    } else {
      const cached = wx.getStorageSync(storageKey(this.data.currentDeckId, 'cache'))
      const allList = (cached && cached.length) ? cached : builtinFrench
      const ratings = this.data.ratings
      const reviewList = allList.filter((_, i) => !ratings[i] || ratings[i] <= 2)
      if (!reviewList.length) { wx.showToast({ title: '没有需要复习的题！', icon: 'success' }); return }
      this.setData({ list: reviewList, total: reviewList.length, index: 0, currentIndex: 0, showAnswer: 0, mode: 'review' })
    }
  },

  showStats() {
    const { ratedCount, total, avgScore, weakCount } = this.data
    const masterCount = Object.values(this.data.ratings).filter(v => v >= 4).length
    wx.showModal({
      title: '学习统计',
      content: `总题数：${total}\n已评分：${ratedCount}/${total}\n平均：${avgScore}/5\n薄弱：${weakCount}题\n熟练：${masterCount}题\n完成率：${total ? Math.round(ratedCount / total * 100) : 0}%`,
      showCancel: false
    })
  },

  // ==================== 菜单 ====================

  showMenu() {
    wx.showActionSheet({
      itemList: [
        this.data.mode === 'review' ? '退出复习模式' : '复习薄弱题',
        '学习统计',
        '切换题库',
        '刷新题库',
        '重置当前进度'
      ],
      success: (res) => {
        switch (res.tapIndex) {
          case 0: this.toggleReviewMode(); break
          case 1: this.showStats(); break
          case 2: this.showDeckPicker(); break
          case 3: this.loadDeck(this.data.currentDeckId); break
          case 4: this.resetAll(); break
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
    wx.setStorageSync(storageKey(this.data.currentDeckId, 'state'), {
      index: this.data.index, rightCount: this.data.rightCount, wrongCount: this.data.wrongCount
    })
  },

  // 三层展示：0=题面 1=思路 2=代码
  toggleAnswer() {
    const item = this.data.list[this.data.index]
    const hasCode = item && item.code
    let next = this.data.showAnswer
    if (next === 0) next = 1
    else if (next === 1 && hasCode) next = 2
    else next = 0
    this.setData({ showAnswer: next })
  },

  showCode() {
    this.setData({ showAnswer: 2 })
  },

  onSwiperChange(e) {
    const newIndex = e.detail.current
    if (newIndex !== this.data.currentIndex) {
      this.setData({ index: newIndex, currentIndex: newIndex, showAnswer: 0, showRating: false })
      this.updateCurrentRating()
      this.persist()
    }
  },

  goPrev() {
    if (this.data.index <= 0) return
    const idx = this.data.index - 1
    this.setData({ index: idx, currentIndex: idx, showAnswer: 0, showRating: false })
    this.updateCurrentRating()
    this.persist()
  },

  goNext() {
    if (this.data.index >= this.data.total - 1) return
    const idx = this.data.index + 1
    this.setData({ index: idx, currentIndex: idx, showAnswer: 0, showRating: false })
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
      title: '重置当前题库进度',
      content: '将清空进度、评分和计数',
      success: (res) => {
        if (res.confirm) {
          const dk = this.data.currentDeckId
          wx.removeStorageSync(storageKey(dk, 'ratings'))
          wx.removeStorageSync(storageKey(dk, 'state'))
          this.setData({ index: 0, currentIndex: 0, rightCount: 0, wrongCount: 0, showAnswer: 0, showRating: false, ratings: {}, currentRating: 0 })
          this.persist()
          this.updateStats()
        }
      }
    })
  }
})
