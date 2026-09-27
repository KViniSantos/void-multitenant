import { FoodStoreQR } from "@/components/food-store-qr";
import { requireTenant } from "@/lib/access";
import { buildPublicStoreUrl } from "@/lib/public-store-url";
import { notFound } from "next/navigation";

export const metadata = { title: "QR code da loja" };

export default async function FoodStoreQRPage() {
  const { tenant } = await requireTenant();
  if (tenant.tenant_type !== "food") notFound();

  let url: string | null = null;
  let initialError: string | null = null;

  try {
    url = buildPublicStoreUrl(
      { slug: tenant.slug, domain: tenant.domain },
      process.env.NEXT_PUBLIC_SITE_URL ??
        (process.env.NODE_ENV === "development" ? "http://localhost:3000" : null),
    );
  } catch {
    initialError =
      "Endereço público indisponível. Peça ao administrador da plataforma para configurar a URL canônica do site ou conectar um domínio próprio válido.";
  }

  return (
    <main className="dashboard-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow eyebrow-dark">DIVULGAÇÃO DA LOJA</span>
          <h1>QR code da loja<span className="heading-period">.</span></h1>
          <p>Compartilhe o cardápio com seus clientes por link ou QR code.</p>
        </div>
      </div>
      <FoodStoreQR url={url} slug={tenant.slug} initialError={initialError} />
    </main>
  );
}
