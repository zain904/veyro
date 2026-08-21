import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Account, AccountType, Transaction } from '../models/transaction.model';

export interface AccountInput {
  name: string;
  bank_name?: string | null;
  color?: string;
  icon?: string;
  account_type?: AccountType;
  opening_balance?: number;
}

export interface TransferInput {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  transaction_date: string;
  description?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private initializedForUser: string | null = null;

  constructor(private supabase: SupabaseService) {}

  async initializeForCurrentUser(): Promise<void> {
    await this.supabase.whenReady();
    const user = this.supabase.currentUser;
    if (!user || this.initializedForUser === user.id) return;
    await this.ensureDefaultAccount(user.id);
    this.initializedForUser = user.id;
  }

  async ensureDefaultAccount(userId?: string): Promise<Account> {
    const uid = userId ?? this.supabase.currentUser!.id;
    const { data: existing } = await this.supabase.client
      .from('accounts')
      .select('*')
      .eq('user_id', uid)
      .eq('is_default', true)
      .maybeSingle();

    if (existing) return existing as Account;

    const { data, error } = await this.supabase.client
      .from('accounts')
      .insert({
        user_id: uid,
        name: 'Main',
        bank_name: 'General',
        color: '#6366f1',
        icon: 'account_balance',
        account_type: 'bank',
        opening_balance: 0,
        is_default: true,
        sort_order: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Account;
  }

  async getAccounts(includeArchived = false): Promise<Account[]> {
    await this.supabase.whenReady();
    await this.initializeForCurrentUser();

    let query = this.supabase.client
      .from('accounts')
      .select('*')
      .order('sort_order')
      .order('name');

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Account[];
  }

  async getDefaultAccount(): Promise<Account> {
    await this.initializeForCurrentUser();
    const accounts = await this.getAccounts();
    return accounts.find(a => a.is_default) ?? accounts[0] ?? await this.ensureDefaultAccount();
  }

  async getAccountsWithBalances(includeArchived = false): Promise<Account[]> {
    const accounts = await this.getAccounts(includeArchived);
    const { data: txns, error } = await this.supabase.client
      .from('transactions')
      .select('amount, type, account_id, transfer_to_account_id');

    if (error) throw error;
    return accounts.map(account => ({
      ...account,
      balance: this.computeBalance(account, (txns ?? []) as Pick<Transaction, 'amount' | 'type' | 'account_id' | 'transfer_to_account_id'>[]),
    }));
  }

  computeBalance(
    account: Account,
    txns: Pick<Transaction, 'amount' | 'type' | 'account_id' | 'transfer_to_account_id'>[]
  ): number {
    let balance = Number(account.opening_balance) || 0;
    for (const t of txns) {
      const amount = Number(t.amount);
      if (t.account_id === account.id) {
        if (t.type === 'income') balance += amount;
        else if (t.type === 'expense') balance -= amount;
        else if (t.type === 'transfer') balance -= amount;
      }
      if (t.type === 'transfer' && t.transfer_to_account_id === account.id) {
        balance += amount;
      }
    }
    return balance;
  }

  async createAccount(input: AccountInput): Promise<Account> {
    const user = this.supabase.currentUser!;
    const { count } = await this.supabase.client
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { data, error } = await this.supabase.client
      .from('accounts')
      .insert({
        user_id: user.id,
        name: input.name.trim(),
        bank_name: input.bank_name?.trim() || null,
        color: input.color ?? '#6366f1',
        icon: input.icon ?? 'account_balance',
        account_type: input.account_type ?? 'bank',
        opening_balance: input.opening_balance ?? 0,
        is_default: (count ?? 0) === 0,
        sort_order: count ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Account;
  }

  async updateAccount(id: string, updates: Partial<AccountInput & { is_archived?: boolean }>): Promise<Account> {
    const { data, error } = await this.supabase.client
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Account;
  }

  async deleteAccount(id: string): Promise<void> {
    const { data: account } = await this.supabase.client
      .from('accounts')
      .select('is_default')
      .eq('id', id)
      .single();

    if (account?.is_default) {
      throw new Error('DEFAULT_ACCOUNT');
    }

    const { count } = await this.supabase.client
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .or(`account_id.eq.${id},transfer_to_account_id.eq.${id}`);

    if ((count ?? 0) > 0) {
      throw new Error('ACCOUNT_HAS_TRANSACTIONS');
    }

    const { error } = await this.supabase.client.from('accounts').delete().eq('id', id);
    if (error) throw error;
  }

  async createTransfer(input: TransferInput): Promise<Transaction> {
    if (input.from_account_id === input.to_account_id) {
      throw new Error('SAME_ACCOUNT');
    }

    const { data, error } = await this.supabase.client
      .from('transactions')
      .insert({
        user_id: this.supabase.currentUser!.id,
        type: 'transfer',
        amount: input.amount,
        account_id: input.from_account_id,
        transfer_to_account_id: input.to_account_id,
        category_id: null,
        description: input.description ?? null,
        transaction_date: input.transaction_date,
      })
      .select(`
        *,
        account:accounts!account_id(*),
        transfer_to_account:accounts!transfer_to_account_id(*)
      `)
      .single();

    if (error) throw error;
    return data as Transaction;
  }

  async getTotalBalance(): Promise<number> {
    const accounts = await this.getAccountsWithBalances();
    return accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  }
}
