// run-sim.js — таблица сценариев завода смазочных материалов (5 репликаций × 26 суток).
// Модель считает в партиях по 25 т и часах; здесь всё переводится в единицы экрана:
// выпуск — т/сут, цикл — ч, стоимость переработки — ₽/т. Результат — scripts/metrics.json.
const Sim = require("../prototype/sim.js");
const fs = require("fs");
const TONS = Sim.BASE.batchTons;

const SEEDS = [1109, 2027, 3301, 4507, 5501];
const OPTS = { warmupDays: 6, runDays: 26 };

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// сценарии: среднее по 5 репликациям
const runs = Sim.SCENARIOS.map((s) => {
  const cfg = Sim.applyScenario(Sim.BASE, Object.assign({}, s.patch, { label: s.label, id: s.id, description: s.description }));
  const results = SEEDS.map((seed) => Sim.simulate(cfg, Object.assign({}, OPTS, { seed })));
  const k = results.map((r) => r.kpi);
  const utilIds = k[0].utilization.map((u) => u.id);
  return {
    id: s.id,
    label: s.label,
    short: s.short,
    description: s.description,
    kpi: {
      throughput_tpd: +(avg(k.map((x) => x.throughput)) * TONS).toFixed(1),
      demand_tpd: +(k[0].demand * TONS).toFixed(1),
      leadTime_h: +avg(k.map((x) => x.leadTime)).toFixed(1),
      leadP95_h: +avg(k.map((x) => x.leadP95)).toFixed(1),
      wip_batches: +avg(k.map((x) => x.wip)).toFixed(1),
      onTimeShare: +(avg(k.map((x) => x.onTimeShare)) * 100).toFixed(1),
      scrapShare: +(avg(k.map((x) => x.scrapShare)) * 100).toFixed(1),
      cost_rub_t: Math.round(avg(k.map((x) => x.costPerGood)) / TONS),
      utilization: utilIds.map((id) => {
        const u = k.map((x) => x.utilization.find((y) => y.id === id));
        return {
          id,
          short: u[0].short,
          servers: u[0].servers,
          utilization: +(avg(u.map((y) => y.utilization)) * 100).toFixed(1),
          setupShare: +(avg(u.map((y) => y.setupShare)) * 100).toFixed(1),
          avgWait_h: +avg(u.map((y) => y.avgWait)).toFixed(1)
        };
      })
    }
  };
});

// кривая мощности: как выпуск реагирует на рост плана (т/сут — диапазон ползунка на экране)
const demandSweep = [90, 100, 110, 115, 125, 135].map((tpd) => {
  const row = { demand_tpd: tpd };
  ["asis", "c"].forEach((id) => {
    const s = Sim.SCENARIOS.find((x) => x.id === id);
    const cfg = Sim.applyScenario(Sim.BASE, Object.assign({}, s.patch, { demandPerDay: tpd / TONS }));
    const res = SEEDS.map((seed) => Sim.simulate(cfg, Object.assign({}, OPTS, { seed })));
    row[id] = +(avg(res.map((r) => r.kpi.throughput)) * TONS).toFixed(1);
    row[id + "_lead"] = +avg(res.map((r) => r.kpi.leadTime)).toFixed(1);
    row[id + "_ontime"] = +(avg(res.map((r) => r.kpi.onTimeShare)) * 100).toFixed(0);
  });
  return row;
});

const payload = {
  meta: {
    seeds: SEEDS,
    warmupDays: OPTS.warmupDays,
    runDays: OPTS.runDays,
    generated: "2026-11-09",
    enterprise: Sim.BASE.enterprise,
    product: Sim.BASE.product,
    units: { throughput: "т/сут", leadTime: "ч", wip: "партий по 25 т", cost: "₽/т" }
  },
  scenarios: runs,
  demandSweep
};

fs.writeFileSync(__dirname + "/metrics.json", JSON.stringify(payload, null, 2), "utf8");

for (const r of runs) {
  const k = r.kpi;
  console.log(
    r.id.padEnd(5),
    "выпуск", String(k.throughput_tpd).padStart(6), "т/сут",
    " цикл", String(k.leadTime_h).padStart(5), "ч",
    " p95", String(k.leadP95_h).padStart(5), "ч",
    " WIP", String(k.wip_batches).padStart(4),
    " в срок", String(k.onTimeShare).padStart(5), "%",
    " некондиция", String(k.scrapShare).padStart(4), "%",
    " стоимость", String(k.cost_rub_t).padStart(6), "₽/т"
  );
  console.log("      ", k.utilization.map((u) => `${u.short}=${u.utilization}%`).join("  "));
}
console.log("\nПлан → выпуск, т/сут (AS-IS / C):");
demandSweep.forEach((r) => console.log(`  ${r.demand_tpd}: ${r.asis} / ${r.c}   (цикл ${r.asis_lead} / ${r.c_lead} ч)`));
