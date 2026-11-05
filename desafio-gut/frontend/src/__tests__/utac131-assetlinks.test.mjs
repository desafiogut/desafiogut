// utac131-assetlinks.test.mjs — UTAC131. O `assetlinks.json` servido pela Netlify tem de autorizar os TRÊS
// certificados que assinam a app: debug (MC88.5), upload (85:44…, medido no AAB pelo UTAC124) e a chave de
// App Signing da Play (10:25…, fornecida pelo operador do Play Console). Sem a da Play, o App Link do OAuth
// não verifica nas instalações da loja e o login Google cai no navegador (UTAC124).
//
// Corre com:  node --test src/__tests__/utac131-assetlinks.test.mjs   (a partir de desafio-gut/frontend)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ficheiro = new URL("../../public/.well-known/assetlinks.json", import.meta.url);
const DEBUG = "70:6F:9E:83:D7:CF:4D:F9:32:7C:36:53:D3:09:85:B3:BD:97:44:3C:A4:87:56:2D:07:1B:53:29:83:90:9F:08";
const UPLOAD = "85:44:BC:E8:F2:08:E7:79:29:E2:CC:C8:06:EB:D5:B7:51:54:E1:83:28:9A:AE:1B:21:33:30:D4:90:88:17:29";
const PLAY = "10:25:43:5B:09:16:2E:46:49:FD:A2:F6:95:22:51:B8:28:7F:04:94:B5:5B:19:72:2F:18:42:67:7D:6C:9B:AB";

test("J1 é JSON válido, com uma declaração android_app para com.desafiogut.app e handle_all_urls", () => {
  const dados = JSON.parse(readFileSync(ficheiro, "utf8"));
  assert.ok(Array.isArray(dados) && dados.length === 1, "esperava UMA declaração");
  const [d] = dados;
  assert.deepEqual(d.relation, ["delegate_permission/common.handle_all_urls"]);
  assert.equal(d.target.namespace, "android_app");
  assert.equal(d.target.package_name, "com.desafiogut.app");
});

test("J2 os TRÊS certificados (debug, upload, Play App Signing), sem duplicados nem extras", () => {
  const [d] = JSON.parse(readFileSync(ficheiro, "utf8"));
  const fps = d.target.sha256_cert_fingerprints;
  assert.deepEqual([...fps].sort(), [DEBUG, UPLOAD, PLAY].sort());
});

test("J3 cada impressão tem o formato SHA-256 com dois-pontos (32 bytes em hexadecimal maiúsculo)", () => {
  const [d] = JSON.parse(readFileSync(ficheiro, "utf8"));
  for (const fp of d.target.sha256_cert_fingerprints) {
    assert.match(fp, /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/, `formato inválido: ${fp}`);
  }
});
