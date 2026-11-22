import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CircleAlert, Database } from "lucide-react";
import { CamaraError, getDeputy, CAMARA_API } from "@/lib/camara";
import { getState } from "@/lib/states";
import { DeputyPhoto } from "@/components/deputy-card";
export const metadata: Metadata = { title: "Perfil parlamentar" };
type Props = { params: Promise<{ id: string }> };
const value = (v?: string | null) => v?.trim() || "Não informado pela Câmara";
function officialDate(date?: string | null) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Não informado pela Câmara";
  return date.split("-").reverse().join("/");
}
export default async function DeputyPage({ params }: Props) {
  const { id } = await params;
  let deputy;
  try { deputy = await getDeputy(id); }
  catch (error) {
    if (error instanceof CamaraError && error.status === 404) notFound();
    return <main id="conteudo" className="container content-page"><div className="notice error-notice" role="alert"><CircleAlert size={30} /><h1>O perfil está indisponível no momento</h1><p>{error instanceof CamaraError ? error.message : "Não conseguimos consultar a fonte oficial."}</p><a href={`/deputados/${id}`} className="button button-dark">Tentar novamente</a><Link href="/deputados">Voltar aos parlamentares</Link></div></main>;
  }
  const status = deputy.ultimoStatus;
  const state = getState(status.siglaUf);
  const office = status.gabinete;
  const email = status.email || office?.email;
  return <main id="conteudo" className="container content-page"><Link href={state ? `/estados/${state.uf.toLowerCase()}` : "/deputados"} className="back-link"><ArrowLeft size={16} /> {state ? `Deputados de ${state.name}` : "Todos os parlamentares"}</Link>
    <section className="profile-hero"><DeputyPhoto src={status.urlFoto} name={status.nome} large /><div><span className="eyebrow">PERFIL OFICIAL · CÂMARA DOS DEPUTADOS</span><h1>{status.nome}</h1><div className="deputy-tags"><span>{status.siglaPartido}</span><span>{state?.name || status.siglaUf}</span></div><p>Situação no último registro: {value(status.situacao)}</p></div></section>
    <div className="profile-sections"><section className="info-card"><h2>Conheça o parlamentar</h2><dl><div><dt>Nome civil</dt><dd>{value(deputy.nomeCivil)}</dd></div><div><dt>Partido</dt><dd>{status.siglaPartido}</dd></div><div><dt>Representação</dt><dd>{state?.name || status.siglaUf}</dd></div><div><dt>Nascimento</dt><dd>{officialDate(deputy.dataNascimento)}</dd></div><div><dt>Naturalidade</dt><dd>{[deputy.municipioNascimento, deputy.ufNascimento].filter(Boolean).join(" / ") || "Não informado pela Câmara"}</dd></div><div><dt>Escolaridade</dt><dd>{value(deputy.escolaridade)}</dd></div><div><dt>Condição eleitoral</dt><dd>{value(status.condicaoEleitoral)}</dd></div></dl></section>
      <section className="info-card"><h2>Contato institucional</h2><p>Dados de contato publicados pela Câmara dos Deputados.</p><dl><div><dt>E-mail</dt><dd>{email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? <a href={`mailto:${email}`}>{email}</a> : "Não informado pela Câmara"}</dd></div><div><dt>Telefone</dt><dd>{value(office?.telefone)}</dd></div><div><dt>Gabinete</dt><dd>{value(office?.nome)}</dd></div><div><dt>Prédio / sala</dt><dd>{[office?.predio, office?.sala].filter(Boolean).join(" / ") || "Não informado pela Câmara"}</dd></div></dl><a href={`https://www.camara.leg.br/deputados/${deputy.id}`} className="button button-dark mt-6" target="_blank" rel="noreferrer">Ver perfil na Câmara <ArrowUpRight size={16} /></a></section></div>
    <section className="info-card profile-finance"><Database size={34} /><div><h2>E os gastos públicos?</h2><p>As despesas da cota parlamentar estão disponíveis no painel interativo, com período, fornecedor e comprovante quando publicado. <Link href="/">Abrir o painel e pesquisar este parlamentar.</Link></p></div></section>
    <div className="source-note"><span className="live-dot" /><p>Fonte: <a href={`${CAMARA_API}/deputados/${deputy.id}`} target="_blank" rel="noreferrer">API oficial da Câmara dos Deputados</a>. Informações do último registro fornecido pela API, com cache de até 30 minutos. Campos ausentes são identificados como não informados.</p></div>
  </main>;
}
