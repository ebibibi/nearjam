import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // api, _next/static, _next/image, favicon.ico, .swa (Azure SWA health check) を除外
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|\\.swa).*)'],
};
