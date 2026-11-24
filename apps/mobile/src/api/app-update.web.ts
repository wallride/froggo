import { APP_STORE_URL } from './app-store-url';
import { appUpdateTexts } from './app-update-texts';

const OVERLAY_ID = 'app-update-required';

// The server has refused this app version (426 Upgrade Required): the page is
// covered until the app is updated. react-native-web's Alert does nothing, so
// the modal is plain DOM — it has to work even if the app itself is stuck at
// its start (the configuration request is one of those refused).
export function requireAppUpdate(): void {
  if (typeof document === 'undefined' || !document.body) return;
  if (document.getElementById(OVERLAY_ID)) return;
  document.body.append(buildOverlay());
}

function buildOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-modal', 'true');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '9999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'rgba(0, 0, 0, 0.6)',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  } satisfies Partial<CSSStyleDeclaration>);

  const card = document.createElement('div');
  Object.assign(card.style, {
    maxWidth: '360px',
    padding: '24px',
    borderRadius: '16px',
    background: '#ffffff',
    color: '#1c1c1e',
    textAlign: 'center',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35)',
  } satisfies Partial<CSSStyleDeclaration>);

  const message = document.createElement('p');
  message.textContent = appUpdateTexts.message;
  message.style.margin = '0 0 20px';
  message.style.fontSize = '16px';
  message.style.lineHeight = '1.4';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = appUpdateTexts.button;
  Object.assign(button.style, {
    width: '100%',
    padding: '14px 20px',
    border: 'none',
    borderRadius: '12px',
    background: '#1c1c1e',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  } satisfies Partial<CSSStyleDeclaration>);
  button.addEventListener('click', openStore);

  card.append(message, button);
  overlay.append(card);
  return overlay;
}

function openStore(): void {
  window.open(APP_STORE_URL, '_blank', 'noopener');
  // Only a window opened by a script can close it; otherwise the page stays
  // blocked by the overlay, which is the point.
  window.close();
}
