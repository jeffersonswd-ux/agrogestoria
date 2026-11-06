import { hashPassword, verifyPassword, encryptSecret, decryptSecret, generatePassword } from '../src/common/utils/crypto';
import { APP_MODULES, MODULE_KEYS } from '../src/common/constants/modules';

describe('utilitários de segurança', () => {
  it('gera hash bcrypt verificável e nunca expõe a senha', async () => {
    const senha = 'MinhaSenh@Forte123';
    const hash = await hashPassword(senha);
    expect(hash).not.toBe(senha);
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(await verifyPassword(senha, hash)).toBe(true);
    expect(await verifyPassword('outra-senha', hash)).toBe(false);
  });

  it('gera senhas aleatórias fortes', () => {
    const a = generatePassword(16);
    const b = generatePassword(16);
    expect(a).toHaveLength(16);
    expect(a).not.toBe(b);
    expect(a).toMatch(/[A-Z]/);
    expect(a).toMatch(/[a-z]/);
    expect(a).toMatch(/[0-9]/);
    expect(a).toMatch(/[@#$%&*!?]/);
  });

  it('criptografa segredos de forma reversível sem expor o valor original', () => {
    const segredo = 'minha-api-key-secreta';
    const cifrado = encryptSecret(segredo);
    expect(cifrado).not.toBe(segredo);
    expect(cifrado.startsWith('v1:')).toBe(true);
    expect(decryptSecret(cifrado)).toBe(segredo);
  });

  it('mantém valores legíveis que não estão no formato criptografado', () => {
    expect(decryptSecret('valor-plano')).toBe('valor-plano');
  });

  it('expõe o catálogo de módulos com prefixos de API únicos', () => {
    expect(APP_MODULES.length).toBe(23);
    expect(MODULE_KEYS).toContain('dashboard');
    expect(MODULE_KEYS).toContain('whatsapp');
    expect(MODULE_KEYS).toContain('ai');
    const prefixos = APP_MODULES.flatMap((m) => m.apiPrefixes);
    expect(new Set(prefixos).size).toBe(prefixos.length);
  });
});
