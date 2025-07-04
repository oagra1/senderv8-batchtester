// 测试环境的中台官方解释，记录于23.2.21乔明飞和林克，其中wasender_jc5e6n5qh7和wasender_h4phfw705b没有区别
// wasender_au0p6asjpn 一美元单次
// wasender_jc5e6n5qh7 一美元订阅/天
// wasender_bqk9y08kk0  20美元订阅/月
// wasender_h4phfw705b 1美元订阅/天

// const $1_7Days_Pro = 'wasender_au0p6asjpn'
// const $9_30Days_Pro = 'wasender_jc5e6n5qh7'
// const $20_30Days_Pro = 'wasender_bqk9y08kk0'
//
// const PAY_TYPE_DICT = {
//     // 1美元
//     'wasender_au0p6asjpn' : {
//         'pricing_url': 'https://scrm-global.zingfront.com/sender/wapi_sender/test/pricing_temporary.html',
//         'permissionPopupRecommendText': `<span style="color: #DE1313;font-size: 20px">Limited Time Offer: <span style="color: #F0A00A;font-weight: bold">$1</span> for 3 Days Pro Trial!</span>`,
//         'permissionText': 'Pro'
//     },
//     // 9美元
//     'wasender_jc5e6n5qh7' : {
//         'pricing_url': 'https://scrm-global.zingfront.com/sender/wapi_sender/test/pricing_9%24.html',
//         'permissionPopupRecommendText': `<span style="color: #DE1313;font-size: 15px">You Increase Efficiency over <span style="color: #F0A00A;font-weight: bold">80%</span> within Pro Permission!</span>`,
//         'permissionText': 'Pro'
//     }
// }
//
// const PAY_TYPE_DEFAULT = {
//     'pricing_url': 'https://scrm-global.zingfront.com/sender/wapi_sender/test/pricing_9%24.html',
//     'permissionPopupRecommendText': `You Increase Efficiency over <span style="color: #F0A00A;font-weight: bold">80%</span> within Pro Permission!`,
//     'permissionText': 'FREE'
// }

const $1_7Days_Pro = 'plink_1MNCsxBNqRnfJH4PP4ULmogk'
const $9_30Days_Pro = 'plink_1MNCsaBNqRnfJH4PSdygnOwA'
const $20_30Days_Pro = 'plink_1MNCrsBNqRnfJH4PBxqdWfBJ'

const PAY_TYPE_DICT = {
  // 1美元
  plink_1MNCsxBNqRnfJH4PP4ULmogk: {
    // todo 区分环境
    // 'pricing_url': 'http://localhost:5500/wapi-pay/pricing_temporary.html',
    pricing_url: 'https://scrm-global.zingfront.com/sender/wapi_sender/pricing_temporary.html',
    permissionPopupRecommendText: `<span style="color: #DE1313;font-size: 20px">Limited Time Offer: <span style="color: #F0A00A;font-weight: bold">$1</span> for 3 Days Pro Trial!</span>`,
    permissionText: 'Pro'
  },
  // 9美元
  plink_1MNCsaBNqRnfJH4PSdygnOwA: {
    // 'pricing_url': 'http://localhost:5500/wapi-pay/pricing_9%24.html',
    pricing_url: 'https://scrm-global.zingfront.com/sender/wapi_sender/pricing_9%24.html',
    permissionPopupRecommendText: `<span style="color: #DE1313;font-size: 15px">You Increase Efficiency over <span style="color: #F0A00A;font-weight: bold">80%</span> within Pro Permission!</span>`,
    permissionText: 'Pro'
  }
}

const PAY_TYPE_DEFAULT = {
  // 'pricing_url': 'http://localhost:5500/wapi-pay/pricing_9%24.html',
  pricing_url: 'https://scrm-global.zingfront.com/sender/wapi_sender/pricing_9%24.html',
  permissionPopupRecommendText: `You Increase Efficiency over <span style="color: #F0A00A;font-weight: bold">80%</span> within Pro Permission!`,
  permissionText: 'FREE'
}
const PRICING_PRO_PLAN_URL =
  'https://scrm-global.zingfront.com/sender/wapi_sender/pricing_pro_plan.html'
export {
  PAY_TYPE_DICT,
  PAY_TYPE_DEFAULT,
  $1_7Days_Pro,
  $9_30Days_Pro,
  $20_30Days_Pro,
  PRICING_PRO_PLAN_URL
}
