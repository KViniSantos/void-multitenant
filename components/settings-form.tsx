"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import type { StorefrontConfig, StorefrontTemplate, Tenant } from "@/lib/database.types";
import { normalizeStorefrontConfig } from "@/lib/storefront-config";
import { saveSettingsAction } from "@/app/actions/dashboard";
import { ActionMessage } from "@/components/action-message";
import { CnpjField, WhatsAppField } from "@/components/masked-fields";
import { uploadTenantImages } from "@/lib/browser-assets";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ActionState } from "@/lib/actions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { StorefrontPreviewFrame } from "@/components/storefront-preview";

const templates: { id: StorefrontTemplate; name: string; description: string }[] = [
  { id: "technology", name: "Tecnologia", description: "Contraste escuro, roxo e visual preciso." },
  { id: "nature", name: "Natureza", description: "Verdes suaves, tons orgânicos e naturais." },
  { id: "sports", name: "Esportes", description: "Energia, destaque e chamadas fortes." },
  { id: "essentials", name: "Essenciais", description: "Visual claro, neutro e versátil." },
];
const sectionNames: Record<StorefrontConfig["section_order"][number], string> = { categories: "Categorias", featured: "Destaques", catalog: "Catálogo", about: "Sobre a loja", contact: "Contato", gallery: "Galeria" };

