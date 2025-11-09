export interface CastMember {
  actorName: string;
  characterName: string;
}

export interface MovieDetails {
  title: string;
  coverUrl: string;
  backdropUrl: string | null;
  genres: string[];
  imdbRating: string;
  letterboxdRating: string;
  rottenTomatoesRating: string;
  releaseDate: string;
  director: string | string[];
  cinematography: string | string[];
  screenplay: string | string[];
  runningTime: string;
  adaptedFrom: string | null;
  producer: string | string[];
  trailerUrl: string | null;
  cast: CastMember[];
  budget: string | null;
  boxOffice: string | null;
}

export interface BookDetails {
    title: string;
    coverUrl: string;
    backdropUrl: string | null;
    author: string | string[];
    genres: string[];
    publicationDate: string;
    publisher: string | null;
    pageCount: string | null;
    awards: string[] | null;
}

// Narration is now streamed, so it's not part of the initial data object.
export type ItemData = {
    type: 'movie';
    details: MovieDetails;
} | {
    type: 'book';
    details: BookDetails;
};

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface BrowseItem {
  title: string;
  year: string;
  coverUrl: string;
}