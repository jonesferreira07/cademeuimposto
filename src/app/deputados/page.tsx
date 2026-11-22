import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import { DeputyResults } from "@/components/deputy-results";
import { getState } from "@/lib/states";
import { ResultsLoading } from "@/components/results-loading";
export const metadata: Metadata = { title: "Parlamentares" };
export default async function DeputiesPage({ searchParams }: { searchParams: Promise<{ q?: string; uf?: string; page?: string }> }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const uf = typeof params.uf === "string" ? params.uf.toUpperCase() : "";
  const page = typeof params.page === "string" ? params.page : undefined;
  const state = getState(uf);
  return <main id="conteudo" className="container content-page"><Link href="/" className="back-link"><ArrowLeft size={16} /> Voltar ao mapa</Link><div className="page-heading"><span className="eyebrow">QUEM REPRESENTA VOCÊ</span><h1>{state ? `Deputados de ${state.name}` : "Conheça os parlamentares."}</h1><p>Pesquise os deputados federais e consulte informações direto da Câmara.</p></div><SearchForm compact q={q} uf={uf} /><Suspense key={`${q}-${uf}-${page}`} fallback={<ResultsLoading />}><DeputyResults uf={uf || undefined} q={q} page={page} /></Suspense></main>;
}
