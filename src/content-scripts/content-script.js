import ua from 'universal-analytics'
const PhoneNumber = require('awesome-phonenumber')
import moment from 'moment'
import { debounce } from 'lodash'
import Vue from 'vue'
import App from './App.vue'
import VueI18n from 'vue-i18n'
import ElementUI from 'element-ui'
import messages from '@/popup/messages.js'
import {
  checkDailySendNums,
  getIncrDailySendNums,
  incrDailySendNums
} from '@/utils/daily-send-num-util'
import { deleteList } from '@/utils/common/common-util'
import { getContinueSendData } from '@/utils/continue-send-util'
import { sendLog } from '@/utils/log-util'
import { isGroupPhoneNumList } from '@/utils/group-phone-num-utils'
import { getRetryFailedSendData } from '@/utils/retry-failed-util'
import { base64ImageToFile, base64ImageToBlob } from '@/utils/base64'
import { getBrowser } from '@/utils/browser-util'
import { $1_7Days_Pro } from '@/config/pay-config'
import { permissionInfo, permissionSync } from '../api/permission'
import { allowWindowMessaging, sendMessage } from 'webext-bridge/dist/content-script'
import { injectMask, startVmRecord } from './page/content-mask'
import {
  ALLOW_WINDOW_MESSAGING,
  CONTENT_TO_BACKGROUND_Z_BASE_TYPE,
  CONTENT_TO_BACKGROUND_USER_PHONE_NUM,
  CONTENT_TO_BACKGROUND_INSTALL_LOG_FLAG,
  CONTENT_TO_BACKGROUND_IPCONFIG,
  CONTENT_TO_INJECT_CURRENT_CHAT,
  CONTENT_TO_INJECT_MEDIA_DETAIL,
  CONTENT_TO_INJECT_BUTTON_DETAIL,
  CONTENT_TO_POP_IS_SHOW_NO_ACTIVE,
  CONTENT_TO_POP_IS_SHOW_NO_SUBSCRIPTION,
  CONTENT_TO_POP_IS_ONE_NO_SUBSCRIPTION,
  CONTENT_TO_POP_SHOW_SAVE_TIME_DIALOG,
  CONTENT_TO_POP_GET_PRO_PERMISSION
} from '@/service/constants.js'
import { installMark } from '@/content-scripts/installMark.js'
import { createPopup } from '@/content-scripts/CommentGuide/userEvaluation'
import '@/content-scripts/CommentGuide/userEvaluation/content-teleram.css'

// 临时引流
import './drainage'
allowWindowMessaging(ALLOW_WINDOW_MESSAGING)
// 从本地获取用户的whatsapp手机号
let myNumber = ''
// 记录发送消息的成功次数和失败次数
let countSuccess = 0
let countFail = 0
// 记录用户是否停止发送
let stopFlag = false
let stopFlagSimple = false
// GA日志
let visitor = ua('UA-140648082-17')
// 双重标识来确保inject不会多次加载
let injectRepeatFlag = true

// Batching configuration loaded from storage
const DEFAULT_BATCH_PAUSE = 240
const DEFAULT_BATCH_EVERY = 80
let batchPauseSeconds = DEFAULT_BATCH_PAUSE
let batchEveryMessages = DEFAULT_BATCH_EVERY

function clampBatch(val, def, max) {
  val = parseInt(val, 10)
  if (isNaN(val)) return def
  if (val < 1) return 1
  if (val > max) return max
  return val
}

try {
  chrome.storage.local.get(
    ['batchPauseSeconds', 'batchEveryMessages'],
    (res) => {
      batchPauseSeconds = clampBatch(
        res.batchPauseSeconds,
        DEFAULT_BATCH_PAUSE,
        300
      )
      batchEveryMessages = clampBatch(
        res.batchEveryMessages,
        DEFAULT_BATCH_EVERY,
        100
      )
    }
  )
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    if (changes.batchPauseSeconds)
      batchPauseSeconds = clampBatch(
        changes.batchPauseSeconds.newValue,
        DEFAULT_BATCH_PAUSE,
        300
      )
    if (changes.batchEveryMessages)
      batchEveryMessages = clampBatch(
        changes.batchEveryMessages.newValue,
        DEFAULT_BATCH_EVERY,
        100
      )
  })
} catch (e) {}

sendMessage(CONTENT_TO_BACKGROUND_Z_BASE_TYPE, { zbaseType: 'zbase-content-init' }, 'background')
// content加载的时候重置一下这四个参数。
chrome.storage.local
  .set({
    stopFlag: true,
    stopFlagSimple: true,
    // isShowContinueBtn: false,
    disabledSendingFlag: true
  })
  .then((r) => {})
chrome.runtime
  .sendMessage({
    stopFlag: true,
    stopFlagSimple: true,
    // isShowContinueBtn: false,
    disabledSendingFlag: true
  })
  .then((r) => {})

/**
 * 注入邀请弹窗
 * @returns
 */
function mountEvaluationPop() {
  createPopup()
  return Promise.resolve('注入成功')
}

Vue.use(ElementUI)
Vue.use(VueI18n)

const i18n = new VueI18n({
  locale: window.navigator.language || 'en',
  messages
})

let div = document.createElement('div')
let coententDiv = document.createElement('div')
div.appendChild(coententDiv)
document.body.append(div)
/* eslint-disable no-new */
// 创建一个div挂在在body中
new Vue({
  i18n,
  el: coententDiv,
  render: (h) => h(App)
})

//获取用户自身的手机号
function getLocalNum() {
  try {
    // 前两句是对CRM插件的校验，为了和CRM本身的兼容
    let extensionCrm = window.localStorage.getItem('extensionCrm')
    if (extensionCrm) {
      chrome.storage.local.set({ extensionCrm: true }).then((r) => {})
    }
    let data
    if (window.localStorage.getItem('last-wid')) {
      data = window.localStorage.getItem('last-wid')
      myNumber = data.split('@')[0].substring(1)
    } else {
      data = window.localStorage.getItem('last-wid-md')
      myNumber = data.split(':')[0].substring(1)
    }
  } catch (e) {
    // 因为try..catch了，所以报错了也会继续向下走
    console.log('content-script:get phone number error')
  }
  // 设置用户手机号
  chrome.storage.local.set({ userPhoneNum: myNumber, loadTimes: 1 }).then((r) => {})
  // 给background传递用户手机号，用来给GA日志传递信息
  sendMessage(CONTENT_TO_BACKGROUND_USER_PHONE_NUM, { userPhoneNum: myNumber }, 'background')
  return myNumber
}
let permissionStatus = 'Free'
let permissionCheckCount = 0
// 获取本地手机号
window.onload = function () {
  let myNumber = getLocalNum()
  // noinspection JSDeprecatedSymbols
  const browserData = {
    browserInfo: getBrowser(),
    platform: window.navigator.platform,
    language: window.navigator.language,
    phoneNum: myNumber
  }

  //todo 没有看懂这块为什么要展开运算符处理一下～
  chrome.storage.local.set({ ...browserData }).then((r) => {})

  // 默认不弹框
  chrome.storage.local.remove([
    'isShowNoSubscription',
    'isOneNoSubscription',
    'isShowNoActive',
    'actionCodeList'
  ])

  // 发送安装日志，如果之前没有存储过 installLogFlag 字段，就代表我们是新安装的插件
  sendInstallLog(myNumber, browserData)
}
function sendInstallLogFlagMsg(flag) {
  sendMessage(CONTENT_TO_BACKGROUND_INSTALL_LOG_FLAG, { installLogFlag: flag }, 'background')
}
function sendInstallLog(myNumber, browserData) {
  chrome.storage.local.get(['installLogFlag', 'permissionInfo'], function (res) {
    if (res.installLogFlag === false) {
      sendLog(900011, browserData)
      chrome.storage.local.set({ installLogFlag: true }).then((r) => {})
      // 如果是第一次安装并且是获取不到手机号的扫码页面，需要跟background通信让其设置卸载页面
      if (!myNumber) {
        sendInstallLogFlagMsg(true)
      }
    }
    /**
     * 插件加载的时候，只有加载出手机号码了，我们才能判断权限
     */
    if (myNumber) {
      if (res.permissionInfo && 'transaction_id' in res.permissionInfo) {
        syncPermission(myNumber, res.permissionInfo['transaction_id'])
      } else {
        syncAccountPermission(myNumber)
      }
    }
  })
}

/**
 * 由于permissionSync和permissionInfo接口返回值一样，所以这里统一处理
 * @param response
 */
