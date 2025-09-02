// Runtime injection for Pro batching UI and payload bridging
(function () {
  const STORAGE_KEYS = {
    enabled: 'isBatchingEnabled',
    pause: 'batchPauseSeconds',
    every: 'batchEveryMessages',
  };

  const clamp = (val, max, def) => {
    val = parseInt(val, 10);
    if (isNaN(val)) return def;
    if (val < 1) return 1;
    if (val > max) return max;
    return val;
  };

  const DEFAULT_PAUSE = 30;
  const DEFAULT_EVERY = 10;

  let currentEnabled = false;
  let currentPause = DEFAULT_PAUSE;
  let currentEvery = DEFAULT_EVERY;

  console.debug('[pro-batching-ui] boot');

  function applyValuesToInputs() {
    const container = document.querySelector('.pro-batching-ui');
    if (!container) return;
    const toggle = container.querySelector('input[type="checkbox"]');
    const numbers = container.querySelectorAll('input[type="number"]');
    if (toggle) toggle.checked = currentEnabled;
    if (numbers[0]) numbers[0].value = currentPause;
    if (numbers[1]) numbers[1].value = currentEvery;
    numbers.forEach((el) => (el.disabled = !currentEnabled));
  }

  function loadValues(cb) {
    try {
      chrome.storage.local.get(
        [STORAGE_KEYS.enabled, STORAGE_KEYS.pause, STORAGE_KEYS.every],
        (res) => {
          currentEnabled = Boolean(res[STORAGE_KEYS.enabled]);
          currentPause = clamp(res[STORAGE_KEYS.pause], 300, DEFAULT_PAUSE);
          currentEvery = clamp(res[STORAGE_KEYS.every], 100, DEFAULT_EVERY);
          console.debug(
            '[pro-batching-ui] values loaded',
            currentEnabled,
            currentPause,
            currentEvery
          );
        applyValuesToInputs();
        cb && cb();
        }
      );
    } catch (e) {
      cb && cb();
    }
  }

  function saveValues() {
    const data = {};
    data[STORAGE_KEYS.enabled] = currentEnabled;
    data[STORAGE_KEYS.pause] = currentPause;
    data[STORAGE_KEYS.every] = currentEvery;
    try {
      chrome.storage.local.set(data);
    } catch (e) {}
  }

  function setValues(pause, every) {
    currentPause = clamp(pause, 300, DEFAULT_PAUSE);
    currentEvery = clamp(every, 100, DEFAULT_EVERY);
    saveValues();
    applyValuesToInputs();
  }

  function setEnabled(enabled) {
    currentEnabled = Boolean(enabled);
    saveValues();
    applyValuesToInputs();
  }

  // Patch sendMessage at boot
  if (chrome.runtime && chrome.runtime.sendMessage) {
    const original = chrome.runtime.sendMessage.bind(chrome.runtime);
    chrome.runtime.sendMessage = function (...args) {
      try {
        const msg = args[0];
        const enabled = currentEnabled;
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
            if (obj.isBatchingEnabled === undefined) obj.isBatchingEnabled = enabled;
            if (obj.batchPauseSeconds === undefined) obj.batchPauseSeconds = pause;
            if (obj.batchEveryMessages === undefined) obj.batchEveryMessages = every;
            console.debug(
              '[pro-batching-ui] payload extended',
              enabled,
              pause,
              every
            );
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

    const toggleLabel = document.createElement('label');
    toggleLabel.textContent = 'Batching Pro';
    toggleLabel.style.marginRight = '4px';

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.style.marginRight = '8px';
    toggleInput.checked = currentEnabled;

    const pauseLabel = document.createElement('label');
    pauseLabel.textContent = 'Pausar (segundos)';
    pauseLabel.style.marginRight = '4px';

    const pauseInput = document.createElement('input');
    pauseInput.type = 'number';
    pauseInput.min = '1';
    pauseInput.max = '300';
    pauseInput.step = '1';
    pauseInput.style.width = '80px';
    pauseInput.style.marginRight = '8px';
    pauseInput.value = currentPause;

    const everyLabel = document.createElement('label');
    everyLabel.textContent = 'A cada (mensagens)';
    everyLabel.style.marginRight = '4px';

    const everyInput = document.createElement('input');
    everyInput.type = 'number';
    everyInput.min = '1';
    everyInput.max = '100';
    everyInput.step = '1';
    everyInput.style.width = '80px';
    everyInput.value = currentEvery;

    const help = document.createElement('div');
    help.textContent = 'Pausa X segundos a cada Y mensagens (somente Pró)';
    help.style.fontSize = '12px';
    help.style.color = '#909399';
    help.style.marginTop = '4px';

    function onChange() {
      setValues(pauseInput.value, everyInput.value);
    }

    toggleInput.addEventListener('change', () => {
      setEnabled(toggleInput.checked);
    });
    pauseInput.addEventListener('change', onChange);
    everyInput.addEventListener('change', onChange);

    container.appendChild(toggleLabel);
    container.appendChild(toggleInput);
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
