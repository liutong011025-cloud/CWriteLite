import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { CATEGORY_LABELS, CODING_VERSION, PROCESS_CATALOG } from '@/lib/process-coding';
import { processDb, Prisma, isProcessAdmin, type Recording, type StoredProcessEvent } from '@/lib/process-store';
import { csvCell, xlsxStream, type XlsxSheet } from '@/lib/process-xlsx';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=120;
const headers=['eventUid','username','userId','recordingId','sessionId','sequence','clientTsUTC','clientEndTsUTC','clientTsBeijing','serverTsUTC','workId','workType','eventId','category','categoryLabel','subcategory','functionalCode','stage','origin','durationMs','activeDurationMs','precedingGapMs','episodeId','segmentIndex','requestId','proposalId','targetId','field','contentSource','participantMode','status','beforeText','afterText','insertedChars','deletedChars','penStrokeCount','eraserStrokeCount','codingVersion','payload'];
function values(e:StoredProcessEvent,b:Recording) {
  const p=e.payload;return [e.eventUid,e.username,e.userId,e.recordingId,e.sessionId,e.sequence,e.clientTs.toISOString(),e.clientEndTs?.toISOString(),new Date(e.clientTs.getTime()+8*3600000).toISOString().replace('T',' ').replace('Z',' +08:00'),e.serverTs.toISOString(),e.workId,e.workType,e.eventId,e.category,CATEGORY_LABELS[e.category],e.subcategory,e.functionalCode,e.stage,e.origin,e.durationMs,e.activeDurationMs,p.precedingGapMs,p.episodeId,p.segmentIndex,p.requestId,p.proposalId,p.targetId,p.field,p.contentSource,p.participantMode,p.status,p.beforeText,p.afterText,p.insertedChars,p.deletedChars,p.penStrokeCount,p.eraserStrokeCount,b.codingVersion,JSON.stringify(p)] as (string|number|boolean|null|undefined)[];
}
export async function GET(request:Request) {
  const user=await currentUser();if(!user)return NextResponse.json({error:'Please log in.'},{status:401});
  if(!isProcessAdmin(user))return NextResponse.json({error:'Tony access required.'},{status:403});
  try {
    const url=new URL(request.url),id=url.searchParams.get('recordingId')||'',username=url.searchParams.get('username')||'',includeDemo=url.searchParams.get('includeDemo')==='true',format=url.searchParams.get('format')||'xlsx',cutoff=new Date();
    if(!id||id.length>80||username.length>100||!['xlsx','csv'].includes(format))return NextResponse.json({error:'Select a recording and export format.'},{status:400});
    const batches=await processDb().$queryRaw<Recording[]>`SELECT * FROM "ProcessRecording" WHERE "id"=${id}`;const batch=batches[0];if(!batch)return NextResponse.json({error:'Recording not found.'},{status:404});
    const conditions=Prisma.sql`"recordingId"=${id} AND "serverTs"<=${cutoff} ${username?Prisma.sql`AND "username"=${username}`:Prisma.empty} ${includeDemo?Prisma.empty:Prisma.sql`AND "username"<>'Tony'`}`;
    const count=await processDb().$queryRaw<{count:bigint}[]>(Prisma.sql`SELECT COUNT(*)::bigint AS count FROM "ProcessEvent" WHERE ${conditions}`),total=Number(count[0].count);
    async function* events() {
      let cursor:{at:Date;id:string}|null=null;
      while(true) {
        const rows:StoredProcessEvent[]=await processDb().$queryRaw(Prisma.sql`SELECT * FROM "ProcessEvent" WHERE ${conditions} ${cursor?Prisma.sql`AND ("clientTs","eventUid")>(${cursor.at},${cursor.id})`:Prisma.empty} ORDER BY "clientTs","eventUid" LIMIT 500`);
        if(!rows.length)return;for(const row of rows)yield values(row,batch);
        const last=rows[rows.length-1];cursor={at:last.clientTs,id:last.eventUid};
      }
    }
    const commonHeaders={'Cache-Control':'no-store','X-Process-Event-Count':String(total),'Content-Disposition':`attachment; filename="cwrite-process-${id}.${format}"`};
    if(format==='csv') {
      async function* csv(){yield '\uFEFF'+headers.map(csvCell).join(',')+'\r\n';for await(const row of events())yield row.map(csvCell).join(',')+'\r\n';}
      return new Response(Readable.toWeb(Readable.from(csv())) as ReadableStream,{headers:{...commonHeaders,'Content-Type':'text/csv; charset=utf-8'}});
    }
    // Split large datasets automatically, well below Excel's per-sheet row limit.
    const iterator=events()[Symbol.asyncIterator](),sheets:XlsxSheet[]=[];
    for(let i=0;i<Math.max(1,Math.ceil(total/200000));i++) {
      async function* part(){yield headers;for(let n=0;n<200000;n++){const row=await iterator.next();if(row.done)return;yield row.value;}}
      sheets.push({name:i===0?'行为明细':`行为明细${i+1}`,rows:part()});
    }
    sheets.push({name:'编码说明',rows:[['一级类别','二级子类','功能编码','说明','界面','记录方式'],...Object.values(PROCESS_CATALOG).map(d=>[CATEGORY_LABELS[d.category],d.subcategory,d.code,d.description,d.screens,d.rule])]});
    sheets.push({name:'批次与口径',rows:[['项目','值'],['录制批次',id],['开始时间 UTC',batch.startedAt.toISOString()],['停止时间 UTC',batch.stoppedAt?.toISOString()||'仍在记录'],['导出截止 UTC',cutoff.toISOString()],['导出行数',total],['学生筛选',username||'全部学生'],['包含 Tony 测试记录',includeDemo],['编码版本',batch.codingVersion],['合并参数',JSON.stringify(batch.parameters)],['质量信息',JSON.stringify(batch.quality)],['短停顿','precedingGapMs 保留全部相邻学生操作间隔。2 秒至小于 10 秒不另增暂停行。'],['较长停顿','前台至少 10 秒无输入单列。后台时间分开；无输入不证明思考。'],['内容来源','自动提示、固定词库、AI 插入和粘贴分别标记，不自动当作学生原创。'],['时间顺序','区间按开始时间排列，同一会话的实际顺序参考 sequence。'],['传输说明','断网或关闭页面可能延迟补传。本次导出只含截止时间前服务器已收到的记录，可稍后重新导出。'],['长文本','Excel 单元格上限 32767 字符。完整大 payload 请同时导出 CSV；明细 beforeText/afterText 分列。']]});
    const stream=xlsxStream(sheets);
    return new Response(Readable.toWeb(stream) as ReadableStream,{headers:{...commonHeaders,'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}});
  } catch{return NextResponse.json({error:'Could not export behavior records. Please retry. Writing remains available.'},{status:503});}
}
