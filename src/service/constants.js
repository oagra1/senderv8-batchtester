// common
export const ALLOW_WINDOW_MESSAGING = 'com.whatsapp.web.zf.BulkSender'

// content-script
export const POP_TO_CONTENT_TRANSACTION_ID = 'pop=>content:transaction_id'
export const POP_TO_CONTENT_BUTTON_MESSAGE = 'pop=>content:buttonMessage'

export const INJECT_TO_CONTENT_EXPORT_GROUP_SUCCESS = 'inject=>content:exportGroupSuccess'
export const INJECT_TO_CONTENT_EXPORT_LABEL_SUCCESS = 'inject=>content:exportLabelSuccess'
export const INJECT_TO_CONTENT_CHOOSE_WARNING = 'inject=>content:chooseWarning'
export const INJECT_TO_CONTENT_SEND_GROUPS_INFOS = 'inject=>content:sendGroupsInfos'
export const INJECT_TO_CONTENT_SEND_LABELS_INFOS = 'inject=>content:sendLabelsInfos'
export const INJECT_TO_CONTENT_SEND_LABELS_META = 'inject=>content:sendLabelsMeta'
export const INJECT_TO_CONTENT_IS_BUSINESS = 'inject=>content:isBusiness'

// background
export const CONTENT_TO_BACKGROUND_Z_BASE_TYPE = 'content=>background:zbaseType'
export const CONTENT_TO_BACKGROUND_USER_PHONE_NUM = 'content=>background:userPhoneNum'
export const CONTENT_TO_BACKGROUND_INSTALL_LOG_FLAG = 'content=>background:installLogFlag'
export const CONTENT_TO_BACKGROUND_IPCONFIG = 'content=>background:setIPConfig'

export const POP_TO_BACKGROUND_URL = 'pop=>background:url'

// inject
export const CONTENT_TO_INJECT_CURRENT_CHAT = 'content=>inject:currentChat'
export const CONTENT_TO_INJECT_MEDIA_DETAIL = 'content=>inject:mediaDetail'
export const CONTENT_TO_INJECT_BUTTON_DETAIL = 'content=>inject:buttonDetail'

// pop

export const CONTENT_TO_POP_IS_SHOW_NO_ACTIVE = 'content=>pop:isShowNoActive'
export const CONTENT_TO_POP_IS_SHOW_NO_SUBSCRIPTION = 'content=>pop:isShowNoSubscription'

export const CONTENT_TO_POP_IS_ONE_NO_SUBSCRIPTION = 'content=>pop:isOneNoSubscription'
export const CONTENT_TO_POP_SHOW_SAVE_TIME_DIALOG = 'content=>pop:showSaveTimeDialog'

export const CONTENT_TO_POP_GET_PRO_PERMISSION = 'content=>pop:getProPermission'

export const POP_TO_BACKGROUND_GET_PERMISSION = 'POP_TO_BACKGROUND_GET_PERMISSION'
export const POP_TO_BACKGROUND_GET_CUSTOMERSERVICE = 'POP_TO_BACKGROUND_GET_CUSTOMERSERVICE'

/**
 * @description: 付费页面路径
 * @return {*}
 */
export const PAY_HTML_FILE_PATH_URL = 'pay/pricing_pro_plan.html'

export const EXCEL_TEMPLATE_FILE_PATH_URL = 'assets/WAPlusSenderTemplate1.xlsx'

export const BULK_SENDER_COMPLETED_COMMENT_URL =
  'https://scrm-global.zingfront.com/sender/bulk_sender/completedCommentGuide.json'
