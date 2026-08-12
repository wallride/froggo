// Unlike a web app, there is no implicit same-origin host to fall back to,
// so this must be set explicitly for anything other than local development
// (e.g. a physical device or the Android emulator can't reach "localhost").
// Set EXPO_PUBLIC_API_BASE_URL to mobile.api's http(s) origin.
export const API_BASE_URL =
  process.env['EXPO_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3001';