function handlePermission(response) {
  // 权限接口返回异常的时候，保持之前的权限
  if (!response) {
    return
  }
  if (response.code === 100000) {
    permissionCheckCount = 0
    // 一个小时之前的时间
    const currentTimestamp = parseInt(new Date().setDate(new Date().getDate() - 1) / 1000)
    if (currentTimestamp < response.data['expiration_time']) {
      // 用户购买了，但是没有激活，刷新whatsapp时触发弹框
      if (response.data['pay_status'] === 1) {
        chrome.storage.local.set({
          actionCodeList: response.data['active_code_list'],
          isShowNoActive: true
        })
        sendMessage(CONTENT_TO_POP_IS_SHOW_NO_ACTIVE, { isShowNoActive: true }, 'popup')
      }
      chrome.storage.local.set({ permissionInfo: response.data, paid_mark: true }, () => {
        permissionStatus = 'Pro'
      })
      // 用户购买了订阅套餐，但是没有续订, 1美元套餐
    } else if (
      currentTimestamp > response.data['expiration_time'] &&
      response.data['plink_id'] === $1_7Days_Pro
    ) {
      chrome.storage.local.set({
        permissionInfo: response.data,
        paid_mark: true,
        isOneNoSubscription: true
      })
      sendMessage(CONTENT_TO_POP_IS_ONE_NO_SUBSCRIPTION, { isOneNoSubscription: true }, 'popup')
      // 用户购买了订阅套餐，但是没有续订, 9美元或20美元套餐
    } else if (
      currentTimestamp > response.data['expiration_time'] &&
      response.data['plink_id'] !== $1_7Days_Pro
    ) {
      chrome.storage.local.set({
        permissionInfo: response.data,
        paid_mark: true,
        isShowNoSubscription: true
      })
      sendMessage(CONTENT_TO_POP_IS_SHOW_NO_SUBSCRIPTION, { isShowNoSubscription: true }, 'popup')
    }
  } else {
    chrome.storage.local.remove('permissionInfo', () => {})
    permissionCheckCount += 1
  }
}

function syncAccountPermission(myNumber) {
  //同步账号本身的权限
  permissionSync(myNumber).then((response) => {
    handlePermission(response)
  })
}

function syncPermission(myNumber, transaction_id) {
  // 在插件中对权限进行同步
  permissionInfo(myNumber, transaction_id).then((response) => {
    handlePermission(response)
  })
}

// 轮训加载，如果页面加载完成执行addInject
listenHeaderDom()

// 注入inject.js文件
function addInject() {
  return new Promise((resolve, reject) => {
    let jsPath = '/js/inject/inject.js'
    let temp = document.createElement('script')
    temp.setAttribute('type', 'text/javascript')
    temp.setAttribute('id', 'inject')
    temp.src = chrome.runtime.getURL(jsPath)
    temp.onload = function () {
      this.parentNode.removeChild(this)
      resolve()
    }
    temp.onerror = function () {
      reject()
    }
    document.head.appendChild(temp)
  })
}

function addInjectTwo() {
  return new Promise((resolve, reject) => {
    let jsPath = '../../../WAPIAPI.js'
    let temp = document.createElement('script')
    temp.setAttribute('type', 'text/javascript')
    temp.setAttribute('id', 'injectTwo')
    temp.src = chrome.runtime.getURL(jsPath)
    temp.onload = function () {
      //放在页面不好看，执行完后移除掉
      this.parentNode.removeChild(this)
      resolve()
    }
    temp.onerror = function () {
      reject()
    }
    document.head.appendChild(temp)
  })
}

// async function sendPrivateDomain() {
//   let content = "Hello, I'm using the WAPI."
//   const res = await chrome.storage.local.get(['zbaseConfig'])
//   let servicePhoneConf =
//     res.zbaseConfig?.data?.config?.find((item) => item.name === 'servicePhone')?.params?.privateDomainPhone ??
//     '8613161611906'
//   let condition = await openChat(servicePhoneConf, content)
//   if (condition && document.querySelectorAll("[contenteditable='true']")[1]) {
//     await sendText(content, 'send')
//     return true
//   } else {
//     return false
//   }
// }

/**
 * @description: 定时消息触发函数
 * @return {*}
 */
const handleSchedulerMessage = async () => {
  const { isScheduleMessageIng, scheduleTime } = await chrome.storage.local.get([
    'isScheduleMessageIng',
    'scheduleTime'
  ])

  if (!isScheduleMessageIng) return

  const startTime = moment()
  const endTime = moment(scheduleTime)

  // 判断 startTime 是否等于或在 endTime 之后，精确到分钟
  const isSameOrAfter = startTime.isSameOrAfter(endTime, 'minute')

  if (!isSameOrAfter) return

  chrome.storage.local.get(
    ['confirmSetData', 'allDataImg', 'allDataVideo', 'allDataDocument', 'confirmSendData', 'audio'],
    (res) => {
      if (res.confirmSetData) {
        chrome.storage.local.set(res.confirmSetData)
      }
      if (typeof res.confirmSendData === 'object' && res.confirmSendData !== null) {
        let confirmSendData = res.confirmSendData
        confirmSendData.allDataImg = res.allDataImg ? res.allDataImg : []
        confirmSendData.allDataVideo = res.allDataVideo ? res.allDataVideo : []
        confirmSendData.allDataDocument = res.allDataDocument ? res.allDataDocument : []
        confirmSendData.audio = res.audio || {}
        listenerCallBackFunc({ ...res.confirmSendData })
        sendLog(902210, {
          ...res.confirmSendData
        })
        chrome.storage.local.set({ isScheduleMessageIng: false })
      }
    }
  )
}

