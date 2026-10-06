import { PassThrough, Readable } from 'node:stream';
import { once } from 'node:events';

type Cell = string | number | boolean | null | undefined;
export type XlsxSheet = { name: string; rows: AsyncIterable<Cell[]> | Iterable<Cell[]> };
export const xml = (value: unknown) => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function column(index: number) { let out = ''; for (let n = index + 1; n; n = Math.floor((n - 1) / 26)) out = String.fromCharCode(65 + (n - 1) % 26) + out; return out; }
export function rowXml(cells: Cell[], index: number) {
  return `<row r="${index}">${cells.map((v, i) => {
    const ref = column(i) + index, style = index === 1 ? ' s="1"' : '';
    if (v === null || v === undefined) return `<c r="${ref}"${style}/>`;
    if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${style}><v>${v}</v></c>`;
    if (typeof v === 'boolean') return `<c r="${ref}"${style} t="b"><v>${v ? 1 : 0}</v></c>`;
    return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xml(String(v).slice(0,32767))}</t></is></c>`;
  }).join('')}</row>`;
}
/** Stream data to ZIP with backpressure; the complete research dataset is never held in memory. */
export function xlsxStream(sheets: XlsxSheet[]) {
  const { ZipFile } = require('yazl') as { ZipFile: new () => { addBuffer: (b: Buffer, path: string) => void; addReadStream: (s: Readable, path: string) => void; end: () => void; outputStream: Readable } };
  const zip = new ZipFile();
  const add = (name: string, text: string) => zip.addBuffer(Buffer.from(text, 'utf8'), name);
  add('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
  add('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  add('xl/workbook.xml',`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${xml(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`);
  add('xl/_rels/workbook.xml.rels',`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  add('xl/styles.xml','<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF3C4569"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
  const streams = sheets.map((s,i) => { const stream=new PassThrough({highWaterMark:65536}); stream.on('error',()=>{}); zip.addReadStream(stream,`xl/worksheets/sheet${i+1}.xml`); return stream; });
  zip.end();
  const output = zip.outputStream;
  output.once('close',()=>{for(const s of streams)if(!s.destroyed)s.destroy();});
  async function write(stream: PassThrough, text: string) { if (!stream.write(text)) await once(stream,'drain'); }
  void (async () => {
    try {
      for(let i=0;i<sheets.length;i++) {
        const stream=streams[i]; let r=0, width=1;
        await write(stream,'<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="30"/><cols><col min="1" max="60" width="24" customWidth="1"/></cols><sheetData>');
        for await (const cells of sheets[i].rows) { if (output.destroyed) throw new Error('Export cancelled'); width=Math.max(width,cells.length); await write(stream,rowXml(cells,++r)); }
        await write(stream,`</sheetData><autoFilter ref="A1:${column(width-1)}${Math.max(r,1)}"/></worksheet>`); stream.end();
      }
    } catch(error) { const failure=error instanceof Error?error:new Error('Export failed'); for(const s of streams)s.destroy(failure); output.destroy(failure); }
  })();
  return output;
}
export function csvCell(value: Cell) {
  let s=String(value ?? ''); if (/^[\s]*[=+@-]/.test(s)) s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
}
