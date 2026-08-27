(function () {
  "use strict";

  const button = document.getElementById("musicRoomToggle");
  if (!button) return;

  const meter = document.querySelector(".music-room__meter");
  const radioUrl = "https://stream.zeno.fm/0r0xa792kwzuv";
  const audio = new Audio();
  audio.preload = "none";
  let isPlaying = false;

  function render() {
    button.classList.toggle("playing", isPlaying);
    button.textContent = isPlaying ? "Pause radio" : "Play radio";
    meter?.classList.toggle("playing", isPlaying);
  }

  async function play() {
    if (audio.src !== radioUrl) {
      audio.src = radioUrl;
      audio.load();
    }

    try {
      await audio.play();
      isPlaying = true;
      render();
    } catch (_error) {
      isPlaying = false;
      render();
    }
  }

  function toggle() {
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
      render();
      return;
    }

    play();
  }

  audio.addEventListener("ended", () => {
    isPlaying = false;
    render();
  });
  audio.addEventListener("error", () => {
    isPlaying = false;
    render();
  });
  button.addEventListener("click", toggle);
  render();
})();