import './message'
async function listenerCallBackFunc(data, sender, sendResponse) {
  if (data.type === 'SCHEDULE_PER_MIN') {
    handleSchedulerMessage()
  }

  // 处理部分popup发送的请求
  function joinGroup(data) {
    let aLink = document.createElement('a')
    aLink.href = data.message.url
    aLink.target = '_blank'
    document.body.appendChild(aLink)
    aLink.click()
    document.body.removeChild(aLink)
  }
  if (data.from === 'popup') {
    switch (data.id) {
      case 'joinGroup':
        joinGroup(data)
        break
    }
    return true
  }
  if (data.sendPrivateDomain) {
    // 注释掉 私域发送消息功能
    // await sendPrivateDomain()
    sendMessage(CONTENT_TO_POP_GET_PRO_PERMISSION, { getProPermission: true }, 'popup')
  }
  /**
   * 与pop通讯，返回消息表示加载content成功，加载成功，同步判断记录用户IP数据
   */
  if (data.msgFlag) {
    sendResponse({ contentConnect: true })
    sendMessage(CONTENT_TO_BACKGROUND_IPCONFIG, {}, 'background')
  }
  countSuccess = 0
  countFail = 0
  let phoneNumList = []
  let phoneNumSuccessList = []
  let phoneNumFailList = []
  let repeatList = []
  let oldSuccessAndFailList = []
  let phoneNum = data.phoneNum //输入框电话号码
  let content = data.content
  let mediaType = data.mediaType
  let minNum = data.minNum
  let maxNum = data.maxNum
  let sendAttachments = data.sendAttachments
  let uploadExcel = data.uploadExcel
  let groupConcats = data.groupConcats
  let labelConcats = data.labelConcats
  let exportGroup = data.exportGroup
  let exportGroupInfo = data.exportGroupInfo
  let queryAllGroups = data.queryAllGroups
  let reload = data.reload
  let dailySendNums = data.dailySendNums
  let sendMessageType = data.sendMessageType
  let openChatPhoneNum = data.openChat
  let continueSendData = data.continueSendData
  let allDataImg = data.allDataImg
  let allDataVideo = data.allDataVideo
  let allDataDocument = data.allDataDocument
  let limit_continue = data.limit_continue
  let sendButtonValue = data.sendButtonValue
  let buttonInputValue = data.buttonInputValue
  let button_radio = data.button_radio
  let isDeleteMessage = data.isDeleteMessage
  let exportType = data.exportType
  let exportFrom = data.exportFrom
  let valueGroup = data.valueGroup
  let valueLabel = data.valueLabel
  // let excludeAdminValue = data.excludeAdminValue;
  let excludeAdminValue = data.excludeGroupAdminsValue
  let openChatNum = data.openChatNum
  if (reload) {
    window.location.reload()
  }
  //发送Simple消息的时候是disabled
  stopFlag = data.stopFlag
  //发送Simple消息的时候是false
  stopFlagSimple = data.stopFlagSimple
  // 判断是跳转选择本地图片文字 还是发送消息 还是导出群组消息
  // 跳转选择本地图片文字
  if (sendAttachments) {
    if (mediaType === 'contact')
      try {
        //打开附件不用延时3秒，快速响应即可，所以timeout参数设成1
        await openChat(myNumber, '', 1)
        // 在发送附件按钮模拟鼠标操作
        await clickOnElements('[data-testid="clip"] svg')
        // 在具体发送一种类型文件的地方模拟鼠标操作
        await clickMediaIcon(mediaType)
      } catch (e) {}
    // 导出标签、群组消息
  } else if (exportType) {
    window.postMessage(
      {
        waExporterDownload: true,
        exportType,
        exportFrom,
        excludeAdminValue,
        valueGroup,
        valueLabel,
        exportGroup,
        module: 'wapi sender'
      },
      '*'
    )

    // 没有被使用，暂时注释掉
    // await sleep(2000,2000);
    // chrome.storage.local.get(null, function (res) {
    //     chrome.storage.local.set({exportGroupSuccess:false})
    // })
  } else if (openChatNum) {
    await openChat(openChatNum, 'Hi ' + chrome.runtime.getManifest().name + '! I have a question.')
    //发送消息
  } else if (queryAllGroups) {
    window.postMessage({ queryAllGroups: queryAllGroups, module: 'wapi sender' }, '*')
  } else if (openChatPhoneNum) {
    let condition = await openChat(openChatPhoneNum, 'Hi Bulk Sender!I have a question.')
    if (condition) {
      await sendText('Hi Bulk Sender!I have a question.', 'input')
    }
  } else if (stopFlag && stopFlagSimple) {
    // 防止停止操作触发后面的逻辑, 导致数据产生变更
    console.log('stopFlag stop.....')
  } else if (continueSendData !== undefined) {
    if (dailySendNums) {
      // 继续发送消息
      await main(
        continueSendData.phoneNumList,
        continueSendData.phoneNumSuccessList,
        continueSendData.phoneNumFailList,
        continueSendData.repeatList,
        continueSendData.oldSuccessAndFailList,
        continueSendData.indexCount,
        continueSendData.content,
        continueSendData.mediaType,
        continueSendData.minNum,
        continueSendData.maxNum,
        continueSendData.excelData,
        dailySendNums,
        continueSendData.sendMessageType,
        continueSendData.allDataImg,
        continueSendData.allDataVideo,
        continueSendData.allDataDocument,
        continueSendData.sendButtonValue,
        continueSendData.buttonInputValue,
        continueSendData.button_radio,
        isDeleteMessage,

        data.audio || {}
      )
    }
  } else if (limit_continue) {
    chrome.storage.local.get(['continueSendData', 'dailySendNums', 'audio'], async function (res) {
      if (res.dailySendNums) {
        let continueSendDataLimit = res.continueSendData
        // 限制弹窗触发后，继续发消息
        await main(
          continueSendDataLimit.phoneNumList,
          continueSendDataLimit.phoneNumSuccessList,
          continueSendDataLimit.phoneNumFailList,
          continueSendDataLimit.repeatList,
          continueSendDataLimit.oldSuccessAndFailList,
          continueSendDataLimit.indexCount,
          continueSendDataLimit.content,
          continueSendDataLimit.mediaType,
          continueSendDataLimit.minNum,
          continueSendDataLimit.maxNum,
          continueSendDataLimit.excelData,
          res.dailySendNums,
          continueSendDataLimit.sendMessageType,
          continueSendDataLimit.allDataImg,
          continueSendDataLimit.allDataVideo,
          continueSendDataLimit.allDataDocument,
          continueSendDataLimit.sendButtonValue,
          continueSendDataLimit.buttonInputValue,
          continueSendDataLimit.button_radio,
          isDeleteMessage,
          res.audio || {}
        )
      }
    })
  } else if (data.audioControl) {
    let val = data.audioControl
    startVmRecord(val)
  } else {
    let { excelData, phoneNumsList } = await setPhoneNumList(
      uploadExcel,
      phoneNumList,
      groupConcats,
      labelConcats
    )
    phoneNumList = getPhoneNumList(phoneNum, phoneNumsList)
    // 只有存在联系人才进行发送操作All
    if (phoneNumList.length !== 0) {
      // 一旦开始群发就把之前的continueData替换掉
      let continueSendData = getContinueSendData(
        phoneNumList,
        phoneNumSuccessList,
        phoneNumFailList,
        repeatList,
        oldSuccessAndFailList,
        0,
        content,
        mediaType,
        minNum,
        maxNum,
        excelData,
        sendMessageType,
        allDataImg,
        allDataVideo,
        allDataDocument,
        sendButtonValue,
        buttonInputValue,
        button_radio,
        isDeleteMessage
      )
      chrome.storage.local.set({ continueSendData })
      toSetLocalAndMessage(phoneNumList, dailySendNums, oldSuccessAndFailList)
      await main(
        phoneNumList,
        phoneNumSuccessList,
        phoneNumFailList,
        repeatList,
        oldSuccessAndFailList,
        0,
        content,
        mediaType,
        minNum,
        maxNum,
        excelData,
        dailySendNums,
        sendMessageType,
        allDataImg,
        allDataVideo,
        allDataDocument,
        sendButtonValue,
        buttonInputValue,
        button_radio,
        isDeleteMessage,

        data.audio || {}
      )
    }
  }
  return true
}
chrome.runtime.onMessage.addListener(listenerCallBackFunc)

function toSetLocalAndMessage(phoneNumList, dailySendNums, oldSuccessAndFailList) {
  chrome.storage.local
    .set({
      countTotal: phoneNumList.length,
      deduplicated: removeDuplicated(phoneNumList).length,
      countAll: uniq(phoneNumList, oldSuccessAndFailList).length,
      dailySendNums: dailySendNums
    })
    .then((r) => {})
  chrome.runtime
    .sendMessage({
      countTotal: phoneNumList.length,
      deduplicated: removeDuplicated(phoneNumList).length,
      countAll: uniq(phoneNumList, oldSuccessAndFailList).length,
      dailySendNums: dailySendNums
    })
    .then((r) => {})
  chrome.storage.local.set({ phoneNumList: phoneNumList }).then((r) => {})
}

