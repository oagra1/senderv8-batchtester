import { onMessage } from 'webext-bridge/dist/background'
import { getCountryNameByDomain } from '@/utils/phone-number-util.js'
import { EXTENSION_NAME, WAPLUS_REMOVE_FLAG } from '@/utils/extension-util'
import { loadZbaseConfigToStorage } from 'zbase-popup-component/src/zbase/popup/utils/ZbasePopupContentUtil'
import { getIpConfig } from '@/api/common.js'
import { alarms, tabs } from 'webextension-polyfill'
import { isMatchWhatsAppURL } from '@/utils/whatsapp.js'
import {
  CONTENT_TO_BACKGROUND_Z_BASE_TYPE,
  CONTENT_TO_BACKGROUND_USER_PHONE_NUM,
  CONTENT_TO_BACKGROUND_INSTALL_LOG_FLAG,
  POP_TO_BACKGROUND_URL,
  CONTENT_TO_BACKGROUND_IPCONFIG,
  POP_TO_BACKGROUND_GET_CUSTOMERSERVICE,
  POP_TO_BACKGROUND_GET_PERMISSION
} from '@/service/constants.js'
import { EXTENSION_ID, Z_BASE_CONFIG_URL } from '@/service/common.js'
import { sendLog } from '@/utils/log-util'
onMessage(CONTENT_TO_BACKGROUND_Z_BASE_TYPE, async ({ data }) => {
  if (!WAPLUS_REMOVE_FLAG) {
    // console.log("刷新页面调用")
    // loadZbaseConfigToStorage(EXTENSION_ID, Z_BASE_CONFIG_URL)
    fetch(Z_BASE_CONFIG_URL)
      .then((response) => response.json())
      .then((data) => {
        chrome.storage.local.set({ zbaseConfig: data }).then()
      })
      .catch((error) => console.log('获取配置时出错', error))
  }
})
onMessage(CONTENT_TO_BACKGROUND_USER_PHONE_NUM, async ({ data }) => {
  let PhoneNumber = require('awesome-phonenumber')
  let c = PhoneNumber('+' + data.userPhoneNum).getRegionCode() // -> 'SE'
  let pn = new PhoneNumber(data.userPhoneNum.toString(), c)
  let region = pn.getRegionCode() ? pn.getRegionCode() : ''
  let countryCode = getCountryNameByDomain(region) ? getCountryNameByDomain(region) : ''
  let phoneNum = data.userPhoneNum
  chrome.storage.local.get(['installTime', 'uuid', 'version'], function (res) {
    let installTime = res.installTime !== undefined ? res.installTime : ''
    let uuid = res.uuid !== undefined ? res.uuid : ''
    let version = res.version !== undefined ? res.version : ''
    let version_current = chrome.runtime.getManifest().version
    let uninstall_url =
      'https://wawebsender.com/waplus-sender-uninstall/?utm_source=' +
      phoneNum +
      '&install_time=' +
      installTime +
      '&country_name=' +
      countryCode +
      '&uuid=' +
      uuid +
      '&version=' +
      version +
      '&version_current=' +
      version_current +
      '&extension_name=' +
      EXTENSION_NAME
    if (!WAPLUS_REMOVE_FLAG) {
      chrome.runtime.setUninstallURL(uninstall_url)
    }
  })
})
onMessage(CONTENT_TO_BACKGROUND_INSTALL_LOG_FLAG, async ({ data }) => {
  chrome.storage.local.get(['installTime', 'uuid', 'version'], function (res) {
    let installTime = res.installTime !== undefined ? res.installTime : ''
    let uuid = res.uuid !== undefined ? res.uuid : ''
    let version = res.version !== undefined ? res.version : ''
    let version_current = chrome.runtime.getManifest().version
    let uninstall_url =
      'https://wawebsender.com/waplus-sender-uninstall/?utm_source=300012' +
      '&install_time=' +
      installTime +
      '&uuid=' +
      uuid +
      '&version=' +
      version +
      '&version_current=' +
      version_current +
      '&extension_name=' +
      EXTENSION_NAME
    if (!WAPLUS_REMOVE_FLAG) {
      chrome.runtime.setUninstallURL(uninstall_url)
    }
  })
})
onMessage(POP_TO_BACKGROUND_URL, async ({ data }) => {
  chrome.tabs.create({
    url: data.url,
    active: true
  })
})

