/**
 * What the pages and the passport's backend agree on, as types.
 *
 * `PassportApi` is what `createLocalApi()` answers today and what a server-backed implementation
 * has to keep; docs/architecture.md tells of it in prose. The project is plain JavaScript, so
 * nothing in its build reads this file: `tests/unit/api.test.js` is what holds the local
 * implementation to the contract. A client or a server written in TypeScript can import the types
 * as they stand.
 *
 * `CommunityApi`, at the end, is a draft of what takes the place of `loadCommunity()` once the
 * collectors are more than a page can hold. Nothing implements it yet.
 */

/**
 * An id is of a fixed form, made of letters, digits, `_`, `-` and `/`, and is never a text a
 * person wrote. The pages write ids into attributes and addresses as they are. Every other string
 * here that is not a day, an enumeration or an id is a text: a page writes it through `safe()`,
 * and so it does the address of an image. `tests/unit/escaping.test.js` checks that they do.
 */
export type Id = string;
export type VenueId = Id;
export type StampId = Id;
export type TicketId = Id;
export type CollectorId = Id;
export type PostId = Id;
/** A visit is known by its venue and its day: `venueId/day`. */
export type VisitKey = Id;

/** A day, written YYYY-MM-DD. */
export type Day = string;

/**
 * The address of an image. Photographs of venues are URLs; the holder's own photographs are data
 * URLs kept with the passport today, and will be the URLs of uploads with a server.
 */
export type ImageUrl = string;

/** How a stamp was collected. `legacy` is for records older than the methods. */
export type ClaimMethod = 'qr' | 'nfc' | 'ticket' | 'legacy';

// ---------------------------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------------------------

export interface Venue {
  id: VenueId;
  /** The stamp every visitor can collect here. */
  stampId: StampId;
  name: string;
  city: string;
  /** What kind of place it is, as the pages say it. */
  type: string;
  /** The same, as the discover page narrows by it. */
  category: 'museum' | 'artmuseum' | 'space';
  /** What is on show. */
  exhibit: string;
  /** The lines set over the photograph where the venue is featured. Without them it is not. */
  headline?: string[];
  intro: string;
  /** Where in the venue the stamp is collected. */
  location: string;
  /** A word set large on the venue's page where it has no photograph. */
  word: string;
  /** Where it stands on the drawn map, which is 360 across and 540 down. */
  at: [x: number, y: number];
  /** Its photograph and a small one for lists; '' where there is none. */
  photo: ImageUrl;
  thumb: ImageUrl;
}

export interface Stamp {
  id: StampId;
  /** The venue it is collected at. */
  venueId: VenueId;
  /**
   * Which illustration and colours it is drawn with: a name the stylesheets and `assets/index.js`
   * know. A stamp they do not know cannot be shown until its art is added to the pages.
   */
  art: string;
  /** Its tile on the atlas of illustrations, for those drawn there. */
  tile?: number;
  title: string;
  english: string;
  description: string;
  /** The model number engraved on its back. */
  serial: string;
  /** What kind of stamp it is, as the pages say it. */
  kind: string;
  /** The size of its edition, where it is limited. */
  limit?: number;
  /** How far the edition has been issued. Answered with every limited stamp. */
  issued?: number;
  /** The mark of its exhibition, where it is the stamp of one. */
  edition?: string;
  /** The first and the last day of the visits it can be claimed for. */
  period?: [first: Day, last: Day];
}

export interface Catalog {
  venues: Venue[];
  stamps: Stamp[];
}

// ---------------------------------------------------------------------------------------------
// The holder's passport
// ---------------------------------------------------------------------------------------------

export interface StampRecord {
  /** The day it was first claimed. */
  firstAt: Day;
  /** The number it was issued, which it keeps. Within the edition, where there is one. */
  issue: number;
  /** The days of the visits it was collected for. */
  visits: Day[];
  /** How it was first collected. */
  method: ClaimMethod;
  /** Each time it was collected: the day of the visit, how, and the day of the claim. */
  events: { date: Day; method: ClaimMethod; claimedAt: Day }[];
  /**
   * Left from the second form of the stored passport, which kept a line and a photograph with
   * the stamp. They are with the visit now, and no page reads these.
   */
  note: string;
  photo: ImageUrl;
}

