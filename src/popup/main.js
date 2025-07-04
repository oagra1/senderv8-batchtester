import Vue from 'vue'
import App from './Main.vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import VueI18n from 'vue-i18n'
import { ZbaseCustomPopupDialog } from 'zbase-popup-component/src/zbase/popup/components/zbase-custom'

import { sendLog, dealLog } from '@/utils/log-util' //发送日志函数
import { checkDailySendNums } from '@/utils/daily-send-num-util'
import messages from '@/popup/messages'
import { sendMessage, onMessage } from 'webext-bridge/dist/popup'
Vue.prototype.$sendLog = sendLog
Vue.prototype.$dealLog = dealLog
Vue.prototype.$checkDailySendNums = checkDailySendNums
Vue.prototype.$bridge = { sendMessage, onMessage }
Vue.use(ElementUI)
Vue.use(VueI18n)
Vue.use(ZbaseCustomPopupDialog)

const appStart = async () => {
  let locale = window.navigator.language || 'en'
  try {
    let storeLang = await chrome.storage.local.get(['locale'])
    locale = storeLang.locale || locale
  } catch (error) {
    console.log('error', error)
  }

  const i18n = new VueI18n({
    locale: locale,
    messages
  })

  const I18nData = [
    {
      code: 'en',
      name: 'English'
    },
    {
      code: 'zh',
      name: '中文'
    },
    {
      code: 'pt',
      name: 'Português'
    },
    {
      code: 'es',
      name: 'Español'
    },
    {
      code: 'ar',
      name: 'العربية'
    }
  ]
  Vue.prototype.$I18nData = I18nData
  /* eslint-disable no-new */
  new Vue({
    i18n,
    el: '#app',
    render: (h) => h(App)
  })

}


appStart()
