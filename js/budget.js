/* ══════════════════════════════════════════════════════════════
   budget.js — Budget tab (stats + charts)
   ══════════════════════════════════════════════════════════════ */

function renderBudget() {
  const itEC = FILTERED.map(p => p.itEcContribution || 0).filter(x => x > 0);
  const total = itEC.reduce((s, v) => s + v, 0);
  const avg = itEC.length ? total / itEC.length : 0;
  const sorted = [...FILTERED.filter(p => p.itEcContribution > 0)].sort((a, b) => a.itEcContribution - b.itEcContribution);
  const minP = sorted.length ? sorted[0] : null;
  const maxP = sorted.length ? sorted[sorted.length - 1] : null;
  const min = minP ? minP.itEcContribution : 0;
  const max = maxP ? maxP.itEcContribution : 0;

  // Average annual IT budget since 2014 (start of Horizon Europe era) to current year
  const AVG_BUDGET_START = 2012;
  const currentYear = new Date().getFullYear();
  const byYstat = {};
  FILTERED.filter(p => p.itEcContribution > 0 && p.startDate && p.endDate).forEach(p => {
    const start = new Date(p.startDate);
    const end   = new Date(p.endDate);
    const totalDays = (end - start) / 86400000 + 1;
    if (totalDays <= 0) return;
    const dailyBudget = p.itEcContribution / totalDays;
    for (let y = Math.max(start.getFullYear(), AVG_BUDGET_START); y <= Math.min(end.getFullYear(), currentYear); y++) {
      const yearStart    = new Date(y, 0, 1);
      const yearEnd      = new Date(y, 11, 31);
      const overlapStart = start > yearStart ? start : yearStart;
      const overlapEnd   = end   < yearEnd   ? end   : yearEnd;
      const daysInYear   = (overlapEnd - overlapStart) / 86400000 + 1;
      if (daysInYear > 0) byYstat[y] = (byYstat[y] || 0) + dailyBudget * daysInYear;
    }
  });
  const statYears = Object.keys(byYstat);
  const avgAnnual = statYears.length
    ? Object.values(byYstat).reduce((s, v) => s + v, 0) / statYears.length
    : 0;

  document.getElementById('budget-stats').innerHTML = `
    <div class="stat-card"><div class="stat-val">${FILTERED.length}</div><div class="stat-lbl">Projects</div><div class="stat-sub">${itEC.length} with known IT budget</div></div>
    <div class="stat-card"><div class="stat-val">${fmtM(total)}</div><div class="stat-lbl">Total IT EU Contribution</div></div>
    <div class="stat-card"><div class="stat-val">${fmtM(avg)}</div><div class="stat-lbl">Average per project</div></div>
    <div class="stat-card"><div class="stat-val">${fmtM(min)}</div><div class="stat-lbl">Smallest</div>${minP ? `<div class="stat-sub">${minP.acronym || minP.title}</div>` : ''}</div>
    <div class="stat-card"><div class="stat-val">${fmtM(max)}</div><div class="stat-lbl">Largest</div>${maxP ? `<div class="stat-sub">${maxP.acronym || maxP.title}</div>` : ''}</div>
    <div class="stat-card"><div class="stat-val">${fmtM(avgAnnual)}</div><div class="stat-lbl">Avg annual budget</div><div class="stat-sub">Since 2012 (post FP6)</div></div>`;

  // Histogram — only projects with known IT budget (excludes 0€ via INRAE)
  const bins   = [0, 100, 200, 300, 400, 500, Infinity];
  const labels = ['<100k', '100–200k', '200–300k', '300–400k', '400–500k', '>500k'];
  const counts = new Array(labels.length).fill(0);
  const noKnownBudget = itEC.length === 0;

  if (!noKnownBudget) {
    itEC.forEach(v => {
      const k = v / 1000;
      const i = bins.findIndex((b, j) => k < bins[j + 1]);
      if (i >= 0) counts[i]++;
    });
  }

  destroyChart('chart-hist');
  const nobudgetPlugin = noKnownBudget ? [{
    id: 'nobudget',
    afterDraw(chart) {
      const { ctx, width, height } = chart;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(107,114,128,.7)';
      ctx.font = '13px Lato, sans-serif';
      ctx.fillText('No known IT budget (funded via INRAE)', width / 2, height / 2);
      ctx.restore();
    }
  }] : [];
  CHARTS['chart-hist'] = new Chart(document.getElementById('chart-hist'), {
    type: 'bar',
    data: { labels, datasets: [{ data: counts, backgroundColor: 'rgba(37,99,171,.7)', borderRadius: 3, label: 'Projects' }] },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { title: t => t[0].label, label: c => `${c.raw} project${c.raw !== 1 ? 's' : ''}` } }
      },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }
    },
    plugins: nobudgetPlugin
  });

  // By scheme group
  const bySG = {};
  FILTERED.forEach(p => { const g = p.schemeGroup || 'Other'; if (!bySG[g]) bySG[g] = { count: 0, total: 0 }; bySG[g].count++; bySG[g].total += (p.itEcContribution || 0); });
  const sgE = Object.entries(bySG).filter(e => e[1].total > 0).sort((a, b) => b[1].total - a[1].total);
  destroyChart('chart-scheme');
  CHARTS['chart-scheme'] = new Chart(document.getElementById('chart-scheme'), {
    type: 'doughnut',
    data: { labels: sgE.map(e => `${e[0]} (${fmtM(e[1].total)})`), datasets: [{ data: sgE.map(e => +(e[1].total / 1e6).toFixed(2)), backgroundColor: PAL }] },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } }, tooltip: { callbacks: { label: c => `${c.label.split(' (')[0]}: ${c.raw} M€` } } } }
  });

  // Annual budget by programme — stacked bar with prorata distribution
  const byYProg = {};
  FILTERED.filter(p => p.itEcContribution > 0 && p.startDate && p.endDate).forEach(p => {
    const prog = normProg(p);
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    const totalDays = (end - start) / 86400000 + 1;
    if (totalDays <= 0) return;
    const dailyBudget = p.itEcContribution / totalDays;
    for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
      const yearStart = new Date(y, 0, 1);
      const yearEnd   = new Date(y, 11, 31);
      const overlapStart = start > yearStart ? start : yearStart;
      const overlapEnd   = end   < yearEnd   ? end   : yearEnd;
      const daysInYear = (overlapEnd - overlapStart) / 86400000 + 1;
      if (daysInYear > 0) {
        if (!byYProg[y]) byYProg[y] = {};
        byYProg[y][prog] = (byYProg[y][prog] || 0) + dailyBudget * daysInYear;
      }
    }
  });
  const years = Object.keys(byYProg).sort();
  const PROG_ORDER = ['FP7', 'H2020', 'HORIZON'];
  const PROG_LABELS = { 'FP7': 'FP7', 'H2020': 'H2020', 'HORIZON': 'Horizon Europe' };
  destroyChart('chart-time');
  CHARTS['chart-time'] = new Chart(document.getElementById('chart-time'), {
    type: 'bar',
    data: {
      labels: years,
      datasets: PROG_ORDER
        .filter(prog => years.some(y => byYProg[y]?.[prog] > 0))
        .map(prog => ({
          label: PROG_LABELS[prog],
          data: years.map(y => +((byYProg[y]?.[prog] || 0) / 1e6).toFixed(2)),
          backgroundColor: PROG_COLORS[prog],
          borderRadius: 2,
        }))
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { display: true, position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } },
        tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.raw} M€` } }
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true, title: { display: true, text: 'M€' }, grid: { color: 'rgba(0,0,0,.04)' } }
      }
    }
  });
}
