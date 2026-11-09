// Headless-проверка prototype/app.js на заглушках DOM: ловим ошибки времени выполнения
// и сверяем, что метрики экрана посчитаны и согласованы с моделью.
// Запуск: node scripts/test_prototype.js
const fs = require("fs");
const path = require("path");

const nodes = {};
let seq = 0;

function makeEl(id) {
  const e = {
    id,
    tagName: "DIV",
    textContent: "",
    innerHTML: "",
    className: "",
    hidden: false,
    style: {},
    dataset: {},
    children: [],
    value: "0",
    complete: false,
    naturalWidth: 0,
    classList: {
      _s: new Set(),
      toggle(c, on) { (on === undefined ? !this._s.has(c) : on) ? this._s.add(c) : this._s.delete(c); },
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    setAttribute(k, v) { this["attr:" + k] = String(v); },
    getAttribute(k) { return this["attr:" + k] ?? null; },
    scrollIntoView() {},
    addEventListener() {},
    appendChild(c) { this.children.push(c); return c; },
    querySelector() { return makeEl("q" + ++seq); },
    querySelectorAll() { return []; },
    closest() { return null; },
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

const body = makeEl("body");
global.document = {
  body,
  documentElement: { scrollHeight: 2000 },
  getElementById(id) { return nodes[id] || makeEl(id); },
  createElement() { return makeEl("tmp" + ++seq); },
  querySelector() { return makeEl("q" + ++seq); },
  querySelectorAll() { return []; },
};
global.window = global;
global.innerWidth = 1440;
global.innerHeight = 900;
global.scrollY = 0;
global.location = { search: "" };
global.localStorage = { getItem() { return null; }, setItem() {} };
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = () => 0;
global.addEventListener = () => {};
global.Image = function () { return {}; }; // тур не запущен — проба просто не срабатывает

// значения ползунков по умолчанию — как в index.html
const defaults = { demand: "115", batch: "2", setup: "100", seed: "26" };
Object.keys(defaults).forEach((k) => { makeEl(k).value = defaults[k]; });
makeEl("tour").dataset.tourUrl = "http://localhost:8080/";
makeEl("route").children = [0, 1, 2, 3].map((i) => {
  const b = makeEl("route-btn" + i);
  b.dataset = { loc: String(i) };
  b.tagName = "BUTTON";
  return b;
});

global.Sim = require("../prototype/sim.js");
const appSource = fs.readFileSync(path.join(__dirname, "..", "prototype", "app.js"), "utf8");

try {
  eval(appSource);
} catch (e) {
  console.log("ОШИБКА app.js:", e.message);
  console.log(e.stack.split("\n").slice(0, 4).join("\n"));
  process.exit(1);
}

const pick = (id) => (nodes[id] ? nodes[id].textContent : "");
const num = (id) => parseFloat(pick(id).replace(/\s/g, "").replace(",", "."));
const checks = [
  ["выпуск, т/сут", num("k-out"), (v) => v > 90 && v < 140],
  ["цикл, ч", num("k-lead"), (v) => v > 20 && v < 80],
  ["в срок, %", num("k-ontime"), (v) => v >= 0 && v <= 100],
  ["WIP, партий", num("k-wip"), (v) => v > 0 && v < 30],
  ["строк сценариев (4 + свой)", nodes["scenario-rows"].children.length, (v) => v === 5],
  ["столбцов диаграммы", nodes["lead-chart"].children.length, (v) => v === 5],
  ["строк загрузки (7 этапов)", nodes["util"].children.length, (v) => v === 7],
  ["узкое место — ОТК", pick("bottleneck-name"), (v) => v === "ОТК"],
];

let failed = 0;
checks.forEach(([name, value, ok]) => {
  const pass = ok(value);
  if (!pass) failed++;
  console.log((pass ? "ok   " : "FAIL ") + name + ": " + value);
});
const best = nodes["scenario-rows"].children.find((tr) => /\bbest\b/.test(tr.className));
console.log("лучший сценарий:", best ? best.innerHTML.replace(/<[^>]+>/g, " ").trim().split(/\s{2,}/)[0] : "—");
console.log("POI:", pick("poi-tag"), "|", pick("poi-title"), "|", pick("poi-metric-label"), pick("poi-metric"));

if (failed) {
  console.log(`\n${failed} проверок не прошли`);
  process.exit(1);
}
console.log("\nOK: интерфейс отрисован без ошибок, метрики в допустимых пределах");
