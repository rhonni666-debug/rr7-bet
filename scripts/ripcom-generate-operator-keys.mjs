import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const rawCode = process.argv[2] ?? '';
const operatorCode = rawCode.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');

if (!operatorCode) {
  console.error('Uso: npm run ripcom:keys -- codigo-do-operador');
  process.exit(1);
}

const outputDir = path.resolve('.ripcom-keys', operatorCode);
fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const privatePath = path.join(outputDir, `${operatorCode}-private.pem`);
const publicPath = path.join(outputDir, `${operatorCode}-public.pem`);

fs.writeFileSync(privatePath, privateKey, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
fs.writeFileSync(publicPath, publicKey, { encoding: 'utf8', mode: 0o644, flag: 'wx' });

console.log(`Par RSA criado para ${operatorCode}`);
console.log(`PRIVATE: ${privatePath}`);
console.log(`PUBLIC:  ${publicPath}`);
console.log('\nA chave PRIVADA fica somente no backend do operador. Não envie nem cole no painel RIPCOM.');
console.log('\nCole esta chave PÚBLICA no painel RIPCOM B2B:\n');
console.log(publicKey.trim());
