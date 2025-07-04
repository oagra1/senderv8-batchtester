function phoneNumNormal(This) {
  let remindBorder = document.querySelector(
    '.textareaBack.el-input.el-input--medium.el-input--suffix>.el-input__inner'
  )
  This.remindTitle = 'normal'
  remindBorder.style.borderColor = 'rgb(220, 223, 230)'
  chrome.storage.local.set({ remindTitle: 'normal' })
}

function phoneNumNormalPro(This) {
  let remindBorder = document.querySelector(
    '.textareaBackPro.el-input.el-input--medium.el-input--suffix>.el-input__inner'
  )
  This.remindTitlePro = 'normal'
  remindBorder.style.borderColor = 'rgb(220, 223, 230)'
  chrome.storage.local.set({ remindTitlePro: 'normal' })
}

function phoneNumContentCheck(value, This) {
  let remindBorder = document.querySelector(
    '.textareaBack.el-input.el-input--medium.el-input--suffix>.el-input__inner'
  )
  if (!value) {
    This.remindTitle = 'contentCheck'
    remindBorder.style.borderColor = 'rgba(255, 5, 5, 100)'
    chrome.storage.local.set({ remindTitle: 'contentCheck' })
  }
}

//校验输入框电话号码格式
function phoneNumFormatCheck(value, This) {
  This.incorrectPhoneNumArr = []
  This.contentArr = []
  let remindBorder = document.querySelector(
    '.textareaBack.el-input.el-input--medium.el-input--suffix>.el-input__inner'
  )
  let phoneValue = value.replace(/，/g, ',')
  This.contentArr = phoneValue.split(',')
  This.contentArr = This.contentArr.filter((item) => item != '')
  This.contentArr.forEach((phone) => {
    let regReslut = phone.replace(/[^0-9,+,(), ,-]/, '*')
    let checkResult = regReslut.includes('*')
    if (checkResult) {
      This.incorrectPhoneNumArr.push(phone)
    }
  })
  if (This.incorrectPhoneNumArr.length > 0) {
    This.remindTitle = 'formatCheck'
    This.incorrectPhoneNum = This.incorrectPhoneNumArr[0]
    remindBorder.style.borderColor = 'rgba(255, 5, 5, 100)'
    chrome.storage.local.set({
      remindTitle: 'formatCheck',
      incorrectPhoneNum: This.incorrectPhoneNumArr[0]
    })
  }
}

function phoneNumFormatCheckPro(value, This) {
  This.incorrectPhoneNumArrPro = []
  This.contentArrPro = []
  let remindBorder = document.querySelector(
    '.textareaBackPro.el-input.el-input--medium.el-input--suffix>.el-input__inner'
  )
  let phoneValue = value.replace(/，/g, ',')
  This.contentArrPro = phoneValue.split(',')
  This.contentArrPro = This.contentArrPro.filter((item) => item != '')
  This.inputPhoneNum = This.contentArrPro.length
  chrome.storage.local.set({
    inputPhoneNum: This.inputPhoneNum
  })
  This.contentArrPro.forEach((phone) => {
    let regReslut = phone.replace(/[^0-9,+,(), ,-]/, '*')
    let checkResult = regReslut.includes('*')
    if (checkResult) {
      This.incorrectPhoneNumArrPro.push(phone)
    }
    if (This.incorrectPhoneNumArrPro.length > 0) {
      This.remindTitlePro = 'formatCheck'
      This.inputPhoneNum = 0
      This.incorrectPhoneNumPro = This.incorrectPhoneNumArrPro[0]
      remindBorder.style.borderColor = 'rgba(255, 5, 5, 100)'
      chrome.storage.local.set({
        remindTitlePro: 'formatCheck',
        incorrectPhoneNumPro: This.incorrectPhoneNumArrPro[0],
        inputPhoneNum: 0
      })
    }
  })
}

export {
  phoneNumContentCheck,
  phoneNumFormatCheck,
  phoneNumNormal,
  phoneNumNormalPro,
  phoneNumFormatCheckPro
}
