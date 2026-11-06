import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'IS_PUBLIC_KEY';
/** Marca rotas que não exigem autenticação (login, webhooks, saúde). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
