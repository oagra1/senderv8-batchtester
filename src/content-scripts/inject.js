function _serializeChatObj(obj) {
  if (obj === undefined) {
    return null
  }
  return Object.assign(_serializeRawObj(obj), {
    kind: obj.kind,
    isGroup: obj.isGroup,
    contact: obj['contact'] ? _serializeContactObj(obj['contact']) : null,
    groupMetadata: obj['groupMetadata'] ? _serializeRawObj(obj['groupMetadata']) : null,
    presence: obj['presence'] ? _serializeRawObj(obj['presence']) : null,
    msgs: null
  })
}

function _serializeContactObj(obj) {
  if (obj === undefined) {
    return null
  }

  return Object.assign(_serializeRawObj(obj), {
    formattedName: obj.formattedName,
    displayName: obj.displayName,
    isHighLevelVerified: obj.isHighLevelVerified,
    isMe: obj.isMe,
    isMyContact: obj.isMyContact,
    // isPSA: obj?.isPSA ? obj?.isPSA : '',
    // isPSA: false,
    isPSA: (() => {
      try {
        return obj.isPSA
      } catch (e) {
        return false
      }
    })(),
    isUser: obj.isUser,
    isVerified: obj.isVerified,
    // isWAContact: obj.isWAContact,
    isWAContact: (() => {
      try {
        return obj.isWAContact
      } catch (e) {
        return false
      }
    })(),
    profilePicThumbObj: obj.profilePicThumb ? _serializeProfilePicThumb(obj.profilePicThumb) : {},
    statusMute: obj.statusMute,
    msgs: null
  })
}

function _serializeProfilePicThumb(obj) {
  if (obj === undefined) {
    return null
  }

  return Object.assign(
    {},
    _serializeRawObj({
      eurl: obj.eurl,
      id: obj.id,
      img: obj.img,
      imgFull: obj.imgFull,
      raw: obj.raw,
      tag: obj.tag
    })
  )
}

function _serializeRawObj(obj) {
  if (obj) {
    let serialized = {}
    obj = obj.toJSON ? obj.toJSON() : { ...obj }
    for (let key in obj) {
      if (key === 'id') {
        serialized[key] = { ...obj[key] }
        continue
      }
      if (typeof obj[key] === 'object') {
        if (!Array.isArray(obj[key])) {
          serialized[key] = _serializeRawObj(obj[key])
          continue
        }
      }
      serialized[key] = obj[key]
    }
    return serialized
  }
  return {}
}

async function getAllChats() {
  return new Promise(async (resolve, reject) => {
    const chatList = await BULK_WPP.chat.list()
    const chats = chatList.map((chat) => _serializeChatObj(chat))
    resolve(chats)
  })
}

async function getAllGroups(done) {
  return new Promise(async (resolve, reject) => {
    const chatList = await BULK_WPP.chat.list()
    const groups = chatList
      .filter((chat) => chat?.contact?.isGroup && chat.kind !== 'community')
      .map((group) => {
        let { participants } = group.groupMetadata
        participants = participants
          .map((e) => e.contact)
          .filter((e) => !e.isMe)
          .map((e) => _serializeContactObj(e))
        return Object.assign(_serializeChatObj(group), {
          participants
        })
      })
    resolve(groups)
  })
}

import { getCountryByPhoneNum } from '@/utils/phone-number-util'
//todo content初始定义了3个值，需要补充是为了干什么
let stopFlag = false
let uninstallFlag = true
let currentChat = ''
//todo 按照森哥的要求，这个setInterval应该修改为alarm
// 获取到所有的Chat的长度，*代表不限制窗口，这个参数可以限制为部分URI可以接收
let c = setInterval(async function () {
  try {
    // console.log('获取群组')
    let allLabels = await BULK_WPP.labels.getAllLabels()
    let allChats = await getAllChats()
    let allGroups = await getAllGroups()
    const list = await BULK_WPP.chat.list()
    window.postMessage({ chatNum: list.length, module: 'wapi sender' }, '*')
    // 当所有的Chat的长度 或者 获取所有群组的时候, 发送信息给到Page
    if (
      // window.TWS_WAPI.getAllChats().length &&
      allChats.length &&
      // window.TWS_WAPI.getAllGroups() &&
      allGroups.length &&
      allLabels
    ) {
      // console.log('准备发送消息')
      setTimeout(async () => {
        await getAndSendAllGroups()
        await getAndSendAllLabels()
      }, 3000)
      clearInterval(c)
    }
  } catch (e) {}
}, 500)
import { sendMessage, onMessage, setNamespace } from 'webext-bridge/dist/window'

