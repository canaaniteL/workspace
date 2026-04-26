const FEEDBACK_KEY = 'flashcard_feedbacks_v1'

Page({
  data: {
    feedbacks: [],
    showForm: false,
    formType: 'feedback',  // 'feedback' | 'question'
    inputQuestion: '',
    inputAnswer: '',
    inputContent: '',
    currentCardQ: ''
  },

  onLoad(options) {
    this.loadFeedbacks()
    if (options.q) {
      this.setData({ currentCardQ: decodeURIComponent(options.q) })
    }
  },

  onShow() {
    this.loadFeedbacks()
  },

  loadFeedbacks() {
    const feedbacks = wx.getStorageSync(FEEDBACK_KEY) || []
    // 按时间倒序
    feedbacks.sort((a, b) => b.time - a.time)
    this.setData({ feedbacks })
  },

  // 切换表单类型
  switchType(e) {
    this.setData({ formType: e.currentTarget.dataset.type })
  },

  // 显示表单
  showAddForm() {
    this.setData({
      showForm: true,
      formType: 'feedback',
      inputQuestion: this.data.currentCardQ || '',
      inputAnswer: '',
      inputContent: ''
    })
  },

  hideForm() {
    this.setData({ showForm: false })
  },

  // 输入绑定
  onInputQuestion(e) { this.setData({ inputQuestion: e.detail.value }) },
  onInputAnswer(e) { this.setData({ inputAnswer: e.detail.value }) },
  onInputContent(e) { this.setData({ inputContent: e.detail.value }) },

  // 提交
  submitFeedback() {
    const { formType, inputQuestion, inputAnswer, inputContent } = this.data

    if (formType === 'question') {
      if (!inputQuestion.trim() || !inputAnswer.trim()) {
        wx.showToast({ title: '题目和答案不能为空', icon: 'none' }); return
      }
    } else {
      if (!inputContent.trim()) {
        wx.showToast({ title: '请填写反馈内容', icon: 'none' }); return
      }
    }

    const feedbacks = wx.getStorageSync(FEEDBACK_KEY) || []
    const item = {
      id: Date.now(),
      type: formType,
      time: Date.now(),
      relatedQ: this.data.currentCardQ || ''
    }

    if (formType === 'question') {
      item.question = inputQuestion.trim()
      item.answer = inputAnswer.trim()
    } else {
      item.content = inputContent.trim()
      item.relatedQ = inputQuestion.trim() || this.data.currentCardQ || ''
    }

    feedbacks.push(item)
    wx.setStorageSync(FEEDBACK_KEY, feedbacks)

    this.setData({
      showForm: false,
      inputQuestion: '',
      inputAnswer: '',
      inputContent: ''
    })
    this.loadFeedbacks()
    wx.showToast({ title: '提交成功', icon: 'success' })
  },

  // 删除
  deleteFeedback(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: (res) => {
        if (res.confirm) {
          let feedbacks = wx.getStorageSync(FEEDBACK_KEY) || []
          feedbacks = feedbacks.filter(f => f.id !== id)
          wx.setStorageSync(FEEDBACK_KEY, feedbacks)
          this.loadFeedbacks()
        }
      }
    })
  },

  // 格式化时间
  formatTime(ts) {
    const d = new Date(ts)
    const pad = n => n < 10 ? '0' + n : n
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
})
