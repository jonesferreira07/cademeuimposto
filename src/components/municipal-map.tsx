"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Minus, Plus, RotateCcw, Search } from "lucide-react";
import { money } from "@/lib/finance";
import { balanceAppearance } from "@/lib/municipal-balance";
import { useMunicipalBalances } from "./use-municipal-balances";
import { MunicipalBalanceInfo, MunicipalBalanceLegend } from "./municipal-balance-legend";
import { getState } from "@/lib/states";
import { municipalHash, municipalViewBox, normalizeMunicipalSearch, type MunicipalDataset } from "@/lib/municipal";
import { AdSlot } from "./ad-slot";
import { Failure, Loading } from "./dashboard-ui";

type Box = [number, number, number, number];
const INITIAL: Box = [0, 0, 600, 550];
export function MunicipalMap({ uf, cityId, dataset, loading, error, retry, onState, onCity, year, month }: { uf: string; year: number; month: string; cityId: string | null; dataset: MunicipalDataset | null; loading: boolean; error: string | null; retry: () => void; onState: (uf: string | null) => void; onCity: (id: string | null) => void }) {
  const balances = useMunicipalBalances(uf, year, month);
  const [query, setQuery] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [box, setBox] = useState<Box>(INITIAL);
  const drag = useRef<{ x: number; y: number; box: Box; moved: boolean } | null>(null);
  const state = getState(uf)!;
  const cities = dataset?.cities || [];
  const fitBox = useMemo(() => dataset ? municipalViewBox(dataset.cities) : INITIAL, [dataset]);
  useEffect(() => { setBox(fitBox); }, [fitBox]);
  useEffect(() => { if (!cityId) setBox(fitBox); }, [cityId, fitBox]);
  const selected = cities.find(city => city.id === cityId);
  const hovered = cities.find(city => city.id === hover);
  const filtered = useMemo(() => (dataset?.cities || []).filter(city => normalizeMunicipalSearch(city.name).includes(normalizeMunicipalSearch(query))), [dataset, query]);
  const mapRows = useMemo(() => cities.filter(city => city.shape).map(city => {
    const row = balances.rows[city.id];
    const appearance = row?.status === "ok" ? balanceAppearance(row.revenue, row.paid) : balanceAppearance(null, null);
    const description = row?.status === "ok" ? `${city.name} — ${appearance.label}. Receita: ${money(row.revenue)}. Pago: ${money(row.paid)}. ${balances.period}º bimestre de ${year}.` : `${city.name} — ${row?.status === "error" ? "consulta indisponível" : row?.status === "missing" ? "dados não disponíveis neste bimestre" : balances.loading ? "consulta em andamento" : "sem comparação confirmada"}.`;
    return { city, appearance, description };
  }), [cities, balances.rows, balances.period, balances.loading, year]);
  const focusedCity = selected || hovered;
  const missingGeometry = cities.filter(city => !city.shape);
  function scale(multiplier: number) {
    setBox(old => {
      const width = Math.max(35, Math.min(fitBox[2], old[2] * multiplier)), height = width * fitBox[3] / fitBox[2];
      const bounds = selected?.shape?.bounds;
      const cx = bounds ? bounds[0] + bounds[2] / 2 : old[0] + old[2] / 2;
      const cy = bounds ? bounds[1] + bounds[3] / 2 : old[1] + old[3] / 2;
      return [Math.max(-30, Math.min(630 - width, cx - width / 2)), Math.max(-30, Math.min(580 - height, cy - height / 2)), width, height];
    });
  }
  return <section className="dash-map municipal-map" aria-label={`Mapa municipal de ${state.name}`}>
    <div className="map-context municipal-context"><button className="municipal-back" onClick={() => onState(null)}><ArrowLeft size={14} /> Brasil</button><h1>{state.name}<span>.</span></h1><p>{uf === "DF" ? "Administração distrital" : `${cities.filter(city => city.kind === "municipality").length || "…"} municípios · escolha sua cidade`}</p></div>
    <div className="map-navigation"><div className="map-tools"><button onClick={() => scale(.7)} disabled={box[2] <= 35 || uf === "DF"} aria-label="Ampliar municípios"><Plus size={16} /></button><button onClick={() => scale(1 / .7)} disabled={box[2] >= fitBox[2] || uf === "DF"} aria-label="Reduzir municípios"><Minus size={16} /></button><button onClick={() => { setBox(fitBox); setQuery(""); onCity(null); }} aria-label="Ver todo o estado"><RotateCcw size={15} /></button></div></div>
    <div className="municipal-explorer">
      {uf === "DF" ? <div className="municipal-district-note"><h2>O Distrito Federal tem organização própria</h2><p>Não é dividido em municípios e não elege prefeito nem vereadores. Consulte o governador e os deputados distritais no painel de representantes.</p></div> : loading ? <Loading text="Abrindo o mapa e os municípios…" /> : error ? <Failure message={error} retry={retry} /> : <>
        <div className="municipal-picker"><div className="dash-search"><Search size={15} /><label className="sr-only" htmlFor="municipal-search">Filtrar municípios de {state.name}</label><input id="municipal-search" value={query} placeholder="Buscar município…" onChange={event => setQuery(event.target.value)} /></div><label className="sr-only" htmlFor="municipal-select">Selecionar município</label><select id="municipal-select" value={selected && filtered.some(city => city.id === selected.id) ? selected.id : ""} onChange={event => { if (event.target.value) { setQuery(""); onCity(event.target.value); } }}><option value="">{filtered.length ? `Escolha sua cidade (${filtered.length})` : "Nenhuma cidade encontrada"}</option>{filtered.map(city => <option key={city.id} value={city.id}>{city.name}{city.kind === "district" ? " · distrito estadual" : ""}</option>)}</select></div>
        <div className="municipal-canvas"><svg viewBox={box.join(" ")} style={{ touchAction: box[2] < 600 ? "none" : "pan-y" }} aria-label={`Municípios de ${state.name}. Arraste para mover o mapa ampliado ou selecione a cidade na lista.`} onPointerDown={event => { if (box[2] >= fitBox[2]) { drag.current = null; return; } drag.current = { x: event.clientX, y: event.clientY, box, moved: false }; }} onPointerMove={event => {
          const start = drag.current; if (!start || event.buttons !== 1) return;
          const dx = event.clientX - start.x, dy = event.clientY - start.y;
          if (Math.hypot(dx, dy) > 4) { start.moved = true; event.currentTarget.setPointerCapture(event.pointerId); }
          if (!start.moved) return;
          const rect = event.currentTarget.getBoundingClientRect(), ratio = Math.min(rect.width / start.box[2], rect.height / start.box[3]);
          setBox([Math.max(-30, Math.min(630 - start.box[2], start.box[0] - dx / ratio)), Math.max(-30, Math.min(580 - start.box[3], start.box[1] - dy / ratio)), start.box[2], start.box[3]]);
        }} onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}>
          {mapRows.map(({ city, appearance, description }) => <a key={city.id} href={municipalHash(uf, city.id)} tabIndex={-1} aria-label={description} data-balance={appearance.tone} className={`municipal-shape ${city.id === cityId ? "selected" : ""} ${query && !filtered.some(item => item.id === city.id) ? "dimmed" : ""}`} onMouseEnter={() => setHover(city.id)} onMouseLeave={() => setHover(null)} onClick={event => { event.preventDefault(); if (!drag.current?.moved) onCity(city.id); }}><title>{description}</title><path style={{ fill: appearance.color }} d={city.shape!.d} fillRule="evenodd" vectorEffect="non-scaling-stroke" /></a>)}
        </svg></div>
        <div className="municipal-map-caption"><MunicipalBalanceLegend year={year} period={balances.period} loading={balances.loading} processed={balances.processed} total={balances.total} rows={balances.rows} error={balances.error} retry={balances.retry} /><div className="municipal-map-focus" aria-live="polite"><strong title={focusedCity?.name}>{focusedCity?.name || "Selecione uma cidade para ver os valores"}</strong>{selected && <MunicipalBalanceInfo row={balances.rows[selected.id]} loading={balances.loading} district={selected.kind === "district"} />}</div>{!!missingGeometry.length && <span className="municipal-geometry-warning">Sem limite disponível nesta malha: {missingGeometry.map(city => city.name).join(", ")}. Selecione pela busca.</span>}</div>
      </>}
    </div>
    <AdSlot />
  </section>;
}
