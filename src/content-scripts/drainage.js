import { onMessage } from 'webext-bridge/dist/content-script'

onMessage('P2C_GET_DRAINAGE', async () => {
  return await computedDrainage()
})

onMessage('P2C_SET_DRAINAGE', async () => {
  return await setDrainage()
})

export async function setDrainage() {
  const now = Date.now()
  // const nextRemindTime = now + 5 * 60 * 1000
  const nextRemindTime = now + 30 * 24 * 60 * 60 * 1000
  await chrome.storage.local.set({ nextRemindTime: nextRemindTime })
  //
  // console.log('设置5分钟之后再次弹窗')
  return true
}

export async function computedDrainage() {
  // if (_checkInstall()) return false
  // console.log('获取数据~')
  const now = Date.now()
  // 安装时间
  let { installTime } = await chrome.storage.local.get('installTime')
  installTime = installTime * 1000
  // 下次弹出时间
  let { nextRemindTime = null } = await chrome.storage.local.get('nextRemindTime')
  if (nextRemindTime) {
    // console.log('已经有时间了，等待下一次弹窗')
  }
  // if (!nextRemindTime) nextRemindTime = installTime + 1 * 60 * 1000
  if (!nextRemindTime) nextRemindTime = installTime + 3 * 24 * 60 * 60 * 1000

  if (now > nextRemindTime) {
    // console.log('大于1分钟了，第一次弹窗')
    return true
  } else {
    return false
  }
}
function _checkInstall() {
  return (
    window.localStorage.getItem('premiumSender') ||
    window.localStorage.getItem('rocketSender') ||
    window.localStorage.getItem('easySender') ||
    window.localStorage.getItem('bulkSender')
  )
}
