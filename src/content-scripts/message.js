import { onMessage, sendMessage } from 'webext-bridge/dist/content-script'
import { sendLog } from '@/utils/log-util'
import { openChatUrl } from '@/utils/send-util.js'
import moment from 'moment'
import {
  POP_TO_CONTENT_TRANSACTION_ID,
  POP_TO_CONTENT_BUTTON_MESSAGE,
  INJECT_TO_CONTENT_EXPORT_GROUP_SUCCESS,
  INJECT_TO_CONTENT_EXPORT_LABEL_SUCCESS,
  INJECT_TO_CONTENT_CHOOSE_WARNING,
  INJECT_TO_CONTENT_SEND_GROUPS_INFOS,
  INJECT_TO_CONTENT_SEND_LABELS_INFOS,
  INJECT_TO_CONTENT_SEND_LABELS_META,
  INJECT_TO_CONTENT_IS_BUSINESS,
  CONTENT_TO_INJECT_BUTTON_DETAIL
} from '@/service/constants.js'
onMessage(POP_TO_CONTENT_TRANSACTION_ID, async (msg) => {
  permissionStatus = 'Pro'
  return 'pop=>content:transaction_id已处理完成'
})
/**
 * 打开弹窗并发送btn消息
 */
onMessage(POP_TO_CONTENT_BUTTON_MESSAGE, async ({ data }) => {
  openChatUrl(data.userPhoneNum).then((res) => {
    setTimeout(() => {
      sendMessage(CONTENT_TO_INJECT_BUTTON_DETAIL, { buttonDetail: data.buttonMsgData }, 'window')
    }, 3000)
  })
})

onMessage(INJECT_TO_CONTENT_EXPORT_GROUP_SUCCESS, async ({ data }) => {
  chrome.storage.local.set({ exportGroupSuccess: data.exportGroupSuccess }).then((r) => {})
  if (data.exportGroupSuccess) {
    sendLog(903301, { s_status: 1 })
  }
})

onMessage(INJECT_TO_CONTENT_EXPORT_LABEL_SUCCESS, async ({ data }) => {
  chrome.storage.local.set({ exportLabelSuccess: data.exportLabelSuccess }).then((r) => {})
  if (data.exportLabelSuccess) {
    sendLog(903302, { s_status: 1 })
  }
})
onMessage(INJECT_TO_CONTENT_CHOOSE_WARNING, async ({ data }) => {
  chrome.storage.local.set({ chooseWarning: data.chooseWarning }).then((r) => {})
  chrome.runtime.sendMessage({ chooseWarning: data.chooseWarning }).then((r) => {})
})
onMessage(INJECT_TO_CONTENT_SEND_GROUPS_INFOS, async ({ data }) => {
  chrome.storage.local.set({ groupsInfo: data.sendGroupsInfos }).then((r) => {})
  chrome.runtime.sendMessage({ groupsInfo: data.sendGroupsInfos }).then((r) => {})
  // sendLog(903222, { groupsInfo: data.sendGroupsInfos })
})
onMessage(INJECT_TO_CONTENT_SEND_LABELS_INFOS, async ({ data }) => {
  // console.log('收到inject数据，获取label')
  // console.log(data.sendLabelsInfos)
  chrome.storage.local.set({ labelOptions: data.sendLabelsInfos }).then((r) => {})
  chrome.runtime.sendMessage({ labelOptions: data.sendLabelsInfos }).then((r) => {})
  // sendLog(903223, { labelOptions: data.sendLabelsInfos })
})
onMessage(INJECT_TO_CONTENT_SEND_LABELS_META, async ({ data }) => {
  chrome.storage.local.set({ sendLabelsMeta: data.sendLabelsMeta }).then((r) => {})
})

onMessage(INJECT_TO_CONTENT_IS_BUSINESS, async ({ data }) => {
  chrome.storage.local.set({ isBusiness: data.isBusiness }).then((r) => {})
  chrome.runtime.sendMessage({ isBusiness: data.isBusiness }).then((r) => {})
})

onMessage('POP_TO_CONTENT_GET_LABELS', async () => {
  sendMessage('CONTENT_TO_INJECT_GET_LABELS', {}, 'window')
})

