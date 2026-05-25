import { motion } from "framer-motion";
import { cn } from "../lib/utils";

const ASSET_BASE = "/assets/guto/v3";

const VARIANT_MAP = {
  avatar: "guto-avatar-v3",
  icon: "guto-icon-v3",
  logo: "guto-logo-v3",
  celebrando: "guto-celebrando-v3",
};

const FALLBACK_EMOJI = {
  avatar: "👤",
  icon: "💬",
  logo: "👤",
  celebrando: "🎉",
};

export default function GutoAvatar({
  variant = "avatar",
  size = 48,
  animate = true,
  className,
  style,
}) {
  const isCircular = variant === "avatar";
  const assetName = VARIANT_MAP[variant] || VARIANT_MAP.avatar;
  const webpSrc = `${ASSET_BASE}/${assetName}.webp`;
  const pngSrc = `${ASSET_BASE}/${assetName}.png`;

  const img = (
    <img
      src={webpSrc}
      alt="GUTO mascote"
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

  const wrapperStyle = {
    flexShrink: 0,
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
      whileHover={{ scale: 1.08 }}
      transition={{ duration: 0.2 }}
    >
      {inner}
    </motion.div>
  );
}
