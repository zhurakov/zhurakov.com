const game = document.querySelector('.game');
const player = document.querySelector('#player');
const playerFront = document.querySelector('#player-front');
const fallZone = document.querySelector('#fall-zone');
const floatZone = document.querySelector('#float-zone');
const scoreEl = document.querySelector('#score');
const scoreBlock = document.querySelector('.score-block');
const highScoreEl = document.querySelector('#high-score');
const statusEl = document.querySelector('#status');
const livesEl = document.querySelector('.lives');
const intro = document.querySelector('#intro');
const over = document.querySelector('#game-over');
const finalScore = document.querySelector('#final-score');
const shareCaption = document.querySelector('#share-caption');
const resultEyebrow = document.querySelector('#result-eyebrow');
const resultTitle = document.querySelector('#result-title');
const rankLabel = document.querySelector('#rank-label');
const startButton = document.querySelector('#start');
const restartButton = document.querySelector('#restart');
const shareButton = document.querySelector('#share');
const copyButton = document.querySelector('#copy-score');
const hearts = [...document.querySelectorAll('.lives span')];
let playerPose = 'forward';

let score = 0, lives = 3, playerX = 50, targetPlayerX = 50, speed = 0, active = false, lastTime = 0, spawnDelay = 0, streak = 0, roundId = 0, lastRank = 'INTERN', displayedLoad = 1;
let rams = [];
let highScore = Number(localStorage.getItem('ram-rush-high-score') || 0);
const keys = new Set();
highScoreEl.textContent = highScore.toString().padStart(6, '0');

