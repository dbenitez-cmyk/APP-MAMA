(function () {
  "use strict";

  var STORAGE_KEY = "md6_cierres_caja";

  var DENOMINATIONS = [
    { valor: 50, label: "50€" },
    { valor: 20, label: "20€" },
    { valor: 10, label: "10€" },
    { valor: 5, label: "5€" },
    { valor: 2, label: "2€" },
    { valor: 1, label: "1€" },
    { valor: 0.5, label: "0.50€" },
    { valor: 0.2, label: "0.20€" },
    { valor: 0.1, label: "0.10€" },
    { valor: 0.05, label: "0.05€" },
    { valor: 0.02, label: "0.02€" },
    { valor: 0.01, label: "0.01€" }
  ];

  var SHIFT_ORDER = { "Mañana": 0, "Tarde": 1, "Noche": 2 };

  var state = {
    currentShift: null,
    piezas: {},      // valor -> cantidad de piezas (numero)
    calendarDate: new Date() // mes que se está mostrando en el calendario
  };

  // ---------- STORAGE ----------
  function loadRecords() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Error leyendo almacenamiento local", e);
      return [];
    }
  }

  function saveRecords(records) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch (e) {
      console.error("Error guardando en almacenamiento local", e);
      return false;
    }
  }

  function addRecord(record) {
    var records = loadRecords();
    records.push(record);
    return saveRecords(records);
  }

  // ---------- HELPERS ----------
  function formatMoney(n) {
    return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function dateKey(isoOrDate) {
    // devuelve YYYY-MM-DD a partir de un string de fecha (tal cual se guardó) o Date
    if (isoOrDate instanceof Date) {
      var m = String(isoOrDate.getMonth() + 1).padStart(2, "0");
      var d = String(isoOrDate.getDate()).padStart(2, "0");
      return isoOrDate.getFullYear() + "-" + m + "-" + d;
    }
    return String(isoOrDate).slice(0, 10);
  }

  function showToast(msg) {
    var toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      toast.classList.remove("show");
    }, 2200);
  }

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(function (s) {
      s.classList.remove("active");
    });
    document.getElementById(id).classList.add("active");
  }

  // ---------- PANTALLA DE CONTEO ----------
  function buildCountTable() {
    var tbody = document.getElementById("count-tbody");
    tbody.innerHTML = "";
    state.piezas = {};

    DENOMINATIONS.forEach(function (den, idx) {
      var tr = document.createElement("tr");

      if (idx === 0) {
        var tdFecha = document.createElement("td");
        tdFecha.className = "cell-fecha";
        tdFecha.rowSpan = DENOMINATIONS.length;
        var fechaInput = document.createElement("input");
        fechaInput.type = "date";
        fechaInput.className = "fecha-input";
        fechaInput.id = "input-fecha";
        fechaInput.value = todayISO();
        tdFecha.appendChild(fechaInput);
        tr.appendChild(tdFecha);

        var tdTpv = document.createElement("td");
        tdTpv.className = "cell-tpv";
        tdTpv.rowSpan = DENOMINATIONS.length;
        var tpvInput = document.createElement("input");
        tpvInput.type = "text";
        tpvInput.className = "tpv-input";
        tpvInput.id = "input-tpv";
        tpvInput.placeholder = "TPV";
        tdTpv.appendChild(tpvInput);
        tr.appendChild(tdTpv);
      }

      var tdMoneda = document.createElement("td");
      tdMoneda.className = "cell-moneda";
      tdMoneda.textContent = den.label;
      tr.appendChild(tdMoneda);

      var tdPiezas = document.createElement("td");
      var piezasInput = document.createElement("input");
      piezasInput.type = "number";
      piezasInput.className = "piezas-input";
      piezasInput.inputMode = "numeric";
      piezasInput.min = "0";
      piezasInput.step = "1";
      piezasInput.placeholder = "0";
      piezasInput.dataset.valor = den.valor;
      piezasInput.addEventListener("input", onPiezasChange);
      tdPiezas.appendChild(piezasInput);
      tr.appendChild(tdPiezas);

      var tdEfectivo = document.createElement("td");
      tdEfectivo.className = "cell-efectivo";
      tdEfectivo.id = "efectivo-" + den.valor.toString().replace(".", "_");
      tdEfectivo.textContent = formatMoney(0);
      tr.appendChild(tdEfectivo);

      tbody.appendChild(tr);
    });

    updateTotals();
  }

  function onPiezasChange(e) {
    var input = e.target;
    var valor = parseFloat(input.dataset.valor);
    var raw = input.value.trim();
    var piezas = raw === "" ? 0 : Math.max(0, parseInt(raw, 10) || 0);
    state.piezas[valor] = piezas;

    var efectivo = valor * piezas;
    var cell = document.getElementById("efectivo-" + valor.toString().replace(".", "_"));
    if (cell) cell.textContent = formatMoney(efectivo);

    updateTotals();
  }

  function updateTotals() {
    var totalEfectivo = 0;
    var totalPiezas = 0;
    DENOMINATIONS.forEach(function (den) {
      var piezas = state.piezas[den.valor] || 0;
      totalPiezas += piezas;
      totalEfectivo += den.valor * piezas;
    });
    document.getElementById("total-piezas").textContent = totalPiezas;
    document.getElementById("total-efectivo").textContent = formatMoney(totalEfectivo);
  }

  function startShift(shift) {
    state.currentShift = shift;
    document.getElementById("shift-footer-value").textContent = shift;
    buildCountTable();
    showScreen("screen-count");
  }

  function finishCount() {
    var fecha = document.getElementById("input-fecha").value || todayISO();
    var tpv = document.getElementById("input-tpv").value.trim();

    var monedas = DENOMINATIONS.map(function (den) {
      var piezas = state.piezas[den.valor] || 0;
      return {
        valor: den.valor,
        label: den.label,
        piezas: piezas,
        efectivo: round2(den.valor * piezas)
      };
    });

    var total = round2(monedas.reduce(function (sum, m) { return sum + m.efectivo; }, 0));

    var record = {
      id: "c_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      fecha: fecha,
      turno: state.currentShift,
      tpv: tpv,
      monedas: monedas,
      total: total,
      createdAt: new Date().toISOString()
    };

    var ok = addRecord(record);
    if (ok) {
      showToast("Cierre de caja guardado correctamente");
    } else {
      showToast("No se pudo guardar el cierre. Comprueba el espacio disponible.");
    }

    state.currentShift = null;
    showScreen("screen-home");
  }

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  // ---------- CALENDARIO ----------
  var MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  function openCalendar() {
    state.calendarDate = new Date();
    renderCalendar();
    document.getElementById("modal-calendar").classList.add("open");
  }

  function closeCalendar() {
    document.getElementById("modal-calendar").classList.remove("open");
  }

  function renderCalendar() {
    var records = loadRecords();
    var byDay = {};
    records.forEach(function (r) {
      var key = dateKey(r.fecha);
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(r);
    });

    var year = state.calendarDate.getFullYear();
    var month = state.calendarDate.getMonth();

    document.getElementById("cal-month-label").textContent =
      MONTH_NAMES[month] + " " + year;

    var firstOfMonth = new Date(year, month, 1);
    // Lunes = 0 ... Domingo = 6
    var startOffset = (firstOfMonth.getDay() + 6) % 7;
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    var grid = document.getElementById("cal-grid");
    grid.innerHTML = "";

    for (var i = 0; i < startOffset; i++) {
      var empty = document.createElement("div");
      empty.className = "cal-day empty";
      grid.appendChild(empty);
    }

    var todayKey = dateKey(new Date());

    for (var d = 1; d <= daysInMonth; d++) {
      var cellDate = new Date(year, month, d);
      var key = dateKey(cellDate);
      var cell = document.createElement("div");
      cell.className = "cal-day";
      if (key === todayKey) cell.classList.add("today");

      var span = document.createElement("span");
      span.textContent = d;
      cell.appendChild(span);

      if (byDay[key]) {
        cell.classList.add("has-data");
        var dot = document.createElement("div");
        dot.className = "dot";
        cell.appendChild(dot);
        cell.addEventListener("click", (function (dayRecords, dayLabel) {
          return function () {
            openDayDetail(dayRecords, dayLabel);
          };
        })(byDay[key], key));
      }

      grid.appendChild(cell);
    }
  }

  function changeCalendarMonth(delta) {
    state.calendarDate = new Date(
      state.calendarDate.getFullYear(),
      state.calendarDate.getMonth() + delta,
      1
    );
    renderCalendar();
  }

  // ---------- DETALLE DE DIA ----------
  function openDayDetail(records, dayKey) {
    var sorted = records.slice().sort(function (a, b) {
      return (SHIFT_ORDER[a.turno] ?? 99) - (SHIFT_ORDER[b.turno] ?? 99);
    });

    var body = document.getElementById("day-detail-body");
    body.innerHTML = "";

    var parts = dayKey.split("-");
    document.getElementById("day-detail-title").textContent =
      "Cierres del " + parts[2] + "/" + parts[1] + "/" + parts[0];

    sorted.forEach(function (record) {
      body.appendChild(renderDayCard(record));
    });

    document.getElementById("modal-day").classList.add("open");
  }

  function closeDayDetail() {
    document.getElementById("modal-day").classList.remove("open");
  }

  function renderDayCard(record) {
    var card = document.createElement("div");
    card.className = "day-card";

    var header = document.createElement("div");
    header.className = "day-card-header";
    header.innerHTML =
      "<span>Turno: " + escapeHtml(record.turno) + "</span>" +
      "<span>" + escapeHtml(record.fecha) + "</span>";
    card.appendChild(header);

    var table = document.createElement("table");
    var thead = document.createElement("thead");
    thead.innerHTML =
      "<tr><th>MONEDA</th><th>PIEZAS</th><th>EFECTIVO</th></tr>";
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    record.monedas.forEach(function (m) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + escapeHtml(m.label) + "</td>" +
        "<td>" + m.piezas + "</td>" +
        "<td>" + formatMoney(m.efectivo) + "</td>";
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    var tfoot = document.createElement("tfoot");
    var trTotal = document.createElement("tr");
    trTotal.className = "total-row";
    trTotal.innerHTML =
      "<td colspan=\"2\" style=\"text-align:right;padding-right:8px;\">TOTAL</td>" +
      "<td>" + formatMoney(record.total) + "</td>";
    tfoot.appendChild(trTotal);
    table.appendChild(tfoot);

    card.appendChild(table);

    var footer = document.createElement("div");
    footer.className = "day-card-footer";
    footer.textContent = "TPV: " + (record.tpv || "-");
    card.appendChild(footer);

    return card;
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  // ---------- SERVICE WORKER (PWA offline) ----------
  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("service-worker.js").catch(function (err) {
          console.warn("No se pudo registrar el service worker", err);
        });
      });
    }
  }

  // ---------- EVENTOS ----------
  function init() {
    document.querySelectorAll(".shift-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        startShift(btn.dataset.shift);
      });
    });

    document.getElementById("btn-back-home").addEventListener("click", function () {
      showScreen("screen-home");
    });

    document.getElementById("btn-finish").addEventListener("click", finishCount);

    document.getElementById("btn-open-calendar").addEventListener("click", openCalendar);
    document.getElementById("cal-close").addEventListener("click", closeCalendar);
    document.getElementById("cal-prev").addEventListener("click", function () {
      changeCalendarMonth(-1);
    });
    document.getElementById("cal-next").addEventListener("click", function () {
      changeCalendarMonth(1);
    });

    document.getElementById("day-close").addEventListener("click", closeDayDetail);

    document.getElementById("modal-calendar").addEventListener("click", function (e) {
      if (e.target.id === "modal-calendar") closeCalendar();
    });
    document.getElementById("modal-day").addEventListener("click", function (e) {
      if (e.target.id === "modal-day") closeDayDetail();
    });

    registerServiceWorker();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
