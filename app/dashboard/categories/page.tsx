import { CategoryRow, NewCategoryForm } from "@/components/category-manager";
import { requireTenant } from "@/lib/access";
import type { Category } from "@/lib/database.types";

export const metadata = { title: "Categorias" };

export default async function CategoriesPage() {
  const { supabase, tenant } = await requireTenant();
  const { data } = await supabase.from("categories").select("id,tenant_id,name,slug,active,created_at,updated_at").eq("tenant_id", tenant.id).order("name");
  const categories = (data ?? []) as Category[];
  return <main className="dashboard-content">
    <div className="page-heading"><div><span className="eyebrow eyebrow-dark">ORGANIZE SUA SELEÇÃO</span><h1>Categorias<span className="heading-period">.</span></h1><p>Ajude cada pessoa a encontrar o que procura.</p></div><span className="count-badge">{categories.length} {categories.length === 1 ? "categoria" : "categorias"}</span></div>
    <div className="categories-layout"><section className="panel category-list-panel"><div className="panel-heading"><div><span className="eyebrow eyebrow-dark">SUAS CATEGORIAS</span><h2>Uma vitrine organizada.</h2></div></div>{categories.length ? <div className="category-list">{categories.map((category) => <CategoryRow key={category.id} category={category} />)}</div> : <div className="category-empty"><span>◫</span><strong>Nenhuma categoria ainda.</strong><p>Uma categoria ajuda a organizar seus produtos.</p></div>}</section><aside className="panel new-category-panel"><span className="eyebrow eyebrow-dark">NOVO GRUPO</span><h2>Uma nova seção<br />na sua vitrine.</h2><p>Crie um nome fácil de entender. Você poderá escolher essa categoria ao cadastrar seus produtos.</p><NewCategoryForm /></aside></div>
  </main>;
}
