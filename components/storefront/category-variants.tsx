import Image from "next/image";
import Link from "next/link";
import type { PublicStorefront, StorefrontProduct } from "@/lib/database.types";

function catalogHref(basePath: string, filters: { page: number; categoryId: string | null; availability: string | null; totalPages: number }) {
  const query = new URLSearchParams();
  if (filters.categoryId) query.set("categoria", filters.categoryId);
  if (filters.availability) query.set("disponibilidade", filters.availability);
  const value = query.toString();
  return basePath + (value ? "?" + value : "") + "#catalogo";
}

export function CategoryCollection({
  store, filters, basePath, preview = false,
}: {
  store: PublicStorefront;
  filters: { page: number; categoryId: string | null; availability: string | null; totalPages: number };
  basePath: string;
  preview?: boolean;
}) {
  const variant = store.storefront_config.design.category_variant;
  const products = [...store.featured_products, ...store.products] as StorefrontProduct[];
  const categoryImages = new Map<string, string>();
  for (const product of products) {
    if (product.category_id && product.image_url && !categoryImages.has(product.category_id)) categoryImages.set(product.category_id, product.image_url);
  }

  return <div className={"sf-category-grid sf-category-variant-" + variant + " sf-category-" + store.tenant_type}>
    {store.categories.map((category) => {
      const href = preview ? "#preview" : catalogHref(basePath, { ...filters, page: 1, categoryId: category.id });
      const image = categoryImages.get(category.id);
      return <Link key={category.id} className="sf-category-item" href={href} onClick={preview ? (event) => event.preventDefault() : undefined}>
        {variant === "image-tiles" ? <span className="sf-category-image">{image ? <Image src={image} alt="" fill sizes="(max-width: 680px) 70vw, 240px" /> : <span>{category.name.slice(0, 1)}</span>}</span> : null}
        <span className="sf-category-name">{category.name}</span><span className="sf-category-arrow" aria-hidden="true">→</span>
      </Link>;
    })}
  </div>;
}
