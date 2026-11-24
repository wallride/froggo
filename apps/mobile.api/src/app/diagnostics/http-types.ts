// The parts of the Express objects the diagnostics touch. Typed structurally so
// the app doesn't need express/@types/express as a direct dependency.
export interface HttpRequestLike {
  method: string;
  originalUrl: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

export interface HttpNext {
  (): void;
}

export interface HttpResponseLike {
  statusCode: number;
  writableFinished: boolean;
  once(event: 'finish' | 'close', listener: () => void): unknown;
  status(code: number): { json(body: unknown): unknown };
}