import {
  ALLOW_WINDOW_MESSAGING,
  INJECT_TO_CONTENT_EXPORT_GROUP_SUCCESS,
  INJECT_TO_CONTENT_EXPORT_LABEL_SUCCESS,
  INJECT_TO_CONTENT_CHOOSE_WARNING,
  INJECT_TO_CONTENT_SEND_GROUPS_INFOS,
  INJECT_TO_CONTENT_SEND_LABELS_INFOS,
  INJECT_TO_CONTENT_SEND_LABELS_META,
  INJECT_TO_CONTENT_IS_BUSINESS,
  CONTENT_TO_INJECT_CURRENT_CHAT,
  CONTENT_TO_INJECT_MEDIA_DETAIL,
  CONTENT_TO_INJECT_BUTTON_DETAIL
} from '@/service/constants.js'
setNamespace(ALLOW_WINDOW_MESSAGING)
import { inject } from 'vue'
onMessage(CONTENT_TO_INJECT_CURRENT_CHAT, async ({ data }) => {
  // let models = window.Store.Chat._models
  let models = await BULK_WPP.chat.list()
  for (let i = 0; i < models.length; i++) {
    if (models[i].__x_active) {
      currentChat = models[i].__x_id._serialized
      break
    }
  }
})
/**
 * 手动获取群组和label数据
 */
onMessage('CONTENT_TO_INJECT_GET_LABELS', async () => {
  console.log('收到消息')
  await getAndSendAllGroups()
  await getAndSendAllLabels()
})

onMessage(CONTENT_TO_INJECT_MEDIA_DETAIL, async ({ data }) => {
  //是巴西手机号且打开窗口后手机号发生变化
  if (currentChat && currentChat !== data.mediaDetail.contactno) {
    data.mediaDetail.contactno = currentChat
  }
  // console.log('发送附件')
  window.BULK_WPP.chat.sendFileMessage(data.mediaDetail.contactno, data.mediaDetail.file)
})

onMessage(CONTENT_TO_INJECT_BUTTON_DETAIL, async ({ data }) => {
  //是巴西手机号且打开窗口后手机号发生变化
  if (currentChat && currentChat !== data.buttonDetail.contactno) {
    data.buttonDetail.contactno = currentChat
  }
  window.BULK_WPP.chat.sendTextMessage(data.buttonDetail.contactno, data.buttonDetail.content, {
    useTemplateButtons: true, // False for legacy
    buttons: data.buttonDetail.button
  })
})

function sendExportGroupSuccessToContent() {
  sendMessage(
    INJECT_TO_CONTENT_EXPORT_GROUP_SUCCESS,
    {
      waExporterDownload: true,
      exportGroupSuccess: true,
      module: 'wapi sender'
    },
    'content-script'
  )
}

async function getAllChatIds(done) {
  const chatList = await BULK_WPP.chat.list()
  // const chatIds = window.Store.Chat.map((chat) => chat.id._serialized || chat.id)
  const chatIds = chatList.map((chat) => chat.id._serialized || chat.id)
  if (done !== undefined) done(chatIds)
  return chatIds
}

