// Runtime injection for Pro batching UI and payload bridging
(function () {
  const STORAGE_KEYS = {
    pause: 'batchPauseSeconds',
    every: 'batchEveryMessages',
  };

  const clamp = (val) => {
    val = parseInt(val, 10);
    if (isNaN(val) || val <= 0) return 0;
    if (val > 86400) return 86400;
    return val;
  };

  let currentPause = 0;
  let currentEvery = 0;

  console.debug('[pro-batching-ui] boot');

  function applyValuesToInputs() {
    const container = document.querySelector('.pro-batching-ui');
    if (!container) return;
    const inputs = container.querySelectorAll('input');
    if (inputs[0]) inputs[0].value = currentPause || '';
    if (inputs[1]) inputs[1].value = currentEvery || '';
  }

  function loadValues(cb) {
    try {
      chrome.storage.local.get([STORAGE_KEYS.pause, STORAGE_KEYS.every], (res) => {
        currentPause = clamp(res[STORAGE_KEYS.pause]);
        currentEvery = clamp(res[STORAGE_KEYS.every]);
        console.debug('[pro-batching-ui] values loaded', currentPause, currentEvery);
        applyValuesToInputs();
        cb && cb();
      });
    } catch (e) {
      cb && cb();
    }
  }

  function saveValues() {
    const data = {};
    data[STORAGE_KEYS.pause] = currentPause;
    data[STORAGE_KEYS.every] = currentEvery;
    try {
      chrome.storage.local.set(data);
    } catch (e) {}
  }

  function setValues(pause, every) {
    currentPause = clamp(pause);
    currentEvery = clamp(every);
    saveValues();
  }

  // Patch sendMessage at boot
  if (chrome.runtime && chrome.runtime.sendMessage) {
    const original = chrome.runtime.sendMessage.bind(chrome.runtime);
    chrome.runtime.sendMessage = function (...args) {
      try {
        const msg = args[0];
        const pause = currentPause;
        const every = currentEvery;
        const visited = new Set();
        const inject = (obj) => {
          if (!obj || typeof obj !== 'object' || visited.has(obj)) return;
          visited.add(obj);
          const isPro =
            obj.sendMessageType === 'pro' ||
            (Object.prototype.hasOwnProperty.call(obj, 'minNum') &&
              Object.prototype.hasOwnProperty.call(obj, 'maxNum'));
          if (isPro) {
            if (obj.batchPauseSeconds === undefined) obj.batchPauseSeconds = pause;
            if (obj.batchEveryMessages === undefined) obj.batchEveryMessages = every;
            console.debug('[pro-batching-ui] payload extended', pause, every);
          }
          for (const key in obj) {
            if (typeof obj[key] === 'object') inject(obj[key]);
          }
        };
        inject(msg);
      } catch (e) {}
      return original(...args);
    };
    console.debug('[pro-batching-ui] patch active');
  }

  function createUI(anchor) {
    const container = document.createElement('div');
    container.className = 'pro-batching-ui';
    container.style.marginTop = '8px';

    const pauseLabel = document.createElement('label');
    pauseLabel.textContent = 'Pausar (segundos)';
    pauseLabel.style.marginRight = '4px';

    const pauseInput = document.createElement('input');
    pauseInput.type = 'number';
    pauseInput.min = '1';
    pauseInput.max = '86400';
    pauseInput.step = '1';
    pauseInput.style.width = '80px';
    pauseInput.style.marginRight = '8px';
    if (currentPause) pauseInput.value = currentPause;

    const everyLabel = document.createElement('label');
    everyLabel.textContent = 'a cada (mensagens)';
    everyLabel.style.marginRight = '4px';

    const everyInput = document.createElement('input');
    everyInput.type = 'number';
    everyInput.min = '1';
    everyInput.max = '86400';
    everyInput.step = '1';
    everyInput.style.width = '80px';
    if (currentEvery) everyInput.value = currentEvery;

    const help = document.createElement('div');
    help.textContent = 'Pausa X segundos a cada Y mensagens (somente Pró)';
    help.style.fontSize = '12px';
    help.style.color = '#909399';
    help.style.marginTop = '4px';

    function onChange() {
      setValues(pauseInput.value, everyInput.value);
    }

    pauseInput.addEventListener('change', onChange);
    everyInput.addEventListener('change', onChange);

    container.appendChild(pauseLabel);
    container.appendChild(pauseInput);
    container.appendChild(everyLabel);
    container.appendChild(everyInput);
    container.appendChild(help);

    anchor.insertAdjacentElement('afterend', container);
  }

  function tryInject() {
    const anchor = document.querySelector(
      '.send-step.send-step-2.switchBack .el-row'
    );
    if (anchor && !document.querySelector('.pro-batching-ui')) {
      console.debug('[pro-batching-ui] anchor found');
      createUI(anchor);
      return true;
    }
    return false;
  }

  const app = document.getElementById('app');
  if (app) {
    const observer = new MutationObserver(() => {
      if (tryInject()) observer.disconnect();
    });
    observer.observe(app, { childList: true, subtree: true });
    // in case DOM is already ready
    tryInject();
  }

  loadValues();
})();
