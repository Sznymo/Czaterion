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

(() => {
  let avatarSet = "origin";
  let avatarObserver = null;

  function replaceAvatars(set) {
    if (!["origin", "dracula", "hd", "emotikon", "emotikon-hd"].includes(set)) return;

    const selectors = [
      ".m-usersList",
      ".m-popup-info",
      ".m-avatar-panel"
    ];

    const isOriginalAvatar = (src) => src.includes("i.iplsc.com") && src.endsWith(".png");

    const updateImg = (img) => {
      if (!isOriginalAvatar(img.src)) return;

      const name = img.src.split("/").pop();
      const baseName = name.replace(".png", ".webp");

      if (img.dataset.avatarReplaced === set) return;

      img.src = set === "origin"
        ? `https://i.iplsc.com/-/${name}`
        : chrome.runtime.getURL(`awatar/${set}/${baseName}`);

      img.dataset.avatarReplaced = set;
    };

    selectors.forEach(selector => {
      const container = document.querySelector(selector);
      if (container) {
        container.querySelectorAll("img").forEach(updateImg);
      }
    });
  }

  function setupObserver() {
    if (avatarObserver) avatarObserver.disconnect();

    if (avatarSet !== "origin") {
      avatarObserver = new MutationObserver(() => {
        replaceAvatars(avatarSet);
      });

      avatarObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  // 📌 Inicjalizacja: pobierz bieżące ustawienie
  chrome.storage.local.get("avatars", (data) => {
    avatarSet = data.avatars || "origin";
    replaceAvatars(avatarSet);
    setupObserver();
  });

  // 🔄 Reaguj na zmiany storage
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.avatars) {
      avatarSet = changes.avatars.newValue || "origin";
      replaceAvatars(avatarSet);
      setupObserver();
    }
  });
})();