// 初始化的时候开始监听消息
// window.addEventListener里面的false参数，代表在目标或者冒泡阶段处理事件，也就是说，我们这个window.addListener会调用两次？？？
window.addEventListener(
  'message',
  async function (e) {
    if (e.data.module === 'wapi sender') {
      if (e.data.deleteMessage !== undefined) {
        // 之前沒有對話窗口，会报错
        try {
          // console.log('删除窗口')
          // console.log(e.data.phone)
          // 8615319133787@c.us
          // window.TWS_WAPI.deleteConversation(e.data.phone)
          const chatList = await BULK_WPP.chat.list()
          const chat = chatList.find((item) => item.id._serialized === e.data.phone)
          BULK_WPP.chat.delete(chat.id)
        } catch (res) {}
        return
      }
      if (e.data.audioDetail) {
        if (currentChat && currentChat !== e.data.audioDetail.contactno) {
          e.data.audioDetail.contactno = currentChat
        }
        window.BULK_WPP.chat.sendFileMessage(
          e.data.audioDetail.contactno,
          e.data.audioDetail.file,
          {
            type: 'audio',
            isPtt: true
          }
        )
      }
      if (e.data.transCard) {
        let { contactNum, myNumber } = e.data.transCard
        let res = await BULK_WPP.contact.get(`${myNumber}@c.us`)
        await BULK_WPP.chat.sendVCardContactMessage(`${contactNum}@c.us`, {
          id: `${myNumber}@c.us`,
          name: res.name || res.formattedName
        })
      }
      if (e.data.echoDeleteMessage !== undefined) {
        // console.log('删除聊天窗口')
        window.BULK_WPP.chat
          .getMessages(e.data.phone)
          .then((res) => {
            window.postMessage({ key: e.data.key, value: false, module: 'eventDB' }, '*')
          })
          .catch((res) => {
            // 新窗口则提示main函数，发完消息后删除聊天窗口
            window.postMessage({ key: e.data.key, value: true, module: 'eventDB' }, '*')
          })
        return
      }
      // TODO 找不到发送方
      if (e.data.uninstallFlag !== undefined) {
        uninstallFlag = true
      }
      ;(async function () {
        //静默发送消息模块
        let phoneNumList = e.data.phoneNumList
        let content = e.data.content
        let minNum = e.data.minNum
        let maxNum = e.data.maxNum
        stopFlag = e.data.stopFlag
        let excelData = e.data.excelData
        let sendButtonValue = e.data.sendButtonValue
        let buttonInputValue = e.data.buttonInputValue
        let button_radio = e.data.button_radio
        // let dailySendNums = e.data.dailySendNums;
        // let chatIds = window.TWS_WAPI.getAllChatIds()
        let chatIds = getAllChatIds()
        let phoneNumSuccessList = []
        let phoneNumFailList = []
        // 有联系人才有下面操作
        if (phoneNumList) {
          // 发送给content的总次数
          window.postMessage({ countAll: phoneNumList.length, module: 'wapi sender' }, '*')
          // 循环电话号码列表，每个做一次判断是否为联系人，如果是联系人那么可以走静默发送
          for (let i = 0; i < phoneNumList.length; i++) {
            // 判断用户是否点击了stop按钮
            if (!stopFlag) {
              // 记录电话号码是否为联系人的标识
              let flag = 0
              console.log('发送开始')
              let p = phoneNumList[i]
              // 获取所有联系人的信息，识别本次电话号码是否为联系人的电话号码
              for (let j = 0; j < chatIds.length; j++) {
                let c = chatIds[j]
                // 后面加一个@，防止被误发到群里
                if (c.indexOf(p + '@') === 0) {
                  let contentTmp = dealContentPlaceholder(content, excelData, i)
                  // 该条电话号码即为联系人电话号码，可以静默发送消息
                  // window.TWS_WAPI.sendMessage(c, contentTmp)
                  BULK_WPP.chat.sendTextMessage(c, contentTmp, {
                    createChat: true
                  })
                  flag = 1
                  break
                }
              }
              if (!flag) {
                phoneNumFailList.push(p)
                // 发送给content失败的总次数
                window.postMessage(
                  { countFail: phoneNumFailList.length, module: 'wapi sender' },
                  '*'
                )
              } else {
                flag = 0
                phoneNumSuccessList.push(p)
                // 发送给content成功的总次数
                window.postMessage(
                  {
                    countSuccess: phoneNumSuccessList.length,
                    module: 'wapi sender'
                  },
                  '*'
                )
              }
              // 如果发送的是最后一条消息，那么不用等待
              if (i !== phoneNumList.length - 1) {
                // 睡眠需要等待的时间
                await sleepBySeconds(minNum, maxNum)
              }
              // 更新今日消息发送总数
              // incrDailySendNums();
              // dailySendNums = getIncrDailySendNums(dailySendNums);
              // window.postMessage({incrDailySendNums: dailySendNums}, '*');
            } else {
              break
              // console.log("用户终止了inject操作");
            }
          }
          // 如果遍历完所有数据，修改stopFlag为true
          if (!stopFlag) {
            window.postMessage({ stopFlag: true, module: 'wapi sender' }, '*')
          }
        }

        //导出群组消息模块
        // let exportGroup = e.data.exportGroup;
        // let exportGroupInfo = e.data.exportGroupInfo;
        let exportGroupWapi = e.data.waExporterDownload ? e.data.exportGroup : ''

        let exportTypeWapi = e.data.waExporterDownload ? e.data.exportType : ''
        let exportFromWapi = e.data.waExporterDownload ? e.data.exportFrom : null
        let valueGroupWapi = e.data.valueGroup ? e.data.valueGroup : []
        let valueLabelWapi = e.data.valueLabel ? e.data.valueLabel : null
        let excludeAdminValueWapi = e.data.excludeAdminValue ? e.data.excludeAdminValue : false
        // 导出联系人
        if (exportFromWapi === 'chat') {
          await dealChatInfos(exportGroupWapi, exportTypeWapi)
          sendExportGroupSuccessToContent()
        } else if (exportFromWapi === 'label') {
          // label导出
          await dealAllLabelInfos(exportTypeWapi, valueLabelWapi)
          window.postMessage(
            {
              waExporterDownload: true,
              exportLabelSuccess: true,
              module: 'wapi sender'
            },
            '*'
          )
          sendMessage(
            INJECT_TO_CONTENT_EXPORT_LABEL_SUCCESS,
            {
              waExporterDownload: true,
              exportLabelSuccess: true,
              module: 'wapi sender'
            },
            'content-script'
          )
        } else if (exportFromWapi === 'group') {
          // 群组导出
          await dealAllGroupInfos(exportTypeWapi, valueGroupWapi, excludeAdminValueWapi)
          sendExportGroupSuccessToContent()
        }
      })()
    }
  },
  false
)

