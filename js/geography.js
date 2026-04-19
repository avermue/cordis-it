/* ══════════════════════════════════════════════════════════════
   geography.js — Geography tab (choropleth, regions, charts)
   ══════════════════════════════════════════════════════════════ */

let GEO_PATHS = null;
let GEO_CC = null;

async function loadGeoPaths() {
  if (GEO_PATHS) return;
  try {
    const r = await fetch(GEO_PATHS_URL);
    const data = await r.json();
    GEO_PATHS = data.paths;
    GEO_CC = data.cc;
  } catch (e) {
    console.warn('Could not load geo paths:', e);
    GEO_PATHS = {};
    GEO_CC = {};
  }
}

function renderGeo() {
  const cc = {};
  FILTERED.forEach(p => p.partnerCountries.forEach(c => { cc[c] = (cc[c] || 0) + 1; }));
  const sorted = Object.entries(cc).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted.filter(([c]) => c !== 'FR').length ? sorted.filter(([c]) => c !== 'FR')[0][1] : 1;

  // Count unique organisations per country
  const orgsByCountry = {};
  FILTERED.forEach(p => (p.partners || []).forEach(o => {
    if (!o.country) return;
    if (!orgsByCountry[o.country]) orgsByCountry[o.country] = new Set();
    orgsByCountry[o.country].add(o.name);
  }));
  const orgCount = {};
  Object.entries(orgsByCountry).forEach(([c, s]) => { orgCount[c] = s.size; });

  // Choropleth (async load geo paths if needed)
  if (GEO_PATHS) {
    renderChoropleth(cc, maxCount, orgCount);
  } else {
    loadGeoPaths().then(() => renderChoropleth(cc, maxCount, orgCount));
  }

  // Top 10 sans FR
  const top10 = sorted.filter(([c]) => c !== 'FR').slice(0, 10);
  destroyChart('chart-countries');
  CHARTS['chart-countries'] = new Chart(document.getElementById('chart-countries'), {
    type: 'bar',
    data: {
      labels: top10.map(([c]) => CC_NORM[c] || c),
      datasets: [{ data: top10.map(([, n]) => n), backgroundColor: 'rgba(37,99,171,.75)', borderRadius: 3 }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.raw} participations` } } },
      scales: { x: { beginAtZero: true, ticks: { font: { size: 10 } } }, y: { ticks: { font: { size: 11 } } } }
    }
  });

  // Region tiles
  const countryBudget = {};
  FILTERED.forEach(p => (p.partners || []).forEach(o => {
    if (!o.country) return;
    countryBudget[o.country] = (countryBudget[o.country] || 0) + (o.ecContribution || 0);
  }));
  const rData = {};
  Object.keys(REGIONS).forEach(r => rData[r] = { count: 0, budget: 0, countries: [] });
  Object.entries(cc).forEach(([c, n]) => {
    const r = getRegion(c);
    if (!rData[r]) rData[r] = { count: 0, budget: 0, countries: [] };
    rData[r].count += (n || 0);
    rData[r].budget += (countryBudget[c] || 0);
    rData[r].countries.push(c);
  });
  const maxR = Math.max(...Object.values(rData).map(d => d.count), 1);
  const sortedRegions = Object.entries(rData).filter(([, d]) => d.count > 0).sort((a, b) => b[1].count - a[1].count);
  document.getElementById('region-grid').innerHTML = sortedRegions.map(([r, d]) => {
    const flags = d.countries.sort((a, b) => (cc[b] || 0) - (cc[a] || 0)).slice(0, 6).map(flag).join(' ');
    const budgetStr = d.budget > 0 ? fmtM(d.budget) : '–';
    const isActive = REGION_FILTER === r;
    return `<div class="region-card ${isActive ? 'region-active' : ''}" onclick="toggleRegion('${r}')"
      style="cursor:pointer;transition:all .15s;${isActive ? 'border-color:var(--it);box-shadow:0 0 0 2px var(--it-pale);' : ''}"
      onmouseover="if(!${isActive})this.style.borderColor='var(--it-light)'"
      onmouseout="if(!${isActive})this.style.borderColor='var(--rule)'">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
        <div class="region-name" style="${isActive ? 'color:var(--it)' : ''}">${r}</div>
        ${isActive ? `<span style="font-size:.6rem;color:var(--it);cursor:pointer" onclick="event.stopPropagation();toggleRegion('${r}')">✕</span>` : ''}
      </div>
      <div style="font-size:.78rem;margin:3px 0">${flags}</div>
      <div class="rbar-wrap"><div class="rbar-fill" style="width:${d.count / maxR * 100}%;${isActive ? 'background:var(--it);' : ''}"></div></div>
      <div class="rstat">${d.count} · ${budgetStr}</div>
    </div>`;
  }).join('');

  // Stacked area — regions over time
  const REG_ORDER = Object.keys(REGIONS).filter(r => r !== 'Other').concat(['Other']);
  const REG_COLORS_T = {
    'Western Europe':            'rgba(37,99,171,.80)',
    'Northern Europe':           'rgba(14,165,197,.80)',
    'Southern Europe':           'rgba(234,88,12,.80)',
    'Central & Eastern Europe':  'rgba(124,58,237,.80)',
    'North America':             'rgba(16,185,129,.80)',
    'China, Hong Kong & Taiwan': 'rgba(220,38,38,.80)',
    'Other':                     'rgba(156,163,175,.60)',
  };
  const byYearReg = {};
  FILTERED.forEach(p => {
    const y = (p.startDate || '').slice(0, 4);
    if (!y || y < '2013') return;
    if (!byYearReg[y]) byYearReg[y] = {};
    const seen = new Set();
    p.partnerCountries.forEach(c => {
      const r = getRegion(c);
      if (!seen.has(r)) { byYearReg[y][r] = (byYearReg[y][r] || 0) + 1; seen.add(r); }
    });
  });
  const years = Object.keys(byYearReg).sort();
  const yearTotals = {};
  years.forEach(y => { yearTotals[y] = Object.values(byYearReg[y] || {}).reduce((s, v) => s + v, 0) || 1; });
  destroyChart('chart-region-time');
  CHARTS['chart-region-time'] = new Chart(document.getElementById('chart-region-time'), {
    type: 'line',
    data: {
      labels: years,
      datasets: REG_ORDER.filter(r => sortedRegions.some(([sr]) => sr === r)).map(r => ({
        label: r,
        data: years.map(y => Math.round(((byYearReg[y]?.[r] || 0) / yearTotals[y]) * 100)),
        backgroundColor: REG_COLORS_T[r] || 'rgba(156,163,175,.6)',
        borderColor: (REG_COLORS_T[r] || 'rgba(156,163,175,.6)').replace('.80)', '.95)').replace('.60)', '.85)'),
        borderWidth: 1, fill: true, tension: 0.35, pointRadius: 2,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}%` } }
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true, max: 100, title: { display: true, text: '%' }, ticks: { callback: v => v + '%' } }
      }
    }
  });
}

