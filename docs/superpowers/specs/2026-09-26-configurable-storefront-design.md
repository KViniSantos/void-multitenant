# Design: Vitrine configurável por tenant

## Objetivo

Transformar cada catálogo em uma loja configurável, com uma aparência pronta para uso, páginas completas de produto e uma base que permita melhorar o painel sem carregar o catálogo inteiro no navegador.

## Decisões de produto

- A fonte global da aplicação será Montserrat.
- O lojista escolherá entre templates visuais prontos por segmento: Tecnologia, Natureza, Esportes e Essencial. Cada template define cores, tipografia de apoio, cartões, banner e checkout/sacola; não haverá campos para escolher cores livremente.
- A loja será composta de seções configuráveis: banner inicial, categorias, produtos em destaque, catálogo, sobre a loja e contato. O lojista poderá editar textos e imagens, escolher a ordem, mudar visibilidade e ajustar a quantidade de produtos por linha.
- O catálogo terá chips rápidos para todas as categorias e disponibilidade, mantendo os filtros e a página atual na URL.
- O banner terá três modos: imagem estática, conteúdo dividido entre texto e imagem, ou carrossel de imagens.
- O rodapé poderá mostrar a logo, categorias, CNPJ, redes sociais, horário, telefone, e-mail e endereço. O crédito final para VOID Startup será configurável e virá ativo por padrão.
- Cada produto terá uma página compartilhável com galeria. A primeira imagem será a capa. A página inclui preço, descrição, destaques, disponibilidade, condição, estoque e pedido pelo WhatsApp quando esses dados estiverem preenchidos.
- O catálogo usará paginação no servidor. Interações pequenas, como galeria e sacola, continuam no cliente.
- Métricas de visualização serão agregadas por produto e dia, sem armazenar dados pessoais do visitante.
- A configuração de domínio continuará baseada em um domínio pertencente ao lojista. O aplicativo já resolve domínio próprio na página inicial; adicionar o domínio ao projeto Vercel e apontar DNS depende de configuração da conta Vercel e do DNS do proprietário.

## Arquitetura

Next.js Server Components carregam as páginas públicas e os painéis. Componentes cliente ficam restritos a controles que precisam de estado local. Supabase guarda templates, configuração das seções, metadados dos produtos, galeria e agregados de métricas. Funções SQL públicas retornam somente conteúdo ativo e validam os dados consultados.

Os templates serão implementados como estilos versionados no código, identificados por uma chave persistida no tenant. Um objeto JSON validado guarda as opções de banner, navegação, seções, grade e rodapé, sem permitir CSS ou HTML arbitrário. Isso mantém a migração extensível e permite acrescentar configurações sem criar uma coluna para cada controle visual.

## Subprojetos

### 1. Vitrine e produto

Aplicar Montserrat, criar templates visuais fixos, navegação e rodapé, banner opcional, seções configuráveis, cartões de produto com disponibilidade e uma página de detalhe com galeria. Melhorar a edição de imagens e a configuração da loja.

### 2. Painel do lojista

Permitir selecionar entre várias lojas do mesmo usuário, mostrar métricas de visitas e produtos mais vistos, simplificar categorias, alinhar formulários, mascarar WhatsApp e paginar listas extensas.

### 3. Administração e domínios

Adicionar navegação de plataforma, visão geral com atividade das lojas, gestão de domínios e fluxo de cadastro mais claro. Um domínio personalizado precisa pertencer ao lojista, ter DNS apontado para a Vercel e ser adicionado ao projeto Vercel. A automação dessa última etapa requer credenciais próprias da Vercel.

### 4. Responsividade e capacidade

Revisar os fluxos públicos e administrativos em telas pequenas e largas, reduzir JavaScript enviado ao navegador, limitar consultas e uploads e validar o isolamento entre tenants.

## Critérios da primeira entrega

- Um tenant pode escolher um perfil visual por segmento sem configurar cores hexadecimais.
- Banner estático, dividido e carrossel têm apresentação responsiva e podem ser ativados ou desativados.
- A ordem, os títulos e a visibilidade das seções podem ser configurados; a navegação não aponta para seções ausentes.
- Grade de produtos e layout de destaque seguem as preferências da loja.
- O rodapé suporta dados e links opcionais e exibe o crédito VOID Startup por padrão.
- Um produto aceita várias imagens e usa a primeira como imagem principal.
- O detalhe do produto é acessível por URL própria e inclui galeria, disponibilidade e contato.
- A vitrine apresenta apenas uma página de produtos por vez, renderizada no servidor.
- O número de visualizações e o ranking dos três produtos mais acessados ficam disponíveis para o painel.
- A migração preserva os produtos e as configurações existentes.

## Migração e dependências externas

A nova migração precisa ser aplicada ao Supabase antes de publicar o código que depende dela. Domínios próprios dependem ainda de configuração de DNS e associação do domínio ao projeto na Vercel; sem credenciais administrativas da Vercel, essa associação será manual.
