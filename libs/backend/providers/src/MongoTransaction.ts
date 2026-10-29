import { ClientSession } from 'mongodb';

// Thin wrapper over a MongoDB ClientSession, started as soon as it's
// constructed. Pass it to MongoProvider methods to run them as part of the
// same transaction, then commit() or rollback() once.
export class MongoTransaction {
  constructor(private readonly session: ClientSession) {
    session.startTransaction();
  }

  getSession(): ClientSession {
    return this.session;
  }

  async commit(): Promise<void> {
    await this.session.commitTransaction();
    await this.session.endSession();
  }

  async rollback(): Promise<void> {
    await this.session.abortTransaction();
    await this.session.endSession();
  }
}
