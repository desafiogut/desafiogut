// _lib/kms/aws-kms.mjs — Provider AWS KMS para o owner do Smart Account (MC30.2.1)
//
// Isola as chamadas específicas ao AWS KMS. A chave privada NUNCA sai do KMS:
// pedimos a chave PÚBLICA (para derivar o endereço) e enviamos DIGESTS de 32
// bytes para assinatura, recebendo a assinatura ECDSA em DER. A normalização
// (low-S, recovery id) e a derivação de endereço vivem em _lib/kms-signer.mjs
// (agnóstico ao provider) — este ficheiro só fala "AWS".
//
// Import dinâmico (lazy) de @aws-sdk/client-kms: em testnet/local-key
// este caminho nunca é tocado, pelo que build e `node --check` não dependem do
// pacote, e os testes mockam o módulo via mock.module().

const _clients = new Map(); // region → KMSClient (cache por região)

async function getClient(region) {
  if (_clients.has(region)) return _clients.get(region);
  const { KMSClient } = await import("@aws-sdk/client-kms");
  const cfg = {};
  if (region) cfg.region = region;
  // Em Netlify Functions o prefixo AWS_* é RESERVADO: o runtime Lambda injeta as
  // suas próprias AWS_ACCESS_KEY_ID/SECRET (papel de execução, sem permissão KMS).
  // Por isso o operador usa APP_AWS_* — passados aqui EXPLICITAMENTE ao cliente.
  // Fallback: se APP_AWS_* ausentes, usa a cadeia de credenciais padrão do SDK.
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;
  if (accessKeyId && secretAccessKey) cfg.credentials = { accessKeyId, secretAccessKey };
  const client = new KMSClient(cfg);
  _clients.set(region, client);
  return client;
}

/**
 * Devolve a chave pública (DER SubjectPublicKeyInfo) da chave KMS.
 * @param {string} keyId  ARN ou KeyId da chave KMS (ECC_SECG_P256K1 / secp256k1).
 * @param {string} region Região AWS.
 * @returns {Promise<Uint8Array>} DER SPKI (contém o ponto EC não-comprimido).
 */
export async function awsGetPublicKeyDer(keyId, region) {
  const client = await getClient(region);
  const { GetPublicKeyCommand } = await import("@aws-sdk/client-kms");
  const out = await client.send(new GetPublicKeyCommand({ KeyId: keyId }));
  if (!out?.PublicKey) throw new Error("AWS KMS: GetPublicKey não devolveu PublicKey");
  return out.PublicKey instanceof Uint8Array ? out.PublicKey : new Uint8Array(out.PublicKey);
}

/**
 * Assina um digest de 32 bytes com a chave KMS (ECDSA secp256k1).
 * Usa MessageType=DIGEST (o digest já é o hash final) e ECDSA_SHA_256.
 * @param {string} keyId
 * @param {string} region
 * @param {Uint8Array} digest32  Hash de 32 bytes a assinar.
 * @returns {Promise<Uint8Array>} Assinatura ECDSA em DER (SEQUENCE{ r, s }).
 */
export async function awsSignDigest(keyId, region, digest32) {
  const client = await getClient(region);
  const { SignCommand } = await import("@aws-sdk/client-kms");
  const out = await client.send(new SignCommand({
    KeyId: keyId,
    Message: digest32,
    MessageType: "DIGEST",
    SigningAlgorithm: "ECDSA_SHA_256",
  }));
  if (!out?.Signature) throw new Error("AWS KMS: Sign não devolveu Signature");
  return out.Signature instanceof Uint8Array ? out.Signature : new Uint8Array(out.Signature);
}
