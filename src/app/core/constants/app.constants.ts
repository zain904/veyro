export const APP_AUTHOR = {
  name: 'Zain Ul Abdeen',
  email: 'zulabdeen86@gmail.com',
  url: 'https://veyro-red.vercel.app',
} as const;

export function appCopyright(): string {
  return `© ${new Date().getFullYear()} ${APP_AUTHOR.name}. All rights reserved.`;
}
