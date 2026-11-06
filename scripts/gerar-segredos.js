/**
 * Gera os segredos de produção para as variáveis de ambiente da Hostinger.
 *
 * Uso:
 *   node scripts/gerar-segredos.js
 *
 * O resultado é impresso na tela e em SEGREDOS_HOSTINGER.txt, para copiar
 * e colar nos campos da Hostinger. Apague o arquivo depois de usar.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const segredos = {
  JWT_SECRET: crypto.randomBytes(48).toString('hex'),
  JWT_REFRESH_SECRET: crypto.randomBytes(48).toString('hex'),
  ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
};

const arquivo = path.join(__dirname, '..', 'SEGREDOS_HOSTINGER.txt');
const corpo = [
  'Segredos para as variáveis de ambiente da Hostinger',
  '==================================================',
  '',
  'Copie o valor de cada linha (sem o nome da variável) para o campo "Valor"',
  'correspondente na Hostinger.',
  '',
  ...Object.entries(segredos).map(([chave, valor]) => `${chave} = ${valor}`),
  '',
  'POSTGRES_PASSWORD = (escolha uma senha forte para o banco da Hostinger)',
  '',
  'Apague este arquivo depois de preencher. Ele nao deve ir para o Git.',
  '',
].join('\n');

fs.writeFileSync(arquivo, corpo);
console.log(corpo);
console.log(`Arquivo gerado: ${arquivo}`);
