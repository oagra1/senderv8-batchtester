import { WEBSITE_URL } from '@/config/dict'
import { dealLog } from '@/utils/log-util.js'

// 插件共用路径
// 测试
// const ALL_EXTENSION_URL = 'https://sender.watechdev.asia/api/extension/'
// 生产
const ALL_EXTENSION_URL = 'https://wawebsender.com/api/extension/'

async function permissionActiveCodeList(transaction_id) {
  try {
    let responseData = await fetch(WEBSITE_URL + 'permission/active-code-list/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: { transaction_id: transaction_id }
    }).then((res) => {
      if (res.status !== 200) {
        dealLog({ eventType: 900014, otherParams: { url: res.url, status: res.status } })
      }
      return res.json()
    })
    return responseData
  } catch (e) {
    console.log(e)
  }
}

async function permissionInfo(whatsapp_number, transaction_id) {
  try {
    let time = new Date().getTime()
    let responseData = await fetch(WEBSITE_URL + 'permission/info/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: '1.0.1',
        transaction_id: transaction_id,
        whatsapp_number: whatsapp_number,
        time: time
      })
    }).then((res) => {
      if (res.status !== 200) {
        dealLog({ eventType: 900014, otherParams: { url: res.url, status: res.status } })
      }
      return res.json()
    })
    return responseData
  } catch (e) {
    console.log(e)
  }
}

async function permissionSync(whatsapp_number) {
  try {
    let responseData = await fetch(WEBSITE_URL + 'permission/sync/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ version: '1.0.1', whatsapp_number: whatsapp_number })
    }).then((res) => {
      if (res.status !== 200) {
        dealLog({ eventType: 900014, otherParams: { url: res.url, status: res.status } })
      }
      return res.json()
    })
    return responseData
  } catch (e) {
    console.log(e)
  }
}

async function permissionCheck(whatsapp_number, active_code) {
  try {
    let responseData = await fetch(WEBSITE_URL + 'permission/check/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ active_code: active_code, whatsapp_number: whatsapp_number })
    }).then((res) => {
      if (res.status !== 200) {
        dealLog({ eventType: 900014, otherParams: { url: res.url, status: res.status } })
      }
      return res.json()
    })
    return responseData
  } catch (e) {
    console.log(e)
  }
}

async function getTransactionInfo(transaction_id) {
  try {
    let responseData = await fetch(WEBSITE_URL + 'get-transaction-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ transaction_id: transaction_id })
    }).then((res) => {
      if (res.status !== 200) {
        dealLog({ eventType: 900014, otherParams: { url: res.url, status: res.status } })
      }
      return res.json()
    })
    return responseData
  } catch (e) {
    console.log(e)
  }
}

async function cancelTransaction(transaction_id, email) {
  try {
    let responseData = await fetch(WEBSITE_URL + 'transaction/cancel/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ transaction_id: transaction_id, email: email })
    }).then((res) => {
      if (res.status !== 200) {
        dealLog({ eventType: 900014, otherParams: { url: res.url, status: res.status } })
      }
      return res.json()
    })
    return responseData
  } catch (e) {
    console.log(e)
  }
}

// 获取支付链接接口
async function getPayUrl(plink_id, whatsapp_number, is_renew) {
  try {
    let responseData = await fetch(WEBSITE_URL + 'transaction/pay-link/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plink_id: plink_id,
        whatsapp_number: whatsapp_number,
        is_renew: is_renew
      })
    }).then((res) => {
      if (res.status !== 200) {
        dealLog({ eventType: 900014, otherParams: { url: res.url, status: res.status } })
      }
      return res.json()
    })
    return responseData
  } catch (e) {
    console.log(e)
  }
}

async function checkNewUserGuide(params) {
  try {
    let responseData = await fetch(ALL_EXTENSION_URL + 'permission/check-new-user-guide', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...params })
    }).then((res) => {
      if (res.status !== 200) {
        dealLog({ eventType: 150014, otherParams: { url: res.url, status: res.status } })
      }
      return res.json()
    })
    return responseData
  } catch (e) {
    console.log(e)
  }
}

export {
  permissionActiveCodeList,
  permissionInfo,
  permissionCheck,
  getTransactionInfo,
  permissionSync,
  cancelTransaction,
  getPayUrl,
  checkNewUserGuide
}
