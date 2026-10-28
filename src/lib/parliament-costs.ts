import { load } from "cheerio";
import { getExpenses } from "./expenses";
import { officialText, normalizePublicName, publicMoney, selectionWindow, sumPublished, mapLimited } from "./official-source";

export type CostComponent = { key: string; label: string; value: number | null; source: string; note: string; coverageLabel?: string };
export function composeIdentifiedCost(components: CostComponent[], days: number) {
  const known = components.filter(row => row.value !== null);
  const identifiedTotal = known.length ? known.reduce((sum, row) => sum + Math.round(row.value! * 100), 0) / 100 : null;
  return { components, identifiedTotal, identifiedDaily: identifiedTotal === null || days <= 0 ? null : Math.round(identifiedTotal / days * 100) / 100, knownComponents: known.length, allComponents: components.length, complete: known.length === components.length, days };
}
const grossLabels = ["REMUNERACAO FIXA", "VANTAGENS DE NATUREZA PESSOAL", "FUNCAO OU CARGO EM COMISSAO", "GRATIFICACAO NATALINA", "FERIAS", "OUTRAS REMUNERACOES EVENTUAIS", "ABONO PERMANENCIA", "REDUTOR CONSTITUCIONAL"];
export function parseDeputyPayroll(html: string, year: number, month: number) {
  const $ = load(html), amounts: number[] = [], net: number[] = []; let sheets = 0;
  if (!/VINCULO\s*:?\s*PARLAMENTAR/.test(normalizePublicName($.root().text()))) return { gross: null, net: null, sheets: 0 };
  $("table").each((_, table) => {
    const caption = $(table).find("caption").text();
    if (!caption.includes(`${String(month).padStart(2, "0")}/${year}`) || !normalizePublicName(caption).includes("TIPO FOLHA")) return;
    sheets++;
    $(table).find("tbody tr").each((_, tr) => {
      const cells = $(tr).find("td"); if (cells.length !== 2) return;
      const label = normalizePublicName($(cells[0]).text()), value = $(cells[1]).text().trim();
      if (grossLabels.some(key => label.includes(key))) amounts.push(publicMoney(value));
      if (label.includes("REMUNERACAO APOS DESCONTOS")) net.push(publicMoney(value));
    });
  });
  return { gross: sheets && amounts.length ? sumPublished(amounts) : null, net: sheets && net.length ? sumPublished(net) : null, sheets };
}
const shortMonths = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
export function parseCabinetExpenditure(html: string) {
  const $ = load(html), rows = new Map<number, number>();
  $("#gastomensalverbagabinete tbody tr").each((_, tr) => {
    const cells = $(tr).find("td"), month = shortMonths.indexOf($(cells[0]).text().trim().toUpperCase()) + 1;
    if (month && cells.length >= 2) { if (rows.has(month)) throw new Error("Competência de gabinete duplicada na Câmara."); rows.set(month, publicMoney($(cells[1]).text())); }
  });
  return rows;
}
export function parseDeputyStaff(html: string) {
  const $ = load(html); const rows: { name: string; role: string; period: string }[] = [];
  $("table tbody tr").each((_, tr) => { const cells = $(tr).find("td"); if (cells.length < 4) return; const role = $(cells[1]).text().trim(), period = $(cells[3]).text().replace(/\s+/g, " ").trim(); if (!/(?:De|Desde)\s+\d{2}\/\d{2}\/\d{4}/i.test(period)) return; rows.push({ name: $(cells[0]).text().replace(/\s+/g, " ").trim(), role, period }); });
  return rows;
}
export function parseDeputyBenefits(html: string): { staff: { inYear: number; activeNow: number } | null; functionalApartment: string | null; housingStatus: string | null } {
  const $ = load(html); let staff: { inYear: number; activeNow: number } | null = null, functionalApartment: string | null = null, housingStatus: string | null = null;
  $(".beneficio").each((_, element) => {
    const title = normalizePublicName($(element).find("h3").text());
    const value = $(element).find(".beneficio__info").text().replace(/\s+/g," ").trim();
    if (title.startsWith("PESSOAL DE GABINETE")) { const match = value.match(/(\d+) pessoas? neste ano, sendo (\d+) ativas? atualmente/i); if (match) staff = { inYear: Number(match[1]), activeNow: Number(match[2]) }; }
    if (title.startsWith("IMOVEL FUNCIONAL") && /^(?:Faz uso desde \d{2}\/\d{2}\/\d{4}|Não faz uso)$/.test(value)) functionalApartment = value;
    if (title.startsWith("AUXILIO MORADIA")) housingStatus = /^Não recebe o auxílio$/.test(value) ? "Não recebe auxílio, conforme a situação publicada na consulta atual" : /^Recebeu R\$/.test(value) ? "Há pagamentos de auxílio-moradia publicados no ano" : null;
  });
  return { staff, functionalApartment, housingStatus };
}
export function parseHousingPayments(html: string, year: number) {
  const $ = load(html), rows = new Map<number,number>();
  if (!normalizePublicName($.root().text()).includes(`AUXILIO MORADIA EM ${year}`)) throw new Error("O auxílio-moradia não confirmou o exercício solicitado.");
  $("table tbody tr").each((_,tr) => { const cells = $(tr).find("td"), month = Number($(cells[0]).text().trim()); if (cells.length !== 2 || !Number.isInteger(month) || month<1 || month>12) return; if (rows.has(month)) throw new Error("Competência de moradia duplicada na Câmara."); rows.set(month,publicMoney($(cells[1]).text().trim())); });
  return rows;
}
const federalCache = new Map<string, { expires: number; promise: Promise<Awaited<ReturnType<typeof loadFederalCosts>>> }>();
async function loadFederalCosts(id: string, year: number, month?: number) {
  const period = selectionWindow(year, month);
  const base = `https://www.camara.leg.br/deputados/${id}`;
  const salarySource = `${base}/remuneracao?ano=${year}`, staffSource = `${base}?ano=${year}`, rosterSource = `${base}/pessoal-gabinete?ano=${year}`, housingSource = `${base}/auxilio-moradia?ano=${year}`;
  const [expenses, main, payroll, roster, housing] = await Promise.all([
    getExpenses(id, year, month).catch(() => null),
    officialText(staffSource).then(html => ({ cabinet: parseCabinetExpenditure(html), benefits: parseDeputyBenefits(html) })).catch(() => null),
    mapLimited(period.months, 3, m => officialText(`${base}/remuneracao-deputado-detalhado?mesAno=${String(m).padStart(2, "0")}${year}`).then(html => parseDeputyPayroll(html, year, m)).catch(() => ({ gross: null, net: null, sheets: 0 }))),
    officialText(rosterSource).then(parseDeputyStaff).catch(() => []),
    officialText(housingSource).then(html => parseHousingPayments(html,year)).catch(() => null),
  ]);
  const salaryMonths=period.months.filter((_,i)=>payroll[i].gross!==null);
  const salary = sumPublished(month===undefined?payroll.flatMap(row=>row.gross===null?[]:[row.gross]):payroll.map(row=>row.gross));
  const salaryNet=sumPublished(payroll.filter(row=>row.gross!==null).map(row=>row.net));
  const cabinetMonths=period.months.filter(m=>main?.cabinet.has(m));
  const cabinet = sumPublished(month===undefined?cabinetMonths.map(m=>main!.cabinet.get(m)!):period.months.map(m=>main?.cabinet.get(m)??null));
  const coverage=(months:number[])=>months.length?`${months.length<period.months.length?"Parcial · ":""}Competências confirmadas: ${months.map(m=>String(m).padStart(2,"0")).join(", ")}/${year}`:"Nenhum pagamento confirmado no período selecionado.";
  const housingRows = [...(housing || new Map<number,number>())].filter(([m]) => period.months.includes(m));
  const housingValue = sumPublished(housingRows.map(([,value]) => value));
  const components: CostComponent[] = [
    { key: "salary", label: "Remuneração bruta do parlamentar", value: salary, coverageLabel: coverage(salaryMonths), source: salarySource, note: "Folhas publicadas para a competência, incluindo complementares e estornos. Não é o subsídio de referência." },
    { key: "staff", label: "Assessores · verba de gabinete utilizada", value: cabinet, coverageLabel: coverage(cabinetMonths), source: staffSource, note: `Gasto publicado pela Câmara para cada mês; não é o teto da verba. CNE e encargos não detalhados podem ficar fora. Última competência publicada na tabela: ${main?.cabinet.size ? String(Math.max(...main.cabinet.keys())).padStart(2,"0") + "/" + year : "não identificada"}.` },
    { key: "quota", label: "Cota parlamentar · despesas líquidas", value: expenses?.total ?? null, source: expenses?.totalSource || expenses?.source || "https://dadosabertos.camara.leg.br", note: "Inclui despesas como escritório e comunicação. Não são somadas novamente como estrutura." },
    { key: "housing", label: "Auxílio-moradia · pagamentos publicados", value: housingValue, coverageLabel: coverage(housingRows.map(([m])=>m)), source: housingSource, note: "Somente os pagamentos da tabela oficial no período escolhido. A ausência de mês não vira zero. Complemento pago pela CEAP já integra a cota e não é somado novamente." },
    { key: "central", label: "Estrutura central e encargos sem rateio", value: null, source: "https://www.camara.leg.br/transparencia/", note: "Prédios, energia, segurança e outros custos institucionais não têm rateio individual verificado nesta consulta." },
  ];
  return { ...composeIdentifiedCost(components, period.days), period, salaryNet, benefits: main ? { ...main.benefits, source: staffSource, year, housingSource, housingMonths: housingRows.map(([m]) => m) } : null, staff: roster, staffSource: rosterSource, note: "Custo identificado, parcial: soma somente componentes publicados no mesmo período. Não representa o custo integral da instituição nem renda pessoal. Valores desconhecidos não são tratados como zero.", fetchedAt: new Date().toISOString() };
}
export async function getFederalCosts(id: string, year: number, month?: number) {
  if (!/^[1-9]\d{0,8}$/.test(id)) throw new Error("Parlamentar inválido.");
  const key = `${id}-${year}-${month || "all"}`, cached = federalCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.promise;
  if (federalCache.size >= 40) federalCache.delete(federalCache.keys().next().value!);
  const promise = loadFederalCosts(id, year, month).catch(error => { federalCache.delete(key); throw error; }); federalCache.set(key, { expires: Date.now() + 3600000, promise }); return promise;
}
export type ParliamentCostResult = Awaited<ReturnType<typeof getFederalCosts>>;
