"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Minus, Plus, RotateCcw, Search } from "lucide-react";
import { getState } from "@/lib/states";
import { municipalHash, normalizeMunicipalSearch, type MunicipalDataset } from "@/lib/municipal";
import { AdSlot } from "./ad-slot";
import { Failure, Loading } from "./dashboard-ui";

type Box = [number, number, number, number];
const INITIAL: Box = [0, 0, 600, 550];
export function MunicipalMap({ uf, cityId, dataset, loading, error, retry, onState, onCity }: { uf: string; cityId: string | null; dataset: MunicipalDataset | null; loading: boolean; error: string | null; retry: () => void; onState: (uf: string | null) => void; onCity: (id: string | null) => void }) {
  const [query, setQuery] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [box, setBox] = useState<Box>(INITIAL);
  useEffect(() => { if (!cityId) setBox(INITIAL); }, [cityId]);
  const drag = useRef<{ x: number; y: number; box: Box; moved: boolean } | null>(null);
  const state = getState(uf)!;
  const cities = dataset?.cities || [];
  const selected = cities.find(city => city.id === cityId);
  const hovered = cities.find(city => city.id === hover);
  const filtered = useMemo(() => (dataset?.cities || []).filter(city => normalizeMunicipalSearch(city.name).includes(normalizeMunicipalSearch(query))), [dataset, query]);
  const missingGeometry = cities.filter(city => !city.shape);
  function scale(multiplier: number) {
    setBox(old => {
      const width = Math.max(35, Math.min(600, old[2] * multiplier)), height = width * 550 / 600;
      const bounds = selected?.shape?.bounds;
      const cx = bounds ? bounds[0] + bounds[2] / 2 : old[0] + old[2] / 2;
      const cy = bounds ? bounds[1] + bounds[3] / 2 : old[1] + old[3] / 2;
      return [Math.max(-30, Math.min(630 - width, cx - width / 2)), Math.max(-30, Math.min(580 - height, cy - height / 2)), width, height];
    });
  }
  return <section className="dash-map municipal-map" aria-label={`Mapa municipal de ${state.name}`}>
    <div className="map-context municipal-context"><button className="municipal-back" onClick={() => onState(null)}><ArrowLeft size={14} /> Brasil</button><h1>{state.name}<span>.</span></h1><p>{uf === "DF" ? "Administração distrital" : `${cities.filter(city => city.kind === "municipality").length || "…"} municípios · escolha sua cidade`}</p></div>
    <div className="map-navigation"><div className="map-tools"><button onClick={() => scale(.7)} disabled={box[2] <= 35 || uf === "DF"} aria-label="Ampliar municípios"><Plus size={16} /></button><button onClick={() => scale(1 / .7)} disabled={box[2] >= 600 || uf === "DF"} aria-label="Reduzir municípios"><Minus size={16} /></button><button onClick={() => { setBox(INITIAL); setQuery(""); onCity(null); }} aria-label="Ver todo o estado"><RotateCcw size={15} /></button></div></div>
    <div className="municipal-explorer">
      {uf === "DF" ? <div className="municipal-district-note"><h2>O Distrito Federal tem organização própria</h2><p>Não é dividido em municípios e não elege prefeito nem vereadores. Consulte o governador e os deputados distritais no painel de representantes.</p></div> : loading ? <Loading text="Abrindo o mapa e os municípios…" /> : error ? <Failure message={error} retry={retry} /> : <>
        <div className="municipal-picker"><div className="dash-search"><Search size={15} /><label className="sr-only" htmlFor="municipal-search">Filtrar municípios de {state.name}</label><input id="municipal-search" value={query} placeholder="Buscar município…" onChange={event => setQuery(event.target.value)} /></div><label className="sr-only" htmlFor="municipal-select">Selecionar município</label><select id="municipal-select" value={selected && filtered.some(city => city.id === selected.id) ? selected.id : ""} onChange={event => { if (event.target.value) { setQuery(""); onCity(event.target.value); } }}><option value="">{filtered.length ? `Escolha sua cidade (${filtered.length})` : "Nenhuma cidade encontrada"}</option>{filtered.map(city => <option key={city.id} value={city.id}>{city.name}{city.kind === "district" ? " · distrito estadual" : ""}</option>)}</select></div>
        <div className="municipal-canvas"><svg viewBox={box.join(" ")} style={{ touchAction: box[2] < 600 ? "none" : "pan-y" }} aria-label={`Municípios de ${state.name}. Arraste para mover o mapa ampliado ou selecione a cidade na lista.`} onPointerDown={event => { if (box[2] >= 600) { drag.current = null; return; } drag.current = { x: event.clientX, y: event.clientY, box, moved: false }; }} onPointerMove={event => {
          const start = drag.current; if (!start || event.buttons !== 1) return;
          const dx = event.clientX - start.x, dy = event.clientY - start.y;
          if (Math.hypot(dx, dy) > 4) { start.moved = true; event.currentTarget.setPointerCapture(event.pointerId); }
          if (!start.moved) return;
          const rect = event.currentTarget.getBoundingClientRect(), ratio = Math.min(rect.width / start.box[2], rect.height / start.box[3]);
          setBox([Math.max(-30, Math.min(630 - start.box[2], start.box[0] - dx / ratio)), Math.max(-30, Math.min(580 - start.box[3], start.box[1] - dy / ratio)), start.box[2], start.box[3]]);
        }} onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}>
          {cities.filter(city => city.shape).map(city => <a key={city.id} href={municipalHash(uf, city.id)} tabIndex={-1} aria-label={`Explorar ${city.name}`} className={`municipal-shape ${city.id === cityId ? "selected" : ""} ${query && !filtered.some(item => item.id === city.id) ? "dimmed" : ""}`} onMouseEnter={() => setHover(city.id)} onMouseLeave={() => setHover(null)} onClick={event => { event.preventDefault(); if (!drag.current?.moved) onCity(city.id); }}><title>{city.name}</title><path d={city.shape!.d} fillRule="evenodd" vectorEffect="non-scaling-stroke" /></a>)}
        </svg></div>
        <div className="municipal-map-caption" aria-live="polite"><strong>{hovered?.name || selected?.name || "Clique em uma cidade para ver seus representantes"}</strong><span>Limites simplificados · IBGE · use + para ampliar e arraste</span>{!!missingGeometry.length && <span className="municipal-geometry-warning">Sem limite disponível nesta malha: {missingGeometry.map(city => city.name).join(", ")}. Selecione pela busca.</span>}</div>
      </>}
    </div>
    <AdSlot />
  </section>;
}
