/**
 * Draws the product illustrations: the variants table, shown both in the hero and in the Table
 * view, and the hero's DNA helix.
 *
 * The figures are illustrative, modelled on VIA's Familial hypercholesterolemia demo. They are
 * not real All of Us data.
 */

const SUBPOP_COLORS = {
  EUR: '#F9C854', AFR: '#2078B4', AMR: '#6DACE4', OTH: '#B3AEAD', FIN: '#6B4226', SAS: '#8CCA90',
};

const ROWS = [
  {
    variant: '19-11116928-G-A', gene: 'LDLR', consequence: 'Missense', protein: 'p.Gly592Glu',
    aou: { code: 'EUR', af: '0.0004', acan: '95 / 235,286' },
    gnomad: { code: 'OTH', af: '0.0010', acan: '2 / 2,084' },
    matched: { af: '0.0064', acan: '5 / 782', hom: 0, het: 5, plp: 0 },
    clinvar: ['p', 'P', 3], spliceAi: '0', plof: null,
  },
  {
    variant: '19-11120425-C-A', gene: 'LDLR', consequence: 'Nonsense', protein: 'p.Cys681Ter',
    aou: { code: 'EUR', af: '< 0.0001', acan: '3 / 235,370' },
    gnomad: null,
    matched: { af: '0.0038', acan: '3 / 782', hom: 0, het: 3, plp: 2 },
    clinvar: ['p', 'P', 2], spliceAi: '0.04', plof: 'HC',
  },
  {
    variant: '1-55039974-G-T', gene: 'PCSK9', consequence: 'Missense', protein: 'p.Arg46Leu',
    aou: { code: 'EUR', af: '0.0180', acan: '4,187 / 232,622' },
    gnomad: { code: 'FIN', af: '0.0439', acan: '467 / 10,630' },
    matched: { af: '0.0038', acan: '3 / 782', hom: 0, het: 3, plp: 0 },
    clinvar: ['b', 'B', 2], spliceAi: '0', plof: null,
  },
  {
    variant: '2-21006288-C-T', gene: 'APOB', consequence: 'Missense', protein: 'p.Arg3527Gln',
    aou: { code: 'EUR', af: '0.0004', acan: '105 / 237,594' },
    gnomad: { code: 'OTH', af: '0.0005', acan: '1 / 2,088' },
    matched: { af: '0.0051', acan: '4 / 782', hom: 0, het: 4, plp: 0 },
    clinvar: ['v', 'VUS', 1], spliceAi: '0', plof: null,
  },
  {
    variant: '1-55046549-C-G', gene: 'PCSK9', consequence: 'Nonsense', protein: 'p.Tyr142Ter',
    aou: { code: 'AFR', af: '0.0045', acan: '461 / 102,500' },
    gnomad: { code: 'AFR', af: '0.0029', acan: '120 / 41,574' },
    matched: { af: '0.0000', acan: '0 / 782', hom: 0, het: 0, plp: 0 },
    clinvar: null, spliceAi: '0.04', plof: 'HC',
  },
  {
    variant: '19-11120205-T-C', gene: 'LDLR', consequence: 'Synonymous', protein: 'p.Val653=',
    aou: { code: 'AMR', af: '0.5100', acan: '43,106 / 84,522' },
    gnomad: { code: 'AMR', af: '0.5066', acan: '7,720 / 15,240' },
    matched: { af: '0.3951', acan: '309 / 782', hom: 61, het: 187, plp: 0 },
    clinvar: ['b', 'B', 2], spliceAi: '0', plof: null,
  },
];

const CHEVRON = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>';
const USER = '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';

const pill = (code) => `<span class="pill"><span class="dot" style="background:${SUBPOP_COLORS[code]}"></span>${code}</span>`;
const freq = (af, acan) => `<span class="stack"><span>${af}</span><span class="sub">${acan}</span></span>`;
const clinvar = (c) => (c ? `<span class="cv ${c[0]}"><span class="code">${c[1]}</span><span class="stars">${c[2]}★</span></span>` : '<span class="muted">—</span>');
const plof = (p) => (p ? `<span class="hc">${p}</span>` : '<span class="muted">—</span>');
const count = (n) => `<td class="matched num ${n === 0 ? 'zero' : ''}">${n}</td>`;

