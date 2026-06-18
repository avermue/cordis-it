/* =================================================================
   export.js - Excel exports for filtered Projects and Partners
   ================================================================= */

function exportDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function exportScopeSlug() {
  return (VIEW_MODE || 'ALL').toLowerCase();
}

function ensureExcelLibrary() {
  if (window.XLSX) return true;
  alert('Excel export is not available. Please check your connection and try again.');
  return false;
}

function writeExcelFile(sheetName, fileName, headers, rows, widths) {
  if (!ensureExcelLibrary()) return;
  if (!rows.length) {
    alert(`No ${sheetName.toLowerCase()} to export.`);
    return;
  }
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = (widths || headers.map(() => 18)).map(wch => ({ wch }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

function asNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n !== 0 ? n : '';
}

function sortedProjectPartners(p) {
  const rk = { coordinator: 0, participant: 1, associatedPartner: 2, thirdParty: 3 };
  return [...(p.partners || [])].sort((a, b) =>
    (rk[a.role] ?? 9) - (rk[b.role] ?? 9) || (a.name || '').localeCompare(b.name || '', 'en')
  );
}

function projectCoordinatorList(p) {
  return sortedProjectPartners(p)
    .filter(o => o.role === 'coordinator')
    .map(o => `${o.name || ''}${o.country ? ` (${o.country})` : ''}`)
    .join('; ');
}

function projectPartnerList(p) {
  return sortedProjectPartners(p).map(o => {
    const bits = [
      o.name || '',
      o.shortName ? `[${o.shortName}]` : '',
      o.country || '',
      roleL(o.role),
      o.activityType || '',
      o.ecContribution ? `${o.ecContribution} EUR` : ''
    ].filter(Boolean);
    return bits.join(' | ');
  }).join('; ');
}

function exportProjectsExcel() {
  const headers = [
    'Project ID', 'Acronym', 'Title', 'Programme', 'Status', 'Type of action',
    'Funding scheme', 'Legal basis', 'Topic(s)', 'Start date', 'End date',
    'Total cost EUR', 'Total EU contribution EUR', 'IT participant', 'IT role',
    'IT EU contribution EUR', 'INRAE participant', 'INRAE role',
    'INRAE EU contribution EUR', 'Partner count', 'Partner countries',
    'Coordinator(s)', 'Partner organisations', 'Keywords', 'Domains', 'Objective', 'CORDIS URL'
  ];

  const rows = FILTERED.map(p => [
    p.id || '',
    p.acronym || '',
    p.title || '',
    p.frameworkProgramme || p.programme || '',
    p.status || '',
    p.schemeGroup || '',
    p.fundingScheme || '',
    p.legalBasis || '',
    p.topics || '',
    p.startDate || '',
    p.endDate || '',
    asNumber(p.totalCost),
    asNumber(p.ecMaxContribution),
    p.hasIT ? 'Yes' : 'No',
    p.hasIT ? roleL(p.itRole) : '',
    p.hasIT ? asNumber(p.itEcContribution) : '',
    p.hasINRAE ? 'Yes' : 'No',
    p.hasINRAE ? roleL(p.inraeRole) : '',
    p.hasINRAE ? asNumber(p.inraeEcContribution) : '',
    p.partnerCount || 0,
    (p.partnerCountries || []).join('; '),
    projectCoordinatorList(p),
    projectPartnerList(p),
    p.keywords || '',
    (p.domains || []).join('; '),
    p.objective || '',
    p.cordisUrl || ''
  ]);

  writeExcelFile(
    'Projects',
    `cordis-it-projects-${exportScopeSlug()}-${exportDateStamp()}.xlsx`,
    headers,
    rows,
    [14, 14, 42, 14, 12, 14, 26, 16, 28, 12, 12, 16, 20, 14, 16, 20, 16, 16, 22, 14, 20, 34, 54, 30, 28, 72, 36]
  );
}

function exportPartnersExcel() {
  const projectHeader = (document.getElementById('partners-proj-col')?.textContent || 'Projects').trim();
  const headers = [
    'Organisation', 'Abbrev.', 'Country', 'Region', 'Type', 'PIC', projectHeader,
    'Total EU contribution EUR', 'CORDIS organisation URL'
  ];
  const CORDIS_ORG = 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/how-to-participate/org-details/';

  const rows = (window._partnerExportRows || []).map(o => {
    const country = CC_NORM[o.country] || o.country;
    return [
      o.name || '',
      o.shortName || '',
      o.country || '',
      getRegion(country),
      o.activityType || '',
      o.pic || '',
      o.projects || 0,
      asNumber(o.totalEC),
      o.pic ? `${CORDIS_ORG}${o.pic}` : ''
    ];
  });

  writeExcelFile(
    'Partners',
    `cordis-it-partners-${exportScopeSlug()}-${exportDateStamp()}.xlsx`,
    headers,
    rows,
    [48, 16, 12, 24, 12, 14, 20, 24, 52]
  );
}
