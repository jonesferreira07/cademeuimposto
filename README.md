# Cadê Meu Imposto?

Aplicação em Next.js (App Router), TypeScript e Tailwind CSS: mapa e informações na mesma tela, inspirados na navegação de seuimposto.com. Painéis de contas estaduais, representantes, folhas e despesas CEAP/CEAPS, com contador baseado nos dados públicos do Impostômetro. Sem cadastro e sem valores financeiros de demonstração.

## Executar localmente

Requisitos: Node.js 22 ou superior e pnpm 11.25.0. Instale o pnpm com `npm install -g pnpm@11.25.0`, se necessário.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Abra [http://127.0.0.1:3000](http://127.0.0.1:3000). A API da Câmara é pública e não exige credenciais. O servidor precisa de HTTPS para `dadosabertos.camara.leg.br`, `www.camara.leg.br` e `apidatalake.tesouro.gov.br`. O navegador carrega retratos da Câmara, do Senado, de assembleias e do acervo aberto identificado nos créditos. As consultas estaduais usam os domínios oficiais das instituições; o cadastro e parte das folhas são incorporados de uma consolidação independente, conforme a procedência abaixo. O servidor consulta também `impostometro.com.br`, `legis.senado.leg.br` e `dadosabertos-download.cgu.gov.br`. Não há iframe publicitário no contador.

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm start
```

`pnpm start` serve a compilação de produção. Os scripts usam o compilador Webpack do Next.js para compatibilidade com ambientes que restringem as portas internas do Turbopack. O projeto usa fontes do sistema, sem baixar fontes durante o build.

## Funcionalidades

- Interface responsiva em azul-marinho, verde, branco e amarelo; navegação por teclado e respeito à preferência de movimento reduzido.
- Mapa SVG com geometria oficial do IBGE para todos os 26 estados e o Distrito Federal. Cada UF tem link, título, indicação de foco e hover. Há uma lista alternativa para navegação.
- Página inicial com três painéis no desktop. No celular, abas Mapa, Estado e Representantes, com altura mínima para manter o mapa legível e rolagem natural quando necessária. Anúncio e controles têm espaço próprio abaixo do mapa, sem sobrepor estados. Telas de computador baixas também preservam altura mínima. Listas e documentos são paginados.
- Seleção no mapa atualiza os painéis sem navegação. O hash `#uf=ce` permite compartilhar o estado. O ano das contas está fixado em 2026; não há seletor de exercícios anteriores e as APIs financeiras recusam outros anos. A abertura usa **Acumulado em 2026**; clicar na marca retorna ao Brasil e ao acumulado. O filtro de mês controla despesas; repasses da União e gastos estaduais usam o último bimestre encerrado até esse mês. PIB estadual mantém o último ano publicado pelo IBGE, explicitado em cada valor. O contador sempre representa o ano corrente.
- Links antigos de estado, como `/estados/ma`, redirecionam para o painel atualizado com a UF selecionada (`/#uf=ma`). As rotas `/deputados?q=nome&uf=CE&page=1` e `/deputados/{id}` continuam disponíveis.
- Fotos, nomes, partidos, representação, dados biográficos, situação e contatos retornados pela Câmara. Fotos indisponíveis têm um ícone alternativo.
- Busca por nome parlamentar, filtro por UF e paginação em até 100 resultados, respeitando o link `next` da fonte. O número exibido é por página.
- `/api/deputados?uf=CE&q=nome&page=1`: consulta validada com resposta JSON, fonte e paginação.
- Estados de carregamento, ausência de resultados, falha de rede, indisponibilidade da fonte e páginas não encontradas.
- Cache de até 30 minutos e timeout de 12 segundos nas consultas à Câmara; validação de respostas com Zod.
- Página `/sobre` com fontes, metodologia, limitações e privacidade.

## Fontes e integridade

1. [API oficial de Dados Abertos da Câmara dos Deputados](https://dadosabertos.camara.leg.br/swagger/api.html): `GET /api/v2/deputados`, com `siglaUf`, `nome`, `pagina`, `itens=100`, `ordem=ASC` e `ordenarPor=nome`; detalhes em `GET /api/v2/deputados/{id}`. A legislatura não é fixada: a listagem usa o comportamento atual padrão da fonte; perfis exibem `ultimoStatus`.
2. [API de Malhas Geográficas do IBGE](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3): contornos simplificados em `GET /api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF`. Mapa ilustrativo em projeção simplificada, sem precisão para medições. As posições dos rótulos são ajustadas para leitura.

O código não usa dados de demonstração como fallback. Campos ausentes são identificados, respostas inválidas produzem erro e totais financeiros incompletos não são exibidos. Os testes usam uma pequena amostra real da API, coletada em 27/10/2026, exclusivamente como fixture; ela nunca é servida pela aplicação. O schema do perfil remove campos não usados, incluindo CPF.

Para regenerar o mapa a partir de um GeoJSON obtido do endpoint acima:

```bash
node scripts/generate-map.mjs /caminho/brasil.json
```

## Identidade visual, temas e publicidade

- A imagem fornecida pelo proprietário está em `public/brand-logo.png`, exibida sem recorte, com otimização pelo Next.js. A paleta do painel segue seu azul profundo, verde, amarelo e azul vivo. O título é “Cadê Meu Imposto?”.
- Tema escuro padrão e botão Clarear/Escurecer, com contraste adaptado. A preferência é salva no navegador em `cmi-theme`; o controle funciona mesmo se o armazenamento estiver bloqueado.
- Fontes, números, mapa e contador do Impostômetro ampliados. A composição preserva a leitura com rolagem quando necessária; os painéis laterais do desktop permitem rolagem interna.
- Espaço de publicidade abaixo do mapa: **R$ 9,90 por 3 dias**, iniciados após confirmação manual do Pix e aprovação. Formulário de marca, frase, site, contato privado e aba CUPOM para indicação. Revisão, QR Code e copia e cola com valor fixo e referência por pedido. O leilão não está ativo. Pedidos locais ficam em `.data/ad-orders/`, fora do Git, com acesso privado; `node scripts/ad-orders.mjs listar` e `indicacoes` permitem consulta. `confirmar-pix ID` deve ser usado somente depois de conferir o pagamento no banco; `aprovar ID` publica apenas pedido pago e inicia as 72 horas. Não há confirmação bancária automática. Na Vercel, os pedidos só liberam Pix após o provedor de e-mail aceitar o envio dos dados à equipe. Comprovantes JPG/PNG/PDF de até 3 MB têm referência assinada válida por 7 dias e são enviados como anexos privados. Não há armazenamento de comprovantes no repositório. Até a configuração e o teste de entrega, há uma opção de solicitação manual por e-mail e o Pix permanece bloqueado.

## Dados financeiros e critérios

- **Impostômetro:** dados públicos ACSP/IBPT em apresentação própria, com fonte e metodologia. O endpoint público AJAX fornece `Valor` (base à meia-noite), `Incremento` (taxa por segundo), `Data` e `Midnight` no horário de Brasília. Calculamos a estimativa no instante informado e avançamos com a taxa da fonte; refresh de 60 segundos e pausa após 5 minutos sem amostra recente. Não é registro oficial de pagamentos a cada segundo. UF = tributos das três esferas no território, não receita estadual. Sem iframe, anúncios ou cookies do widget.
- **Equivalências rotativas:** divisão pelo valor unitário, arredondada para baixo; Fiat Mobi Like R$ 85.490 (site Fiat, consulta 27/10/2026), moradia ilustrativa de 50 m² × R$ 1.999,73/m² (SINAPI/IBGE setembro/2026, agregado 2296, variável 48, sem terreno e demais custos), salário mínimo de R$ 1.621 (Decreto 12.797/2025). Fontes e limites no diálogo. Não é destino efetivo dos tributos.
- **Ranking estadual:** 27 consultas ACSP/IBPT, no máximo 4 simultâneas; valores alinhados ao mesmo instante pela taxa informada. Recusa conjunto incompleto. Volume absoluto, sem confundir com carga individual.
- **Ranking internacional:** snapshot verificado da OCDE, Global Revenue Statistics versão 2.1. Ano comum de 2024; governo geral S13, receita tributária total TAX_REV/_T, percentual do PIB PT_B1GQ. 128 economias únicas, sem agregados. Brasil 27º, 33,67750895% do PIB. Não é o mundo inteiro nem mede qualidade dos serviços. URL de consulta e data ficam em `src/data/global-tax-ranking.json`; atualização exige obter e validar novamente o mesmo recorte, sem misturar anos. O Tesouro Nacional publica estimativa preliminar de 32,40% do PIB em 2025, destacada separadamente, sem usar esse número para classificar o Brasil na base OCDE.
- **Tesouro Nacional/Siconfi:** API pública `GET /ords/siconfi/tt/rreo`, Anexos 01 e 02, esfera E e código IBGE da UF. Receita realizada = `TotalReceitas / Até o Bimestre (c)`; transferências recebidas = `TransferenciasCorrentes + TransferenciasDeCapital` da mesma coluna; despesas pagas = `TotalDespesas / DESPESAS PAGAS ATÉ O BIMESTRE (j)`. A receita total pode incluir crédito e intraorçamentárias; as transferências não são apenas da União.
- **Finalidade estadual:** funções do Anexo 02, despesas liquidadas acumuladas, excluídas intraorçamentárias. Funções e subfunções não são somadas. Liquidação não significa pagamento. Não há vínculo individual entre receita/transferência e despesa neste relatório.
- **CEAP e SIGEPA:** total e categorias usam o CSV comparativo oficial da Câmara, incluindo passagens SIGEPA. Vinculação por nome parlamentar e UF exatos e únicos, conferida com o perfil/lista oficial. Documentos são consultados pela API paginada ou pelo JSON anual, ligados por `idDeputado`. Esse acervo documental pode não incluir SIGEPA: é subconjunto, não é somado ao comparativo e não serve sozinho como total completo. Somas em centavos preservam estornos. Data fiscal não é data de reembolso. Não inclui salário, assessores ou emendas.
- **Processamento do arquivo:** ZIP e JSON lidos em fluxo, sem armazenar o JSON bruto no repositório ou reter CPF e CNPJ. Índice em memória por até uma hora, no máximo dois exercícios por processo; em serverless, cada instância pode reconstruí-lo. Limites de 30 MB comprimidos, 350 MB descompactados e 500 mil registros. Em arquivos maiores ou falha, nenhum total parcial é publicado. Uma implantação com tráfego maior deve persistir o índice em banco ou storage após autorização.
- **Mês selecionado:** a despesa, as categorias e os fornecedores na cota federal usam somente o mês escolhido; o acumulado janeiro–mês aparece em um bloco separado para contextualizar a referência de cota. Nenhum mês ausente é substituído pelo total anual. O RREO estadual continua acumulado por bimestre e explicita essa limitação.
- **Cota disponível:** `/api/cota/{id}?year=2026&month=10` usa gasto CEAP acumulado até o mês e limite mensal de referência da UF × meses. A tabela de 2026 foi conferida em 27/10/2026; não aplicada a outros anos. Não exibimos a diferença como saldo disponível oficial individual. Cota acumula dentro do ano, pode ter ajustes individuais e documentos apresentados até 90 dias. Ausência de registro não vira gasto zero. Grupos por categoria e nome de fornecedor preservam estornos; variações de grafia não são fundidas sem identificador. Menor gasto não prova economicidade.
- **Custo diário identificado:** `/api/custos/camara/{id}` e `/api/custos/senado/{id}`, com `year` e `month`, somam somente componentes verificados no período e dividem pelos dias corridos desse período (até hoje no mês corrente). Na Câmara, remuneração bruta é lida na folha detalhada mensal do parlamentar, CEAP na fonte de despesas e gasto com assessores na tabela mensal de verba de gabinete. Folhas suplementares e estornos são preservados. Lista anual de vínculos não significa equipe simultânea. No Senado, a remuneração exige nome civil exato e único na folha, CEAPS usa código do senador e recursos adicionais anuais não entram em um mês isolado. Lotação atual de assessores não comprova lotação histórica, portanto sua folha permanece indisponível sem vínculo seguro. Estrutura central sem rateio individual não é estimada. Todos os totais são rotulados como **custo identificado, parcial**, com componentes desconhecidos separados; líquido após descontos não é somado novamente ao bruto. Reflexões e roteiro de perguntas ajudam a conferir finalidade, preço, destino e entrega. Nenhuma mensagem é enviada automaticamente.
- **Emendas individuais CGU:** `/api/emendas/{id}?year=2026` usa o [arquivo público oficial](https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares), sem credencial. CSV CP1252 em ZIP, parser em fluxo. Ano da emenda e execução acumulada, sem filtro mensal. Orçamento principal, favorecidos e convênios são grãos diferentes: não são somados entre si. As etapas empenho/liquidação/pagamento também não são somadas. Restos pagos aparecem à parte. Falta liquidar = empenhado − liquidado, em centavos, com diferença negativa sinalizada como divergência em vez de zero fictício. Não inclui automaticamente todas as notas e contratos do executor.
- **Autoria:** `src/data/amendment-authors.json` vincula código SIAFI do Congresso ao ID Câmara por nome normalizado exato e único, restrito a Deputado Federal; conferido novamente com nome do arquivo CGU. Relatório oficial do Congresso para PLOA 2026, link registrado no JSON, e lista Câmara coletados em 27/10/2026. 492 de 513 vinculados; nomes sem vínculo ou divergências são recusados. Sem correspondência aproximada ou atribuição de emendas coletivas.
- **Processamento CGU:** até 65 MB comprimidos e 450 MB descompactados, 45 segundos para download, cache de um exercício por processo por até 1 hora. Sem armazenar CPF de favorecidos. O CNPJ de pessoa jurídica é preservado somente após verificar tipo e dígitos verificadores, a pedido do proprietário; nome/razão social vem do campo Favorecido, sem inventar nome fantasia. Recebedor da transferência não é necessariamente fornecedor final. A fonte publica um arquivo de todos os anos; filtramos o exercício durante a leitura. Instâncias serverless podem reconstruir índice; alta demanda requer persistência aprovada antes da produção.
- **Senadores:** `/api/senadores?uf=PI` usa lista oficial em exercício, com nome, partido, foto e contatos. `/api/senadores/{id}/despesas` consolida o arquivo anual CEAPS da [API administrativa oficial](https://adm.senado.gov.br/adm-dadosabertos/swagger-ui/index.html), filtra código, ano e mês e soma `valorReembolsado` em centavos, por categoria e fornecedor. Categoria nula é preservada como não informada; documentos não são descartados. Documentos duplicados ou exercício incompatível invalidam o conjunto. Data fiscal não é data do reembolso. Nenhum CPF/CNPJ é retornado. Cache anual de até uma hora. Remunerações e recursos utilizados vêm da mesma API; o ranking de emendas individuais do Senado usa vínculo de autoria validado separadamente no Congresso.
- **Governadores e deputados estaduais/distritais:** cadastro com nomes e retratos nas 27 UFs, importado de [Contas do Poder, de Jean-François Laloux](https://github.com/jflaloux/contas-do-poder), licença MIT, revisão `9c09067b10dd0d852f1252edf7c696d373c428df`, em 27/10/2026. **É consolidação independente de fontes públicas, não API nacional oficial.** Listas diretas de MA, CE, AM, BA, DF, ES, MT, PA, PE, SC, SE, TO, MG e SP substituem o cadastro quando validadas; listas podem conter licenciados e suplentes, conforme a instituição. Falha de consulta mantém a origem importada explicitada. Não deduzimos titularidade de resultados eleitorais. Fotografias têm origem/licença nos créditos; ausência produz ícone. A lista importada não garante situação atual em exercício.
- **Folhas estaduais:** arquivos CSV brutos dessa revisão, normalizados em centavos em `state-payroll.json`, contêm governadores de **24 UFs** e deputados de **10 UFs**, com competências distintas, sem prometer cobertura integral por pessoa ou mês. O endpoint `/api/representantes-estaduais?role=government&uf=MA&year=2026&month=9` retorna o período exato, a procedência importada, o arquivo e o portal original. Créditos brutos antes dos descontos podem incluir auxílios, férias, 13º e outras funções públicas; não são apenas subsídio nem líquido depositado. Folhas importadas permanecem como base interna de conferência: **seus valores não são publicados como pagamentos confirmados**. Somente consultas primárias validadas geram valores públicos, com conectores atuais para MA e PI e nome civil exato. O MA confirma ano e mês na página e soma os vínculos publicados de governadoria e conselheiro; o PI usa o recurso oficial da competência e valida nome único e exercício. Os demais estados permanecem sem valor confirmado. Não usamos subsídio legal ou valores arredondados como pagamento realizado. Custo diário estadual é parcial, somente folha publicada ÷ dias das competências com dados; cota, assessores e estrutura não foram integrados de todas as assembleias.
- **Reproduzir a normalização estadual:** `python3 scripts/normalize-state-data.py /caminho/importacao` lê arquivos locais (`assembleias.json`, `governadores.json`, `governadores-input.json`, `revision.txt` e CSVs em `dados/governadores/folha/{uf}.csv` e `dados/assembleias/{uf}/folha_deputados.csv`). Esses arquivos são obtidos da revisão indicada; nenhum script externo é executado. A normalização remove CPF e matrícula, exige nome exato para vincular pagamentos e preserva fonte/competência; escrita atômica evita JSON incompleto durante atualização. A licença está em `LICENSES/contas-do-poder.txt`.
- **Juros reais internacionais:** `src/data/real-interest-ranking.json`, relatório primário MoneYou/Lev de 16/09/2026, cenário central projetado para 40 países. Brasil 1º, 8,45% a.a. É projeção ex ante, combinando juros futuros e inflação esperada pela fórmula de Fisher, não Selic em tempo real nem classificação de todos os países. Atribuição e link para o PDF acompanham o quadro.
- **Consumo em PPC:** `src/data/purchasing-power.json`, Banco Mundial, `NE.CON.PCAP.PP.CD`, ano comum 2025, 124 economias com dado, agregados excluídos. Brasil 62º, U$ 14.710,10 por habitante/ano. Consumo final de famílias e instituições sem fins lucrativos por pessoa em dólares internacionais correntes: aproxima escala de consumo ajustada a preços, **não salário, renda disponível nem medida de desigualdade**. Snapshot consultado em 27/10/2026; atualização da fonte em 08/10/2026. `/api/economia?metric=interest` ou `purchasing`.
- **Atualização:** API da Câmara até 30 minutos; Tesouro até uma hora; arquivo anual até uma hora em memória, conforme publicação da Câmara. Dados fiscais não são em tempo real. Ausência de registros não prova ausência de gasto.

Endpoints locais: `/api/financas/CE?year=2026&month=9`, `/api/despesas/204549?year=2026&month=9`, `/api/perfil/204549`. Use `month=all` para consultar o ano. A API de despesas e finanças requer runtime Node.js e permite até 60 segundos.

## Estrutura

```text
src/app/                  Páginas, metadados e endpoint JSON
src/components/           Mapa, busca, cartões, cabeçalho e rodapé
src/lib/camara.ts         Cliente oficial, validação e erros
src/lib/expenses.ts       CEAP: paginação, validação e somas
src/lib/expense-archive.ts Arquivo anual oficial em fluxo e índice temporário
src/lib/treasury.ts       Contas estaduais RREO e validação de escopo
src/lib/states.ts         Cadastro das 27 UFs
src/lib/brazil-paths.json Geometrias SVG derivadas do IBGE
src/lib/integrations/     Supabase opcional e base para Portal da Transparência
tests/                    Testes da integração e cobertura do mapa
```

## Integrações futuras, sem configuração automática

Nenhuma credencial é necessária na versão atual. Não foi criado banco de dados nem configurado qualquer serviço externo.

- **Supabase:** `src/lib/integrations/supabase.ts` exporta um cliente opcional, restrito ao servidor. Retorna `null` sem `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`. Antes de ativar, definir o modelo de dados, migrations e políticas RLS. Não usar chaves `service_role` no navegador.
- **API com chave do Portal da Transparência:** `src/lib/integrations/transparencia.ts` mantém a base para consultas autenticadas, ainda desabilitadas. A integração pública de emendas descrita acima já funciona sem credencial. Uma futura implementação deve definir recursos, escopo, validações, limites e autenticação `chave-api-dados` da CGU. Dados do Executivo e despesas parlamentares precisam de fontes e metodologias próprias; não devem ser atribuídos automaticamente a deputados.
- `.env.example` documenta as variáveis opcionais. Se decidir ativar uma integração, copie para `.env.local` e configure somente após sua autorização. `.env.local` é ignorado pelo Git. Nunca publique chaves.

## Testes

`pnpm test` cobre validação dos filtros, codificação de busca, paginação, respostas reais de amostra, campos nulos, erros HTTP, timeout, JSON inválido, mudança de schema, IDs inválidos, remoção de campos desnecessários e cobertura das 27 UFs.

Para checar uma consulta real com o servidor aberto:

```bash
curl 'http://127.0.0.1:3000/api/deputados?uf=CE'
```

Falhas de rede devem apresentar erro e link para consultar diretamente a Câmara. Nenhum total de despesas incompleto deve aparecer em caso de indisponibilidade. Custos com componentes conhecidos são explicitamente identificados como parciais e mostram quais componentes faltam. Há fixtures reais sanitizadas da Câmara e do Tesouro; valores alterados nos testes de aritmética são exclusivamente casos de teste e nunca são publicados. Para testar o arquivo anual inteiro localmente, baixe-o da fonte e execute `CMI_ARCHIVE_PATH=/caminho/Ano-2026.json.zip pnpm test`. O arquivo anual não é versionado no Git. Para validar o ZIP completo da CGU, use `CMI_AMENDMENTS_PATH=/caminho/EmendasParlamentares.zip pnpm test`. O arquivo CEAPS completo pode ser validado com `CMI_SENATE_PATH=/caminho/despesas_ceaps.json pnpm test` (recorte de 2026 desta versão). As páginas estaduais coletadas podem ser conferidas com `CMI_ROSTER_DIR=/caminho/diretorio pnpm test`, conforme os nomes de arquivo no teste. Testes também cobrem integridade de autoria, ausência versus zero, centavos/estornos, período da cota, ano bissexto, contador recente, conjunto estadual completo, ranking comum de 2024 e respostas oficiais do Senado.

## Enviar ao GitHub (quando desejar)

O remoto deste repositório já aponta para `https://github.com/jonesferreira07/cademeuimposto.git`. Revise antes de enviar:

```bash
git status
git diff
git add .
git commit -m "Cria primeira versão do Cadê Meu Imposto"
git push -u origin HEAD
```

Os comandos não foram executados automaticamente. Caso o Git solicite autenticação, use seu acesso ao GitHub. O push pode disparar deploy se esse repositório já estiver conectado a algum serviço.

## Publicar na Vercel (somente quando autorizar)

1. Envie as alterações ao GitHub.
2. Na Vercel, use **Add New → Project**, selecione o repositório `cademeuimposto` e importe.
3. Confirme o preset **Next.js**, a raiz do repositório e Node.js 22 ou superior. A instalação usa `pnpm install --frozen-lockfile` e o build usa `pnpm build`; mantenha o diretório de saída padrão do Next.js.
4. Não é necessário cadastrar variáveis para consultar a Câmara. Não adicione credenciais dos serviços futuros antes de decidir ativá-los.
5. Clique em **Deploy** quando desejar publicar. Valide mapa, busca e perfis na URL de preview antes de configurar `cademeuimposto.com` em **Settings → Domains**.

Nenhum deploy, push, configuração de domínio ou credencial foi realizado nesta implementação.

## Revisão para divulgação

A auditoria técnica está em `docs/auditoria-2026.md`. Para repetir as consultas nas 27 UFs, execute `node scripts/audit-live.mjs http://127.0.0.1:3000 /tmp/cmi-auditoria-2026.json` com o servidor aberto. Não é certificação contábil nem promessa de cobertura integral. A mensagem de entrada cita Montesquieu (O Espírito das Leis, XI, IV), em tradução livre com fonte, uma vez por sessão de navegador.

O painel estadual agora destaca **PIB do estado**, **recebido da União** e **despesas pagas**. Repasses usam somente as contas `TransferenciasCorrentesDaUniaoEDeSuasEntidades` + `TransferenciasDeCapitalDaUniaoEDeSuasEntidades` do RREO, não o total de transferências de todas as origens. O ranking exige 27 UFs no mesmo bimestre. PIB (IBGE, 2023) e repasses (2026) têm rankings separados; não se presume que menos produção implique mais repasses.

## Ranking de uso da cota

`/api/ranking-parlamentar?house=camara&year=2026` (ou `house=senado`, com `uf` opcional) compara o acumulado desde janeiro até a consulta, independente do mês escolhido no painel. Filtro mensal é recusado. Câmara: comparativo oficial incluindo SIGEPA; Senado: arquivo CEAPS. Composição atual, Top 3 de menor gasto publicado e ordenação até o maior gasto; casas separadas. Não mistura salário, emendas e estrutura, nem chama ausência de registro ou estorno de “economia”. Empates compartilham posição. É indicador provisório de uso da cota, não comprovação de economicidade. Não há ranking estadual até conferir gastos primários comparáveis.

## Novos indicadores de 28/10/2026

- `/api/divida?year=2026`: DBGG brasileira, SGS 13761 em milhões de reais convertidos para reais e SGS 13762 em % do PIB, exigindo o mesmo mês. Estados: RGF Anexo 02, Poder Executivo, mesma referência quadrimestral para as 27 UFs, DC e DCL. Ranking pela DC nominal. Em indisponibilidade, a base oficial verificada é mostrada com data e aviso. Estoque não é gasto anual; não se somam estados à DBGG nacional. Base conferida: agosto/2026; Brasil R$ 11.054.954.370.000 e 82,87% do PIB.
- `/api/ranking-emendas?house=camara&year=2026&metric=paid`: casas Câmara/Senado, filtro UF, métricas `paid`, `committed`, `liquidated`, `awaitingLiquidation`. Autoria por código e nome exatos do Congresso, composição atual e CGU; sem emendas coletivas ou ausência convertida em zero. `senate-amendment-authors.json` vincula 75 de 81 nomes consultados. Empenho, liquidação e pagamento são etapas distintas, não valores recebidos pessoalmente por parlamentares.
- `/api/poderes?year=2026`: consulta SIOP/SPARQL de 56 órgãos, Orçamento Fiscal e da Seguridade Social, valores pagos e autorizados do orçamento de 2026. Inclui despesas financeiras, amortização e refinanciamento da dívida, identificados. Legislativo inclui TCU; MP/Defensoria separados. Snapshot oficial datado em caso de falha. Previsão separada: mediana de mercado do Prisma Fiscal (15/10/2026), déficit primário do Governo Central de R$ 53,048 bilhões; não é resultado realizado nem meta do governo.
- Custos parciais agora identificam meses disponíveis por componente; meses sem publicação não viram zero. Gabinete, auxílio-moradia efetivamente publicado, uso de imóvel funcional e vínculos ativos/anuais são distinguidos. Auxílio já incluído na cota não é somado outra vez.

A base de segurança do ranking de emendas foi derivada do ZIP oficial CGU publicado em 28/10/2026 às 02:23:07 UTC: 5.604 emendas individuais de 2026, com hash SHA-256 registrado no JSON. O script `scripts/snapshot-amendment-ranking.py` reproduz a agregação em centavos, sem favorecidos ou dados pessoais. Quando a consulta ao vivo falha ou demora, a interface informa a cópia datada. Códigos cuja autoria mudou entre registros não recebem atribuição automática.

Revisão responsiva de 28/10/2026: preço e chamada `Anunciar por R$9,90` não quebram a moeda; anúncio e zoom não se sobrepõem ao SVG. Seletores completos no celular, controles com área de toque maior, formulário ajustado a telas estreitas e temas claro/escuro preservados.


## Anúncios por e-mail

Destino fixo: `jonesferreira07@gmail.com`. Integração preparada com a API oficial do Resend, sem senha do Gmail. Configurar somente no ambiente privado da Vercel:

- `RESEND_API_KEY`: chave de envio da conta do proprietário.
- `AD_RECEIPT_SIGNING_KEY`: segredo aleatório com pelo menos 32 caracteres para vincular comprovantes aos pedidos.
- `AD_MAIL_FROM` (opcional): remetente de domínio verificado. O padrão `onboarding@resend.dev` só pode enviar ao e-mail do proprietário da conta Resend; crie a conta com o destinatário acima ou verifique um domínio próprio.

Nunca colocar essas chaves em arquivos versionados ou mensagens. Antes de ativar em produção, testar a aceitação do provedor e confirmar na caixa de entrada tanto os campos (incluindo cupom) quanto o anexo. Teste real opcional e explícito: `CMI_AD_EMAIL_TEST=1 pnpm test tests/ad-email-delivery.test.ts`, com as variáveis privadas carregadas. Os demais testes não enviam e-mail. O FormSubmit foi descartado após falhas de confirmação HTTP em testes; não é utilizado pelo site.

Na produção, o e-mail é o registro para conferência manual, e não uma confirmação bancária. A equipe confere o Pix no banco, aprova o anúncio e adiciona **apenas** os campos públicos da campanha a `src/data/advertisements.json`: id, brand, phrase, website, paymentConfirmedAt, approvedAt, startsAt e expiresAt (ISO UTC). A validade é de 72 horas a partir de startsAt. Não incluir contato, cupom ou comprovantes nesse arquivo. Uma publicação do site disponibiliza a campanha aprovada; não há publicação nem renovação automática.

## Revisão de custos de 28/10/2026

A pesquisa usa “parlamentar”. A cota mostra gasto / referência da UF no período selecionado e barra percentual. Acumulado: janeiro até o mês de corte; mensal: apenas o mês selecionado. A barra preserva percentuais superiores a 100% (a representação visual termina em 100%) e não trata estorno ou falta de dados como gasto zero. Não representa saldo oficial nem prova de economicidade.

Custo/dia inclui a folha bruta do parlamentar, detalhando salário fixo, vantagens, 13º, férias e verbas eventuais publicadas, e os demais componentes com valores identificados. Cada mês confirmado tem link para a folha. O líquido não é somado novamente. Salários de assessores entram pelo gasto real da verba de gabinete, sem substituir pelo teto legal. **13º, férias e auxílio-alimentação de assessores pagos fora dessa verba ainda não estão consolidados por mandato** e aparecem como componente ausente. Links individuais de remuneração dos assessores são extraídos da relação oficial da Câmara. Sem validar o vínculo histórico e sem evitar duplicação com a verba de gabinete, esses valores não são acrescentados ao total. Estrutura e encargos sem atribuição individual também ficam fora. Portanto o custo/dia é identificado e parcial, não o custo integral.
