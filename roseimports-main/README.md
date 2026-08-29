# Rose Imports

Vitrine digital de perfumes, cosméticos e eletrônicos importados, com finalização do pedido pelo WhatsApp e painel administrativo de produtos, estoque, imagens e pedidos.

Não há checkout nem pagamento online. O site monta o pedido, registra a intenção de compra no banco e entrega a conversa pronta para o atendimento.

**Stack:** Next.js 15 (App Router) · TypeScript · Supabase (Postgres, Auth, Storage) · Tailwind CSS 4

---

## Interface desta versão

- identidade visual e paleta originais preservadas;
- header com busca e acesso direto a Perfumes, Cosméticos, Eletrônicos, Masculino e Feminino;
- Home mais enxuta, com hero único, categorias, carrossel de Mais vendidos e carrossel de Destaques;
- Mais vendidos usa pedidos pagos quando há histórico e tem fallback seguro quando a loja ainda não possui vendas;
- página de produto com galeria selecionável, foco em preço/variação/estoque e ação de compra;
- carrinho sem recomendações de produtos, mantendo somente itens e resumo;
- rodapé com endereço, razão social, CNPJ, inscrição estadual e páginas de políticas;
- upload de múltiplas imagens no Supabase Storage com opção de definir a imagem de capa.

A logo de `public/logo.png` e `public/logo-mark.png` foi mantida sem alteração.

---

## Requisitos

