/********
 * @Description:
 * @Version: V1.0.0
 * @Author: ding tao kakaai77@163.com
 * @Date: 2023-12-05 17:17:24
 * @LastEditors: ding tao kakaai77@163.com
 * @LastEditTime: 2023-12-07 15:21:23
 * @FilePath: common.js
 * @Copyright 2023 Marvin, All Rights Reserved.
 * @2023-12-05 17:17:24
 */

import { dealLog } from '@/utils/log-util.js'
/******* 
 * @description: 根据IP地址获取用户信息http://ip-api.com1/json/[IP]，如果不传的情况默认取当前IP
 * @return 
 * {
    "status": "success",
    "country": "Taiwan",
    "countryCode": "TW",
    "region": "TPE",
    "regionName": "Taiwan",
    "city": "Taipei",
    "zip": "",
    "lat": 25.0329,
    "lon": 121.5654,
    "timezone": "Asia/Taipei",
    "isp": "AKILE LTD",
    "org": "AKILE LTD",
    "as": "AS61112 AKILE LTD",
    "query": "141.11.87.118"
  }
 */
async function getIpConfig() {
  try {
    let responseData = await fetch('http://ip-api.com/json', {
      method: 'GET'
    }).then((res) => {
      if (res.status !== 200) {
        dealLog({ eventType: 920014, otherParams: { url: res.url, status: res.status } })
      }
      return res.json()
    })
    return responseData
  } catch (e) {
    console.log(e)
  }
}
export { getIpConfig }
