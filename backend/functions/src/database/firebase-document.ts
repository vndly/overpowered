import {DocumentData, DocumentSnapshot, QueryDocumentSnapshot, Timestamp} from 'firebase-admin/firestore'
import {mapFromFirebaseDocument} from '../utils/firebase-mapper'

export class FirebaseDocument {
  private readonly documentData: DocumentData
  readonly id: string
  readonly createdDateTime?: Date
  readonly updatedDateTime?: Date
  readonly exists: boolean

  private constructor(params: {
    documentData: DocumentData,
    createdDateTime?: Date,
    updatedDateTime?: Date,
    exists: boolean,
  }) {
    this.documentData = params.documentData
    this.id = params.documentData.id
    this.createdDateTime = params.createdDateTime
    this.updatedDateTime = params.updatedDateTime
    this.exists = params.exists
  }

  public static fromQuery(doc: QueryDocumentSnapshot<DocumentData>) {
    return new FirebaseDocument({
      documentData: doc,
      createdDateTime: doc.createTime?.toDate(),
      updatedDateTime: doc.updateTime?.toDate(),
      exists: doc.exists,
    })
  }

  public static fromRef(doc: DocumentSnapshot<DocumentData>) {
    return new FirebaseDocument({
      documentData: doc,
      createdDateTime: doc.createTime?.toDate(),
      updatedDateTime: doc.updateTime?.toDate(),
      exists: doc.exists,
    })
  }

  public fields(): string[] {
    return Object.keys(this.documentData.data())
  }

  public contains(name: string): boolean {
    return this.documentData.data()[name]
  }

  public get<T>(name: string, defaultValue?: T): T {
    return this.documentData.data()[name] ?? defaultValue
  }

  public string(name: string, defaultValue?: string): string {
    return this.get(name, defaultValue)
  }

  public number(name: string, defaultValue?: number): number {
    return this.get(name, defaultValue)
  }

  public boolean(name: string, defaultValue?: boolean): boolean {
    return this.get(name, defaultValue)
  }

  public date(name: string, defaultValue?: Date): Date | undefined {
    const timestamp = this.get<Timestamp>(name)

    return timestamp ? timestamp.toDate() : defaultValue
  }

  public enum<T>(name: string, defaultValue?: T): T {
    return this.get(name, defaultValue)
  }

  public document(name: string): FirebaseDocument {
    return new FirebaseDocument(this.get(name))
  }

  public data() {
    return mapFromFirebaseDocument(this.documentData.data())
  }
}