function identityCells(row) {
  return `<td class="chev">${CHEVRON}</td><td class="mono">${row.variant}</td><td>${row.gene}</td>` +
    `<td><span class="stack"><span>${row.consequence}</span><span class="sub mono">${row.protein}</span></span></td>`;
}

/** A source's maximum-subpopulation badge and frequency, or one "not observed" cell across both. */
function sourceCells(tint, source, missing) {
  if (!source) return `<td class="${tint} na" colspan="2">${missing}</td>`;
  return `<td class="${tint} badge">${pill(source.code)}</td><td class="${tint}">${freq(source.af, source.acan)}</td>`;
}

const GLOBE = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a13.5 13.5 0 0 1 0 18a13.5 13.5 0 0 1 0-18z"/></svg>';
const FREQ_HEADER = 'AF <span class="unit">· AC / AN</span>';

/** The variants table as the app draws it. Shown in the hero and in the Table view. */
function renderTable(table) {
  table.innerHTML = `
    <thead>
      <tr>
        <th colspan="4"></th>
        <th class="group scope aou" colspan="4">All participants</th>
        <th class="group scope matched" colspan="4">Phenotype-matched <span class="count">${USER}391</span></th>
        <th colspan="3"></th>
      </tr>
      <tr>
        <th colspan="4"></th>
        <th class="group aou" colspan="2"><i>All of Us</i> <span class="unit">— max subpopulation</span></th>
        <th class="group gnomad" colspan="2">gnomAD <span class="unit">— max subpopulation</span></th>
        <th class="group matched" colspan="4"><i>All of Us</i></th>
        <th colspan="3"></th>
      </tr>
      <tr>
        <th></th><th>Variant</th><th>Gene</th><th>Consequence</th>
        <th class="aou badge">${GLOBE}</th><th class="aou">${FREQ_HEADER}</th>
        <th class="gnomad badge">${GLOBE}</th><th class="gnomad">${FREQ_HEADER}</th>
        <th class="matched">${FREQ_HEADER}</th><th class="matched num">Hom</th><th class="matched num">Het</th><th class="matched num">P/LP</th>
        <th>ClinVar</th><th>SpliceAI</th><th>pLOF</th>
      </tr>
    </thead>
    <tbody>${ROWS.map((row) => `
      <tr>${identityCells(row)}
        ${sourceCells('aou', row.aou, 'Not observed in <i>All of Us</i>')}${sourceCells('gnomad', row.gnomad, 'Not observed in gnomAD')}
        <td class="matched">${freq(row.matched.af, row.matched.acan)}</td>${count(row.matched.hom)}${count(row.matched.het)}${count(row.matched.plp)}
        <td>${clinvar(row.clinvar)}</td><td class="num">${row.spliceAi}</td><td>${plof(row.plof)}</td>
      </tr>`).join('')}
    </tbody>`;
}

/** The hero's DNA helix: two phase-shifted strands with rungs, drawn rather than shipped as an image. */
function renderHelix(svg) {
  const width = 900, mid = 300, amplitude = 120, wavelength = 420;
  const strand = (phase) => {
    let d = '';
    for (let x = 0; x <= width; x += 6) {
      const y = mid + amplitude * Math.sin((x / wavelength) * 2 * Math.PI + phase) + x * 0.18;
      d += `${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`;
    }
    return d;
  };
  let rungs = '';
  for (let x = 12; x <= width; x += 22) {
    const y1 = mid + amplitude * Math.sin((x / wavelength) * 2 * Math.PI) + x * 0.18;
    const y2 = mid + amplitude * Math.sin((x / wavelength) * 2 * Math.PI + Math.PI) + x * 0.18;
    rungs += `<line x1="${x}" y1="${y1.toFixed(1)}" x2="${x}" y2="${y2.toFixed(1)}" />`;
  }
  svg.innerHTML = `
    <g class="helix-rungs">${rungs}</g>
    <path class="helix-strand" d="${strand(0)}" />
    <path class="helix-strand alt" d="${strand(Math.PI)}" />`;
}

renderTable(document.getElementById('hero-table'));
renderTable(document.getElementById('feature-table'));
renderHelix(document.querySelector('.hero-helix'));
