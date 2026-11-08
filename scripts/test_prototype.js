// Headless-проверка app.js на заглушках DOM: ловим ошибки времени выполнения.
const fs = require("fs");
const path = require("path");

const nodes = {};
function makeEl(id) {
  const e = {
    id,
    textContent: "",
    innerHTML: "",
    className: "",
    style: {},
    dataset: { loc: "0" },
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    children: [],
    value: "0",
    scrollIntoView() {},
    addEventListener() {},
    appendChild(c) { this.children.push(c); },
    querySelector() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1120, height: 440 }; },
    getContext() { return ctxStub; },
  };
  nodes[id] = e;
  return e;
}

const ctxStub = new Proxy({}, {
  get(t, k) {
    if (k === "measureText") return () => ({ width: 40 });
    if (k === "createLinearGradient") return () => ({ addColorStop() {} });
    return () => {};
  },
  set() { return true; },
});

global.document = {
  getElementById(id) {
    if (!nodes[id]) makeEl(id);
    return nodes[id];
  },
  createElement() {
    return makeEl("tmp" + Math.random());
  },
};
global.performance = { now: () => Date.now() };
global.window = global;

// значения ползунков
const defaults = { demand: "42", grind: "1", batch: "20", setup: "100", seed: "26" };

// подставляем value до загрузки app.js
const simSource = fs.readFileSync(path.join(__dirname, "..", "prototype", "sim.js"), "utf8");
eval(simSource);
global.Sim = global.Sim || module.exports;

// заглушка для Sim, если eval не дал глобал
if (!global.Sim) { global.Sim = require("../prototype/sim.js"); }

const appSource = fs.readFileSync(path.join(__dirname, "..", "prototype", "app.js"), "utf8");

// готовим элементы с id, которые запрашивает app.js
[
  "demand", "grind", "batch", "setup", "seed", "v-demand", "v-grind", "v-batch", "v-setup", "v-seed",
  "run", "dash", "process", "scenarios", "tour", "scene", "util", "scenario-rows", "lead-chart",
  "k-out", "k-plan", "k-lead", "k-ontime", "k-wip", "k-out-note", "k-lead-note", "k-ontime-note", "k-wip-note",
  "bottleneck-name", "bottleneck-value", "bottleneck-text", "bottleneck-wait", "bottleneck-setup", "cost",
  "to-tour", "poi-card", "poi-tag", "poi-title", "poi-text", "poi-metric-label", "poi-metric", "poi-link",
  "route", "run-chip", "scenario-chip", "process-note",
].forEach((id) => makeEl(id));

Object.keys(defaults).forEach((k) => { nodes[k].value = defaults[k]; });
nodes["route"].children = [0, 1, 2, 3].map((i) => {
  const b = makeEl("route-btn" + i);
  b.dataset = { loc: String(i) };
  b.tagName = "BUTTON";
  return b;
});

let failed = null;
try {
  eval(appSource);
} catch (e) {
  failed = e;
}

if (failed) {
  console.log("ОШИБКА app.js:", failed.message);
  console.log(failed.stack.split("\n").slice(0, 4).join("\n"));
  process.exit(1);
}

const pick = (id) => (nodes[id] ? nodes[id].textContent : "");
console.log("KPI:", {
  выпуск: pick("k-out"),
  план: pick("k-plan"),
  цикл: pick("k-lead"),
  "в срок": pick("k-ontime"),
  wip: pick("k-wip"),
});
console.log("узкое место:", pick("bottleneck-name"), pick("bottleneck-value"), "| очередь",
  pick("bottleneck-wait"), "| переналадка", pick("bottleneck-setup"), "| себестоимость", pick("cost"));
console.log("POI:", pick("poi-tag"), "|", pick("poi-title"), "|", pick("poi-metric-label"), pick("poi-metric"));
console.log("строк сценариев:", nodes["scenario-rows"].children.length);
console.log("столбцов диаграммы:", nodes["lead-chart"].children.length);
console.log("OK: интерфейс отрисован без ошибок");
