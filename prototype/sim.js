/* sim.js — дискретно-событийная модель участка механообработки (цифровой двойник).
 * Работает и в Node (module.exports), и в браузере (window.Sim).
 * Единицы времени — минуты, стоимость — рубли.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Sim = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------- ГПСЧ ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normal(rand) {
    var u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // время операции: логнормальное с заданным средним и коэффициентом вариации
  function opTime(rand, mean, cv) {
    var s2 = Math.log(1 + cv * cv);
    var mu = Math.log(mean) - s2 / 2;
    return Math.exp(mu + Math.sqrt(s2) * normal(rand));
  }

  // ---------- базовая конфигурация участка ----------
  var BASE = {
    product: "Фланец Ду100 PN16, сталь 09Г2С",
    workMinutesPerDay: 960,      // 2 смены × 8 ч
    daysPerWeek: 5,
    demandPerDay: 42,            // план выпуска, шт/смена-сутки
    batchSize: 20,               // партия запуска
    scrapRate: 0.025,            // брак, выявляемый на ОТК
    regrindRate: 0.04,           // возврат на перешлифовку
    dueMinutes: 480,             // обещанный срок изготовления партии единицы
    materialCost: 2340,          // стоимость заготовки, ₽/шт
    overheadPerDay: 24000,       // цеховые накладные расходы, ₽/сутки
    nodes: [
      { id: "prep",  name: "Комплектация заготовки", short: "Склад",   servers: 1, mean: 4,  cv: 0.25, rate: 520,  setup: 0,  batch: 0,  equip: 400 },
      { id: "turn",  name: "Токарная ЧПУ",           short: "Токарная", servers: 2, mean: 9,  cv: 0.30, rate: 1900, setup: 20, batch: 20, equip: 3800 },
      { id: "mill",  name: "Фрезерная ЧПУ",          short: "Фрезерная",servers: 1, mean: 8,  cv: 0.30, rate: 2300, setup: 25, batch: 20, equip: 4200 },
      { id: "drill", name: "Сверлильная",            short: "Сверловка",servers: 1, mean: 6,  cv: 0.25, rate: 1500, setup: 12, batch: 20, equip: 1200 },
      { id: "grind", name: "Шлифовальная",           short: "Шлифовка", servers: 1, mean: 21, cv: 0.22, rate: 2100, setup: 18, batch: 20, equip: 5600 },
      { id: "wash",  name: "Мойка",                  short: "Мойка",    servers: 1, mean: 3,  cv: 0.20, rate: 800,  setup: 0,  batch: 0,  equip: 600 },
      { id: "qc",    name: "ОТК",                    short: "ОТК",      servers: 2, mean: 6,  cv: 0.30, rate: 900,  setup: 0,  batch: 0,  equip: 1800 },
      { id: "pack",  name: "Упаковка",               short: "Упаковка", servers: 1, mean: 4,  cv: 0.20, rate: 700,  setup: 0,  batch: 0,  equip: 400 }
    ]
  };

  function cloneCfg(c) { return JSON.parse(JSON.stringify(c)); }

  // дочерняя конфигурация: базовая + правки сценария
  function applyScenario(base, patch) {
    var cfg = cloneCfg(base);
    cfg.label = patch.label || "Сценарий";
    cfg.id = patch.id || "s";
    cfg.description = patch.description || "";
    var over = patch.nodes || {};
    cfg.nodes.forEach(function (n) {
      if (over[n.id]) {
        Object.keys(over[n.id]).forEach(function (k) { n[k] = over[n.id][k]; });
      }
      if (patch.setupFactor) n.setup = Math.round(n.setup * patch.setupFactor * 10) / 10;
      if (patch.batchSize) n.batch = patch.batchSize;
    });
    if (patch.demandPerDay) cfg.demandPerDay = patch.demandPerDay;
    if (patch.batchSize) cfg.batchSize = patch.batchSize;
    return cfg;
  }

  // ---------- дискретно-событийное ядро ----------
  function simulate(cfg, opts) {
    opts = opts || {};
    var rand = mulberry32(opts.seed || 20261109);
    var warmupDays = opts.warmupDays != null ? opts.warmupDays : 6;
    var runDays = opts.runDays != null ? opts.runDays : 26;
    var totalDays = warmupDays + runDays;
    var day = cfg.workMinutesPerDay;
    var horizon = totalDays * day;
    var warmup = warmupDays * day;

    var nodes = cfg.nodes.map(function (n) {
      // если у операции заданы отдельные единицы оборудования — считаем по ним
      var units = n.units ? n.units.filter(function (u) { return u.enabled !== false; }) : null;
      var servers = Math.max(1, units ? units.length : n.servers);
      return {
        def: n, id: n.id,
        units: units,
        servers: servers,
        free: new Array(servers).fill(0),
        unitBusy: new Array(servers).fill(0),
        queue: [],
        busy: 0, count: 0, setupCount: 0, setupTime: 0,
        sinceSetup: n.batch || 0, queueSum: 0, queueSamples: 0, waitSum: 0
      };
    });
    var byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; });

    // куча событий
    var heap = [];
    function push(ev) {
      heap.push(ev);
      var i = heap.length - 1;
      while (i > 0) {
        var p = (i - 1) >> 1;
        if (heap[p].t <= heap[i].t) break;
        var tmp = heap[p]; heap[p] = heap[i]; heap[i] = tmp; i = p;
      }
    }
    function pop() {
      var top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        var i = 0;
        for (;;) {
          var l = 2 * i + 1, r = l + 1, m = i;
          if (l < heap.length && heap[l].t < heap[m].t) m = l;
          if (r < heap.length && heap[r].t < heap[m].t) m = r;
          if (m === i) break;
          var tmp = heap[m]; heap[m] = heap[i]; heap[i] = tmp; i = m;
        }
      }
      return top;
    }

    var jobs = [];        // все задания
    var seq = 0;
    var stats = {
      arrived: 0, good: 0, scrap: 0, onTime: 0, doneInWindow: 0,
      leadSum: 0, leadN: 0, leads: [], costSum: 0, costN: 0,
      wipSum: 0, wipSamples: 0, wip: 0
    };

    var interArrival = cfg.workMinutesPerDay / cfg.demandPerDay;
    // пуассоновский поток: экспоненциальные интервалы
    function nextArrival(t) { return t - Math.log(1 - rand()) * interArrival; }

    var tArr = nextArrival(0);
    var lastSampleT = 0;

    // текущая последовательность операций
    var route = nodes.map(function (n) { return n; });

    function enqueue(node, job, t) {
      // сервер свободен?
      var minFree = Infinity, idx = -1;
      for (var i = 0; i < node.free.length; i++) {
        if (node.free[i] < minFree) { minFree = node.free[i]; idx = i; }
      }
      if (minFree <= t + 1e-9) {
        startService(node, job, t, idx);
      } else {
        node.queue.push(job);
      }
    }

    function startService(node, job, t, serverIdx) {
      var d = node.def;
      var start = t;
      // у конкретного станка может быть своя норма времени
      var unit = node.units ? node.units[serverIdx] : null;
      var mean = unit && unit.mean ? unit.mean : d.mean;
      var proc = opTime(rand, mean, d.cv);
      var setup = 0;
      if (d.setup > 0 && d.batch > 0 && node.sinceSetup >= d.batch) {
        // переналадка: следующая партия
        setup = d.setup * (0.85 + 0.3 * rand());
        node.setupCount++;
        node.setupTime += setup;
        node.sinceSetup = 0;
      }
      if (d.batch > 0) node.sinceSetup++;
      var end = start + setup + proc;
      node.free[serverIdx] = end;
      if (start >= warmup) {
        node.busy += setup + proc;
        node.unitBusy[serverIdx] += setup + proc;
      }
      node.count++;
      node.waitSum += (start - job.enterNode);
      job.nodeStart = start;
      job.procCost += ((setup + proc) / 60) * d.rate;
      job.ops.push({ node: d.id, start: start, end: end, setup: setup, proc: proc });
      push({ t: end, kind: "depart", node: node, job: job });
    }

    function tryDispatch(node, t) {
      while (node.queue.length) {
        var minFree = Infinity, idx = -1;
        for (var i = 0; i < node.free.length; i++) {
          if (node.free[i] < minFree) { minFree = node.free[i]; idx = i; }
        }
        if (minFree > t + 1e-9) break;
        var job = node.queue.shift();
        if (minFree < t) node.free[idx] = t; // простой сервера
        startService(node, job, Math.max(t, minFree), idx);
      }
    }

    function nextStage(job, t) {
      job.stage++;
      if (job.stage >= route.length) {
        // выход: ОТК уже пройден
        var lead = t - job.arrive;
        stats.good++;
        if (lead >= 0) { stats.leadSum += lead; stats.leadN++; stats.leads.push(lead); }
        if (t > warmup) {
          stats.doneInWindow++;
          if (lead <= cfg.dueMinutes) stats.onTime++;
        }
        stats.costSum += job.procCost; stats.costN++;
        job.exit = t;
        return;
      }
      var node = route[job.stage];
      job.enterNode = t;
      enqueue(node, job, t);
    }

    var ev, guard = 0;
    while ((ev = heap.length ? pop() : null) || tArr < horizon) {
      if (guard++ > 5e6) break;
      var t = ev ? ev.t : tArr;
      if (t > horizon) break;

      // прибытия
      while (tArr <= t && tArr < horizon) {
        var job = {
          id: ++seq, arrive: tArr, stage: -1, procCost: 0, ops: [],
          enterNode: tArr, defects: 0
        };
        jobs.push(job);
        stats.arrived++;
        job.enterNode = tArr;
        nextStage(job, tArr);
        tArr = nextArrival(tArr);
      }

      // накопление WIP
      if (t - lastSampleT >= 30) {
        var live = 0;
        for (var i = 0; i < jobs.length; i++) {
          if (jobs[i].arrive <= t && (jobs[i].exit === undefined || jobs[i].exit > t) && jobs[i].arrive > warmup) live++;
        }
        stats.wipSum += live; stats.wipSamples++;
        lastSampleT = t;
      }

      if (!ev) continue;
      if (ev.kind === "depart") {
        var j = ev.job, nd = ev.node;
        if (nd.def.id === "qc") {
          if (rand() < cfg.scrapRate) {
            stats.scrap++;
            j.exit = t; j.scrap = true;
            stats.costSum += j.procCost; stats.costN++;
            continue;
          }
        }
        if (nd.def.id === "grind" && !j.reground && rand() < cfg.regrindRate) {
          j.reground = true;
          j.stage = route.indexOf(byId.grind) - 1; // вернуть на шлифовку
          nextStage(j, t + 2);
          tryDispatch(nd, t);
          continue;
        }
        tryDispatch(nd, t);
        nextStage(j, t + 2); // 2 мин — транспортировка
      }
    }

    // ---------- итоговые метрики ----------
    var windowMin = runDays * day;
    var util = nodes.map(function (n) {
      var unitLoad = {};
      if (n.units) {
        n.units.forEach(function (u, i) {
          unitLoad[u.id] = Math.min(1.6, n.unitBusy[i] / windowMin);
        });
      }
      return {
        id: n.id, name: n.def.name, short: n.def.short,
        servers: n.servers,
        utilization: Math.min(1.6, n.busy / (n.servers * windowMin)),
        setupShare: n.busy > 0 ? n.setupTime / n.busy : 0,
        avgWait: n.count ? n.waitSum / n.count : 0,
        queueAvg: (n.queue.length + (n.count ? 0 : 0)),
        count: n.count,
        unitLoad: unitLoad
      };
    });

    var leadSort = stats.leads.slice().sort(function (a, b) { return a - b; });
    function pct(p) { return leadSort.length ? leadSort[Math.min(leadSort.length - 1, Math.floor(p * leadSort.length))] : 0; }

    var goodPerDay = stats.doneInWindow / runDays;
    var varPerGood = stats.costN ? stats.costSum / stats.costN : 0;

    // себестоимость: переменная часть + накладные и амортизация на единицу + потери от брака
    var fixedPerDay = cfg.overheadPerDay;
    cfg.nodes.forEach(function (n) {
      var cnt = n.units ? n.units.filter(function (u) { return u.enabled !== false; }).length : n.servers;
      fixedPerDay += cnt * n.equip;
    });
    var fixedUnit = goodPerDay > 0 ? fixedPerDay / goodPerDay : 0;
    var scrapShare = stats.arrived ? stats.scrap / stats.arrived : 0;
    var scrapUnit = scrapShare < 0.99 ? (scrapShare / (1 - scrapShare)) * (cfg.materialCost + varPerGood) : 0;
    // «себестоимость обработки» в ТЗ — переменная часть (машино- и человеко-минуты).
    // Полная себестоимость с накладными и потерями от брака отдаётся отдельным полем.
    var costPerGood = varPerGood;
    var fullCostPerGood = varPerGood + fixedUnit + scrapUnit;

    var bottleneck = util.slice().sort(function (a, b) { return b.utilization - a.utilization; })[0];

    return {
      config: cfg,
      kpi: {
        throughput: goodPerDay,
        demand: cfg.demandPerDay,
        leadTime: stats.leadN ? stats.leadSum / stats.leadN : 0,
        leadP95: pct(0.95),
        wip: stats.wipSamples ? stats.wipSum / stats.wipSamples : 0,
        onTimeShare: stats.doneInWindow ? stats.onTime / stats.doneInWindow : 0,
        scrapShare: scrapShare,
        costPerGood: costPerGood,
        fullCost: fullCostPerGood + cfg.materialCost,
        fullCostPerGood: fullCostPerGood,
        cost: {
          material: cfg.materialCost,
          variable: varPerGood,
          fixedUnit: fixedUnit,
          scrapUnit: scrapUnit,
          fixedPerDay: fixedPerDay
        },
        bottleneck: bottleneck ? { id: bottleneck.id, short: bottleneck.short, utilization: bottleneck.utilization } : null,
        utilization: util
      },
      totals: { jobs: stats.arrived, good: stats.good, scrap: stats.scrap }
    };
  }

  // ---------- сценарии улучшений ----------
  var SCENARIOS = [
    {
      id: "asis", label: "AS-IS (как есть)", short: "AS-IS",
      description: "Текущая конфигурация: один шлифовальный станок, партия 20 шт, переналадка по норме.",
      patch: {}
    },
    {
      id: "a", label: "A. Второй шлифовальный станок", short: "A · +шлифовка",
      description: "Закупка второго шлифовального станка; устранение узкого места по мощности.",
      patch: { nodes: { grind: { servers: 2 } } }
    },
    {
      id: "b", label: "B. Быстрая переналадка (SMED)", short: "B · SMED",
      description: "Переналадка 45 % от нормы, партия запуска 10 шт, вынесение подготовки на внешнюю операцию.",
      patch: { setupFactor: 0.45, batchSize: 10 }
    },
    {
      id: "c", label: "C. A + B", short: "C · A+B",
      description: "Второй шлифовальный станок и быстрая переналадка одновременно.",
      patch: { nodes: { grind: { servers: 2 } }, setupFactor: 0.45, batchSize: 10 }
    }
  ];

  function runAll(opts) {
    var base = BASE;
    return SCENARIOS.map(function (s) {
      var meta = s.patch || {};
      var cfg = applyScenario(base, Object.assign({}, meta, { label: s.label, id: s.id, description: s.description }));
      var r = simulate(cfg, opts);
      r.id = s.id; r.label = s.label; r.short = s.short; r.description = s.description;
      return r;
    });
  }

  return { BASE: BASE, SCENARIOS: SCENARIOS, simulate: simulate, runAll: runAll, applyScenario: applyScenario };
});


