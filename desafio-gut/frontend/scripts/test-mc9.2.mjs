// scripts/test-mc9.2.mjs — Validação MC9.2: Pipeline LLM do Chatbot
// Executar: node scripts/test-mc9.2.mjs
// Testa 8 checks para garantir que o chatbot responde com LLM.

const BASE = "https://silly-stardust-ca71bc.netlify.app/.netlify/functions/chatbot";

let pass = 0;
let fail = 0;

function check(nome, cond) {
  if (cond) { console.log(`  ✅ CHECK ${pass + fail + 1}: ${nome}`); pass++; }
  else      { console.log(`  ❌ CHECK ${pass + fail + 1}: ${nome}`); fail++; }
}

async function main() {
  console.log("=== MC9.2 — Validação Pipeline LLM Chatbot ===\n");

  // CHECK 1: chatbot.mjs lê LLM_API_KEY
  {
    const fs = await import("fs");
    const src = fs.readFileSync("netlify/functions/chatbot.mjs", "utf8");
    check("chatbot.mjs lê LLM_API_KEY (process.env.LLM_API_KEY)", src.includes("LLM_API_KEY"));
  }

  // CHECK 2: chatbot.mjs tenta LLM antes de template
  {
    const fs = await import("fs");
    const src = fs.readFileSync("netlify/functions/chatbot.mjs", "utf8");
    const tentaLLM = src.includes("chamarLLM") && src.includes('modoResposta = "template"');
    check("chatbot.mjs tenta LLM antes de fallback template", tentaLLM);
  }

  // CHECK 3: Pipeline responde com modoResposta: "llm" (via curl)
  try {
    const resp = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta: "O que é o DesafioGUT?" }),
    });
    const data = await resp.json();
    check("modoResposta === 'llm' no payload",
      data.modoResposta === "llm" && typeof data.resposta === "string" && data.resposta.length > 50);
  } catch (err) {
    check("modoResposta === 'llm' (curl)", false);
  }

  // CHECK 4: Índice RAG acessível (rag:meta com chunks)
  try {
    const resp = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta: "DesafioGUT" }),
    });
    const data = await resp.json();
    check("Índice RAG acessível (fontes > 0)", Array.isArray(data.fontes) && data.fontes.length > 0);
  } catch (err) {
    check("Índice RAG acessível", false);
  }

  // CHECK 5: Resposta contém termos do regulamento (via curl)
  try {
    const resp = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta: "Quanto custa cada lance?" }),
    });
    const data = await resp.json();
    const regex = /(lance|R\$|senha|menor|único|leilão|DesafioGUT)/i;
    check("Resposta contém termos do regulamento (regex)",
      regex.test(data.resposta) && !data.resposta.includes("configure LLM_API_KEY"));
  } catch (err) {
    check("Resposta contém termos do regulamento", false);
  }

  // CHECK 6: Resposta NÃO é fallback template
  try {
    const resp = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta: "Qual o valor mínimo do lance?" }),
    });
    const data = await resp.json();
    const ehTemplate = data.resposta.includes("configure LLM_API_KEY no Netlify")
      || data.resposta.startsWith("Não encontrei informação sobre essa pergunta");
    check("Resposta NÃO é fallback template", !ehTemplate);
  } catch (err) {
    check("Resposta NÃO é fallback template", false);
  }

  // CHECK 7: Resposta não é genérica "Não tenho essa informação" pura
  try {
    const resp = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta: "Como funciona o leilão?" }),
    });
    const data = await resp.json();
    const soGenerica = data.resposta.trim().startsWith("Não tenho essa informação")
      && data.resposta.length < 100;
    check("Resposta não é genérica 'Não tenho essa informação' pura", !soGenerica);
  } catch (err) {
    check("Resposta não é genérica", false);
  }

  // CHECK 8: modoBusca registrado (semântica ou textual)
  try {
    const resp = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta: "O que são cotas?" }),
    });
    const data = await resp.json();
    check("modoBusca presente no payload",
      data.modoBusca === "semantica" || data.modoBusca === "textual" || data.modoBusca?.includes("fallback"));
  } catch (err) {
    check("modoBusca presente", false);
  }

  console.log(`\n=== Resultado: ${pass}/${pass + fail} checks passaram ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Erro fatal:", err.message);
  process.exit(1);
});
