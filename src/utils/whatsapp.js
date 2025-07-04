export function isMatchWhatsAppURL(url) {
  const urlRE = /https?:\/\/web\.whatsapp\.com.*/
  return typeof url === 'string' && urlRE.test(url)
}
