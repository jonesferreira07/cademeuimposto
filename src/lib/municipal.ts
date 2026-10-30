import { getState } from "./states";

export type MunicipalPerson = { id: string; name: string; ballotName: string; party: string; status: "ELEITO" | "ELEITO POR QP" | "ELEITO POR MÉDIA" };
export type MunicipalElection = { date: string; turn: number; electionId: string; supplementary: boolean; people: MunicipalPerson[] };
export type Municipality = {
  id: string; name: string; kind: "district" | "municipality"; tseCode: string | null;
  shape?: { d: string; bounds: [number, number, number, number] };
  mayor: MunicipalElection | null; council: MunicipalElection | null;
};
export type MunicipalDataset = { uf: string; asOf: string; tseGeneratedAt: string[]; sources: { localities: string; geometry: string; election: string }; cities: Municipality[] };
export function normalizeMunicipalSearch(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim(); }
export function municipalSelection(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const state = getState(params.get("uf") || "");
  const id = params.get("municipio");
  return { uf: state?.uf || null, city: state && state.uf !== "DF" && id && /^\d{7}$/.test(id) && id.startsWith(state.code) && id !== "5300108" ? id : null };
}
export function municipalHash(uf: string | null, city: string | null = null) {
  const selected = municipalSelection(new URLSearchParams({ uf: uf || "", municipio: city || "" }).toString());
  return selected.uf ? `/#uf=${selected.uf.toLowerCase()}${selected.city ? `&municipio=${selected.city}` : ""}` : "/";
}
export function electionDate(date: string) { return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split("-").reverse().join("/") : "não informada"; }
