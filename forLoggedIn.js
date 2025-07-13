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
  // Dodaj styl CSS tylko raz
  const style = document.createElement("style");
  style.textContent = `
    .force-show-people-nearby {
      display: block !important;
    }
  `;
  document.head.appendChild(style);

  function togglePeopleNearby(enabled) {
    const el = document.querySelector(".m-list-user-search-local");
    if (!el) return;

    if (enabled) {
      el.classList.add("force-show-people-nearby");
      el.style.removeProperty("display");
    } else {
      el.classList.remove("force-show-people-nearby");
      el.style.removeProperty("display");
    }
  }

  // 📌 Inicjalizacja przy starcie
  chrome.storage.local.get("showPeopleNearby", ({ showPeopleNearby }) => {
    togglePeopleNearby(showPeopleNearby);
  });

  // 🔄 Reaguj na zmiany w storage
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.showPeopleNearby) {
      togglePeopleNearby(changes.showPeopleNearby.newValue);
    }
  });

  // 👁️ Obserwuj DOM, jeśli element pojawi się później
  const observer = new MutationObserver(() => {
    chrome.storage.local.get("showPeopleNearby", ({ showPeopleNearby }) => {
      togglePeopleNearby(showPeopleNearby);
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
