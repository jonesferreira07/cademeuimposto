/** Auditoria técnica da API local. Não certifica a completude contábil das fontes. */
import { writeFile } from 'node:fs/promises';
const base = process.argv[2] || 'http://127.0.0.1:3000';
const output = process.argv[3] || '/tmp/cmi-auditoria-2026.json';
const ufs = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const report = { year: 2026, checkedAt: new Date().toISOString(), checks: [], failures: [], coverage: {}, limitations: ['Validação técnica e de consistência: não certifica a completude contábil das fontes.', 'Folhas estaduais de consolidação externa permanecem sem valores públicos até conferência primária.', 'Custo diário é parcial: estrutura e componentes sem atribuição individual ficam fora.'] };
let next = 0;
const jobs = ufs.flatMap(uf => [ ['federal', `/api/deputados?uf=${uf}`], ['senate', `/api/senadores?uf=${uf}`], ['assembly', `/api/representantes-estaduais?role=assembly&uf=${uf}&year=2026&month=9`], ['government', `/api/representantes-estaduais?role=government&uf=${uf}&year=2026&month=9`], ['treasury', `/api/financas/${uf}?year=2026&month=9`] ].map(([kind,path]) => ({uf,kind,path})));
const federalIds = new Set(), senateIds = new Set();
await Promise.all(Array.from({length:4},async()=>{while(next<jobs.length){const job=jobs[next++], started=Date.now();try{
 const response=await fetch(`${base}${job.path}`,{signal:AbortSignal.timeout(60000)}), data=await response.json();
 if(!response.ok) throw Error(data.error || `HTTP ${response.status}`);
 const check={...job,status:response.status,elapsedMs:Date.now()-started};
 if(job.kind==='federal') {if(data.hasNext) throw Error('Lista exige página adicional; cobertura não afirmada');if(data.deputies.some(row=>row.siglaUf!==job.uf||federalIds.has(row.id)))throw Error('UF/identificador federal incompatível');for(const row of data.deputies)federalIds.add(row.id);check.count=data.deputies.length;}
 if(job.kind==='senate') {if(data.senators.some(row=>row.uf!==job.uf||senateIds.has(row.id)))throw Error('UF/identificador do Senado incompatível');for(const row of data.senators)senateIds.add(row.id);check.count=data.senators.length;}
 if(job.kind==='government'||job.kind==='assembly') {if(data.records.some(row=>row.uf!==job.uf||row.role!==job.kind||row.payments.some(p=>p.year!==2026||p.month!==9||p.origin!=='official')))throw Error('Vínculo ou competência estadual incompatível');check.count=data.records.length;check.directRoster=!!data.directRosterSource;check.confirmedPayments=data.records.filter(row=>row.paymentTotal!==null).length;check.pendingPayments=data.records.filter(row=>row.paymentStatus==='pending').length;}
 if(job.kind==='treasury') {if(data.uf!==job.uf||data.year!==2026||data.endMonth>9)throw Error('RREO fora do recorte');check.period=data.period;check.hasValues=data.revenue!==null;}
 report.checks.push(check);
 }catch(error){report.failures.push({...job,message:error.message,elapsedMs:Date.now()-started});}
}}));
report.coverage={federalProfiles:federalIds.size,senateProfiles:senateIds.size,states:ufs.length,passedQueries:report.checks.length,failedQueries:report.failures.length};
for(const path of ['/api/cota/204549?year=2025','/api/custos/senado/5982?year=2024','/api/representantes-estaduais?role=government&year=2025','/api/emendas/204549?year=2023']){
 try{const r=await fetch(`${base}${path}`);if(r.status!==400)throw Error(`Ano anterior não rejeitado com HTTP 400 (${r.status})`);report.checks.push({kind:'period-guard',path,status:400});}catch(error){report.failures.push({kind:'period-guard',path,message:error.message});}
}
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,...report.coverage,failures:report.failures},null,2));
process.exitCode=report.failures.length?1:0;
