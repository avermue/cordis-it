/* ══════════════════════════════════════════════════════════════
   data.js — Shared constants, helpers, region definitions
   ══════════════════════════════════════════════════════════════ */

const DATA_URL = 'data/inrae_projects.json';
const GEO_PATHS_URL = 'data/geo-paths.json';
const PER_PAGE = 25;

/* ── Scheme Groups ── */
const SCHEME_GROUPS = {
  'RIA / IA':    s => s.includes('RIA') || s.includes('-IA'),
  'MSCA':        s => s.includes('MSCA'),
  'ERC':         s => s.includes('ERC'),
  'CSA':         s => s.includes('CSA'),
  'EIC':         s => s.includes('EIC'),
  'JU / COFUND': s => s.includes('JU-') || s.includes('COFUND'),
  'Other':       () => true
};

function schemeGroup(scheme) {
  if (!scheme) return 'Other';
  const s = scheme.toUpperCase();
  for (const [g, fn] of Object.entries(SCHEME_GROUPS)) if (fn(s)) return g;
  return 'Other';
}

/* ── Country codes ── */
const CC_NORM = { 'EL': 'GR', 'UK': 'GB' };
const CC_NAMES = {
  'AL':'Albania','AT':'Austria','BA':'Bosnia & Herzegovina','BE':'Belgium',
  'BG':'Bulgaria','BY':'Belarus','CH':'Switzerland','CY':'Cyprus','CZ':'Czechia',
  'DE':'Germany','DK':'Denmark','EE':'Estonia','EL':'Greece','ES':'Spain',
  'FI':'Finland','FR':'France','HR':'Croatia','HU':'Hungary','IE':'Ireland',
  'IS':'Iceland','IT':'Italy','LT':'Lithuania','LU':'Luxembourg','LV':'Latvia',
  'MD':'Moldova','ME':'Montenegro','MK':'North Macedonia','MT':'Malta',
  'NL':'Netherlands','NO':'Norway','PL':'Poland','PT':'Portugal','RO':'Romania',
  'RS':'Serbia','SE':'Sweden','SI':'Slovenia','SK':'Slovakia','TR':'Türkiye',
  'UA':'Ukraine','UK':'United Kingdom'
};

/* ── Formatting helpers ── */
function flag(cc) {
  if (!cc || cc.length !== 2) return cc || '';
  const c = (CC_NORM[cc] || cc).toLowerCase();
  return `<img src="https://flagcdn.com/16x12/${c}.png" alt="${cc}" title="${cc}"
    style="width:16px;height:12px;vertical-align:middle;border-radius:1px;margin:0 1px"
    onerror="this.replaceWith(document.createTextNode('${cc}'))">`;
}

const fmtM = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M€' : n >= 1e3 ? Math.round(n / 1e3) + 'k€' : n > 0 ? n + '€' : '–';
const fmtD = d => d ? d.slice(0, 7) : '–';
const fmtY = d => d ? d.slice(0, 4) : '';

const ROLE_L = { coordinator: 'Coordinator', participant: 'Participant', associatedPartner: 'Assoc. Partner', thirdParty: 'Third Party' };
const roleL = r => ROLE_L[r] || r || '–';
const normRole = r => (r === 'partner' ? 'associatedPartner' : r) || '';

function progTag(p) {
  const s = (p.programme || '').toUpperCase();
  return s.includes('H2020') ? '<span class="tag tg-h2020">H2020</span>' : '<span class="tag tg-he">HE</span>';
}

function normProg(p) {
  const s = (p.programme || p.frameworkProgramme || '').toUpperCase();
  return s.includes('H2020') ? 'H2020' : 'HORIZON';
}

/* ── Regions ── */
const REGIONS = {
  'Northern Europe':            ['DK','EE','FI','IS','LV','LT','NO','SE'],
  'Western Europe':             ['AT','BE','FR','DE','IE','LU','NL','CH','GB','UK'],
  'Southern Europe':            ['AL','BA','HR','CY','EL','GR','IT','MT','ME','MK','PT','RS','SI','ES','TR','XK'],
  'Central & Eastern Europe':   ['BG','BY','CZ','HU','MD','PL','RO','SK','UA'],
  'North America':              ['US','CA','MX'],
  'China, Hong Kong & Taiwan':  ['CN','HK','TW','MO'],
  'Other':                      []
};

function getRegion(cc) {
  for (const [r, cs] of Object.entries(REGIONS)) if (cs.includes(cc)) return r;
  return 'Other';
}

/* ── Topic → thematic category ── */
const TOPIC_CATS = {
  'CL1': 'Health', 'CL2': 'Culture & Society', 'CL3': 'Civil Security',
  'CL4': 'Digital & Industry', 'CL5': 'Climate, Energy & Mobility',
  'CL6': 'Food, Bioeconomy & Environment', 'MISS': 'EU Missions',
  'INFRA': 'Research Infrastructures', 'MSCA': 'MSCA', 'ERC': 'ERC',
  'EIC': 'EIC', 'JU': 'Joint Undertakings', 'CBE': 'Biobased Industries JU',
  'SFS': 'Food Security',
};

function topicToCat(topic) {
  if (!topic || !topic.trim()) return null;
  const parts = topic.trim().toUpperCase().split('-');
  for (const p of parts) { if (TOPIC_CATS[p]) return TOPIC_CATS[p]; }
  return 'Other';
}

function projectCats(p, level) {
  if (p.domains && Array.isArray(p.domains) && p.domains.length > 0) {
    if (level !== 'l1' && p.domains_l2 && p.domains_l2.length > 0) return p.domains_l2;
    return p.domains;
  }
  if (p.topics) {
    const cats = new Set();
    p.topics.split(';').map(t => t.trim()).filter(Boolean)
      .forEach(t => { const c = topicToCat(t); if (c) cats.add(c); });
    if (cats.size > 0) return [...cats];
  }
  return [];
}

/* ── Chart palette ── */
const PAL = ['rgba(37,99,171,.8)', 'rgba(109,40,217,.7)', 'rgba(146,96,10,.7)', 'rgba(22,101,52,.7)', 'rgba(153,27,27,.7)', 'rgba(74,144,217,.6)', 'rgba(156,163,175,.6)'];
const DOM_PAL = ['#1a4f8a', '#166534', '#92600a', '#6d28d9', '#dc2626', '#0891b2', '#be185d', '#0f766e', '#78350f', '#374151'];
const DONUT_PAL = ['#1a4f8a', '#2563ab', '#3b82f6', '#60a5fa', '#92600a', '#6d28d9', '#166534', '#dc2626', '#0891b2', '#be185d', '#78350f', '#0f766e'];
const L1_COLORS_DOM = {};
