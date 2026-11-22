"use client";
import { useRef, useState } from "react";
import { Lightbulb, X } from "lucide-react";
import type { CounterSample } from "@/lib/tax-counter";
import { money } from "@/lib/finance";
import { useData } from "./dashboard-ui";
export function ReflectionGuide() {
  const dialog = useRef<HTMLDialogElement>(null), [open, setOpen] = useState(false);
  const counter = useData<CounterSample>(open ? "/api/impostos" : null);
  return <><button onClick={() => { setOpen(true); dialog.current?.showModal(); }}><Lightbulb size={13} /> O que esses valores significam?</button><dialog className="dash-dialog" ref={dialog} onClose={() => setOpen(false)} aria-labelledby="reflection-title"><div className="dialog-heading"><div><span className="dash-eyebrow">DINHEIRO PÚBLICO · RESULTADOS PÚBLICOS</span><h2 id="reflection-title">A conta também é sua.</h2></div><button aria-label="Fechar reflexões" onClick={() => dialog.current?.close()}><X size={20} /></button></div><div className="dialog-copy">
    {counter.data && <div className="reflection-rate"><span>Na estimativa nacional consultada</span><strong>{money(counter.data.increment)} por segundo</strong><p>Mantida essa taxa por 24 horas, seriam {money(counter.data.increment * 86400)}. É uma projeção da ACSP/IBPT, não o valor efetivamente arrecadado em um dia específico. <a href={counter.data.source} target="_blank" rel="noreferrer">Conferir a fonte ↗</a></p></div>}
    <h3>Quanto custa um parlamentar por dia?</h3><p>Escolha um deputado ou senador e abra Custo/dia. A média diária soma os componentes identificados no mesmo período — como remuneração, cota e gabinete — e divide pelos dias corridos. Cada parcela tem sua fonte. Estrutura central sem rateio e componentes não publicados ficam fora: o valor é identificado como parcial.</p>
    <h3>Arrecadar muito significa atender bem?</h3><p>O volume de tributos, sozinho, não responde. Compare as prioridades do orçamento com a saúde, a educação, a segurança e a infraestrutura que chegam à sua comunidade. Qual serviço melhorou? Qual entrega tem prazo e responsável?</p>
    <h3>Gastar menos é sempre gastar melhor?</h3><p>A margem da cota ajuda a entender o uso do limite. Para avaliar economicidade, examine também a necessidade da despesa, os preços contratados e o resultado. Um saldo isolado não demonstra eficiência ou irregularidade.</p>
    <h3>Emenda anunciada virou entrega?</h3><p>Empenho reserva orçamento; liquidação reconhece uma obrigação; pagamento é outra etapa. Confira quem recebeu, o objeto, o município, o prazo e a prestação de contas. O dinheiro pago ainda precisa se transformar no serviço ou obra prevista.</p>
    <h3>Uma pergunta concreta vale mais que uma suspeita.</h3><p>Abra a aba Cobrar do deputado para copiar perguntas e encontrar o contato oficial. Cite período, fornecedor, documento ou código da emenda e peça evidências da entrega. Acompanhe a resposta no canal responsável.</p>
  </div></dialog></>;
}