/* ── Choropleth rendering ── */
function renderChoropleth(cc, maxCount, orgCount) {
  const svg = document.getElementById('geo-map');
  if (!svg || !GEO_PATHS) return;

  function getColor(count, isFR) {
    if (isFR) return '#4a5568';
    if (!count) return '#e8f0fb';
    const t = Math.pow(count / maxCount, 0.5);
    const r = Math.round(200 + (26 - 200) * t);
    const g = Math.round(220 + (79 - 220) * t);
    const b = Math.round(245 + (138 - 245) * t);
    return `rgb(${r},${g},${b})`;
  }

  let html = `<rect width="391" height="333" fill="#dbeafe" rx="6" opacity=".35"/>`;

  Object.entries(GEO_PATHS).forEach(([geoCode, path]) => {
    let count = 0, orgs = 0, cordisCode = '';
    Object.entries(GEO_CC).forEach(([c, g]) => {
      if (g === geoCode) {
        count += (cc[c] || 0);
        orgs += (orgCount[c] || 0);
        if (!cordisCode && (cc[c] || 0)) cordisCode = c;
      }
    });
    const isFR = geoCode === 'FR';
    const col = getColor(count, isFR);
    const stroke = (count || isFR) ? '#1a4f8a' : '#a8c4de';
    const sw = (count || isFR) ? 0.8 : 0.4;
    html += `<path d="${path}" fill="${col}" stroke="${stroke}" stroke-width="${sw}"
      onmouseover="geoHover(event,'${geoCode}',${count},${orgs})"
      onmouseout="document.getElementById('geo-tooltip').style.display='none'"/>`;
  });

  svg.innerHTML = html;

  const legendEl = document.getElementById('geo-legend-scale');
  if (legendEl) {
    legendEl.innerHTML = Array.from({ length: 6 }, (_, i) => {
      const count = Math.round(i / 5 * maxCount);
      return `<div style="width:18px;height:10px;border-radius:2px;background:${getColor(count, false)};border:1px solid #a8c4de" title="${count}"></div>`;
    }).join('');
  }
}

function geoHover(e, code, count, orgs) {
  const tip = document.getElementById('geo-tooltip');
  const wrap = document.getElementById('geo-map-wrap');
  if (!tip || !wrap) return;
  const rect = wrap.getBoundingClientRect();
  tip.style.display = 'block';
  tip.style.left = (e.clientX - rect.left + 10) + 'px';
  tip.style.top = (e.clientY - rect.top - 32) + 'px';
  const name = CC_NAMES[code] || code;
  if (!count) {
    tip.innerHTML = `<strong>${name}</strong> · no data`;
  } else {
    tip.innerHTML = `<strong>${name}</strong> · ${count} participation${count > 1 ? 's' : ''}<br><span style="font-size:.75rem;opacity:.85">${orgs} organisation${orgs > 1 ? 's' : ''}</span>`;
  }
}

function toggleCountry(code) {
  const normCode = CC_NORM[code] || code;
  if (FILTERS.country.has(code) || FILTERS.country.has(normCode)) {
    FILTERS.country.delete(code); FILTERS.country.delete(normCode);
  } else {
    FILTERS.country.add(code);
  }
  document.querySelectorAll('[data-key="country"]').forEach(cb => {
    if (cb.value === code || cb.value === normCode) cb.checked = FILTERS.country.has(cb.value);
  });
  apply();
}
