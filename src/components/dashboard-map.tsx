"use client";
import { useState } from "react";
import { Minus, Plus, RotateCcw, MousePointer2 } from "lucide-react";
import paths from "@/lib/brazil-paths.json";
import { states, getState } from "@/lib/states";
import { AdSlot } from "./ad-slot";
export function DashboardMap({ uf, onSelect }: { uf: string | null; onSelect: (uf: string | null) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const focus = getState(uf || "");
  const selectedPath = paths.find(p => p.code === getState(uf || "")?.code);
  const centerX = selectedPath?.x ?? 300, centerY = selectedPath?.y ?? 270;
  return <section className="dash-map" aria-label="Mapa do Brasil">
    <div className="map-context"><span className="dash-eyebrow">O BRASIL, ESTADO POR ESTADO</span><h1>{focus?.name || "Cadê Meu Imposto"}<span>{focus ? "." : "?"}</span></h1><p>{focus ? `${focus.region} · ${focus.uf}` : "Escolha um estado para explorar."}</p></div>
    <div className="dash-map-canvas"><svg viewBox="35 0 520 530" aria-label="Selecione um estado no mapa interativo do Brasil"><defs><linearGradient id="map-green" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#00583e" /><stop offset="1" stopColor="#00c56e" /></linearGradient><linearGradient id="map-yellow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe32e" /><stop offset="1" stopColor="#f4ac00" /></linearGradient><linearGradient id="map-bright-green" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#12d777" /><stop offset="1" stopColor="#00a65d" /></linearGradient><linearGradient id="map-blue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#034071" /><stop offset="1" stopColor="#0875ed" /></linearGradient></defs><g transform={`translate(${-centerX * (zoom - 1)} ${-centerY * (zoom - 1)}) scale(${zoom})`}>
      {paths.map(path => {
        const state = states.find(s => s.code === path.code)!;
        const active = hover === state.uf || uf === state.uf;
        return <a key={state.uf} href={`#uf=${state.uf.toLowerCase()}`} aria-label={`Explorar ${state.name}`} aria-current={uf === state.uf ? "true" : undefined} onClick={event => { event.preventDefault(); onSelect(state.uf); setHover(null); }} onMouseEnter={() => setHover(state.uf)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(state.uf)} onBlur={() => setHover(null)} className={`dash-map-state ${active ? "selected" : ""} region-${state.region}`}><title>{`${state.name} (${state.uf}) — explorar receitas e representantes`}</title><path d={path.d} fillRule="evenodd" />{state.uf === "DF" && <circle cx={path.x} cy={path.y} r="7" />}<text x={path.x} y={path.y + (state.uf === "DF" ? -12 : 3)}>{state.uf}</text></a>;
      })}</g></svg></div>
    <div className="map-navigation"><div className="map-hint" aria-live="polite"><MousePointer2 size={13} /><span>{uf ? "Selecione outra UF para comparar" : "Clique em um estado para começar"}</span></div><div className="map-tools"><button onClick={() => setZoom(z => Math.min(2, z + .25))} disabled={zoom >= 2} aria-label="Ampliar mapa"><Plus size={16} /></button><button onClick={() => setZoom(z => Math.max(1, z - .25))} disabled={zoom <= 1} aria-label="Reduzir mapa"><Minus size={16} /></button><button onClick={() => { setZoom(1); onSelect(null); }} aria-label="Voltar à visão do Brasil"><RotateCcw size={15} /></button></div></div>
    <AdSlot />
  </section>;
}
