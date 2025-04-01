/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Authorigins = "_authOrigins",
	Externalauths = "_externalAuths",
	Mfas = "_mfas",
	Otps = "_otps",
	Superusers = "_superusers",
	Books = "books",
	Chapters = "chapters",
	Chats = "chats",
	Messages = "messages",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

// System fields
export type BaseSystemFields<T = never> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
	expand?: T
}

export type AuthSystemFields<T = never> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AuthoriginsRecord = {
	collectionRef: string
	created?: IsoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated?: IsoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated?: IsoDateString
}

export type MfasRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	method: string
	recordRef: string
	updated?: IsoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated?: IsoDateString
}

export type SuperusersRecord = {
	created?: IsoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated?: IsoDateString
	verified?: boolean
}

export type BooksRecord = {
	author?: string
	available?: boolean
	chapters?: RecordIdString[]
	chats?: RecordIdString[]
	cover_image?: string
	created?: IsoDateString
	file: string
	id: string
	title?: string
	updated?: IsoDateString
	user: RecordIdString
}

export type ChaptersRecord = {
	book: RecordIdString
	chapter: string
	created?: IsoDateString
	id: string
	order?: number
	title?: string
	updated?: IsoDateString
	user?: RecordIdString
}

export type ChatsRecord = {
	book: RecordIdString
	created?: IsoDateString
	id: string
	messages?: RecordIdString[]
	title: string
	updated?: IsoDateString
	user: RecordIdString
}

export enum MessagesRoleOptions {
	"user" = "user",
	"assistant" = "assistant",
}
export type MessagesRecord = {
	chat: RecordIdString
	content: string
	created?: IsoDateString
	failed?: boolean
	id: string
	role: MessagesRoleOptions
	updated?: IsoDateString
	user: RecordIdString
}

export type UsersRecord = {
	avatar?: string
	chats?: RecordIdString[]
	created?: IsoDateString
	email: string
	emailVisibility?: boolean
	id: string
	name?: string
	password: string
	tokenKey: string
	updated?: IsoDateString
	verified?: boolean
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type BooksResponse<Texpand = unknown> = Required<BooksRecord> & BaseSystemFields<Texpand>
export type ChaptersResponse<Texpand = unknown> = Required<ChaptersRecord> & BaseSystemFields<Texpand>
export type ChatsResponse<Texpand = unknown> = Required<ChatsRecord> & BaseSystemFields<Texpand>
export type MessagesResponse<Texpand = unknown> = Required<MessagesRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	books: BooksRecord
	chapters: ChaptersRecord
	chats: ChatsRecord
	messages: MessagesRecord
	users: UsersRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	books: BooksResponse
	chapters: ChaptersResponse
	chats: ChatsResponse
	messages: MessagesResponse
	users: UsersResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
	collection(idOrName: '_authOrigins'): RecordService<AuthoriginsResponse>
	collection(idOrName: '_externalAuths'): RecordService<ExternalauthsResponse>
	collection(idOrName: '_mfas'): RecordService<MfasResponse>
	collection(idOrName: '_otps'): RecordService<OtpsResponse>
	collection(idOrName: '_superusers'): RecordService<SuperusersResponse>
	collection(idOrName: 'books'): RecordService<BooksResponse>
	collection(idOrName: 'chapters'): RecordService<ChaptersResponse>
	collection(idOrName: 'chats'): RecordService<ChatsResponse>
	collection(idOrName: 'messages'): RecordService<MessagesResponse>
	collection(idOrName: 'users'): RecordService<UsersResponse>
}
