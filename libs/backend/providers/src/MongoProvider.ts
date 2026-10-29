import { Document, Filter, Collection } from 'mongodb';

import * as z from 'zod/v4';

import { MongoConnection } from './MongoConnection';
import { MongoTransaction } from './MongoTransaction';

export const mongoProviderOptionsSchema = z.object({
  collectionName: z.string(),
});
export type IMongoProviderOptions = z.infer<typeof mongoProviderOptionsSchema>;

// Base MongoDB storage functionality, mirroring JSONFileProvider but backed
// by a shared MongoConnection instead of the filesystem.
export abstract class MongoProvider<T extends Document> {
  protected abstract schema: z.Schema<T>;

  protected collection: Collection<T>;

  constructor(
    protected readonly connection: MongoConnection,
    protected readonly options: IMongoProviderOptions,
  ) {
    this.collection = connection.getCollection<T>(options.collectionName);
  }

  protected abstract getModelId(model: T): string;

  protected getIdFilter(id: string): Filter<T> {
    return { id } as unknown as Filter<T>;
  }

  protected parse(data: unknown): T {
    return this.schema.parse(data);
  }

  protected async getModel(id: string): Promise<T> {
    const document = await this.collection.findOne(this.getIdFilter(id));
    if (!document) {
      throw new Error(`Document ${id} not found in collection ${this.options.collectionName}`);
    }

    return this.parse(document);
  }

  protected async findModel(id: string): Promise<T | null> {
    const document = await this.collection.findOne(this.getIdFilter(id));
    return document ? this.parse(document) : null;
  }

  protected async findModels(filter: Filter<T> = {}): Promise<T[]> {
    const documents = await this.collection.find(filter).toArray();
    return documents.map((document) => this.parse(document));
  }

  // Create-or-update: replaces the document matching the model's id, or
  // inserts it if it doesn't exist yet. Pass a session to run as part of a
  // transaction.
  protected async save(data: T, transaction?: MongoTransaction): Promise<T> {
    const model = this.parse(data);
    const id = this.getModelId(model);

    await this.collection.replaceOne(this.getIdFilter(id), model, {
      upsert: true,
      session: transaction?.getSession(),
    });

    return model;
  }

  async startTransaction(): Promise<MongoTransaction> {
    return this.connection.startTransaction();
  }
}
