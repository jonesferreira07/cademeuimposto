import Link from "next/link";
import { ArrowLeft, ArrowRight, SearchX, CircleAlert, ExternalLink } from "lucide-react";
import { CamaraError, getDeputies } from "@/lib/camara";
import { DeputyCard } from "./deputy-card";

export async function DeputyResults({ uf, q, page }: { uf?: string; q?: string; page?: string }) {
  let result;
  try { result = await getDeputies({ uf, q, page }); }
  catch (error) { return <div className="notice error-notice" role="alert"><CircleAlert size={26} /><h2>Não conseguimos carregar os parlamentares</h2><p>{error instanceof CamaraError ? error.message : "Ocorreu um erro na consulta. Tente novamente."}</p><a className="button button-dark" href={uf ? `/estados/${uf.toLowerCase()}` : "/deputados"}>Tentar novamente <ArrowRight size={17} /></a><a href="https://www.camara.leg.br/deputados/quem-sao" target="_blank" rel="noreferrer">Consultar diretamente na Câmara <ExternalLink size={14} /></a></div>; }
  const pageLink = (p: number) => { const params = new URLSearchParams(); if (q) params.set("q", q); if (uf) params.set("uf", uf); params.set("page", String(p)); return `/deputados?${params}`; };
  return <>
    <div className="results-heading"><span><strong>{result.deputies.length}</strong> {result.deputies.length === 1 ? "parlamentar nesta página" : "parlamentares nesta página"}</span><span>Ordem alfabética · Página {result.page}</span></div>
    {result.deputies.length ? <div className="deputy-grid">{result.deputies.map(deputy => <DeputyCard key={deputy.id} deputy={deputy} />)}</div> : <div className="notice"><SearchX size={32} /><h2>Nenhum parlamentar encontrado</h2><p>Tente outro nome ou selecione um estado diferente.</p><Link href="/deputados" className="button button-dark">Limpar filtros</Link></div>}
    {(result.page > 1 || result.hasNext) && <nav className="pagination" aria-label="Paginação de parlamentares">{result.page > 1 && <Link className="button button-outline" href={pageLink(result.page - 1)}><ArrowLeft size={16} /> Anterior</Link>}<span>Página {result.page}</span>{result.hasNext && <Link className="button button-dark" href={pageLink(result.page + 1)}>Próxima <ArrowRight size={16} /></Link>}</nav>}
    <div className="source-note"><span className="live-dot" /><p>Fonte: <a href={result.source} target="_blank" rel="noreferrer">Dados Abertos da Câmara dos Deputados <ExternalLink size={12} /></a>. Consulta à listagem atual da API, com cache de até 30 minutos. O total exibido corresponde somente a esta página.</p></div>
  </>;
}
