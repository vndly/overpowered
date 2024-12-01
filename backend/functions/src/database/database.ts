import * as admin from 'firebase-admin'
import {CollectionGroup, CollectionReference, DocumentData, DocumentReference, DocumentSnapshot, Firestore, Query, QuerySnapshot, SetOptions, Transaction, UpdateData, WriteBatch} from 'firebase-admin/firestore'
import {Logger} from '../utils/logger'
import {mapToFirebaseDocument} from '../utils/firebase-mapper'
import {IRoom} from '../models/room'

type FirestoreWriteable = IRoom

export class Database {
  private constructor(
    private readonly firestore: Firestore,
    private readonly transaction?: Transaction,
    private readonly batch?: WriteBatch,
  ) { }

  public doc(documentPath: string): DocumentReference<DocumentData> {
    return this.firestore.doc(documentPath)
  }

  public collection(collectionPath: string): CollectionReference<DocumentData> {
    return this.firestore.collection(collectionPath)
  }

  public collectionGroup(collectionId: string): CollectionGroup<DocumentData> {
    return this.firestore.collectionGroup(collectionId)
  }

  public query<T>(query: Query<T>): Promise<QuerySnapshot<T>> {
    if (this.transaction) {
      return this.transaction.get<T>(query)
    } else {
      return query.get()
    }
  }

  public getDocument<T>(documentRef: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
    if (this.transaction) {
      return this.transaction.get<T>(documentRef)
    } else {
      return documentRef.get()
    }
  }

  public createDocument<T>(documentRef: DocumentReference<T>, data: FirestoreWriteable) {
    if (this.transaction) {
      return this.transaction.create<T>(documentRef, mapToFirebaseDocument(data))
    } else if (this.batch) {
      return this.batch.create(documentRef, mapToFirebaseDocument(data))
    } else {
      return documentRef.create(mapToFirebaseDocument(data))
    }
  }

  public setDocument<T>(documentRef: DocumentReference<T>, data: FirestoreWriteable, options: SetOptions = {}) {
    if (this.transaction) {
      return this.transaction.set<T>(documentRef, mapToFirebaseDocument(data), options)
    } else if (this.batch) {
      return this.batch.set(documentRef, mapToFirebaseDocument(data), options)
    } else {
      return documentRef.set(mapToFirebaseDocument(data), options)
    }
  }

  public updateDocument<T>(documentRef: DocumentReference<T>, data: UpdateData<T>) {
    if (this.transaction) {
      return this.transaction.update<T>(documentRef, mapToFirebaseDocument(data))
    } else if (this.batch) {
      return this.batch.update(documentRef, mapToFirebaseDocument(data))
    } else {
      return documentRef.update(mapToFirebaseDocument(data))
    }
  }

  public deleteDocument<T>(documentRef: DocumentReference<T>) {
    if (this.transaction) {
      return this.transaction.delete(documentRef)
    } else if (this.batch) {
      return this.batch.delete(documentRef)
    } else {
      return documentRef.delete()
    }
  }

  public static runTransaction<T>(handler: (database: Database) => Promise<T>) {
    const firestore = Database.getFirestore()

    try {
      return firestore.runTransaction(async (transaction) => {
        const database = new Database(firestore, transaction)
        return handler(database)
      })
    } catch (e) {
      Logger.warning({
        message: 'Error committing transaction',
        error: e,
      })

      throw e
    }
  }

  public static async runBatch<T>(handler: (database: Database) => Promise<T>) {
    const firestore = Database.getFirestore()
    const batch = firestore.batch()
    const database = new Database(firestore, undefined, batch)

    try {
      const result = await handler(database)
      await batch.commit()

      return result
    } catch (e) {
      Logger.warning({
        message: 'Error committing batch',
        error: e,
      })

      throw e
    }
  }

  public static instance(): Database {
    return new Database(Database.getFirestore())
  }

  private static getFirestore(): Firestore {
    return admin.firestore()
  }
}

export const WriteOptionMerge: SetOptions = {
  merge: true,
}

export const COLLECTIONS = {
  PLAYERS: 'players',
  ROOMS: 'rooms',
  MATCHES: 'matches',
}
