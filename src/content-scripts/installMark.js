/**
 * @description
 * @file 记录用户安装或者更新后在whatsApp本地存储中添加标记
 * @author dingtao
 * @copyright WP
 * @createDate 2024-07-29
 */

/**
 * 设置用户安装标记
 */
export function installMark() {
  // const extensionList = await _getExtensionList()
  // extensionList.forEach((item) => {
  //   if (item.mask) {
  //     window.localStorage.removeItem(item.id)
  //   }
  // })
  window.localStorage.setItem('bulkSender', true)
}

async function _getExtensionList() {
  const res = await chrome.storage.local.get('zbaseConfig')
  const prams = res?.zbaseConfig?.data?.config || []
  const pram = prams.filter((item) => {
    return item.name === 'extensionList'
  })
  if (pram && pram.length !== 0) {
    return pram[0]?.params || []
  }
  return []
}
