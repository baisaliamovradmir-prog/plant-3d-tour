const Sim = require("../prototype/sim.js");
const fs = require("fs");

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
      throughput: +avg(k.map((x) => x.throughput)).toFixed(1),
      demand: k[0].demand,
      leadTime: +avg(k.map((x) => x.leadTime)).toFixed(0),
      leadP95: +avg(k.map((x) => x.leadP95)).toFixed(0),
      wip: +avg(k.map((x) => x.wip)).toFixed(1),
      onTimeShare: +(avg(k.map((x) => x.onTimeShare)) * 100).toFixed(1),
      scrapShare: +(avg(k.map((x) => x.scrapShare)) * 100).toFixed(1),
      costPerGood: Math.round(avg(k.map((x) => x.costPerGood))),
      fullCost: Math.round(avg(k.map((x) => x.fullCost))),
      utilization: utilIds.map((id) => {
        const u = k.map((x) => x.utilization.find((y) => y.id === id));
        return {
          id,
          short: u[0].short,
          servers: u[0].servers,
          utilization: +(avg(u.map((y) => y.utilization)) * 100).toFixed(1),
          setupShare: +(avg(u.map((y) => y.setupShare)) * 100).toFixed(1),
          avgWait: +avg(u.map((y) => y.avgWait)).toFixed(0)
        };
      })
    }
  };
});

// кривая мощности: как выпуск реагирует на рост спроса
const demandSweep = [34, 38, 42, 46, 50, 54].map((d) => {
  const row = { demand: d };
  ["asis", "c"].forEach((id) => {
    const s = Sim.SCENARIOS.find((x) => x.id === id);
    const cfg = Sim.applyScenario(Sim.BASE, Object.assign({}, s.patch, { demandPerDay: d }));
    const res = SEEDS.map((seed) => Sim.simulate(cfg, Object.assign({}, OPTS, { seed })));
    row[id] = +avg(res.map((r) => r.kpi.throughput)).toFixed(1);
    row[id + "_lead"] = +avg(res.map((r) => r.kpi.leadTime)).toFixed(0);
    row[id + "_ontime"] = +(avg(res.map((r) => r.kpi.onTimeShare)) * 100).toFixed(0);
  });
  return row;
});

const payload = {
  meta: {
    seeds: SEEDS,
    warmupDays: OPTS.warmupDays,
    runDays: OPTS.runDays,
    generated: "2026-11-08",
    product: Sim.BASE.product
  },
  scenarios: runs,
  demandSweep
};

fs.writeFileSync(__dirname + "/metrics.json", JSON.stringify(payload, null, 2), "utf8");

for (const r of runs) {
  const k = r.kpi;
  console.log(
    r.id.padEnd(5),
    "выпуск", String(k.throughput).padStart(5),
    "цикл", String(k.leadTime).padStart(5),
    "p95", String(k.leadP95).padStart(5),
    "WIP", String(k.wip).padStart(5),
    "всрок", String(k.onTimeShare).padStart(5),
    "брак", String(k.scrapShare).padStart(4),
    "себест", String(k.costPerGood).padStart(5)
  );
  console.log("      ", k.utilization.map((u) => `${u.short}=${u.utilization}%`).join("  "));
}
console.log("\nСпрос→выпуск (AS-IS / C):");
demandSweep.forEach((r) => console.log(`  ${r.demand}: ${r.asis} / ${r.c}   (цикл ${r.asis_lead}/${r.c_lead} мин)`));
