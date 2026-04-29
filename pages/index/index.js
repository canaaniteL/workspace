const builtinFrench = require('../../data/questions.js')
const frenchQuiz = require('../../data/french_quiz.js')

// 题库分类配置
const DECKS = [
  {
    id: 'french', name: '法语学习', icon: '🇫🇷',
    csvUrl: 'https://gist.githubusercontent.com/canaaniteL/f35c54a90eddb22434ad275ab866b149/raw/flashcards.csv',
    format: 'csv', ttsLang: 'fr'
  },
  {
    id: 'french-quiz', name: '法语选择题', icon: '📝',
    csvUrl: 'https://gist.githubusercontent.com/canaaniteL/57062d66f9a4e89afcc952843ee4fc4e/raw/%25E6%25B3%2595%25E8%25AF%25AD%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%258C%25E5%258D%2595%25E9%2580%2589%25E9%25A2%2598',
    format: 'quiz', ttsLang: 'fr',
    localData: frenchQuiz
  },
  {
    id: 'algorithm', name: '算法学习', icon: '🧮',
    csvUrl: 'https://gist.githubusercontent.com/canaaniteL/85a5119037df5a08196c17e5557faffc/raw/gistfile1.txt',
    format: 'leetcode-md', ttsLang: ''
  },
  {
    id: 'japanese', name: '日语学习', icon: '🇯🇵',
    csvUrl: 'https://gist.githubusercontent.com/canaaniteL/3a8c50a90bb888a6c14b9a0e5a33a9d8/raw/Japanese50sound.csv',
    format: 'csv', ttsLang: 'ja'
  }
]

function storageKey(deckId, base) { return `fc_${deckId}_${base}` }