/*******
 * @description: 根据用户IP信息获取用户的地理信息，并记录在本地，通过，只记录一次
 * @param {*} CONTENT_TO_BACKGROUND_IPCONFIG
 * @param {*} async
 * @return {*}
 */
onMessage(CONTENT_TO_BACKGROUND_IPCONFIG, async ({ data }) => {
  chrome.storage.local.get('userIpInfo', async (res) => {
    if (!res.userIpInfo) {
      const userIpInfo = await getIpConfig()
      if (userIpInfo) {
        sendLog(900014, { query_success: true })
        chrome.storage.local.set({ userIpInfo: userIpInfo })
      } else {
        sendLog(900014, { query_success: false })
      }
    }
  })
})
let isFetch = false
async function getUrl() {
  if (isFetch) {
    return
  }
  isFetch = true
  const result = await chrome.storage.local.get(['zbaseConfig'])
  const serviceUsSrc =
    result.zbaseConfig?.data?.config?.find((item) => item.name === 'communityConfig')?.params
      ?.communityUrl ?? 'https://waplus.io/c/WdcmPROG'

  fetch(serviceUsSrc, {
    method: 'GET',
    redirect: 'follow'
  })
    .then((res) => {
      let url =
        res?.url ||
        'https://api.whatsapp.com/send/?phone=8617792141633&text&type=phone_number&app_absent=0'
      const urlObj = new URL(url)
      const params = new URLSearchParams(urlObj.search)
      const paramsObj = Object.fromEntries(params)

      chrome.tabs.query({ active: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0]?.id, { openChat: paramsObj.phone })
      })
    })
    .catch((err) => {
      console.log(err)
    })
    .finally(() => {
      isFetch = false
    })
}
onMessage(POP_TO_BACKGROUND_GET_PERMISSION, async ({ data }) => {
  console.log('收到pop获取权限消息')
  return new Promise((resolve) => {
    chrome.permissions.request(
      {
        origins: ['*://*/*']
      },
      (granted) => {
        resolve(granted)
        getUrl()
      }
    )
  })
})

onMessage(
  POP_TO_BACKGROUND_GET_CUSTOMERSERVICE,
  async ({ data: { serviceUsSrc = 'https://waplus.io/c/WdcmPROG' } } = {}) => {
    console.log(serviceUsSrc)
    return new Promise(async (resolve, reject) => {
      let response = await fetch(serviceUsSrc, {
        method: 'GET',
        redirect: 'follow'
      })
      console.log('打印了response')
      console.log(response)
      resolve(response.url)
    })
  }
)

/**
 * @description: 时钟设置
 * @return {*}
 */
const nextMin = Date.now() + 60 * 1000 - (Date.now() % (60 * 1000))
const scheduleAlarmId = 'bulk_schedule-message-alarm'
alarms.create(scheduleAlarmId, {
  periodInMinutes: 1,
  when: nextMin
})

/**
 * @description: 时钟到点发送消息
 * @param {*} async
 * @return {*}
 */
alarms.onAlarm.addListener(async function (alarm) {
  if (alarm.name === scheduleAlarmId) {
    const allTabs = await tabs.query({ url: 'https://web.whatsapp.com/' })
    let whatsAppTabs = allTabs.filter((tab) => isMatchWhatsAppURL(tab.url))
    if (whatsAppTabs.length === 0) return

    whatsAppTabs.forEach((whatsAppTab) => {
      try {
        tabs.sendMessage(whatsAppTab.id, {
          from: 'BACKGROUND',
          to: 'CONTENT',
          type: 'SCHEDULE_PER_MIN',
          payload: {}
        })
      } catch (e) {
        console.error('时钟消息触发失败', e)
      }
    })
  }
})
