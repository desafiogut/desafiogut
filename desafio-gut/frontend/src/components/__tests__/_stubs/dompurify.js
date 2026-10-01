// _stubs/dompurify.js — UTAC000.9. Duplo do `dompurify` para o arnês SSR.
//
// PORQUE: o `src/utils/sanitize.js` faz `import DOMPurify from "dompurify"` e o interop do UMD
// NÃO sobrevive ao `ssrLoadModule` do Vite — medido no arranque deste teste:
//     TypeError: __vite_ssr_import_0__.default.sanitize is not a function
// (em produção o mesmo código funciona: o bundle do browser resolve o default correctamente.)
// Com este duplo, o `sanitize.js` REAL continua a correr — só a biblioteca de sanitização é
// substituída pelo mínimo que ele usa: tirar etiquetas. O que este teste prova (o 🏆 vai para o
// vencedor OFICIAL) não depende do DOMPurify; a sanitização real tem os seus próprios testes.

export default {
  sanitize: (valor) => String(valor ?? "").replace(/<[^>]*>/g, ""),
};
