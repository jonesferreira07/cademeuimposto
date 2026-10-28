import Link from "next/link";
import { MapPinned } from "lucide-react";
export default function NotFound() { return <main id="conteudo" className="container content-page"><div className="notice"><MapPinned size={36} /><span className="eyebrow">PÁGINA NÃO ENCONTRADA · 404</span><h1>Vamos encontrar outro caminho?</h1><p>Esta página, estado ou parlamentar não foi encontrado. Volte ao mapa para continuar explorando.</p><Link href="/" className="button button-dark">Voltar ao mapa do Brasil</Link></div></main>; }
