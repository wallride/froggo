// Empty by default: requests stay relative and go through the Vite dev
// server proxy (see vite.config.mts). Set VITE_API_BASE_URL to point at an
// absolute origin (http or https) for other environments.
export const API_BASE_URL = import.meta.env['VITE_API_BASE_URL'] ?? '';
