import messages from '@/popup/messages'
import { runtime } from 'webextension-polyfill'
import { sendLog } from '@/utils/log-util'
import { dispatchCustomEvent } from '@/utils/event-util'

const locale = (window.navigator.language === 'zh-CN' ? 'zh' : window.navigator.language) || 'en'

let langInfo = messages[locale]?.langInfo || messages['en']?.langInfo

const path = 'images/kOnzy.gif'
const url = runtime.getURL(path)
export const createPopup = () => {
  const goodDialog = `
  <div class = "bulk-sender-masking-layer">
    <div id="myModal" class="good-modal-dialog">
      <span class="modal-close" id="good-modal-close">&#10006;</span>
      <div class="modal-content-head">${langInfo.dialog.title}</div>
      <div class="modal-content">
        <div class="modal-content-txt">${langInfo.dialog.context}</div>
      </div>

      <div class="modal-buttons-next">
          <button class="confirm" id="good-confirm-now">${langInfo.dialog.finish}</button>
          <button class="go-now" id="good-go-now">${langInfo.dialog.goNow}</button>
      </div>

      <div class="modal-content-loading">
        <img class="loading-gif" src="${url}" alt="" />
        <div class="loading-txt">${langInfo.dialog.loading}</div>
      </div>
      <div class="modal-buttons">
          <button class="cancel" id="good-cancel-button">${langInfo.dialog.confirm}</button>
          <button class="confirm" id="good-confirm-button">${langInfo.dialog.sure}</button>
      </div>
    </div>
  </div>
`
  const popupContainer = document.createElement('div')
  popupContainer.innerHTML = goodDialog

  const closeButton = popupContainer.querySelector('#good-modal-close')
  const goodModalDialog = popupContainer.querySelector('.bulk-sender-masking-layer')
  const confirmButton = popupContainer.querySelector('#good-confirm-button')
  const cancelButton = popupContainer.querySelector('#good-cancel-button')

  const goodConfirmNow = popupContainer.querySelector('#good-confirm-now')

  const goodGoNow = popupContainer.querySelector('#good-go-now')

  popupContainer.querySelector('.modal-content-loading').style.display = 'none'

  goodGoNow.style.display = 'none'
  goodConfirmNow.style.display = 'none'

  closeButton.addEventListener('click', () => {
    if (goodModalDialog) {
      goodModalDialog.style.display = 'none'
      // chrome.runtime.sendMessage({
      //   action: 'sendAliYun',
      //   event: 'dialog_close'
      // })
    }
  })

  confirmButton.addEventListener('click', () => {
    window.open(
      'https://chromewebstore.google.com/detail/wa-bulk-message-sender/fhkimgpddcmnleeaicdjggpedegolbkb?utm_source=comment_guide',
      '_blank'
    )

    // closeButton.style.display = 'none'
    confirmButton.style.display = 'none'
    cancelButton.style.display = 'none'
    goodGoNow.style.display = 'block'
    goodConfirmNow.style.display = 'block'
    sendLog(900018)
    // popupContainer.querySelector('.modal-content-txt').style.display = 'none'
    // popupContainer.querySelector('.modal-content-loading').style.display = 'block'
  })
  goodGoNow.addEventListener('click', () => {
    window.open(
      'https://chromewebstore.google.com/detail/wa-bulk-message-sender/fhkimgpddcmnleeaicdjggpedegolbkb?utm_source=comment_guide',
      '_blank'
    )
    sendLog(900020)
  })
  goodConfirmNow.addEventListener('click', () => {
    closeButton.style.display = 'none'
    goodConfirmNow.style.display = 'none'
    confirmButton.style.display = 'none'
    cancelButton.style.display = 'none'
    goodGoNow.style.display = 'none'
    popupContainer.querySelector('.modal-content-txt').style.display = 'none'
    popupContainer.querySelector('.modal-content-loading').style.display = 'block'
    sendLog(900019)

    setTimeout(async () => {
      goodModalDialog.style.display = 'none'
      dispatchCustomEvent('completeComment')
    }, 10000)
  })

  cancelButton.addEventListener('click', () => {
    if (goodModalDialog) {
      goodModalDialog.style.display = 'none'
    }
  })

  document.body.appendChild(popupContainer)
}
