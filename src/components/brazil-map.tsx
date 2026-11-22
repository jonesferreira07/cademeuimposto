"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MousePointer2, MapPin } from "lucide-react";
import paths from "@/lib/brazil-paths.json";
import { states } from "@/lib/states";

export function BrazilMap() {
  const [active, setActive] = useState<string | null>(null);
  const selected = states.find(s => s.uf === active);
  return <div className="map-panel">
    <div className="map-panel-top"><span><span className="live-dot" /> Explore o Brasil</span><span>27 unidades federativas</span></div>
    <div className="map-wrap">
      <svg viewBox="0 0 600 540" aria-label="Mapa interativo do Brasil. Escolha um estado para conhecer seus deputados federais." className="brazil-map">
        {paths.map(path => {
          const state = states.find(s => s.code === path.code)!;
          return <a key={state.uf} href={`/estados/${state.uf.toLowerCase()}`} aria-label={`Ver deputados de ${state.name}`} onMouseEnter={() => setActive(state.uf)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(state.uf)} onBlur={() => setActive(null)} className={`map-state ${active === state.uf ? "active" : ""} ${state.region === "Nordeste" ? "northeast" : ""}`}>
            <title>{`${state.name} (${state.uf}) — ver deputados federais`}</title>
            <path d={path.d} fillRule="evenodd" />
            {state.uf === "DF" && <circle cx={path.x} cy={path.y} r="7" className="df-target" />}
            <text x={path.x} y={path.y + (state.uf === "DF" ? -11 : 3)}>{state.uf}</text>
          </a>;
        })}
      </svg>
      <div className="map-compass" aria-hidden="true"><span>N</span><span>↑</span></div>
      <div className="map-caption"><MousePointer2 size={14} /><span>Clique em um estado para explorar</span></div>
    </div>
    <div className="map-selection" aria-live="polite"><span className="selection-icon"><MapPin size={20} /></span><div><strong>{selected ? selected.name : "Seu estado. Seus representantes."}</strong><span>{selected ? `${selected.region} · ${selected.uf}` : "A transparência começa perto de você."}</span></div><ArrowUpRight size={21} /></div>
    <details className="state-alternative"><summary>Prefere escolher em uma lista?</summary><div>{states.map(s => <Link key={s.uf} href={`/estados/${s.uf.toLowerCase()}`}>{s.name} <span>{s.uf}</span></Link>)}</div></details>
  </div>;
}
