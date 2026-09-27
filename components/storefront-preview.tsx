"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import type { PublicStorefront, StorefrontConfig, StorefrontTemplate } from "@/lib/database.types";
import { Storefront } from "@/components/storefront";
import { storefrontConfigSchema } from "@/lib/storefront-config";

const templateSchema = z.enum(["technology", "nature", "sports", "essentials"]);
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const previewConfigSchema = z.object({
  type: z.literal("void:storefront-preview"),
  config: z.unknown(),
  template: templateSchema,
  primaryColor: colorSchema,
  secondaryColor: colorSchema,
});

function readPreviewDraft(value: unknown): { config: StorefrontConfig; template: StorefrontTemplate; primaryColor: string; secondaryColor: string } | null {
  const message = previewConfigSchema.safeParse(value);
  if (!message.success) return null;
  // The full config is parsed by the canonical normalizer before it can reach the view.
  const config = storefrontConfigSchema.safeParse(message.data.config);
  if (!config.success) return null;
  return {
    config: config.data,
    template: message.data.template,
    primaryColor: message.data.primaryColor,
    secondaryColor: message.data.secondaryColor,
  };
}

export function StorefrontPreviewCanvas({ initialStore }: { initialStore: PublicStorefront }) {
  const [draft, setDraft] = useState(() => ({
    config: initialStore.storefront_config,
    template: initialStore.storefront_template,
    primaryColor: initialStore.primary_color,
    secondaryColor: initialStore.secondary_color,
  }));

  useEffect(() => {
    function receiveDraft(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const next = readPreviewDraft(event.data);
      if (!next) return;
      setDraft(next);
    }
    window.addEventListener("message", receiveDraft);
    return () => window.removeEventListener("message", receiveDraft);
  }, []);

  const store: PublicStorefront = {
    ...initialStore,
    storefront_config: draft.config,
    storefront_template: draft.template,
    primary_color: draft.primaryColor,
    secondary_color: draft.secondaryColor,
  };

  return <div className="sf-preview-canvas">
    <Storefront store={store} preview basePath="/" filters={{ page: 1, categoryId: null, availability: null, totalPages: 1 }} />
  </div>;
}

export function StorefrontPreviewFrame({ config, template, primaryColor, secondaryColor }: {
  config: StorefrontConfig;
  template: StorefrontTemplate;
  primaryColor: string;
  secondaryColor: string;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    if (!loaded) return;
    frameRef.current?.contentWindow?.postMessage({
      type: "void:storefront-preview",
      config,
      template,
      primaryColor,
      secondaryColor,
    }, window.location.origin);
  }, [config, template, primaryColor, secondaryColor, loaded]);

  return <section className="storefront-preview-panel" aria-label="Prévia da loja">
    <div className="storefront-preview-toolbar">
      <div><strong>Prévia da vitrine</strong><span>Mostra as alterações ainda não salvas.</span></div>
      <div className="preview-device-switch" role="group" aria-label="Tamanho da prévia">
        <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>Desktop</button>
        <button type="button" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>Celular</button>
      </div>
    </div>
    <div className="storefront-preview-viewport">
      <iframe
        ref={frameRef}
        title="Prévia ao vivo da loja"
        src="/store-preview"
        onLoad={() => setLoaded(true)}
        className={device === "mobile" ? "is-mobile-preview" : "is-desktop-preview"}
        style={{ width: device === "mobile" ? "min(390px, 100%)" : "100%" }}
      />
    </div>
  </section>;
}
