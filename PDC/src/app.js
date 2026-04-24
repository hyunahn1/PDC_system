const canvas = document.getElementById("pdcCanvas");
const ctx = canvas.getContext("2d");
const slidersRoot = document.getElementById("sensorSliders");
const nearestValue = document.getElementById("nearestValue");
const levelValue = document.getElementById("levelValue");
const gearValue = document.getElementById("gearValue");
const stateOutput = document.getElementById("stateOutput");
const autoButton = document.getElementById("autoButton");
const gearButton = document.getElementById("gearButton");
const nearThreshold = document.getElementById("nearThreshold");
const cautionThreshold = document.getElementById("cautionThreshold");
const criticalThreshold = document.getElementById("criticalThreshold");

let gearReverse = true;
let autoMode = true;
let staleMode = false;
let tick = 0;
let distances = [145, 118, 78, 142];
let lastUpdateMs = Date.now();

const labels = ["Rear Left", "Mid Left", "Mid Right", "Rear Right"];

function thresholds() {
  return {
    near: Number(nearThreshold.value),
    caution: Number(cautionThreshold.value),
    critical: Number(criticalThreshold.value)
  };
}

function makeSliders() {
  labels.forEach((label, index) => {
    const wrap = document.createElement("div");
    wrap.className = "sensor-control";
    wrap.innerHTML = `
      <label>
        <span>${label}</span>
        <strong id="sensorValue${index}">${distances[index]} cm</strong>
      </label>
      <input type="range" min="10" max="180" value="${distances[index]}" data-index="${index}">
    `;
    slidersRoot.appendChild(wrap);
  });

  slidersRoot.addEventListener("input", (event) => {
    const input = event.target.closest("input[type='range']");
    if (!input) return;
    autoMode = false;
    autoButton.textContent = "Resume Auto";
    staleMode = false;
    const index = Number(input.dataset.index);
    distances[index] = Number(input.value);
    lastUpdateMs = Date.now();
    render();
  });
}

function applyScenario(name) {
  autoMode = false;
  autoButton.textContent = "Resume Auto";
  staleMode = false;

  if (name === "clear") distances = [165, 160, 158, 166];
  if (name === "left") distances = [32, 82, 124, 150];
  if (name === "center") distances = [140, 48, 42, 136];
  if (name === "right") distances = [154, 126, 76, 34];
  if (name === "critical") distances = [62, 28, 24, 58];
  if (name === "stale") staleMode = true;

  lastUpdateMs = Date.now();
  syncSliders();
  render();
}

function syncSliders() {
  document.querySelectorAll("input[type='range'][data-index]").forEach((input) => {
    const index = Number(input.dataset.index);
    input.value = distances[index];
    document.getElementById(`sensorValue${index}`).textContent = `${Math.round(distances[index])} cm`;
  });
}

function updateAuto() {
  if (!autoMode) return;
  tick += 0.035;
  distances = [
    105 + Math.sin(tick) * 45,
    78 + Math.sin(tick + 0.9) * 52,
    68 + Math.sin(tick + 1.7) * 46,
    122 + Math.sin(tick + 2.4) * 36
  ].map((value) => Math.round(PdcCore.clamp(value, 18, 170)));
  lastUpdateMs = Date.now();
  syncSliders();
}

function currentState() {
  const now = Date.now();
  const stamp = staleMode ? now - 1000 : lastUpdateMs;
  const readings = PdcCore.SENSOR_NAMES.map((name, index) => {
    return PdcCore.reading(name, distances[index], stamp);
  });

  return PdcCore.computeState(readings, {
    active: gearReverse,
    nowMs: now,
    thresholds: thresholds()
  });
}

function colorForLevel(level, alpha) {
  const colors = {
    Off: `rgba(150, 160, 170, ${alpha})`,
    Far: `rgba(45, 180, 110, ${alpha})`,
    Near: `rgba(45, 220, 120, ${alpha})`,
    Caution: `rgba(255, 210, 74, ${alpha})`,
    Critical: `rgba(255, 77, 77, ${alpha})`
  };
  return colors[level] || colors.Off;
}

