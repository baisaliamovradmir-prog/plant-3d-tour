/* sim.js — дискретно-событийная модель завода смазочных материалов (цифровой двойник).
 * Предприятие, этапы, оборудование и кейсы — те же, что в 3D-туре (ветка 3d, src/3d/api/mock).
 * Работает и в Node (module.exports), и в браузере (window.Sim).
 * Единица времени — часы, единица продукции — партия (25 т), стоимость — рубли.
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

  // ---------- базовая конфигурация завода ----------
  // stage — id этапа в 3D-туре (process_stages.id): по нему дашборд передаёт расчёт в тур.
  // Нормы этапов совпадают с 3D-туром, кроме ОТК: в туре 5,5 ч — это время партии
  // в лаборатории вместе с очередью, здесь 4,7 ч — сам анализ.
  var BASE = {
    enterprise: "Завод смазочных материалов «Демо»",
    product: "Моторное масло, партия 25 т",
    batchTons: 25,              // т в одной партии
    hoursPerDay: 24,            // непрерывное производство, 3 смены
    demandPerDay: 4.6,          // план запуска, партий/сут (115 т/сут)
    seriesSize: 2,              // партий одного продукта подряд (между переналадками)
    launchJitter: 0.15,         // запуск по графику с разбросом ±15 % интервала
    transferHours: 0.25,        // перекачка / перемещение между этапами
    correctionRate: 0.05,       // ОТК: возврат партии на корректировку в смеситель
    scrapRate: 0.005,           // ОТК: некондиция, уходит на переработку
    dueHours: 48,               // обещанный срок: от запуска партии до отгрузки
    materialCost: 2750000,      // сырьё на партию, ₽ (110 000 ₽/т)
    overheadPerDay: 180000,     // накладные расходы завода, ₽/сут
    nodes: [
      { id: "unload", stage: 1, name: "Приёмка сырья",      short: "Приёмка",    servers: 2,  mean: 2.0,  cv: 0.20, rate: 9000,  setup: 0,   batch: 0, equip: 6000 },
      { id: "tanks",  stage: 2, name: "Хранение сырья",     short: "Резервуары", servers: 10, mean: 8.0,  cv: 0.25, rate: 1125,  setup: 0,   batch: 0, equip: 2000 },
      { id: "blend",  stage: 3, name: "Смешение",           short: "Смешение",   servers: 3,  mean: 3.0,  cv: 0.15, rate: 14000, setup: 1.0, batch: 2, equip: 15000 },
      { id: "qc",     stage: 4, name: "Контроль качества",  short: "ОТК",        servers: 1,  mean: 4.7,  cv: 0.25, rate: 2550,  setup: 0,   batch: 0, equip: 9000 },
      { id: "fill",   stage: 5, name: "Фасовка",            short: "Фасовка",    servers: 1,  mean: 2.0,  cv: 0.15, rate: 10400, setup: 1.2, batch: 2, equip: 20000 },
      { id: "store",  stage: 6, name: "Хранение продукции", short: "Склад",      servers: 20, mean: 12.0, cv: 0.30, rate: 583,   setup: 0,   batch: 0, equip: 1500 },
      { id: "ship",   stage: 7, name: "Отгрузка",           short: "Отгрузка",   servers: 2,  mean: 1.5,  cv: 0.25, rate: 7333,  setup: 0,   batch: 0, equip: 4000 }
    ]
  };

  // норматив цикла: сумма норм этапов без очередей
  BASE.normHours = BASE.nodes.reduce(function (a, n) { return a + n.mean; }, 0);

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
      if (patch.setupFactor) n.setup = Math.round(n.setup * patch.setupFactor * 100) / 100;
      if (patch.seriesSize && n.batch > 0) n.batch = patch.seriesSize;
    });
    if (patch.demandPerDay) cfg.demandPerDay = patch.demandPerDay;
    if (patch.seriesSize) cfg.seriesSize = patch.seriesSize;
    return cfg;
  }

  // ---------- дискретно-событийное ядро ----------
  function simulate(cfg, opts) {
    opts = opts || {};
    var rand = mulberry32(opts.seed || 20261109);
    var warmupDays = opts.warmupDays != null ? opts.warmupDays : 6;
    var runDays = opts.runDays != null ? opts.runDays : 26;
    var totalDays = warmupDays + runDays;
    var day = cfg.hoursPerDay;
    var horizon = totalDays * day;
    var warmup = warmupDays * day;
    var transfer = cfg.transferHours || 0;
    var sampleStep = 0.5; // шаг замера WIP, ч

    var nodes = cfg.nodes.map(function (n) {
      // если у этапа заданы отдельные единицы оборудования — считаем по ним
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
        sinceSetup: n.batch || 0, waitSum: 0, serviceSum: 0
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

    var jobs = [];        // все партии
    var seq = 0;
    var stats = {
      arrived: 0, good: 0, scrap: 0, onTime: 0, doneInWindow: 0,
      leadSum: 0, leadN: 0, leads: [], costSum: 0, costN: 0,
      wipSum: 0, wipSamples: 0
    };

    // запуск партий по плану: равные интервалы с небольшим разбросом
    var interval = cfg.hoursPerDay / cfg.demandPerDay;
    var jitter = cfg.launchJitter || 0;
    function nextArrival(t) { return t + interval * (1 + jitter * (2 * rand() - 1)); }

    var tArr = nextArrival(0);
    var lastSampleT = 0;
    var route = nodes.map(function (n) { return n; });

    function enqueue(node, job, t) {
      var minFree = Infinity, idx = -1;
      for (var i = 0; i < node.free.length; i++) {
        if (node.free[i] < minFree) { minFree = node.free[i]; idx = i; }
      }
      if (minFree <= t + 1e-9) startService(node, job, t, idx);
      else node.queue.push(job);
    }

    function startService(node, job, t, serverIdx) {
      var d = node.def;
      var start = t;
      // у конкретной единицы оборудования может быть своя норма времени
      var unit = node.units ? node.units[serverIdx] : null;
      var mean = unit && unit.mean ? unit.mean : d.mean;
      var proc = opTime(rand, mean, d.cv);
      var setup = 0;
      if (d.setup > 0 && d.batch > 0 && node.sinceSetup >= d.batch) {
        // переналадка: смена продукта (промывка, форматные детали)
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
      node.serviceSum += setup + proc;
      job.procCost += (setup + proc) * d.rate;
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
        if (minFree < t) node.free[idx] = t; // простой ресурса
        startService(node, job, Math.max(t, minFree), idx);
      }
    }

    function nextStage(job, t) {
      job.stage++;
      if (job.stage >= route.length) {
        // партия отгружена
        var lead = t - job.arrive;
        stats.good++;
        if (lead >= 0) { stats.leadSum += lead; stats.leadN++; stats.leads.push(lead); }
        if (t > warmup) {
          stats.doneInWindow++;
          if (lead <= cfg.dueHours) stats.onTime++;
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

      // запуск партий
      while (tArr <= t && tArr < horizon) {
        var job = { id: ++seq, arrive: tArr, stage: -1, procCost: 0, enterNode: tArr };
        jobs.push(job);
        stats.arrived++;
        nextStage(job, tArr);
        tArr = nextArrival(tArr);
      }

      // накопление WIP
      if (t - lastSampleT >= sampleStep) {
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
        tryDispatch(nd, t);
        if (nd.def.id === "qc") {
          var r = rand();
          if (r < cfg.scrapRate) {
            stats.scrap++;
            j.exit = t; j.scrap = true;
            stats.costSum += j.procCost; stats.costN++;
            continue;
          }
          if (!j.corrected && r < cfg.scrapRate + cfg.correctionRate) {
            // корректировка присадками: обратно в смеситель, затем повторный анализ
            j.corrected = true;
            j.stage = route.indexOf(byId.blend) - 1;
            nextStage(j, t + transfer);
            continue;
          }
        }
        nextStage(j, t + transfer);
      }
    }

    // ---------- итоговые метрики ----------
    var windowH = runDays * day;
    var util = nodes.map(function (n) {
      var unitLoad = {};
      if (n.units) {
        n.units.forEach(function (u, i) {
          unitLoad[u.id] = Math.min(1.6, n.unitBusy[i] / windowH);
        });
      }
      return {
        id: n.id, stage: n.def.stage, name: n.def.name, short: n.def.short,
        servers: n.servers,
        utilization: Math.min(1.6, n.busy / (n.servers * windowH)),
        setupShare: n.busy > 0 ? n.setupTime / n.busy : 0,
        avgWait: n.count ? n.waitSum / n.count : 0,
        avgService: n.count ? n.serviceSum / n.count : 0,
        count: n.count,
        unitLoad: unitLoad
      };
    });

    var leadSort = stats.leads.slice().sort(function (a, b) { return a - b; });
    function pct(p) { return leadSort.length ? leadSort[Math.min(leadSort.length - 1, Math.floor(p * leadSort.length))] : 0; }

    var goodPerDay = stats.doneInWindow / runDays;
    var varPerGood = stats.costN ? stats.costSum / stats.costN : 0;

    // полная стоимость: переработка + накладные и оборудование на партию + потери от некондиции
    var fixedPerDay = cfg.overheadPerDay;
    cfg.nodes.forEach(function (n) {
      var cnt = n.units ? n.units.filter(function (u) { return u.enabled !== false; }).length : n.servers;
      fixedPerDay += cnt * n.equip;
    });
    var fixedUnit = goodPerDay > 0 ? fixedPerDay / goodPerDay : 0;
    var scrapShare = stats.arrived ? stats.scrap / stats.arrived : 0;
    var scrapUnit = scrapShare < 0.99 ? (scrapShare / (1 - scrapShare)) * (cfg.materialCost + varPerGood) : 0;
    // «стоимость» на экране и в 3D-туре — стоимость переработки (без сырья и накладных)
    var costPerGood = varPerGood;
    var fullCostPerGood = varPerGood + fixedUnit + scrapUnit;

    var bottleneck = util.slice().sort(function (a, b) { return b.utilization - a.utilization; })[0];

    return {
      config: cfg,
      kpi: {
        throughput: goodPerDay,               // партий/сут
        demand: cfg.demandPerDay,
        leadTime: stats.leadN ? stats.leadSum / stats.leadN : 0, // ч
        leadP95: pct(0.95),
        wip: stats.wipSamples ? stats.wipSum / stats.wipSamples : 0, // партий
        onTimeShare: stats.doneInWindow ? stats.onTime / stats.doneInWindow : 0,
        scrapShare: scrapShare,
        costPerGood: costPerGood,             // ₽/партию
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

  // ---------- сценарии улучшений (кейсы 3D-тура) ----------
  var SCENARIOS = [
    {
      id: "asis", label: "AS-IS (как есть)", short: "AS-IS",
      description: "Текущая работа: один пост анализа в ОТК, полный анализ каждой партии, переналадка линии по норме.",
      patch: {}
    },
    {
      id: "a", label: "A. Экспресс-анализ проб", short: "A · экспресс",
      description: "Кейс «Экспресс-анализ проб»: ключевые параметры на поточном анализаторе, полный анализ по графику. Анализ 4,7 → 2,4 ч.",
      patch: { nodes: { qc: { mean: 2.4 } } }
    },
    {
      id: "b", label: "B. Быстрая переналадка (SMED)", short: "B · SMED",
      description: "Кейс «Быстрая переналадка линии»: переналадка 45 % от нормы, продукт можно менять после каждой партии.",
      patch: { setupFactor: 0.45, seriesSize: 1 }
    },
    {
      id: "c", label: "C. A + B", short: "C · A+B",
      description: "Экспресс-анализ и быстрая переналадка одновременно.",
      patch: { nodes: { qc: { mean: 2.4 } }, setupFactor: 0.45, seriesSize: 1 }
    }
  ];

  function runAll(opts) {
    return SCENARIOS.map(function (s) {
      var meta = s.patch || {};
      var cfg = applyScenario(BASE, Object.assign({}, meta, { label: s.label, id: s.id, description: s.description }));
      var r = simulate(cfg, opts);
      r.id = s.id; r.label = s.label; r.short = s.short; r.description = s.description;
      return r;
    });
  }

  return { BASE: BASE, SCENARIOS: SCENARIOS, simulate: simulate, runAll: runAll, applyScenario: applyScenario };
});
