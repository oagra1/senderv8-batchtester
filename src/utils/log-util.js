// 数组操作
import SlsWebLogger from 'js-sls-logger-v3'
import { LOGSTORE } from '@/utils/extension-util'
import { EVENT_MAPPING } from '@/const/contant-log.js'
const loggerFeatureId = {
  SEND_MESSAGE: 1,
  SEND_MESSAGE_PRO: 2,
  GROUP_EXPORT: 3,
  STATISTICS: 4,
  PERMISSION: 8,
  SEND_SCHEDULE_MESSAGE: 10,
  ACCOUNT_DETECTION_ONE: 11,
  ACCOUNT_DETECTION_BATCH: 12,
  ACCOUNT_DETECTION_EXPORT: 13,
  AUTO_REPLY_MESSAGE: 14
}
function sendLog(eventType, otherParams) {
  let newEventType = rebuildEventType(eventType)
  chrome.runtime
    .sendMessage({ type: 'log', eventType: newEventType, otherParams: otherParams })
    .then((r) => {})
}
function rebuildEventType(eventType) {
  try {
    return Number('90' + eventType.toString().slice(2))
  } catch (e) {
    return eventType
  }
}
const opts = {
  host: 'us-west-1.log.aliyuncs.com',
  project: 'extension-us',
  time: 0.05,
  count: 1,
  // 测试
  // logstore: 'scrm-user-test'
  // 生产
  logstore: LOGSTORE
}
const logger = new SlsWebLogger(opts)
function dealLog(data) {
  let eventType = data.eventType
  let otherParams = data.otherParams
  // 从local Storage获取用户基本信息，经过简单处理确定sendData
  chrome.storage.local.get(
    [
      'browserInfo',
      'platform',
      'installTime',
      'userPhoneNum',
      'firstSendTime',
      'uuid',
      'version',
      'language'
    ],
    function (res) {
      let browserInfo = res.browserInfo !== undefined ? res.browserInfo : ''
      let user_agent = browserInfo ? browserInfo.userAgent : ''
      let browser_type = browserInfo ? browserInfo.browser : ''
      let platform = res.platform !== undefined ? res.platform : ''
      let installTime = res.installTime !== undefined ? res.installTime : ''
      let phoneNum = res.userPhoneNum
      let firstSendTime = res.firstSendTime !== undefined ? res.firstSendTime : ''
      let uuid = res.uuid !== undefined ? res.uuid : ''
      let version = res.version !== undefined ? res.version : ''
      let language = res.language !== undefined ? res.language : ''
      let version_current = chrome.runtime.getManifest().version
      let eventTypeDesc = eventType === undefined ? null : EVENT_MAPPING[eventType]
      let sendData = {
        event_source: 9,
        event_type: eventType,
        event_type_desc: eventTypeDesc,
        event_time: Math.round(new Date() / 1000),
        install_time: installTime,
        s_first_send_time: firstSendTime,
        platform,
        user_agent,
        browser_type,
        uuid,
        version,
        version_current,
        language
      }
      // 如果获取到用户手机号
      if (phoneNum !== undefined) {
        let PhoneNumber = require('awesome-phonenumber')
        let c = PhoneNumber('+' + phoneNum).getRegionCode() // -> 'SE'
        let pn = new PhoneNumber(phoneNum.toString(), c)
        let region = pn.getRegionCode() ? pn.getRegionCode() : ''
        let countryCode = getCountryNameByDomain(region) ? getCountryNameByDomain(region) : ''
        sendData.s_user_phone_num = phoneNum
        sendData.s_country_code = countryCode
        chrome.storage.local.set({ phoneNum, countryCode })
      } else {
        sendData.s_user_phone_num = ''
        sendData.s_country_code = ''
      }
      // 如果有额外参数，需要修改sendData
      if (otherParams) {
        for (let key in otherParams) {
          sendData[key] = otherParams[key]
        }
      }
      // 发送阿里云日志
      logger.send(sendData)
    }
  )
}

