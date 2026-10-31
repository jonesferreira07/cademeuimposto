"use client";
import { CalendarDays, ChevronDown, MapPin } from "lucide-react";
import { months } from "@/lib/finance";
import { states } from "@/lib/states";

export function DashboardFilters({ uf, year, month, availableMonths, onState, onMonth }: { uf: string | null; year: number; month: string; availableMonths: number; onState: (uf: string | null) => void; onMonth: (month: string) => void }) {
  return <div className="dash-toolbar dash-filters" role="group" aria-label="Filtros do painel">
    <div className="dash-filter-field"><label className="sr-only" htmlFor="dash-uf">Estado</label><div className="dash-select-control"><MapPin className="dash-select-icon" size={17} aria-hidden="true" /><select id="dash-uf" value={uf || ""} onChange={event => onState(event.target.value || null)}><option value="">Brasil · escolha um estado</option>{states.map(state => <option key={state.uf} value={state.uf}>{state.name} ({state.uf})</option>)}</select><ChevronDown className="dash-select-arrow" size={17} aria-hidden="true" /></div></div>
    <div className="dash-filter-field"><label className="sr-only" htmlFor="dash-month">Mês</label><div className="dash-select-control"><CalendarDays className="dash-select-icon" size={17} aria-hidden="true" /><select id="dash-month" value={month} onChange={event => onMonth(event.target.value)}><option value="all">Acumulado em {year}</option>{months.slice(0, availableMonths).map((name,index) => <option key={name} value={index+1}>{name} de {year}</option>)}</select><ChevronDown className="dash-select-arrow" size={17} aria-hidden="true" /></div></div>
  </div>;
}
