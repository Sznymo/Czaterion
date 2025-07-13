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

// Domyślne ustawienia
const defaults = {
  theme: "origin",
  avatars: "origin",
  cleanupSelectors: [],
  cleanupMethod: "hide",
  stretchMsgWindow: false,
  enableNotifications: false,
  notifyNewMessages: false,
  recordInvitations: false,
  notificationSound: "notification-smooth-modern-stereo-332449",
  showPeopleNearby: false,
  enableFriendsEnemiesSystem: false,
  selectedTab: "updates",
};

// Wysyła zmianę do storage i do aktywnej karty
function send(option, value) {
  console.log("Zapisuję:", option, value);
  chrome.storage.local.set({ [option]: value }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { option, value });
    });
  });
}

// Aktualizuje listę historii zaproszeń
function updateInvitationHistoryUI() {
  chrome.storage.local.get("invitationHistory", ({ invitationHistory = [] }) => {
    const ul = document.getElementById("invitationHistoryList");
    ul.innerHTML = "";
    if (!invitationHistory.length) {
      return ul.appendChild(Object.assign(document.createElement("li"), {
        textContent: "Brak zarejestrowanych zaproszeń."
      }));
    }
    invitationHistory.slice().reverse().forEach(({ time, user }) => {
      ul.appendChild(Object.assign(document.createElement("li"), {
        textContent: `${time} – ${user}`
      }));
    });
  });
}

// Przełączanie widoku zakładek
function switchTab(tab) {
  send("selectedTab", tab);
  document.querySelectorAll(".tab-button")
    .forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
  document.querySelectorAll(".tab-content")
    .forEach(sec => sec.classList.toggle("active", sec.id === `${tab}-content`));
}

document.addEventListener("DOMContentLoaded", () => {
  // Ustaw wersję rozszerzenia z manifestu w nagłówku
  const versionSpan = document.getElementById("version");
  if (versionSpan) {
    versionSpan.textContent = `v${chrome.runtime.getManifest().version}`;
  }

  // Inicjalizacja UI na podstawie storage + defaults
  chrome.storage.local.get(Object.keys(defaults), data => {
    const settings = { ...defaults, ...data };

    // Radiogroups: theme (id) i avatars (value)
    [
      { name: "theme", match: "id" },
      { name: "avatars", match: "value" }
    ].forEach(({ name, match }) => {
      document.querySelectorAll(`input[name=${name}]`).forEach(input => {
        input.checked = input[match] === settings[name];
      });
    });

    // checkboxy pojedyncze
    ["stretchMsgWindow", "enableNotifications", "notifyNewMessages",
     "recordInvitations", "showPeopleNearby", "enableFriendsEnemiesSystem"
    ].forEach(key => {
      const el = document.getElementById(key);
      if (el) el.checked = settings[key];
    });

    // select dźwięku
    const sound = document.getElementById("notificationSound");
    if (sound) sound.value = settings.notificationSound;

    // włącz/wyłącz podopcje powiadomień przy starcie
    ["notifyNewMessages", "recordInvitations", "notificationTypes"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = !settings.enableNotifications;
    });

    // Inicjalizacja textarea czyszczenia
    const cleanupTextarea = document.getElementById('customCleanupSelectors');
    if (cleanupTextarea) {
      cleanupTextarea.value = settings.cleanupSelectors.join(', ');
    }

    // Inicjalizacja metody czyszczenia
    document.querySelectorAll('input[name="cleanupMethod"]').forEach(input => {
      input.checked = input.value === settings.cleanupMethod;
    });

    // wyświetl ostatnią zakładkę
    switchTab(settings.selectedTab);

    updateInvitationHistoryUI();
  });

  // Wspólny binding zdarzeń
  const bind = (sel, ev, fn) =>
    document.querySelectorAll(sel).forEach(el => el.addEventListener(ev, fn));

  // Funkcja do zastosowania ustawień czyszczenia
  function applyCleanupSettings() {
    const selectors = document.getElementById('customCleanupSelectors').value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    
    const method = document.querySelector('input[name="cleanupMethod"]:checked').value;
    
    send("cleanupSelectors", selectors);
    send("cleanupMethod", method);
    
    // Wizualne potwierdzenie zapisu
    const textarea = document.getElementById('customCleanupSelectors');
    textarea.classList.add('confirm-animation');
    setTimeout(() => textarea.classList.remove('confirm-animation'), 1000);
  }

  // Debounce dla częstych zmian w textarea
  let cleanupTimeout;
  function handleCleanupChange() {
    clearTimeout(cleanupTimeout);
    cleanupTimeout = setTimeout(applyCleanupSettings, 500);
  }

  // Obsługa automatycznego czyszczenia
  const cleanupTextarea = document.getElementById('customCleanupSelectors');
  if (cleanupTextarea) {
    cleanupTextarea.addEventListener('input', handleCleanupChange);
  }

  // Obsługa zmiany metody czyszczenia
  bind('input[name="cleanupMethod"]', "change", applyCleanupSettings);

  // radio: theme
  bind("input[name=theme]", "change", e => e.target.checked && send("theme", e.target.id));
  // radio: avatars
  bind("input[name=avatars]", "change", e => e.target.checked && send("avatars", e.target.value));

  // inne checkboxy
  [
    "stretchMsgWindow", "notifyNewMessages",
    "recordInvitations", "showPeopleNearby",
    "enableFriendsEnemiesSystem"
  ].forEach(id =>
    bind(`#${id}`, "change", e => send(id, e.target.checked))
  );

  // główny przełącznik powiadomień + enable/disable podopcje (bez nadpisywania checked)
  bind("#enableNotifications", "change", e => {
    const on = e.target.checked;
    send("enableNotifications", on);
    ["notifyNewMessages", "recordInvitations", "notificationTypes"]
      .forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.disabled = !on;
      });
  });

  // zmiana dźwięku
  bind("#notificationSound", "change", e => send("notificationSound", e.target.value));
  // test dźwięku
  bind("#testNotificationSound", "click", () => {
    const url = chrome.runtime.getURL(`sounds/${document.getElementById("notificationSound").value}.webm`);
    new Audio(url).play().catch(() => console.warn("Błąd odtwarzania dźwięku"));
  });
  // zakładki
  bind(".tab-button", "click", e => {
    const tab = e.currentTarget.dataset.tab;
    switchTab(tab);
    if (tab === "history") updateInvitationHistoryUI();
  });
});