- Node.js 20 ou superior
- Uma conta no [Supabase](https://supabase.com) (o plano gratuito basta)

---

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar o projeto no Supabase

Crie um projeto novo e anote, em **Project Settings → API**:

- Project URL
- `anon` public key
- `service_role` key

### 3. Configurar as variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Preencha com os valores acima.

> A `SUPABASE_SERVICE_ROLE_KEY` ignora todas as regras de segurança do banco. Ela nunca pode receber o prefixo `NEXT_PUBLIC_` nem ser importada em componente de cliente.

### 4. Rodar as migrations

No **SQL Editor** do Supabase, execute os arquivos de `supabase/migrations/` **em ordem numérica**:

| Arquivo | O que faz |
|---|---|
| `0001_schema.sql` | Tabelas, índices e restrições |
| `0002_rls.sql` | Row Level Security |
| `0003_functions.sql` | Baixa de estoque e trava de status |
| `0004_storage.sql` | Bucket de imagens e permissões |
| `0005_seed_base.sql` | Categorias e famílias olfativas |

### 5. Criar os administradores

```bash
npm run create-admin -- rose@exemplo.com "Rose" senhaSegura123
npm run create-admin -- juliano@exemplo.com "Juliano" senhaSegura123
npm run create-admin -- leticia@exemplo.com "Letícia" senhaSegura123
```

### 6. Rodar o projeto

```bash
npm run dev
```

Abra `http://localhost:3000`. O painel fica em `http://localhost:3000/admin`.

---

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run typecheck` | Verifica os tipos sem gerar build |
| `npm run lint` | ESLint |
| `npm run create-admin` | Cria um administrador |
| `npm run db:types` | Regenera `src/types/database.ts` a partir do schema |

---

## Como demonstrar a aplicação

Antes da apresentação, cadastre pelo menos **3 produtos** com foto, sendo um perfume com duas versões (frasco cheio e decant) e **estoque 2** em alguma versão, para mostrar o rótulo "Últimas unidades".

### Lado do cliente

1. Abra a **Home** — perfumes em destaque, categorias, seção de confiança.
2. Vá ao **Catálogo** e busque um perfume pelo nome.
3. Use os filtros de **gênero** e **família olfativa**.
4. Abra um **produto** e selecione a versão: o preço e a disponibilidade mudam junto.
5. Repare que o site mostra **"Últimas unidades"**, nunca a quantidade exata.
6. Ajuste a quantidade e **adicione ao carrinho**.
7. No **carrinho**, altere a quantidade e veja o subtotal acompanhar.
8. Clique em **Finalizar pedido**, informe o nome, escolha entrega, informe o bairro e selecione o pagamento.
9. Selecione **Cartão** para mostrar o aviso de juros da maquininha.
10. Clique em **Finalizar no WhatsApp**: o número do pedido aparece na tela e o WhatsApp abre com a mensagem completa.

### Lado do administrador

11. Entre em `/admin`.
12. Abra **Pedidos** — o pedido recém-criado está lá como **Novo**.
13. Abra o pedido e mude para **Em atendimento**.
14. Clique em **Marcar como pago** e confirme.
15. Vá em **Estoque**: a quantidade daquela versão diminuiu.
16. Volte ao **Painel**: faturamento, pedidos pagos, ticket médio e conversão mudaram.
17. Volte ao pedido e clique em **Marcar como pago** de novo (se ainda aparecer) — o sistema avisa que já estava pago e **não desconta o estoque de novo**.

### Regras de negócio que valem mostrar

18. Em **Estoque**, mude a quantidade para 0 e recarregue a página do produto: aparece **Esgotado**.
19. Em **Produtos**, altere o preço de uma versão e volte ao catálogo: o valor novo aparece.
20. Abra um pedido antigo: o valor dele **não mudou** — o preço fica congelado no momento da compra.
21. Em **Produtos**, clique em **Desativar**: o produto some do catálogo, mas continua no histórico dos pedidos.

---

## Arquitetura

```
src/
  app/
    (site)/          páginas públicas
    admin/           painel e Server Actions
    api/pedidos/     criação do pré-pedido
  components/        UI compartilhada
  features/
    cart/            estado do carrinho
    catalog/         consultas e filtros
    checkout/        finalização
    product/         seletor de versão
    admin/           telas do painel
  lib/
    config/site.ts   dados de contato e textos
    supabase/        clients (browser, server, service role)
    validation/      schemas Zod
  types/             tipos do banco
supabase/migrations/ SQL em ordem numérica
```

### Como o dinheiro é tratado

Todos os valores são inteiros em centavos (`price_cents`, `subtotal_cents`), do banco até a interface. A conversão para reais acontece só na formatação. Nenhum cálculo passa por ponto flutuante.

### Como o pedido é criado

O navegador nunca escreve no banco. Ao finalizar, ele envia apenas as variantes e quantidades para `POST /api/pedidos`, que roda no servidor e:

1. busca preço e estoque atuais direto do banco;
2. recusa o pedido se alguma variante estiver indisponível, dizendo qual e quantas restam;
3. recalcula o subtotal — o valor enviado pelo navegador é descartado;
4. grava o pedido com snapshot de nome, versão e preço de cada item;
5. devolve o número do pedido e a mensagem do WhatsApp.

As tabelas `orders` e `order_items` não têm nenhuma permissão de escrita pública. Só a chave de serviço, usada no servidor, grava nelas.

Quando o servidor recusa um item, a resposta traz quantas unidades ainda existem e o carrinho se ajusta sozinho na tela.

### Como o estoque funciona

O estoque **não** é reservado em nenhum momento: nem ao adicionar ao carrinho, nem ao gerar o pré-pedido. Como o pagamento acontece fora do sistema, reservar bloquearia unidades por compras que nunca se concretizam.

A baixa acontece uma única vez, quando o administrador marca o pedido como **Pago**. A função `mark_order_paid()` faz tudo numa transação: trava o pedido, desconta cada item verificando o saldo, e grava `paid_at`. Marcar como pago duas vezes não desconta duas vezes.

O cliente nunca vê a quantidade exata. Ele vê um status derivado de `stock_quantity`:

| Quantidade | Status público |
|---|---|
| 0 | Esgotado |
| 1 ou 2 | Últimas unidades |
| 3 ou mais | Disponível |

### Estados do pedido

```
Novo → Em atendimento → Pago → Entregue ou Retirado
```

Um pedido pago não volta atrás: não pode ser cancelado nem ter o pagamento desfeito. Um pedido cancelado é final. Essas travas estão em triggers no banco, não só na tela — vale conferir tentando pelo SQL Editor.

### Métricas

O faturamento usa `paid_at`, não `status`. Assim um pedido que virou "Entregue" continua contando exatamente uma vez como venda. O valor soma apenas o subtotal dos produtos: taxa de entrega e juros de cartão são combinados no atendimento e não passam pelo site.

### Autenticação

Ser administrador é ter uma linha em `profiles`. Todos têm as mesmas permissões — não há níveis de acesso neste MVP. O middleware barra `/admin` sem sessão, e as policies do banco barram tudo o mais.

### Variantes e decants

Um decant é uma **versão** do perfume (`variant_type = 'decant'`), não um produto separado. Cliente e administrador veem tudo na mesma página. O estoque do decant e o do frasco cheio são independentes: ao fracionar um frasco, ajuste os dois na tela de Estoque.

---

## Dados institucionais

Os dados de endereço e empresa solicitados para esta versão ficam centralizados em `src/lib/config/site.ts`. WhatsApp, Instagram e horários também continuam nesse arquivo para facilitar futuras alterações.

As credenciais reais do Supabase **não** fazem parte do ZIP/repositório: mantenha o `.env.local` do ambiente já configurado e use `.env.local.example` apenas como referência de nomes das variáveis.

---

## Notas técnicas

**Versões do Supabase.** O `@supabase/ssr` precisa ser 0.12.4 ou superior. Com a 0.5.2, o tipo `Database` resolve como `never` em todas as queries junto do `supabase-js` 2.112, e o projeto não compila.

**Fontes.** O build baixa Bodoni Moda e Jost do Google Fonts, então a primeira compilação precisa de internet.

---

## O que ficou de fora deste MVP

Por decisão de escopo: checkout online, gateway de pagamento, cadastro de clientes, área do cliente, favoritos, avaliações, fidelidade, cálculo automático de frete, reserva de estoque, CRM, ERP, blog, cupons e níveis de permissão administrativa.