function drawRearScene() {
  const w = canvas.width;
  const h = canvas.height;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#1c2630");
  sky.addColorStop(0.48, "#11171d");
  sky.addColorStop(1, "#07090c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#2d343d";
  ctx.fillRect(0, h * 0.44, w, h * 0.56);

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 16; i += 1) {
    const y = h * 0.48 + i * 28;
    ctx.beginPath();
    ctx.moveTo(w * 0.18 - i * 14, y);
    ctx.lineTo(w * 0.82 + i * 14, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.42, h);
  ctx.lineTo(w * 0.49, h * 0.45);
  ctx.moveTo(w * 0.58, h);
  ctx.lineTo(w * 0.51, h * 0.45);
  ctx.stroke();

  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.fillRect(0, 0, w, h);
}

function guidePath(y, topWidth, bottomWidth) {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const topY = h * y;
  const bottomY = topY + h * 0.105;
  const topHalf = w * topWidth * 0.5;
  const bottomHalf = w * bottomWidth * 0.5;

  ctx.beginPath();
  ctx.moveTo(cx - topHalf, topY);
  ctx.bezierCurveTo(cx - topHalf * 0.94, bottomY, cx - bottomHalf * 0.94, bottomY, cx - bottomHalf, bottomY);
  ctx.moveTo(cx + topHalf, topY);
  ctx.bezierCurveTo(cx + topHalf * 0.94, bottomY, cx + bottomHalf * 0.94, bottomY, cx + bottomHalf, bottomY);
  ctx.moveTo(cx - bottomHalf, bottomY);
  ctx.lineTo(cx + bottomHalf, bottomY);
}

function drawOverlay(state) {
  if (!state.active) return;

  const order = { Off: 0, Far: 1, Near: 2, Caution: 3, Critical: 4 };
  const level = order[state.warningLevel] || 0;
  const staleAlpha = state.stale ? 0.34 : 1;

  const guides = [
    [0.37, 0.26, 0.50, "Near", 3],
    [0.53, 0.38, 0.68, "Near", 4],
    [0.67, 0.50, 0.84, "Caution", 5],
    [0.79, 0.64, 0.96, "Critical", 7]
  ];

  guides.forEach(([y, top, bottom, guideLevel, width]) => {
    guidePath(y, top, bottom);
    const active = level >= order[guideLevel];
    ctx.strokeStyle = colorForLevel(guideLevel, (active ? 0.9 : 0.32) * staleAlpha);
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  });

  const sectorW = 180;
  const gap = 14;
  const total = sectorW * 4 + gap * 3;
  const startX = (canvas.width - total) / 2;
  const y = canvas.height - 72;
  state.rearSensors.forEach((sensor, index) => {
    const intensity = PdcCore.intensityForDistance(sensor.distanceCm);
    const levelName = sensor.valid && !state.stale ? PdcCore.levelForDistance(sensor.distanceCm, thresholds()) : "Off";
    ctx.fillStyle = colorForLevel(levelName, 0.22 + intensity * 0.72);
    roundRect(startX + index * (sectorW + gap), y, sectorW, 28, 8);
    ctx.fill();
  });

  const pillW = 190;
  const pillX = (canvas.width - pillW) / 2;
  const pillY = canvas.height - 126;
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  roundRect(pillX, pillY, pillW, 40, 9);
  ctx.fill();
  ctx.fillStyle = colorForLevel(state.warningLevel, state.stale ? 0.72 : 1);
  ctx.font = "700 20px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label = state.stale
    ? "PDC STALE"
    : state.nearestDistanceCm >= 0
      ? `PDC ${Math.round(state.nearestDistanceCm)} cm`
      : "PDC --";
  ctx.fillText(label, canvas.width / 2, pillY + 21);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function updateText(state) {
  nearestValue.textContent = state.nearestDistanceCm >= 0
    ? `${Math.round(state.nearestDistanceCm)} cm`
    : "-- cm";
  levelValue.textContent = state.warningLevel;
  gearValue.textContent = gearReverse ? "R" : "D";
  gearButton.textContent = gearReverse ? "Gear R" : "Gear D";
  stateOutput.textContent = JSON.stringify({
    nearestDistanceCm: Math.round(state.nearestDistanceCm),
    warningLevel: state.warningLevel,
    active: state.active,
    stale: state.stale,
    sensors: state.rearSensors.map((sensor) => ({
      name: sensor.name,
      distanceCm: Math.round(sensor.distanceCm),
      valid: sensor.valid
    }))
  }, null, 2);
}

function render() {
  updateAuto();
  const state = currentState();
  drawRearScene();
  drawOverlay(state);
  updateText(state);
}

autoButton.addEventListener("click", () => {
  autoMode = !autoMode;
  staleMode = false;
  autoButton.textContent = autoMode ? "Pause Auto" : "Resume Auto";
});

gearButton.addEventListener("click", () => {
  gearReverse = !gearReverse;
  render();
});

document.querySelector(".scenario-grid").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-scenario]");
  if (!button) return;
  applyScenario(button.dataset.scenario);
});

[nearThreshold, cautionThreshold, criticalThreshold].forEach((input) => {
  input.addEventListener("change", render);
});

makeSliders();
syncSliders();
setInterval(render, 33);
