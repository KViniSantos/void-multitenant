"use client";

import Image from "next/image";
import { useActionState } from "react";
import type { Tenant } from "@/lib/database.types";
import { saveSettingsAction } from "@/app/actions/dashboard";
import { ActionMessage } from "@/components/action-message";

export function SettingsForm({ tenant }: { tenant: Tenant }) {
  const [state, action, pending] = useActionState(saveSettingsAction, {});
  return <form action={action} className="panel editor-form" encType="multipart/form-data">
    <div className="form-section-heading"><span className="step-number">01</span><div><strong>Identidade da loja</strong><p>Uma primeira impressão com a sua personalidade.</p></div></div>
    <label className="field"><span>Nome da loja</span><input name="name" minLength={2} maxLength={80} required defaultValue={tenant.name} /></label>
    <div className="logo-upload-row">{tenant.logo_url ? <Image className="settings-logo" src={tenant.logo_url} alt="Logo atual" width={76} height={76} unoptimized /> : <span className="settings-logo-fallback">{tenant.name.slice(0, 1)}</span>}<label className="field file-field"><span>Logo da loja</span><input name="logo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" /><small>JPG, PNG, WebP ou AVIF · até 5 MB.</small></label></div>
    <div className="form-section-heading section-separator"><span className="step-number">02</span><div><strong>Aparência</strong><p>Escolha cores que representem a sua loja.</p></div></div>
    <div className="color-fields"><label className="field"><span>Cor principal</span><div className="color-input-wrap"><input type="color" name="primary_color" defaultValue={tenant.primary_color} /><input type="text" aria-label="Código da cor principal" defaultValue={tenant.primary_color} onChange={(event) => { const picker = event.currentTarget.parentElement?.querySelector<HTMLInputElement>('input[type="color"]'); if (/^#[0-9a-f]{6}$/i.test(event.currentTarget.value) && picker) picker.value = event.currentTarget.value; }} /></div></label><label className="field"><span>Cor de destaque</span><div className="color-input-wrap"><input type="color" name="secondary_color" defaultValue={tenant.secondary_color} /><input type="text" aria-label="Código da cor de destaque" defaultValue={tenant.secondary_color} onChange={(event) => { const picker = event.currentTarget.parentElement?.querySelector<HTMLInputElement>('input[type="color"]'); if (/^#[0-9a-f]{6}$/i.test(event.currentTarget.value) && picker) picker.value = event.currentTarget.value; }} /></div></label></div>
    <div className="form-section-heading section-separator"><span className="step-number">03</span><div><strong>Atendimento pelo WhatsApp</strong><p>O cliente envia o resumo do carrinho para esse número.</p></div></div>
    <label className="field"><span>Número do WhatsApp</span><input name="whatsapp_number" type="tel" inputMode="tel" defaultValue={tenant.whatsapp_number ?? ""} placeholder="+55 (11) 99999-9999" /><small>Inclua o código do país. Números locais do Brasil recebem +55 automaticamente.</small></label>
    <div className="form-section-heading section-separator"><span className="step-number">04</span><div><strong>Seu endereço online</strong><p>Os domínios são configurados pelo administrador da plataforma.</p></div></div>
    <div className="domain-setting"><div className="domain-setting-icon">⌁</div><div><strong>{tenant.domain ?? `/${tenant.slug}`}</strong><small>{tenant.domain ? "Domínio conectado" : "Endereço de prévia para desenvolvimento"}</small></div><span className={tenant.domain ? "status-pill status-active" : "status-pill status-draft"}>{tenant.domain ? "Configurado" : "Prévia"}</span></div>
    <ActionMessage state={state} />
    <div className="form-actions"><button className="button button-dark" type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar configurações"}<span>↗</span></button></div>
  </form>;
}