async function dealChatInfos(exportGroup, exportType) {
  let chatInfos = await getChatInfos()
  let participantsInfoList = []
  let name = ''
  if (chatInfos) {
    let result = processingData(exportGroup, chatInfos, participantsInfoList, name)
    name = result.name
    participantsInfoList = result.participantsInfoList
    participantsInfoList = getCountryByPhoneNum(participantsInfoList)
    await fnExport(participantsInfoList, name, exportType)
  } else {
    sendMessage(
      INJECT_TO_CONTENT_CHOOSE_WARNING,
      { waExporterDownload: true, chooseWarning: false, module: 'wapi sender' },
      'content-script'
    )
  }
}

function processingData(exportGroup, chatInfos, participantsInfoList, name) {
  if (exportGroup === 'radioChatAll') {
    name = 'All Chats'
    for (let i = 0; i < chatInfos.length; i++) {
      let tmp = {}
      let chatInfo = chatInfos[i]['contact']
      tmp['phoneNum'] = chatInfo['id']['user'] ? chatInfo['id']['user'] : ''
      tmp['isMyContact'] = chatInfo['isMyContact'] === true ? 'True' : 'False'
      tmp['displayName'] = chatInfo['pushname'] ? chatInfo['pushname'] : ''
      tmp['savedName'] = chatInfo['name'] ? chatInfo['name'] : ''
      participantsInfoList.push(tmp)
    }
  }
  if (exportGroup === 'radioChatUnsaved') {
    name = 'Unsaved Chats'
    for (let i = 0; i < chatInfos.length; i++) {
      let tmp = {}
      let chatInfo = chatInfos[i]['contact']
      if (chatInfo['isMyContact'] !== true) {
        tmp['phoneNum'] = chatInfo['id']['user'] ? chatInfo['id']['user'] : ''
        tmp['isMyContact'] = 'False'
        tmp['displayName'] = chatInfo['pushname'] ? chatInfo['pushname'] : ''
        tmp['savedName'] = chatInfo['name'] ? chatInfo['name'] : ''
        participantsInfoList.push(tmp)
      }
    }
  }
  return {
    name,
    participantsInfoList
  }
}

async function getChatInfos() {
  // let tmp = await window.TWS_WAPI.getAllChats()
  let tmp = await BULK_WPP.chat.list()
  let data = []
  for (let i = 0; i < tmp.length; i++) {
    let s = tmp[i]['contact']['isUser']
    if (s) {
      data.push(tmp[i])
    }
  }
  return data
}

