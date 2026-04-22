/* ══════════════════════════════════════════════════════════════
   timeline.js — Timeline tab (Gantt + concurrent projects chart)
   ══════════════════════════════════════════════════════════════ */

function renderTimeline() {
  const gf = document.getElementById('gantt-filter').value;
  const gs = document.getElementById('gantt-sort').value;
  let proj = FILTERED.filter(p => (gf === 'ALL' || p.status === 'SIGNED') && p.startDate && p.endDate);
  if (gs === 'end-desc') proj.sort((a, b) => b.endDate.localeCompare(a.endDate));
  else proj.sort((a, b) => a.endDate.localeCompare(b.endDate));

  if (!proj.length) {
    document.getElementById('gantt-wrap').innerHTML = '<div class="empty"><span class="big">∅</span>No projects to display.</div>';
    return;
  }

  const allD = proj.flatMap(p => [p.startDate, p.endDate]).filter(Boolean);
  let minD = new Date(allD.reduce((a, b) => a < b ? a : b));
  let maxD = new Date(allD.reduce((a, b) => a > b ? a : b));
  minD = new Date(minD.getFullYear(), minD.getMonth() - 1, 1);
  maxD = new Date(maxD.getFullYear(), maxD.getMonth() + 2, 1);
  const totalMs = maxD - minD;

  // Year ticks
  const ticks = [];
  let t = new Date(minD.getFullYear(), 0, 1);
  while (t <= maxD) { if (t >= minD) ticks.push(new Date(t)); t = new Date(t.getFullYear() + 1, 0, 1); }

  const today = new Date();
  const todayPct = Math.max(0, Math.min(100, (today - minD) / totalMs * 100));
  const pct = d => Math.max(0, (new Date(d) - minD) / totalMs * 100);
  const w = (s, e) => Math.max(0.5, (new Date(e) - new Date(s)) / totalMs * 100);

  const head = `<div class="gantt-head">
    <div class="g-label-col">Project</div>
    <div class="g-months">${ticks.map(d => `<div class="g-tick">${d.getFullYear()}</div>`).join('')}</div>
  </div>`;

  const STATUS_COLOR = {
    'SIGNED': 'var(--it)',
    'CLOSED': '#92600a',
  };

  const rows = proj.map(p => {
    const barColor = STATUS_COLOR[p.status] || 'var(--ink-light)';
    return `<div class="g-row">
      <div class="g-name" onclick="openModal('${p.id}','${p.programme}')" title="${p.title}">${p.acronym || '–'}</div>
      <div style="flex:1;position:relative;height:13px">
        <div class="g-bar" style="left:${pct(p.startDate)}%;width:${w(p.startDate, p.endDate)}%;background:${barColor};opacity:.85"
             onclick="openModal('${p.id}','${p.programme}')"
             title="${p.acronym} | ${fmtD(p.startDate)} → ${fmtD(p.endDate)} | ${p.status} | IT: ${roleL(p.itRole)}"></div>
        <div style="position:absolute;top:0;bottom:0;width:1.5px;background:var(--red);opacity:.4;left:${todayPct}%;pointer-events:none"></div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('gantt-wrap').innerHTML = head + rows;

  // Simultaneous active projects per year
  const allProj = FILTERED.filter(p => p.startDate && p.endDate);
  if (allProj.length) {
    const years = [];
    const minY = Math.min(...allProj.map(p => parseInt(p.startDate)));
    const maxY = Math.max(...allProj.map(p => parseInt(p.endDate)));
    for (let y = minY; y <= maxY; y++) years.push(y);

    const concurrent = years.map(y => ({
      y,
      count: allProj.filter(p => {
        const s = parseInt(p.startDate);
        const e = parseInt(p.endDate);
        return s <= y && e >= y;
      }).length
    }));

    destroyChart('chart-concurrent');
    CHARTS['chart-concurrent'] = new Chart(document.getElementById('chart-concurrent'), {
      type: 'bar',
      data: {
        labels: concurrent.map(d => d.y),
        datasets: [{
          label: 'Active IT projects',
          data: concurrent.map(d => d.count),
          backgroundColor: concurrent.map(d => d.y === new Date().getFullYear() ? 'rgba(37,99,171,1)' : 'rgba(37,99,171,.6)'),
          borderRadius: 3
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => `${c.raw} active project${c.raw !== 1 ? 's' : ''}` } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, title: { display: true, text: 'Active projects' } },
          x: { title: { display: true, text: 'Year' } }
        }
      }
    });
  }
}
