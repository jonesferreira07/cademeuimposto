"use client";
import { CircleAlert } from "lucide-react";
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) { return <main id="conteudo" className="container content-page"><div className="notice error-notice" role="alert"><CircleAlert size={34} /><h1>Algo interrompeu a consulta</h1><p>Tente carregar a página novamente. Se o problema continuar, volte ao início e faça uma nova busca.</p><button className="button button-dark" onClick={retry}>Tentar novamente</button><a href="/">Voltar ao início</a></div></main>; }
