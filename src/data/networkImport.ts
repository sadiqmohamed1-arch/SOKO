import { CardView, ContactDraft } from './myNetwork';

const emptyDraft = (): ContactDraft => ({
  name: '',
  title: '',
  company: '',
  phone: '',
  whatsappNumber: '',
  email: '',
  location: '',
  category: '',
  notes: '',
});

const parseCsvRows = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
};

const HEADER_MAP: Record<string, keyof ContactDraft | 'first' | 'last'> = {
  name: 'name',
  'full name': 'name',
  'first name': 'first',
  'last name': 'last',
  title: 'title',
  designation: 'title',
  'job title': 'title',
  position: 'title',
  company: 'company',
  organization: 'company',
  organisation: 'company',
  mobile: 'phone',
  phone: 'phone',
  'mobile phone': 'phone',
  telephone: 'phone',
  whatsapp: 'whatsappNumber',
  email: 'email',
  'e-mail': 'email',
  'email address': 'email',
  location: 'location',
  city: 'location',
  'trade category': 'category',
  category: 'category',
  trade: 'category',
  notes: 'notes',
};

export const parseCsvContacts = (text: string): ContactDraft[] => {
  const [header, ...rows] = parseCsvRows(text.replace(/^\uFEFF/, ''));
  if (!header) return [];
  const keys = header.map((h) => HEADER_MAP[h.trim().toLowerCase()]);
  if (!keys.some((k) => k === 'name' || k === 'first')) throw new Error('The CSV needs a "Name" (or "First Name") column.');
  return rows
    .map((cells) => {
      const d = emptyDraft();
      let first = '';
      let last = '';
      keys.forEach((k, i) => {
        const v = (cells[i] ?? '').trim();
        if (!k || !v) return;
        if (k === 'first') first = v;
        else if (k === 'last') last = v;
        else if (k !== 'companyId') d[k] = v;
      });
      if (!d.name) d.name = [first, last].filter(Boolean).join(' ');
      return d;
    })
    .filter((d) => d.name);
};

const unescapeV = (v: string) => v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

export const parseVCardContacts = (text: string): ContactDraft[] => {
  const unfolded = text.replace(/\r\n|\r/g, '\n').replace(/\n[ \t]/g, '');
  const blocks = unfolded.split(/BEGIN:VCARD/i).slice(1);
  return blocks
    .map((block) => {
      const d = emptyDraft();
      let structuredName = '';
      block.split('\n').forEach((line) => {
        const idx = line.indexOf(':');
        if (idx < 0) return;
        const [prop, ...params] = line.slice(0, idx).split(';');
        const key = prop.replace(/^item\d+\./i, '').toUpperCase();
        const value = unescapeV(line.slice(idx + 1).trim());
        const paramText = params.join(';').toUpperCase();
        if (key === 'FN') d.name = value;
        else if (key === 'N') structuredName = value.split(';').slice(0, 2).reverse().filter(Boolean).join(' ');
        else if (key === 'TITLE') d.title = value;
        else if (key === 'ORG') d.company = value.split(';')[0];
        else if (key === 'EMAIL' && !d.email) d.email = value;
        else if (key === 'TEL') {
          if (!d.phone || (paramText.includes('CELL') && !paramText.includes('WORK'))) d.phone = value;
        } else if (key === 'ADR' && !d.location) {
          const parts = value.split(';');
          d.location = [parts[3], parts[6]].filter(Boolean).join(', ');
        } else if (key === 'NOTE') d.notes = value;
      });
      if (!d.name) d.name = structuredName;
      return d;
    })
    .filter((d) => d.name);
};

export const parseContactFile = (fileName: string, text: string): ContactDraft[] => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv')) return parseCsvContacts(text);
  if (lower.endsWith('.vcf') || lower.endsWith('.vcard')) return parseVCardContacts(text);
  throw new Error('Only CSV (.csv) and vCard (.vcf) files can be imported.');
};

export const CSV_TEMPLATE = 'Name,Designation,Company,Mobile,WhatsApp,Email,Location,Trade Category,Notes\nJane Doe,Sales Manager,Example Trading LLC,+971500000000,+971500000000,jane@example.com,Dubai,Steel & Rebar,Met at Big 5\n';

const escapeV = (v: string) => v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** Builds a vCard from already-permitted card fields only. */
export const buildVCard = (c: CardView) => {
  const [first, ...rest] = c.name.split(' ');
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeV(c.name)}`,
    `N:${escapeV(rest.join(' '))};${escapeV(first)};;;`,
    c.title && `TITLE:${escapeV(c.title)}`,
    c.company && `ORG:${escapeV(c.company)}`,
    c.mobile && `TEL;TYPE=CELL:${c.mobile}`,
    c.officePhone && `TEL;TYPE=WORK:${c.officePhone}`,
    c.email && `EMAIL;TYPE=WORK:${c.email}`,
    c.website && `URL:${c.website}`,
    c.location && `ADR;TYPE=WORK:;;;${escapeV(c.location)};;;`,
    c.sokoId && `NOTE:${escapeV(`SOKO Professional ID ${c.sokoId}`)}`,
    'END:VCARD',
  ];
  return lines.filter(Boolean).join('\r\n');
};

export const downloadText = (fileName: string, text: string, type: string) => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const downloadVCard = (c: CardView) => downloadText(`${c.name.replace(/[^a-z0-9]+/gi, '_')}.vcf`, buildVCard(c), 'text/vcard');
