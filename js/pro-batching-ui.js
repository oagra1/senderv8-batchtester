// Simple UI to configure batching for Pro users
(function () {
  const STORAGE_KEYS = {
    pause: 'batchPauseSeconds',
    every: 'batchEveryMessages',
  }

  const DEFAULT_PAUSE = 240
  const DEFAULT_EVERY = 80

  const clamp = (val, max, def) => {
    val = parseInt(val, 10)
    if (isNaN(val)) return def
    if (val < 1) return 1
    if (val > max) return max
    return val
  }

  let currentPause = DEFAULT_PAUSE
  let currentEvery = DEFAULT_EVERY

  let pauseInput
  let everyInput

  function applyValues() {
    if (pauseInput) pauseInput.value = currentPause
    if (everyInput) everyInput.value = currentEvery
  }

  function loadValues(cb) {
    try {
      chrome.storage.local.get(
        [STORAGE_KEYS.pause, STORAGE_KEYS.every],
        (res) => {
          currentPause = clamp(res[STORAGE_KEYS.pause], 300, DEFAULT_PAUSE)
          currentEvery = clamp(res[STORAGE_KEYS.every], 100, DEFAULT_EVERY)
          applyValues()
          cb && cb()
        }
      )
    } catch (e) {
      cb && cb()
    }
  }

  function saveValues() {
    const data = {}
    data[STORAGE_KEYS.pause] = currentPause
    data[STORAGE_KEYS.every] = currentEvery
    try {
      chrome.storage.local.set(data)
    } catch (e) {}
  }

  function onChange() {
    currentPause = clamp(pauseInput.value, 300, DEFAULT_PAUSE)
    currentEvery = clamp(everyInput.value, 100, DEFAULT_EVERY)
    saveValues()
  }

  function createUI(anchor) {
    const container = document.createElement('div')
    container.className = 'pro-batching-ui'
    container.style.marginTop = '8px'

    const everyLabel = document.createElement('label')
    everyLabel.textContent = 'Pausar a cada:'
    everyLabel.style.marginRight = '4px'

    everyInput = document.createElement('input')
    everyInput.type = 'number'
    everyInput.min = '1'
    everyInput.max = '100'
    everyInput.step = '1'
    everyInput.style.width = '80px'
    everyInput.style.marginRight = '4px'
    everyInput.value = currentEvery

    const everySuffix = document.createElement('span')
    everySuffix.textContent = 'mensagens'
    everySuffix.style.marginRight = '12px'

    const pauseLabel = document.createElement('label')
    pauseLabel.textContent = 'Tempo de pausa:'
    pauseLabel.style.marginRight = '4px'

    pauseInput = document.createElement('input')
    pauseInput.type = 'number'
    pauseInput.min = '1'
    pauseInput.max = '300'
    pauseInput.step = '1'
    pauseInput.style.width = '80px'
    pauseInput.style.marginRight = '4px'
    pauseInput.value = currentPause

    const pauseSuffix = document.createElement('span')
    pauseSuffix.textContent = 'segundos'

    everyInput.addEventListener('change', onChange)
    pauseInput.addEventListener('change', onChange)

    container.appendChild(everyLabel)
    container.appendChild(everyInput)
    container.appendChild(everySuffix)
    container.appendChild(pauseLabel)
    container.appendChild(pauseInput)
    container.appendChild(pauseSuffix)

    anchor.insertAdjacentElement('afterend', container)
  }

  function tryInject() {
    const anchor = document.querySelector(
      '.send-step.send-step-2.switchBack .el-row'
    )
    if (anchor && !document.querySelector('.pro-batching-ui')) {
      createUI(anchor)
      return true
    }
    return false
  }

  const app = document.getElementById('app')
  if (app) {
    const observer = new MutationObserver(() => {
      if (tryInject()) observer.disconnect()
    })
    observer.observe(app, { childList: true, subtree: true })
    tryInject()
  }

  loadValues()
})()

