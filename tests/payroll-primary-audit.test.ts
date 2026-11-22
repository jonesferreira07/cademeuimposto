import {readFileSync} from "node:fs";
import {join} from "node:path";
import {it,expect} from "vitest";
import {parseDeputyPayroll} from "../src/lib/parliament-costs";
// Arquivos obtidos das URLs individuais oficiais, nunca associados por nome aproximado.
it.skipIf(!process.env.CMI_PAYROLL_AUDIT_DIR)("confere 12 folhas primárias e preserva o estorno de janeiro",()=>{
 const names={204549:"AJ Albuquerque",220697:"Jadyel Alencar",204528:"Adriana Ventura"};
 for(const id of Object.keys(names))for(const month of [1,7,9,10]){
  const html=readFileSync(join(process.env.CMI_PAYROLL_AUDIT_DIR!,`cmi-payroll-audit-${id}-${month}.html`),"utf8");
  const result=parseDeputyPayroll(html,2026,month);
  expect(result.sheets,`${names[Number(id) as keyof typeof names]} · ${month}/2026`).toBeGreaterThan(0);
  expect(result.breakdown).toHaveLength(8);expect(result.gross).not.toBeNull();
  expect(result.gross).toBeCloseTo(result.breakdown.reduce((total,row)=>total+row.value!,0),2);
  if(id==="204549"&&month===1)expect(result.breakdown.find(row=>row.key==="occasional")?.value).toBe(-3219.87);
 }
});
