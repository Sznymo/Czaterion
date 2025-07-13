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
  let cleanupSelectors = [];
  let notificationSelectors = [];
  let cleanupMethod = "hide"; // 'hide' lub 'remove'
  let cleanupObserver = null;

  function processElements(selectors) {
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (cleanupMethod === "remove") {
          // Usuwanie elementu na stałe
          el.remove();
        } else {
          // Animowane ukrywanie (oryginalna funkcjonalność)
          if (el.style.display !== "none") {
            el.dataset.prevDisplay = el.style.display;
            el.style.transition = "opacity 0.3s ease-out";
            el.style.opacity = 0;
            setTimeout(() => {
              el.style.display = "none";
            }, 300);
          }
        }
      });
    });
  }

  function hideElements() {
    processElements(cleanupSelectors);
    processElements(notificationSelectors);
  }

  function showElements() {
    // Pokazuje tylko ukryte elementy (usunięte są już nieodwracalne)
    document.querySelectorAll("*").forEach(el => {
      if (el.dataset.prevDisplay !== undefined) {
        el.style.display = el.dataset.prevDisplay || "";
        el.style.transition = "opacity 0.3s ease-in";
        el.style.opacity = 1;
        setTimeout(() => el.style.opacity = "", 300);
        delete el.dataset.prevDisplay;
      }
    });
  }

  function applyCleanup(enable) {
    if (enable) {
      showElements(); // Najpierw przywróć ukryte elementy
      hideElements(); // Potem zastosuj nowe ustawienia
      
      if (!cleanupObserver) {
        cleanupObserver = new MutationObserver((mutations) => {
          // Obserwujemy tylko nowo dodane elementy
          mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (cleanupMethod === "remove") {
                  // Natychmiast usuń nowe elementy pasujące do selektorów
                  processElements(cleanupSelectors.concat(notificationSelectors));
                } else {
                  // Sprawdź czy nowe elementy pasują do selektorów
                  const allSelectors = cleanupSelectors.concat(notificationSelectors);
                  allSelectors.forEach(sel => {
                    if (node.matches(sel)) {
                      node.dataset.prevDisplay = node.style.display;
                      node.style.transition = "opacity 0.3s ease-out";
                      node.style.opacity = 0;
                      setTimeout(() => {
                        node.style.display = "none";
                      }, 300);
                    }
                  });
                }
              }
            });
          });
        });
        
        cleanupObserver.observe(document.body, { 
          childList: true, 
          subtree: true 
        });
      }
    } else {
      showElements();
      if (cleanupObserver) {
        cleanupObserver.disconnect();
        cleanupObserver = null;
      }
    }
  }

  // 📌 Inicjalizacja: odczytaj dane z chrome.storage
  chrome.storage.local.get(
    ["cleanupSelectors", "notificationSelectors", "cleanupMethod"], 
    data => {
      cleanupSelectors = data.cleanupSelectors || [];
      notificationSelectors = data.notificationSelectors || [];
      cleanupMethod = data.cleanupMethod || "hide";
      applyCleanup(true);
    }
  );

  // 🔄 Reakcja na zmiany w chrome.storage
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;

    if (changes.cleanupSelectors) {
      cleanupSelectors = changes.cleanupSelectors.newValue || [];
      applyCleanup(true);
    }

    if (changes.notificationSelectors) {
      notificationSelectors = changes.notificationSelectors.newValue || [];
      applyCleanup(true);
    }

    if (changes.cleanupMethod) {
      cleanupMethod = changes.cleanupMethod.newValue || "hide";
      applyCleanup(true);
    }
  });
})();