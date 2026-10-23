const bearings = [-90, -62, -45, -30, 0, 18, 35, 62, 90];
const wheelSets = [
  [[71, 140, 11, 13], [110, 140, 11, 13], [150, 140, 11, 13]],
  [[117, 142, 8, 10], [138, 134, 7, 10], [162, 125, 7, 10]],
  [[125, 146, 7, 10], [142, 136, 7, 10], [163, 126, 7, 10]],
  [[133, 142, 7, 12], [153, 134, 7, 10], [172, 125, 6, 10]],
  [],
  [[23, 125, 3, 9], [30, 134, 3, 9], [37, 142, 3, 10]],
  [[29, 124, 7, 10], [50, 133, 7, 11], [69, 142, 7, 11]],
  [[38, 122, 9, 11], [65, 135, 10, 12], [94, 145, 11, 12]],
  [[46, 139, 12, 13], [87, 139, 12, 13], [129, 139, 12, 13]]
];
function surface() {
  const c = document.createElement("canvas");
  c.width = 200;
  c.height = 176;
  return c;
}
function robotRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  const atlas = new Image();
  atlas.src = "/images/robot-guide/robot-motion.webp";
  const poses = [], maskData = [], cache = new Map();
  let chassis;
  const wheelLayer = surface();
  const wheelContext = wheelLayer.getContext("2d");
  const ready = atlas.decode().then(() => {
    bearings.forEach((yaw, index) => {
      const base = surface(), c2 = base.getContext("2d", { willReadFrequently: true });
      c2.imageSmoothingEnabled = false;
      c2.drawImage(atlas, index * 200, 0, 200, 176, 0, 0, 200, 176);
      poses.push(base);
      const pixels2 = c2.getImageData(0, 0, 200, 176).data, mask = [];
      const wheels = wheelSets[index];
      if (wheels.length) {
        const a = wheels[0], b = wheels.at(-1), rx = (a[2] + b[2]) / 2 + 4, ry = (a[3] + b[3]) / 2 + 6, L = b[0] - a[0];
        for (let y = 98; y < 170; y++) for (let x = 5; x < 195; x++) {
          const at = (y * 200 + x) * 4;
          if (pixels2[at + 3] < 100 || Math.max(pixels2[at], pixels2[at + 1], pixels2[at + 2]) > 145) continue;
          const u = x - a[0], v = y - (a[1] + (b[1] - a[1]) * u / L);
          const edge = u < 0 ? u / rx : u > L ? (u - L) / rx : 0;
          const radial = Math.hypot(edge, v / ry);
          if (radial < 0.68 || radial > 1.12) continue;
          let s;
          if (u < 0) {
            let angle = Math.atan2(v / ry, u / rx);
            if (angle < 0) angle += Math.PI * 2;
            s = 2 * L + Math.PI * ry + (angle - Math.PI / 2) * ry;
          } else if (u > L) {
            s = L + (Math.atan2(v / ry, (u - L) / rx) + Math.PI / 2) * ry;
          } else s = v < 0 ? u : L + Math.PI * ry + L - u;
          mask.push([at, s]);
        }
      }
      const strips = index === 4 ? [[17, 44, 111, 163], [158, 183, 111, 163]] : index === 5 ? [[162, 190, 109, 164]] : [];
      for (const [x0, x1, y0, y1] of strips) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const at = (y * 200 + x) * 4;
        if (pixels2[at + 3] > 140 && Math.max(pixels2[at], pixels2[at + 1], pixels2[at + 2]) < 145) mask.push([at, y * 0.83]);
      }
      maskData.push(mask);
    });
    chassis = surface();
    const c = chassis.getContext("2d");
    c.drawImage(poses[4], 0, 0);
    const pixels = c.getImageData(0, 0, 200, 176);
    for (let y = 0; y < 176; y++) for (let x = 0; x < 200; x++) if (!isBody(x, y)) pixels.data[(y * 200 + x) * 4 + 3] = 0;
    c.putImageData(pixels, 0, 0);
  });
  function isBody(x, y) {
    return y < 111 || x >= 47 && x <= 155 && y < 158;
  }
  function movingPose(index, travel) {
    const phase = (Math.floor(travel * 2) % 8 + 8) % 8, key = index * 8 + phase;
    if (cache.has(key)) return spinWheels(cache.get(key), index, travel);
    const c = surface(), out = c.getContext("2d");
    out.drawImage(poses[index], 0, 0);
    const pixels = out.getImageData(0, 0, 200, 176);
    for (const [at, s] of maskData[index]) {
      const sign = bearings[index] < 0 ? -1 : 1;
      const part = ((s - sign * phase) % 8 + 8) % 8;
      const color = part < 1.7 ? [25, 22, 27] : part < 3 ? [143, 108, 78] : part < 6.5 ? [106, 79, 57] : [64, 49, 42];
      pixels.data[at] = color[0];
      pixels.data[at + 1] = color[1];
      pixels.data[at + 2] = color[2];
    }
    out.putImageData(pixels, 0, 0);
    cache.set(key, c);
    return spinWheels(c, index, travel);
  }
  function spinWheels(base, index, travel) {
    const out = wheelContext;
    out.clearRect(0, 0, 200, 176);
    out.drawImage(base, 0, 0);
    const rolling = travel / 5.5 * (bearings[index] < 0 ? -1 : 1);
    for (const [x, y, rx, ry] of wheelSets[index]) {
      for (let spoke = 0; spoke < 3; spoke++) {
        const angle = rolling + spoke * Math.PI * 2 / 3;
        out.fillStyle = "#827e96";
        for (let r = 0.15; r < 0.55; r += 0.12) out.fillRect(Math.round(x + Math.cos(angle) * rx * r), Math.round(y + Math.sin(angle) * ry * r), 2, 2);
      }
    }
    return wheelLayer;
  }
  function draw(yaw, travel = 0, rock = 0) {
    yaw = Math.max(-90, Math.min(90, yaw));
    let i = 0;
    while (i < bearings.length - 2 && bearings[i + 1] < yaw) i++;
    const t = (yaw - bearings[i]) / (bearings[i + 1] - bearings[i]);
    ctx.clearRect(0, 0, 200, 176);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (Math.abs(rock) > 1e-3 && Math.abs(yaw) < 0.1) {
      ctx.drawImage(movingPose(4, travel), 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(chassis, 0, 0);
      ctx.restore();
      ctx.translate(100, 147);
      ctx.rotate(rock * Math.PI / 180);
      ctx.translate(-100, -147 + Math.abs(rock) * 0.2);
      ctx.drawImage(chassis, 0, 0);
    } else if (t < 0.015) {
      ctx.drawImage(movingPose(i, travel), 0, 0);
    } else if (t > 0.985) {
      ctx.drawImage(movingPose(i + 1, travel), 0, 0);
    } else {
      ctx.globalAlpha = 1 - t;
      ctx.drawImage(movingPose(i, travel), 0, 0);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = t;
      ctx.drawImage(movingPose(i + 1, travel), 0, 0);
    }
    ctx.restore();
  }
  return { ready, draw };
}
export {
  robotRenderer
};
