"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Tenant } from "@/lib/database.types";
import { createTenantAction, updateTenantAction } from "@/app/actions/admin";
import { ActionMessage } from "@/components/action-message";
import { WhatsAppField } from "@/components/masked-fields";
import Image from "next/image";

export function CreateTenantForm() {
  const [state, action, pending] = useActionState(createTenantAction, {});
  return <form action={action} className="panel editor-form admin-create-form" encType="multipart/form-data">
    <div className="form-section-heading"><span className="step-number">01</span><div><strong>Dados da loja</strong><p>Escolha como ela vai aparecer e ser encontrada.</p></div></div>
    <label className="field"><span>Nome da loja</span><input name="name" required minLength={2} maxLength={80} placeholder="Ex.: João Tech" /></label>
    <div className="form-row"><label className="field"><span>Endereço de prévia (slug)</span><input name="slug" maxLength={48} placeholder="joao-tech" /><small>Se deixar vazio, usamos o nome da loja.</small></label><label className="field"><span>Domínio próprio <small>opcional</small></span><input name="domain" placeholder="joaotech.com.br" /><small>Depois, associe o mesmo domínio à Vercel e configure o DNS.</small></label></div>
    <div className="form-row"><label className="field"><span>Tipo de negócio</span><select name="tenant_type" defaultValue="retail"><option value="retail">Retail · Loja de produtos</option><option value="food">Food · Cardápio e pedidos</option><option value="services">Services · Catálogo de serviços</option></select></label><label className="field"><span>Estilo visual</span><select name="storefront_template" defaultValue="essentials"><option value="technology">Tecnologia</option><option value="nature">Natureza</option><option value="sports">Esportes</option><option value="essentials">Essenciais</option></select></label></div>
    <label className="field file-field"><span>Logo <small>opcional</small></span><input name="logo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" /><small>JPG, PNG, WebP ou AVIF · até 5 MB.</small></label>
    <div className="form-section-heading section-separator"><span className="step-number">02</span><div><strong>Conta do lojista</strong><p>Vamos enviar um convite para definir a senha.</p></div></div>
    <label className="field"><span>E-mail do proprietário</span><input name="owner_email" type="email" required autoComplete="email" placeholder="joao@exemplo.com" /></label>
    <label className="field"><span>WhatsApp <small>opcional</small></span><WhatsAppField /><small>O lojista poderá ajustar esse número nas configurações.</small></label>
    <ActionMessage state={state} />
    <div className="form-actions"><Link href="/admin/tenants" className="button button-outline">Cancelar</Link><button className="button button-dark" disabled={pending}>{pending ? "Criando loja…" : "Criar loja e enviar convite"}<span>↗</span></button></div>
  </form>;
}

export function EditTenantForm({ tenant, ownerEmail }: { tenant: Tenant; ownerEmail: string }) {
  const [state, action, pending] = useActionState(updateTenantAction, {});
  return <form action={action} className="panel editor-form admin-create-form" encType="multipart/form-data">
    <input type="hidden" name="id" value={tenant.id} />
    <div className="form-section-heading"><span className="step-number">01</span><div><strong>Dados da loja</strong><p>Identificação, domínio e acesso do proprietário.</p></div></div>
    <label className="field"><span>Nome da loja</span><input name="name" required minLength={2} maxLength={80} defaultValue={tenant.name} /></label>
    <div className="form-row"><label className="field"><span>Endereço de prévia (slug)</span><input name="slug" required maxLength={48} defaultValue={tenant.slug} /></label><label className="field"><span>Domínio próprio <small>opcional</small></span><input name="domain" defaultValue={tenant.domain ?? ""} placeholder="joaotech.com.br" /><small>Garanta que o domínio também esteja adicionado no projeto Vercel e com o DNS apontado.</small></label></div>
    <div className="form-row"><label className="field"><span>Tipo de negócio</span><select name="tenant_type" defaultValue={tenant.tenant_type}><option value="retail">Retail · Loja de produtos</option><option value="food">Food · Cardápio e pedidos</option><option value="services">Services · Catálogo de serviços</option></select></label><label className="field"><span>Estilo visual</span><select name="storefront_template" defaultValue={tenant.storefront_template}><option value="technology">Tecnologia</option><option value="nature">Natureza</option><option value="sports">Esportes</option><option value="essentials">Essenciais</option></select></label></div>
    <label className="field file-field"><span>Atualizar logo <small>opcional</small></span><input name="logo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" /></label>
    {tenant.logo_url ? <div className="current-image"><Image src={tenant.logo_url} alt="Logo atual da loja" width={112} height={60} /><span>Logo atual</span></div> : null}
    <div className="form-section-heading section-separator"><span className="step-number">02</span><div><strong>Proprietário</strong><p>Associe uma conta já existente ou convide outra pessoa.</p></div></div>
    <label className="field"><span>E-mail do proprietário</span><input name="owner_email" type="email" required defaultValue={ownerEmail} /></label>
    <label className="field"><span>WhatsApp <small>opcional</small></span><WhatsAppField defaultValue={tenant.whatsapp_number ?? ""} /></label>
    <label className="switch-field"><input name="active" type="checkbox" defaultChecked={tenant.active} /><span className="switch-indicator" /><span><strong>Loja ativa</strong><small>Lojas inativas não aparecem no catálogo público.</small></span></label>
    <ActionMessage state={state} />
    <div className="form-actions"><Link href="/admin/tenants" className="button button-outline">Voltar à lista</Link><button className="button button-dark" disabled={pending}>{pending ? "Salvando…" : "Salvar alterações"}<span>↗</span></button></div>
  </form>;
}
