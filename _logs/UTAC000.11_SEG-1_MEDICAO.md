# UTAC000.11 — SEG-1 · Medição, reprodução e veredito — 2026-10-02

**Objectivo:** fechar **DEBT-011** — o `OverlayVencedor` do `MercadoLances` rebentava com um
`vencedor` malformado (achado do validador adversarial do UTAC000.10).
**Veredito do SEG-1: SEGUIR** — defeito reproduzido com stack trace, localizado numa linha, e a
correcção é uma guarda (Ponytail), sem tocar no comportamento com `vencedor` válido.

## -1.1 Estado MEDIDO (antes de tocar)
| item | medido |
|---|---|
| `git rev-parse HEAD` | **`6282d8d`** = `origin/main` (como o spec declara) |
| suíte frontend | **VERDE 600/600** |
| suíte backend | **VERDE 967/973** |
| árvore | limpa excepto `desafio-gut/frontend/package-lock.json` (**pré-existente**) |
| evidência bruta | `_logs/UTAC000.11_SEG-1_EVIDENCIA.txt` |

## -1.2 O DEFEITO — linha exacta e reprodução (HI10/GATE 5)
`src/pages/MercadoLances.jsx` l. 69-73 (**antes**):
```js
function OverlayVencedor({ vencedor, modalidade, onNovaRodada, EDICAO_ATIVA, isMobile }) {
  const enderecoAbrev = vencedor
    ? `${vencedor.endereco.slice(0, 10)}...${vencedor.endereco.slice(-6)}`   // ← SEM guarda
    : "—";
  const valorFmt = vencedor ? `R$ ${(vencedor.valor / 100).toFixed(2)}` : "—";
```
**Reprodução (stack traces reais, capturados em `UTAC000.11_SEG-1_EVIDENCIA.txt` §3):**
```
vencedor = {}                          → TypeError: Cannot read properties of undefined (reading 'slice')
vencedor = { endereco: null, valor: 0 } → TypeError: Cannot read properties of null     (reading 'slice')
vencedor = { valor: 300 }               → TypeError: Cannot read properties of undefined (reading 'slice')
vencedor = { endereco: null, valor:null}→ TypeError: Cannot read properties of null     (reading 'slice')
vencedor = { endereco: EU }             → NÃO rebenta, mas mostra «R$ NaN»   ← achado NOVO (não estava no veredicto)
```
O 5.º caso é um **segundo defeito do mesmo sítio**, descoberto ao escrever a tabela de casos: com
endereço presente e valor ausente, o overlay escrevia «R$ NaN» (a linha do valor estava **também**
sem guarda). Foi corrigido no mesmo passo, porque é o mesmo defeito na linha seguinte.

**Alcance:** pré-existente e **hoje inalcançável** pelo contexto real (o ramo oficial passa por
`normalizarResultadoOficial`, que exige `0x`+40 hex; o ramo local devolve um objecto-lance com
`endereco`). Torna-se alcançável **se o `showOverlay` for religado** — decisão de produto do
operador, não tomada aqui (o spec proíbe).

## -1.3 A guarda de referência do projecto (Frente SEG0.1)
O cartão do Dashboard **já tinha** este cuidado (`Dashboard.jsx` l. 410):
```jsx
{vencedorExibido.endereco ? `${vencedorExibido.endereco.slice(0, 10)}...${…}` : "—"}
```
A guarda aplicada no overlay **espelha esse padrão** — não inventa um mecanismo novo.

## -1.4 Evidência preservada (HI10)
`_logs/UTAC000.11_SEG-1_EVIDENCIA.txt` — baseline, a linha do defeito, a reprodução por mutação
(com md5 a provar que o mutante entrou), o **restauro conferido por md5** e o resultado depois da
guarda (12/12). O script que a produz é `_logs/utac0011-evidencia.sh` (re-executável).

## -1.5 Saúde global (HI1)
Disco OK · suíte **600/600 · 967/973 VERDE** · árvore limpa (só o `package-lock.json` pré-existente)
· nenhum worktree de validação montado · a frente de limpeza do UTAC000.10 já deixou
`git worktree list` com 4 entradas (a principal + 3 com trabalho preservado — declarado naquele
UTAC).

## -1.6 ⚠️ INCIDENTE DESTE SEG-1 (declarado, com causa-raiz)
A **1.ª versão do script de evidência** restaurava o ficheiro mutado com `git checkout -- <ficheiro>`.
Como a guarda **ainda não estava commitada**, o `checkout` repôs o ficheiro do HEAD (**sem guarda**)
e **apagou a correcção** (md5 voltou a `3748a94b…`). **Diagnóstico e recuperação:** o teste ficou
6/12 RED, o `git diff` mostrou o ficheiro sem a guarda, e a guarda foi **re-aplicada do patch
conhecido** (12/12 verde). **Causa-raiz:** usar um comando que restaura a partir do HEAD num
ficheiro que tem **trabalho não commitado**; o restauro certo é **de uma cópia de segurança**.
**Correcção do instrumento:** o script passou a fazer `cp` de um `.bak` **fora do repo** (em
`tmp-utac0008/`), com o incidente registado em comentário no próprio script. **Nada mais foi
tocado** (o teste e o resto da árvore intactos; o `.bak` que ficou dentro do repo foi removido).

## -1.7 VEREDITO: **SEGUIR**
Uma linha (duas expressões) sem guarda, com o padrão correcto já existente no Dashboard, sem
alteração de comportamento para `vencedor` válido, com reprodução preservada e mutação que morde.
