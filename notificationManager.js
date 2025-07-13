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
  let notified = {}, enabled = false, notifyMsgs = false, sound = "notification-smooth-modern-stereo-332449";
  let record = false, history = [], audioMap = {};

  const sounds = [
    "notification-smooth-modern-stereo-332449",
    "notification-1-337826",
    "bell-notification-337658"
  ];

  const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const preloadSounds = () => {
    if (!audioMap[sound]) {
      try {
        const audio = new Audio(chrome.runtime.getURL(`sounds/${sound}.webm`));
        audio.volume = 1.0;
        audioMap[sound] = audio;
      } catch {}
    }
  };

  const requestPermission = () => {
    if (Notification.permission !== "granted") Notification.requestPermission();
  };

  const playSound = () => {
    const audio = audioMap[sound];
    if (audio) {
      try {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } catch {}
    }
  };

  const notifyInvitation = (id, user, info) => {
    if (!enabled) return;

    if (notifyMsgs && Notification.permission === "granted") {
      new Notification(`Zaproszenie od ${user}`, { body: info });
      playSound();
    }

    notified[id] = { status: "pending", user };

    if (record) {
      const entry = { time: new Date().toLocaleTimeString(), user };
      chrome.storage.local.get("invitationHistory", ({ invitationHistory = [] }) => {
        invitationHistory.push(entry);
        if (invitationHistory.length > 25) invitationHistory.shift();
        chrome.storage.local.set({ invitationHistory });
        history = invitationHistory;
      });
    }
  };

  const checkInvitations = () => {
    document.querySelectorAll(".m-invitation").forEach(inv => {
      const id = inv.id;
      if (!notified[id]) {
        const user = inv.querySelector(".m-invitation-user")?.textContent || "Nieznany";
        const info = inv.querySelector(".m-invitation-info")?.textContent || "";
        notifyInvitation(id, user, info);
      }
    });
  };

  const debouncedCheck = debounce(checkInvitations, 300);

  const observeInvitations = () => {
    new MutationObserver(mutations => {
      let changed = false;
      mutations.forEach(({ removedNodes, addedNodes }) => {
        removedNodes.forEach(n => {
          if (n.classList?.contains("m-invitation")) {
            delete notified[n.id];
            changed = true;
          }
        });
        addedNodes.forEach(n => {
          if (n.classList?.contains("m-invitation")) changed = true;
        });
      });
      if (changed) debouncedCheck();
    }).observe(document.body, { childList: true, subtree: true });
  };

  const applySettings = data => {
    enabled = !!data.enableNotifications;
    notifyMsgs = !!data.notifyNewMessages;
    record = !!data.recordInvitations;
    sound = sounds.includes(data.notificationSound) ? data.notificationSound : sounds[0];
  };

  // 📥 Inicjalizacja przy starcie
  chrome.storage.local.get(
    ["enableNotifications", "notifyNewMessages", "notificationSound", "recordInvitations", "invitationHistory"],
    data => {
      applySettings(data);
      preloadSounds();
      history = data.invitationHistory || [];

      if (enabled) {
        requestPermission();
        observeInvitations();
      }
    }
  );

  // 🔁 Reaguj na zmiany w storage
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;

    if (changes.enableNotifications) {
      enabled = changes.enableNotifications.newValue;
      if (enabled) {
        requestPermission();
        observeInvitations();
      }
    }
    if (changes.notifyNewMessages) notifyMsgs = changes.notifyNewMessages.newValue;
    if (changes.recordInvitations) record = changes.recordInvitations.newValue;
    if (changes.notificationSound) {
      sound = changes.notificationSound.newValue;
      audioMap = {};
      preloadSounds();
    }
  });

  // 📩 Obsługa z popup lub innych komponentów rozszerzenia
  chrome.runtime.onMessage.addListener(({ option, value }) => {
    switch (option) {
      case "enableNotifications":
        enabled = value;
        if (enabled) {
          requestPermission();
          observeInvitations();
        }
        break;
      case "notifyNewMessages":
        notifyMsgs = value;
        break;
      case "recordInvitations":
        record = value;
        break;
      case "notificationSound":
        sound = value;
        audioMap = {};
        preloadSounds();
        break;
    }
  });
})();
