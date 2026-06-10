# Dashboard de Bobinas

Aplicação web estática para analisar movimentação de bobinas a partir de planilhas CSV ou XLSX importadas manualmente no navegador.

Repositório previsto: [Ernands/Bobinas_RMV](https://github.com/Ernands/Bobinas_RMV).

## O que a aplicação faz

- Lê planilhas localmente, sem backend, banco de dados ou API externa.
- Identifica colunas com variações de nome, acentos, espaços e maiúsculas/minúsculas.
- Calcula demanda mensal por abertura de chamado, saídas, atrasos, caixas, custos e pedidos acima de 50 unidades.
- Mantém compras planejadas no `localStorage`.
- Exporta relatórios em CSV e compras planejadas em JSON.
- Gera cenários de previsão de pedido para bobinas 56 MM X 16 M e 56 MM X 30 M.

## Instalação

```bash
npm install
```

## Rodar localmente

```bash
npm run dev
```

Depois acesse a URL exibida pelo Vite.

## Importar planilha

Na tela inicial, clique em **Selecionar arquivo** e envie um CSV ou XLSX. A aplicação processa tudo no frontend e não envia dados para nenhum servidor.

Colunas esperadas, com variações aceitas:

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

Se alguma coluna importante não for identificada, a interface mostra um aviso.

## Compras planejadas

As compras ficam salvas no `localStorage` do navegador. A primeira execução cria os pedidos padrão de janeiro a junho para os tipos:

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

A aplicação não usa banco de dados, backend ou API externa. A planilha importada fica apenas em memória durante a sessão. As compras planejadas ficam no armazenamento local do navegador e podem ser exportadas em JSON.
