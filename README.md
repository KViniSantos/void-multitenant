# Vitrine

SaaS multi-tenant de catálogo com carrinho e finalização pelo WhatsApp. Uma única aplicação Next.js serve as vitrines por slug em desenvolvimento e por domínio em produção.

## Rodar localmente

1. Instale as dependências com `npm install`.
2. Para usar a stack local, inicie Docker e rode `npx supabase start`; a configuração deste projeto usa a porta `55432` para o banco local.
3. Rode `npx supabase status -o env` e copie a URL, a publishable key e a secret key para `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` em `.env.local`. Complete também `NEXT_PUBLIC_SITE_URL=http://localhost:3000` e `NEXT_PUBLIC_PLATFORM_HOST=localhost`.
4. A stack aplica as migrations ao iniciar. Para reaplicá-las e recriar o banco local, rode `npx supabase db reset`.
5. Execute `npx supabase test db` para verificar os limites de RLS com os fixtures João Tech e Maria Tech.
6. Para conectar o projeto hospedado, execute `npx supabase login`, `npx supabase link --project-ref SEU_PROJECT_REF`, `npx supabase db push --dry-run` e, se a migration exibida estiver correta, `npx supabase db push`. O comando `link` solicita a senha do banco do projeto.
7. Crie o primeiro usuário administrador em Authentication > Users e promova o perfil com o SQL abaixo, usando o e-mail desse usuário:

   ```sql
   update public.profiles
   set platform_role = 'platform_admin'
   where email = lower('admin@seudominio.com');
   ```

8. Rode `npm run dev` e acesse `http://localhost:3000/login`.

O trigger da migration cria e atualiza `profiles` quando o Auth cria ou altera um usuário. A migration também sincroniza os usuários que já existiam. O projeto não tem cadastro público de lojas; o administrador da plataforma cria cada tenant e associa um e-mail.

## Supabase antes do lançamento

No painel do projeto Supabase:

- Configure `NEXT_PUBLIC_SUPABASE_URL` e a **publishable key** em `.env.local`.
- Configure `SUPABASE_SECRET_KEY` com a chave `sb_secret_...` do servidor. Nunca use o prefixo `NEXT_PUBLIC_` nessa variável; ela dá acesso elevado e não pode ir para o navegador nem para o GitHub.
- Desative novos cadastros públicos em Authentication > Settings; os lojistas entram por convite do administrador.
- Configure SMTP próprio em Authentication > SMTP Settings. O SMTP padrão do Supabase só entrega mensagens a endereços autorizados da organização e não serve para convidar clientes em produção.
- Em Authentication > URL Configuration, configure a URL pública da plataforma e permita `/auth/confirm` em localhost e produção. O redirect de convite precisa estar na lista permitida.
- A migration cria o bucket público `store-assets`: ele contém somente logos e imagens públicas de produtos; gravação e exclusão exigem o proprietário autenticado no caminho `tenant-id/...` ou um administrador da plataforma.
- Verifique as políticas RLS depois de aplicar a migration. A aplicação não lê `tenants`, `categories` ou `products` anonimamente; as vitrines públicas usam funções SQL que retornam apenas campos de catálogo.

## Deploy

1. Antes de publicar código que dependa de migrations novas, conecte o Supabase e aplique-as:

   ```bash
   npx supabase login
   npx supabase link --project-ref SEU_PROJECT_REF
   npx supabase db push --dry-run
   npx supabase db push
   ```

   Confira que a prévia inclui as migrations pendentes. Para esta versão, são `202609260002_storefront_v2.sql` e `202609260003_storefront_navigation_defaults.sql`. Se o CLI retornar `403`, entre com uma conta que tenha permissão administrativa no projeto Supabase ou peça ao proprietário para conceder acesso, e repita os comandos.
2. Publique o repositório no GitHub e importe-o como um único projeto Next.js na Vercel.
3. Cadastre as variáveis acima na Vercel para Production e Preview. Para o domínio atual, use `NEXT_PUBLIC_SITE_URL=https://void-multitenant.vercel.app` e `NEXT_PUBLIC_PLATFORM_HOST=void-multitenant.vercel.app`. O segundo aceita vários hosts separados por vírgula.
4. Faça o deploy e confirme que o build passou. Crie também o primeiro usuário administrador e execute o SQL de promoção acima antes de tentar abrir `/admin`.
5. Para cada domínio de loja, associe o domínio ao mesmo projeto Vercel e configure no provedor DNS os registros que a Vercel indicar. Depois, salve o domínio sem `https://` no cadastro do tenant. A aplicação confere o hostname da requisição com esse domínio e renderiza somente a loja correspondente.
6. Mantenha o domínio principal da plataforma em `NEXT_PUBLIC_PLATFORM_HOST`; hosts `*.vercel.app` e `localhost` são reconhecidos como hosts da plataforma.

O domínio precisa estar associado ao projeto Vercel além de ser salvo no tenant. Para domínios raiz (`loja.com.br`) e subdomínios (`www.loja.com.br`), os registros DNS necessários são diferentes; use os valores específicos exibidos nas configurações do projeto. Veja [configuração de domínio na Vercel](https://vercel.com/docs/domains/set-up-custom-domain). Confirme também o limite de domínios do plano da conta antes de escalar o número de lojas.

## Variáveis

| Variável | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública usada pelo cliente Supabase com RLS |
| `SUPABASE_SECRET_KEY` | Convites e consultas administrativas exclusivamente no servidor |
| `NEXT_PUBLIC_SITE_URL` | URL principal usada nos links de convite |
| `NEXT_PUBLIC_PLATFORM_HOST` | Hosts que mostram o site da plataforma, separados por vírgula |

## Comandos

- `npm run dev` inicia o ambiente local.
- `npm run lint` verifica regras do ESLint.
- `npx tsc --noEmit` verifica os tipos TypeScript.
- `npm run build` cria o build de produção.

## Fluxo do MVP

- Plataforma: `/admin` e `/admin/tenants`.
- Lojista: `/login` e `/dashboard`.
- Prévia local: `/<slug>`.
- Loja em domínio próprio: `/` do hostname cadastrado.
- O visitante filtra categorias, monta o carrinho e abre `wa.me` com os produtos, quantidades, subtotais e total.

## Limites atuais

- Um proprietário por tenant no MVP; `owner_id` não é único para permitir mais de uma loja por usuário no futuro.
- Carrinho vive apenas no navegador. Não há pedidos ou pagamentos persistidos.
- Slugs reservados para o painel: `admin`, `dashboard`, `login`, `update-password`, `auth` e `_next`.
- Os domínios dos clientes precisam apontar para o projeto antes de aparecerem como lojas online. A associação e os registros DNS são feitos na Vercel/provedor do domínio, não pela aplicação.