export function SettingsForm({ tenant }: { tenant: Tenant }) {
  const [uploadStatus, setUploadStatus] = useState("");
  const [state, action, pending] = useActionState(async (previous: ActionState, formData: FormData): Promise<ActionState> => {
    const uploadedPaths: string[] = [];
    try {
      let nextConfig: StorefrontConfig;
      try { nextConfig = JSON.parse(String(formData.get("storefront_config") ?? "")) as StorefrontConfig; }
      catch { return { error: "As configurações visuais estão inválidas." }; }
      const logoFile = formData.get("logo");
      const logoFiles = logoFile instanceof File && logoFile.size ? [logoFile] : [];
      const bannerFiles = formData.getAll("banner_images").filter((file): file is File => file instanceof File && file.size > 0);
      const aboutFile = formData.get("about_image");
      const aboutFiles = aboutFile instanceof File && aboutFile.size ? [aboutFile] : [];
      const galleryFiles = tenant.tenant_type === "services"
        ? formData.getAll("gallery_images").filter((file): file is File => file instanceof File && file.size > 0)
        : [];
      const maxBanners = 8 - nextConfig.hero.image_urls.length;
      const maxGalleryImages = 8 - nextConfig.sections.gallery.image_urls.length;
      if (bannerFiles.length > maxBanners) return { error: `Mantenha no máximo 8 imagens no banner. Você já tem ${nextConfig.hero.image_urls.length}.` };
      if (galleryFiles.length > maxGalleryImages) return { error: `Mantenha no máximo 8 fotos na galeria. Você já tem ${nextConfig.sections.gallery.image_urls.length}.` };

      const supabase = (logoFiles.length || bannerFiles.length || aboutFiles.length || galleryFiles.length) ? createSupabaseBrowserClient() : null;
      let logoUrl = String(formData.get("logo_url") ?? "");
      if (logoFiles.length && supabase) {
        setUploadStatus("Enviando logo ao Supabase…");
        const uploaded = await uploadTenantImages(supabase, logoFiles, tenant.id, "logo", 1);
        if (uploaded.error) return { error: uploaded.error };
        uploadedPaths.push(...uploaded.paths);
        logoUrl = uploaded.urls[0] ?? logoUrl;
      }
      if (bannerFiles.length && supabase) {
        setUploadStatus(`Enviando ${bannerFiles.length} imagem${bannerFiles.length === 1 ? "" : "s"} do banner…`);
        const uploaded = await uploadTenantImages(supabase, bannerFiles, tenant.id, "banners", maxBanners);
        if (uploaded.error) {
          if (uploadedPaths.length) await supabase.storage.from("store-assets").remove(uploadedPaths);
          return { error: uploaded.error };
        }
        uploadedPaths.push(...uploaded.paths);
        nextConfig.hero.image_urls = [...nextConfig.hero.image_urls, ...uploaded.urls];
      }
      if (aboutFiles.length && supabase) {
        setUploadStatus("Enviando imagem da seção Sobre…");
        const uploaded = await uploadTenantImages(supabase, aboutFiles, tenant.id, "about", 1);
        if (uploaded.error) {
          if (uploadedPaths.length) await supabase.storage.from("store-assets").remove(uploadedPaths);
          return { error: uploaded.error };
        }
        uploadedPaths.push(...uploaded.paths);
        nextConfig.sections.about.image_url = uploaded.urls[0] ?? null;
      }
      if (galleryFiles.length && supabase) {
        setUploadStatus(`Enviando ${galleryFiles.length} foto${galleryFiles.length === 1 ? "" : "s"} da galeria…`);
        const uploaded = await uploadTenantImages(supabase, galleryFiles, tenant.id, "gallery", maxGalleryImages);
        if (uploaded.error) {
          if (uploadedPaths.length) await supabase.storage.from("store-assets").remove(uploadedPaths);
          return { error: uploaded.error };
        }
        uploadedPaths.push(...uploaded.paths);
        nextConfig.sections.gallery.image_urls = [...nextConfig.sections.gallery.image_urls, ...uploaded.urls];
      }

      formData.set("storefront_config", JSON.stringify(nextConfig));
      formData.set("logo_url", logoUrl);
      formData.delete("logo");
      formData.delete("banner_images");
      formData.delete("about_image");
      formData.delete("gallery_images");
      const result = await saveSettingsAction(previous, formData);
      if (result.error && uploadedPaths.length && supabase) await supabase.storage.from("store-assets").remove(uploadedPaths);
      return result;
    } catch (error) {
      if (uploadedPaths.length) await createSupabaseBrowserClient().storage.from("store-assets").remove(uploadedPaths);
      return { error: error instanceof Error ? error.message : "Não foi possível enviar as imagens. Tente novamente." };
    } finally {
      setUploadStatus("");
    }
  }, {});
  const [template, setTemplate] = useState<StorefrontTemplate>(tenant.storefront_template);
  const [config, setConfig] = useState<StorefrontConfig>(() => normalizeStorefrontConfig(tenant.storefront_config));
  const [primaryColor, setPrimaryColor] = useState(tenant.primary_color);
  const [secondaryColor, setSecondaryColor] = useState(tenant.secondary_color);
  const updateHero = (patch: Partial<StorefrontConfig["hero"]>) => setConfig((current) => ({ ...current, hero: { ...current.hero, ...patch } }));
  const updateDesign = <K extends keyof StorefrontConfig["design"]>(key: K, value: StorefrontConfig["design"][K]) => setConfig((current) => ({ ...current, design: { ...current.design, [key]: value } }));
  const updateNavigation = (patch: Partial<StorefrontConfig["navigation"]>) => setConfig((current) => ({ ...current, navigation: { ...current.navigation, ...patch } }));
  const updateSection = <K extends keyof StorefrontConfig["sections"]>(key: K, patch: Partial<StorefrontConfig["sections"][K]>) => setConfig((current) => ({ ...current, sections: { ...current.sections, [key]: { ...current.sections[key], ...patch } } }));
  const updateFooter = (patch: Partial<StorefrontConfig["footer"]>) => setConfig((current) => ({ ...current, footer: { ...current.footer, ...patch } }));
  const visibleSectionOrder = config.section_order.filter((key) => tenant.tenant_type === "services" || key !== "gallery");
  const moveSection = (key: StorefrontConfig["section_order"][number], delta: number) => setConfig((current) => {
    const order = [...current.section_order];
    const visibleOrder = order.filter((item) => tenant.tenant_type === "services" || item !== "gallery");
    const from = visibleOrder.indexOf(key);
    if (from < 0) return current;
    const to = Math.max(0, Math.min(visibleOrder.length - 1, from + delta));
    [visibleOrder[from], visibleOrder[to]] = [visibleOrder[to], visibleOrder[from]];
    if (tenant.tenant_type !== "services") {
      let visibleIndex = 0;
      for (let index = 0; index < order.length; index += 1) {
        if (order[index] !== "gallery") order[index] = visibleOrder[visibleIndex++];
      }
    } else {
      order.splice(0, order.length, ...visibleOrder);
    }
    return { ...current, section_order: order };
  });
  const moveGalleryImage = (index: number, delta: number) => setConfig((current) => {
    const image_urls = [...current.sections.gallery.image_urls];
    const target = Math.max(0, Math.min(image_urls.length - 1, index + delta));
    if (target === index) return current;
    [image_urls[index], image_urls[target]] = [image_urls[target], image_urls[index]];
    return { ...current, sections: { ...current.sections, gallery: { ...current.sections.gallery, image_urls } } };
  });
  return <form action={action} className="panel editor-form settings-form-v2" encType="multipart/form-data">
    <div className="form-section-heading"><span className="step-number">01</span><div><strong>Identidade da loja</strong><p>Como seus clientes reconhecem a sua marca.</p></div></div>
    <label className="field"><span>Nome da loja</span><input name="name" minLength={2} maxLength={80} required defaultValue={tenant.name} /></label>
    <div className="logo-upload-row">{tenant.logo_url ? <Image className="settings-logo" src={tenant.logo_url} alt="Logo atual" width={112} height={64} /> : <span className="settings-logo-fallback">{tenant.name.slice(0, 1)}</span>}<label className="field file-field"><span>Logo da loja</span><input name="logo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" /><small>PNG ou WebP com fundo transparente funciona bem · até 5 MB. Envio direto ao Supabase Storage.</small></label></div>
    <input type="hidden" name="logo_url" value={tenant.logo_url ?? ""} />

    <div className="form-section-heading section-separator"><span className="step-number">02</span><div><strong>Escolha um template</strong><p>O template define a identidade visual da vitrine e do checkout.</p></div></div>
    <div className="template-choice-grid">{templates.map((item) => <label className={`template-choice theme-${item.id} ${template === item.id ? "is-selected" : ""}`} key={item.id}><input type="radio" name="storefront_template" value={item.id} checked={template === item.id} onChange={() => setTemplate(item.id)} /><span className="template-swatch"><i /><i /><i /></span><strong>{item.name}</strong><small>{item.description}</small></label>)}</div>

    <div className="form-row settings-brand-colors"><label className="field"><span>Cor principal</span><input type="color" name="primary_color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} /><small>Botões, links e destaques.</small></label><label className="field"><span>Cor complementar</span><input type="color" name="secondary_color" value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} /><small>Fundos e detalhes.</small></label></div>
    <div className="form-row settings-design-grid">
      <label className="field"><span>Composição do banner</span><select value={config.design.banner_variant} onChange={(event) => updateDesign("banner_variant", event.target.value as StorefrontConfig["design"]["banner_variant"])}><option value="full-width">Imagem em tela cheia</option><option value="split">Texto e imagem lado a lado</option><option value="contained">Banner contido</option><option value="minimal">Banner minimalista</option></select></label>
      <label className="field"><span>Estilo dos {tenant.tenant_type === "food" ? "itens" : tenant.tenant_type === "services" ? "serviços" : "produtos"}</span><select value={config.design.card_variant} onChange={(event) => updateDesign("card_variant", event.target.value as StorefrontConfig["design"]["card_variant"])}><option value="image-top">Imagem superior</option><option value="compact-side">Compacto lateral</option><option value="editorial">Editorial</option><option value="minimal">Minimalista</option></select></label>
      <label className="field"><span>Estilo das categorias</span><select value={config.design.category_variant} onChange={(event) => updateDesign("category_variant", event.target.value as StorefrontConfig["design"]["category_variant"])}><option value="chips">Filtros em pílulas</option><option value="image-tiles">Blocos com imagens</option><option value="horizontal">Faixa horizontal</option><option value="compact">Lista compacta</option></select></label>
      <label className="field"><span>Alinhamento do menu</span><select value={config.design.header_variant} onChange={(event) => updateDesign("header_variant", event.target.value as StorefrontConfig["design"]["header_variant"])}><option value="standard">Marca à esquerda</option><option value="centered">Marca centralizada</option></select></label>
      <label className="field"><span>Estilo do rodapé</span><select value={config.design.footer_variant} onChange={(event) => updateDesign("footer_variant", event.target.value as StorefrontConfig["design"]["footer_variant"])}><option value="columns">Colunas completas</option><option value="compact">Compacto</option></select></label>
    </div>
    <label className="field"><span>Fonte da loja</span><select value={config.font_family} onChange={(event) => setConfig((current) => ({ ...current, font_family: event.target.value as StorefrontConfig["font_family"] }))}><option value="montserrat">Montserrat · geométrica e moderna</option><option value="inter">Inter · limpa e contemporânea</option><option value="roboto">Roboto · versátil e legível</option><option value="lora">Lora · serifada e editorial</option><option value="playfair">Playfair Display · serifada e elegante</option></select><small>A fonte também se aplica à vitrine e ao checkout.</small></label>
    <StorefrontPreviewFrame config={config} template={template} primaryColor={primaryColor} secondaryColor={secondaryColor} />

    <div className="form-section-heading section-separator"><span className="step-number">03</span><div><strong>Banner da loja</strong><p>Use uma imagem, uma composição em duas colunas ou um carrossel.</p></div></div>
    <label className="switch-field"><input type="checkbox" checked={config.hero.enabled} onChange={(event) => updateHero({ enabled: event.target.checked })} /><span className="switch-indicator" /><span><strong>Mostrar banner</strong><small>Você pode desativar esta seção quando quiser.</small></span></label>
    <div className="form-row"><label className="field"><span>Formato</span><select value={config.hero.mode} onChange={(event) => updateHero({ mode: event.target.value as StorefrontConfig["hero"]["mode"] })}><option value="static">Imagem estática</option><option value="split">Texto e imagem lado a lado</option><option value="carousel">Carrossel de imagens</option></select></label><label className="field"><span>Texto do botão</span><input value={config.hero.cta_label} maxLength={50} onChange={(event) => updateHero({ cta_label: event.target.value })} /></label></div>
    <label className="field"><span>Título do banner</span><input value={config.hero.title} maxLength={80} onChange={(event) => updateHero({ title: event.target.value })} /></label>
    <label className="field"><span>Texto do banner</span><textarea rows={3} maxLength={500} value={config.hero.description} onChange={(event) => updateHero({ description: event.target.value })} /></label>
    {config.hero.image_urls.length ? <div className="settings-image-list">{config.hero.image_urls.map((url, index) => <div key={`${url}-${index}`}><Image src={url} alt={`Imagem do banner ${index + 1}`} width={90} height={60} /><span>Imagem {index + 1}</span><button type="button" onClick={() => updateHero({ image_urls: config.hero.image_urls.filter((_, itemIndex) => itemIndex !== index) })}>Remover</button></div>)}</div> : null}
    <label className="field file-field"><span>{config.hero.mode === "carousel" ? "Fotos do carrossel" : "Imagem do banner"}</span><input name="banner_images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple /><small>{config.hero.mode === "carousel" ? "Envie até 8 imagens. A ordem de envio será a ordem do carrossel." : "Envie até 8 imagens; a primeira será usada como banner."} Cada imagem pode ter até 5 MB. Envio direto ao Supabase Storage.</small></label>

    <div className="form-section-heading section-separator"><span className="step-number">04</span><div><strong>Seções e filtros da vitrine</strong><p>Escolha o que aparece e em que ordem. Os filtros rápidos usam as categorias e a disponibilidade dos produtos.</p></div></div>
    <div className="settings-navigation-options"><label className="switch-field"><input type="checkbox" checked={config.navigation.show_home_link} onChange={(event) => updateNavigation({ show_home_link: event.target.checked })} /><span className="switch-indicator" /><span><strong>Link Início</strong></span></label><label className="switch-field"><input type="checkbox" checked={config.navigation.show_category_links} onChange={(event) => updateNavigation({ show_category_links: event.target.checked })} /><span className="switch-indicator" /><span><strong>Link Categorias na navegação</strong></span></label><label className="switch-field"><input type="checkbox" checked={config.navigation.show_category_filters} onChange={(event) => updateNavigation({ show_category_filters: event.target.checked })} /><span className="switch-indicator" /><span><strong>Filtro rápido por categoria</strong></span></label><label className="switch-field"><input type="checkbox" checked={config.navigation.show_featured_link} onChange={(event) => updateNavigation({ show_featured_link: event.target.checked })} /><span className="switch-indicator" /><span><strong>Link Produtos em destaque</strong></span></label><label className="switch-field"><input type="checkbox" checked={config.navigation.show_about_link} onChange={(event) => updateNavigation({ show_about_link: event.target.checked })} /><span className="switch-indicator" /><span><strong>Link Sobre</strong></span></label><label className="switch-field"><input type="checkbox" checked={config.navigation.show_contact_link} onChange={(event) => updateNavigation({ show_contact_link: event.target.checked })} /><span className="switch-indicator" /><span><strong>Link Contato</strong></span></label><label className="switch-field"><input type="checkbox" checked={config.navigation.show_whatsapp_cta} onChange={(event) => updateNavigation({ show_whatsapp_cta: event.target.checked })} /><span className="switch-indicator" /><span><strong>Botão de atendimento</strong></span></label></div>
    <div className="settings-section-list">{visibleSectionOrder.map((key, index) => {
      const section = config.sections[key];
      return <div className="settings-section-row" key={key}><span className="settings-order">{String(index + 1).padStart(2, "0")}</span><div className="settings-section-main"><strong>{sectionNames[key]}</strong><label className="settings-section-title"><span>Título</span><input value={section.title} maxLength={80} onChange={(event) => updateSection(key, { title: event.target.value } as never)} /></label></div><label className="settings-visible"><input type="checkbox" checked={section.enabled} onChange={(event) => updateSection(key, { enabled: event.target.checked } as never)} /> Exibir</label><div className="settings-order-actions"><button type="button" disabled={index === 0} onClick={() => moveSection(key, -1)} aria-label={`Mover ${sectionNames[key]} para cima`}>↑</button><button type="button" disabled={index === visibleSectionOrder.length - 1} onClick={() => moveSection(key, 1)} aria-label={`Mover ${sectionNames[key]} para baixo`}>↓</button></div></div>;
    })}</div>
    {tenant.tenant_type === "services" ? <>
      <div className="form-section-heading"><div><strong>Fotos da galeria</strong><p>Mostre o espaço, a equipe ou trabalhos da empresa. A ordem abaixo será usada na vitrine.</p></div></div>
      {config.sections.gallery.image_urls.length ? <div className="settings-image-list">{config.sections.gallery.image_urls.map((url, index) => <div key={`${url}-${index}`}>
        <Image src={url} alt={`Foto da galeria ${index + 1}`} width={96} height={68} />
        <span>Foto {index + 1}</span>
        <div className="settings-order-actions">
          <button type="button" disabled={index === 0} onClick={() => moveGalleryImage(index, -1)} aria-label={`Mover foto ${index + 1} para cima`}>↑</button>
          <button type="button" disabled={index === config.sections.gallery.image_urls.length - 1} onClick={() => moveGalleryImage(index, 1)} aria-label={`Mover foto ${index + 1} para baixo`}>↓</button>
          <button type="button" onClick={() => updateSection("gallery", { image_urls: config.sections.gallery.image_urls.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`Remover foto ${index + 1}`}>×</button>
        </div>
      </div>)}</div> : <p className="settings-gallery-empty">Nenhuma foto adicionada ainda.</p>}
      <label className="field file-field"><span>Adicionar fotos</span><input name="gallery_images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={config.sections.gallery.image_urls.length >= 8} /><small>JPG, PNG, WebP ou AVIF · até 5 MB por foto · até 8 no total. Você pode selecionar vários arquivos; eles entram na ordem escolhida.</small></label>
    </> : null}
    <div className="form-row"><label className="field"><span>Produtos por linha</span><select value={config.sections.catalog.columns} onChange={(event) => updateSection("catalog", { columns: Number(event.target.value) as 2 | 3 | 4 | 5 })}><option value={2}>2 produtos</option><option value={3}>3 produtos</option><option value={4}>4 produtos</option><option value={5}>5 produtos</option></select></label><label className="field"><span>Layout dos destaques</span><select value={config.sections.featured.layout} onChange={(event) => updateSection("featured", { layout: event.target.value as "cards" | "banners" })}><option value="cards">Cards de produto</option><option value="banners">Mini banners</option></select></label></div>
    <label className="field"><span>Texto simples da seção “Sobre a loja”</span><textarea rows={4} maxLength={3000} value={config.sections.about.text} onChange={(event) => updateSection("about", { text: event.target.value })} placeholder="Usado quando a descrição formatada estiver vazia." /></label>
    <RichTextEditor label="Descrição formatada da loja" value={config.sections.about.rich_text} onChange={(rich_text) => updateSection("about", { rich_text })} maxCharacters={tenant.tenant_type === "food" ? 4_000 : 10_000} verticalHint={tenant.tenant_type === "food" ? "Conte sobre o cardápio, ingredientes e opções alimentares." : tenant.tenant_type === "services" ? "Apresente a equipe, os serviços e a forma de atendimento." : "Conte sobre a loja, suas marcas e diferenciais."} />
    {config.sections.about.image_url ? <div className="settings-image-list"><div><Image src={config.sections.about.image_url} alt="Imagem da seção sobre" width={90} height={60} /><span>Imagem atual</span><button type="button" onClick={() => updateSection("about", { image_url: null })}>Remover</button></div></div> : null}
    <label className="field file-field"><span>Imagem da seção sobre</span><input name="about_image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" /><small>Opcional · JPG, PNG, WebP ou AVIF · até 5 MB. Envio direto ao Supabase Storage.</small></label>

    <div className="form-section-heading section-separator"><span className="step-number">05</span><div><strong>Rodapé completo</strong><p>Dados da empresa, redes sociais e canais de atendimento.</p></div></div>
    <label className="switch-field"><input type="checkbox" checked={config.footer.enabled} onChange={(event) => updateFooter({ enabled: event.target.checked })} /><span className="switch-indicator" /><span><strong>Mostrar rodapé</strong><small>Exibe os dados definidos abaixo.</small></span></label>
    <div className="form-row"><label className="switch-field"><input type="checkbox" checked={config.footer.show_logo} onChange={(event) => updateFooter({ show_logo: event.target.checked })} /><span className="switch-indicator" /><span><strong>Mostrar logo</strong></span></label><label className="switch-field"><input type="checkbox" checked={config.footer.show_categories} onChange={(event) => updateFooter({ show_categories: event.target.checked })} /><span className="switch-indicator" /><span><strong>Mostrar categorias</strong></span></label></div>
    <label className="switch-field"><input type="checkbox" checked={config.footer.show_contact} onChange={(event) => updateFooter({ show_contact: event.target.checked })} /><span className="switch-indicator" /><span><strong>Mostrar dados de atendimento</strong></span></label>
    <div className="form-row"><label className="field"><span>CNPJ</span><CnpjField name="footer_cnpj" defaultValue={config.footer.cnpj} onValueChange={(cnpj) => updateFooter({ cnpj })} /></label><label className="field"><span>Horário de atendimento</span><input value={config.footer.hours} maxLength={120} onChange={(event) => updateFooter({ hours: event.target.value })} placeholder="Seg a sex, 9h às 18h" /></label></div>
    <div className="form-row"><label className="field"><span>E-mail de atendimento</span><input type="email" value={config.footer.email} maxLength={254} onChange={(event) => updateFooter({ email: event.target.value })} placeholder="atendimento@sualoja.com.br" /></label><label className="field"><span>Endereço</span><input value={config.footer.address} maxLength={300} onChange={(event) => updateFooter({ address: event.target.value })} placeholder="Rua, número, bairro, cidade e estado" /></label></div>
    <div className="form-row"><label className="field"><span>Instagram</span><input type="url" value={config.footer.instagram} onChange={(event) => updateFooter({ instagram: event.target.value })} placeholder="https://instagram.com/sualoja" /></label><label className="field"><span>Facebook</span><input type="url" value={config.footer.facebook} onChange={(event) => updateFooter({ facebook: event.target.value })} placeholder="https://facebook.com/sualoja" /></label></div>
    <div className="form-row"><label className="field"><span>TikTok</span><input type="url" value={config.footer.tiktok} onChange={(event) => updateFooter({ tiktok: event.target.value })} placeholder="https://tiktok.com/@sualoja" /></label><label className="field"><span>YouTube</span><input type="url" value={config.footer.youtube} onChange={(event) => updateFooter({ youtube: event.target.value })} placeholder="https://youtube.com/@sualoja" /></label></div>
    <label className="switch-field"><input type="checkbox" checked={config.footer.show_platform_credit} onChange={(event) => updateFooter({ show_platform_credit: event.target.checked })} /><span className="switch-indicator" /><span><strong>Mostrar “Desenvolvido por VOID Startup”</strong></span></label>

    <div className="form-section-heading section-separator"><span className="step-number">06</span><div><strong>WhatsApp e domínio</strong><p>O cliente finaliza a conversa pelo WhatsApp da loja.</p></div></div>
    <label className="field"><span>Número do WhatsApp</span><WhatsAppField defaultValue={tenant.whatsapp_number ?? ""} /><small>Digite o DDD e número. O código +55 é incluído automaticamente.</small></label>
    <div className="domain-setting"><div className="domain-setting-icon">⌁</div><div><strong>{tenant.domain ?? `/${tenant.slug}`}</strong><small>{tenant.domain ? "Domínio conectado. Aponte DNS para a Vercel para receber visitas." : "Endereço de prévia. O administrador da plataforma poderá conectar seu domínio."}</small></div><span className={tenant.domain ? "status-pill status-active" : "status-pill status-draft"}>{tenant.domain ? "Configurado" : "Prévia"}</span></div>
    <input type="hidden" name="storefront_config" value={JSON.stringify(config)} />
    {uploadStatus ? <p className="form-footnote" role="status">{uploadStatus}</p> : null}
    <ActionMessage state={state} />
    <div className="form-actions"><button className="button button-dark" type="submit" disabled={pending}>{pending ? uploadStatus || "Salvando…" : "Salvar configurações"}<span>↗</span></button></div>
  </form>;
}