async function setPhoneNumList(uploadExcel, phoneNumList, groupConcats, labelConcats) {
  // 1、 加载获取所有需要发送的手机号
  let excelData = await getExcelData(uploadExcel)
  // 如果导入了excel,将excel联系人压入发送消息的联系人数组
  // //将excel导入联系人去除+号，为了去重
  if (excelData) {
    for (let i = 0; i < excelData.length; i++) {
      // 去掉加号,去掉空格,去掉复制粘贴误操作字符,去掉零宽字符
      let reg = /[+'"\s\u202a\u202c]/g
      // 如下的replace替换是把excel中的号码进行合理化，将前后无效字符去掉
      excelData[i]['WhatsApp Number'] = excelData[i]['WhatsApp Number'].toString().replace(reg, '')
      phoneNumList.push(excelData[i]['WhatsApp Number'])
    }
  }
  let groupMembersPhoneList = await getGroupMemberData(groupConcats)
  //将群组导入联系人去除+号，为了去重
  if (groupMembersPhoneList) {
    for (let i = 0; i < groupMembersPhoneList.length; i++) {
      groupMembersPhoneList[i] = groupMembersPhoneList[i].replace('+', '')
      phoneNumList.push(groupMembersPhoneList[i])
    }
  }

  // 获取label用户信息
  let labelMembersPhoneList = await getLabelMemberData(labelConcats)
  //将群组导入联系人去除+号，为了去重
  if (labelMembersPhoneList) {
    for (let i = 0; i < labelMembersPhoneList.length; i++) {
      labelMembersPhoneList[i] = labelMembersPhoneList[i].replace('+', '')
      phoneNumList.push(labelMembersPhoneList[i])
    }
  }
  return new Promise((resolve, reject) => {
    resolve({
      excelData,
      phoneNumsList: phoneNumList,
      groupMembersPhoneList,
      labelMembersPhoneList
    })
  })
}

/**
 *
 * usage:
 *      let p = eventDB.add("key");
 *      await p
 *      eventDB.fire("key")
 */
var eventDB = {
  db: {},
  add: function ({ key = null, timeout = 5 * 1000, _default = true } = {}) {
    return new Promise((resolve, reject) => {
      // 超时自动结束，避免卡死进程
      let timeoutID = setTimeout(() => {
        resolve(_default)
        delete this.db[key]
      }, timeout)
      this.db[key] = { resolve, reject, timeoutID, _default }
    })
  },
  fire: function ({ key = null, value = null } = {}) {
    if (!(key in this.db)) return false
    let { resolve, reject, timeoutID, _default } = this.db[key]
    clearTimeout(timeoutID)
    resolve(value || _default)
    delete this.db[key]
  }
}

// 监听inject.js中的消息,传给popup
// 按照技术讲解，这个方法会执行2次？？？
window.addEventListener(
  'message',
  function (e) {
    if (e.data.module === 'wapi sender') {
      if (e.data.chatNum) {
        chrome.storage.local.set({ chatNum: e.data.chatNum }).then((r) => {})
      }
      if (e.data.stopFlag) {
        chrome.storage.local.set({ stopFlag: true }).then((r) => {})
        chrome.runtime.sendMessage({ stopFlag: true }).then((r) => {})
      }
      if (e.data.countAll) {
        chrome.storage.local.set({ countAll: e.data.countAll }).then((r) => {})
        chrome.runtime.sendMessage({ countAll: e.data.countAll }).then((r) => {})
      }
      if (e.data.countFail) {
        chrome.storage.local.set({ countFail: e.data.countFail }).then((r) => {})
        chrome.runtime.sendMessage({ countFail: e.data.countFail }).then((r) => {})
      }
      if (e.data.countSuccess) {
        chrome.storage.local.set({ countSuccess: e.data.countSuccess }).then((r) => {})
        chrome.runtime.sendMessage({ countSuccess: e.data.countSuccess }).then((r) => {})
      }
      if (e.data.waitSeconds !== undefined) {
        chrome.storage.local.set({ waitSeconds: e.data.waitSeconds }).then((r) => {})
        chrome.runtime.sendMessage({ waitSeconds: e.data.waitSeconds }).then((r) => {})
      }

      // TODO，没找到发送方
      if (e.data.failReason !== undefined) {
        if (e.data.failReason === 'wapiReason') {
          sendLog(903301, { s_status: 3 })
        } else if (e.data.failReason === 'selectGroupNull') {
          sendLog(903301, { s_status: 2 })
        } else if (e.data.failReason === 'beRemovedOutGroup') {
          sendLog(903301, { s_status: 4 })
        }
        chrome.storage.local.set({ failReason: e.data.failReason }).then((r) => {})
      }
      // TODO，找不到发送方
      if (e.data.beRemovedWarning !== undefined) {
        chrome.storage.local.set({ beRemovedWarning: e.data.beRemovedWarning }).then((r) => {})
        chrome.runtime.sendMessage({ beRemovedWarning: e.data.beRemovedWarning }).then((r) => {})
      }
      // TODO未找到发送方
      if (e.data.isReachSendLimit !== undefined) {
        // chrome.storage.local.set({groupsInfo: e.data.sendGroupsInfos});
        chrome.runtime
          .sendMessage({
            isReachSendLimit: e.data.isReachSendLimit,
            showConfirmTitle: e.data.showConfirmTitle
          })
          .then((r) => {})
      }
      // TODO发送方已注释
      if (e.data.incrDailySendNums !== undefined) {
        chrome.storage.local.set({ dailySendNums: e.data.incrDailySendNums }).then((r) => {})
        chrome.runtime.sendMessage({ incrDailySendNums: e.data.incrDailySendNums }).then((r) => {})
      }
      // TODO 不好拆，暂时搁置
    } else if (e.data.module === 'eventDB') {
      eventDB.fire({ key: e.data.key, value: e.data.value })
    }
  },
  false
)

// 群发操作
async function main(
  phoneNumList,
  phoneNumSuccessList,
  phoneNumFailList,
  repeatList,
  oldSuccessAndFailList,
  indexCount,
  content,
  mediaType,
  minNum,
  maxNum,
  excelData,
  dailySendNums,
  sendMessageType,
  allDataImg,
  allDataVideo,
  allDataDocument,
  sendButtonValue,
  buttonInputValue,
  button_radio,
  isDeleteMessage,

  audio = {}
) {
  // Free用户检查是否达到发送上限
  if (permissionStatus === 'Free') {
    checkFreeSendLimit(dailySendNums)
  }
  // 判断用户是否点击了stop按钮
  if (
    (sendMessageType === 'pro' && !stopFlag) ||
    (sendMessageType === 'simple' && !stopFlagSimple)
  ) {
    // 将用户输入的手机号转化成列表
    let phoneNumListLen = phoneNumList.length
    if (indexCount < phoneNumListLen) {
      // 处理发送内容
      let tmpData = dealContentPlaceholder(
        content,
        excelData,
        phoneNumList[indexCount],
        phoneNumList,
        indexCount
      )
      let contentTmp = tmpData[0]

      let isPlaceHolder = tmpData[2]
      let isGroupData = await isGroupPhoneNumList(phoneNumList[indexCount])
      let isExcelData = tmpData[1]
      let s_source = sendLogDetail(isExcelData, isGroupData)
      let isDelete = isDeleteMessage
        ? await _sendMessage({
            echoDeleteMessage: true,
            phone: `${phoneNumList[indexCount]}@c.us`
          })
        : isDeleteMessage
      let sendStatus = await sendContent(
        phoneNumList[indexCount],
        contentTmp,
        mediaType,
        allDataImg,
        allDataVideo,
        allDataDocument,
        sendButtonValue,
        buttonInputValue,
        button_radio,
        audio
      )
      if (isDelete) {
        _deleteMessage(`${phoneNumList[indexCount]}@c.us`)
      }
      if (sendStatus) {
        countSuccess += 1
        phoneNumSuccessList.push(phoneNumList[indexCount])
        chrome.storage.local.set({
          countSuccess: phoneNumSuccessList.length,
          phoneNumSuccessList: phoneNumSuccessList,
          disabledSendingFlag: false,
          // stopFlag: false,
          // stopFlagSimple: false,
          isShowContinueBtn: false
        })
        // stopFlagSimple = false
        // stopFlag = false
        chrome.runtime.sendMessage({
          countSuccess: phoneNumSuccessList.length,
          disabledSendingFlag: false
        })
        dailySendNums = incrDailySendNumsAndSendMsg(dailySendNums)
      } else {
        countFail += 1
        phoneNumFailList.push(phoneNumList[indexCount])
        chrome.storage.local.set({
          countFail: phoneNumFailList.length,
          phoneNumFailList: phoneNumFailList,
          disabledSendingFlag: false,
          // stopFlag: false,
          // stopFlagSimple: false,
          isShowContinueBtn: false
        })
        // stopFlagSimple = false
        // stopFlag = false
        chrome.runtime.sendMessage({
          countFail: phoneNumFailList.length,
          disabledSendingFlag: false
        })
      }
      //日志301301 日志302301
      let eventNum = sendMessageType === 'simple' ? 901301 : 902301
      let logData = getLogData(
        sendMessageType,
        contentTmp,
        s_source,
        minNum,
        maxNum,
        sendStatus,
        phoneNumList,
        indexCount,
        mediaType,
        isPlaceHolder,
        sendButtonValue,
        button_radio,
        buttonInputValue
      )
      sendLog(eventNum, logData)
      indexCount += 1
      // 获取重复手机号操作
      let tmpValues = getNoRepeatIndex(
        indexCount,
        phoneNumList,
        phoneNumSuccessList,
        phoneNumFailList,
        repeatList,
        oldSuccessAndFailList
      )
      indexCount = tmpValues[0]
      repeatList = tmpValues[1]

      chrome.storage.local.set({ repeatList: repeatList })
      let continueSendData = getContinueSendData(
        phoneNumList,
        phoneNumSuccessList,
        phoneNumFailList,
        repeatList,
        oldSuccessAndFailList,
        indexCount,
        content,
        mediaType,
        minNum,
        maxNum,
        excelData,
        sendMessageType,
        allDataImg,
        allDataVideo,
        allDataDocument,
        sendButtonValue,
        buttonInputValue,
        button_radio,
        isDeleteMessage
      )
      let retryFailedSendData = getRetryFailedSendData(
        phoneNumList,
        phoneNumSuccessList,
        phoneNumFailList,
        repeatList,
        oldSuccessAndFailList,
        indexCount,
        content,
        mediaType,
        minNum,
        maxNum,
        excelData,
        sendMessageType,
        allDataImg,
        allDataVideo,
        allDataDocument,
        sendButtonValue,
        buttonInputValue,
        button_radio,
        isDeleteMessage
      )
      chrome.storage.local.set({ continueSendData, retryFailedSendData })
      // 如果发送的是最后一条消息，那么不用等待,付费用户发送失败的消息不用等待
      if (stopFlag == true || stopFlagSimple == true) {
        chrome.storage.local.set({
          stopFlag: true,
          stopFlagSimple: true,
          anShowWaitSendTip: false
        })
        chrome.runtime.sendMessage({
          stopFlag: true,
          stopFlagSimple: true,
          disabledSendingFlag: false
        })
        return
      }
      if (indexCount < phoneNumListLen) {
        if (indexCount === 0 || (!sendStatus && permissionStatus === 'Pro')) {
          // 第一次发送等待时间设置为0
          await sleepBySeconds(0, 0)
        } else {
          await sleepBySeconds(minNum, maxNum)
        }
        if (stopFlag == true || stopFlagSimple == true) {
          chrome.storage.local.set({
            stopFlag: true,
            stopFlagSimple: true,
            anShowWaitSendTip: false
          })
          chrome.runtime.sendMessage({
            stopFlag: true,
            stopFlagSimple: true,
            disabledSendingFlag: false
          })
          return
        }

        if (
          batchPauseSeconds > 0 &&
          batchEveryMessages > 0 &&
          indexCount % batchEveryMessages === 0
        ) {
          await sleepBySeconds(batchPauseSeconds, batchPauseSeconds)
          if (stopFlag == true || stopFlagSimple == true) {
            chrome.storage.local.set({
              stopFlag: true,
              stopFlagSimple: true,
              anShowWaitSendTip: false
            })
            chrome.runtime.sendMessage({
              stopFlag: true,
              stopFlagSimple: true,
              disabledSendingFlag: false
            })
            return
          }
        }
        // 最后一条消息，触发弹框
      } else if (permissionStatus === 'Free' && countFail > 0) {
        sendMessage(
          CONTENT_TO_POP_SHOW_SAVE_TIME_DIALOG,
          {
            showSaveTimeDialog: true,
            maxSleep: maxNum
          },
          'popup'
        )
      }
      return main(
        phoneNumList,
        phoneNumSuccessList,
        phoneNumFailList,
        repeatList,
        oldSuccessAndFailList,
        indexCount,
        content,
        mediaType,
        minNum,
        maxNum,
        excelData,
        dailySendNums,
        sendMessageType,
        allDataImg,
        allDataVideo,
        allDataDocument,
        sendButtonValue,
        buttonInputValue,
        button_radio,
        isDeleteMessage,
        audio
      )
    } else {
      return new Promise((resolve) => {
        setTimeout(function () {
          //该部分以后可以做成导出，先注释备用
          // alert("一共发送的手机号数量为:" + phoneNumList.length + "\n" + "发送成功的次数为:" + countSuccess + "\n" +
          //     "发送失败的次数为:" + countFail + "\n" + "发送失败的电话号码为:" + phoneNumFailList.toString());
          chrome.storage.local.set({
            stopFlag: true,
            stopFlagSimple: true,
            anShowWaitSendTip: false,
            groupPhoneNumList: []
          })
          chrome.runtime.sendMessage({
            stopFlag: true,
            stopFlagSimple: true,
            disabledSendingFlag: false
          })
        }, 2000)
        resolve()
      })
    }
  }
}

function getLogData(
  sendMessageType,
  contentTmp,
  s_source,
  minNum,
  maxNum,
  sendStatus,
  phoneNumList,
  indexCount,
  mediaType,
  isPlaceHolder,
  sendButtonValue,
  button_radio,
  buttonInputValue
) {
  let logData
  if (sendMessageType === 'simple') {
    logData = {
      s_content: contentTmp,
      s_source: s_source,
      s_min_num: minNum,
      s_max_num: maxNum,
      s_status: sendStatus ? 1 : 2,
      s_target_phone: phoneNumList[indexCount]
    }
  } else {
    logData = {
      s_content: contentTmp,
      s_source: s_source,
      s_attachment: mediaType ? 1 : 2,
      s_attachment_type:
        mediaType === 'img'
          ? 1
          : mediaType === 'video'
          ? 2
          : mediaType === 'doc'
          ? 3
          : mediaType === 'contact'
          ? 4
          : '',
      s_min_num: minNum,
      s_max_num: maxNum,
      s_status: sendStatus ? 1 : 2,
      s_placeholder: isPlaceHolder ? 1 : 2,
      s_target_phone: phoneNumList[indexCount],
      s_button: sendButtonValue ? 1 : 2,
      s_button_type:
        button_radio === 'Link'
          ? 2
          : button_radio === 'Call'
          ? 3
          : button_radio === 'Text'
          ? 1
          : '',
      s_button_text: buttonInputValue
    }
  }
  return logData
}

/**
 * 校验用户是否达到发送上限
 * @returns
 */
function checkFreeSendLimit(dailySendNums) {
  const { isReachSendLimit, showConfirmTitle } = checkDailySendNums(dailySendNums)
  if (isReachSendLimit) {
    /**
     * 达到免费限制，在发送阶段判断超过3次检测失败之后，我们的权限再进行变更限制
     */
    if (permissionCheckCount >= 3) {
      chrome.storage.local.set({ stopFlag: true, stopFlagSimple: true })
      chrome.runtime.sendMessage({
        isReachSendLimit: isReachSendLimit,
        stopFlag: true,
        stopFlagSimple: true
      })
      return
    } else {
      let myNumber = getLocalNum()
      syncAccountPermission(myNumber)
    }
  }
}

/**
 * 聚合发送消息，
 * @param message
 */
async function _sendMessage(message) {
  message.module = 'wapi sender'
  if (message.deleteMessage) {
    window.postMessage(message, '*')
  } else if (message.echoDeleteMessage) {
    let lastEcho = eventDB.add({
      key: 'event:echoDeleteMessage',
      _default: false
    })
    message.key = 'event:echoDeleteMessage'
    window.postMessage(message, '*')
    return await lastEcho
  }
}

/**
 * 删除聊天窗口，
 * @param phone
 */
function _deleteMessage(phone) {
  setTimeout(() => {
    _sendMessage({ deleteMessage: true, phone: phone }).then(() => {})
  }, 8 * 1000)
}

function incrDailySendNumsAndSendMsg(dailySendNums) {
  incrDailySendNums()
  dailySendNums = getIncrDailySendNums(dailySendNums)
  chrome.storage.local.set({ dailySendNums: dailySendNums }).then((r) => {})
  chrome.runtime.sendMessage({ incrDailySendNums: dailySendNums }).then((r) => {})
  return dailySendNums
}

// 打开聊天窗口--确认完打开新的聊天窗口，并触发发送信息事件
async function sendContent(
  phoneNum,
  content,
  mediaType,
  allDataImg,
  allDataVideo,
  allDataDocument,
  sendButtonValue,
  buttonInputValue,
  button_radio,
  audio = {}
) {

  let condition = await openChat(phoneNum, content, '', sendButtonValue, buttonInputValue)
  // 如果自己没有主动屏蔽手机号用户，才能返回true
  const sendEl = document.querySelector('span[data-icon="send"]') || document.querySelector('span[data-icon="wds-ic-send-filled"]') 
  if (
    condition &&
    document.querySelectorAll("[contenteditable='true']")[1] && sendEl
  ) {
    await sendImage(mediaType, phoneNum, allDataImg, allDataVideo, allDataDocument, audio)
    await sleep(1, 2, 500)
    await sendText(content, 'send')
    return true
  } else if (condition) {
    await sendImage(mediaType, phoneNum, allDataImg, allDataVideo, allDataDocument, audio)
    if (sendButtonValue && buttonInputValue !== '') {
      await sendButtonMesage(button_radio, phoneNum, content, buttonInputValue)
    }
    return true
  } else {
    return false
  }
}

// 打开聊天窗口--检验并打开聊天窗口
function openChat(phoneNum, content, timeout, sendButtonValue, buttonInputValue) {
  return new Promise((resolve) => {
    openChatUrl(phoneNum, content, sendButtonValue, buttonInputValue).then(() => {
      let tmp = timeout ? timeout : 3000
      setTimeout(async function () {
        let condition = await hasOpened()
        resolve(condition)
      }, tmp)
    })
  })
}

// 打开聊天窗口--打开指定联系人的一个聊天窗口
function openChatUrl(phoneNum, content, sendButtonValue, buttonInputValue) {
  if (content) content = encodeURIComponent(content)
  return new Promise((resolve) => {
    let wam = document.getElementById('wamessages')
    if (!wam) {
      wam = document.createElement('a')
      wam.id = 'wamessages'
      document.body.append(wam)
    }
    //开头为0去掉
    phoneNum = phoneNum.replace(/^0+/, '')
    let link = `https://api.whatsapp.com/send?phone=${phoneNum}`
    // 手机号首位为0，会导致页面跳转，所以需要抛出错误,给用户一个错误的手机号码
    // console.log(PhoneNumber(`+${phoneNum}`))
    let isPossible = PhoneNumber(`+${phoneNum}`).isPossible()
    // console.log(phoneNum, isValid, '-----------')
    if (phoneNum.charAt(0) === '0' || !isPossible) {
      link = `https://api.whatsapp.com/send?phone=12345678`
    }
    if (content && (!sendButtonValue || buttonInputValue == '')) {
      link += `&text=${content}`
    }
    // console.log(link)
    wam.setAttribute('href', link)
    // Wait for DOM operation to complete.
    setTimeout(() => {
      wam.click()
      resolve()
    }, 0)
  })
}

// 打开聊天窗口--通过当前页面有没有小弹窗来确定是否已经
async function hasOpened() {
  return new Promise((resolve) => {
    setTimeout(async function () {
      chrome.storage.local.get(['zbaseConfig'], function (res) {
        const zbaseConfig = res.zbaseConfig.data.config
        let tmpDomList = []
        for (let i = 0; i < zbaseConfig.length; i++) {
          if (zbaseConfig[i].name === 'No Avail Phone 3') {
            // tmpDomList = zbaseConfig[i].params.class_list
            zbaseConfig[i].params.forEach((item) => {
              tmpDomList.push(item)
            })
          }
        }
        let condition = true
        if (document.querySelector('[data-animate-modal-popup="true"]')) {
          condition = false
          tmpDomList.forEach((item) => {
            console.log(item.class_list)
            if (document.querySelector(item.class_list)) {
              document.querySelector(item.class_list).click()
            }
          })
        }

        resolve(condition)
      })
    }, 1000)
  })
}

// 发送文本--把文本显示在聊天框的发送框中
async function sendText(e, type) {
  if (e) {
    console.log("向文本输入消息");
    // 向文本框输入信息
    let messageBox = document.querySelectorAll("[contenteditable='true']")[1]
    let event = document.createEvent('UIEvents')
    // 需要添加一个innerHTMl来执行事件,注意如果是自己屏蔽了用户，这块儿messageBox.innerHTML会为undefiend
    if (messageBox) {
      messageBox.innerHTML = e.replace(/ /gm, ' ')
      event.initUIEvent('input', !0, !0, window, 1)
      messageBox.dispatchEvent(event)
      if (type === 'send') {
        try {
          console.log("发送文本内容");
          // await eventFire(document.querySelector('span[data-icon="send"]'), 'click')
          const sendEl = document.querySelector('span[data-icon="send"]') || document.querySelector('span[data-icon="wds-ic-send-filled"]') 
          await eventFire(sendEl, 'click')
        } catch (error) {
          console.log(error, 'error')
        }
      }
    }
  }
}

// 发送文本--模拟点击事件
function eventFire(e, t) {
  let n = document.createEvent('MouseEvents')
  n.initMouseEvent(t, !0, !0, window, 0, 0, 0, 0, 0, !1, !1, !1, !1, 0, null)
  //设定点击事件的时长为0.5s
  return new Promise(function (resolve, reject) {
    let intervalLoop = null
    let maxTimer = null
    maxTimer = setTimeout(() => {
      clearInterval(intervalLoop)
      reject('BUTTON NOT CLICK')
    }, 5000)
    intervalLoop = setInterval(function () {
      if (e) {
        e.dispatchEvent(n)
        clearTimeout(maxTimer)
        resolve((clearInterval(intervalLoop), 'BUTTON CLICKED'))
      }
    }, 500)
  })
}

// 将输入框字符串转化为数组
function getPhoneNumList(phoneNumString, phoneNumList) {
  if (phoneNumString) {
    let phoneNumArr = phoneNumString.replace(/，/g, ',').split(',')
    for (let i = 0; i < phoneNumArr.length; i++) {
      phoneNumArr[i] = phoneNumArr[i].replace(/[+]/g, '')
      phoneNumArr[i] = phoneNumArr[i].replace(/\s*/g, '') //去除联系人电话所有空格
      if (phoneNumArr[i]) phoneNumList.push(phoneNumArr[i])
    }
  }
  return phoneNumList
}

function sendButtonDetailToInject(data) {
  sendMessage(CONTENT_TO_INJECT_BUTTON_DETAIL, { buttonDetail: data }, 'window')
}

//发送按钮类型消息
async function sendButtonMesage(button_radio, phoneNum, content, buttonInputValue) {
  getCurrentChat()
  await sleep(1, 1, 500)
  if (button_radio === 'Link' && buttonInputValue && buttonInputValue.indexOf('Visit us (') > -1) {
    let contactno = phoneNum
    let url = buttonInputValue.split('Visit us (')[1].split(')')[0]
    let data = {
      contactno: `${contactno}@c.us`,
      content: content,
      button: [
        {
          url: url,
          text: 'Visit us'
        }
      ]
    }
    sendButtonDetailToInject(data)
  } else if (
    button_radio === 'Call' &&
    buttonInputValue &&
    buttonInputValue.indexOf('Call me (') > -1
  ) {
    let contactno = phoneNum
    let phoneNumber = buttonInputValue.split('Call me (')[1].split(')')[0]
    let data = {
      contactno: `${contactno}@c.us`,
      content: content,
      button: [
        {
          phoneNumber: phoneNumber,
          text: 'Call me'
        }
      ]
    }
    sendButtonDetailToInject(data)
  } else {
    let contactno = phoneNum
    let arr = buttonInputValue.split('|')
    let newarr = []
    for (let i = 0; i < arr.length; i++) {
      if (i >= 3) {
        return
      }
      newarr.push({
        id: 'another id ' + i + 1,
        text: arr[i]
      })
    }
    let data = {
      contactno: `${contactno}@c.us`,
      content: content,
      button: newarr
    }
    sendButtonDetailToInject(data)
  }
}

// 发送消息到inject
function sendMediaDetailToInject(data) {
  sendMessage(CONTENT_TO_INJECT_MEDIA_DETAIL, { mediaDetail: data }, 'window')
}

// 发送图片和视频功能
async function sendImage(mediaType, phoneNum, allDataImg, allDataVideo, allDataDocument, audio) {
  getCurrentChat()
  await sleep(1, 1, 500)
  if (mediaType === 'img' && allDataImg.length > 0) {
    let lastEcho = eventDB.add({ key: 'event:last' })
    let contactno = phoneNum
    for (let index = 0; index < allDataImg.length; index++) {
      let data = {
        contactno: `${contactno}@c.us`,
        caption: allDataImg[index]['caption'],
        file: base64ImageToFile(JSON.parse(allDataImg[index]['e']), allDataImg[index]['fileName']),
        echo: index === allDataImg.length - 1 ? 'event:last' : null
      }
      // console.log('准备发送图片')
      sendMediaDetailToInject(data)
    }
    await lastEcho
  }
  if (mediaType === 'video' && allDataVideo.length > 0) {
    let lastEcho = eventDB.add({ key: 'event:last' })
    let contactno = phoneNum
    for (let index = 0; index < allDataVideo.length; index++) {
      let data = {
        contactno: `${contactno}@c.us`,
        caption: allDataVideo[index]['caption'],
        file: base64ImageToFile(
          JSON.parse(allDataVideo[index]['e']),
          allDataVideo[index]['fileName']
        ),
        echo: index === allDataVideo.length - 1 ? 'event:last' : null
      }
      sendMediaDetailToInject(data)
    }
    await lastEcho
  }
  if (mediaType === 'doc' && allDataDocument.length > 0) {
    let lastEcho = eventDB.add({ key: 'event:last' })
    let contactno = phoneNum
    for (let index = 0; index < allDataDocument.length; index++) {
      let data = {
        contactno: `${contactno}@c.us`,
        caption: allDataDocument[index]['caption'],
        file: base64ImageToFile(
          JSON.parse(allDataDocument[index]['e']),
          allDataDocument[index]['fileName']
        ),
        echo: index === allDataDocument.length - 1 ? 'event:last' : null
      }
      sendMediaDetailToInject(data)
    }
    await lastEcho
  }
  if (mediaType === 'contact') {
    // 获取用户名
    await sendContact(phoneNum)
    // 之前的写法先暂停
    async function past() {
      let contactName = null,
        imageURL = document.querySelectorAll('#main > header > div > div > img')[0]
          ? document.querySelectorAll('#main > header > div > div > img')[0].src
          : null
      if (document.querySelectorAll('#main > header > div._amie > div > div > div > span')[0]) {
        // 获取用户头像图片url
        contactName = document
          .querySelectorAll('#main > header > div._amie > div > div > div > span')[0]
          .textContent.trim()
      } else if (document.querySelector('header span[title]')) {
        contactName = document
          .querySelectorAll('#main > header > div._24-Ff > div._2rlF7 > div > span')[0]
          .textContent.replace(/[^A-z0-9]/gi, '')
          .trim()
      }
      let hasOpenedSelf = false
      try {
        //打开自己的聊天窗口，进行转发图片或视频
        //BULK_WPP.chat.sendVCardContactMessage('8618721647041@c.us',{id: "8617792141633@c.us", name: "name"}) 名片发送
        hasOpenedSelf = await openChat(myNumber)
        if (hasOpenedSelf) {
          //模拟点击最后一个转发按钮（即要保证我们发送的图片或者视频位于最后一条信息）
          let forwardButtons = document.querySelectorAll("[data-icon='forward-chat']"),
            forwardButton = forwardButtons[forwardButtons.length - 1]
          //
          await forwardButton.click()
          await checkAllSmallContacts()
          // 找到所有联系人
          let contactsList = document.querySelectorAll(
            "[data-animate-modal-body='true'] div[class=''] > div div div[tabindex='-1']"
          )
          let oneselfFlag = await getUserPhoneNum(phoneNum)
          //如果当前转发对象是用户自己，那么只判断图片链接，否则要先判断名字
          if (oneselfFlag) {
            // 过滤联系人列表，基数的元素是我们想要的
            for (let index = 0; index < contactsList.length; index++) {
              if (index % 2 != 0) {
                let nameElement = contactsList[index].querySelector("span[dir='auto']")
                let imageCondition = false
                let imageTmp = contactsList[index].querySelectorAll('img._8hzr9.M0JmA.i0jNr')
                if (imageTmp.length) {
                  imageTmp = imageTmp[0].src
                  if (imageTmp === imageURL) {
                    imageCondition = true
                  }
                }
                if (!imageCondition) {
                } else {
                  nameElement.click()
                  await sendMedia()
                }
              }
            }
          } else {
            // 过滤联系人列表，基数的元素是我们想要的
            for (let index = 0; index < contactsList.length; index++) {
              if (index % 2 != 0) {
                let nameElement = contactsList[index].querySelector("span[dir='auto']"),
                  name = contactsList[index].querySelector("span[dir='auto']").title.trim()
                // 匹配我们要发送的用户的用户名和弹窗的用户名是否一致
                if (
                  name === contactName ||
                  name.replace(/[^A-Za-z0-9]/gi, '').trim() === contactName
                ) {
                  await openSmallPopup(contactsList, index, imageURL, nameElement)
                }
              }
            }
          }
        }
      } catch (error) {
        console.log(error, 'ERROR')
      }
    }
  }

  if (audio.time > 0) {
    await sleep(1, 1, 100)
    let lastEcho = eventDB.add('event:last_audio')
    let contactno = phoneNum
    let nf = base64ImageToBlob(audio.file)
    let data = {
      contactno: `${contactno}@c.us`,
      file: nf,
      echo: 'event:last_audio'
    }

    window.postMessage({ audioDetail: data, module: 'wapi sender' }, '*')
    await lastEcho
  }
}

// 发送图片和视频功能--打开联系人列表并进行操作
function openSmallPopup(contactsList, index, imageURL, nameElement) {
  return new Promise((resolve) => {
    setTimeout(async function () {
      //匹配我们要发送的用户的头像图片url和弹窗的头像图片url是否一直
      let imageCondition = false
      let imageTmp = contactsList[index].querySelectorAll('img._8hzr9.M0JmA.i0jNr')
      //存在头像为svg图的情况
      if (imageTmp.length === 0) {
        imageCondition = true
      } else {
        imageTmp = imageTmp[0].src
        if (imageTmp === imageURL || imageURL === null) {
          imageCondition = true
        }
      }
      if (imageCondition) {
        // 模拟点击选中弹窗对应的用户
        nameElement.click()
        // 模拟点击新生成的发送按钮
        await sendMedia()
      }
      resolve()
    }, 0)
  })
}

// 模拟点击发送按钮
function sendMedia() {
  return new Promise((resolve) => {
    setTimeout(function () {
      document.querySelector("[data-icon='send']").click()
      resolve()
    }, 1000)
  })
}

//模拟鼠标移动
async function clickOnElements(element) {
  let MouseEvent = document.createEvent('MouseEvents')
  MouseEvent.initEvent('mouseover', true, true)
  const over = document.querySelector(element).dispatchEvent(MouseEvent)
  //console.log("鼠标停留");
  MouseEvent.initEvent('mousedown', true, true)
  const down = document.querySelector(element).dispatchEvent(MouseEvent)
  //console.log("鼠标上移");
  MouseEvent.initEvent('mouseup', true, true)
  const up = document.querySelector(element).dispatchEvent(MouseEvent)
  //console.log("鼠标下移");

  //多模拟鼠标动几下，防止谷歌验证
  MouseEvent.initEvent('mouseup', true, true)
  document.querySelector(element).dispatchEvent(MouseEvent)
  MouseEvent.initEvent('mouseover', true, true)
  document.querySelector(element).dispatchEvent(MouseEvent)
  MouseEvent.initEvent('mousedown', true, true)
  document.querySelector(element).dispatchEvent(MouseEvent)

  MouseEvent.initEvent('click', true, true)
  const click = document.querySelector(element).dispatchEvent(MouseEvent)

  if (over) {
    return new Promise((resolve) => {
      resolve()
    })
  } else {
    return await clickOnElements(element)
  }
}

// 选择给自己发送的文件：iv=图片或视频 doc=文件
async function clickMediaIcon(mediaType) {
  let mediaButtonQuery = null
  //这块只有contact用所以不用修改mediaType
  if (mediaType === 'iv') {
    mediaButtonQuery = '[data-icon="attach-image"]'
  } else if (mediaType === 'doc') {
    mediaButtonQuery = '[data-icon="attach-document"]'
  } else if (mediaType === 'contact') {
    mediaButtonQuery = '[data-icon="attach-contact"]'
  }
  if (mediaButtonQuery) {
    await clickOnElements(mediaButtonQuery)
  }
}

// 获取excel中的联系人
function getContacts() {
  return new Promise(function (resolve) {
    let contacts
    let excelData = []
    chrome.storage.local.get(['excelData'], function (res) {
      contacts = res.excelData
    })
    setTimeout(async function () {
      resolve(contacts)
    }, 300)
  })
}

// 处理content，让excel数据替换placeholder
function dealContentPlaceholder(content, excelData, phoneNum, phoneNumList, indexCount) {
  if (content.indexOf('{{time stamp}}')) {
    content = content.replaceAll('{{time stamp}}', new Date().toLocaleString())
  }
  let isExcelData = false
  let isPlaceHolder = false
  if (!excelData.length) {
    content = content.replaceAll('{{WhatsApp Number}}', phoneNum)
    return [content, isExcelData, isPlaceHolder]
  } else {
    if (checkPlaceholder(content) && indexCount === 0) {
      sendLog(902313)
      let excelPhoneNumList = []
      for (let i = 0; i < excelData.length; i++) {
        excelData[i]['WhatsApp Number'] = excelData[i]['WhatsApp Number']
          .toString()
          .replace(/[+]/g, '')
          .replace(/\s*/g, '')
        excelPhoneNumList.push(excelData[i]['WhatsApp Number'])
      }
      let flag = 1
      for (let i = 0; i < phoneNumList.length; i++) {
        if (excelPhoneNumList.indexOf(phoneNumList[i]) === -1 && flag) {
          flag = 0
          sendLog(902315)
        }
      }
    }
  }
  content = processingContent(content, excelData, phoneNum)

  if (checkPlaceholder(content) && indexCount === 0) {
    sendLog(902314)
  }
  return [content, isExcelData, isPlaceHolder]
}

function processingContent(content, excelData, phoneNum) {
  for (let i = 0; i < excelData.length; i++) {
    try {
      let whatsAppNumber = excelData[i]['WhatsApp Number'] ? excelData[i]['WhatsApp Number'] : ''
      if (whatsAppNumber === phoneNum) {
        for (let key in excelData[i]) {
          content = content.replaceAll('{{' + key + '}}', excelData[i][key])
        }
      }
    } catch (e) {
      console.log(e)
    }
  }
  return content
}

// 检验文本是否含有占位符
function checkPlaceholder(text) {
  if (text.indexOf('{{') !== -1 && text.indexOf('}}') !== -1) {
    return true
  } else {
    return false
  }
}

// 获取并整理excel中的信息
function getExcelData(uploadExcel) {
  return new Promise(function (resolve) {
    let excelData = []
    if (uploadExcel === false) {
      chrome.storage.local.get(['excelData'], function (res) {
        excelData = res.excelData
      })
    }
    setTimeout(async function () {
      resolve(excelData)
    }, 300)
  })
}

// 获取并整理群组中的联系人
function getGroupMemberData(groupConcats) {
  return new Promise(function (resolve) {
    let groupMembersPhoneList = []
    if (groupConcats === 'content') {
      chrome.storage.local.get(['groupMembersPhoneList'], function (res) {
        groupMembersPhoneList = res.groupMembersPhoneList
      })
    }
    setTimeout(async function () {
      resolve(groupMembersPhoneList)
    }, 300)
  })
}

// 获取并整理群组中的联系人
function getLabelMemberData(labelConcats) {
  return new Promise(function (resolve) {
    let membersPhoneList = []
    if (labelConcats === 'content') {
      chrome.storage.local.get(['sendLabelsMeta', 'labelInfo'], function (res) {
        let users = res.sendLabelsMeta[res.labelInfo?.value]
        if (res.sendLabelsMeta && users) {
          for (let i = 0; i < users.length; i++) {
            let user = users[i]['id']['user']
            membersPhoneList.push(user ? user : '')
          }
        }
        resolve(membersPhoneList)
      })
    }
    setTimeout(async function () {
      resolve(membersPhoneList)
    }, 5000)
  })
}

// 判断当前对话框是否是用户本人
function getUserPhoneNum(phoneNum) {
  return new Promise(function (resolve) {
    let oneselfFlag = false
    chrome.storage.local.get(['userPhoneNum'], function (res) {
      oneselfFlag = phoneNum === res.userPhoneNum
    })
    setTimeout(async function () {
      resolve(oneselfFlag)
    }, 300)
  })
}

function checkAllSmallContacts() {
  return new Promise(function (resolve) {
    let tmp = setInterval(function () {
      let contactsList = document.querySelectorAll(
        "[data-animate-modal-body='true'] div[class=''] > div div div[tabindex='-1']"
      )
      if (contactsList) {
        resolve(clearInterval(tmp))
      }
    }, 500)
  })
}

// 用promise的方式去休眠
function sleep(s, e, l) {
  let m = 0
  if (e >= s) {
    m = Math.floor(Math.random() * (e - s + 1) + s) * l
  }
  return new Promise((t) => setTimeout(t, m))
}

// 休眠的时候要和popup交互
async function sleepBySeconds(s, e) {
  let m = 0
  if (e >= s) {
    m = Math.floor(Math.random() * (e - s + 1) + s) * 1000
  }
  while (m > 0) {
    m = m - 1000
    chrome.storage.local.set({ waitSeconds: m / 1000 })
    chrome.runtime.sendMessage({ waitSeconds: m / 1000 })
    await new Promise((t) => setTimeout(t, 1000))
  }
}

const triggerShowCommentGuide = debounce(() => {
  const browserInfo = getBrowser()
  if (browserInfo?.browser === 'Chrome') {
    window.postMessage({ checkUserPermsession: true }, '*')
  }
}, 500)

function listenHeaderDom() {
  let tmp = setInterval(function () {
    let tmpDomList = []
    let oneSend = true
    chrome.storage.local.get(['zbaseConfig'], function (res) {
      const zbaseConfig = res.zbaseConfig.data.config
      for (let i = 0; i < zbaseConfig.length; i++) {
        if (zbaseConfig[i].name === 'WAPI Pay') {
          chrome.storage.local.set({
            pay_type: zbaseConfig[i].params.pay_type
          })
        }
        if (zbaseConfig[i].name === 'WAPI Class') {
          tmpDomList = zbaseConfig[i].params.class_list
        }
        tmpDomList.forEach(function (element) {
          if (document.getElementsByClassName(element).length !== 0) {
            // 放在这里是因为如果用户打开插件之前需要扫码登录，需要重新获取一遍手机号确保插件正常使用
            getLocalNum()
            if (!injectRepeatFlag) {
              return
            }
            injectRepeatFlag = false
            clearInterval(tmp)
            chrome.storage.local.get(
              ['retryFailed', 'retryFailedSendData', 'dailySendNums', 'deduplicated', 'audio'],
              async function (res) {
                await addInjectTwo()
                await addInject()
                injectRepeatFlag = false
                injectMask()
                //
                //
                /**
                 * 每次刷新页面的时候添加一次是为了防止用户主动把数据给删掉，
                 * 在whatsapp版本更新时可能会将数据清空
                 * 清除浏览器缓存时也会被清除掉
                 */
                installMark()

                if (res.retryFailed && oneSend) {
                  oneSend = false
                  chrome.storage.local.set({ retryFailed: false })
                  chrome.storage.local.set({ stopFlag: false, stopFlagSimple: false })
                  let retryFailedSendData = res.retryFailedSendData
                  // console.log(retryFailedSendData, 'sadhiuahsiduh')
                  // 上次发送的类型
                  let sendMessageStatisticsType = retryFailedSendData.sendMessageType
                  // 读取发送信息
                  let content = retryFailedSendData.content
                  // 读取是否发送图片
                  let mediaType = retryFailedSendData.mediaType
                  // 最小间隔时间
                  let minNum = retryFailedSendData.minNum
                  // 最大间隔时间
                  let maxNum = retryFailedSendData.maxNum
                  // 每日发送数
                  let dailySendNums = res.dailySendNums
                  // 获取excel数据
                  let excelData = retryFailedSendData.excelData
                  // 从local storage拿到上次处理的电话号码结果
                  let allList = retryFailedSendData.phoneNumList
                  let successList = retryFailedSendData.phoneNumSuccessList
                  let failList = retryFailedSendData.phoneNumFailList
                  let repeatList = retryFailedSendData.repeatList
                  let noSendList = deleteList(allList, successList)
                  noSendList = deleteList(noSendList, repeatList)
                  let oldSuccessAndFailList = successList
                  // 清空repeatList，否则程序逻辑会一直跑下去
                  repeatList = []
                  // noSendList = deleteList(noSendList, failList);
                  // 确定重新发送的电话号码
                  let phoneNumList = failList.concat(noSendList)
                  // phoneNumList.shift();
                  let phoneNumSuccessList = successList
                  let phoneNumFailList = []
                  let allDataImg = retryFailedSendData.allDataImg
                  let allDataVideo = retryFailedSendData.allDataVideo
                  let allDataDocument = retryFailedSendData.allDataDocument
                  let sendButtonValue = retryFailedSendData.sendButtonValue
                  let button_radio = retryFailedSendData.button_radio
                  let buttonInputValue = retryFailedSendData.buttonInputValue
                  let isDeleteMessage = retryFailedSendData.isDeleteMessage

                  // continue缓存数据
                  let continueSendData = getContinueSendData(
                    phoneNumList,
                    phoneNumSuccessList,
                    phoneNumFailList,
                    repeatList,
                    oldSuccessAndFailList,
                    0,
                    content,
                    mediaType,
                    minNum,
                    maxNum,
                    excelData,
                    sendMessageStatisticsType,
                    allDataImg,
                    allDataVideo,
                    allDataDocument,
                    sendButtonValue,
                    button_radio,
                    buttonInputValue,
                    isDeleteMessage
                  )
                  await chrome.storage.local.set({
                    countAll: res.deduplicated,
                    // deduplicated:removeDuplicated(phoneNumList).length,
                    // countTotal:phoneNumList.length,
                    phoneNumList: phoneNumList,
                    countSuccess: phoneNumSuccessList.length,
                    phoneNumSuccessList: phoneNumSuccessList,
                    countFail: phoneNumFailList.length,
                    phoneNumFailList: phoneNumFailList,
                    waitSeconds: 0,
                    continueSendData: continueSendData
                  })
                  chrome.runtime.sendMessage({
                    reloadPopup: true
                  })
                  await main(
                    phoneNumList,
                    phoneNumSuccessList,
                    phoneNumFailList,
                    repeatList,
                    oldSuccessAndFailList,
                    0,
                    content,
                    mediaType,
                    minNum,
                    maxNum,
                    excelData,
                    dailySendNums,
                    sendMessageStatisticsType,
                    allDataImg,
                    allDataVideo,
                    allDataDocument,
                    sendButtonValue,
                    buttonInputValue,
                    button_radio,
                    isDeleteMessage,

                    res.audio || {}
                  )
                }
                clearInterval(tmp)
                triggerShowCommentGuide()
                mountEvaluationPop()
              }
            )
          }
        })
      }
    })
  }, 500)
}

function getNoRepeatIndex(
  indexCount,
  phoneNumList,
  phoneNumSuccessList,
  phoneNumFailList,
  repeatList,
  oldSuccessAndFailList
) {
  for (let i = indexCount; i < phoneNumList.length; i++) {
    if (
      phoneNumSuccessList.indexOf(phoneNumList[indexCount]) === -1 &&
      phoneNumFailList.indexOf(phoneNumList[indexCount]) === -1 &&
      oldSuccessAndFailList.indexOf(phoneNumList[indexCount]) === -1
    ) {
      return [indexCount, repeatList]
    } else {
      repeatList.push(phoneNumList[indexCount])
      indexCount += 1
    }
  }
  return [indexCount, repeatList]
}

//去重？  有问题？
function uniq(array, array2) {
  let temp = [] //一个新的临时数组
  for (let i = 0; i < array.length; i++) {
    if (temp.indexOf(array[i]) === -1 && array2.indexOf(array[i]) === -1) {
      temp.push(array[i])
    }
  }
  return temp
}

function removeDuplicated(array) {
  let temp = [] //一个新的临时数组
  for (let i = 0; i < array.length; i++) {
    if (temp.indexOf(array[i]) === -1) {
      temp.push(array[i])
    }
  }
  return temp
}

function sendLogDetail(isExcelData, isGroupData) {
  // console.log(isExcelData, isGroupData);
  let res = 1
  if (isExcelData && !isGroupData) {
    res = 2
  }
  if (!isExcelData && isGroupData) {
    res = 3
  }
  return res
}

function handlerClick() {
  let isSelf = document.getElementsByTagName('iFrame')[0].contains(event.target) // 这个是自己的区域
  if (!isSelf) {
    document.getElementsByTagName('iFrame')[0].remove()
    document.getElementsByClassName('mantle')[0].remove()
    document.removeEventListener('click', handlerClick)
  }
}

function getCurrentChat() {
  sendMessage(
    CONTENT_TO_INJECT_CURRENT_CHAT,
    { currentChat: true, module: 'wapi sender' },
    'window'
  )
}

async function sendContact(contactNum) {
  window.postMessage(
    {
      transCard: {
        contactNum,
        myNumber
      },
      module: 'wapi sender'
    },
    '*'
  )
  await new Promise((t) => setTimeout(t, 200))
}
