// The player's access token for mobile.api, kept in memory only: the app
// identifies the player at every start and gets a fresh one then. When the
// token is refused (expired, or the server's secret changed), the request is
// retried once with a new token from reauthenticate().
class AuthSession {
  private accessToken: string | null = null;
  private reauthenticate: (() => Promise<string | null>) | null = null;
  // Shared by the requests refused at the same time, so the player is
  // identified once for all of them.
  private renewing: Promise<string | null> | null = null;

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  // How to get a new token — identifying the player again. Resolves to null
  // if there's no player to identify.
  setReauthenticate(reauthenticate: (() => Promise<string | null>) | null): void {
    this.reauthenticate = reauthenticate;
  }

  // fetch() on behalf of the player.
  async fetch(url: string, init: RequestInit = {}): Promise<Response> {
    const token = this.accessToken;
    const res = await fetch(url, withAccessToken(init, token));
    if (res.status !== 401 || !this.reauthenticate) return res;

    const renewed = await this.renew(token);
    return renewed ? fetch(url, withAccessToken(init, renewed)) : res;
  }

  private async renew(refusedToken: string | null): Promise<string | null> {
    // Another request has renewed it in the meantime.
    if (this.accessToken !== refusedToken) return this.accessToken;

    this.renewing ??= (async () => {
      try {
        const token = (await this.reauthenticate?.()) ?? null;
        this.accessToken = token;
        return token;
      } catch {
        return null;
      } finally {
        this.renewing = null;
      }
    })();
    return this.renewing;
  }
}

function withAccessToken(init: RequestInit, token: string | null): RequestInit {
  if (!token) return init;
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
}

export const authSession = new AuthSession();
