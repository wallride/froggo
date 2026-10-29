import { Collection, Db, Document, MongoClient } from 'mongodb';

import * as z from 'zod/v4';

import { MongoTransaction } from './MongoTransaction';

export const mongoConnectionOptionsSchema = z.object({
  uri: z.string(),
  database: z.string(),
});
export type IMongoConnectionOptions = z.infer<typeof mongoConnectionOptionsSchema>;

// Common connection adapter shared by every MongoProvider. A single
// instance is meant to be created once and injected into each provider,
// rather than each provider opening its own client.
export class MongoConnection {
  private client: MongoClient | undefined;
  private db: Db | undefined;

  constructor(private readonly options: IMongoConnectionOptions) {}

  async connect(): Promise<void> {
    if (this.db) return;

    // Optional model fields left undefined must be omitted, not stored as
    // null — the Zod schemas reject null when the document is read back.
    this.client = new MongoClient(this.options.uri, { ignoreUndefined: true });
    await this.client.connect();
    this.db = this.client.db(this.options.database);
  }

  async disconnect(): Promise<void> {
    await this.client?.close();
    this.client = undefined;
    this.db = undefined;
  }

  getCollection<T extends Document>(name: string): Collection<T> {
    if (!this.db) {
      throw new Error('MongoConnection is not connected. Call connect() before using it.');
    }

    return this.db.collection<T>(name);
  }

  startTransaction(): MongoTransaction {
    if (!this.client) {
      throw new Error('MongoConnection is not connected. Call connect() before using it.');
    }

    return new MongoTransaction(this.client.startSession());
  }
}
