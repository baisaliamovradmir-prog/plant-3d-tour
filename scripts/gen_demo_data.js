// gen_demo_data.js — демонстрационный набор завода смазочных материалов «Демо».
// Метрики сценариев считает та же модель, что и прототип (prototype/sim.js, 5 репликаций × 26 суток).
// Локации, точки интереса, кейсы и маршруты — те же, что в 3D-туре (ветка 3d, frontend/src/3d/api/mock).
// Запуск: node scripts/gen_demo_data.js → data/demo-data.json
const fs = require("fs");
const path = require("path");
const Sim = require("../prototype/sim.js");

const SEEDS = [1109, 2027, 3301, 4507, 5501];
const OPTS = { warmupDays: 6, runDays: 26 };
const TONS = Sim.BASE.batchTons;

function avg(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
const r1 = (v) => Math.round(v * 10) / 10;

// --- процесс и этапы ---
const processInfo = {
  id: 1,
  name: "Производство смазочных масел",
  enterprise: Sim.BASE.enterprise,
  product: Sim.BASE.product,
  batch_t: TONS,
  hours_per_day: Sim.BASE.hoursPerDay,
  plan_tpd: r1(Sim.BASE.demandPerDay * TONS),
  series_size: Sim.BASE.seriesSize,
  due_h: Sim.BASE.dueHours,
  norm_cycle_h: r1(Sim.BASE.normHours)
};

const stages = Sim.BASE.nodes.map((n) => ({
  id: n.stage,              // = process_stages.id в туре
  code: n.id,
  step_no: n.stage,
  name: n.name,
  short: n.short,
  servers: n.servers,
  mean_h: n.mean,
  cv: n.cv,
  rate_rub_hour: n.rate,
  setup_h: n.setup || 0,
  series: n.batch || null
}));

// --- сценарии и их метрики ---
const scenarios = Sim.SCENARIOS.map((s) => {
  const cfg = Sim.applyScenario(Sim.BASE, Object.assign({}, s.patch, { label: s.label }));
  const k = SEEDS.map((seed) => Sim.simulate(cfg, Object.assign({}, OPTS, { seed })).kpi);
  return {
    id: s.id,
    label: s.label,
    description: s.description,
    patch: s.patch,
    metrics: {
      cycle_h: r1(avg(k.map((x) => x.leadTime))),
      cycle_p95_h: r1(avg(k.map((x) => x.leadP95))),
      output_tpd: r1(avg(k.map((x) => x.throughput)) * TONS),
      on_time_pct: r1(avg(k.map((x) => x.onTimeShare)) * 100),
      wip_batches: r1(avg(k.map((x) => x.wip))),
      offspec_pct: r1(avg(k.map((x) => x.scrapShare)) * 100),
      cost_rub_t: Math.round(avg(k.map((x) => x.costPerGood)) / TONS),
      load: k[0].utilization.map((u, i) => ({
        stage_id: u.stage,
        pct: r1(avg(k.map((x) => x.utilization[i].utilization)) * 100)
      }))
    }
  };
});

// --- локации, точки интереса, кейсы, маршруты (как в 3D-туре) ---
const locations = [
  { id: 1, name: "Генплан", scene_type: "overview", stages: [] },
  { id: 2, name: "Резервуарный парк", scene_type: "model", stages: [1, 2] },
  { id: 3, name: "Цех смешения", scene_type: "model", stages: [3] },
  { id: 4, name: "Лаборатория ОТК", scene_type: "panorama", stages: [4] },
  { id: 5, name: "Цех фасовки", scene_type: "model", stages: [5] },
  { id: 6, name: "Склад и отгрузка", scene_type: "model", stages: [6, 7] }
];

const poi = [
  { id: 1, location_id: 1, title: "Завод сверху", stage_id: null, case_id: null, pos: [-16, 7, 12] },
  { id: 2, location_id: 2, title: "Сливная эстакада", stage_id: 1, case_id: null, pos: [-6, 5.6, 5.6] },
  { id: 3, location_id: 2, title: "Резервуары", stage_id: 2, case_id: null, pos: [5, 8.2, -2] },
  { id: 4, location_id: 3, title: "Смесительная установка", stage_id: 3, case_id: null, pos: [0, 7.8, -2] },
  { id: 5, location_id: 4, title: "Отбор проб", stage_id: 4, case_id: 1, yaw: 20, pitch: -8 },
  { id: 6, location_id: 5, title: "Линия розлива", stage_id: 5, case_id: 2, pos: [-3, 4.2, 0] },
  { id: 7, location_id: 5, title: "Рабочее место оператора", stage_id: 5, case_id: null, pos: [4, 3.2, 3.6] },
  { id: 8, location_id: 6, title: "Адресное хранение", stage_id: 6, case_id: 3, pos: [-4, 7.2, -1] },
  { id: 9, location_id: 6, title: "Погрузка", stage_id: 7, case_id: null, pos: [12, 4.2, 3] },
  { id: 10, location_id: 1, title: "Итоги", stage_id: null, case_id: null, pos: [0, 5.5, 16] }
];

const cases = [
  { id: 1, title: "Экспресс-анализ проб", stage_id: 4, metric: "длительность контроля качества, ч", before: 5.5, after: 2.4, status: "пилот", since: "2026-10-28", scenario: "a" },
  { id: 2, title: "Быстрая переналадка линии (SMED)", stage_id: 5, metric: "длительность фасовки, ч", before: 3.4, after: 2.5, status: "внедрено", since: "2026-10-09", scenario: "b" },
  { id: 3, title: "Порядок на складе по 5S", stage_id: 7, metric: "длительность отгрузки, ч", before: 2.6, after: 1.5, status: "внедрено", since: "2026-09-29", scenario: null }
];

const routes = [
  { id: 1, name: "Знакомство с профессией", audience: "абитуриенты", poi: [1, 4, 5, 7, 10] },
  { id: 2, name: "Мощности и эффективность", audience: "партнёры и клиенты", poi: [1, 3, 4, 5, 6, 8, 9, 10] },
  { id: 3, name: "Первый день на заводе", audience: "новые сотрудники", poi: [1, 2, 7, 8, 9] }
];

const payload = {
  meta: {
    generated: "2026-11-09",
    source: "prototype/sim.js (DES, 5 репликаций × 26 суток, прогрев 6 суток)",
    seeds: SEEDS,
    units: { time: "ч", output: "т/сут", cost: "₽/т", wip: "партий по 25 т" },
    note: "Демонстрационные данные синтетические. Локации, точки и кейсы совпадают с 3D-туром (ветка 3d)."
  },
  process: processInfo,
  stages,
  scenarios,
  locations,
  poi,
  cases,
  routes
};

const out = path.join(__dirname, "..", "data", "demo-data.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(payload, null, 2), "utf8");
console.log("ok data/demo-data.json");
scenarios.forEach((s) =>
  console.log(s.id.padEnd(5), "цикл", s.metrics.cycle_h, "ч · в срок", s.metrics.on_time_pct + " %", "·", s.metrics.cost_rub_t, "₽/т"));
