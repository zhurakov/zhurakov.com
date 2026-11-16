(function () {
  "use strict";

  const button = document.getElementById("musicRoomToggle");
  if (!button) return;

  const roomVideo = document.getElementById("musicRoomVideo");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function syncRoomVideo() {
    if (!roomVideo) return;
    if (reduceMotion.matches) roomVideo.pause();
    else roomVideo.play().catch(() => {});
  }

  syncRoomVideo();

  const columns = [...document.querySelectorAll(".eq-col")];
  const squaresPerColumn = 6;
  const radioUrl = "https://stream.zeno.fm/0r0xa792kwzuv";
  const audio = new Audio();
  audio.crossOrigin = "anonymous";
  audio.preload = "none";

  let isPlaying = false;
  let audioCtx = null;
  let analyser = null;
  let freq = null;
  let raf = 0;
  const levels = new Float32Array(columns.length).fill(1);

  function paint(active) {
    columns.forEach((col, i) => {
      const lit = active
        ? Math.max(1, Math.min(squaresPerColumn, Math.round(levels[i])))
        : 1;
      const squares = col.children;
      for (let s = 0; s < squares.length; s += 1) {
        squares[s].classList.toggle("is-on", s < lit);
      }
    });
  }

  function tick() {
    raf = 0;
    if (!isPlaying || !analyser) {
      paint(false);
      return;
    }

    analyser.getByteFrequencyData(freq);
    const bins = freq.length;
    const peaks = new Array(columns.length);
    let loud = 0;
    for (let i = 0; i < columns.length; i += 1) {
      const start = 1 + i * 2;
      let peak = 0;
      for (let k = start; k < Math.min(bins, start + 2); k += 1) {
        if (freq[k] > peak) peak = freq[k];
      }
      peaks[i] = peak;
      if (peak > loud) loud = peak;
    }

    const glide = reduceMotion.matches ? 1 : 0.5;
    for (let i = 0; i < columns.length; i += 1) {
      const next = loud < 8 ? 1 : 1 + (peaks[i] / loud) * (squaresPerColumn - 1);
      levels[i] += (next - levels[i]) * glide;
    }

    paint(true);
    raf = requestAnimationFrame(tick);
  }

  function render() {
    button.classList.toggle("playing", isPlaying);
    button.textContent = isPlaying ? "Pause radio" : "Play radio";
    cancelAnimationFrame(raf);
    raf = 0;
    if (!isPlaying) {
      levels.fill(1);
      paint(false);
      return;
    }
    paint(true);
    raf = requestAnimationFrame(tick);
  }

  function ensureGraph() {
    if (audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    freq = new Uint8Array(analyser.frequencyBinCount);
    const source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  async function play() {
    if (audio.src !== radioUrl) {
      audio.src = radioUrl;
      audio.load();
    }

    try {
      ensureGraph();
      if (audioCtx.state === "suspended") await audioCtx.resume();
      await audio.play();
      isPlaying = true;
      render();
    } catch (_error) {
      isPlaying = false;
      render();
    }
  }

  function stop() {
    isPlaying = false;
    render();
  }

  function toggle() {
    if (isPlaying) {
      audio.pause();
      stop();
      return;
    }

    play();
  }

  reduceMotion.addEventListener("change", () => {
    syncRoomVideo();
    render();
  });
  audio.addEventListener("ended", stop);
  audio.addEventListener("error", stop);
  button.addEventListener("click", toggle);
  render();
})();
