(function () {
  "use strict";

  document.querySelectorAll("[data-support-feedback]").forEach((link) => {
    const originalLabel = link.textContent;
    let resetTimer;

    link.addEventListener("click", () => {
      window.clearTimeout(resetTimer);
      link.textContent = "Thank you ♥";
      resetTimer = window.setTimeout(() => {
        link.textContent = originalLabel;
      }, 1800);
    });
  });
})();
