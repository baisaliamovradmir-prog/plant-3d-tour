/* app.js — интерфейс прототипа: параметры, KPI, загрузка, оборудование, сценарии, 3D-тур */
(function () {
  "use strict";

  var fmt1 = function (v) { return (Math.round(v * 10) / 10).toFixed(1).replace(".", ","); };
  var fmt0 = function (v) { return String(Math.round(v)); };
  var el = function (id) { return document.getElementById(id); };

  // ---------------------------------------------------------------- оборудование
  // Каждая строка — отдельная единица оборудования. idx — номер внутри операции.
  var MACHINES = [
    { key: "prep#0",  node: "prep",  name: "Зона комплектации",  model: "стеллаж, 6 полок",  op: "Склад" },
    { key: "turn#0",  node: "turn",  name: "Токарный ЧПУ №1",    model: "Haas ST-20",        op: "Токарная" },
    { key: "turn#1",  node: "turn",  name: "Токарный ЧПУ №2",    model: "Haas ST-20",        op: "Токарная" },
    { key: "mill#0",  node: "mill",  name: "Фрезерный центр",    model: "DMG Mori CMX 600",  op: "Фрезерная" },
    { key: "drill#0", node: "drill", name: "Сверлильный станок", model: "2Н135",             op: "Сверловка" },
    { key: "grind#0", node: "grind", name: "Шлифовальный №1",    model: "3М131",             op: "Шлифовка" },
    { key: "grind#1", node: "grind", name: "Шлифовальный №2",    model: "3М131 · резерв",    op: "Шлифовка", off: true },
    { key: "wash#0",  node: "wash",  name: "Моечная машина",     model: "ROSLER R-100",      op: "Мойка" },
    { key: "qc#0",    node: "qc",    name: "Пост ОТК №1",        model: "Zeiss Contura",     op: "ОТК" },
    { key: "qc#1",    node: "qc",    name: "Пост ОТК №2",        model: "визуальный контроль", op: "ОТК" },
    { key: "pack#0",  node: "pack",  name: "Упаковочный пост",   model: "Titan P-200",       op: "Упаковка" }
  ];

  function baseMean(nodeId) {
    var n = Sim.BASE.nodes.filter(function (x) { return x.id === nodeId; })[0];
    return n ? n.mean : 10;
  }

  var unitState = {};
  function resetUnits() {
    MACHINES.forEach(function (m) {
      unitState[m.key] = { enabled: !m.off, mean: baseMean(m.node) };
    });
  }
  resetUnits();

  var SEEDS = [1109, 2027, 3301, 4507, 5501];
  var OPTS = { warmupDays: 6, runDays: 26 };
  var SEED_CENTER = 26;

  // вариация выборки: при положении 26 получаем ровно те же seed, что в ТЗ
  function activeSeeds() {
    var v = +el("seed").value - SEED_CENTER;
    if (!v) return SEEDS;
    return SEEDS.map(function (s) { return s + v * 37; });
  }

  // ---------------------------------------------------------------- расчёт
  function buildConfig() {
    var cfg = JSON.parse(JSON.stringify(Sim.BASE));
    cfg.demandPerDay = +el("demand").value;
    cfg.batchSize = +el("batch").value;
    var setupFactor = +el("setup").value / 100;

    cfg.nodes.forEach(function (n) {
      var own = MACHINES.filter(function (m) { return m.node === n.id; });
      if (own.length) {
        n.units = own.map(function (m) {
          var st = unitState[m.key];
          return { id: m.key, label: m.name, enabled: st.enabled, mean: st.mean };
        });
        // если все единицы выключены — оставляем одну, иначе операция «исчезает»
        if (!n.units.some(function (u) { return u.enabled; })) {
          n.units[0].enabled = true;
          unitState[own[0].key].enabled = true;
        }
        n.servers = n.units.filter(function (u) { return u.enabled; }).length;
      }
      if (n.setup > 0) n.setup = Math.round(n.setup * setupFactor * 10) / 10;
      if (n.batch > 0) n.batch = cfg.batchSize;
    });
    return cfg;
  }

  function average(list, pick) {
    return list.reduce(function (a, r) { return a + pick(r); }, 0) / list.length;
  }

  function runOnce(cfg, seed) {
    return Sim.simulate(cfg, { warmupDays: OPTS.warmupDays, runDays: OPTS.runDays, seed: seed });
  }

  function summarize(runs) {
    var k = runs.map(function (r) { return r.kpi; });
    var util = k[0].utilization.map(function (u, i) {
      return {
        id: u.id, short: u.short, servers: u.servers,
        utilization: average(k, function (x) { return x.utilization[i].utilization; }) * 100,
        setupShare: average(k, function (x) { return x.utilization[i].setupShare; }) * 100,
        avgWait: average(k, function (x) { return x.utilization[i].avgWait; }),
        unitLoad: (function () {
          var map = {};
          MACHINES.forEach(function (m) {
            var vals = k.map(function (x) {
              var uu = x.utilization[i].unitLoad || {};
              return uu[m.key];
            }).filter(function (v) { return v !== undefined; });
            if (vals.length) map[m.key] = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length * 100;
          });
          return map;
        })()
      };
    });
    return {
      throughput: average(k, function (x) { return x.throughput; }),
      leadTime: average(k, function (x) { return x.leadTime; }),
      leadP95: average(k, function (x) { return x.leadP95; }),
      wip: average(k, function (x) { return x.wip; }),
      onTimeShare: average(k, function (x) { return x.onTimeShare; }) * 100,
      scrapShare: average(k, function (x) { return x.scrapShare; }) * 100,
      costPerGood: average(k, function (x) { return x.costPerGood; }),
      utilization: util,
      demand: k[0].demand
    };
  }

  var state = { run: null, poi: 2, loc: 2, timer: null, running: false };

  // базовые сценарии считаем тем же способом, что и настраиваемый: 5 репликаций
  var BASELINE = null;
  function getBaseline() {
    if (BASELINE) return BASELINE;
    BASELINE = Sim.SCENARIOS.map(function (s) {
      var cfg = Sim.applyScenario(JSON.parse(JSON.stringify(Sim.BASE)), s.patch);
      var runs = SEEDS.map(function (seed) { return Sim.simulate(cfg, { warmupDays: 6, runDays: 26, seed: seed }); });
      return { id: s.id, label: s.label, short: s.short, kpi: summarize(runs) };
    });
    return BASELINE;
  }

  function runModel() {
    state.running = true;
    el("run-chip").textContent = "пересчёт…";
    var cfg = buildConfig();
    var t0 = performance.now();
    var runs = activeSeeds().map(function (seed) { return runOnce(cfg, seed); });
    var res = summarize(runs);
    res.ms = performance.now() - t0;
    res.cfg = cfg;
    state.run = res;
    state.running = false;
    render();
  }

  function scheduleRun() {
    el("run-chip").textContent = "пересчёт…";
    clearTimeout(state.timer);
    state.timer = setTimeout(runModel, 220);
  }

  // ---------------------------------------------------------------- отрисовка KPI
  function kpi(id, value, decimals, note, cls) {
    animateNumber(el(id), value, decimals);
    if (note !== undefined && note !== null) {
      var n = el(id + "-note");
      if (n) { n.textContent = note; n.className = "kpi-foot" + (cls ? " " + cls : ""); }
    }
  }

  function render() {
    var r = state.run;
    if (!r) return;

    el("k-plan").textContent = r.demand;
    kpi("k-out", r.throughput, 1, r.throughput >= r.demand ? "план выполняется" : "−" + fmt1(r.demand - r.throughput) + " к плану",
        r.throughput >= r.demand ? "good" : "bad");
    kpi("k-lead", r.leadTime, 0, "p95 " + fmt0(r.leadP95) + " мин · норма 480",
        r.leadTime <= 480 ? "good" : "bad");
    kpi("k-ontime", r.onTimeShare, 0, "доля ≤ 480 мин", r.onTimeShare >= 95 ? "good" : "bad");
    kpi("k-wip", r.wip, 1, "среднее за окно", r.wip <= 12 ? "good" : "bad");

    // загрузка по операциям
    var host = el("util");
    host.innerHTML = "";
    var worst = r.utilization[0];
    r.utilization.forEach(function (u) {
      if (u.utilization > worst.utilization) worst = u;
      var row = document.createElement("div");
      row.className = "util-row";
      row.dataset.node = u.id;
      var hot = u.utilization >= 90;
      row.innerHTML =
        '<span class="util-name">' + u.short + "</span>" +
        '<span class="util-track"><i class="util-fill' + (hot ? " hot" : "") + '" style="width:' +
        Math.min(100, u.utilization).toFixed(1) + '%"></i></span>' +
        '<span class="util-val">' + fmt0(u.utilization) + " %</span>" +
        '<span class="util-wait">' + fmt0(u.avgWait) + " мин</span>";
      host.appendChild(row);
    });

    // узкое место
    el("bottleneck-name").textContent = worst.short;
    el("bottleneck-value").textContent = fmt0(worst.utilization) + " % загрузки";
    el("bottleneck-text").textContent = worst.utilization >= 90
      ? "Операция ограничивает выпуск: очередь растёт, цикл участка увеличивается. Это же место показано в 3D-туре."
      : "Ограничение снято: загрузка ниже 90 %, очередь перед операцией не накапливается.";
    el("bottleneck-wait").textContent = fmt0(worst.avgWait) + " мин";
    el("bottleneck-setup").textContent = fmt0(worst.setupShare) + " %";
    el("cost").textContent = fmt0(r.costPerGood) + " ₽/шт";

    // таблица сценариев
    var rows = el("scenario-rows");
    rows.innerHTML = "";
    var custom = { id: "custom", label: "Настраиваемый (экран)", short: "Настройка", kpi: r };
    var list = getBaseline().concat([custom]);
    list.forEach(function (s) {
      var k = s.kpi;
      var tr = document.createElement("tr");
      if (s.id === "c") tr.className = "best";
      if (s.id === "custom") tr.className = "custom";
      tr.innerHTML =
        "<td>" + (s.id === "custom" ? "Настраиваемый сценарий" : s.label) + "</td>" +
        '<td class="num">' + fmt0(k.leadTime) + "</td>" +
        '<td class="num">' + fmt1(k.throughput) + "</td>" +
        '<td class="num">' + fmt0(k.onTimeShare) + "</td>" +
        '<td class="num">' + fmt1(k.wip) + "</td>" +
        '<td class="num">' + fmt0(k.costPerGood) + " ₽</td>";
      rows.appendChild(tr);
    });

    // диаграмма цикла
    var chart = el("lead-chart");
    chart.innerHTML = "";
    var maxLead = Math.max.apply(null, list.map(function (s) { return s.kpi.leadTime; }));
    list.forEach(function (s) {
      var h = Math.max(6, s.kpi.leadTime / maxLead * 100);
      var b = document.createElement("div");
      b.className = "bar" + (s.id === "c" ? " best" : "") + (s.id === "custom" ? " custom" : "");
      b.innerHTML = '<span>' + fmt0(s.kpi.leadTime) + "</span>" +
        '<div class="bar-area"><i style="height:' + h.toFixed(1) + '%"></i></div><span>' +
        (s.id === "asis" ? "AS-IS" : s.id === "c" ? "C" : s.id === "custom" ? "свой" : s.id.toUpperCase()) + "</span>";
      chart.appendChild(b);
    });

    updateMachines();
    el("run-chip").textContent = "прогон " + Math.round(r.ms) + " мс · 5 репликаций";
    renderScene();
    renderPoi();
  }

  // ---------------------------------------------------------------- оборудование
  function renderMachines() {
    var host = el("machine-grid");
    host.innerHTML = "";
    MACHINES.forEach(function (m) {
      var card = document.createElement("article");
      card.className = "machine";
      card.dataset.key = m.key;
      card.innerHTML =
        '<div class="machine-head">' +
          '<div><div class="machine-name">' + m.name + '</div>' +
          '<div class="machine-op">' + m.op + " · " + m.model + "</div></div>" +
          '<button type="button" class="switch" data-toggle="' + m.key + '">—</button>' +
        "</div>" +
        '<div class="machine-row"><span>Норма, мин/шт</span><b data-norm-val="' + m.key + '">—</b></div>' +
        '<input type="range" min="2" max="40" step="0.5" data-norm="' + m.key + '" aria-label="Норма времени: ' + m.name + '">' +
        '<div class="machine-row"><span>Загрузка станка</span><b data-load="' + m.key + '">—</b></div>' +
        '<div class="machine-bar"><i data-bar="' + m.key + '"></i></div>';
      host.appendChild(card);
    });

    // синхронизация ползунков с состоянием
    MACHINES.forEach(function (m) {
      var st = unitState[m.key];
      var input = host.querySelector('[data-norm="' + m.key + '"]');
      input.value = st.mean;
      host.querySelector('[data-norm-val="' + m.key + '"]').textContent = fmt1(st.mean);
    });

    updateMachines();
  }

  function updateMachines() {
    var host = el("machine-grid");
    if (!host || !host.children.length) return;
    var r = state.run;
    MACHINES.forEach(function (m) {
      var st = unitState[m.key];
      var card = host.querySelector('[data-key="' + m.key + '"]');
      if (!card) return;
      var sw = card.querySelector('[data-toggle]');
      sw.textContent = st.enabled ? "В работе" : "Простой";
      sw.className = "switch" + (st.enabled ? " on" : "");
      card.classList.toggle("is-off", !st.enabled);

      var load = null;
      if (r && st.enabled) {
        var u = r.utilization.filter(function (x) { return x.id === m.node; })[0];
        if (u && u.unitLoad && u.unitLoad[m.key] !== undefined) load = u.unitLoad[m.key];
      }
      var valEl = card.querySelector('[data-load="' + m.key + '"]');
      var bar = card.querySelector('[data-bar="' + m.key + '"]');
      if (load === null) {
        valEl.textContent = "—";
        bar.style.width = "0%";
        bar.className = "";
        card.classList.remove("is-hot");
      } else {
        var hot = load >= 90;
        valEl.textContent = fmt0(load) + " %";
        bar.style.width = Math.min(100, load).toFixed(1) + "%";
        bar.className = hot ? "hot" : "";
        card.classList.toggle("is-hot", hot);
      }
    });

    var enabledCount = MACHINES.filter(function (m) { return unitState[m.key].enabled; }).length;
    var disabled = MACHINES.filter(function (m) { return !unitState[m.key].enabled; })
      .map(function (m) { return m.name; });
    el("machines-summary").textContent = "В расчёте " + enabledCount + " из " + MACHINES.length +
      " единиц" + (disabled.length ? " · вне расчёта: " + disabled.join(", ") : "");
  }

  function normChanged(key, value) {
    unitState[key].mean = value;
    var host = el("machine-grid");
    var val = host.querySelector('[data-norm-val="' + key + '"]');
    if (val) val.textContent = fmt1(value);
    scheduleRun();
  }

  el("machine-grid").addEventListener("input", function (e) {
    var input = e.target;
    if (!input.dataset || !input.dataset.norm) return;
    normChanged(input.dataset.norm, parseFloat(input.value));
  });

  el("machine-grid").addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-toggle]") : null;
    if (!btn) return;
    var key = btn.dataset.toggle;
    var m = MACHINES.filter(function (x) { return x.key === key; })[0];
    var st = unitState[key];
    if (st.enabled) {
      // нельзя выключить последнюю единицу операции
      var siblings = MACHINES.filter(function (x) { return x.node === m.node && unitState[x.key].enabled; });
      if (siblings.length <= 1) {
        el("machines-summary").textContent = "Нельзя выключить последнюю единицу операции «" + m.op + "»";
        return;
      }
      st.enabled = false;
    } else {
      st.enabled = true;
    }
    updateMachines();
    scheduleRun();
  });

  el("machines-reset").addEventListener("click", function () {
    resetUnits();
    MACHINES.forEach(function (m) {
      var input = el("machine-grid").querySelector('[data-norm="' + m.key + '"]');
      if (input) input.value = unitState[m.key].mean;
      var val = el("machine-grid").querySelector('[data-norm-val="' + m.key + '"]');
      if (val) val.textContent = fmt1(unitState[m.key].mean);
    });
    updateMachines();
    runModel();
  });

  // ---------------------------------------------------------------- логотип и боковая панель
  (function initBrand() {
    var img = el("brand-logo");
    var ph = el("brand-ph");
    if (!img || !ph) return;
    var showLogo = function () { img.hidden = false; ph.hidden = true; };
    var showPh = function () { img.hidden = true; ph.hidden = false; };
    img.addEventListener("load", function () { if (img.naturalWidth > 0) showLogo(); });
    img.addEventListener("error", showPh);
    if (img.complete) { if (img.naturalWidth > 0) showLogo(); else showPh(); }
  })();

  var SIDE_KEY = "kontur.sidebar";

  function applySidebar(mode) {
    var hidden = mode === "off";
    document.body.classList.toggle("side-collapsed", hidden);
    var btn = el("side-toggle");
    if (btn) btn.setAttribute("aria-expanded", hidden ? "false" : "true");
  }

  function toggleSidebar() {
    var hidden = document.body.classList.contains("side-collapsed");
    var next = hidden ? "on" : "off";
    applySidebar(next);
    try { localStorage.setItem(SIDE_KEY, next); } catch (e) {}
  }

  if (el("side-toggle")) el("side-toggle").addEventListener("click", toggleSidebar);
  (function initSidebar() {
    var saved = null;
    try { saved = localStorage.getItem(SIDE_KEY); } catch (e) {}
    // на телефоне панель по умолчанию свёрнута, чтобы контент начинался сразу
    if (!saved) saved = window.innerWidth <= 900 ? "off" : "on";
    applySidebar(saved);
  })();

  // ---------------------------------------------------------------- анимации
  function initReveal() {
    if (!("IntersectionObserver" in window)) return;
    var items = Array.prototype.slice.call(document.querySelectorAll(".kpis, .grid2, section.card"));
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-in");
        io.unobserve(en.target);
        setTimeout(function () { en.target.style.transitionDelay = "0ms"; }, 900);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });

    items.forEach(function (n, i) {
      n.classList.add("reveal");
      if (n.getBoundingClientRect().top < window.innerHeight) {
        n.style.transitionDelay = Math.min(i, 6) * 45 + "ms";
      }
      io.observe(n);
    });
  }

  var animSeq = 0;
  function animateNumber(node, to, decimals) {
    if (!node) return;
    var from = parseFloat(String(node.textContent).replace(/\s/g, "").replace(",", "."));
    var token = ++animSeq;
    node.__anim = token;
    if (!isFinite(from) || Math.abs(from - to) < 0.05) {
      node.textContent = decimals ? fmt1(to) : fmt0(to);
      return;
    }
    var t0 = performance.now();
    var dur = 420;
    function step(now) {
      if (node.__anim !== token) return;
      var p = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      var v = from + (to - from) * e;
      node.textContent = decimals ? fmt1(v) : fmt0(v);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ---------------------------------------------------------------- навигация
  var NAV_IDS = ["dash", "process", "machines", "scenarios", "tour", "about"];
  var pinnedNav = null;

  function setActive(id) {
    Array.prototype.forEach.call(document.querySelectorAll(".nav a"), function (a) {
      a.classList.toggle("on", a.dataset.target === id);
    });
  }

  // клик по меню фиксирует пункт: плавная прокрутка не должна «перехватывать» подсветку
  function pinNav(id) {
    pinnedNav = id;
    setActive(id);
  }

  function unpinNav() {
    pinnedNav = null;
  }

  function spy() {
    if (pinnedNav) { setActive(pinnedNav); return; }
    var probe = window.innerHeight * 0.25;
    var active = NAV_IDS[0];
    NAV_IDS.forEach(function (id) {
      var s = el(id);
      if (!s) return;
      if (s.getBoundingClientRect().top <= probe) active = id;
    });
    // последняя секция может не доставать до линии чтения — включаем её в самом низу страницы
    var doc = document.documentElement;
    var maxScroll = Math.max(0, doc.scrollHeight - window.innerHeight);
    var lastEl = el(NAV_IDS[NAV_IDS.length - 1]);
    if (maxScroll > 0 && window.scrollY >= maxScroll - 2 && lastEl &&
        lastEl.getBoundingClientRect().top < window.innerHeight * 0.8) {
      active = NAV_IDS[NAV_IDS.length - 1];
    }
    setActive(active);
  }

  function queueSpy() {
    requestAnimationFrame(function () { spy(); });
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { spy(); ticking = false; });
  }, { passive: true });
  window.addEventListener("resize", queueSpy);
  window.addEventListener("load", queueSpy);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueSpy);
  setTimeout(queueSpy, 300);

  // собственная прокрутка пользователя снимает фиксацию
  ["wheel", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, unpinNav, { passive: true });
  });
  window.addEventListener("keydown", function (e) {
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].indexOf(e.key) >= 0) unpinNav();
  });

  Array.prototype.forEach.call(document.querySelectorAll(".nav a"), function (a) {
    a.addEventListener("click", function () { pinNav(a.dataset.target); });
  });

  // ---------------------------------------------------------------- изометрия
  var cv = el("scene");
  var ctx = cv.getContext("2d");
  var pins = [];
  var W = 1120, H = 440;
  var OX = 470, OY = 150, SX = 15.2, SY = 8.0, SZ = 15.2;

  function proj(x, y, z) {
    return [OX + (x - z) * SX, OY + (x + z) * SY - y * SZ];
  }

  // холст рисуется в логических координатах 1120×440, но с разрешением под экран
  function fitCanvas() {
    var rect = cv.getBoundingClientRect();
    if (!rect.width) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(rect.width * dpr);
    var h = Math.round(rect.height * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    ctx.setTransform(dpr * rect.width / W, 0, 0, dpr * rect.height / H, 0, 0);
  }

  function poly(pts, fill, stroke) {
    ctx.beginPath();
    pts.forEach(function (p, i) {
      var q = proj(p[0], p[1], p[2]);
      if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
    });
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }

  function box(x, z, w, d, h, top, left, right) {
    poly([[x, h, z], [x + w, h, z], [x + w, h, z + d], [x, h, z + d]], top, null);
    poly([[x, 0, z + d], [x + w, 0, z + d], [x + w, h, z + d], [x, h, z + d]], left, null);
    poly([[x + w, 0, z], [x + w, 0, z + d], [x + w, h, z + d], [x + w, h, z]], right, null);
  }

  function drawScene() {
    fitCanvas();
    ctx.clearRect(0, 0, W, H);
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#F2F6FB");
    g.addColorStop(1, "#E4ECF5");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    poly([[0, 0, 0], [26, 0, 0], [26, 0, 14], [0, 0, 14]], "#EEF3F9", "#DCE4EE");
    ctx.strokeStyle = "#E3EAF2";
    for (var gx = 2; gx < 26; gx += 2) {
      var a = proj(gx, 0, 0), b = proj(gx, 0, 14);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    for (var gz = 2; gz < 14; gz += 2) {
      var c = proj(0, 0, gz), d2 = proj(26, 0, gz);
      ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(d2[0], d2[1]); ctx.stroke();
    }
    poly([[0, 0, 0], [26, 0, 0], [26, 6, 0], [0, 6, 0]], "#F7FAFD", "#E3EAF2");
    poly([[0, 0, 0], [0, 0, 14], [0, 6, 14], [0, 6, 0]], "#F1F6FB", "#E3EAF2");
    for (var i = 0; i < 5; i++) {
      var x0 = 3 + i * 4.4;
      poly([[x0, 2.4, 0], [x0 + 3, 2.4, 0], [x0 + 3, 5.2, 0], [x0, 5.2, 0]], "#D3E6F8", null);
    }
    for (var k = 0; k < 3; k++) box(1.2, 1.4 + k * 1.4, 4.2, 1.0, 2.4, "#E3EAF3", "#C2D0E0", "#ADBED2");
    box(7.6, 1.6, 3.2, 2.2, 2.4, "#DCE6F2", "#B9C9DD", "#A3B6CD");
    box(11.6, 1.6, 3.2, 2.2, 2.4, "#DCE6F2", "#B9C9DD", "#A3B6CD");
    box(15.6, 1.6, 3.6, 2.2, 2.6, "#DCE6F2", "#B9C9DD", "#A3B6CD");
    box(20.0, 1.6, 2.6, 2.2, 2.2, "#DCE6F2", "#B9C9DD", "#A3B6CD");
    box(8.4, 6.6, 3.4, 2.2, 2.5, "#F3E4DF", "#DCB9AF", "#C9A399");
    box(12.6, 6.4, 2.4, 1.8, 1.4, "#DCE7F3", "#BACBDE", "#A6B9CF");
    box(16.2, 6.6, 3.0, 1.6, 1.0, "#E4EBF4", "#C4D2E2", "#AFC0D4");
    box(20.6, 6.6, 2.6, 1.8, 1.2, "#E7EDF5", "#C8D5E4", "#B3C4D8");
    box(5.4, 5.0, 18.6, 0.7, 0.55, "#D5DFEA", "#B6C6D9", "#A2B4C9");

    pins = [
      { id: 0, x: 3.0, y: 3.0, z: 3.0, label: "Склад", n: 1 },
      { id: 1, x: 10.6, y: 3.0, z: 2.6, label: "Наладка", n: 4 },
      { id: 2, x: 10.1, y: 3.2, z: 7.8, label: "Узкое место", n: 7 },
      { id: 3, x: 17.6, y: 2.4, z: 7.4, label: "ОТК", n: 10 }
    ];
    pins.forEach(function (p) {
      var q = proj(p.x, p.y, p.z);
      p.sx = q[0];
      p.sy = q[1];
      var active = state.poi === p.id;
      var col = active ? "#D9552B" : "#2E6FD0";
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(q[0], q[1]);
      ctx.lineTo(q[0], q[1] - 34);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(q[0], q[1] - 44, active ? 14 : 12, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(p.n), q[0], q[1] - 43);
      ctx.font = "11px Segoe UI, sans-serif";
      var tw = ctx.measureText(p.label).width + 14;
      ctx.fillStyle = "rgba(255,255,255,.92)";
      ctx.fillRect(q[0] - tw / 2, q[1] - 76, tw, 18);
      ctx.strokeStyle = "#E2E9F3";
      ctx.lineWidth = 1;
      ctx.strokeRect(q[0] - tw / 2, q[1] - 76, tw, 18);
      ctx.fillStyle = "#42536B";
      ctx.fillText(p.label, q[0], q[1] - 66);
    });
  }

  function renderScene() { drawScene(); }

  // ---------------------------------------------------------------- точки интереса
  var POI = [
    { tag: "POI-01 · склад", node: "prep", title: "Буфер заготовок", text: "Запас на входе участка. Метрика WIP показывает, сколько деталей одновременно находится в производстве.",
      metric: function (r) { return ["WIP", fmt1(r.wip) + " шт"]; } },
    { tag: "POI-04 · токарный участок", node: "turn", title: "Наладка и партия", text: "Переналадка занимает до 9 % времени станка. SMED сокращает переход между партиями и позволяет работать мелкими партиями.",
      metric: function (r) { var t = r.utilization.filter(function (u) { return u.id === "turn"; })[0];
        return ["доля переналадки", fmt0(t ? t.setupShare : 0) + " %"]; } },
    { tag: "POI-07 · шлифовальная", node: "grind", title: "Узкое место участка", text: "Операция ограничивает выпуск: очередь растёт, цикл увеличивается. Второй станок снимает ограничение — включите его в разделе «Оборудование».",
      metric: function (r) { var g = r.utilization.filter(function (u) { return u.id === "grind"; })[0];
        return ["загрузка станка", fmt0(g ? g.utilization : 0) + " %"]; } },
    { tag: "POI-10 · ОТК", node: "qc", title: "Контроль и брак", text: "Брак выявляется на контроле и уходит в изолятор. Доля брака учитывается в расчёте себестоимости годной детали.",
      metric: function (r) { return ["доля брака", fmt1(r.scrapShare) + " %"]; } }
  ];

  function renderPoi() {
    var r = state.run;
    if (!r) return;
    var p = POI[state.poi];
    el("poi-tag").textContent = p.tag;
    el("poi-title").textContent = p.title;
    el("poi-text").textContent = p.text;
    var m = p.metric(r);
    el("poi-metric-label").textContent = m[0];
    el("poi-metric").textContent = m[1];
  }

  cv.addEventListener("click", function (e) {
    var rect = cv.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (W / rect.width);
    var y = (e.clientY - rect.top) * (H / rect.height);
    var hit = null;
    pins.forEach(function (p) {
      var dx = x - p.sx, dy = y - (p.sy - 44);
      if (Math.sqrt(dx * dx + dy * dy) < 18) hit = p;
    });
    if (hit) {
      state.poi = hit.id;
      state.loc = hit.id;
      syncRoute();
      renderScene();
      renderPoi();
      el("tour").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  function syncRoute() {
    Array.prototype.forEach.call(el("route").children, function (b) {
      b.classList.toggle("on", +b.dataset.loc === state.loc);
    });
  }

  el("route").addEventListener("click", function (e) {
    if (e.target.tagName !== "BUTTON") return;
    state.loc = +e.target.dataset.loc;
    state.poi = state.loc;
    syncRoute();
    renderScene();
    renderPoi();
  });

  el("poi-link").addEventListener("click", function () {
    var poi = POI[state.poi];
    el("process").scrollIntoView({ behavior: "smooth", block: "center" });
    // подсвечиваем строку операции, к которой относится точка
    Array.prototype.forEach.call(document.querySelectorAll(".util-row"), function (row) {
      row.classList.remove("is-flash");
    });
    var target = document.querySelector('.util-row[data-node="' + poi.node + '"]');
    if (target) {
      target.classList.remove("is-flash");
      void target.offsetWidth;           // перезапуск анимации
      target.classList.add("is-flash");
      setTimeout(function () { target.classList.remove("is-flash"); }, 2000);
    }
    pinNav("process");
  });

  el("to-tour").addEventListener("click", function () {
    el("tour").scrollIntoView({ behavior: "smooth", block: "start" });
    pinNav("tour");
  });

  // ---------------------------------------------------------------- поля параметров
  var map = { demand: "v-demand", batch: "v-batch", setup: "v-setup", seed: "v-seed" };
  Object.keys(map).forEach(function (id) {
    var input = el(id);
    var out = el(map[id]);
    var sync = function () {
      out.textContent = id === "setup" ? input.value + " %" : input.value;
      if (id === "seed") out.textContent = "№" + input.value;
    };
    input.addEventListener("input", function () { sync(); scheduleRun(); });
    sync();
  });

  el("run").addEventListener("click", function () { runModel(); });

  // ---------------------------------------------------------------- старт
  renderMachines();
  initReveal();
  runModel();
  syncRoute();
  spy();
})();
