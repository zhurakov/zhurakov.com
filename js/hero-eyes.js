function animateBoy(hero, reducedMotion) {
  const source = hero.querySelector(".original-art");
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 75;
  canvas.className = "boy-eyes";
  canvas.setAttribute("aria-hidden", "true");
  hero.append(canvas);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.translate(-590, -235);
  const eyes = [
    { box: [610, 253, 65, 41], shape: [[615, 263], [670, 264], [666, 276], [657, 276], [654, 291], [626, 291], [611, 286]] },
    { box: [718, 262, 52, 36], shape: [[730, 270], [768, 273], [758, 290], [750, 297], [721, 296], [721, 282]] }
  ];
  let lastKey = "";
  let look = 0, target = 0, blinkAt = performance.now() + 2700, blinkStart = -Infinity, previous = 0;
  function polygon(points) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
  }
  function draw(close) {
    const key = Math.round(look * 7) + ":" + Math.round(close * 10);
    if (key === lastKey) return;
    lastKey = key;
    ctx.clearRect(590, 235, 200, 75);
    for (const { box: [x, y, w, h], shape } of eyes) {
      if (look < 5e-3 && close === 0) continue;
      ctx.save();
      polygon(shape);
      ctx.clip();
      ctx.fillStyle = "#e2d2cc";
      ctx.fillRect(x, y, w, h);
      const shift = Math.round(-7 * look);
      ctx.drawImage(source, x - 9, y, w + 18, h, x - 9 + shift, y, w + 18, h);
      if (close > 0) {
        const bottom = y + h * close;
        ctx.fillStyle = "#ffad78";
        ctx.fillRect(x - 2, y - 2, w + 4, bottom - y + 2);
        if (close > 0.85) {
          ctx.fillStyle = "#794c48";
          ctx.fillRect(x + 3, y + h - 6, w - 12, 3);
        }
      }
      ctx.restore();
    }
  }
  function tick(now) {
    const dt = Math.min(50, now - (previous || now));
    previous = now;
    if (!document.hidden && !reducedMotion.matches) {
      look += (target - look) * (1 - Math.exp(-dt / 180));
      if (now >= blinkAt) {
        blinkStart = now;
        blinkAt = now + 4700 + Math.random() * 2100;
      }
      const elapsed = now - blinkStart;
      const close = elapsed < 80 ? elapsed / 80 : elapsed < 170 ? 1 - (elapsed - 80) / 90 : 0;
      draw(Math.max(0, close));
    } else {
      draw(0);
    }
    requestAnimationFrame(tick);
  }
  source.decode().then(() => requestAnimationFrame(tick)).catch(() => canvas.remove());
  return {
    follow() {
      target = 1;
      blinkAt = performance.now() + 450;
    },
    settle() {
      target = 0.25;
    }
  };
}
export {
  animateBoy
};
