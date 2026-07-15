import { apiFetch } from './api';

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

export interface WalletSummary {
  id: string;
  balance: number;
  currency: string;
  transactions: WalletTransaction[];
}

export function getWallet(token: string) {
  return apiFetch<WalletSummary>('/wallet', {}, token);
}

export function getWalletTransactions(token: string, page = 1) {
  return apiFetch<{
    items: WalletTransaction[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>(`/wallet/transactions?page=${page}`, {}, token);
}

export function topupWallet(token: string, amount: number) {
  return apiFetch(
    '/wallet/topup',
    {
      method: 'POST',
      body: JSON.stringify({ amount }),
    },
    token,
  );
}
