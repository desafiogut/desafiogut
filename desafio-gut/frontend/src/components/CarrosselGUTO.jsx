// MC58.1/58.3 — CarrosselGUTO: o GUTO animado a flutuar no Glass do Dashboard.
//
// MC58.3 — carrossel COMPLETO (imagens 1–8, padrão B oficial). Cada slide é um WebM
// VP9 com canal ALFA real (yuva420p / ALPHA_MODE=1, 512², paridade com o idle.webm do
// sprite), gerado por remoção do fundo branco frame-a-frame (flood-fill de bordas +
// downscale premultiplicado, sem furar a camisa/olhos do GUTO nem deixar halo branco).
//
// Transição = CROSSFADE lido pela DURAÇÃO REAL de cada vídeo (5s ou 10s): quando o vídeo
// ativo atinge o seu ponto médio, o próximo arranca do 1º frame (pose neutra do boomerang)
// e cruza-se a opacidade em CROSSFADE_MS. No máximo 2 <video> montados (ativo + próximo)
// — nunca os 8 (memória/decode). Lição react-performance / plano MC58.2.
//
// LIÇÃO MC39.9 (ver GutoSpritePlayer.jsx): <video> SIMPLES — SEM canvas, SEM
// mix-blend-mode, SEM filter CSS no próprio vídeo (interagem mal com o backdrop-filter
// :blur do glass). O drop-shadow fica no WRAPPER, nunca no <video>. useReducedMotion()
// → sem crossfade, 1 frame estático. Fallback poster PNG (alfa) se o vídeo falhar (Safari).
//
// MC88.36 — nada é montado antes da primeira pintura. O carrossel renderiza dois
// slides (ativo + próximo) com `preload="auto"`, o que o MC88.35 mediu como
// guto-1.webm (1,16 MB) + guto-2.webm (614 KB) + os dois posters PNG (421 KB)
// pedidos entre 1912 e 1916 ms — tudo ANTES do ecrã pintar aos 2114 ms.
// A caixa tem `size` fixo, portanto o adiamento não desloca layout (anti-CLS).
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import useAposPrimeiraPintura from "../hooks/useAposPrimeiraPintura.js";

const V = "mc58"; // cache-bust dos assets imutáveis (?v=)
const N = 8;
const SLIDES = Array.from({ length: N }, (_, i) => ({
  webm: `/assets/guto/carrossel/guto-${i + 1}.webm?v=${V}`,
  poster: `/assets/guto/carrossel/guto-${i + 1}.png?v=${V}`,
}));

const CROSSFADE_MS = 1000;
const CROSSFADE_AT = 0.5; // fração da duração onde o crossfade dispara (ponto médio — MC58.2)

