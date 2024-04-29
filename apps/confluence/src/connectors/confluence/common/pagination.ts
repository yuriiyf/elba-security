export type ConfluencePaginatedResponseDataV1<T> = {
  start: number;
  limit: number;
  size: number;
  results: T[];
};

export const getNextPaginationCursorV1 = <T>(data: ConfluencePaginatedResponseDataV1<T>) => {
  if (data.size < data.limit) return null;
  return data.size + data.limit;
};

export type ConfluencePaginatedResponseDataV2<T> = {
  results: T[];
  _links: {
    next?: string;
    base: string;
  };
};

export const getNextPaginationCursorV2 = <T>(data: ConfluencePaginatedResponseDataV2<T>) => {
  if (!data._links.next) return null;
  return new URL(data._links.base + data._links.next).searchParams.get('cursor');
};
