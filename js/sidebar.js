/* ══════════════════════════════════════════════════════════════
   sidebar.js — Sidebar filter construction
   ══════════════════════════════════════════════════════════════ */

function buildSidebar() {
  buildList('f-programme', 'programme', [...new Set(IT_PROJECTS.map(p => p.programme))].sort(), p => p.programme);

  const itRoles = [...new Set(IT_PROJECTS.map(p => p.itRole).filter(Boolean))].sort();
  buildList('f-it-role', 'itRole', itRoles, p => p.itRole, roleL);

  // Scheme groups
  const sgCounts = {};
  IT_PROJECTS.forEach(p => { sgCounts[p.schemeGroup] = (sgCounts[p.schemeGroup] || 0) + 1; });
  const sgEl = document.getElementById('f-scheme-group');
  sgEl.innerHTML = Object.keys(SCHEME_GROUPS).filter(g => sgCounts[g]).map(g => `
    <label class="ci"><input type="checkbox" data-key="schemeGroup" value="${g}">
    ${g}<span class="cc">${sgCounts[g] || 0}</span></label>`).join('');

  buildList('f-status', 'status', [...new Set(IT_PROJECTS.map(p => p.status).filter(Boolean))].sort(), p => p.status);

  const ctries = [...new Set(IT_PROJECTS.flatMap(p => p.partnerCountries))].sort();
  buildList('f-country', 'country', ctries, p => p.partnerCountries, cc => flag(cc) + ' ' + cc);
}

function buildList(elId, key, vals, getter, labelFn) {
  const el = document.getElementById(elId);
  const c = {};
  IT_PROJECTS.forEach(p => {
    const v = getter(p);
    if (v === null || v === undefined || v === '') return;
    if (Array.isArray(v)) v.forEach(x => { c[x] = (c[x] || 0) + 1; });
    else c[v] = (c[v] || 0) + 1;
  });
  el.innerHTML = vals.map(v => `<label class="ci">
    <input type="checkbox" data-key="${key}" value="${v}">
    ${labelFn ? labelFn(v) : v}<span class="cc">${c[v] || 0}</span></label>`).join('');
}
