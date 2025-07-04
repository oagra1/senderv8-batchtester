import { guid } from '@/utils/uuid-util'
import { dealLog } from '@/utils/log-util'

import { loadZbaseConfigToStorage } from 'zbase-popup-component/src/zbase/popup/utils/ZbasePopupContentUtil'
import {
  setInstallTime,
  updateSetInstallTime
} from 'zbase-popup-component/src/zbase/popup/utils/installTime'
import { EXTENSION_NAME, WAPLUS_REMOVE_FLAG, openInstallUrl } from '@/utils/extension-util'

import 'webext-bridge/dist/background'
import { EXTENSION_ID, Z_BASE_CONFIG_URL } from '@/service/common.js'

// 消息传递js
import '@/background/bridge-background'

chrome.runtime.onMessage.addListener(function (data) {
  //处理阿里云日志
  if (data.type === 'log') {
    dealLog(data)
  }
})
chrome.runtime.onInstalled.addListener((details) => {
  //如果用户之前没有邀评，需要加上邀评记录时间
  chrome.storage.local.get(['inviteCommentTime', 'uuid', 'version', 'zbaseConfig'], function (res) {
    console.log('安装后的数据')
    console.log(res)
    if (!res.inviteCommentTime) {
      chrome.storage.local.set({ inviteCommentTime: Math.round(new Date() / 1000) }).then((r) => {})
    }
    let uuid = res.uuid !== undefined ? res.uuid : guid()
    let version = res.version !== undefined ? res.version : chrome.runtime.getManifest().version
    let installTime = Math.round(new Date() / 1000)
    if (details.reason === 'install') {
      if (!WAPLUS_REMOVE_FLAG) {
        // loadZbaseConfigToStorage(EXTENSION_ID, Z_BASE_CONFIG_URL)
        fetch(Z_BASE_CONFIG_URL)
        .then((response) => response.json())
        .then((data) => {
          chrome.storage.local.set({ zbaseConfig: data }).then()
        })
        .catch((error) => console.log('获取配置时出错', error))
      }
      // 从组件中引入的
      setInstallTime(installTime)
      chrome.storage.local
        .set({ installTime, uuid, version, installLogFlag: false })
        .then((r) => {})
      dealLog({ type: 'log', eventType: 900008, otherParams: { uuid, version } })
      openInstallUrl()
    } else if (details.reason === 'update') {
      chrome.storage.local.get(['zbaseConfig', 'phoneNum'], (res) => {
        const zbaseConfig = res.zbaseConfig.data.config
        const phoneNum = res.phoneNum
        if (zbaseConfig && phoneNum) {
          for (let i = 0; i < zbaseConfig.length; i++) {
            if (zbaseConfig[i].name === 'WAPI Paid User') {
              const paid_number_list = zbaseConfig[i].params.paid_list
              if (paid_number_list.indexOf(phoneNum)) {
                chrome.storage.local.set({ paid_mark: true })
              }
            }
          }
        }
      })
      updateSetInstallTime(installTime)
      if (!WAPLUS_REMOVE_FLAG) {
        // loadZbaseConfigToStorage(EXTENSION_ID, Z_BASE_CONFIG_URL)
        fetch(Z_BASE_CONFIG_URL)
        .then((response) => response.json())
        .then((data) => {
          chrome.storage.local.set({ zbaseConfig: data }).then()
        })
        .catch((error) => console.log('获取配置时出错', error))
      }
    }
  })
})
