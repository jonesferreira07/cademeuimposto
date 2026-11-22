"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronRight, Info, Pause, Play, RefreshCcw, X } from "lucide-react";
import type { CounterSample } from "@/lib/tax-counter";
import { comparisonReferences, equivalentUnits } from "@/lib/comparisons";
import { money } from "@/lib/finance";
import { taxLocation } from "@/lib/states";

const STORAGE_PREFIX = "cmi:ultimo-impostometro:";

function lastVerifiedSample(uf: string | null, year: number): CounterSample | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + (uf || "br"));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const item = value as Partial<CounterSample>;
    const observed = Date.parse(item.observedAt || "");
    if (
      item.uf !== uf || item.year !== year || item.source !== "https://impostometro.com.br" ||
      typeof item.value !== "number" || !Number.isFinite(item.value) || item.value < 0 ||
      typeof item.increment !== "number" || !Number.isFinite(item.increment) || item.increment < 0 ||
      !Number.isFinite(observed) || observed > Date.now() + 60000
    ) return null;
    return item as CounterSample;
  } catch {
    return null;
  }
}

export function TaxCounter({ uf, year }: { uf: string | null; year: number }) {
  const [sample, setSample] = useState<CounterSample | null>(null), [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0), [index, setIndex] = useState(0), [paused, setPaused] = useState(false), [retryToken, setRetryToken] = useState(0);
  const methods = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let disposed = false; let controller: AbortController | undefined;
    setSample(lastVerifiedSample(uf, year)); setError(null); setNow(Date.now());
    async function refresh() {
      controller?.abort(); controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 30000);
      try {
        const suffix = uf ? `?uf=${uf}` : "";
        // A fonte pode falhar somente no TLS da função Node. Tente também a rede Edge.
        let response: Response | null = null;
        try {
          response = await fetch(`/api/impostos${suffix}`, { signal: controller.signal });
        } catch { /* falha de rede Node; rota Edge será consultada abaixo */ }
        if (!response?.ok) {
          response = await fetch(`/api/impostos-edge${suffix}`, { signal: controller.signal });
        }
        const data = await response.json(); if (!response.ok) throw new Error(data.error || "Contador indisponível.");
        if (!disposed) {
          setSample(data); setError(null); setNow(Date.now());
          try { window.localStorage.setItem(STORAGE_PREFIX + (uf || "br"), JSON.stringify(data)); } catch { /* navegação privada / armazenamento bloqueado */ }
        }
      } catch (err) { if (!disposed) setError(err instanceof Error ? err.message : "Falha na consulta do contador."); }
      finally { clearTimeout(timeout); }
    }
    void refresh(); const poll = setInterval(refresh, 60000); const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { disposed = true; controller?.abort(); clearInterval(poll); clearInterval(tick); };
  }, [uf, year, retryToken]);
  useEffect(() => { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true); }, []);
  useEffect(() => { if (paused) return; const timer = setInterval(() => setIndex(i => (i + 1) % comparisonReferences.length), 6500); return () => clearInterval(timer); }, [paused]);
  const age = sample ? Math.max(0, now - Date.parse(sample.observedAt)) : 0;
  const stale = age > 300000;
  // Depois de cinco minutos, mostramos apenas a última amostra verificada, sem simular arrecadação em tempo real.
  const total = sample ? sample.value + (stale ? 0 : sample.increment * Math.max(0, age) / 1000) : null;
  const updatedAt = sample ? new Date(sample.observedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : null;
  const reference = comparisonReferences[index];
  return <section className="tax-strip" aria-label="Contador de tributos">
    <div className="tax-strip-copy"><span className="dash-eyebrow"><span className="live-dot" /> IMPOSTÔMETRO · {sample?.year || year} · ESTIMATIVA</span><h2>Quanto de imposto já pagamos {taxLocation(uf)}?</h2><p>Tributos federais, estaduais e municipais.<br />Acumulado desde 1º de janeiro.</p></div>
    <div className="tax-amount-block">
      {total === null ? <div className="tax-counter-wait" role="status">
        <span>{error ? "Valores temporariamente indisponíveis." : "Consultando o Impostômetro…"}</span>
        {error && <><button type="button" onClick={() => setRetryToken(value => value + 1)}><RefreshCcw size={14} /> Tentar novamente</button><a href="https://impostometro.com.br" target="_blank" rel="noreferrer">Consultar a fonte ↗</a></>}
      </div> : <><strong className="tax-amount" aria-label={`${stale ? "Última amostra verificada" : "Estimativa de tributos"}: ${money(total)}`}>{money(total)}</strong>
        <div className="tax-equivalence"><span>Equivale a <b>{new Intl.NumberFormat("pt-BR").format(equivalentUnits(total, reference.unitValue))}</b> {reference.label}*</span><div><button onClick={() => setPaused(p => !p)} aria-label={paused ? "Alternar comparações automaticamente" : "Pausar comparações"}>{paused ? <Play size={13} /> : <Pause size={13} />}</button><button aria-label="Próxima comparação" onClick={() => setIndex(i => (i + 1) % comparisonReferences.length)}><ChevronRight size={15} /></button><button onClick={() => methods.current?.showModal()} aria-label="Fontes das equivalências"><Info size={14} /></button></div></div></>}
      <div className="tax-attribution"><a href="https://impostometro.com.br" target="_blank" rel="noreferrer">ACSP / IBPT <ArrowUpRight size={12} /></a><span>{stale ? `Última amostra verificada: ${updatedAt} (Brasília) · sem atualização em tempo real` : error && sample ? "Falha na atualização · tentando novamente" : "Estimativa do provedor · não é registro de caixa"}</span></div>
    </div>
    <dialog ref={methods} className="dash-dialog" aria-labelledby="equivalence-title"><div className="dialog-heading"><h2 id="equivalence-title">O tamanho desse dinheiro</h2><button aria-label="Fechar equivalências" onClick={() => methods.current?.close()}><X size={20} /></button></div><div className="dialog-copy"><p>*Comparações ilustrativas de poder de compra: total estimado dividido pelo valor unitário, arredondado para baixo. Não indicam o destino real dos tributos nem uma promessa de entrega pública.</p>{comparisonReferences.map(item => <div key={item.id}><h3>{item.label}</h3><p>{money(item.unitValue)} por unidade. {item.description} <a href={item.source} target="_blank" rel="noreferrer">{item.reference} ↗</a></p></div>)}<p>O contador segue a taxa de atualização informada pela ACSP/IBPT. Consultamos a fonte a cada minuto e pausamos a projeção após cinco minutos sem uma amostra recente.</p></div></dialog>
  </section>;
}
