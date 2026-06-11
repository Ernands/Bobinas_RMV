# Dashboard de Bobinas

Aplicação web estática para analisar movimentação de bobinas e envios dos Correios a partir de Google Sheets publicado ou planilhas CSV/XLSX importadas manualmente no navegador.

Repositório: [Ernands/Bobinas_RMV](https://github.com/Ernands/Bobinas_RMV).

## O que a aplicação faz

- Lê bases do Google Sheets publicado por aba, sem backend e sem banco de dados.
- Mantém importação manual CSV/XLSX com identificação automática da base.
- Identifica colunas com variações de nome, acentos, espaços e maiúsculas/minúsculas.
- Calcula demanda mensal de bobinas, saídas, atrasos, caixas, custos, cobertura e previsões de compra.
- Analisa Envios Correios por ano, serviço, tipo de chamado, Coban, loja, unidade de postagem, custo e peso.
- Consolida Bobinas e Correios no Resumo Executivo.
- Mantém compras planejadas no `localStorage`.
- Exporta relatórios em CSV e compras planejadas em JSON.

## Instalação

```bash
npm install
```

## Rodar localmente

```bash
npm run dev
```

Depois acesse a URL exibida pelo Vite.

## Google Sheets multi-abas

A fonte principal fica configurada em `src/config/datasets.js`.

Abas configuradas atualmente:

- `Bobinas`, `gid 94895701`
- `Envios Correios`, `gid 641203793`
- `Futuro1`, `gid 1375191094`, desabilitada
- `Futuro2`, `gid 1543667616`, desabilitada

Para trocar nomes de abas ou `gid`s, edite `DATASET_CONFIGS`. As abas futuras podem continuar com `enabled: false` até existir uma tela ou regra de análise para elas.

O link padrão publicado do Google Sheets fica em `src/utils/storage.js`, em `DEFAULT_DATA_SOURCE_URL`.

## Importar planilha manual

Na tela inicial, use **Arquivo** e envie um CSV ou XLSX. A aplicação tenta identificar se o arquivo é da base Bobinas ou Envios Correios pelas colunas. Se necessário, selecione manualmente o tipo no campo ao lado da URL.

Colunas esperadas para Bobinas:

- Tipo de chamado
- Data de abertura
- Data de saída
- Tipo de bobina
- Quantidade
- Destino
- UF
- Forma de envio
- Rastreamento
- Status

Colunas esperadas para Envios Correios:

- Data da postagem
- Rastreamento
- Cod. Serviço
- Serviço
- Peso
- Unidade da postagem
- CEP
- Valor unitário
- Valor desconto
- Valor serviço
- Coban
- Loja
- Chamado

Se alguma coluna importante não for identificada, a interface mostra um aviso por base.

## Compras planejadas

As compras ficam salvas no `localStorage` do navegador. A primeira execução cria pedidos padrão para os tipos:

- 56 MM X 16 M
- 56 MM X 30 M

Use os botões de exportar/importar JSON na aba **Compras Planejadas** para fazer backup ou restaurar esses dados em outro navegador.

## Publicar no GitHub Pages

O `vite.config.js` usa `base: '/Bobinas_RMV/'`, adequado para o GitHub Pages deste repositório.

Para gerar a versão final:

```bash
npm run build
```

Para publicar usando `gh-pages`:

```bash
npm run deploy
```

## Privacidade dos dados

A aplicação não usa banco de dados nem backend. Os dados do Google Sheets são lidos direto pelo navegador a partir da publicação CSV das abas. Arquivos importados manualmente ficam apenas em memória durante a sessão. As compras planejadas e a URL da fonte ficam no armazenamento local do navegador.
