# Plan: dual product prices and related products

## Goal

Show a Pix price and a card price for each product, with the card price labeled “em até 12x”, and display up to four related products below a product's details.

## Decisions

- Keep `products.price` as the Pix price to preserve current checkout and WhatsApp behavior.
- Add `products.card_price`; migrate existing products by copying `price` into it.
- Show the Pix subtotal and card total in the cart and send both in the WhatsApp message.
- Find related products from the same tenant, prioritize the same active category, then fill remaining slots with other active products from that store.

## Work items

1. Add a Supabase migration that adds and backfills `card_price`, includes it in the public storefront and product detail payloads, and returns related products in the detail payload.
2. Update database and storefront JSON types, validation, and the product editor so tenants can set both prices.
3. Render both prices in product cards and detail pages; update cart line items, totals, and WhatsApp checkout copy.
4. Render a “Produtos relacionados” grid below product details, reusing storefront cards and allowing related items to be added to the cart.
5. Run typecheck, lint, and production build; apply the additive migration; commit and push to `main` to trigger Vercel deployment.

## Files

- `supabase/migrations/202609260005_product_prices_and_related.sql`
- `lib/database.types.ts`
- `lib/storefront-data.ts`
- `lib/validation.ts`
- `app/actions/dashboard.ts`
- `components/product-form.tsx`
- `components/storefront.tsx`
- `components/product-detail.tsx`
- `components/store-cart.tsx`
- `app/storefront-overrides.css`