export interface Visit {
  key: VisitKey;
  /** One of the catalogue's, or `custom-…` for a venue the holder named. */
  venueId: VenueId;
  /** The venue as it was at the visit, kept with it. */
  name: string;
  city: string;
  exhibit: string;
  day: Day;
  stampIds: StampId[];
  ticketIds: TicketId[];
  /** The holder's line, of 120 characters at most, and photograph. */
  note: string;
  photo: ImageUrl;
}

export interface Ticket {
  venueId: VenueId;
  /** The day of the visit, and the day the ticket was first brought in. */
  visitedAt: Day;
  receivedAt: Day;
  /** The stamps it was redeemed for. */
  redeemed: StampId[];
  /** Whether its image is kept. One that was removed is still known, so it cannot claim twice. */
  saved: boolean;
  /** An image the holder brought in, or the demonstration's printed sample. */
  kind: 'image' | 'sample';
  name: string;
  city: string;
  exhibit: string;
}

/** What the holder shows of the passport to others. `memories` only together with `footprints`. */
export interface Visibility {
  album: boolean;
  footprints: boolean;
  memories: boolean;
}

/** A visit the holder put on the square: a copy of what was chosen to go with it. */
export interface OwnPost {
  key: VisitKey;
  stampIds: StampId[];
  note: string;
  photo: ImageUrl;
  /** The day it was published. */
  at: Day;
}

export interface Passport {
  /** Of the form the local backend stores. A server need not answer it. */
  version: 3;
  /** In the order they were made: stamps of the same day fill the album in that order. */
  records: Record<StampId, StampRecord>;
  visits: Record<VisitKey, Visit>;
  tickets: Record<TicketId, Ticket>;
  /** The venues to go to. */
  wanted: VenueId[];
  /** One to a visit, in the order they were published. */
  posts: OwnPost[];
  /** The posts of others the holder liked. */
  liked: PostId[];
  profile: { public: Visibility };
}

// ---------------------------------------------------------------------------------------------
// The other collectors, as `loadCommunity()` answers them
// ---------------------------------------------------------------------------------------------

export interface Collector {
  id: CollectorId;
  name: string;
  city: string;
  public: Visibility;
  /** In the order they were collected. */
  stamps: { stampId: StampId; at: Day; method: ClaimMethod; issue: number }[];
  /** Newest first. */
  visits: {
    day: Day;
    venueId: VenueId;
    name: string;
    city: string;
    exhibit: string;
    stampIds: StampId[];
    note: string;
    photo: ImageUrl;
  }[];
}

export interface CommunityPost {
  /** `collectorId/venueId/day`. */
  id: PostId;
  collectorId: CollectorId;
  venueId: VenueId;
  name: string;
  city: string;
  exhibit: string;
  /** The day of the visit, and the day it was published. */
  day: Day;
  at: Day;
  stamps: { stampId: StampId; issue: number }[];
  note: string;
  photo: ImageUrl;
  /** How many liked it, not counting the holder. */
  likes: number;
}

export interface Community {
  collectors: Collector[];
  posts: CommunityPost[];
}

// ---------------------------------------------------------------------------------------------
// The backend
// ---------------------------------------------------------------------------------------------

/**
 * What a command answers: the parts of the passport it changed, by their top-level names, whole,
 * for the application to take in place of its own; and whatever else the command has to say.
 */
export type Answer<Part extends keyof Passport, Result = unknown> = Result & {
  data: Pick<Passport, Part>;
  /**
   * Only the local backend says this: false where the browser refused to keep the change, which
   * then stands for this session alone.
   */
  persisted?: boolean;
};

/**
 * A command that fails rejects with an error that carries one of these, and changes nothing. The
 * pages tell `ticket-mismatch` and `media-unavailable` apart and say the same of all the others,
 * so a server may add codes of its own.
 */
export type ApiErrorCode =
  | 'unknown-stamp'
  | 'unknown-venue'
  | 'unknown-ticket'
  | 'unknown-visit'
  /** A venue outside the catalogue without a name or a city. */
  | 'invalid-venue'
  /** Not a day, or one after today. */
  | 'invalid-day'
  /** A ticket redeemed before, now for another venue or day. */
  | 'ticket-mismatch'
  /** The ticket's image could not be kept. */
  | 'media-unavailable';

export interface ApiError extends Error {
  code: ApiErrorCode;
}

/** A request that is called off rejects with an `AbortError` and writes nothing. */
export interface Cancellable {
  signal?: AbortSignal;
}

