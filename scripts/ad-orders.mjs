// Uso local pelo proprietário; nenhuma confirmação bancária é automática.
import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const directory=path.join(process.cwd(),'.data','ad-orders');
const [action,id]=process.argv.slice(2);
await mkdir(directory,{recursive:true,mode:0o700});
const files=(await readdir(directory)).filter(file=>/^[a-f0-9-]{36}\.json$/.test(file));
const orders=await Promise.all(files.map(async file=>JSON.parse(await readFile(path.join(directory,file),'utf8'))));
if(action==='listar'){console.table(orders.map(o=>({pedido:o.id,marca:o.brand,contato:o.contact,cupom:o.coupon||'—',status:o.status,pixConfirmado:!!o.paymentConfirmedAt,inicio:o.startsAt,fim:o.expiresAt})));}
else if(action==='indicacoes'){const counts=new Map();for(const order of orders){const key=order.coupon||'SEM_CUPOM',row=counts.get(key)||{cupom:key,pedidos:0,pagos:0};row.pedidos++;if(order.paymentConfirmedAt)row.pagos++;counts.set(key,row);}console.table([...counts.values()]);}
else if(['confirmar-pix','aprovar','rejeitar'].includes(action)&&/^[a-f0-9-]{36}$/.test(id||'')){
 const order=orders.find(o=>o.id===id);if(!order)throw Error('Pedido não encontrado.');
 if(action==='confirmar-pix')order.paymentConfirmedAt=new Date().toISOString();
 if(action==='aprovar')order.approvedAt=new Date().toISOString();
 if(action==='rejeitar')order.status='rejected';
 if(order.paymentConfirmedAt&&order.approvedAt&&order.status==='pending'){
  const occupied=orders.some(o=>o.id!==id&&o.status==='active'&&Date.parse(o.expiresAt)>Date.now());
  if(occupied)console.log('Confirmação e análise gravadas. O espaço está ocupado; execute aprovar novamente quando estiver livre para iniciar os 3 dias completos.');
  else{order.status='active';order.startsAt=new Date().toISOString();order.expiresAt=new Date(Date.now()+order.durationDays*86400000).toISOString();}
 }
 await writeFile(path.join(directory,`${id}.json`),JSON.stringify(order)+'\n',{mode:0o600});console.log(`Pedido ${id}: ${order.status}. Confirmação de Pix somente após conferir no banco.`);
}else{console.log('Uso: node scripts/ad-orders.mjs listar | indicacoes | confirmar-pix <id> | aprovar <id> | rejeitar <id>');process.exitCode=1;}
