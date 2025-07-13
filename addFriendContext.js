/**
 * Czateria Extension
 * Copyright 2025 Sznymo
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function () {
  const STORAGE_KEYS = {
    friends: 'ff_ext_znajomi',
    enemies: 'ff_ext_wrogowie',
    settingEnabled: 'enableFriendsEnemiesSystem'
  };

  const CSS_CLASSES = {
    friend: 'ff-ext-friend-highlight',
    enemy: 'ff-ext-enemy-highlight',
    style: 'ff-ext-styles'
  };

  let isEnabled = false;
  let isInitialized = false;
  let observer = null;
  let interval = null;

  let cachedData = {
    friends: [],
    enemies: []
  };

  const normalizeNick = nick => nick?.trim().toLowerCase() || '';

  const loadData = async () => {
    return new Promise(resolve => {
      chrome.storage.local.get([STORAGE_KEYS.friends, STORAGE_KEYS.enemies], result => {
        cachedData = {
          friends: result[STORAGE_KEYS.friends] || [],
          enemies: result[STORAGE_KEYS.enemies] || []
        };
        resolve();
      });
    });
  };

  const saveData = async () => {
    return new Promise(resolve => {
      chrome.storage.local.set({
        [STORAGE_KEYS.friends]: cachedData.friends,
        [STORAGE_KEYS.enemies]: cachedData.enemies
      }, resolve);
    });
  };

  const addStyles = () => {
    if (!document.querySelector(`.${CSS_CLASSES.style}`)) {
      const style = document.createElement('style');
      style.className = CSS_CLASSES.style;
      style.textContent = `
        .${CSS_CLASSES.friend} {
          background-color: rgba(0, 255, 0, 0.25) !important;
          border-left: 3px solid #0a0 !important;
          margin-left: -3px !important;
        }
        .${CSS_CLASSES.enemy} {
          background-color: rgba(255, 0, 0, 0.25) !important;
          border-left: 3px solid #a00 !important;
          margin-left: -3px !important;
        }
      `;
      document.head.appendChild(style);
    }
  };

  const removeHighlights = () => {
    document.querySelectorAll(`.${CSS_CLASSES.friend}, .${CSS_CLASSES.enemy}`).forEach(el => {
      el.classList.remove(CSS_CLASSES.friend, CSS_CLASSES.enemy);
    });
  };

  const processUserItem = item => {
    const nickElement = item.querySelector('span');
    if (!nickElement) return;

    const nick = normalizeNick(nickElement.textContent);
    if (!nick) return;

    item.classList.remove(CSS_CLASSES.friend, CSS_CLASSES.enemy);

    const isFriend = cachedData.friends.some(f => normalizeNick(f.nick) === nick);
    const isEnemy = cachedData.enemies.some(e => normalizeNick(e.nick) === nick);

    if (isFriend) item.classList.add(CSS_CLASSES.friend);
    if (isEnemy) item.classList.add(CSS_CLASSES.enemy);
  };

  const processAllUserItems = () => {
    if (!isEnabled) return;

    const items = document.querySelectorAll('.m-list-user-item');
    if (items.length === 0) {
      setTimeout(() => processAllUserItems(), 500);
      return;
    }

    items.forEach(item => processUserItem(item));
  };

  const handleUserAction = async (nick, type) => {
    const normalizedNick = normalizeNick(nick);
    if (!normalizedNick) return;

    const userItem = [...document.querySelectorAll('.m-list-user-item')]
      .find(el => normalizeNick(el.querySelector('span')?.textContent) === normalizedNick);
    const avatar = userItem?.querySelector('img')?.src;

    const newData = {
      friends: [...cachedData.friends],
      enemies: [...cachedData.enemies]
    };

    if (type === 'friend') {
      newData.enemies = newData.enemies.filter(e => normalizeNick(e.nick) !== normalizedNick);
    } else {
      newData.friends = newData.friends.filter(f => normalizeNick(f.nick) !== normalizedNick);
    }

    const targetList = type === 'friend' ? newData.friends : newData.enemies;
    const existingIndex = targetList.findIndex(u => normalizeNick(u.nick) === normalizedNick);

    if (existingIndex >= 0) {
      targetList.splice(existingIndex, 1);
    } else {
      targetList.push({ nick, avatar });
    }

    cachedData = newData;
    await saveData();
    processAllUserItems();
  };

  const handleContextMenu = menu => {
    if (!isEnabled || menu.dataset.ffExtModified) return;
    menu.dataset.ffExtModified = 'true';

    const header = menu.querySelector('.context-menu-item--header');
    const nick = header?.textContent?.trim();
    if (!nick) return;

    const normalizedNick = normalizeNick(nick);
    const isFriend = cachedData.friends.some(f => normalizeNick(f.nick) === normalizedNick);
    const isEnemy = cachedData.enemies.some(e => normalizeNick(e.nick) === normalizedNick);

    if (!isEnemy) {
      const friendBtn = document.createElement('div');
      friendBtn.className = 'context-menu-item ff-ext-context-friend';
      
      const friendIcon = document.createElement('span');
      friendIcon.className = 'ff-ext-icon';
      friendIcon.textContent = isFriend ? '❌' : '✓';
      
      const friendText = document.createElement('span');
      friendText.textContent = isFriend ? 'Usuń ze znajomych' : 'Dodaj do znajomych';
      
      friendBtn.appendChild(friendIcon);
      friendBtn.appendChild(friendText);
      
      friendBtn.onclick = async () => {
        await handleUserAction(nick, 'friend');
        menu.remove();
      };
      menu.appendChild(friendBtn);
    }

    if (!isFriend) {
      const enemyBtn = document.createElement('div');
      enemyBtn.className = 'context-menu-item ff-ext-context-enemy';
      
      const enemyIcon = document.createElement('span');
      enemyIcon.className = 'ff-ext-icon';
      enemyIcon.textContent = isEnemy ? '❌' : '⚠️';
      
      const enemyText = document.createElement('span');
      enemyText.textContent = isEnemy ? 'Usuń z wrogów' : 'Dodaj do wrogów';
      
      enemyBtn.appendChild(enemyIcon);
      enemyBtn.appendChild(enemyText);
      
      enemyBtn.onclick = async () => {
        await handleUserAction(nick, 'enemy');
        menu.remove();
      };
      menu.appendChild(enemyBtn);
    }
  };

  const startObservation = () => {
    observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList.contains('context-menu')) {
              handleContextMenu(node);
            }
            if (node.classList.contains('m-list-user-item')) {
              processUserItem(node);
            }
          }
        }
      }
      processAllUserItems();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };

  const start = async () => {
    if (isInitialized) return;

    addStyles();
    await loadData();
    startObservation();
    interval = setInterval(() => processAllUserItems(), 2000);
    processAllUserItems();

    isInitialized = true;
  };

  const stop = () => {
    if (!isInitialized) return;

    removeHighlights();

    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (interval) {
      clearInterval(interval);
      interval = null;
    }

    isInitialized = false;
  };

  // 📦 Reakcja na zmiany w storage
  chrome.storage.onChanged.addListener(changes => {
    if (STORAGE_KEYS.settingEnabled in changes) {
      const newVal = changes[STORAGE_KEYS.settingEnabled].newValue;
      const oldVal = isEnabled;
      isEnabled = !!newVal;

      if (!oldVal && isEnabled) {
        start();
      } else if (oldVal && !isEnabled) {
        stop();
      }
    }
  });

  // 🚀 Inicjalizacja
  const init = async () => {
    const { [STORAGE_KEYS.settingEnabled]: stored } = await chrome.storage.local.get(STORAGE_KEYS.settingEnabled);
    isEnabled = !!stored;

    if (isEnabled) {
      await start();
    }
  };

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();