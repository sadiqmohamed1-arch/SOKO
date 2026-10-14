import { sanitizeCsvCell, toSafeCsv } from './csvExport.ts';

let failed = 0;
const check = (ok: boolean, label: string) => {
  if (!ok) failed += 1;
  console.log(ok ? 'PASS' : 'FAIL', label);
};

check(sanitizeCsvCell('=CMD()') === "'=CMD()", 'prefix equals formula');
check(sanitizeCsvCell('+1+1') === "'+1+1", 'prefix plus formula');
check(sanitizeCsvCell('-1+1') === "'-1+1", 'prefix minus formula');
check(sanitizeCsvCell('@SUM(A1)') === "'@SUM(A1)", 'prefix at formula');
check(sanitizeCsvCell('\tHYPERLINK') === "'\tHYPERLINK", 'prefix tab');
check(sanitizeCsvCell('Ordinary name') === 'Ordinary name', 'plain text unchanged');
check(sanitizeCsvCell(null) === '', 'null becomes empty');

const csv = toSafeCsv([
  ['Name', 'Note'],
  ['Buyer', '=1+1'],
]);
check(csv.startsWith('\uFEFF'), 'UTF-8 BOM present');
check(csv.includes("'=1+1"), 'exported formula is quoted-safe');
check(!csv.split('\r\n')[1]?.includes(',=1+1'), 'raw formula is not emitted');

if (failed > 0) {
  console.error(`csvExport tests: ${failed} failed`);
  process.exit(1);
}
console.log('csvExport tests: all passed');