// 通过国家缩写获取国家全称
function getCountryNameByDomain(domain) {
  if (domain) {
    try {
      domain = '.' + domain
      let jsonContent = [
        { country: 'Ascension Island', tld: '.ac' },
        { country: 'Andorra', tld: '.ad' },
        { country: 'United Arab Emirates', tld: '.ae' },
        { country: 'Afghanistan', tld: '.af' },
        { country: 'Antigua and Barbuda', tld: '.ag' },
        { country: 'Anguilla', tld: '.ai' },
        { country: 'Albania', tld: '.al' },
        { country: 'Armenia', tld: '.am' },
        { country: 'Netherlands Antilles', tld: '.an' },
        { country: 'Angola', tld: '.ao' },
        { country: 'Antarctica', tld: '.aq' },
        { country: 'Argentina', tld: '.ar' },
        { country: 'American Samoa', tld: '.as' },
        { country: 'Austria', tld: '.at' },
        { country: 'Australia', tld: '.au' },
        { country: 'Aruba', tld: '.aw' },
        { country: 'Åland', tld: '.ax' },
        { country: 'Azerbaijan', tld: '.az' },
        { country: 'Bosnia and Herzegovina', tld: '.ba' },
        { country: 'Barbados', tld: '.bb' },
        { country: 'Bangladesh', tld: '.bd' },
        { country: 'Belgium', tld: '.be' },
        { country: 'Burkina Faso', tld: '.bf' },
        { country: 'Bulgaria', tld: '.bg' },
        { country: 'Bahrain', tld: '.bh' },
        { country: 'Burundi', tld: '.bi' },
        { country: 'Benin', tld: '.bj' },
        { country: 'Bermuda', tld: '.bm' },
        { country: 'Brunei', tld: '.bn' },
        { country: 'Bolivia', tld: '.bo' },
        { country: 'Bonaire', tld: '.bq' },
        { country: 'Brazil', tld: '.br' },
        { country: 'Bahamas', tld: '.bs' },
        { country: 'Bhutan', tld: '.bt' },
        { country: 'Bouvet Island', tld: '.bv' },
        { country: 'Botswana', tld: '.bw' },
        { country: 'Belarus', tld: '.by' },
        { country: 'Belize', tld: '.bz' },
        { country: 'Brittany', tld: '.bzh' },
        { country: 'Canada', tld: '.ca' },
        { country: 'Cocos (Keeling) Islands', tld: '.cc' },
        { country: 'Democratic Republic of the Congo', tld: '.cd' },
        { country: 'Central African Republic', tld: '.cf' },
        { country: 'Republic of the Congo', tld: '.cg' },
        { country: 'Switzerland  ', tld: '.ch' },
        { country: 'Ivory Coast', tld: '.ci' },
        { country: 'Cook Islands', tld: '.ck' },
        { country: 'Chile', tld: '.cl' },
        { country: 'Cameroon', tld: '.cm' },
        { country: 'China', tld: '.cn' },
        { country: 'Colombia', tld: '.co' },
        { country: 'Costa Rica', tld: '.cr' },
        { country: 'Cuba', tld: '.cu' },
        { country: 'Cape Verde', tld: '.cv' },
        { country: 'Curaçao Curaçao, West Indies', tld: '.cw' },
        { country: 'Christmas Island', tld: '.cx' },
        { country: 'Cyprus', tld: '.cy' },
        { country: 'Czech Republic', tld: '.cz' },
        { country: 'East Germany', tld: '.dd' },
        { country: 'Germany', tld: '.de' },
        { country: 'Djibouti', tld: '.dj' },
        { country: 'Denmark', tld: '.dk' },
        { country: 'Dominica', tld: '.dm' },
        { country: 'Dominican Republic', tld: '.do' },
        { country: 'Algeria', tld: '.dz' },
        { country: 'Ecuador', tld: '.ec' },
        { country: 'Estonia', tld: '.ee' },
        { country: 'Egypt', tld: '.eg' },
        { country: 'Western Sahara', tld: '.eh' },
        { country: 'Eritrea', tld: '.er' },
        { country: 'Spain', tld: '.es' },
        { country: 'Ethiopia', tld: '.et' },
        { country: 'European Union', tld: '.eu' },
        { country: 'Finland', tld: '.fi' },
        { country: 'Fiji', tld: '.fj' },
        { country: 'Falkland Islands', tld: '.fk' },
        { country: 'Federated States of Micronesia', tld: '.fm' },
        { country: 'Faroe Islands Føroyar', tld: '.fo' },
        { country: 'France', tld: '.fr' },
        { country: 'Gabon', tld: '.ga' },
        { country: 'United Kingdom', tld: '.gb' },
        { country: 'Grenada', tld: '.gd' },
        { country: 'Georgia', tld: '.ge' },
        { country: 'French Guiana  ', tld: '.gf' },
        { country: 'Guernsey  ', tld: '.gg' },
        { country: 'Ghana', tld: '.gh' },
        { country: 'Gibraltar', tld: '.gi' },
        { country: 'Greenland', tld: '.gl' },
        { country: 'The Gambia', tld: '.gm' },
        { country: 'Guinea', tld: '.gn' },
        { country: 'Guadeloupe', tld: '.gp' },
        { country: 'Equatorial Guinea  ', tld: '.gq' },
        { country: 'Greece', tld: '.gr' },
        { country: 'South Georgia and the South Sandwich Is', tld: '.gsla' },
        { country: 'Guatemala', tld: '.gt' },
        { country: 'Guam', tld: '.gu' },
        { country: 'GuineaBissau', tld: '.gw' },
        { country: 'Guyana', tld: '.gy' },
        { country: 'Hong Kong', tld: '.hk' },
        { country: 'Heard Island and McDonald Islands', tld: '.hm' },
        { country: 'Honduras', tld: '.hn' },
        { country: 'Croatia', tld: '.hr' },
        { country: 'Haiti', tld: '.ht' },
        { country: 'Hungary', tld: '.hu' },
        { country: 'Indonesia', tld: '.id' },
        { country: 'Ireland', tld: '.ie' },
        { country: 'Israel', tld: '.il' },
        { country: 'Isle of Man', tld: '.im' },
        { country: 'India', tld: '.in' },
        { country: 'British Indian Ocean Territory', tld: '.io' },
        { country: 'Iraq', tld: '.iq' },
        { country: 'Iran', tld: '.ir' },
        { country: 'Iceland', tld: '.is' },
        { country: 'Italy', tld: '.it' },
        { country: 'Jersey', tld: '.je' },
        { country: 'Jamaica', tld: '.jm' },
        { country: 'Jordan', tld: '.jo' },
        { country: 'Japan', tld: '.jp' },
        { country: 'Kenya', tld: '.ke' },
        { country: 'Kyrgyzstan', tld: '.kg' },
        { country: 'Cambodia', tld: '.kh' },
        { country: 'Kiribati', tld: '.ki' },
        { country: 'Comoros Komori', tld: '.km' },
        { country: 'Saint Kitts and Nevis', tld: '.kn' },
        { country: "Democratic People's Republic of Korea", tld: '.kp' },
        { country: 'Republic of Korea', tld: '.kr' },
        { country: 'Kurdistan', tld: '.krd' },
        { country: 'Kuwait', tld: '.kw' },
        { country: 'Cayman Islands', tld: '.ky' },
        { country: 'Kazakhstan', tld: '.kz' },
        { country: 'Laos', tld: '.la' },
        { country: 'Lebanon', tld: '.lb' },
        { country: 'Saint Lucia', tld: '.lc' },
        { country: 'Liechtenstein', tld: '.li' },
        { country: 'Sri Lanka Lanka', tld: '.lk' },
        { country: 'Liberia', tld: '.lr' },
        { country: 'Lesotho', tld: '.ls' },
        { country: 'Lithuania', tld: '.lt' },
        { country: 'Luxembourg', tld: '.lu' },
        { country: 'Latvia', tld: '.lv' },
        { country: 'Libya', tld: '.ly' },
        { country: 'Morocco', tld: '.ma' },
        { country: 'Monaco', tld: '.mc' },
        { country: 'Moldova', tld: '.md' },
        { country: 'Montenegro', tld: '.me' },
        { country: 'Madagascar', tld: '.mg' },
        { country: 'Marshall Islands', tld: '.mh' },
        { country: 'Macedonia', tld: '.mk' },
        { country: 'Mali', tld: '.ml' },
        { country: 'Myanmar', tld: '.mm' },
        { country: 'Mongolia', tld: '.mn' },
        { country: 'Macau', tld: '.mo' },
        { country: 'Northern Mariana Islands', tld: '.mp' },
        { country: 'Martinique', tld: '.mq' },
        { country: 'Mauritania', tld: '.mr' },
        { country: 'Montserrat', tld: '.ms' },
        { country: 'Malta', tld: '.mt' },
        { country: 'Mauritius', tld: '.mu' },
        { country: 'Maldives', tld: '.mv' },
        { country: 'Malawi', tld: '.mw' },
        { country: 'Mexico', tld: '.mx' },
        { country: 'Malaysia', tld: '.my' },
        { country: 'Mozambique', tld: '.mz' },
        { country: 'Namibia', tld: '.na' },
        { country: 'New Caledonia', tld: '.nc' },
        { country: 'Niger', tld: '.ne' },
        { country: 'Norfolk Island', tld: '.nf' },
        { country: 'Nigeria', tld: '.ng' },
        { country: 'Nicaragua', tld: '.ni' },
        { country: 'Netherlands  ', tld: '.nl' },
        { country: 'Norway', tld: '.no' },
        { country: 'Nepal', tld: '.np' },
        { country: 'Nauru', tld: '.nr' },
        { country: 'Niue', tld: '.nu' },
        { country: 'New Zealand', tld: '.nz' },
        { country: 'Oman', tld: '.om' },
        { country: 'Panama', tld: '.pa' },
        { country: 'Peru', tld: '.pe' },
        { country: 'French Polynesia  ', tld: '.pf' },
        { country: 'Papua New Guinea', tld: '.pg' },
        { country: 'Philippines', tld: '.ph' },
        { country: 'Pakistan', tld: '.pk' },
        { country: 'Poland', tld: '.pl' },
        { country: 'SaintPierre and Miquelon', tld: '.pm' },
        { country: 'Pitcairn Islands', tld: '.pn' },
        { country: 'Puerto Rico', tld: '.pr' },
        { country: 'State of Palestine', tld: '.ps' },
        { country: 'Portugal', tld: '.pt_BR' },
        { country: 'Palau Pelew', tld: '.pw' },
        { country: 'Paraguay', tld: '.py' },
        { country: 'Qatar', tld: '.qa' },
        { country: 'Réunion', tld: '.re' },
        { country: 'Romania', tld: '.ro' },
        { country: 'Serbia', tld: '.rs' },
        { country: 'Russia', tld: '.ru' },
        { country: 'Rwanda', tld: '.rw' },
        { country: 'Saudi Arabia', tld: '.sa' },
        { country: 'Solomon Islands  ', tld: '.sb' },
        { country: 'Seychelles', tld: '.sc' },
        { country: 'Sudan', tld: '.sd' },
        { country: 'Sweden', tld: '.se' },
        { country: 'Singapore', tld: '.sg' },
        { country: 'Saint Helena', tld: '.sh' },
        { country: 'Slovenia', tld: '.si' },
        { country: 'Slovakia', tld: '.sk' },
        { country: 'Sierra Leone', tld: '.sl' },
        { country: 'San Marino', tld: '.sm' },
        { country: 'Senegal', tld: '.sn' },
        { country: 'Somalia', tld: '.so' },
        { country: 'Suriname', tld: '.sr' },
        { country: 'South Sudan', tld: '.ss' },
        { country: 'São Tomé and Príncipe', tld: '.st' },
        { country: 'Soviet Union', tld: '.su' },
        { country: 'El Salvador', tld: '.sv' },
        { country: 'Sint Maarten', tld: '.sx' },
        { country: 'Syria', tld: '.sy' },
        { country: 'Swaziland', tld: '.sz' },
        { country: 'Turks and Caicos Islands', tld: '.tc' },
        { country: 'Chad', tld: '.td' },
        { country: 'French Southern and Antarctic Lands', tld: '.tf' },
        { country: 'Togo', tld: '.tg' },
        { country: 'Thailand', tld: '.th' },
        { country: 'Tajikistan', tld: '.tj' },
        { country: 'Tokelau', tld: '.tk' },
        { country: 'East Timor', tld: '.tl' },
        { country: 'Turkmenistan', tld: '.tm' },
        { country: 'Tunisia', tld: '.tn' },
        { country: 'Tonga', tld: '.to' },
        { country: 'East Timor', tld: '.tp' },
        { country: 'Turkey', tld: '.tr' },
        { country: 'Trinidad and Tobago', tld: '.tt' },
        { country: 'Tuvalu', tld: '.tv' },
        { country: 'Taiwan', tld: '.tw' },
        { country: 'Tanzania', tld: '.tz' },
        { country: 'Ukraine  ', tld: '.ua' },
        { country: 'Uganda', tld: '.ug' },
        { country: 'United Kingdom', tld: '.uk' },
        { country: 'United States of America', tld: '.us' },
        { country: 'Uruguay', tld: '.uy' },
        { country: 'Uzbekistan', tld: '.uz' },
        { country: 'Vatican City', tld: '.va' },
        { country: 'Saint Vincent and the Grenadines', tld: '.vc' },
        { country: 'Venezuela', tld: '.ve' },
        { country: 'British Virgin Islands', tld: '.vg' },
        { country: 'United States Virgin Islands', tld: '.vi' },
        { country: 'Vietnam', tld: '.vn' },
        { country: 'Vanuatu', tld: '.vu' },
        { country: 'Wallis and Futuna', tld: '.wf' },
        { country: 'Samoa', tld: '.ws' },
        { country: 'Yemen', tld: '.ye' },
        { country: 'Mayotte', tld: '.yt' },
        { country: 'SFR Yugoslavia', tld: '.yu' },
        { country: 'South Africa', tld: '.za' },
        { country: 'Zambia', tld: '.zm' },
        { country: 'Zaire', tld: '.zr' },
        { country: 'Zimbabwe', tld: '.zw' }
      ]
      for (let key in jsonContent) {
        if (domain.toLowerCase() === jsonContent[key].tld.toLowerCase()) {
          return jsonContent[key].country
        }
      }
    } catch (e) {
      return ''
    }
  } else {
    return ''
  }
}

export { sendLog, dealLog, loggerFeatureId }
