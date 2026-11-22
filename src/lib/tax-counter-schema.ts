import { z } from "zod";
import { brazilDate } from "./finance";

export const TAX_SOURCE = "https://impostometro.com.br";
const schema = z.object({
  Valor: z.number().finite().nonnegative(),
  Incremento: z.number().finite().nonnegative(),
  Data: z.string(),
  Midnight: z.string(),
});
export type CounterSample = {
  value: number;
  increment: number;
  observedAt: string;
  source: string;
  uf: string | null;
  year: number;
};

function sourceTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)) {
    throw new Error("Data do contador incompatível com o formato da fonte.");
  }
  const time = new Date(`${value}-03:00`).getTime();
  if (!Number.isFinite(time)) throw new Error("Data do contador inválida.");
  return time;
}

export function parseCounter(raw: unknown, uf: string | null, now = Date.now()): CounterSample {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new Error("O formato do contador mudou na fonte.");
  const data = parsed.data;
  const observed = sourceTime(data.Data);
  const midnight = sourceTime(data.Midnight);
  if (
    now - observed > 300000 ||
    observed - now > 60000 ||
    observed < midnight ||
    observed - midnight >= 86400000
  ) throw new Error("O contador não tem uma atualização recente verificável.");

  return {
    value: data.Valor + data.Incremento * (observed - midnight) / 1000,
    increment: data.Incremento,
    observedAt: new Date(observed).toISOString(),
    source: TAX_SOURCE,
    uf,
    year: brazilDate(new Date(observed)).year,
  };
}
