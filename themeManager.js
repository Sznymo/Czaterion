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
  function applyStretchMsgWindow(enabled) {
    const el = document.querySelector(".no-mobile div#m-tab-main-container-1");
    if (el) {
      el.style.height = enabled ? "100%" : "";
    }
  }

  function updateFavicon(theme, themePath) {
    document.querySelectorAll('link[rel="icon"]').forEach(icon => icon.remove());

    const sizes = ["32x32", "16x16"];
    sizes.forEach(size => {
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      link.sizes = size;
      link.href = theme === "origin"
        ? `/favicon-${size}.png?v=1`
        : chrome.runtime.getURL(`${themePath}favicon-${size}.webp`);
      document.head.appendChild(link);
    });
  }

  function applyTheme(theme, stretchEnabled, avatarSet) {
    const themePath = `themes/${theme}/`;

    // Usuń poprzedni styl
    document.querySelector("link[data-theme]")?.remove();

    if (theme === "origin") {
      document.querySelectorAll(".floatbox-box-background").forEach(el => el.style = "");
    } else {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = chrome.runtime.getURL(`${themePath}${theme}.css`);
      link.dataset.theme = "active";
      document.head.appendChild(link);

      document.querySelectorAll(".floatbox-box-background").forEach(el => {
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.position = "fixed";
        el.style.top = "0";
        el.style.left = "0";
        el.style.zIndex = "-1";
        el.style.backgroundSize = "cover";
        el.style.backgroundRepeat = "no-repeat";
        el.style.backgroundImage = `url(${chrome.runtime.getURL(themePath + 'background.webp')})`;
        el.style.backgroundColor = "#0D3DAB";
      });
    }

    updateFavicon(theme, themePath);

    document.querySelector("#mainHeader")?.style.setProperty("height", "max-content");

    applyStretchMsgWindow(stretchEnabled);

    if (typeof window.replaceAvatars === "function") {
      window.replaceAvatars(avatarSet);
    }
  }

  // ✅ Inicjalizacja z chrome.storage
  chrome.storage.local.get(["theme", "stretchMsgWindow", "avatars"], data => {
    applyTheme(data.theme || "origin", data.stretchMsgWindow || false, data.avatars || "origin");
  });

  // 🔁 Obsługa zmian dynamicznych
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;

    chrome.storage.local.get(["theme", "stretchMsgWindow", "avatars"], data => {
      const theme = changes.theme ? changes.theme.newValue : data.theme || "origin";
      const stretch = changes.stretchMsgWindow ? changes.stretchMsgWindow.newValue : data.stretchMsgWindow || false;
      const avatars = changes.avatars ? changes.avatars.newValue : data.avatars || "origin";

      applyTheme(theme, stretch, avatars);
    });
  });
})();
