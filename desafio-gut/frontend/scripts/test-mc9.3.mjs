// scripts/test-mc9.3.mjs — Validação MC9.3: Persona GUTO mascote + tabela planos
// Executar: node scripts/test-mc9.3.mjs

const BASE = "https://silly-stardust-ca71bc.netlify.app/.netlify/functions/chatbot";

let pass = 0;
let fail = 0;

function check(nome, cond) {
  if (cond) { console.log(`  ✅ CHECK ${pass + fail + 1}: ${nome}`); pass++; }
  else      { console.log(`  ❌ CHECK ${pass + fail + 1}: ${nome}`); fail++; }
}

async function ask(pergunta) {
  const resp = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pergunta }),
  });
  return resp.json();
}

async function main() {
  console.log("=== MC9.3 — Validação Persona GUTO Mascote ===\n");

  // CHECK 1: System prompt contém "GUTO" e "mascote"
  {
    const fs = await import("fs");
    const src = fs.readFileSync("netlify/functions/chatbot.mjs", "utf8");
    check("System prompt contém 'GUTO' e 'mascote'",
      src.includes("GUTO") && src.includes("mascote"));
  }

  // CHECK 2: Tabela de planos no regulamento
  {
    const fs = await import("fs");
    const reg = fs.readFileSync("../../docs/chatbot/regulamento.md", "utf8");
    const temBronze = reg.includes("R$ 2.640") || reg.includes("R$ 2.640,00");
    const temPrata  = reg.includes("R$ 5.600") || reg.includes("R$ 5.600,00");
    const temOuro   = reg.includes("R$ 11.000") || reg.includes("R$ 11.000,00");
    const temDiamante = reg.includes("R$ 18.000") || reg.includes("R$ 18.000,00");
    check("Tabela de planos no regulamento (Bronze/Prata/Ouro/Diamante)",
      temBronze && temPrata && temOuro && temDiamante);
  }

  // CHECK 3: Índice RAG com chunks
  {
    const data = await ask("O que é o DesafioGUT?");
    check("Índice RAG acessível (fontes > 0)",
      Array.isArray(data.fontes) && data.fontes.length > 0);
  }

  // CHECK 4: GUTO responde futebol e puxa de volta
  {
    const data = await ask("Quem vai ganhar o Brasileirão?");
    const puxaDeVolta = /DESAFIOGUT|plano|lance|leilão|cota/i.test(data.resposta);
    const naoNega = !data.resposta.includes("não posso falar") &&
                     !data.resposta.includes("não fui programado");
    const temEmoji = /[😅🦁😎🔥🎯🏆💬⚡🤝]/u.test(data.resposta);
    check("GUTO responde futebol, puxa de volta, não nega, usa emoji",
      puxaDeVolta && naoNega && temEmoji);
  }

  // CHECK 5: GUTO responde piada e puxa de volta
  {
    const data = await ask("Me conte uma piada");
    const puxaDeVolta = /DESAFIOGUT|plano|lance|leilão|Indique|Diamante/i.test(data.resposta);
    const naoNega = !data.resposta.includes("não posso falar") &&
                     !data.resposta.includes("não fui programado");
    check("GUTO responde piada, puxa de volta, não nega",
      puxaDeVolta && naoNega);
  }

  // CHECK 6: GUTO NUNCA diz "não posso falar sobre isso"
  {
    const perguntas = [
      "Quem vai ganhar o Brasileirão?",
      "Me conte uma piada",
      "Como está o clima aí?",
      "Qual o sentido da vida?"
    ];
    let todasOk = true;
    for (const p of perguntas) {
      const data = await ask(p);
      if (data.resposta.includes("não posso falar") ||
          data.resposta.includes("não fui programado")) {
        todasOk = false;
        break;
      }
    }
    check("GUTO NUNCA diz 'não posso falar sobre isso' (4 perguntas)", todasOk);
  }

  // CHECK 7: GUTO lista planos corretamente
  {
    const data = await ask("Quais são os planos?");
    const temBronze = data.resposta.includes("2.640");
    const temPrata  = data.resposta.includes("5.600");
    const temOuro   = data.resposta.includes("11.000");
    const temDiamante = data.resposta.includes("18.000");
    check("GUTO lista planos (Bronze/Prata/Ouro/Diamante com valores)",
      temBronze && temPrata && temOuro && temDiamante);
  }

  // CHECK 8: modoResposta é "llm"
  {
    const data = await ask("Quanto custa o Bronze?");
    check("Pipeline usa LLM (modoResposta === 'llm')",
      data.modoResposta === "llm" && data.resposta.includes("2.640"));
  }

  console.log(`\n=== Resultado: ${pass}/${pass + fail} checks passaram ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Erro fatal:", err.message);
  process.exit(1);
});