function displayScore() { scoreEl.textContent = score.toString().padStart(6, '0'); }
function setPlayerX(next) { playerX = Math.max(13, Math.min(87, next)); player.style.left = `${playerX}%`; playerFront.style.left = `${playerX}%`; }
function setPlayerPose(nextPose) {
  if (nextPose === playerPose) return;
  playerPose = nextPose;
  [player, playerFront].forEach(element => {
    element.classList.remove('pose-left', 'pose-right', 'pose-forward');
    element.classList.add(`pose-${nextPose}`);
  });
}
function trackNearestRam() {
  if (!rams.length) { setPlayerPose('forward'); return; }
  const nearest = rams.reduce((leading, ram) => ram.y > leading.y ? ram : leading);
  const offset = (nearest.x + 6) - playerX;
  setPlayerPose(offset < -7 ? 'left' : offset > 7 ? 'right' : 'forward');
}
function updateHearts() { hearts.forEach((heart, index) => heart.classList.toggle('lost', index >= lives)); }
function loadLevel() { return Math.min(5, 1 + Math.floor(score / 1800)); }
function rankFor() {
  if (score >= 12000) return 'RAM LEGEND';
  if (score >= 6500) return 'SERVER HERO';
  if (score >= 2600) return 'OPERATOR';
  return 'INTERN';
}
function replayAnimation(elements, className, duration) {
  elements.forEach(element => { element.classList.remove(className); void element.offsetWidth; element.classList.add(className); });
  window.setTimeout(() => elements.forEach(element => element.classList.remove(className)), duration);
}
function catchBurst(x, y) {
  const burst = document.createElement('i'); burst.className = 'catch-burst';
  burst.style.left = `${x}%`; burst.style.top = `${y}px`; floatZone.append(burst);
  window.setTimeout(() => burst.remove(), 520);
}
function reset() {
  rams.forEach(ram => ram.el.remove()); rams = []; score = 0; lives = 3; playerX = 50; targetPlayerX = 50; speed = 0; streak = 0; spawnDelay = 1.05; displayedLoad = 1;
  player.classList.remove('catching'); playerFront.classList.remove('catching');
  setPlayerPose('forward');
  displayScore(); updateHearts(); setPlayerX(50); statusEl.textContent = 'CATCH RAM. DON’T DROP IT.'; over.hidden = true;
}
function start() {
  reset(); active = true; intro.hidden = true; lastTime = performance.now();
  const currentRound = ++roundId;
  requestAnimationFrame(now => tick(now, currentRound));
}
function createRam() {
  const level = loadLevel();
  const golden = Math.random() < .1;
  const el = document.createElement('div'); el.className = `ram${golden ? ' golden' : ''}`;
  el.innerHTML = `<img src="./assets/${golden ? 'golden-ram.png' : 'ram-module.png'}" alt="" />`;
  const x = 8 + Math.random() * 84;
  el.style.left = `${x}%`; el.style.top = '-105px';
  el.style.transform = `rotate(${(Math.random() - .5) * 18}deg)`;
  fallZone.append(el);
  rams.push({ el, x, y: -105, golden, velocity: 3 + level * .55 + Math.random() * 1.3, rotation: (Math.random() - .5) * 16 });
}
function flash(points, x, y) { const pop = document.createElement('span'); pop.className = 'float-score'; pop.textContent = `+${points}`; pop.style.left = `${x}%`; pop.style.top = `${y}px`; floatZone.append(pop); setTimeout(() => pop.remove(), 680); }
function loseRam(ram) {
  ram.el.remove(); lives--; streak = 0; updateHearts(); replayAnimation([livesEl], 'damage', 420);
  statusEl.textContent = lives ? 'WARNING: RAM DROPPED!' : 'SYSTEM CRASHED';
  if (!lives) end();
}
function catchRam(ram) {
  const level = loadLevel();
  const basePoints = ram.golden ? 500 : 100 + Math.min(streak, 8) * 25;
  const points = Math.round(basePoints * (1 + (level - 1) * .12));
  score += points; streak++; displayScore();
  setPlayerPose('forward');
  replayAnimation([player, playerFront], 'catching', 390); replayAnimation([scoreBlock], 'score-pop', 390);
  statusEl.textContent = ram.golden ? 'GOLDEN RAM ×5!' : streak > 2 ? `COMBO ×${streak}` : 'MEMORY SAVED';
  catchBurst(ram.x, ram.y); flash(ram.golden ? '500 ★' : points, ram.x, ram.y); ram.el.remove();
}
function shareText() {
  const scoreText = score.toLocaleString('en-US');
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  return `I caught ${scoreText} MB in RAM RUSH as a ${lastRank}. Can you beat me?${local ? '' : `\n${location.href}`}`;
}
function end() {
  if (!active) return;
  active = false; rams.forEach(ram => ram.el.remove()); rams = [];
  lastRank = rankFor(); finalScore.textContent = score.toString().padStart(6, '0');
  const newHighScore = score > highScore;
  resultEyebrow.textContent = `RUN COMPLETE // LOAD ${loadLevel()} REACHED`;
  resultTitle.textContent = 'SYSTEM CRASHED';
  rankLabel.textContent = `RANK // ${lastRank}`;
  shareCaption.textContent = newHighScore ? 'NEW PERSONAL BEST — CAN YOU BEAT ME?' : `${lastRank} RUN — CAN YOU BEAT ME?`;
  if (newHighScore) { highScore = score; localStorage.setItem('ram-rush-high-score', highScore); highScoreEl.textContent = highScore.toString().padStart(6, '0'); }
  setTimeout(() => { over.hidden = false; }, 300);
}
function tick(now, currentRound) {
  if (!active || currentRound !== roundId) return;
  const delta = Math.min((now - lastTime) / 16.67, 2); lastTime = now;
  const move = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
  const dash = keys.has('Space') ? 1.75 : 1;
  if (dragPointerId !== null) {
    speed = 0;
    setPlayerX(playerX + (targetPlayerX - playerX) * Math.min(1, .48 * delta));
  } else {
    speed += (move * 1.25 * dash - speed) * .2;
    setPlayerX(playerX + speed * delta);
  }
  player.classList.toggle('dashing', dash > 1 && move !== 0);
  const level = loadLevel();
  if (level !== displayedLoad) { displayedLoad = level; statusEl.textContent = `RAM LOAD ×${level}`; replayAnimation([scoreBlock], 'score-pop', 390); }
  spawnDelay -= delta / 60;
  if (spawnDelay <= 0) {
    const maxOnScreen = Math.min(5, level);
    if (rams.length < maxOnScreen) {
      createRam();
      spawnDelay = Math.max(.42, 1.85 - (level - 1) * .26) * (.82 + Math.random() * .42);
    } else {
      spawnDelay = .25;
    }
  }
  const playerBox = player.getBoundingClientRect();
  for (let i = rams.length - 1; i >= 0; i--) {
    const ram = rams[i]; ram.y += ram.velocity * delta; ram.el.style.top = `${ram.y}px`; ram.el.style.rotate = `${ram.rotation * (ram.y / 110)}deg`;
    const ramBox = ram.el.getBoundingClientRect();
    const atBox = ramBox.bottom >= playerBox.top + playerBox.height * .70 && ramBox.top <= playerBox.top + playerBox.height * .80 && ramBox.right > playerBox.left + playerBox.width * .22 && ramBox.left < playerBox.right - playerBox.width * .22;
    if (atBox) { catchRam(ram); rams.splice(i, 1); continue; }
    if (ram.y > fallZone.clientHeight + 60) { loseRam(ram); rams.splice(i, 1); }
  }
  trackNearestRam();
  requestAnimationFrame(next => tick(next, currentRound));
}
document.addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault(); keys.add(event.code); });
document.addEventListener('keyup', event => keys.delete(event.code));
let dragPointerId = null;
function setTouchTarget(event) {
  const rect = game.getBoundingClientRect();
  targetPlayerX = ((event.clientX - rect.left) / rect.width) * 100;
}
function releaseTouch(event) {
  if (event.pointerId === dragPointerId) dragPointerId = null;
}
game.addEventListener('pointerdown', event => {
  if (!active || event.target.closest('button') || !event.isPrimary) return;
  dragPointerId = event.pointerId;
  setTouchTarget(event);
  game.setPointerCapture(event.pointerId);
  event.preventDefault();
});
game.addEventListener('pointermove', event => {
  if (event.pointerId !== dragPointerId || !active) return;
  setTouchTarget(event);
  event.preventDefault();
});
game.addEventListener('pointerup', releaseTouch);
game.addEventListener('pointercancel', releaseTouch);
game.addEventListener('lostpointercapture', releaseTouch);
startButton.addEventListener('click', start); restartButton.addEventListener('click', start);
copyButton.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(shareText()); copyButton.textContent = 'COPIED!'; }
  catch { copyButton.textContent = 'COPY FAILED'; }
  window.setTimeout(() => { copyButton.textContent = 'COPY CHALLENGE'; }, 1500);
});
shareButton.addEventListener('click', () => {
  const intent = new URL('https://x.com/intent/tweet'); intent.searchParams.set('text', shareText());
  window.open(intent, '_blank', 'noopener,noreferrer');
});
