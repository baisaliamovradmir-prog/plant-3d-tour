// gen_demo_data.js — демонстрационный набор, согласованный с ТЗ (разделы 4.7, 6.6, 8.5, 9.3)
const fs = require("fs");
const path = require("path");
const Sim = require("../prototype/sim.js");

const SEEDS = [1109, 2027, 3301, 4507, 5501];
const OPTS = { warmupDays: 6, runDays: 26 };

function avg(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

// --- процесс и операции ---
const process = {
  id: "flange-line",
  name: "Изготовление фланца Ду100 PN16",
  product: "Фланец Ду100 PN16, сталь 09Г2С",
  site: "Ремонтно-механический цех, участок механообработки",
  shift_minutes: 480,
  shifts: 2,
  workdays_per_week: 5,
  demand_per_day: 42,
  batch_size: 20,
  due_minutes: 480,
  takt_min: +(960 / 42).toFixed(1)
};

const stages = Sim.BASE.nodes.map((n, i) => ({
  id: n.id,
  order: i + 1,
  name: n.name,
  short: n.short,
  servers: n.servers,
  mean_min: n.mean,
  cv: n.cv,
  rate_rub_hour: n.rate,
  setup_min: n.setup,
  batch: n.batch || null
}));

// --- сценарии и их метрики ---
const scenarios = Sim.SCENARIOS.map((s) => {
  const cfg = Sim.applyScenario(Sim.BASE, Object.assign({}, s.patch, { label: s.label }));
  const runs = SEEDS.map((seed) => Sim.simulate(cfg, Object.assign({}, OPTS, { seed })));
  const k = runs.map((r) => r.kpi);
  return {
    id: s.id,
    label: s.label,
    description: s.description,
    patch: s.patch,
    metrics: {
      cycle_min: Math.round(avg(k.map((x) => x.leadTime))),
      cycle_p95_min: Math.round(avg(k.map((x) => x.leadP95))),
      throughput_per_day: +avg(k.map((x) => x.throughput)).toFixed(1),
      on_time_pct: +(avg(k.map((x) => x.onTimeShare)) * 100).toFixed(1),
      wip_pcs: +avg(k.map((x) => x.wip)).toFixed(1),
      scrap_pct: +(avg(k.map((x) => x.scrapShare)) * 100).toFixed(1),
      cost_per_piece_rub: Math.round(avg(k.map((x) => x.costPerGood))),
      utilization: k[0].utilization.map((u, i) => ({
        stage_id: u.id,
        pct: +(avg(k.map((x) => x.utilization[i].utilization)) * 100).toFixed(1)
      }))
    }
  };
});

// --- локации и точки интереса (совпадают с таблицами 37 и 38 ТЗ) ---
const locations = [
  { id: "LC-01", order: 1, name: "Склад заготовок", stages: ["prep"], duration_sec: 45, scene: "loc-01-sklad.glb" },
  { id: "LC-02", order: 2, name: "Токарный участок", stages: ["turn", "mill", "drill"], duration_sec: 60, scene: "loc-02-tokarny.glb" },
  { id: "LC-03", order: 3, name: "Шлифовка и мойка", stages: ["grind", "wash"], duration_sec: 80, scene: "loc-03-shlifovka.glb" },
  { id: "LC-04", order: 4, name: "ОТК и упаковка", stages: ["qc", "pack"], duration_sec: 55, scene: "loc-04-otk.glb" }
];

const poi = [
  { id: "POI-01", location_id: "LC-01", stage_id: "prep", title: "Буфер заготовок", metric: "wip", x: 2.1, y: 1.4, z: 3.2, case_id: "CASE-01" },
  { id: "POI-04", location_id: "LC-02", stage_id: "turn", title: "Наладка токарного", metric: "cost", x: 10.6, y: 1.8, z: 2.6, case_id: "CASE-02" },
  { id: "POI-05", location_id: "LC-02", stage_id: "mill", title: "Фрезерный участок", metric: "utilization", x: 16.2, y: 2.0, z: 2.4, case_id: "CASE-03" },
  { id: "POI-07", location_id: "LC-03", stage_id: "grind", title: "Шлифовальный станок", metric: "utilization", x: 10.1, y: 1.6, z: 7.8, case_id: "CASE-04" },
  { id: "POI-08", location_id: "LC-03", stage_id: "wash", title: "Ванна мойки", metric: "cost", x: 13.8, y: 1.2, z: 7.0, case_id: null },
  { id: "POI-10", location_id: "LC-04", stage_id: "qc", title: "Пост ОТК", metric: "scrap", x: 17.6, y: 1.4, z: 7.4, case_id: "CASE-05" },
  { id: "POI-12", location_id: "LC-04", stage_id: "pack", title: "Упаковка и паллеты", metric: "throughput", x: 21.4, y: 1.2, z: 7.2, case_id: null },
  { id: "POI-13", location_id: "LC-04", stage_id: "grind", title: "Стенд результатов", metric: "cycle_time", x: 23.0, y: 1.8, z: 9.6, case_id: "CASE-06" }
];

const cases = [
  { id: "CASE-01", title: "Запас на складе", metric: "wip", before: "20,7 шт", after: "3,3 шт", note: "Снижение незавершённого производства после снятия ограничения" },
  { id: "CASE-02", title: "SMED на токарном", metric: "setup", before: "20 мин", after: "9 мин", note: "Сокращение переналадки на 55 %" },
  { id: "CASE-03", title: "Резерв мощности", metric: "utilization", before: "40 %", after: "40 %", note: "Фрезеровка не является ограничением" },
  { id: "CASE-04", title: "Узкое место", metric: "utilization", before: "97 %", after: "50 %", note: "Второй шлифовальный станок снимает ограничение" },
  { id: "CASE-05", title: "Изолятор брака", metric: "scrap", before: "2,3 %", after: "2,6 %", note: "Рост доли выявленного брака при меньшем цикле" },
  { id: "CASE-06", title: "Цикл после улучшений", metric: "cycle_time", before: "529 мин", after: "90 мин", note: "Сценарий C: второй станок и быстрая переналадка" }
];

const payload = {
  meta: {
    generated: "2026-11-08",
    source: "prototype/sim.js (DES, 5 репликаций × 26 суток, прогрев 6 суток)",
    seeds: SEEDS,
    note: "Демонстрационные данные синтетические; совпадают с таблицами 21, 22, 37, 38 ТЗ"
  },
  process,
  stages,
  scenarios,
  locations,
  poi,
  cases
};

const out = path.join(__dirname, "..", "data", "demo-data.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(payload, null, 2), "utf8");
console.log("ok", out);
scenarios.forEach((s) => console.log(s.id, s.metrics.cycle_min, s.metrics.on_time_pct + "%", s.metrics.cost_per_piece_rub));
