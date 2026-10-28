# Revisão técnica para divulgação — 27/10/2026

## Resultado e limites

A interface e as consultas de contas estão limitadas a 2026. As APIs financeiras recusam exercícios anteriores com HTTP 400. Os indicadores econômicos anuais mantêm o ano efetivamente publicado: PIB estadual de 2023, comparação tributária OCDE de 2024, consumo em PPC e estimativa tributária nacional de 2025. Eles não são apresentados como contas realizadas em 2026.

**A cobertura individual de gastos estaduais ainda não está completa. Esta revisão técnica não permite anunciar “todos os gastos de todos os representantes”.** Não é certificação contábil da informação declarada pelos órgãos públicos.

## Conferências executadas

- 135 consultas locais às cinco integrações por UF: deputados federais, senadores, assembleias, governadores e RREO, nas 27 UFs. Nenhuma falha nessa execução. Mais quatro consultas verificaram a rejeição de exercícios anteriores.
- 513 perfis federais e 81 senadores na composição atual, sem IDs repetidos ou UF incompatível. Composição atual não equivale a histórico completo de todos os ocupantes durante 2026.
- Contas do Tesouro disponíveis nas 27 UFs. Ranking de transferências conferido com as 27 UFs no mesmo 4º bimestre de 2026 (janeiro–agosto); recusa ranking incompleto ou com bimestres diferentes.
- Arquivo anual completo da CEAP, arquivo completo de emendas da CGU e arquivo completo de CEAPS do Senado processados nos testes de integração, incluindo centavos, estornos e registros sem categoria.
- Adaptadores estaduais conferidos também contra as páginas oficiais coletadas. Na consulta ao vivo, 13 UFs responderam com lista direta; falhas mantêm a origem de cadastro em conferência, sem fingir consulta direta. A lista do Ceará exclui os cartões marcados como licenciados. Outras instituições podem publicar composições com afastados e suplentes: o perfil conserva essa origem, sem certificar exercício atual.
- Folha do governador do Maranhão conferida diretamente por nome civil exato, competência selecionada e dois vínculos publicados. Em setembro: R$ 33.006,39 de governadoria e R$ 8.850,00 de conselheiro, total bruto de R$ 41.856,39. Não é apenas subsídio nem valor líquido depositado.
- Folha do governador do Piauí conferida na API oficial da competência, por nome civil exato e único. Setembro: remuneração bruta de R$ 35.574,64. A API identifica o mês pela rota, não por um campo adicional no resultado.
- CNPJ de favorecidos: apenas pessoa jurídica, formato numérico completo e dígitos verificadores válidos. CPF, inclusive mascarado com 14 caracteres, não é convertido em CNPJ. Nome/razão social é o publicado pela CGU; não há nome fantasia separado nesse arquivo.
- “Falta liquidar” = empenhado − liquidado, em centavos, no total e por destinação. Diferença negativa vira indicação de divergência, nunca zero artificial. Empenho não comprova entrega nem atraso.
- PIB estadual: 27 UFs, variável 37 do agregado 5938 do IBGE, último período publicado 2023. Valores em mil reais convertidos para reais por × 1.000. Ranking independente de repasses da União.
- Comparação OCDE atualizada para 2024: 128 economias com valor, sem agregados e sem Japão, que não tem valor nesse recorte. Brasil 27º, 33,67750895% do PIB. Mesmo ano e conceito para todos.
- Destaque nacional do Tesouro: estimativa preliminar de 32,40% do PIB em 2025. Não é usada para posicionar o Brasil no ranking OCDE, pois método e ano diferem.
- Consumo por habitante em PPC atualizado para 2025, Banco Mundial: 124 economias com valor, sem agregados. Brasil 62º, 14.710,1002953994 dólares internacionais por pessoa/ano. O rótulo visual U$ segue a preferência do proprietário; a descrição preserva a unidade PPC. Não é salário, renda disponível nem conversão cambial.

## Dados que não receberam certificação de completude