async function dealAllGroupInfos(exportType, valueGroup, excludeAdminValue) {
  let allGroupInfos = await getAllGroupInfos(valueGroup)
  if (allGroupInfos) {
    let allParticipantsInfoList = []
    let allGroupName = []
    for (let k = 0; k < allGroupInfos.length; k++) {
      let groupInfos = allGroupInfos[k]
      let participantsInfoList = []
      let adminList = []
      let groupName = groupInfos['contact']['name']
      // 获取管理员列表
      // let childParticipants = groupInfos['groupMetadata']['participants']
      let childParticipants = groupInfos['groupMetadata']['participants']['_models']
      for (let i in childParticipants) {
        if (childParticipants[i]['isAdmin']) {
          adminList.push(childParticipants[i]['contact']['phoneNumber']['user'])
        }
      }
      // 获取普通成员列表，并过滤掉管理员
      if (excludeAdminValue) {
        // let parentParticipants = groupInfos['participants']
        let parentParticipants = groupInfos['groupMetadata']['participants']['_models']
        for (let i = 0; i < parentParticipants.length; i++) {
          let tmp = {}
          let flag = true
          tmp['phoneNum'] = parentParticipants[i]['contact']['phoneNumber']['user']
            ? parentParticipants[i]['contact']['phoneNumber']['user']
            : ''
          // tmp['isMyContact'] = parentParticipants[i]['isMyContact'] === true ? 'True' : 'False'
          tmp['isMyContact'] =
            parentParticipants[i]['contact']['isMyContact'] === true ? 'True' : 'False'
          // tmp['displayName'] = parentParticipants[i]['pushname']
          //   ? parentParticipants[i]['pushname']
          //   : ''
          tmp['displayName'] = parentParticipants[i]['contact']['pushname']
            ? parentParticipants[i]['contact']['pushname']
            : ''
          // tmp['savedName'] = parentParticipants[i]['name'] ? parentParticipants[i]['name'] : ''
          tmp['savedName'] = parentParticipants[i]['contact']['name']
            ? parentParticipants[i]['contact']['name']
            : ''
          for (let j = 0; j < adminList.length; j++) {
            if (tmp['phoneNum'] === adminList[j]) {
              flag = false
              break
            }
          }
          if (flag) {
            participantsInfoList.push(tmp)
          }
        }
      }
      // 获取普通成员列表，并添加管理员
      if (!excludeAdminValue) {
        // 获取当前的联系人电话
        let tmpPhoneNumberList = []
        // let parentParticipants = groupInfos['participants']
        let parentParticipants = groupInfos['groupMetadata']['participants']['_models']
        for (let i = 0; i < parentParticipants.length; i++) {
          let tmp = {}
          tmp['phoneNum'] = parentParticipants[i]['contact']['phoneNumber']['user']
            ? parentParticipants[i]['contact']['phoneNumber']['user']
            : ''
          tmp['isMyContact'] =
            parentParticipants[i]['contact']['isMyContact'] === true ? 'True' : 'False'
          tmp['displayName'] = parentParticipants[i]['contact']['pushname']
            ? parentParticipants[i]['contact']['pushname']
            : ''
          tmp['savedName'] = parentParticipants[i]['contact']['name']
            ? parentParticipants[i]['contact']['name']
            : ''
          tmpPhoneNumberList.push(tmp['phoneNum'])
          participantsInfoList.push(tmp)
        }
        // 补充还未获取的管理员信息
        for (let i = 0; i < adminList.length; i++) {
          if (tmpPhoneNumberList.indexOf(adminList[i]) === -1) {
            // console.log('adminList[i]', adminList[i])
            // let newData = window.Store.Contact.get(adminList[i] + '@c.us')
            let newData = undefined
            try {
              newData = await BULK_WPP.contact.get(adminList[i] + '@c.us')
            } catch (error) {}
            let tmp = {}
            if (newData) {
              tmp['phoneNum'] = adminList[i]
              tmp['isMyContact'] = newData['__x_isMyContact'] === true ? 'True' : 'False'
              tmp['displayName'] = newData['__x_pushname'] ? newData['__x_pushname'] : ''
              tmp['savedName'] = newData['__x_name'] ? newData['__x_name'] : ''
              participantsInfoList.push(tmp)
            }
          }
        }
      }
      participantsInfoList = getCountryByPhoneNum(participantsInfoList)
      allParticipantsInfoList.push(participantsInfoList)
      allGroupName.push(groupName)
    }
    await fnAllExport(allParticipantsInfoList, allGroupName, excludeAdminValue, exportType)
  }
}

async function dealAllLabelInfos(exportType, valueLabel) {
  let labelMeta = await getLabelMeta()
  let users = valueLabel ? labelMeta[valueLabel.value] || [] : [] //没有用户也要导出空表
  // users.push({id: {user: '104226306953418'}})
  let labelsList = await window.BULK_WPP.labels.getAllLabels()
  const labelsMap = labelsList.reduce((acc, cur) => {
    acc[cur.id] = cur.name
    return acc
  }, {})
  if (valueLabel && users.length > 0 && labelsMap) {
    let labelName = labelsMap[valueLabel.value]
    let data = []
    for (let i = 0; i < users.length; i++) {
      // let newData = window.Store.Contact.get(users[i]['id']['user'] + '@c.us')
      let newData = undefined
      if (users[i]['contact']['isUser']) {
        try {
          newData = await BULK_WPP.contact.get(users[i]['id']['user'] + '@c.us')
        } catch (err) {}
      }
      if (newData) {
        data.push({
          phoneNum: users[i]?.id?.user || '',
          isMyContact: newData?.__x_isMyContact === true ? 'True' : 'False',
          displayName: newData?.__x_pushname ? newData?.__x_pushname : '',
          savedName: newData?.__x_name ? newData?.__x_name : ''
        })
      }
    }
    await fnAllExport(
      [getCountryByPhoneNum(data)],
      [labelName],
      null,
      exportType,
      'Label Name',
      'All Labels'
    )
  } else {
    await fnAllExport([], [], null, exportType, 'Label Name', 'All Labels')
  }
}