/** A ticket as it was read, for the holder to correct before it is redeemed. */
export interface TicketReading {
  id: TicketId;
  /** `other` for a venue the catalogue does not know. */
  venueId: VenueId | 'other';
  name: string;
  city: string;
  exhibit: string;
  visitedAt: Day;
}

/** What redeeming a ticket came to. */
export interface TicketClaim {
  /** The stamps this ticket claimed now, and those among them that are new to the passport. */
  stampIds: StampId[];
  newIds: StampId[];
  newCount: number;
  existingCount: number;
  visitedAt: Day;
  receivedAt: Day;
  /** The venue of the visit, which for one outside the catalogue is made here. */
  venueId: VenueId;
  visitKey: VisitKey;
}

/**
 * The passport's backend. Every method is asynchronous. With a server, "the holder" is whoever
 * is signed in, and what the local backend decides is the server's to decide: the day of a
 * claim, the number a stamp is issued, which stamps a ticket can claim, the identity of a ticket
 * and of a venue outside the catalogue, and how claims gather into visits.
 */
export interface PassportApi {
  /** The venues and the stamps. */
  loadCatalog(): Promise<Catalog>;

  /** The other collectors and what they put on the square. `CommunityApi` is to replace it. */
  loadCommunity(): Promise<Community>;

  /** The holder's passport. */
  load(): Promise<Passport>;

  /**
   * Collects a stamp on site, today. Answers whether it was held already, and the day.
   * Fails with `unknown-stamp`.
   */
  claimStamp(
    claim: { stampId: StampId; method: 'qr' | 'nfc' },
    options?: Cancellable,
  ): Promise<Answer<'records' | 'visits' | 'wanted', { duplicate: boolean; day: Day }>>;

  /**
   * Reads a ticket: which one it is, and the visit it tells of. `hint` is what the page knows of
   * the visit already. Changes nothing.
   */
  recognizeTicket(
    ticket: {
      file?: Blob | null;
      hint?: { venueId?: VenueId; day?: Day; name?: string; city?: string; exhibit?: string };
    },
    options?: Cancellable,
  ): Promise<{ ticket: TicketReading }>;

  /**
   * Redeems a ticket for a visit: keeps its image if asked to, collects those of `stampIds` the
   * visit can claim, and files all of it under the visit. `name`, `city` and `exhibit` are read
   * only where `venueId` is `other`. Fails with `invalid-day`, `unknown-venue`, `invalid-venue`,
   * `ticket-mismatch` or `media-unavailable`.
   */
  redeemTicket(
    ticket: {
      id: TicketId;
      venueId: VenueId | 'other';
      name?: string;
      city?: string;
      exhibit?: string;
      visitedAt: Day;
      stampIds?: StampId[];
      file?: Blob | null;
      saveTicket?: boolean;
    },
    options?: Cancellable,
  ): Promise<Answer<'records' | 'visits' | 'tickets' | 'wanted', { claim: TicketClaim }>>;

  /** Takes a ticket's image out of the passport; its visit and its stamps stay. Fails with `unknown-ticket`. */
  removeTicket(id: TicketId): Promise<Answer<'tickets'>>;

  /** The line and the photograph kept with a visit. Fails with `unknown-visit`. */
  saveMemory(
    visitKey: VisitKey,
    memory: { note: string; photo: ImageUrl },
  ): Promise<Answer<'visits'>>;

  setWanted(venueId: VenueId, on: boolean): Promise<Answer<'wanted'>>;

  /**
   * Puts a visit on the square, in place of what was there of it before, dated today. Fails with
   * `unknown-visit`.
   */
  publishPost(post: {
    visitKey: VisitKey;
    stampIds: StampId[];
    note: string;
    photo: ImageUrl;
  }): Promise<Answer<'posts'>>;

  withdrawPost(visitKey: VisitKey): Promise<Answer<'posts'>>;

  setLiked(postId: PostId, on: boolean): Promise<Answer<'liked'>>;

  setVisibility(shown: Visibility): Promise<Answer<'profile'>>;
}

/** What the local backend has besides, for the demonstration and for taking it down. */
export interface LocalApi extends PassportApi {
  /** Puts the kept passport aside for an empty one, of which nothing is kept. */
  startTrial(): Promise<{ data: Passport }>;
  /** Takes the kept passport up again. */
  endTrial(): Promise<{ data: Passport }>;
  dispose(): void;
}

