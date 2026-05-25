import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../lib/utils";

const ASSET_BASE = "/assets/guto/v3";
const CUSTOM_BASE = "/assets/guto/v4/custom";

const VARIANT_MAP = {
  avatar: "guto-avatar-v3",
  icon: "guto-icon-v3",
  logo: "guto-logo-v3",
  celebrando: "guto-celebrando-v3",
};

const ALT_DEFAULT = {
  avatar: "Mascote GUTO do DESAFIOGUT",
  icon: "Ícone do GUTO",
  logo: "GUTO — Logótipo do DESAFIOGUT",
  celebrando: "GUTO celebrando",
  expressao: "GUTO — Expressão do mascote",
  custom: "GUTO — peça personalizada para este local",
};

const FALLBACK_EMOJI = {
  avatar: "👤",
  icon: "💬",
  logo: "👤",
  celebrando: "🎉",
  expressao: "👤",
  custom: "👤",
};

export default function GutoAvatar({
  variant = "avatar",
  custom: customAsset,
  size = 48,
  animate = true,
  alt,
  expression,
  className,
  style,
}) {
  const prefersReduced = useReducedMotion();
  const hasCustom = Boolean(customAsset);
  const effectiveVariant = hasCustom ? "custom" : variant;
  const isCircular = effectiveVariant === "avatar" || effectiveVariant === "expressao" || hasCustom;
  const isExpressao = variant === "expressao";
  const expr = expression ?? "neutro";

  const assetName = isExpressao
    ? `expressoes/guto-${expr}`
    : VARIANT_MAP[variant] || VARIANT_MAP.avatar;
  const v3Webp = `${ASSET_BASE}/${assetName}.webp`;
  const v3Png = `${ASSET_BASE}/${assetName}.png`;

  const customWebp = hasCustom ? `${CUSTOM_BASE}/${customAsset}.webp` : null;
  const customPng = hasCustom ? `${CUSTOM_BASE}/${customAsset}.png` : null;

  const webpSrc = hasCustom ? customWebp : v3Webp;
  const pngSrc = hasCustom ? customPng : v3Png;

  const altText = alt ?? ALT_DEFAULT[effectiveVariant] ?? "GUTO mascote";
  const emoji = FALLBACK_EMOJI[effectiveVariant] ?? "👤";

  const img = (
    <img
      src={webpSrc}
      alt={altText}
      width={size}
      height={size}
      style={{ width: size, height: size, display: "block" }}
      onError={(e) => {
        const current = e.target.src;
        // Level 0: custom.webp → custom.png
        if (hasCustom && current === customWebp) {
          e.target.src = customPng;
          return;
        }
        // Level 1: custom.png → v3.webp
        if (hasCustom && current === customPng) {
          e.target.src = v3Webp;
          return;
        }
        // Level 2: v3.webp → v3.png
        if (current.endsWith(".webp")) {
          e.target.src = v3Png;
          return;
        }
        // Level 3: any .png failed → emoji fallback
        e.target.style.display = "none";
        if (e.target.nextSibling) {
          e.target.nextSibling.style.display = "flex";
        }
      }}
    />
  );

  const fallback = (
    <span
      style={{
        display: "none",
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.6,
      }}
      aria-hidden
    >
      {emoji}
    </span>
  );

  const inner = (
    <div style={{ position: "relative", width: size, height: size }}>
      {img}
      {fallback}
    </div>
  );

  const aspectRatio = variant === "logo" ? "2 / 1" : "1 / 1";

  const wrapperStyle = {
    flexShrink: 0,
    width: variant === "logo" ? size * 2 : size,
    height: size,
    aspectRatio,
    ...(isCircular
      ? {
          borderRadius: "50%",
          overflow: "hidden",
          border: "2px solid rgba(0,212,170,0.35)",
          boxShadow: "0 0 12px rgba(0,212,170,0.18)",
        }
      : {}),
    ...style,
  };

  if (!animate) {
    return (
      <div className={cn(className)} style={wrapperStyle}>
        {inner}
      </div>
    );
  }

  return (
    <motion.div
      className={cn(className)}
      style={wrapperStyle}
      whileHover={prefersReduced ? { opacity: 0.85 } : { scale: 1.08 }}
      transition={{ duration: 0.2 }}
    >
      {inner}
    </motion.div>
  );
}
