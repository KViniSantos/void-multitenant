# Plan: configurable product attributes and detail tabs

## Goal

Let a tenant configure dropdown options for each product (for example, Cor: azul, preto, branco), capture the selected values in each cart line, and include them in the WhatsApp order. Present product description and additional information in tabs inspired by the supplied reference, and replace “Consultar” with “Adicionar ao carrinho”.

## Decisions

- Store up to eight named attributes per product, each with up to twenty allowed values.
- Require a customer to choose every configured attribute before adding that product to the cart.
- Keep separately selected combinations as separate cart lines; combine only identical selections.
- Show the description and highlights in one tab and configured information sections plus available attributes in the other.
- Products with no configured options are added immediately from catalog cards.

## Work items

1. Add the `attributes` JSON column and expose it in public catalog/detail RPC payloads.
2. Extend product validation, server actions, and the product editor to configure attribute names and allowed values.
3. Add an accessible product information tab component and an attribute selection dialog on add-to-cart.
4. Key cart lines by selected options, show options in the cart, and include them in the WhatsApp message.
5. Run lint, typecheck, and production build; apply the additive migration; push the commit and confirm deployment.

## Additional correction in this delivery

The price field was reformatting on each keystroke, which could move the caret, and formatted database amounts as if they were cents. Keep the entered text stable while editing, parse Brazilian decimal and thousands separators on save/blur, and format numeric database values as reais.