1. **Deputados estaduais/distritais:** há cadastro nas 27 UFs, mas folhas importadas de consolidação externa não são valores confirmados na fonte primária. Seus valores foram retirados da resposta pública até conferência. Nem toda assembleia informa assessores, cota e estrutura em formato integrado.
2. **Governadores:** valores são exibidos somente após consulta primária validada; conectores atuais de MA e PI. Os demais pagamentos permanecem em conferência ou indisponíveis. A base externa de apoio contém registros de 24 UFs para governadores e 10 UFs para deputados, exclusivamente de 2026; isso não representa cobertura pública de pagamentos.
3. **Custo diário:** soma somente componentes com valor conhecido, no mesmo período, divididos pelos dias corridos correspondentes. É custo identificado, parcial. Estrutura central sem rateio seguro fica fora; a folha histórica de assessores do Senado não é atribuída pela lotação atual.
4. **Emendas:** associação de autoria federal disponível com vínculo exato e único para 492 de 513 nomes da lista consultada. Falta de vínculo não gera valor atribuído. Favorecido de transferência pode ser fundo público, prefeitura ou entidade; não prova quem foi o contratado final. Notas fiscais e contratos dos executores não estão integralmente integrados. O ranking de emendas dos senadores usa vínculos exatos para 75 de 81 nomes consultados; os demais não recebem atribuição automática.
5. **Atualização:** órgãos podem revisar folhas, contas e reembolsos após a consulta. “Sem registro” não é prova de gasto zero. Não é possível garantir completude permanente de bases externas.

## Clareza e navegação

- Mês escolhido separado do acumulado; meses futuros não aparecem no seletor.
- Removido seletor de anos anteriores e registros financeiros estaduais de 2025.
- Retirada a margem estimada de saldo individual da cota da tela principal.
- Painel estadual reorganizado em PIB, recebido da União e despesas pagas, com seus períodos.
- Ranking de PIB separado do ranking de repasses: menor produção não prova maior recebimento do pacto federativo. Não é calculado saldo entre arrecadação territorial e repasses.
- Setas de avanço nas listas internas; seta diagonal nos links externos; botões de voltar, fechar, paginação e mapa com nomes acessíveis.
- Mensagem de entrada de Montesquieu, em tradução livre identificada, com obra, capítulo e link ao original. Uma exibição por sessão; botão para entrar e tecla Escape para fechar.
- Revisão visual em tema claro e escuro e nas composições de celular e desktop. Valores não confirmados não recebem números de exemplo.

## Reproduzir

```sh
pnpm typecheck
pnpm test
CMI_ARCHIVE_PATH=/caminho/Ano-2026.json.zip CMI_AMENDMENTS_PATH=/caminho/EmendasParlamentares.zip CMI_SENATE_PATH=/caminho/despesas_ceaps.json CMI_ROSTER_DIR=/caminho/paginas pnpm test
pnpm build
pnpm start
node scripts/audit-live.mjs http://127.0.0.1:3000 /tmp/cmi-auditoria-2026.json
```

Não foram realizados deploy, push, configuração de credenciais nem envio de mensagens a representantes.

## Ranking parlamentar acrescentado nesta revisão

O ranking compara **somente CEAP (Câmara) ou CEAPS (Senado)**, com casas separadas, composição atual e acumulado de janeiro de 2026 até a consulta. O filtro mensal é recusado. Na Câmara, o CSV comparativo oficial inclui passagens SIGEPA, ausentes do acervo JSON anual em casos conferidos. Os documentos são subconjunto e não são somados ao comparativo. Em 28/10, o comparativo anual classificou 512 de 513 nomes federais atuais. Ausência e estornos negativos não geram campeões fictícios. Salários, assessores, estrutura e emendas não entram nessa classificação; menor cota não certifica economicidade.

## Complemento de 28/10/2026

