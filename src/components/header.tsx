import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./brand";
export function Header() {
  return <header className="header"><div className="container header-inner">
    <Brand />
    <nav aria-label="Navegação principal">
      <Link href="/">Explore o mapa</Link>
      <Link href="/deputados">Parlamentares</Link>
      <Link href="/sobre" className="nav-about">Sobre o projeto</Link>
    </nav>
    <Link href="/sobre#fontes" className="header-source">Dados abertos <ArrowUpRight size={15} /></Link>
  </div></header>;
}
