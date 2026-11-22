import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./brand";
export function Footer() {
  return <footer className="footer"><div className="container">
    <div className="footer-top"><Brand light /><p>Informação pública.<br /><span>Cidadania em primeiro lugar.</span></p><Link href="/sobre">Conheça o projeto <ArrowUpRight size={16} /></Link></div>
    <div className="footer-bottom"><span>Uma iniciativa independente. Sem vínculo com órgãos públicos ou partidos.</span><Link href="/sobre#fontes">Fontes e metodologia</Link><span>Feito para todos os brasileiros <span className="brazil-dot" /></span></div>
  </div></footer>;
}
