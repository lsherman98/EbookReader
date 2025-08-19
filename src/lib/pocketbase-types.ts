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
	AiUsage = "ai_usage",
	Books = "books",
	Chapters = "chapters",
	Chats = "chats",
	Highlights = "highlights",
	LastRead = "last_read",
	Messages = "messages",
	SpendByUser = "spend_by_user",
	TotalSpend = "total_spend",
	UploadCount = "upload_count",
	Users = "users",
	Vectors = "vectors",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

type ExpandType<T> = unknown extends T
	? T extends unknown
		? { expand?: unknown }
		: { expand: T }
	: { expand: T }

// System fields
export type BaseSystemFields<T = unknown> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
} & ExpandType<T>

export type AuthSystemFields<T = unknown> = {
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

export enum AiUsageTaskOptions {
	"embed" = "embed",
	"chat" = "chat",
}

export enum AiUsageProviderOptions {
	"google" = "google",
	"openai" = "openai",
}

export enum AiUsageModelOptions {
	"gemini-embedding-001" = "gemini-embedding-001",
	"gpt-4o" = "gpt-4o",
}
export type AiUsageRecord = {
	book?: RecordIdString
	created?: IsoDateString
	id: string
	input_cost?: number
	input_tokens?: number
	model?: AiUsageModelOptions
	output_cost?: number
	output_tokens?: number
	provider?: AiUsageProviderOptions
	task?: AiUsageTaskOptions
	total_cost?: number
	updated?: IsoDateString
	user?: RecordIdString
}

export type BooksRecord = {
	author?: string
	chapters?: RecordIdString[]
	chats?: RecordIdString[]
	cover_image?: string
	created?: IsoDateString
	current_chapter?: RecordIdString
	date?: IsoDateString
	description?: string
	file: string
	id: string
	language?: string
	subject?: string
	title?: string
	updated?: IsoDateString
	user: RecordIdString
}

export type ChaptersRecord = {
	book: RecordIdString
	content: HTMLString
	created?: IsoDateString
	href?: string
	id: string
	order?: number
	title?: string
	updated?: IsoDateString
	user: RecordIdString
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

export type HighlightsRecord<Tselection = unknown> = {
	book?: RecordIdString
	chapter: RecordIdString
	created?: IsoDateString
	hash: string
	id: string
	selection: null | Tselection
	text: string
	updated?: IsoDateString
	user: RecordIdString
}

export type LastReadRecord = {
	book?: RecordIdString
	chapter?: RecordIdString
	created?: IsoDateString
	id: string
	updated?: IsoDateString
	user?: RecordIdString
}

export enum MessagesRoleOptions {
	"user" = "user",
	"assistant" = "assistant",
}
export type MessagesRecord<Tcitations = unknown> = {
	chat: RecordIdString
	citations?: null | Tcitations
	content: string
	created?: IsoDateString
	failed?: boolean
	id: string
	role: MessagesRoleOptions
	updated?: IsoDateString
	user: RecordIdString
}

export type SpendByUserRecord<Ttotal_spend = unknown> = {
	email: string
	id: string
	total_spend?: null | Ttotal_spend
}

export type TotalSpendRecord<Tgoogle_total = unknown, Tgrand_total = unknown, Topenai_total = unknown> = {
	google_total?: null | Tgoogle_total
	grand_total?: null | Tgrand_total
	id: string
	openai_total?: null | Topenai_total
}

export type UploadCountRecord = {
	email: string
	id: string
	uploadCount?: number
}

export type UsersRecord = {
	avatar?: string
	created?: IsoDateString
	email: string
	emailVisibility?: boolean
	id: string
	name?: string
	paid?: boolean
	password: string
	tokenKey: string
	updated?: IsoDateString
	verified?: boolean
}

export type VectorsRecord = {
	book?: RecordIdString[]
	chapter?: RecordIdString[]
	content: string
	created?: IsoDateString
	id: string
	index?: number
	title?: string
	updated?: IsoDateString
	vector_id?: number
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type AiUsageResponse<Texpand = unknown> = Required<AiUsageRecord> & BaseSystemFields<Texpand>
export type BooksResponse<Texpand = unknown> = Required<BooksRecord> & BaseSystemFields<Texpand>
export type ChaptersResponse<Texpand = unknown> = Required<ChaptersRecord> & BaseSystemFields<Texpand>
export type ChatsResponse<Texpand = unknown> = Required<ChatsRecord> & BaseSystemFields<Texpand>
export type HighlightsResponse<Tselection = unknown, Texpand = unknown> = Required<HighlightsRecord<Tselection>> & BaseSystemFields<Texpand>
export type LastReadResponse<Texpand = unknown> = Required<LastReadRecord> & BaseSystemFields<Texpand>
export type MessagesResponse<Tcitations = unknown, Texpand = unknown> = Required<MessagesRecord<Tcitations>> & BaseSystemFields<Texpand>
export type SpendByUserResponse<Ttotal_spend = unknown, Texpand = unknown> = Required<SpendByUserRecord<Ttotal_spend>> & BaseSystemFields<Texpand>
export type TotalSpendResponse<Tgoogle_total = unknown, Tgrand_total = unknown, Topenai_total = unknown, Texpand = unknown> = Required<TotalSpendRecord<Tgoogle_total, Tgrand_total, Topenai_total>> & BaseSystemFields<Texpand>
export type UploadCountResponse<Texpand = unknown> = Required<UploadCountRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>
export type VectorsResponse<Texpand = unknown> = Required<VectorsRecord> & BaseSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	ai_usage: AiUsageRecord
	books: BooksRecord
	chapters: ChaptersRecord
	chats: ChatsRecord
	highlights: HighlightsRecord
	last_read: LastReadRecord
	messages: MessagesRecord
	spend_by_user: SpendByUserRecord
	total_spend: TotalSpendRecord
	upload_count: UploadCountRecord
	users: UsersRecord
	vectors: VectorsRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	ai_usage: AiUsageResponse
	books: BooksResponse
	chapters: ChaptersResponse
	chats: ChatsResponse
	highlights: HighlightsResponse
	last_read: LastReadResponse
	messages: MessagesResponse
	spend_by_user: SpendByUserResponse
	total_spend: TotalSpendResponse
	upload_count: UploadCountResponse
	users: UsersResponse
	vectors: VectorsResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
	collection(idOrName: '_authOrigins'): RecordService<AuthoriginsResponse>
	collection(idOrName: '_externalAuths'): RecordService<ExternalauthsResponse>
	collection(idOrName: '_mfas'): RecordService<MfasResponse>
	collection(idOrName: '_otps'): RecordService<OtpsResponse>
	collection(idOrName: '_superusers'): RecordService<SuperusersResponse>
	collection(idOrName: 'ai_usage'): RecordService<AiUsageResponse>
	collection(idOrName: 'books'): RecordService<BooksResponse>
	collection(idOrName: 'chapters'): RecordService<ChaptersResponse>
	collection(idOrName: 'chats'): RecordService<ChatsResponse>
	collection(idOrName: 'highlights'): RecordService<HighlightsResponse>
	collection(idOrName: 'last_read'): RecordService<LastReadResponse>
	collection(idOrName: 'messages'): RecordService<MessagesResponse>
	collection(idOrName: 'spend_by_user'): RecordService<SpendByUserResponse>
	collection(idOrName: 'total_spend'): RecordService<TotalSpendResponse>
	collection(idOrName: 'upload_count'): RecordService<UploadCountResponse>
	collection(idOrName: 'users'): RecordService<UsersResponse>
	collection(idOrName: 'vectors'): RecordService<VectorsResponse>
}
