# Storefront polish and settings save reliability

## Design

- Keep the tenant storefront configuration as the single source of truth for typography and section navigation. Offer a small, preloaded font catalog: Montserrat, Inter, Roboto, Lora, and Playfair Display; keep Montserrat as the existing default.
- Reuse the same configuration-driven header on catalog and product detail pages. Make the storefront wrapper a full-height flex column so short detail pages end at the footer, and keep product media free of decorative white frames.
- Let each product define optional detail sections. Each section has a tenant-authored heading and label/value rows, so shops can describe arbitrary vertical-specific information without application-specific medical or technology fields.
- Keep cart state in the browser and add explicit per-product removal and clear-all actions. Render recognizable SVG social and WhatsApp marks with accessible names.
- Upload selected media directly from the browser to the existing Supabase Storage bucket, which already enforces tenant ownership with RLS. Submit only URLs and other settings to the Server Action, avoiding oversized multipart requests to Vercel.

## Implementation plan

1. Extend the storefront config and settings UI with the font whitelist, add preloaded font variables, and improve small storefront text sizes and mobile controls.
2. Extract a shared storefront header and icon components, reuse them on both routes, and fix product-detail page height and media framing.
3. Add an additive Supabase migration for product detail sections; extend the database types, validation, product editor, public detail RPC payload, and product detail renderer.
4. Add single-item removal and clear-all controls to the cart.
5. Move settings and product image uploads to authenticated browser-side Supabase Storage uploads; keep Server Actions responsible for validation and database writes, with upload progress/errors visible in the forms.
6. Run lint, TypeScript, production build, and the existing route tests. Review the migration and changed storefront breakpoints.

## Verification notes

- The project requires reading its installed Next.js documentation before changing Next.js behavior. The installed font optimization and Server Actions guides were reviewed.
- The storefront data path uses security-definer Supabase RPCs; any product-detail payload change must be reflected in both SQL and its Zod parser.
- Browser automation is unavailable in this environment, so responsive checks will rely on CSS breakpoint review and the successful production build.
