const FATAL_REBUILD_TOLERANCE = 10
const SETDATA_SCROLL_TO_BOTTOM = {
  scrollTop: 100000,
  scrollWithAnimation: true,
}
const BASE_URL = '192.168.6.31:8080'
const RETRY_INTERVAL = 1000 //1s

Component({
  properties: {
    envId: String,
    collection: String,
    groupId: String,
    groupName: String,
    userInfo: Object,
    onGetUserInfo: {
      type: Function,
    },
    getOpenID: {
      type: Function,
    },
  },

  data: {
    chats: [],
    textInputValue: '',
    openId: '',
    scrollTop: 0,
    scrollToMessage: '',
    hasKeyboard: false,
  },

  methods: {
    async connect() {
      wx.connectSocket({
        url: `ws://${BASE_URL}/chat`,
        header: {'content-type':'application/json'},
        method: 'GET',
        protocols: [],
        success: ()=>{
          console.log('websocket connect success')
          this.handleEvent()
        },
        fail: ()=>{
          console.log('websocket connect fail')
          setTimeout(this.reconnect, RETRY_INTERVAL)
        },
        complete: ()=>{
          console.log('websocket connect complete')
        }
      });
    },

    handleEvent() {
      wx.onSocketMessage((res) => {
        console.log(`接受到消息 ${res}`)
        this.onReceiveMessage(res)
      })
      wx.onSocketOpen(()=>{
        console.log('WebSocket连接打开')
      })
      wx.onSocketError( (res)=> {
        console.log('WebSocket连接打开失败')
        setTimeout(this.reconnect, RETRY_INTERVAL)
      })
      wx.onSocketClose(function (res) {
        console.log('WebSocket 已关闭！')
      })
    },

    reconnect() {
      console.log('尝试重新连接')
      this.connect()
    },

    onReceiveMessage(message) {
      const doc = {
        _id: `${Math.random()}_${Date.now()}`,
        groupId: this.data.groupId,
        avatar: '../../images/avatar.png',
        nickName: this.data.userInfo.nickName,
        msgType: 'text',
        textContent: message.data,
        sendTime: new Date(),
        sendTimeTS: Date.now(), // fallback
      }

      this.setData({
        textInputValue: '',
        chats: [
          ...this.data.chats,
          {
            ...doc,
            _openid: 'sender',
            writeStatus: 'written',
          },
        ],
      })
      this.scrollToBottom(true)
    },

    sendMessage(message) {
      wx.sendSocketMessage({
        data: message,
        success: (result)=>{
          console.log(`message ${message} 发送成功`)
        },
        fail: ()=>{
          console.log(`message ${message} 发送失败`)
        },
        complete: ()=>{}
      });
    },

    async onConfirmSendText(e) {
      this.try(async () => {
        if (!e.detail.value) {
          return
        }

        const doc = {
          _id: `${Math.random()}_${Date.now()}`,
          groupId: this.data.groupId,
          avatar: this.data.userInfo.avatarUrl,
          nickName: this.data.userInfo.nickName,
          msgType: 'text',
          textContent: e.detail.value,
          sendTime: new Date(),
          sendTimeTS: Date.now(), // fallback
        }

        this.setData({
          textInputValue: '',
          chats: [
            ...this.data.chats,
            {
              ...doc,
              _openid: this.data.openId,
              writeStatus: 'pending',
            },
          ],
        })
        this.scrollToBottom(true)

        this.sendMessage(e.detail.value)

        this.setData({
          chats: this.data.chats.map(chat => {
            if (chat._id === doc._id) {
              return {
                ...chat,
                writeStatus: 'written',
              }
            } else return chat
          }),
        })
      }, '发送文字失败')
    },

    scrollToBottom(force) {
      if (force) {
        console.log('force scroll to bottom')
        this.setData(SETDATA_SCROLL_TO_BOTTOM)
        return
      }

      this.createSelectorQuery().select('.body').boundingClientRect(bodyRect => {
        this.createSelectorQuery().select(`.body`).scrollOffset(scroll => {
          if (scroll.scrollTop + bodyRect.height * 3 > scroll.scrollHeight) {
            console.log('should scroll to bottom')
            this.setData(SETDATA_SCROLL_TO_BOTTOM)
          }
        }).exec()
      }).exec()
    },

    async try(fn, title) {
      try {
        await fn()
      } catch (e) {
        this.showError(title, e)
      }
    },

    showError(title, content, confirmText, confirmCallback) {
      console.error(title, content)
      wx.showModal({
        title,
        content: content.toString(),
        showCancel: confirmText ? true : false,
        confirmText,
        success: res => {
          res.confirm && confirmCallback()
        },
      })
    },
  },

  ready() {
    global.chatroom = this
    // this.initRoom()
    this.connect()
    this.fatalRebuildCount = 0
  },

  onLaunch() {
    console.log('onLaunch')
  },

  onReady() {
    console.log('onReady')
  },

  onShow() {
    console.log('onShow')
  },

  onHide() {
    console.log('onHide')
  },

  onUnload() {
    console.log('onUnload')
  },

})