/**
 * @description: 自动回复触发函数
 * @return {*}
 */
onMessage('I2C_RECEIVE_NEW_MESSAGE', async ({ data }) => {
  const sender_user = data?.sender_user
  if (!sender_user) return
  const {
    bulk_openAutoReply,
    bulk_replyContent,
    bulk_chooseTimeRange,
    bulk_onlyReplyOnce,
    bulk_effectiveTimeRange,
    bulk_auto_reply_already = {}
  } = await chrome.storage.local.get([
    'bulk_openAutoReply',
    'bulk_replyContent',
    'bulk_chooseTimeRange',
    'bulk_onlyReplyOnce',
    'bulk_effectiveTimeRange',
    'bulk_auto_reply_already'
  ])

  // 自动回复是否开启
  if (!bulk_openAutoReply) return

  // 判断时间范围
  if (bulk_chooseTimeRange) {
    // 获取当前时间的时分秒部分
    const currentTime = moment() // 当前时间
    const currentFormattedTime = moment(currentTime.format('HH:mm:ss'), 'HH:mm:ss')

    // 获取开始和结束时间的时分秒部分
    const startTime = moment(moment(bulk_effectiveTimeRange[0]).format('HH:mm:ss'), 'HH:mm:ss')
    const endTime = moment(moment(bulk_effectiveTimeRange[1]).format('HH:mm:ss'), 'HH:mm:ss')

    // 判断是否跨天（例如：开始时间 20:00，结束时间 08:00）
    let isInRange

    if (startTime.isBefore(endTime)) {
      // 情况 1: 同一天
      isInRange = currentFormattedTime.isBetween(startTime, endTime, null, '[]')
    } else {
      // 情况 2: 跨天
      // 当前时间在 [startTime, 23:59:59] 或 [00:00:00, endTime] 范围内
      const endOfDay = moment('23:59:59', 'HH:mm:ss')
      const startOfDay = moment('00:00:00', 'HH:mm:ss')

      isInRange =
        currentFormattedTime.isBetween(startTime, endOfDay, null, '[]') ||
        currentFormattedTime.isBetween(startOfDay, endTime, null, '[]')
    }

    if (!isInRange) {
      return
    }
  }

  // 24消息仅回复一次
  if (bulk_onlyReplyOnce) {
    const lastSendTime = bulk_auto_reply_already && bulk_auto_reply_already[sender_user]
    if (lastSendTime) {
      const currentTime = moment()
      const lastSendTimeMoment = moment(lastSendTime)
      // 判断是否在24小时内
      const isWithin24Hours = currentTime.diff(lastSendTimeMoment, 'hours') < 24
      if (isWithin24Hours) {
        return
      }
    }

    // 更新最后回复时间
    chrome.storage.local.set({
      bulk_auto_reply_already: {
        ...bulk_auto_reply_already,
        [sender_user]: moment().valueOf()
      }
    })
  }

  sendMessage(
    'C2I_SEND_AUTO_REPLY_MESSAGE',
    { sender_user, replyContent: bulk_replyContent },
    'window'
  )

  sendLog(903402, {
    sender_user,
    replyContent: bulk_replyContent
  })
})

/**
 * @description: 检测whatsapp账号是否正常，区分单个还是批量
 * @return {*}
 */
onMessage('P2C_CHECK_NUMBER_STATUS', async ({ data }) => {
  const { numberList, type = 'one' } = data || {}
  let statusList = []

  for (let i = 0; i < numberList.length; i++) {
    let number = numberList[i]
    // 若number第一位为 +，则去掉
    number = number.replace(/^\+/, '')
    const status = await sendMessage('C2I_CHECK_NUMBER_STATUS', { phoneNum: number }, 'window')

    statusList[i] = {
      number,
      status
    }

    if (type === 'batch') {
      await chrome.storage.local.set({
        batchDetection: {
          batchDetectionIng: true,
          oldData: numberList,
          newData: statusList
        }
      })
    }
  }

  if (type === 'batch') {
    chrome.storage.local.set({
      batchDetection: {
        batchDetectionIng: false,
        oldData: numberList,
        newData: statusList
      }
    })
  }

  sendLog(903404, {
    checkType: type
  })

  return statusList
})