function CarrosselGUTO({ size = 176, slides = SLIDES }) {
  const reduce = useReducedMotion();
  // MC88.36 — chamado aqui, antes de qualquer return antecipado, para que a
  // ordem dos hooks seja sempre a mesma (regra dos hooks).
  const pronto = useAposPrimeiraPintura();
  const n = slides.length;
  const [cur, setCur] = useState(0);
  const [nxt, setNxt] = useState(n > 1 ? 1 : 0);
  const [fading, setFading] = useState(false);
  const [failed, setFailed] = useState(false);

  const videoRefs = useRef({}); // slideIdx -> <video>
  const fadeTimer = useRef(null);
  const setVideoRef = (idx) => (el) => {
    if (el) videoRefs.current[idx] = el;
  };

  // Garante que o vídeo ATIVO está a tocar (o próximo fica pausado no 1º frame).
  useEffect(() => {
    if (reduce) return;
    const v = videoRefs.current[cur];
    if (v) {
      try {
        v.play();
      } catch {
        /* noop */
      }
    }
  }, [cur, reduce]);

  useEffect(() => () => clearTimeout(fadeTimer.current), []);

  // Dispara o crossfade quando o vídeo ativo passa o seu ponto médio (duração real).
  const handleTimeUpdate = useCallback(() => {
    if (reduce || fading || n <= 1) return;
    const v = videoRefs.current[cur];
    if (!v || !v.duration || !Number.isFinite(v.duration)) return;
    if (v.currentTime >= v.duration * CROSSFADE_AT) {
      // arranca o próximo do início (pose neutra do boomerang) e cruza a opacidade
      const nv = videoRefs.current[nxt];
      if (nv) {
        try {
          nv.currentTime = 0;
          nv.play();
        } catch {
          /* noop */
        }
      }
      setFading(true);
      fadeTimer.current = setTimeout(() => {
        setCur(nxt);
        setNxt((nxt + 1) % n);
        setFading(false);
      }, CROSSFADE_MS);
    }
  }, [reduce, fading, n, cur, nxt]);

  const boxStyle = {
    position: "relative",
    width: size,
    height: size,
    flexShrink: 0,
    // drop-shadow no WRAPPER (não no vídeo) — MC39.9.
    filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.35))",
  };
  const layerStyle = (opacity) => ({
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
    opacity,
    transition: `opacity ${CROSSFADE_MS}ms linear`,
  });

  // MC88.36 — antes da primeira janela ociosa mostra-se APENAS o poster do slide
  // atual; os <video> só montam depois.
  //
  // ⚠️ A primeira versão deste MC não montava nada aqui, e isso foi um ERRO
  // MEDIDO: o observador de LCP mostrou que o elemento LCP desta app É o vídeo
  // do carrossel (`guto-1.webm`). Sem nada no lugar, o LCP saltou para 2300–5716 ms
  // — ou seja, a otimização melhorava a pintura e piorava o LCP, que é
  // precisamente o que o MC proíbe.
  //
  // Com o poster (228 KB) a entrar de imediato, existe um candidato a LCP cedo,
  // e continuam a sair do arranque os dois .webm (1,16 MB + 614 KB) e o poster
  // do slide seguinte.
  if (!pronto) {
    return (
      <div aria-hidden="true" style={boxStyle}>
        <img src={slides[cur].poster} alt="" style={{ ...layerStyle(1), transition: "none" }} />
      </div>
    );
  }

  // Fallback total (Safari sem VP9-alfa / erro) → poster estático da imagem atual.
  if (failed) {
    return (
      <div aria-hidden="true" style={boxStyle}>
        <img src={slides[cur].poster} alt="" style={{ ...layerStyle(1), transition: "none" }} />
      </div>
    );
  }

  // Reduced-motion → 1 frame estático (sem crossfade, sem ciclo).
  if (reduce) {
    return (
      <div aria-hidden="true" style={boxStyle}>
        <img src={slides[cur].poster} alt="" style={{ ...layerStyle(1), transition: "none" }} />
      </div>
    );
  }

  // Renderiza APENAS 2 vídeos (ativo + próximo), com chave = índice do slide para que o
  // elemento do "próximo" persista ao tornar-se "ativo" (sem remontar → sem flash preto).
  const layers = n > 1 ? [cur, nxt] : [cur];
  return (
    <div aria-hidden="true" style={boxStyle}>
      {layers.map((idx) => {
        const isCur = idx === cur;
        const opacity = fading ? (isCur ? 0 : 1) : isCur ? 1 : 0;
        return (
          <video
            key={idx}
            ref={setVideoRef(idx)}
            src={slides[idx].webm}
            poster={slides[idx].poster}
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            onError={() => setFailed(true)}
            onTimeUpdate={isCur ? handleTimeUpdate : undefined}
            style={layerStyle(opacity)}
          />
        );
      })}
    </div>
  );
}

// React.memo — o carrossel só depende de `size`/`slides` (estáveis); evita re-render
// quando o Dashboard re-renderiza (saldo/lances) e não perturba a máquina de crossfade.
export default memo(CarrosselGUTO);
