# Consulta municipal — primeira etapa

A página inicial permite navegar Brasil → UF → município. A seleção municipal abre os eleitos para prefeito e vereador, sem substituir os painéis federais/estaduais. Ao escolher a cidade, o painel de contas passa a consultar o RREO municipal de 2026. O Impostômetro no topo continua estadual. O botão Ver contas do estado restaura o painel estadual.

## Fontes e data

- Lista territorial: https://servicodados.ibge.gov.br/api/v1/localidades/municipios
- Malha simplificada por UF: API v3 de malhas do IBGE, `intrarregiao=municipio`, qualidade mínima, GeoJSON. https://servicodados.ibge.gov.br/api/docs/malhas?versao=3
- Mato Grosso utiliza a [Malha Municipal Digital 2025 do IBGE](https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2025/UFs/MT/), simplificada com Mapshaper 0.7.101 a 2%, preservando os polígonos. Ela inclui Boa Esperança do Norte e substitui toda a geometria da UF para evitar sobreposições com os municípios de origem.
- Eleitos: arquivo `consulta_cand_2024.zip`, disponível em https://dadosabertos.tse.jus.br/dataset/candidatos-2024 . O arquivo contém eleições ordinárias e suplementares; cada cargo indica a data e o turno da eleição que o originou.
- Fotografia importada em **30/10/2026**. Não há atualização automática nem confirmação de exercício atual. Uma nova importação precisa ser validada e publicada.

## Integridade

O script `scripts/sync-municipal-data.py` cruza a UF e o nome normalizado exato. Divergências de grafia são correspondências explícitas revisadas e registradas em `public/data/municipal/manifest.json`; não fazemos aproximação automática. Códigos TSE e IBGE são mantidos separados. A importação falha diante de município não vinculado, ambiguidade ou dois prefeitos eleitos na mesma eleição.

Para cada município/cargo, selecionamos a eleição mais recente ocorrida até a data de corte e o último turno dessa eleição. Mantemos somente situações `ELEITO`, `ELEITO POR QP` e `ELEITO POR MÉDIA`, deduplicadas pelo identificador público do candidato. Não procuramos a palavra “ELEITO” como substring (isso incluiria “NÃO ELEITO”). Não inferimos eleição pelo total de votos. Se a eleição mais recente não tiver eleito confirmado, não recuperamos um vencedor de eleição anterior.

Só são publicados nome, nome de urna, partido, situação eleitoral, identificador público e referência da eleição. CPF, nascimento, título eleitoral e e-mail não são exportados. O ZIP original fica em diretório temporário fora do Git; o manifesto contém seu SHA-256 e os das malhas.

## Cobertura e limites conhecidos

- 5.569 municípios e o distrito estadual de Fernando de Noronha, nos 26 estados. O Distrito Federal é tratado separadamente: não elege prefeito/vereadores.
- Todos os municípios têm candidatos vinculados, mas a base consultada não confirma eleitos em **17 resultados de prefeito e 21 de vereadores**. A interface informa a indisponibilidade; isso não significa cargo vago. A auditoria por UF está no manifesto.
- Todos os 5.569 municípios têm geometria. A API simplificada não incluía Boa Esperança do Norte; isso foi resolvido usando a malha oficial de 2025 de toda a UF de Mato Grosso. Limites simplificados não servem a medições ou comprovação territorial atual.
- Resultado eleitoral e partido na eleição **não comprovam ocupação/filiação atual**. Suplências, decisões judiciais, afastamentos, sucessões e eleições que não constem desse arquivo exigem confirmação na prefeitura/Câmara Municipal. Não apresentamos a lista como composição atual verificada.
- As contas consolidadas municipais estão integradas ao Siconfi/RREO de 2026. Salários, contratos, fornecedores, assessores e custos por dia individualizados dos representantes ainda não estão integrados. Não criamos valores zero para dados desconhecidos.

## Atualização reproduzível

