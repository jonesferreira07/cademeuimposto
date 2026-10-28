"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronRight, Info, Pause, Play, X } from "lucide-react";
import type { CounterSample } from "@/lib/tax-counter";
import { comparisonReferences, equivalentUnits } from "@/lib/comparisons";
import { money } from "@/lib/finance";
import { taxLocation } from "@/lib/states";

export function TaxCounter({ uf, year }: { uf: string | null; year: number }) {
  const [sample, setSample] = useState<CounterSample | null>(null), [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0), [index, setIndex] = useState(0), [paused, setPaused] = useState(false);
  const methods = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let disposed = false; let controller: AbortController | undefined;
    setSample(null); setError(null);
    async function refresh() {
      controller?.abort(); controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 20000);
      try {
        const response = await fetch(`/api/impostos${uf ? `?uf=${uf}` : ""}`, { signal: controller.signal });
        const data = await response.json(); if (!response.ok) throw new Error(data.error || "Contador indisponível.");
        if (!disposed) { setSample(data); setError(null); setNow(Date.now()); }
      } catch (err) { if (!disposed) setError(err instanceof Error ? err.message : "Falha na consulta do contador."); }
      finally { clearTimeout(timeout); }
    }
    void refresh(); const poll = setInterval(refresh, 60000); const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { disposed = true; controller?.abort(); clearInterval(poll); clearInterval(tick); };
  }, [uf]);
  useEffect(() => { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true); }, []);
  useEffect(() => { if (paused) return; const timer = setInterval(() => setIndex(i => (i + 1) % comparisonReferences.length), 6500); return () => clearInterval(timer); }, [paused]);
  const age = sample ? Math.max(0, now - Date.parse(sample.observedAt)) : 0;
  const stale = age > 300000;
  const total = sample ? sample.value + sample.increment * Math.min(age, 300000) / 1000 : null;
  const reference = comparisonReferences[index];
  return <section className="tax-strip" aria-label="Contador de tributos">
    <div className="tax-strip-copy"><span className="dash-eyebrow"><span className="live-dot" /> IMPOSTÔMETRO · {sample?.year || year} · ESTIMATIVA</span><h2>Quanto de imposto já pagamos {taxLocation(uf)}?</h2><p>Tributos federais, estaduais e municipais.<br />Acumulado desde 1º de janeiro.</p></div>
    <div className="tax-amount-block">
      {total === null ? <div className="tax-counter-wait" role="status">{error || "Consultando o Impostômetro…"}</div> : <><strong className="tax-amount" aria-label={`Estimativa de tributos: ${money(total)}`}>{money(total)}</strong>
        <div className="tax-equivalence"><span>Equivale a <b>{new Intl.NumberFormat("pt-BR").format(equivalentUnits(total, reference.unitValue))}</b> {reference.label}*</span><div><button onClick={() => setPaused(p => !p)} aria-label={paused ? "Alternar comparações automaticamente" : "Pausar comparações"}>{paused ? <Play size={13} /> : <Pause size={13} />}</button><button aria-label="Próxima comparação" onClick={() => setIndex(i => (i + 1) % comparisonReferences.length)}><ChevronRight size={15} /></button><button onClick={() => methods.current?.showModal()} aria-label="Fontes das equivalências"><Info size={14} /></button></div></div></>}
      <div className="tax-attribution"><a href="https://impostometro.com.br" target="_blank" rel="noreferrer">ACSP / IBPT <ArrowUpRight size={12} /></a><span>{stale ? "Atualização atrasada · estimativa pausada" : error && sample ? "Falha na atualização · tentando novamente" : "Estimativa do provedor · não é registro de caixa"}</span></div>
    </div>
    <dialog ref={methods} className="dash-dialog" aria-labelledby="equivalence-title"><div className="dialog-heading"><h2 id="equivalence-title">O tamanho desse dinheiro</h2><button aria-label="Fechar equivalências" onClick={() => methods.current?.close()}><X size={20} /></button></div><div className="dialog-copy"><p>*Comparações ilustrativas de poder de compra: total estimado dividido pelo valor unitário, arredondado para baixo. Não indicam o destino real dos tributos nem uma promessa de entrega pública.</p>{comparisonReferences.map(item => <div key={item.id}><h3>{item.label}</h3><p>{money(item.unitValue)} por unidade. {item.description} <a href={item.source} target="_blank" rel="noreferrer">{item.reference} ↗</a></p></div>)}<p>O contador segue a taxa de atualização informada pela ACSP/IBPT. Consultamos a fonte a cada minuto e pausamos a projeção após cinco minutos sem uma amostra recente.</p></div></dialog>
  </section>;
}