async function fnAllExport(
  allData,
  allGroupName,
  excludeAdminValue,
  exportType,
  columnName = 'Group Name',
  FileNamePrefix = 'All Groups'
) {
  if (exportType === 'vcf') {
    let phoneNumList = []
    let nameList = []
    for (let i = 0; i < allData.length; i++) {
      if (allData[i]) {
        for (let k = 0; k < allData[i].length; k++) {
          phoneNumList.push(allData[i][k]['phoneNum'])
          nameList.push(allData[i][k]['savedName'])
        }
      }
    }

    let _FileNamePrefix = allGroupName.length > 0 ? allGroupName[0] : FileNamePrefix
    if (excludeAdminValue) {
      _FileNamePrefix = _FileNamePrefix + ' Exclude Admins'
    }
    exportVcard(phoneNumList, nameList, _FileNamePrefix)
  } else {
    // 新建book
    let wb = XLSX.utils.book_new()
    let finalData = []
    for (let k = 0; k < allData.length; k++) {
      let data = allData[k]
      allGroupName[k] = allGroupName[k].replace(/\*|\?|:|\\|\/|\[|\]/gm, '_')
      // 给要导出的数据重新排序
      for (let i = 0; i < data.length; i++) {
        let tmp = {}
        tmp['Country Code'] = data[i]['countryCode']
        tmp['Country'] = data[i]['country']
        tmp["Contact's Public Display Name"] = data[i]['displayName']
        tmp['Phone Number'] = data[i]['phoneNum']
        tmp['is My Contact'] = data[i]['isMyContact']
        tmp['Saved Name'] = data[i]['savedName']
        tmp[columnName] = allGroupName[k]
        finalData.push(tmp)
      }
    }
    // 新建空workbook，然后加入worksheet
    let ws = XLSX.utils.json_to_sheet(finalData)
    ws['!cols'] = [
      { wch: 15 },
      { wch: 15 },
      { wch: 30 },
      { wch: 25 },
      { wch: 15 },
      { wch: 30 },
      { wch: 30 }
    ]
    // 生成xlsx文件(book,sheet数据,sheet命名)
    XLSX.utils.book_append_sheet(wb, ws, 'sheet1')
    switch (true) {
      case allGroupName.length === 1 && !excludeAdminValue:
        XLSX.writeFile(wb, allGroupName[0] + '.' + exportType)
        break
      case allGroupName.length === 1 && excludeAdminValue:
        XLSX.writeFile(wb, allGroupName[0] + ' Exclude Admins' + '.' + exportType)
        break

      // 未选择群组的时候，导出空表
      case !excludeAdminValue:
        XLSX.writeFile(wb, FileNamePrefix + '.' + exportType)
        break
      case excludeAdminValue:
        XLSX.writeFile(wb, FileNamePrefix + ' Exclude Admins' + '.' + exportType)
        break
    }
  }
}

function exportVcard(phoneNumList, nameList, FileNamePrefix = 'All Groups') {
  let contents = ''
  let phoneNumListTmp = []
  let nameListTmp = []
  //给相同手机号的去重
  for (let i = 0; i < phoneNumList.length; i++) {
    if (phoneNumListTmp.indexOf(phoneNumList[i]) === -1) {
      phoneNumListTmp.push(phoneNumList[i])
      nameListTmp.push(nameList[i])
    }
  }
  for (let i = 0; i < phoneNumListTmp.length; i++) {
    let vCard = vCardsJS()
    vCard.lastName = nameListTmp[i]
    vCard.workPhone = phoneNumListTmp[i]
    var vCardFormatter = require('vcards-js/lib/vCardFormatter')
    contents = contents + vCardFormatter.getFormattedString(vCard)
  }
  const fileType = 'text/x-vcard'
  const fileExtension = '.vcf'
  const blob = new Blob([contents], { type: fileType })
  saveAs(blob, FileNamePrefix + fileExtension)
}

// 根据popup传来的参数来判断要导出哪些群组
async function getAllGroupInfos(valueGroup) {
  // let tmp = await window.TWS_WAPI.getAllGroups()
  // let tmp = await BULK_WPP.chat.list({ onlyGroups: true })
  const chatList = await window.BULK_WPP?.chat.list()
  const tmp = chatList.filter((chat) => chat?.contact?.isGroup)
  let res = []
  for (let i = 0; i < tmp.length; i++) {
    let s = tmp[i]['id']['user']
    // 包含all groups就无脑导出，否则要看是不是选了这个群组
    if (valueGroup === s) {
      res.push(tmp[i])
    }
  }
  return res
}

async function getAllPhoneNumberList(groupInfos) {
  // 获取当前的联系人电话
  // let tmpPhoneNumberList = []
  // let parentParticipants = groupInfos['participants']
  // for (let i = 0; i < parentParticipants.length; i++) {
  //   let tmp = {}
  //   tmp['phoneNum'] = parentParticipants[i]['id']['user'] ? parentParticipants[i]['id']['user'] : ''
  //   tmpPhoneNumberList.push(tmp['phoneNum'])
  // }
  // console.log('获取到tmpPhoneNumberList');
  // console.log(tmpPhoneNumberList);
  // return tmpPhoneNumberList

  let tmpPhoneNumberList = []
  let parentParticipants = await BULK_WPP.group.getParticipants(`${groupInfos['id']['user']}`+ '@g.us')
  for (let i = 0; i < parentParticipants.length; i++) {
    let tmp = {}
    if(parentParticipants[i]['contact']['isMe']){
      continue;
    }
    tmp['phoneNum'] = parentParticipants[i]['contact']['phoneNumber']['user'] ? parentParticipants[i]['contact']['phoneNumber']['user'] : ''
    tmpPhoneNumberList.push(tmp['phoneNum'])
  }
  return tmpPhoneNumberList
}

