# Personalização de Vitrine e Conteúdo Rico — Plano de Implementação

> **Execução:** inline nesta sessão, conforme pedido para prosseguir.

**Objetivo:** oferecer variantes visuais próprias para Retail, Food e Services, com conteúdo rico seguro e prévia responsiva baseada nos mesmos componentes da vitrine publicada.

**Arquitetura:** manter conteúdo e design separados. As variantes visuais e o texto institucional permanecem no JSONB tenants.storefront_config; os produtos mantêm description curta para os cards e ganham rich_description JSONB para a página detalhada. Extrair renderizadores compartilhados, usados tanto na vitrine pública quanto na prévia temporária do dashboard.

**Tecnologias:** Next.js 16.3.6, React 19, Supabase/PostgreSQL, Zod 4, Tiptap 3 com StarterKit, Link e static renderer React.

---

## Tarefas

### Tarefa 1 — Validar convenções Next e modelar configurações

**Arquivos:**

- Ler: node_modules/next/dist/docs/
- Alterar: lib/database.types.ts, lib/storefront-config.ts, lib/validation.ts
- Testar: testes de configuração e rich document

- [x] Ler as guias instaladas de Server/Client Components, CSS Modules e next/image antes de criar componentes.
- [x] Definir quatro composições allowlistadas de banner, cards e categorias, com tratamentos específicos por vertical; variantes menores para navegação e rodapé.
- [x] Adicionar valores padrão retrocompatíveis no normalizador sem regravar os tenants existentes.
- [x] Adicionar schema de documento Tiptap com allowlist de nós/marcas, URLs permitidas e limites de tamanho/profundidade.
- [x] Cobrir defaults legados, as três verticais e documentos maliciosos antes de integrar persistência.

### Tarefa 2 — Renderizadores modulares por vertical

**Arquivos:**

- Criar: components/storefront/hero-variants.tsx, components/storefront/product-card-variants.tsx, components/storefront/category-variants.tsx, components/storefront/storefront-preview-canvas.tsx
- Alterar: components/storefront.tsx, components/storefront-header.tsx, app/globals.css

- [x] Extrair Hero, Card e Categorias para módulos visuais compartilhados sem mover consultas ou regras de negócio para o cliente.
- [x] Construir quatro composições distintas por componente principal, com renderização própria para Retail, Food e Services.
- [x] Manter preço, estoque, disponibilidade, CTA, carrinho e WhatsApp ligados aos mesmos dados e ações atuais.
- [x] Adicionar opções de navegação e rodapé que reutilizam a configuração atual.
- [x] Manter layout fluido em desktop e celular e limitar configurações a variantes pré-definidas.

### Tarefa 3 — Editor rico e armazenamento seguro

**Arquivos:**

- Criar: components/rich-text-editor.tsx, components/rich-text-content.tsx, lib/rich-text.ts
- Alterar: package.json, lockfile, components/product-form.tsx, components/product-information-tabs.tsx, components/storefront.tsx, lib/database.types.ts, lib/validation.ts, app/actions/dashboard.ts, lib/storefront-data.ts
- Criar migration: supabase/migrations/202609280001_product_rich_description.sql

- [x] Instalar versões compatíveis entre si de Tiptap React, ProseMirror, StarterKit e static renderer React; inicializar o editor com renderização imediata desativada para evitar divergência de hidratação.
- [x] Salvar JSON estruturado em products.rich_description; manter products.description como resumo simples dos cards e compatível com dados já existentes.
- [x] Permitir parágrafos, títulos limitados, negrito, itálico, listas, citação e links seguros; não oferecer HTML, CSS, iframes ou scripts.
- [x] Validar novamente no servidor estrutura, caracteres, profundidade, nós/marcas e protocolo dos links.
- [x] Renderizar os nós permitidos como elementos React; não converter conteúdo do tenant em HTML executável.
- [x] Disponibilizar o editor também para o texto institucional Sobre, que continua na configuração JSONB validada do tenant.
- [x] Retornar rich_description somente no payload de detalhe público; as listagens continuam usando o resumo, mantendo payload e client bundle menores.
- [x] Adicionar migration SQL e testes de documento válido, script/texto HTML, javascript: e nós desconhecidos.

### Tarefa 4 — Prévia responsiva sem persistência automática

**Arquivos:**

- Criar: app/store-preview/page.tsx, components/storefront-preview.tsx
- Alterar: app/dashboard/settings/page.tsx, components/settings-form.tsx, components/product-form.tsx

- [x] Carregar dados públicos reais da loja selecionada pela rota privada; sem produtos, a prévia mostra o estado vazio real da vitrine.
- [x] Renderizar a prévia em iframe autenticado para que os breakpoints de CSS correspondam de fato à largura desktop ou mobile.
- [x] Compartilhar os componentes de Banner, categorias, cards, cabeçalho, rodapé e conteúdo rico com as páginas públicas, sem manter um mock visual separado.
- [x] Enviar estado temporário validado ao iframe com postMessage apenas para a mesma origem; não gravar mudanças no banco durante a edição.
- [x] Adicionar controles Desktop/Mobile e prévia do conteúdo rico atualizada conforme o formulário muda.
- [x] Preservar o salvamento explícito e as validações existentes de upload, tenant e autenticação.

### Tarefa 5 — Cobertura de qualidade e compatibilidade

**Arquivos:**

- Alterar/adicionar: tests/, supabase/tests/, migrations de funções RPC se necessárias

- [x] Testar os schemas para Retail, Food e Services e os limites próprios de cada vertical.
- [x] Testar que o resumo curto permanece separado da descrição rica, além de links e conteúdo hostis e configurações antigas.
- [x] Revisar a migration SQL; nenhuma policy, domínio, Storage, WhatsApp, carrinho ou QR foi alterado.
- [x] Executar `npm run lint`, `npx tsc --noEmit`, `npm run build` e a suíte completa de testes do projeto.
- [ ] Conferir no navegador a prévia desktop/mobile, troca de variantes sem persistência, salvamento explícito e os três fluxos verticais.
- [x] Aplicar a migration no Supabase vinculado e confirmar que o banco remoto está atualizado antes do deploy.

## Critérios de conclusão

- Cada vertical oferece variantes visualmente diferentes para banner/hero, cards e categorias.
- A loja publicada e a prévia usam os mesmos componentes visuais.
- Editar variantes ou texto só altera estado temporário; clicar em salvar persiste uma vez.
- Texto rico é JSON validado e renderizado com nós permitidos, sem HTML livre.
- Descrições antigas e URLs de slug/domínio continuam funcionando.
- Lint, typecheck, build e testes existentes e novos concluem sem erros.

## Limites desta etapa

- Sem drag-and-drop, HTML/CSS/JavaScript customizados ou criação livre de seções.
- Sem novas env vars previstas.
- A migration `supabase/migrations/202609270005_product_rich_description.sql` deve ser aplicada no Supabase antes do deploy para habilitar a descrição detalhada dos produtos.