- Dívida: conferidas as 27 UFs no 2º quadrimestre de 2026, RGF Anexo 02. Ordenação pela DC; DCL preservada mesmo negativa. BC: DBGG de agosto de 2026, R$ 11.054.954.370.000 (SGS 13761 × 1 milhão), 82,87% do PIB (SGS 13762). Estoques, métodos e fontes identificados; cópia verificada datada em caso de falha.
- Emendas: ranking da execução individual de 2026, com código/nome de autoria exatos do Congresso e CGU, na composição atual. Vínculos federais 492/513; Senado 75/81. Não representa renda pessoal nem classificação de entregas. Sem vínculo ou registro não significa zero.
- SIOP: 56 órgãos, despesas pagas do orçamento de 2026 nas esferas Fiscal e Seguridade. Fonte atualizada em 27/10/2026. Separação explícita de despesas financeiras/dívida e de MP/Defensoria. Previsão Prisma Fiscal de 15/10/2026 é mediana de mercado para déficit primário do Governo Central, não execução.
- Benefícios: contagem de vínculos anuais e ativos, uso de imóvel funcional e pagamentos publicados de auxílio-moradia separados de teto legal e elegibilidade. Custo identificado permanece parcial e aponta meses conhecidos por componente.
- Entrada em Acumulado em 2026; marca retorna ao Brasil e ao acumulado. Senadores antes de Dep. Federais. Correção de seletores CSS que escondiam nomes nos rankings em telas estreitas.
- Publicidade: R$ 9,90 por 3 dias após Pix confirmado manualmente e anúncio aprovado. Cupom privado de indicação, QR Code/copia e cola com valor fixo, referência por pedido e CRC validado. Nenhum pagamento real ou anúncio aprovado durante os testes. Armazenamento local privado, fora do Git. Integração Resend preparada para produção: envio de campos e comprovante privado (JPG/PNG/PDF até 3 MB), referência HMAC de 7 dias e publicação manual. Sem credenciais e teste confirmado, o Pix fica bloqueado e a solicitação pode ser feita manualmente por e-mail. Testes FormSubmit entregaram texto mas falharam na confirmação HTTP; esse provedor foi descartado. Nenhum comprovante real foi utilizado.

A base de segurança do ranking de emendas foi derivada do ZIP oficial CGU publicado em 28/10/2026 às 02:23:07 UTC: 5.604 emendas individuais de 2026, com hash SHA-256 registrado no JSON. O script `scripts/snapshot-amendment-ranking.py` reproduz a agregação em centavos, sem favorecidos ou dados pessoais. Quando a consulta ao vivo falha ou demora, a interface informa a cópia datada. Códigos cuja autoria mudou entre registros não recebem atribuição automática.


### Revisão adicional — folha, 13º e uso da cota (28/10/2026)

- Câmara: o portal de gastos confirma que 13º, férias e auxílio-alimentação dos assessores são pagos fora da verba de gabinete. O gasto dessa verba não pode ser chamado de custo completo dos assessores.
- Folha parlamentar: oito rubricas brutas obrigatórias, incluindo gratificação natalina, vantagens e verbas eventuais; estornos e redutor preservados. Folhas suplementares somadas; mês sem folha e formato incompleto não viram zero. Bruto e líquido não são somados entre si.
- Foram conferidas folhas oficiais de janeiro, julho, setembro e outubro de 2026 para três identificadores de deputados (204549, 220697, 204528). Isso valida amostras e o formato; não certifica ausência de omissões da fonte para todos os mandatos. O produto consulta as fontes por parlamentar e competência e informa a cobertura real.
- Links das folhas de assessores vêm da tabela de vínculos da Câmara, com domínio e caminho restritos. Não há associação por nome aproximado. Pagamentos em competências com vínculos em vários gabinetes exigem conferência antes de atribuição.
- Custo/dia permanece parcial; identifica explicitamente os encargos de assessores não consolidados e a estrutura sem rateio. No Senado, a folha mostra também as rubricas individuais, incluindo 13º publicado.
- Barra da cota: total comparativo oficial do período / referência da UF do mesmo período. Testes cobrem mês versus acumulado, 60%, acima de 100%, estornos e ausências. Adicionais e afastamentos impedem chamar a referência de limite ou saldo individual confirmado.
- Fontes primárias: https://www.camara.leg.br/transparencia/gastos-parlamentares e https://www2.camara.leg.br/comunicacao/assessoria-de-imprensa/guia-para-jornalistas/cota-parlamentar .