// 获取并且发送所有群组的信息给到Page
async function getAndSendAllGroups() {
  try {
    const groups = await getAllGroups();
    
    // 使用map+Promise.all处理异步
    const resultData = await Promise.all(groups.map(async (item) => {
      const phoneData = await getAllPhoneNumberList(item);
      return {
        data: phoneData,
        value: item.id.user,
        label: item.contact.name,
        key: item.id.user
      };
    }));

    sendMessage(
      INJECT_TO_CONTENT_SEND_GROUPS_INFOS,
      { sendGroupsInfos: resultData, module: 'wapi sender' },
      'content-script'
    )
    return resultData;
  } catch (error) {
    console.error('操作失败:', error);
    return [];
  }
}

// 获取并且发送所有label的信息给到Page
async function getAndSendAllLabels() {
  try {
    // let labelsList = await window.TWS_WAPI.getAllLabels();
    let labelsList = await window.BULK_WPP.labels.getAllLabels()
    let labels = labelsList.map((t) => {
      return { value: t.id, label: t.name, count: t.count }
    })
    console.log('发送数据到content-label')
    console.log(labels)
    sendMessage(
      INJECT_TO_CONTENT_SEND_LABELS_INFOS,
      { sendLabelsInfos: labels, module: 'wapi sender' },
      'content-script'
    )
    sendMessage(
      INJECT_TO_CONTENT_IS_BUSINESS,
      {
        isBusiness: window.BULK_WPP.profile.isBusiness(),
        module: 'wapi sender'
      },
      'content-script'
    )

    let labelMap = await getLabelMeta()
    //数据格式不对，需要将数据格式转化再发送消息
    for (let key in labelMap) {
      let data = []
      labelMap[key].forEach((item) => {
        let temp = {}
        temp.id = item.id
        data.push(temp)
      })
      labelMap[key] = data
    }
    sendMessage(
      INJECT_TO_CONTENT_SEND_LABELS_META,
      { sendLabelsMeta: labelMap, module: 'wapi sender' },
      'content-script'
    )
  } catch (e) {
    console.log('getAndSendAllLabels', e)
  }
}

//todo 休眠的时候要和popup交互，这是要干什么
async function sleepBySeconds(s, e) {
  let m = 0
  if (e >= s) {
    m = Math.floor(Math.random() * (e - s + 1) + s) * 1000
  }
  while (m > 0) {
    m = m - 1000
    window.postMessage({ waitSeconds: m / 1000, module: 'wapi sender' }, '*')
    await new Promise((t) => setTimeout(t, 1000))
  }
}

// 处理content，让excel数据替换placeholder
function dealContentPlaceholder(content, excelData, indexCount) {
  if (excelData == []) {
    return content
  } else {
    if (indexCount < excelData.length) {
      try {
        excelData = excelData[indexCount]
        let whatsAppNumber = excelData['whatsAppNumber'] ? excelData['whatsAppNumber'] : ''
        let firstName = excelData['firstName'] ? excelData['firstName'] : ''
        let lastName = excelData['lastName'] ? excelData['lastName'] : ''
        let other = excelData['other'] ? excelData['other'] : ''
        content = content.replaceAll('{{WhatsApp Number}}', whatsAppNumber)
        content = content.replaceAll('{{First Name}}', firstName)
        content = content.replaceAll('{{Last Name}}', lastName)
        content = content.replaceAll('{{Other}}', other)
      } catch (e) {
        console.log(e)
      }
    }
    return content
  }
}

// 获取当前是否打开群组窗口，是则返回群联系人信息，否则返回空
async function getGroupInfos(exportGroupInfo) {
  // let tmp = await window.TWS_WAPI.getAllGroups()
  let tmp = await getAllGroups()

  let data = ''
  if (tmp.length === 0) {
    return undefined
  } else {
    for (let i = 0; i < tmp.length; i++) {
      if (tmp[i]['id']['user'] === exportGroupInfo) {
        data = tmp[i]
        break
      }
    }
    return data
  }
}

/**
 * Fetches all labels objects from store
 *
 * @returns {labelId:List of chats}
 */