// ---------------------------------------------------------------------------------------------
// Draft: the other collectors, in pages
// ---------------------------------------------------------------------------------------------

/**
 * `loadCommunity()` answers every collector and every post at once, and `state/community.js`
 * works out the boards, the square and the holders of a stamp from them. That holds for the
 * dozen collectors of the demonstration. What follows is one request for each thing a page
 * shows, answered a page at a time, to be settled with whoever builds the server.
 *
 * Three things the pages do today become the server's:
 *
 * - What a collector does not show is not answered. Today all of it is answered and the pages
 *   leave it out.
 * - Other people's days are answered to the month, except the day of a visit put on the square.
 * - The places on a board: only stamps collected on site count, collectors level on stamps share
 *   a place in the order they got there, and the next place follows on (1, 1, 2). The holder
 *   stands on a board only while the album is shown.
 *
 * The holder is among the collectors under the id `me`.
 */
export interface CommunityApi {
  /**
   * The square, newest first, the holder's own posts among them. With `venueId`, the posts about
   * one venue; with `withNote`, only those that carry a line, which is a venue's guest book.
   */
  listPosts(
    query?: PageRequest & { venueId?: VenueId; withNote?: boolean },
  ): Promise<Page<SquarePost>>;

  loadPost(id: PostId): Promise<SquarePost>;

  /** The boards there are: one for each city, and one for the year. */
  listBoards(): Promise<Board[]>;

  /**
   * A board from the top, with the holder's own row and the row of the nearest collector with
   * more stamps, wherever on the board those are.
   */
  loadBoard(
    id: Id,
    query?: PageRequest,
  ): Promise<Page<BoardRow> & { board: Board; mine: BoardRow | null; ahead: BoardRow | null }>;

  /** A collector's passport, as far as it is shown, and the place on the board asked about. */
  loadCollector(
    id: CollectorId,
    query?: { boardId?: Id },
  ): Promise<PublicPassport & { standing: BoardRow | null }>;

  /** A collector's visits, newest first; none where the footprints are not shown. */
  listCollectorVisits(id: CollectorId, query?: PageRequest): Promise<Page<PublicVisit>>;

  /** Those who hold a stamp and show it, by the number each was issued. */
  listHolders(
    stampId: StampId,
    query?: PageRequest,
  ): Promise<Page<Holder> & { total: number; mine: Holder | null }>;
}

export interface PageRequest {
  /** `next` of the page before. Without it, the first page. */
  cursor?: string;
  limit?: number;
}

export interface Page<Row> {
  rows: Row[];
  /** What to ask for the page after this one with. Absent on the last. */
  next?: string;
}

/** A month, written YYYY-MM. */
export type Month = string;

/** As much of a collector as stands beside a post or on a row. */
export interface Person {
  id: CollectorId;
  name: string;
}

export interface SquarePost extends Omit<CommunityPost, 'collectorId' | 'likes'> {
  person: Person;
  /** Whether it is the holder's own, and if so the visit it is of. */
  mine: boolean;
  key?: VisitKey;
  /** How many liked it, the holder among them, and whether the holder did. */
  likes: number;
  liked: boolean;
}

export interface Board {
  /** The name of a city, or `year`. */
  id: Id;
  label: string;
  yearly?: boolean;
  /** How many stamps there are to collect on it, where that has an end. */
  total?: number;
}

export interface BoardRow {
  rank: number;
  person: Person;
  /** The stamps that count, and the month the last of them was collected. */
  count: number;
  reached: Month;
  /** The newest three of them. */
  latest: StampId[];
  /** Whether that is every stamp of the board. */
  complete: boolean;
}

export interface PublicPassport extends Person {
  city: string;
  public: Visibility;
  /** The month of the first stamp or visit. */
  since?: Month;
  /** In the order they were collected; none where the album is not shown. */
  stamps: { stampId: StampId; at: Month; method: ClaimMethod; issue: number }[];
  /** How many visits there are to page through. */
  visitCount: number;
}

export interface PublicVisit {
  month: Month;
  venueId: VenueId;
  name: string;
  city: string;
  exhibit: string;
  stampIds: StampId[];
  /** '' where the memories are not shown. */
  note: string;
  photo: ImageUrl;
}

export interface Holder {
  person: Person;
  issue: number;
  at: Month;
  method: ClaimMethod;
}