`python3 scripts/sync-municipal-data.py --as-of AAAA-MM-DD`

A conversão de Mato Grosso executa `pnpm dlx mapshaper@0.7.101` (não é uma dependência da aplicação). O script utiliza um cache temporário em `cmi-municipal-sources`. Para uma nova fotografia, apague **somente esse cache de fontes** antes de executar; não remova código ou trabalho local. Revise o manifesto, as correspondências e todos os testes antes de publicar. Não há credencial de API envolvida.

## Contas municipais · Tesouro/Siconfi

A API `/api/financas-municipais/[id]?year=2026&month=all` valida a identidade no índice IBGE, a esfera M, UF, ano, bimestre, anexo, demonstrativo RREO (padrão ou simplificado) e periodicidade B de cada linha. Pagina até a resposta completa; recusa duplicidade e relatório incompleto. Busca o último bimestre encerrado publicado até o mês escolhido, sem recorrer a outro ano. Em cada bimestre, consulta a variante padrão e, se vazia, a simplificada, antes de recuar. Os anexos usam a mesma variante; não somamos as duas. Erro de consulta não é tratado como relatório vazio.

O Anexo 01 fornece receita realizada, transferências da União e despesas empenhadas, liquidadas e pagas. O Anexo 02 fornece apenas funções de despesa liquidada, sem somar subfunções nem operações intraorçamentárias. Percentuais aparecem somente quando a soma das funções identificadas confere, em centavos, com o total de função do mesmo relatório. Se o Anexo 02 falhar, os totais válidos do Anexo 01 são preservados com aviso. Os anexos utilizam o mesmo bimestre.

Os valores são acumulados desde janeiro e não são um extrato de todos os pagamentos de caixa (restos a pagar de exercícios anteriores têm outros demonstrativos). Não há vínculo individual entre cada imposto e cada gasto. O RREO não fornece a identificação de empresas, contratos ou beneficiários finais nesta consulta. Cache de até uma hora, com período efetivo e data de consulta. DF e Fernando de Noronha não são tratados como municípios.

## Cores do mapa · receita realizada e despesa paga

O mapa consulta `/api/saldos-municipais?uf=MA&year=2026&month=all&offset=0`, em páginas de 24 municípios. Há no máximo seis consultas simultâneas à fonte por página e duas páginas simultâneas no navegador. Resultados válidos usam cache de até uma hora; páginas com falha não são cacheadas. As cores aparecem progressivamente e a legenda informa a cobertura.

Para cada cidade, comparamos `TotalReceitas / Até o Bimestre (c)` e `TotalDespesas / DESPESAS PAGAS ATÉ O BIMESTRE (j)` do Anexo 01, com valores arredondados a centavos. Utilizamos o mesmo bimestre encerrado em toda a UF; a primeira página fixa o período das seguintes. Conferimos identidade IBGE, UF, exercício, esfera M e modalidade do relatório. A variante simplificada é consultada somente quando a padrão está vazia. Não somamos modalidades, receitas parciais ou subtotais. Não recuamos individualmente para bimestres diferentes para obter uma cor.

Verde indica pago menor ou igual à receita; vermelho indica pago maior. A intensidade depende da diferença absoluta dividida pela receita: de 0 a 50%, com saturação no máximo a partir de 50%. Receita zero com pagamento positivo recebe o vermelho mais intenso, sem dividir por zero. Zeros efetivamente publicados são preservados. Ausência, falha de consulta, valores negativos ou fora da precisão monetária segura ficam neutros. Uma seleção muda a borda, preservando a cor dos dados.

A comparação não equivale ao resultado primário, nominal, orçamentário ou à situação fiscal completa: considera pagamento, exclui outras etapas de execução e não inclui pagamento de restos de exercícios anteriores. Não avalia qualidade do serviço nem vincula tributos individuais a gastos. Consultas sem dados confirmados nunca recebem verde por padrão.