Page({
  data: {
    list: [],
    fullList: [],        // 完整列表（分类筛选前）
    index: 0,
    currentIndex: 0,
    total: 0,
    showAnswer: 0, // 0=题面 1=思路 2=代码
    source: '',
    loading: false,
    // 评分系统：ratings[index] = 'right' 表示✓已掌握，未记录或 'wrong' 表示✕
    ratings: {},
    currentRating: '', // '' | 'right' | 'wrong'
    mode: 'normal',
    hasTTS: false,
    ttsLang: '',
    ratedCount: 0,    // 已评为✓的题数
    totalRated: 0,     // 总评分题数
    weakCount: 0,      // ✕的题数
    // 分类
    currentDeckId: 'french',
    currentDeckName: '🇫🇷 法语学习',
    decks: DECKS,
    // 代码高亮
    codeNodes: [],
    // 选择题模式
    isQuizMode: false,
    selectedOption: -1,    // 当前选中的选项索引 (-1=未选)
    quizAnswered: false,   // 是否已作答
    quizCorrect: false,    // 是否答对
    showHint: false,       // 是否显示解析
    // 算法分类筛选
    algoCategories: [],    // 所有分类列表
    currentAlgoCategory: '', // 当前选中分类（空=全部）
    showCategoryPicker: false
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
    this.setData({
      currentDeckId: deckId,
      currentDeckName: deck.icon + ' ' + deck.name,
      hasTTS: !!deck.ttsLang,
      ttsLang: deck.ttsLang || '',
      isQuizMode: deck.format === 'quiz',
      selectedOption: -1,
      quizAnswered: false,
      quizCorrect: false,
      showHint: false
    })

    if (deck.csvUrl) {
      this.fetchDeckData(deck)
    } else if (deck.localData) {
      this.applyQuestions(deck.localData, 'builtin')
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
          let list = []
          if (deck.format === 'quiz') {
            // JSON 选择题格式
            try {
              const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
              if (Array.isArray(data) && data.length) list = data
            } catch (e) { console.error('Quiz JSON parse error:', e) }
          } else {
            const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
            list = deck.format === 'leetcode-md' ? this.parseLeetCodeMD(text) : this.parseCSV(text)
          }
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
    const dk = this.data.currentDeckId
    const deck = DECKS.find(d => d.id === dk)
    const cached = wx.getStorageSync(storageKey(dk, 'cache'))
    if (cached && cached.length) {
      this.applyQuestions(cached, 'local')
    } else if (deck && deck.localData) {
      this.applyQuestions(deck.localData, 'builtin')
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

    // 提取算法分类
    let algoCategories = []
    if (dk === 'algorithm') {
      const catSet = {}
      list.forEach(item => {
        if (item.category) catSet[item.category] = true
      })
      algoCategories = Object.keys(catSet).sort()
    }

    // 恢复之前的分类选择
    const savedCat = dk === 'algorithm' ? (wx.getStorageSync(storageKey(dk, 'category')) || '') : ''
    let filteredList = list
    if (dk === 'algorithm' && savedCat && algoCategories.indexOf(savedCat) !== -1) {
      filteredList = list.filter(item => item.category === savedCat)
    }
    const realIdx = Math.min(saved.index || 0, Math.max(filteredList.length - 1, 0))

    this.setData({
      fullList: list,
      list: filteredList,
      total: filteredList.length,
      index: realIdx, currentIndex: realIdx,
      showAnswer: 0, source, loading: false, ratings, mode: 'normal',
      algoCategories: algoCategories,
      currentAlgoCategory: savedCat
    })
    this.updateCurrentRating()
    this.updateStats()
    this.autoPlayTTS()
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
      // 提取分类标签
      let category = ''
      const catM = block.match(/\*\*分类\*\*[：:]\s*(.+?)$/m)
      if (catM) category = catM[1].trim()
      let desc = ''
      const dm = block.match(/\*\*题目\*\*[：:]\s*([\s\S]+?)(?=\n\n|\n\*\*核心|\n\*\*分类)/m)
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

      questions.push({ q: front, a: answer, code: code, category: category })
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

  // ==================== 评分系统（✕/✓ 二选一） ====================

  updateCurrentRating() {
    this.setData({ currentRating: this.data.ratings[this.data.index] || '' })
    this.updateCodeNodes()
  },

  updateStats() {
    const ratings = this.data.ratings
    const keys = Object.keys(ratings)
    let rightCount = 0, wrongCount = 0
    keys.forEach(k => {
      if (ratings[k] === 'right') rightCount++
      else wrongCount++
    })
    this.setData({
      ratedCount: rightCount,
      totalRated: keys.length,
      weakCount: wrongCount
    })
  },

  // 标记为✕（不会）
  markWrong() {
    const ratings = { ...this.data.ratings }
    ratings[this.data.index] = 'wrong'
    this.setData({ ratings, currentRating: 'wrong' })
    wx.setStorageSync(storageKey(this.data.currentDeckId, 'ratings'), ratings)
    this.updateStats()
    this.persist()
    if (this.data.index < this.data.total - 1) setTimeout(() => this.goNext(), 160)
  },

  // 标记为✓（掌握）
  markRight() {
    const ratings = { ...this.data.ratings }
    ratings[this.data.index] = 'right'
    this.setData({ ratings, currentRating: 'right' })
    wx.setStorageSync(storageKey(this.data.currentDeckId, 'ratings'), ratings)
    this.updateStats()
    this.persist()
    if (this.data.index < this.data.total - 1) setTimeout(() => this.goNext(), 160)
  },

  // ==================== 选择题交互 ====================

  selectOption(e) {
    if (this.data.quizAnswered) return
    const optIdx = parseInt(e.currentTarget.dataset.idx)
    const item = this.data.list[this.data.index]
    const correct = optIdx === item.answer
    this.setData({
      selectedOption: optIdx,
      quizAnswered: true,
      quizCorrect: correct
    })
    // 自动评分
    const ratings = { ...this.data.ratings }
    ratings[this.data.index] = correct ? 'right' : 'wrong'
    this.setData({ ratings, currentRating: correct ? 'right' : 'wrong' })
    wx.setStorageSync(storageKey(this.data.currentDeckId, 'ratings'), ratings)
    this.updateStats()
    this.persist()
    // 无论选对选错，都播放正确答案的法语发音
    const correctText = item.options[item.answer]
    const shouldSpeak = item.pronunciation !== undefined
      ? item.pronunciation
      : /[a-zàâçéèêëîïôûùüÿñæœ]/i.test(correctText)
    if (shouldSpeak) {
      this.playFrenchTTS(correctText)
    }
  },

  // 播放法语 TTS（选择题用）
  playFrenchTTS(text) {
    if (!text) return
    // 清理末尾标点，保留法语内容
    let t = text.replace(/[。．]/g, '').trim()
    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(t)}&le=fr&type=2`
    if (this._audioCtx) { this._audioCtx.stop(); this._audioCtx.destroy() }
    const audio = wx.createInnerAudioContext()
    this._audioCtx = audio
    audio.src = url
    audio.play()
    audio.onError((err) => {
      console.error('TTS error:', err)
    })
  },

  toggleHint() {
    this.setData({ showHint: !this.data.showHint })
  },

  // ==================== 复习模式 ====================

  toggleReviewMode() {
    if (this.data.mode === 'review') {
      // 退出复习模式，恢复当前分类的列表
      let list = this.data.fullList
      if (this.data.currentAlgoCategory) {
        list = list.filter(item => item.category === this.data.currentAlgoCategory)
      }
      if (!list.length) list = this.data.fullList
      this.setData({ list, total: list.length, index: 0, currentIndex: 0, showAnswer: 0, mode: 'normal' })
    } else {
      // 进入复习模式，从当前列表中筛选未掌握的
      const allList = this.data.list
      const ratings = this.data.ratings
      const reviewList = allList.filter((_, i) => !ratings[i] || ratings[i] === 'wrong')
      if (!reviewList.length) { wx.showToast({ title: '没有需要复习的题！', icon: 'success' }); return }
      this.setData({ list: reviewList, total: reviewList.length, index: 0, currentIndex: 0, showAnswer: 0, mode: 'review' })
    }
  },

  showStats() {
    const { ratedCount, total, weakCount, totalRated } = this.data
    const unrated = total - totalRated
    wx.showModal({
      title: '学习统计',
      content: `总题数：${total}\n已掌握(✓)：${ratedCount}题\n未掌握(✕)：${weakCount}题\n未评分：${unrated}题\n掌握率：${total ? Math.round(ratedCount / total * 100) : 0}%`,
      showCancel: false
    })
  },

  // ==================== 菜单 ====================

  showMenu() {
    const isAlgo = this.data.currentDeckId === 'algorithm'
    const menuItems = [
      this.data.mode === 'review' ? '退出复习模式' : '复习薄弱题',
      '学习统计',
      '切换题库',
      '刷新题库',
      '重置当前进度'
    ]
    if (isAlgo && this.data.algoCategories.length > 0) {
      const catLabel = this.data.currentAlgoCategory ? ('分类：' + this.data.currentAlgoCategory) : '按分类刷题'
      menuItems.splice(2, 0, catLabel)
    }
    wx.showActionSheet({
      itemList: menuItems,
      success: (res) => {
        if (isAlgo && this.data.algoCategories.length > 0) {
          // 有分类选项时，索引偏移
          switch (res.tapIndex) {
            case 0: this.toggleReviewMode(); break
            case 1: this.showStats(); break
            case 2: this.showCategoryFilter(); break
            case 3: this.showDeckPicker(); break
            case 4: this.loadDeck(this.data.currentDeckId); break
            case 5: this.resetAll(); break
          }
        } else {
          switch (res.tapIndex) {
            case 0: this.toggleReviewMode(); break
            case 1: this.showStats(); break
            case 2: this.showDeckPicker(); break
            case 3: this.loadDeck(this.data.currentDeckId); break
            case 4: this.resetAll(); break
          }
        }
      }
    })
  },

  goFeedback() {
    const q = this.data.list[this.data.index] ? encodeURIComponent(this.data.list[this.data.index].q) : ''
    wx.navigateTo({ url: `/pages/feedback/feedback?q=${q}` })
  },

  // ==================== 算法分类筛选 ====================

  showCategoryFilter() {
    const cats = this.data.algoCategories
    if (!cats.length) { wx.showToast({ title: '无分类数据', icon: 'none' }); return }
    const items = ['📋 全部分类'].concat(cats.map(c => (c === this.data.currentAlgoCategory ? '✓ ' : '') + c))
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        if (res.tapIndex === 0) {
          this.filterByCategory('')
        } else {
          this.filterByCategory(cats[res.tapIndex - 1])
        }
      }
    })
  },

  filterByCategory(cat) {
    // 如果是事件对象（从wxml bindtap触发）
    if (cat && typeof cat === 'object' && cat.currentTarget) {
      cat = cat.currentTarget.dataset.cat || ''
    }
    const dk = this.data.currentDeckId
    wx.setStorageSync(storageKey(dk, 'category'), cat)
    let filteredList = this.data.fullList
    if (cat) {
      filteredList = this.data.fullList.filter(item => item.category === cat)
    }
    if (!filteredList.length) {
      wx.showToast({ title: '该分类暂无题目', icon: 'none' })
      return
    }
    this.setData({
      currentAlgoCategory: cat,
      list: filteredList,
      total: filteredList.length,
      index: 0,
      currentIndex: 0,
      showAnswer: 0
    })
    this.updateCurrentRating()
    this.persist()
  },

  onCatTagTap(e) {
    const cat = e.currentTarget.dataset.cat || ''
    this.filterByCategory(cat)
  },

  // ==================== 核心操作 ====================

  persist() {
    wx.setStorageSync(storageKey(this.data.currentDeckId, 'state'), {
      index: this.data.index
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
    if (next === 2) this.updateCodeNodes()
  },

  showCode() {
    this.setData({ showAnswer: 2 })
    this.updateCodeNodes()
  },

  // C++ 语法高亮
  updateCodeNodes() {
    const item = this.data.list[this.data.index]
    if (!item || !item.code) { this.setData({ codeNodes: [] }); return }
    this.setData({ codeNodes: this.highlightCpp(item.code) })
  },

  highlightCpp(code) {
    const keywords = ['int','void','return','if','else','for','while','do','switch','case','break','continue',
      'class','struct','public','private','protected','virtual','override','const','static','new','delete',
      'true','false','nullptr','bool','char','double','float','long','short','unsigned','signed',
      'auto','using','namespace','template','typename','typedef','sizeof','this',
      'string','vector','map','set','unordered_map','unordered_set','pair','stack','queue',
      'priority_queue','deque','list','array','sort','push_back','emplace_back','begin','end',
      'size','empty','front','back','top','pop','push','insert','erase','find','count',
      'min','max','swap','reverse','lower_bound','upper_bound','make_pair',
      'INT_MAX','INT_MIN','LLONG_MAX','LLONG_MIN','npos',
      'cout','cin','endl','include','define','ifdef','ifndef','endif','pragma']
    const typeWords = ['int','void','bool','char','double','float','long','short','unsigned','signed','auto',
      'string','vector','map','set','unordered_map','unordered_set','pair','stack','queue',
      'priority_queue','deque','list','array','ListNode','TreeNode','Node']

    const lines = code.split('\n')
    const nodes = []
    let inBlockComment = false

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li]
      if (li > 0) nodes.push({ type: 'node', name: 'br' })
      let i = 0
      while (i < line.length) {
        // Block comment
        if (inBlockComment) {
          const endIdx = line.indexOf('*/', i)
          if (endIdx === -1) {
            nodes.push({ type: 'node', name: 'span', attrs: { style: 'color:#6A9955;' }, children: [{ type: 'text', text: this._esc(line.slice(i)) }] })
            i = line.length
          } else {
            nodes.push({ type: 'node', name: 'span', attrs: { style: 'color:#6A9955;' }, children: [{ type: 'text', text: this._esc(line.slice(i, endIdx + 2)) }] })
            i = endIdx + 2
            inBlockComment = false
          }
          continue
        }
        // Start block comment
        if (line[i] === '/' && line[i + 1] === '*') {
          inBlockComment = true
          const endIdx = line.indexOf('*/', i + 2)
          if (endIdx === -1) {
            nodes.push({ type: 'node', name: 'span', attrs: { style: 'color:#6A9955;' }, children: [{ type: 'text', text: this._esc(line.slice(i)) }] })
            i = line.length
          } else {
            nodes.push({ type: 'node', name: 'span', attrs: { style: 'color:#6A9955;' }, children: [{ type: 'text', text: this._esc(line.slice(i, endIdx + 2)) }] })
            i = endIdx + 2
            inBlockComment = false
          }
          continue
        }
        // Line comment
        if (line[i] === '/' && line[i + 1] === '/') {
          nodes.push({ type: 'node', name: 'span', attrs: { style: 'color:#6A9955;' }, children: [{ type: 'text', text: this._esc(line.slice(i)) }] })
          i = line.length
          continue
        }
        // Preprocessor
        if (line.trimStart()[0] === '#' && i === line.indexOf('#')) {
          nodes.push({ type: 'node', name: 'span', attrs: { style: 'color:#C586C0;' }, children: [{ type: 'text', text: this._esc(line.slice(i)) }] })
          i = line.length
          continue
        }
        // String
        if (line[i] === '"' || line[i] === "'") {
          const q = line[i]
          let j = i + 1
          while (j < line.length && line[j] !== q) { if (line[j] === '\\') j++; j++ }
          j = Math.min(j + 1, line.length)
          nodes.push({ type: 'node', name: 'span', attrs: { style: 'color:#CE9178;' }, children: [{ type: 'text', text: this._esc(line.slice(i, j)) }] })
          i = j
          continue
        }
        // Number
        if (/[0-9]/.test(line[i]) && (i === 0 || !/[a-zA-Z_]/.test(line[i - 1]))) {
          let j = i
          while (j < line.length && /[0-9a-fA-FxX.eEuUlL]/.test(line[j])) j++
          nodes.push({ type: 'node', name: 'span', attrs: { style: 'color:#B5CEA8;' }, children: [{ type: 'text', text: this._esc(line.slice(i, j)) }] })
          i = j
          continue
        }
        // Word (keyword / type / identifier)
        if (/[a-zA-Z_]/.test(line[i])) {
          let j = i
          while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++
          const word = line.slice(i, j)
          if (typeWords.indexOf(word) !== -1) {
            nodes.push({ type: 'node', name: 'span', attrs: { style: 'color:#4EC9B0;' }, children: [{ type: 'text', text: word }] })
          } else if (keywords.indexOf(word) !== -1) {
            nodes.push({ type: 'node', name: 'span', attrs: { style: 'color:#569CD6;' }, children: [{ type: 'text', text: word }] })
          } else {
            nodes.push({ type: 'text', text: word })
          }
          i = j
          continue
        }
        // Operator / punctuation
        nodes.push({ type: 'text', text: this._esc(line[i]) })
        i++
      }
    }
    return nodes
  },

  _esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  },

  // 打乱题目顺序（Fisher-Yates 洗牌）
  shuffleList() {
    const list = [...this.data.list]
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]]
    }
    this.setData({ list, index: 0, currentIndex: 0, showAnswer: 0 })
    this.persist()
    wx.showToast({ title: '已打乱顺序', icon: 'none' })
  },

  // 自动发音：日语题库切换卡片时自动播放
  autoPlayTTS() {
    if (this.data.ttsLang === 'ja') {
      setTimeout(() => this.playTTS(), 300)
    }
  },

  // 发音功能：有道词典 TTS
  playTTS() {
    const item = this.data.list[this.data.index]
    if (!item || !this.data.ttsLang) return

    let text = ''
    const lang = this.data.ttsLang

    if (lang === 'ja') {
      const m = item.q.match(/^([ぁ-んァ-ヶー\u4e00-\u9fff]+)/)
      if (m) text = m[1]
      else text = item.q.split('/')[0].trim().split(' ')[0]
    } else if (lang === 'fr') {
      const aText = item.a || ''
      if (/[a-zàâçéèêëîïôûùüÿñæœ]/i.test(aText)) {
        text = aText.replace(/[。．]/g, '').trim()
      } else {
        text = item.q
      }
    } else {
      text = item.q
    }

    if (!text) { wx.showToast({ title: '无法识别发音内容', icon: 'none' }); return }

    const leMap = { ja: 'jap', fr: 'fr', en: 'eng' }
    const le = leMap[lang] || 'eng'
    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&le=${le}&type=2`

    if (this._audioCtx) { this._audioCtx.stop(); this._audioCtx.destroy() }
    const audio = wx.createInnerAudioContext()
    this._audioCtx = audio
    audio.src = url
    audio.play()
    audio.onError((err) => {
      console.error('TTS error:', err)
      wx.showToast({ title: '发音失败', icon: 'none' })
    })
  },

  onSwiperChange(e) {
    const newIndex = e.detail.current
    if (newIndex !== this.data.currentIndex) {
      this.setData({ index: newIndex, currentIndex: newIndex, showAnswer: 0, selectedOption: -1, quizAnswered: false, quizCorrect: false, showHint: false })
      this.updateCurrentRating()
      this.persist()
      this.autoPlayTTS()
    }
  },

  goPrev() {
    if (this.data.index <= 0) return
    const idx = this.data.index - 1
    this.setData({ index: idx, currentIndex: idx, showAnswer: 0, selectedOption: -1, quizAnswered: false, quizCorrect: false, showHint: false })
    this.updateCurrentRating()
    this.persist()
    this.autoPlayTTS()
  },

  goNext() {
    if (this.data.index >= this.data.total - 1) return
    const idx = this.data.index + 1
    this.setData({ index: idx, currentIndex: idx, showAnswer: 0, selectedOption: -1, quizAnswered: false, quizCorrect: false, showHint: false })
    this.updateCurrentRating()
    this.persist()
    this.autoPlayTTS()
  },

  resetAll() {
    wx.showModal({
      title: '重置当前题库进度',
      content: '将清空进度和评分',
      success: (res) => {
        if (res.confirm) {
          const dk = this.data.currentDeckId
          wx.removeStorageSync(storageKey(dk, 'ratings'))
          wx.removeStorageSync(storageKey(dk, 'state'))
          wx.removeStorageSync(storageKey(dk, 'category'))
          const list = this.data.fullList.length ? this.data.fullList : this.data.list
          this.setData({
            index: 0, currentIndex: 0, showAnswer: 0,
            ratings: {}, currentRating: '', codeNodes: [],
            list: list, fullList: list, total: list.length,
            currentAlgoCategory: ''
          })
          this.persist()
          this.updateStats()
        }
      }
    })
  }
})
