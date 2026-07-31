const fs = require('fs');
const path = './PrivyRoot.jsx';

let content = fs.readFileSync(path, 'utf8');

// Adiciona clientId após a linha que contém "appId: PRIVY_APP_ID"
// Procura por "appId: PRIVY_APP_ID," com possíveis espaços
content = content.replace(/(appId:\s*PRIVY_APP_ID,)/, '$1\n  clientId: "client-WY6YV4f8xhKTGnCG79Po1DgiEMQwWhcHfnCkHxoZQCjBG",');

// Altera customOAuthRedirectUrl
content = content.replace(/customOAuthRedirectUrl:\s*"https:\/\/silly-stardust-ca71bc\.netlify\.app\/redirect"/, 'customOAuthRedirectUrl: "desafiogut://oauth"');

// Salva sem BOM
fs.writeFileSync(path, content, 'utf8');

console.log('✅ Arquivo editado com sucesso.');
