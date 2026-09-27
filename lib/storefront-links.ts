import type { PublicStorefront, StorefrontProduct } from "@/lib/database.types";

export function productHref(
  _store: Pick<PublicStorefront, "slug" | "domain">,
  product: Pick<StorefrontProduct, "slug">,
  basePath: string,
) {
  return basePath.replace(/\/$/, "") + "/produto/" + product.slug;
}
