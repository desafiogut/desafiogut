import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../lib/utils";

const ASSET_BASE = "/assets/guto/v3";

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
};

const FALLBACK_EMOJI = {
  avatar: "👤",
  icon: "💬",
  logo: "👤",
  celebrando: "🎉",
  expressao: "👤",
};

export default function GutoAvatar({
  variant = "avatar",
  size = 48,
  animate = true,
  alt,
  expression,
  className,
  style,
}) {
  const prefersReduced = useReducedMotion();
  const isCircular = variant === "avatar" || variant === "expressao";
  const isExpressao = variant === "expressao";
  const expr = expression ?? "neutro";

  const assetName = isExpressao
    ? `expressoes/guto-${expr}`
    : VARIANT_MAP[variant] || VARIANT_MAP.avatar;
  const webpSrc = `${ASSET_BASE}/${assetName}.webp`;
  const pngSrc = `${ASSET_BASE}/${assetName}.png`;
  const altText = alt ?? ALT_DEFAULT[variant] ?? "GUTO mascote";

  const img = (
    <img
      src={webpSrc}
      alt={altText}
      width={size}
      height={size}
      style={{ width: size, height: size, display: "block" }}
      onError={(e) => {
        if (e.target.src.endsWith(".webp")) {
          e.target.src = pngSrc;
        } else {
          e.target.style.display = "none";
          if (e.target.nextSibling) {
            e.target.nextSibling.style.display = "flex";
          }
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
      {FALLBACK_EMOJI[variant]}
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
