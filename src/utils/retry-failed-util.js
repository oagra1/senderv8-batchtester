function getRetryFailedSendData(
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
) {
  return {
    phoneNumList: phoneNumList,
    phoneNumSuccessList: phoneNumSuccessList,
    phoneNumFailList: phoneNumFailList,
    repeatList: repeatList,
    oldSuccessAndFailList: oldSuccessAndFailList,
    indexCount: indexCount,
    content: content,
    mediaType: mediaType,
    minNum: minNum,
    maxNum: maxNum,
    excelData: excelData,
    sendMessageType: sendMessageType,
    allDataImg: allDataImg,
    allDataVideo: allDataVideo,
    allDataDocument: allDataDocument,
    sendButtonValue: sendButtonValue,
    buttonInputValue: buttonInputValue,
    button_radio: button_radio,
    isDeleteMessage: isDeleteMessage
  }
}

export { getRetryFailedSendData }
