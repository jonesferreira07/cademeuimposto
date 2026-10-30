"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, ExternalLink, Info, MapPin, Moon, ShieldCheck, Sun, X, Link as LinkIcon } from "lucide-react";
import { Brand } from "./brand";
import { DashboardMap } from "./dashboard-map";
import { StatePanel } from "./state-panel";
import { MunicipalFinancePanel } from "./municipal-finance-panel";
import { RepresentationPanel } from "./representation-panel";
import { TaxCounter } from "./tax-counter";
import { TaxRankings } from "./tax-rankings";
import { FederalPowers } from "./federal-powers";
import { ReflectionGuide } from "./reflection-guide";
import { states } from "@/lib/states";
import { months, brazilDate } from "@/lib/finance";
import { REPORTING_YEAR } from "@/lib/reporting-period";
import { useData } from "./dashboard-ui";
import { municipalHash, municipalSelection, type MunicipalDataset } from "@/lib/municipal";
import { CitizenshipWelcome } from "./citizenship-welcome";

export function Dashboard({ initialMonth }: { initialMonth: number | "all" }) {
  const [uf, setUf] = useState<string | null>(null);
  const [cityId, setCityId] = useState<string | null>(null);
  const municipal = useData<MunicipalDataset>(uf && uf !== "DF" ? `/data/municipal/${uf.toLowerCase()}.json` : null);
  const city = municipal.data?.cities.find(item => item.id === cityId) || null;
  const [homeVersion, setHomeVersion] = useState(0);
  const year = REPORTING_YEAR;
  const availableMonths = brazilDate().year === year ? brazilDate().month : 12;
  const [month, setMonth] = useState(String(initialMonth));
  const [view, setView] = useState<"map" | "state" | "deputies">("map");
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const sources = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try { const saved = localStorage.getItem("cmi-theme"); if (saved === "dark" || saved === "light") setTheme(saved); } catch { /* A alternância continua funcionando com armazenamento bloqueado. */ }
  }, []);
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("cmi-theme", next); } catch { /* Preferência opcional. */ }
  }
  useEffect(() => {
    const read = () => { const selected = municipalSelection(location.hash); setUf(selected.uf); setCityId(selected.city); setView(selected.city ? "state" : "map"); };
    read(); window.addEventListener("hashchange", read); return () => window.removeEventListener("hashchange", read);
  }, []);
  function selectState(value: string | null) { setUf(value); setCityId(null); setView("map"); history.replaceState(null, "", municipalHash(value)); }
  function selectCity(id: string | null) { if (id && !municipal.data?.cities.some(item => item.id === id)) return; setCityId(id); setView(id ? "state" : "map"); history.replaceState(null, "", municipalHash(uf, id)); }
  function returnHome() { setUf(null); setCityId(null); setView("map"); setMonth(String(initialMonth)); setHomeVersion(value => value + 1); history.replaceState(null, "", "/"); }
  async function share() { try { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { sources.current?.showModal(); } }
  const periodLabel = `${month === "all" ? "Acumulado" : months[Number(month) - 1]} de ${year}`;
  return <main id="conteudo" className="dashboard" data-theme={theme}>
    <header className="dash-header"><Brand onHome={returnHome} /><div className="dash-header-label"><span className="live-dot" /> Seu dinheiro merece atenção.</div><div className="dash-header-actions"><TaxRankings onSelect={selectState} year={year} month={month} /><FederalPowers /><button className="theme-toggle" onClick={toggleTheme} aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"} title={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}<span>{theme === "dark" ? "Clarear" : "Escurecer"}</span></button><button aria-label="Fontes e critérios" onClick={() => sources.current?.showModal()}><Info size={17} /><span>Fontes e critérios</span></button><button onClick={share} aria-label="Copiar link deste painel">{copied ? <Check size={17} /> : <LinkIcon size={17} />}<span>{copied ? "Link copiado" : "Compartilhar"}</span></button></div></header>
    <CitizenshipWelcome />
    <TaxCounter key={uf || "BR"} uf={uf} year={year} />
    <div className="dash-toolbar"><div className="dash-location"><MapPin size={15} /><label className="sr-only" htmlFor="dash-uf">Estado</label><select id="dash-uf" value={uf || ""} onChange={e => selectState(e.target.value || null)}><option value="">Brasil · escolha um estado</option>{states.map(s => <option value={s.uf} key={s.uf}>{s.name} ({s.uf})</option>)}</select></div><div className="dash-period"><span>Consultar gastos em</span><label className="sr-only" htmlFor="dash-month">Mês</label><select id="dash-month" value={month} onChange={e => setMonth(e.target.value)}><option value="all">Acumulado em 2026</option>{months.slice(0, availableMonths).map((name, i) => <option key={name} value={i + 1}>{name}</option>)}</select><span className="reporting-year" aria-label="Ano das contas: 2026">2026</span></div></div>
    <nav className="dash-mobile-tabs" aria-label="Seção do painel"><button aria-pressed={view === "map"} className={view === "map" ? "active" : ""} onClick={() => setView("map")}>Mapa</button><button aria-pressed={view === "state"} className={view === "state" ? "active" : ""} onClick={() => setView("state")}>{cityId ? "Contas municipais" : uf ? `Estado · ${uf}` : "Brasil"}</button><button aria-pressed={view === "deputies"} className={view === "deputies" ? "active" : ""} onClick={() => setView("deputies")}>Representantes</button></nav>
    <div className={`dash-workspace mobile-${view}`}>{cityId ? <MunicipalFinancePanel key={cityId} id={cityId} name={city?.name || null} uf={uf} year={year} month={month} onState={() => { selectCity(null); setView("state"); }} /> : <StatePanel key={`state-${homeVersion}`} uf={uf} year={year} month={month} />}<DashboardMap key={`map-${homeVersion}`} uf={uf} onSelect={selectState} cityId={cityId} onCity={selectCity} municipal={municipal} /><RepresentationPanel key={`${homeVersion}-${uf || "BR"}-${cityId || "state"}`} uf={uf} year={year} month={month} periodLabel={periodLabel} cityId={cityId} city={city} municipal={municipal} onClearCity={() => selectCity(null)} /></div>
    <footer className="dash-footer"><span><ShieldCheck size={12} /> Independente e apartidário. Dados das fontes indicadas.</span><ReflectionGuide /><span className="dash-desktop-only">IBGE · Câmara · Senado · Tesouro · CGU · ACSP/IBPT</span></footer>
    <dialog className="dash-dialog" ref={sources} aria-labelledby="sources-title"><div className="dialog-heading"><div><span className="dash-eyebrow">INFORMAÇÃO EM CONTEXTO</span><h2 id="sources-title">De onde vêm os números?</h2></div><button aria-label="Fechar fontes" onClick={() => sources.current?.close()}><X size={20} /></button></div><div className="dialog-copy"><h3>Impostômetro · ACSP/IBPT</h3><p>O contador usa os números públicos e a taxa de projeção informados pela ACSP/IBPT, consultados a cada minuto. A projeção é pausada após cinco minutos sem atualização recente. Inclui estimativas e projeções, e não representa um registro oficial de pagamentos a cada segundo. O recorte de UF soma tributos das três esferas arrecadados naquele território; não é dinheiro recebido pelo governo estadual. <a href="https://impostometro.com.br/home/metodologiaimpostometro" target="_blank" rel="noreferrer">Metodologia ↗</a></p><h3>Estados · Tesouro Nacional / Siconfi</h3><p>RREO: receitas realizadas e despesas pagas no Anexo 01; despesas liquidadas por função no Anexo 02, sem somar funções e subfunções. Valores acumulados desde janeiro até o bimestre indicado. O indicador recebido da União soma apenas as rubricas de transferências correntes e de capital da União; não inclui receitas próprias nem transferências de outros entes. Receita total pode incluir operações de crédito e receitas intraorçamentárias.</p><h3>Deputados · Câmara dos Deputados</h3><p>Despesas da Cota para o Exercício da Atividade Parlamentar (CEAP): pagamentos e reembolsos vinculados ao mandato. Não são salário nem dinheiro pessoal recebido pelo deputado. Os totais líquidos e as categorias vêm da tabela comparativa oficial da Câmara, incluindo passagens SIGEPA e estornos. Os documentos detalhados vêm da API ou do arquivo anual oficial e podem não explicar integralmente o total comparativo. Essas fontes não são somadas entre si. Data fiscal e mês de competência não são a data do reembolso. A finalidade exibida é a categoria declarada pela Câmara.</p><h3>Cota, emendas e rankings</h3><p>A margem da cota é uma referência: limite mensal da UF × meses, menos gasto acumulado. Não é o saldo oficial individual. Reembolsos podem chegar com atraso; menor gasto, sozinho, não comprova economicidade. Emendas individuais vêm dos arquivos públicos da CGU, com vínculo de autoria conferido no Congresso e na Câmara. Empenhado, liquidado e pago são etapas e não devem ser somados. Beneficiários e convênios têm escopos próprios.</p><p>Ranking estadual: volume estimado no território, segundo ACSP/IBPT. Comparação internacional: tributos como percentual do PIB em 2024, em 128 economias da base OCDE. O dado brasileiro de 2025 do Tesouro é apresentado separadamente. Consumo em PPC: Banco Mundial, 2025, em 124 economias. Não representa todos os países nem avalia serviços públicos.</p><h3>Municípios · IBGE e TSE</h3><p>O mapa abre a divisão municipal do estado. Nomes e partidos dos eleitos vêm da base municipal do TSE, com fotografia datada e eleições suplementares presentes no arquivo. Resultado eleitoral não confirma exercício atual. Afastamentos, sucessões e suplências precisam de conferência no órgão municipal. Contas municipais vêm dos Anexos 01 e 02 do RREO/Siconfi, acumuladas desde janeiro de 2026 até o bimestre indicado. O resumo mostra pagamentos; a divisão por área mostra despesas liquidadas e exclui operações intraorçamentárias. Não vinculamos cada tributo a uma despesa individual. Salários e despesas pessoais dos representantes municipais não estão integrados.</p><h3>Atualização e limites</h3><p>Câmara: cache de até 30 minutos. Tesouro: até 1 hora. A data da consulta é diferente da data de publicação. Ausência de registros não comprova ausência de gasto. Os relatórios estaduais são agregados e não vinculam uma transferência a uma nota fiscal. Para contratos e pagamentos individuais, consulte o portal do ente responsável. Emendas, salários e demais verbas não integram o total CEAP. A aba Custo/dia soma apenas componentes individualizados e continua parcial. Pagamentos estaduais sem conferência primária ficam indisponíveis.</p><p>Fotos e consultas geram acessos às fontes. O contador usa uma apresentação própria, com atribuição à ACSP/IBPT, sem carregar o widget ou seus anúncios. O mapa foi derivado da malha simplificada do IBGE e não serve para medições.</p><a href="/sobre" className="dialog-full-source">Abrir documentação completa <ExternalLink size={13} /></a></div></dialog>
  </main>;
}
