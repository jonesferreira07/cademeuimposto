"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, UserRound } from "lucide-react";
import type { Deputy } from "@/lib/camara";
export function DeputyPhoto({ src, name, large = false }: { src?: string | null; name: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const safe = (src?.startsWith("https://www.camara.leg.br/") || src?.startsWith("https://www.senado.leg.br/"));
  return <div className={`deputy-photo ${large ? "large" : ""}`}>{safe && !failed ? <img src={src!} alt={`Foto oficial de ${name}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <UserRound size={large ? 52 : 32} aria-label="Foto não disponível" />}</div>;
}
export function DeputyCard({ deputy }: { deputy: Deputy }) {
  return <Link href={`/deputados/${deputy.id}`} className="deputy-card"><div className="deputy-card-top"><DeputyPhoto src={deputy.urlFoto} name={deputy.nome} /><ArrowUpRight size={20} /></div><div><span className="eyebrow">Deputado(a) federal</span><h3>{deputy.nome}</h3><div className="deputy-tags"><span>{deputy.siglaPartido}</span><span>{deputy.siglaUf}</span></div></div><span className="card-link">Conhecer parlamentar <ArrowUpRight size={14} /></span></Link>;
}
