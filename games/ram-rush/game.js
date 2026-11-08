const game = document.querySelector('.game');
const player = document.querySelector('#player');
const playerFront = document.querySelector('#player-front');
const fallZone = document.querySelector('#fall-zone');
const floatZone = document.querySelector('#float-zone');
const scoreEl = document.querySelector('#score');
const scoreBlock = document.querySelector('.score-block');
const leaderboardEl = document.querySelector('#leaderboard');
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
const saveCardButton = document.querySelector('#save-card');
const copyButton = document.querySelector('#copy-score');
const hearts = [...document.querySelectorAll('.lives span')];
const nameInput = document.querySelector('#player-name');
const nameNote = document.querySelector('#name-note');
const saveStatus = document.querySelector('#save-status');
let playerPose = 'forward';

let score = 0, lives = 3, playerX = 50, targetPlayerX = 50, speed = 0, active = false, lastTime = 0, spawnDelay = 0, streak = 0, roundId = 0, lastRank = 'INTERN', displayedLoad = 1, playerName = '', sessionId = '';
let rams = [];
const keys = new Set();
nameInput.value = localStorage.getItem('ram-rush-player-name') || '';

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
  const collectibles = rams.filter(ram => !ram.hazard);
  if (!collectibles.length) { setPlayerPose('forward'); return; }
  const nearest = collectibles.reduce((leading, ram) => ram.y > leading.y ? ram : leading);
  const offset = (nearest.x + 6) - playerX;
  setPlayerPose(offset < -7 ? 'left' : offset > 7 ? 'right' : 'forward');
}
function updateHearts() { hearts.forEach((heart, index) => heart.classList.toggle('lost', index >= lives)); }
function loadLevel() { return Math.min(5, 1 + Math.floor(score / 1200)); }
function rankFor() {
  if (score >= 12000) return 'RAM LEGEND';
  if (score >= 6500) return 'SERVER HERO';
  if (score >= 2600) return 'OPERATOR';
  return 'INTERN';
}
function normalizeName(value) { return value.trim().replace(/\s+/g, ' '); }
function renderLeaderboard(entries) {
  leaderboardEl.replaceChildren(...entries.slice(0, 5).map((entry, index) => {
    const row = document.createElement('li');
    row.innerHTML = `<span>${index + 1}. ${entry.name}</span><b>${Number(entry.score).toString().padStart(6, '0')}</b>`;
    return row;
  }));
  if (!entries.length) leaderboardEl.innerHTML = '<li><span>NO RUNS YET</span><b>—</b></li>';
}
async function requestApi(path, body) {
  const response = await fetch(`/api/ram-rush/${path}`, { method: body ? 'POST' : 'GET', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) throw new Error('api');
  return response.json();
}
async function loadLeaderboard() { try { renderLeaderboard((await requestApi('leaderboard')).leaderboard || []); } catch { renderLeaderboard([]); } }
function track(event) { requestApi('events', { event, sessionId }).catch(() => {}); }
async function saveScore() {
  saveStatus.textContent = 'SAVING SCORE…'; saveStatus.classList.remove('error');
  try { const data = await requestApi('score', { name: playerName, score, rank: lastRank, load: loadLevel(), sessionId }); renderLeaderboard(data.leaderboard || []); saveStatus.textContent = 'SCORE LOCKED IN // GLOBAL RANKS UPDATED'; }
  catch { saveStatus.textContent = 'SCORE NOT SAVED — TRY AGAIN'; saveStatus.classList.add('error'); }
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
  displayScore(); updateHearts(); setPlayerX(50); statusEl.textContent = 'ACQUIRE RAM. AVOID TRAPS.'; over.hidden = true;
}
function start() {
  playerName = normalizeName(nameInput.value);
  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{1,15}$/.test(playerName)) { nameNote.textContent = 'ENTER 2–16 LETTERS, NUMBERS, SPACES, _ OR -'; nameNote.classList.add('error'); nameInput.focus(); return; }
  localStorage.setItem('ram-rush-player-name', playerName); nameNote.textContent = 'YOUR SCORE WILL HIT THE GLOBAL BOARD'; nameNote.classList.remove('error');
  reset(); sessionId = crypto.randomUUID(); active = true; intro.hidden = true; lastTime = performance.now(); track('game_start');
  const currentRound = ++roundId;
  requestAnimationFrame(now => tick(now, currentRound));
}
function createRam() {
  const level = loadLevel();
  const hazardChance = .12 + (level - 1) * .045;
  const roll = Math.random();
  const type = roll < hazardChance
    ? ['trap', 'tabs', 'local'][Math.floor(Math.random() * 3)]
    : roll < hazardChance + .1 ? 'golden' : 'ram';
  const assets = { ram: 'ram-module.png', golden: 'golden-ram.png', trap: 'ram-trap.png', tabs: 'tabs-47.png', local: 'local-llm.png' };
  const golden = type === 'golden';
  const hazard = ['trap', 'tabs', 'local'].includes(type);
  const el = document.createElement('div'); el.className = `ram ram--${type}${golden ? ' golden' : ''}${hazard ? ' hazard' : ''}`;
  el.innerHTML = `<img src="./assets/${assets[type]}" alt="" />`;
  const x = hazard ? 24 + Math.random() * 52 : 18 + Math.random() * 64;
  el.style.left = `${x}%`; el.style.top = '-105px';
  el.style.transform = `rotate(${(Math.random() - .5) * 18}deg)`;
  fallZone.append(el);
  rams.push({
    el, x, spawnX: x, y: -105, golden, hazard, type,
    velocity: 4.6 + level * .75 + Math.random() * 1.7,
    rotation: (Math.random() - .5) * 16,
    sway: hazard ? .8 : 1.4,
    phase: Math.random() * Math.PI * 2
  });
}
function flash(points, x, y, danger = false) { const pop = document.createElement('span'); pop.className = `float-score${danger ? ' danger' : ''}`; pop.textContent = danger ? points : `+${points}`; pop.style.left = `${x}%`; pop.style.top = `${y}px`; floatZone.append(pop); setTimeout(() => pop.remove(), 680); }
function loseRam(ram) {
  ram.el.remove(); lives--; streak = 0; updateHearts(); replayAnimation([livesEl], 'damage', 420);
  statusEl.textContent = lives ? 'WARNING: RAM DROPPED!' : 'SYSTEM CRASHED';
  if (!lives) end();
}
function catchRam(ram) {
  if (ram.hazard) {
    const warnings = {
      trap: 'RAM TRAP! COMBO LOST.',
      tabs: '47 TABS SAVED!',
      local: 'LOCAL LLM IS PROTECTED!'
    };
    ram.el.remove(); lives--; streak = 0; updateHearts();
    replayAnimation([livesEl, player, playerFront], 'damage', 420);
    statusEl.textContent = lives ? warnings[ram.type] : 'SYSTEM CRASHED';
    catchBurst(ram.x, ram.y); flash('DON’T TAKE IT!', ram.x, ram.y, true);
    if (!lives) end();
    return;
  }
  const level = loadLevel();
  const basePoints = ram.golden ? 500 : 100 + Math.min(streak, 8) * 25;
  const points = Math.round(basePoints * (1 + (level - 1) * .12));
  score += points; streak++; displayScore();
  setPlayerPose('forward');
  replayAnimation([player, playerFront], 'catching', 390); replayAnimation([scoreBlock], 'score-pop', 390);
  statusEl.textContent = ram.golden ? 'GOLDEN RAM ACQUIRED!' : streak > 2 ? `RAM HAUL ×${streak}` : 'RAM ACQUIRED';
  catchBurst(ram.x, ram.y); flash(ram.golden ? '500 ★' : points, ram.x, ram.y); ram.el.remove();
}
function shareText() {
  const scoreText = score.toLocaleString('en-US');
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const challengeUrl = new URL('/games/ram-rush/?challenge=box-2', location.origin).href;
  return `I gave Sam Altman a box and access to your RAM.\nThis was a mistake.\n\nRAM STOLEN: ${scoreText} MB\n\nCan you keep more out of the box?${local ? '' : `\n${challengeUrl}`}`;
}
function resultCardScore() { return score.toLocaleString('en-US').padStart(6, '0'); }
function canvasBlob(canvas) { return new Promise(resolve => canvas.toBlob(resolve, 'image/png')); }
function loadResultArt() {
  const image = new Image(); image.src = './assets/ram-haul-box.png';
  return image.complete && image.naturalWidth ? Promise.resolve(image) : new Promise((resolve, reject) => {
    image.onload = () => resolve(image); image.onerror = reject;
  });
}
async function createResultCard() {
  const [art] = await Promise.all([loadResultArt(), document.fonts?.ready || Promise.resolve()]);
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 630;
  const ctx = canvas.getContext('2d');
  const navy = '#060b1c', cream = '#fff6db', lime = '#bfff19', cyan = '#31f5e0';
  const background = ctx.createLinearGradient(0, 0, 1200, 630); background.addColorStop(0, '#071225'); background.addColorStop(1, '#02050e');
  ctx.fillStyle = background; ctx.fillRect(0, 0, 1200, 630);
  ctx.strokeStyle = '#196a7b'; ctx.globalAlpha = .38; ctx.lineWidth = 2;
  for (let x = 715; x < 1220; x += 58) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 160, 630); ctx.stroke(); }
  for (let y = 70; y < 640; y += 62) { ctx.beginPath(); ctx.moveTo(690, y); ctx.lineTo(1200, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ee334f'; for (let x = 0; x < 1200; x += 34) { ctx.beginPath(); ctx.moveTo(x, 272); ctx.lineTo(x + 18, 272); ctx.lineTo(x + 36, 292); ctx.lineTo(x + 18, 292); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = navy; ctx.fillRect(0, 267, 1200, 30);
  ctx.save(); ctx.translate(63, 70); ctx.transform(1, 0, -.16, 1, 0, 0);
  ctx.font = '900 italic 50px "Archivo Black", Impact, sans-serif'; ctx.fillStyle = cream; ctx.fillText('RAM', 0, 0);
  const ramWidth = ctx.measureText('RAM ').width; ctx.fillStyle = lime; ctx.fillText('RUSH', ramWidth, 0); ctx.restore();
  ctx.font = '900 italic 71px "Archivo Black", Impact, sans-serif'; ctx.fillStyle = cream; ctx.fillText('SAM HAS A BOX.', 62, 207);
  ctx.font = '900 italic 31px "Archivo Black", Impact, sans-serif'; ctx.fillStyle = cream; ctx.fillText('RAM STOLEN', 64, 366);
  const scoreText = `${resultCardScore()} MB`; ctx.font = `900 italic ${scoreText.length > 11 ? 82 : 101}px "Archivo Black", Impact, sans-serif`; ctx.fillStyle = lime; ctx.fillText(scoreText, 59, 477);
  ctx.font = '900 italic 27px "Archivo Black", Impact, sans-serif'; ctx.fillStyle = cream; ctx.fillText('CAN YOU KEEP MORE OUT OF THE BOX?', 63, 564);
  ctx.fillStyle = cyan; ctx.fillRect(64, 592, 560, 6);
  ctx.drawImage(art, 655, 35, 545, 545);
  return canvasBlob(canvas);
}
function downloadResultCard(blob) {
  const link = document.createElement('a'); const url = URL.createObjectURL(blob);
  link.href = url; link.download = `ram-rush-${score}.png`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function saveResultCard() { const blob = await createResultCard(); downloadResultCard(blob); return blob; }
async function shareResult() {
  const initial = shareButton.textContent; shareButton.textContent = 'PREPARING CARD…'; shareButton.disabled = true;
  try {
    const blob = await createResultCard(); const file = new File([blob], `ram-rush-${score}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'RAM RUSH', text: shareText() });
    else {
      downloadResultCard(blob);
      const intent = new URL('https://x.com/intent/tweet'); intent.searchParams.set('text', shareText());
      window.open(intent, '_blank', 'noopener,noreferrer');
    }
    track('share_click');
  } catch (error) { if (error?.name !== 'AbortError') shareButton.textContent = 'TRY AGAIN'; }
  finally { shareButton.disabled = false; if (shareButton.textContent !== 'TRY AGAIN') shareButton.textContent = initial; }
}
function end() {
  if (!active) return;
  active = false; rams.forEach(ram => ram.el.remove()); rams = [];
  lastRank = rankFor(); finalScore.textContent = score.toString().padStart(6, '0');
  resultEyebrow.textContent = `RUN COMPLETE // LOAD ${loadLevel()} REACHED`;
  resultTitle.textContent = 'SYSTEM CRASHED';
  rankLabel.textContent = `RANK // ${lastRank}`;
  shareCaption.textContent = `${lastRank} RUN — CAN YOU BEAT ME?`;
  setTimeout(() => { over.hidden = false; saveScore(); }, 300);
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
      spawnDelay = Math.max(.3, 1.28 - (level - 1) * .16) * (.82 + Math.random() * .42);
    } else {
      spawnDelay = .25;
    }
  }
  const playerBox = player.getBoundingClientRect();
  for (let i = rams.length - 1; i >= 0; i--) {
    const ram = rams[i]; ram.y += ram.velocity * delta;
    ram.x = Math.max(5, Math.min(95, ram.spawnX + Math.sin(ram.y / 68 + ram.phase) * ram.sway));
    ram.el.style.top = `${ram.y}px`; ram.el.style.left = `${ram.x}%`; ram.el.style.rotate = `${ram.rotation * (ram.y / 110)}deg`;
    const ramBox = ram.el.getBoundingClientRect();
    const atBox = ramBox.bottom >= playerBox.top + playerBox.height * .73 && ramBox.top <= playerBox.top + playerBox.height * .86 && ramBox.right > playerBox.left + playerBox.width * .35 && ramBox.left < playerBox.right - playerBox.width * .35;
    if (atBox) { catchRam(ram); rams.splice(i, 1); continue; }
    if (ram.y > fallZone.clientHeight + 60) {
      if (!ram.hazard) loseRam(ram);
      else ram.el.remove();
      rams.splice(i, 1);
    }
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
nameInput.addEventListener('keydown', event => { if (event.key === 'Enter') start(); });
copyButton.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(shareText()); copyButton.textContent = 'COPIED!'; }
  catch { copyButton.textContent = 'COPY FAILED'; }
  window.setTimeout(() => { copyButton.textContent = 'COPY POST'; }, 1500);
});
saveCardButton.addEventListener('click', async () => {
  const initial = saveCardButton.textContent; saveCardButton.textContent = 'SAVING…'; saveCardButton.disabled = true;
  try { await saveResultCard(); saveCardButton.textContent = 'SAVED!'; }
  catch { saveCardButton.textContent = 'TRY AGAIN'; }
  window.setTimeout(() => { saveCardButton.textContent = initial; saveCardButton.disabled = false; }, 1400);
});
shareButton.addEventListener('click', shareResult);
loadLeaderboard();
