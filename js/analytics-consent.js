(function () {
  "use strict";

  const loader = document.currentScript;
  if (!loader) return;

  const measurementId = loader.dataset.gaId;
  const privacyUrl = loader.dataset.privacyUrl || "privacy.html";
  const storageKey = "hello-world:analytics-consent";
  const granted = "granted";
  const denied = "denied";

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = new URL("../css/privacy-consent.css", loader.src).href;
  document.head.appendChild(stylesheet);

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function () {
      window.dataLayer.push(arguments);
    };

  window.gtag("consent", "default", {
    analytics_storage: denied,
    ad_storage: denied,
    ad_user_data: denied,
    ad_personalization: denied,
  });

  function readChoice() {
    try {
      const choice = window.localStorage.getItem(storageKey);
      if (choice === granted || choice === denied) return choice;

      if (choice !== null) window.localStorage.removeItem(storageKey);
      return null;
    } catch (_error) {
      return null;
    }
  }

  function saveChoice(choice) {
    try {
      window.localStorage.setItem(storageKey, choice);
    } catch (_error) {
      // The current choice still applies for this page view.
    }
  }

  function analyticsIsLoaded() {
    return Boolean(document.querySelector("script[data-google-analytics]"));
  }

  function loadAnalytics() {
    if (!measurementId || analyticsIsLoaded()) return;

    window.gtag("consent", "update", {
      analytics_storage: granted,
      ad_storage: denied,
      ad_user_data: denied,
      ad_personalization: denied,
    });
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { cookie_path: "/" });

    const script = document.createElement("script");
    script.async = true;
    script.dataset.googleAnalytics = "true";
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }

  function cookiePaths() {
    const paths = new Set(["/"]);
    let path = "";

    for (const segment of window.location.pathname.split("/").filter(Boolean)) {
      path += `/${segment}`;
      paths.add(path);
      paths.add(`${path}/`);
    }

    return paths;
  }

  function cookieDomains() {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      return [];
    }

    const labels = hostname.split(".");
    return labels.slice(0, -1).map((_, index) => labels.slice(index).join("."));
  }

  function removeAnalyticsCookies() {
    const cookieNames = document.cookie
      .split(";")
      .map((cookie) => cookie.trim().split("=")[0])
      .filter((name) => name === "_ga" || name.startsWith("_ga_"));

    for (const name of cookieNames) {
      for (const path of cookiePaths()) {
        document.cookie = `${name}=; Max-Age=0; Path=${path}; SameSite=Lax`;
        for (const domain of cookieDomains()) {
          document.cookie = `${name}=; Max-Age=0; Path=${path}; Domain=${domain}; SameSite=Lax`;
        }
      }
    }
  }

  function emitChange(choice) {
    window.dispatchEvent(
      new CustomEvent("analytics-consent-changed", { detail: { choice } }),
    );
  }

  function buildControls() {
    const panel = document.createElement("section");
    panel.className = "privacy-panel";
    panel.id = "privacy-panel";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-labelledby", "privacy-panel-title");
    panel.innerHTML = `
      <div class="privacy-panel__content">
        <h2 id="privacy-panel-title">Optional analytics</h2>
        <p>
          Optional analytics helps me understand how the site is used. Ads and
          personalization stay off. <a href="${privacyUrl}">Privacy details</a>.
        </p>
      </div>
      <div class="privacy-panel__actions">
        <button type="button" data-consent="deny">Decline</button>
        <button class="privacy-panel__accept" type="button" data-consent="grant">
          Allow analytics
        </button>
      </div>
    `;

    function closePanel() {
      panel.hidden = true;
    }

    panel.addEventListener("click", (event) => {
      const button = event.target.closest("[data-consent]");
      if (!button) return;

      const choice = button.dataset.consent === "grant" ? granted : denied;
      const wasLoaded = analyticsIsLoaded();
      saveChoice(choice);

      if (choice === granted) {
        loadAnalytics();
        closePanel();
      } else {
        window.gtag("consent", "update", {
          analytics_storage: denied,
          ad_storage: denied,
          ad_user_data: denied,
          ad_personalization: denied,
        });
        removeAnalyticsCookies();
        closePanel();

        if (wasLoaded) {
          window.setTimeout(() => window.location.reload(), 100);
        }
      }

      emitChange(choice);
    });

    panel.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && readChoice()) {
        closePanel();
      }
    });

    const choice = readChoice();
    panel.hidden = Boolean(choice);
    document.body.append(panel);
  }

  if (readChoice() === granted) loadAnalytics();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildControls, { once: true });
  } else {
    buildControls();
  }
})();
