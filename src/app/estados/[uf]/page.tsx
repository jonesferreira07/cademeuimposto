import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getState } from "@/lib/states";

type Props = { params: Promise<{ uf: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const state = getState((await params).uf);
  return { title: state ? `Representantes de ${state.name}` : "Estado não encontrado" };
}
export default async function StatePage({ params }: Props) {
  const state = getState((await params).uf);
  if (!state) notFound();
  redirect(`/#uf=${state.uf.toLowerCase()}`);
}
