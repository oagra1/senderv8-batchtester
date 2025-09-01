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

  function loadValues(cb) {
    try {
      chrome.storage.local.get([STORAGE_KEYS.pause, STORAGE_KEYS.every], (res) => {
        cb({
          pause: clamp(res[STORAGE_KEYS.pause]),
          every: clamp(res[STORAGE_KEYS.every]),
        });
      });
    } catch (e) {
      cb({ pause: 0, every: 0 });
    }
  }

  function saveValues(pause, every) {
    const data = {};
    data[STORAGE_KEYS.pause] = clamp(pause);
    data[STORAGE_KEYS.every] = clamp(every);
    try {
      chrome.storage.local.set(data);
    } catch (e) {}
  }

  function smallestCommonAncestor(a, b) {
    const parents = new Set();
    for (let n = a; n; n = n.parentElement) parents.add(n);
    for (let n = b; n; n = n.parentElement) if (parents.has(n)) return n;
    return null;
  }

  function createUI(values, ancestor) {
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
    if (values.pause) pauseInput.value = values.pause;

    const everyLabel = document.createElement('label');
    everyLabel.textContent = 'a cada (mensagens)';
    everyLabel.style.marginRight = '4px';

    const everyInput = document.createElement('input');
    everyInput.type = 'number';
    everyInput.min = '1';
    everyInput.max = '86400';
    everyInput.step = '1';
    everyInput.style.width = '80px';
    if (values.every) everyInput.value = values.every;

    const help = document.createElement('div');
    help.textContent = 'Pausa X segundos a cada Y mensagens (somente Pró)';
    help.style.fontSize = '12px';
    help.style.color = '#909399';
    help.style.marginTop = '4px';

    function onChange() {
      saveValues(pauseInput.value, everyInput.value);
    }

    pauseInput.addEventListener('change', onChange);
    everyInput.addEventListener('change', onChange);

    container.appendChild(pauseLabel);
    container.appendChild(pauseInput);
    container.appendChild(everyLabel);
    container.appendChild(everyInput);
    container.appendChild(help);

    ancestor.insertAdjacentElement('afterend', container);

    return {
      getPause: () => clamp(pauseInput.value),
      getEvery: () => clamp(everyInput.value),
    };
  }

  function patchSendMessage(getters) {
    if (!chrome.runtime || !chrome.runtime.sendMessage) return;
    const original = chrome.runtime.sendMessage.bind(chrome.runtime);
    chrome.runtime.sendMessage = function (...args) {
      try {
        const msg = args[0];
        const pause = getters.getPause();
        const every = getters.getEvery();
        function inject(obj) {
          if (!obj || typeof obj !== 'object') return;
          if (
            obj.sendMessageType === 'pro' ||
            (Object.prototype.hasOwnProperty.call(obj, 'minNum') &&
              Object.prototype.hasOwnProperty.call(obj, 'maxNum'))
          ) {
            obj.batchPauseSeconds = pause;
            obj.batchEveryMessages = every;
          }
          for (const key in obj) {
            if (typeof obj[key] === 'object') inject(obj[key]);
          }
        }
        inject(msg);
      } catch (e) {}
      return original(...args);
    };
  }

  function init() {
    const intervalInputs = document.querySelectorAll('.numSelect');
    if (intervalInputs.length < 2) return false;
    const ancestor = smallestCommonAncestor(intervalInputs[0], intervalInputs[1]);
    if (!ancestor) return false;

    loadValues((values) => {
      const getters = createUI(values, ancestor);
      patchSendMessage(getters);
    });
    return true;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const timer = setInterval(() => {
      if (init()) clearInterval(timer);
    }, 500);
  });
})();