async function getLabelMeta() {
  const labelsList = await window.BULK_WPP.labels.getAllLabels()
  const chatList = await BULK_WPP.chat.list()
  // const labelUsers = await Promise.all(window.Store.Chat.filter((chat) => chat.labels.length > 0))
  const labelUsers = chatList.filter((chat) => chat.labels.length > 0)
  // 每个用户下有多个labels, todo 有没有类似与 groupMetadata 的数据结构
  let labels = {}
  for (let i = 0; i < labelUsers.length; i++) {
    let info = _serializeChatObj(labelUsers[i])
    for (let j = 0; j < labelUsers[i].labels.length; j++) {
      let labelId = labelUsers[i].labels[j]
      labelId in labels ? labels[labelId].push(info) : (labels[labelId] = [info])
    }
  }
  return labels
}

// 导出excel数据
let saveAs = require('file-saver')
let XLSX = require('xlsx')
let vCardsJS = require('vcards-js')
async function fnExport(data, groupName, exportType) {
  let finalData = []
  let phoneNumList = []
  let nameList = []
  groupName = groupName.replace(/\*|\?|:|\\|\/|\[|\]/gm, '_')
  // 给要导出的数据重新排序
  for (let i = 0; i < data.length; i++) {
    let tmp = {}
    tmp['Country Code'] = data[i]['countryCode']
    tmp['Country'] = data[i]['country']
    tmp["Contact's Public Display Name"] = data[i]['displayName']
    tmp['Phone Number'] = data[i]['phoneNum']
    tmp['is My Contact'] = data[i]['isMyContact']
    tmp['Saved Name'] = data[i]['savedName']
    tmp['Group Name'] = groupName
    finalData.push(tmp)
    phoneNumList.push(tmp['Phone Number'])
    nameList.push(tmp['Saved Name'])
  }
  if (exportType === 'vcf') {
    exportVcard(phoneNumList, nameList, groupName)
  } else {
    // 新建空workbook，然后加入worksheet
    const ws = XLSX.utils.json_to_sheet(finalData)
    ws['!cols'] = [
      { wch: 15 },
      { wch: 15 },
      { wch: 30 },
      { wch: 25 },
      { wch: 15 },
      { wch: 30 },
      { wch: 30 }
    ]
    // 新建book
    const wb = XLSX.utils.book_new()
    // 生成xlsx文件(book,sheet数据,sheet命名)
    XLSX.utils.book_append_sheet(wb, ws, 'sheet1')
    // 写文件(book,xlsx文件名称)
    XLSX.writeFile(wb, groupName + '.' + exportType)
  }
  sendMessage(
    INJECT_TO_CONTENT_CHOOSE_WARNING,
    { waExporterDownload: true, chooseWarning: false, module: 'wapi sender' },
    'content-script'
  )
}

/**
 * 当用户手发消息
 * */
function onMsgAdd(msg) {
  if (!msg?.id || !msg.isNewMsg) {
    return
  }
  queueMicrotask(() => {
    if (msg.type === 'ciphertext') {
      msg.once('change:type', () => {
        queueMicrotask(() => {
          _onMsgAdd(msg, msg.collection)
        })
      })
    }
    _onMsgAdd(msg, msg.collection)
  })
}

function _onMsgAdd(msg, msgCollection) {
  if (msg.id.fromMe) {
    _onSendMsg(msg, msgCollection)
  } else {
    _onReceiveMsg(msg, msgCollection)
  }
}

/**
 * 用户发出消息
 * @param msg 发出的消息
 * @param msgCollection 用户所有聊天列表, 相当于window.Store.Msg
 * */
async function _onSendMsg() {
  // console.log('我要发消息了', msg)
}

/**
 * 用户接收消息
 * @param msg 接收的消息
 * */
async function _onReceiveMsg(msg) {
  const sender_user = msg?.senderObj?.id?._serialized
  sendMessage(
    'I2C_RECEIVE_NEW_MESSAGE',
    {
      sender_user
    },
    'content-script'
  )
}

function onMsgEventTrigger(event, ...params) {
  switch (event) {
    // 监听msg收到新消息
    case 'add':
      onMsgAdd(...params)
      break
  }
}

/**
 * @description: 监听消息接收/发送事件
 * @return {*}
 */
window.BULK_WPP?.webpack?.onFullReady(() => {
  window?.BULK_WPP?.whatsapp?.MsgStore?.on('all', onMsgEventTrigger)
})

/**
 * @description: 接收自动回复消息
 * @return {*}
 */
onMessage('C2I_SEND_AUTO_REPLY_MESSAGE', ({ data }) => {
  const { sender_user, replyContent } = data

  window.BULK_WPP.chat.sendTextMessage(sender_user, replyContent, {})
})

/**
 * @description: 检测whatsapp账号是否正常
 * @return {*}
 */
onMessage('C2I_CHECK_NUMBER_STATUS', async ({ data }) => {
  const { phoneNum } = data || {}

  let result = null

  try {
    result = await window.BULK_WPP.contact.queryExists(`${phoneNum}@c.us`)
  } catch (error) {
    console.error('检测出错了', error)
  }

  return !!result?.wid
})
