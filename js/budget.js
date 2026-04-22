/* ══════════════════════════════════════════════════════════════
   budget.js — Budget tab (stats + charts)
   ══════════════════════════════════════════════════════════════ */

function renderBudget() {
  const itEC = FILTERED.map(p => p.itEcContribution || 0).filter(x => x > 0);
  const total = itEC.reduce((s, v) => s + v, 0);
  const avg = itEC.length ? total / itEC.length : 0;
  const sorted = [...itEC].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const max = sorted.length ? sorted[sorted.length - 1] : 0;

  document.getElementById('budget-stats').innerHTML = `
    <div class="stat-card"><div class="stat-val">${FILTERED.length}</div><div class="stat-lbl">Projects</div><div class="stat-sub">${itEC.length} with known IT budget</div></div>
    <div class="stat-card"><div class="stat-val">${fmtM(total)}</div><div class="stat-lbl">Total IT EU Contribution</div></div>
    <div class="stat-card"><div class="stat-val">${fmtM(avg)}</div><div class="stat-lbl">Average per project</div></div>
    <div class="stat-card"><div class="stat-val">${fmtM(median)}</div><div class="stat-lbl">Median</div></div>
    <div class="stat-card"><div class="stat-val">${fmtM(max)}</div><div class="stat-lbl">Largest</div></div>
    <div class="stat-card"><div class="stat-val">${FILTERED.filter(p => p.itRole === 'associatedPartner').length}</div><div class="stat-lbl">As Assoc. Partner</div></div>`;

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
  const sgE = Object.entries(bySG).sort((a, b) => b[1].count - a[1].count);
  destroyChart('chart-scheme');
  CHARTS['chart-scheme'] = new Chart(document.getElementById('chart-scheme'), {
    type: 'doughnut',
    data: { labels: sgE.map(e => `${e[0]} (${e[1].count})`), datasets: [{ data: sgE.map(e => e[1].count), backgroundColor: PAL }] },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } } } }
  });

  // Time evolution
  const byY = {};
  FILTERED.filter(p => p.itEcContribution > 0).forEach(p => {
    const y = fmtY(p.startDate); if (!y) return;
    if (!byY[y]) byY[y] = { total: 0, count: 0 };
    byY[y].total += p.itEcContribution; byY[y].count++;
  });
  FILTERED.forEach(p => {
    const y = fmtY(p.startDate); if (!y) return;
    if (!byY[y]) byY[y] = { total: 0, count: 0 };
    if (!p.itEcContribution || p.itEcContribution === 0) byY[y].count++;
  });
  const years = Object.keys(byY).sort();
  destroyChart('chart-time');
  CHARTS['chart-time'] = new Chart(document.getElementById('chart-time'), {
    type: 'bar',
    data: {
      labels: years, datasets: [
        { label: 'IT EU contribution (M€)', data: years.map(y => +(byY[y].total / 1e6).toFixed(2)), backgroundColor: 'rgba(37,99,171,.7)', yAxisID: 'y', order: 2 },
        { label: 'Number of IT projects', data: years.map(y => byY[y].count), type: 'line', borderColor: 'rgba(146,96,10,1)', backgroundColor: 'rgba(146,96,10,.1)', yAxisID: 'y1', tension: .3, order: 1, pointRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'M€' }, grid: { color: 'rgba(0,0,0,.04)' } },
        y1: { beginAtZero: true, position: 'right', title: { display: true, text: 'Projects' }, grid: { drawOnChartArea: false } }
      },
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 14 } } }
    }
  });
}
