"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type FoodStoreQRProps = {
  url: string | null;
  slug: string;
  initialError: string | null;
};

type GeneratedQR = {
  url: string;
  dataUrl: string | null;
  error: string | null;
};

export function FoodStoreQR({ url, slug, initialError }: FoodStoreQRProps) {
  const [generatedQR, setGeneratedQR] = useState<GeneratedQR | null>(null);
  const [copyResult, setCopyResult] = useState<{ url: string; message: string } | null>(null);
  const currentQR = url && generatedQR?.url === url ? generatedQR : null;
  const qrDataUrl = currentQR?.dataUrl ?? null;
  const generationError = url ? currentQR?.error ?? null : initialError;
  const isGenerating = Boolean(url && !currentQR);
  const copyStatus = url && copyResult?.url === url ? copyResult.message : "";

  useEffect(() => {
    let active = true;

    if (!url) {
      return () => {
        active = false;
      };
    }

    void (async () => {
      try {
        const { generateStoreQrDataUrl } = await import("@/lib/qr-code");
        const dataUrl = await generateStoreQrDataUrl(url);
        if (!active) return;
        setGeneratedQR({ url, dataUrl, error: null });
      } catch {
        if (!active) return;
        setGeneratedQR({
          url,
          dataUrl: null,
          error: "Não foi possível gerar o QR code. Atualize a página e tente novamente.",
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [initialError, url]);

  async function copyStoreUrl() {
    if (!url) return;

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard indisponível");
      await navigator.clipboard.writeText(url);
      setCopyResult({ url, message: "Link da loja copiado." });
    } catch {
      setCopyResult({
        url,
        message:
          "Não foi possível copiar automaticamente. Selecione e copie o endereço acima.",
      });
    }
  }

  return (
    <section className="food-qr-panel" aria-labelledby="food-qr-title">
      <div className="food-qr-preview" aria-busy={isGenerating}>
        {qrDataUrl ? (
          <Image
            className="food-qr-image"
            src={qrDataUrl}
            alt={`Código QR que abre a loja pública ${slug}`}
            width={320}
            height={320}
            unoptimized
          />
        ) : (
          <p className="food-qr-placeholder">
            {isGenerating ? "Gerando o QR code…" : "QR code indisponível."}
          </p>
        )}
      </div>

      <div className="food-qr-copy">
        <span className="eyebrow eyebrow-dark">DIVULGAÇÃO DA LOJA</span>
        <h2 id="food-qr-title">QR code da sua loja</h2>
        <p>
          Imprima este código ou compartilhe o link. Ao escanear, seus clientes
          abrem a loja pública.
        </p>

        {url ? (
          <a className="food-qr-url" href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
        ) : (
          <p className="food-qr-error" role="alert">
            {initialError ??
              "Não foi possível montar o endereço público. Confira o domínio e o identificador da loja nas configurações."}
          </p>
        )}

        <p className="food-qr-instructions">
          Dica: coloque o QR code no balcão, nas embalagens ou nas redes sociais.
        </p>

        <div className="food-qr-actions">
          <button
            className="button button-outline"
            type="button"
            onClick={copyStoreUrl}
            disabled={!url}
          >
            Copiar link
          </button>
          {qrDataUrl ? (
            <a
              className="button button-dark"
              href={qrDataUrl}
              download={`${slug}-qr-code.png`}
            >
              Baixar PNG
            </a>
          ) : null}
        </div>

        <p className="food-qr-status" role="status" aria-live="polite">
          {copyStatus ||
            (isGenerating ? "Gerando o QR code…" : qrDataUrl ? "QR code pronto para baixar." : "")}
        </p>
        {url && generationError ? (
          <p className="food-qr-error" role="alert">
            {generationError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
