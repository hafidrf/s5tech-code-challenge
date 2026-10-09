/** Domain types for the swap-records API. */

export interface SwapRecord {
  id: number;
  from_token: string;
  to_token: string;
  amount_from: number;
  amount_to: number | null;
  rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSwapInput {
  from_token: string;
  to_token: string;
  amount_from: number;
  amount_to?: number | null;
  rate?: number | null;
}

export type UpdateSwapInput = Partial<Omit<CreateSwapInput, 'from_token'>> & {
  from_token?: string;
};

export interface ListFilters {
  from?: string;
  to?: string;
  created_after?: string;
  created_before?: string;
  limit: number;
  offset: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: string[];
  };
}
