import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ru', 'tg'],
  defaultLocale: 'ru',
  localePrefix: 'as-needed',
});
