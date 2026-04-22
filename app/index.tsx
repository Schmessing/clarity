import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import {
  getAccounts, getTotalNetWorth, getRecentTransactions,
  getCategorySummary, getMonthlySummaries, getBudgetProgress,
  insertTransaction, getDb,
} from '../lib/db';
import { formatCurrency, currentYM, formatMonth, todayISO } from '../lib/format';
import AccountCard from '../components/AccountCard';
import TransactionCard from '../components/TransactionCard';
import CategoryRing from '../components/CategoryRing';
import SpendingChart from '../components/SpendingChart';
import { EXPENSE_CATEGORIES, CATEGORY_COLORS } from '../types/finance';
import type { Account, Transaction, CategorySummary, MonthlySummary, BudgetProgress } from '../types/finance';

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [netWorth, setNetWorth] = useState(0);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [monthlies, setMonthlies] = useState<MonthlySummary[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetProgress[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const ym = currentYM();

  const load = useCallback(async () => {
    const [a, nw, r, cat, mon, bp] = await Promise.all([
      getAccounts(),
      getTotalNetWorth(),
      getRecentTransactions(8),
      getCategorySummary(ym),
      getMonthlySummaries(6),
      getBudgetProgress(ym),
    ]);
    setAccounts(a);
    setNetWorth(nw);
    setRecent(r);
    setCategories(cat);
    setMonthlies(mon);
    setBudgetAlerts(bp.filter((b) => b.pct >= 80));
  }, [ym]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const thisMonth = monthlies.find((m) => m.month === ym);
  const totalExpenses = categories.reduce((s, c) => s + c.total, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View>
            <Text style={styles.heroLabel}>Net Worth</Text>
            <Text style={styles.heroAmount}>{formatCurrency(netWorth)}</Text>
            <Text style={styles.heroSub}>{formatMonth(ym)}</Text>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{formatCurrency(thisMonth?.income ?? 0)}</Text>
              <Text style={[styles.heroStatLabel, { color: '#10b981' }]}>↑ income</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{formatCurrency(thisMonth?.expenses ?? 0)}</Text>
              <Text style={[styles.heroStatLabel, { color: '#ef4444' }]}>↓ spent</Text>
            </View>
          </View>
        </View>

        {/* Budget alerts */}
        {budgetAlerts.map((b) => (
          <View key={b.category} style={styles.alert}>
            <Text style={styles.alertText}>
              ⚠️  {b.category} budget {b.pct >= 100 ? 'exceeded' : `at ${Math.round(b.pct)}%`}
              {' '}— {formatCurrency(b.spent)} of {formatCurrency(b.amount)}
            </Text>
          </View>
        ))}

        {/* Accounts */}
        <Text style={styles.sectionTitle}>Accounts</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsScroll} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {accounts.map((a) => <AccountCard key={a.id} account={a} />)}
        </ScrollView>

        {/* Quick add */}
        <TouchableOpacity style={styles.quickAdd} onPress={() => setShowAddModal(true)}>
          <Text style={styles.quickAddText}>+ Add Transaction</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <SpendingChart data={monthlies} />
          <CategoryRing data={categories} totalExpenses={totalExpenses} />
        </View>

        {recent.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent</Text>
            {recent.map((t) => <TransactionCard key={t.id} transaction={t} />)}
          </View>
        )}

        {recent.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptyText}>Scan a receipt or add one manually</Text>
          </View>
        )}
      </ScrollView>

      <AddTransactionModal
        visible={showAddModal}
        accounts={accounts}
        onClose={() => setShowAddModal(false)}
        onSaved={() => { setShowAddModal(false); load(); }}
      />
    </SafeAreaView>
  );
}

// ─── Add Transaction Modal ────────────────────────────────────────────────────

function AddTransactionModal({
  visible, accounts, onClose, onSaved,
}: {
  visible: boolean;
  accounts: Account[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedAccount = accountId ?? accounts[0]?.id;

  const save = async () => {
    if (!merchant.trim() || !amount.trim() || !selectedAccount) {
      Alert.alert('Missing Fields', 'Please fill in merchant and amount.');
      return;
    }
    setSaving(true);
    try {
      await insertTransaction({
        accountId: selectedAccount,
        amount: parseFloat(amount),
        type,
        category: type === 'income' ? 'Income' : category,
        merchant: merchant.trim(),
        date: todayISO(),
        isRecurring: 0,
        createdAt: new Date().toISOString(),
      });
      setMerchant(''); setAmount('');
      onSaved();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modal.container}>
        <View style={modal.header}>
          <Text style={modal.title}>Add Transaction</Text>
          <TouchableOpacity onPress={onClose}><Text style={modal.cancel}>Cancel</Text></TouchableOpacity>
        </View>

        {/* Type toggle */}
        <View style={modal.toggle}>
          {(['expense', 'income'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[modal.toggleBtn, type === t && modal.toggleActive]}
              onPress={() => setType(t)}
            >
              <Text style={[modal.toggleText, type === t && modal.toggleTextActive]}>
                {t === 'expense' ? '↓ Expense' : '↑ Income'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={modal.label}>Merchant / Description</Text>
        <TextInput
          style={modal.input}
          value={merchant}
          onChangeText={setMerchant}
          placeholder="e.g. Whole Foods"
          placeholderTextColor="#4b5563"
        />

        <Text style={modal.label}>Amount ($)</Text>
        <TextInput
          style={modal.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#4b5563"
        />

        {type === 'expense' && (
          <>
            <Text style={modal.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {EXPENSE_CATEGORIES.map((cat) => {
                const active = category === cat;
                const color = CATEGORY_COLORS[cat];
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[modal.chip, active && { borderColor: color, backgroundColor: color + '22' }]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[modal.chipText, active && { color }]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {accounts.length > 1 && (
          <>
            <Text style={modal.label}>Account</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {accounts.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[modal.chip, selectedAccount === a.id && { borderColor: a.color, backgroundColor: a.color + '22' }]}
                  onPress={() => setAccountId(a.id!)}
                >
                  <Text style={[modal.chipText, selectedAccount === a.id && { color: a.color }]}>{a.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <TouchableOpacity style={[modal.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          <Text style={modal.saveBtnText}>{saving ? 'Saving...' : 'Save Transaction'}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080b14' },
  scroll: { flex: 1 },
  content: { paddingBottom: 32 },
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
  },
  heroLabel: { fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  heroAmount: { fontSize: 36, fontWeight: '800', color: '#f9fafb', letterSpacing: -1 },
  heroSub: { fontSize: 13, color: '#374151', marginTop: 2 },
  heroStats: { gap: 12, alignItems: 'flex-end' },
  heroStat: { alignItems: 'flex-end' },
  heroStatVal: { fontSize: 16, fontWeight: '700', color: '#f9fafb' },
  heroStatLabel: { fontSize: 11, marginTop: 1 },
  alert: {
    backgroundColor: '#431407',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#f97316',
  },
  alertText: { fontSize: 13, color: '#fed7aa' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
  },
  accountsScroll: { marginBottom: 12 },
  quickAdd: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  quickAddText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  section: { paddingHorizontal: 16 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#e5e7eb' },
  emptyText: { fontSize: 14, color: '#6b7280' },
});

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d18', padding: 20, paddingTop: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#f9fafb' },
  cancel: { fontSize: 16, color: '#6366f1' },
  toggle: { flexDirection: 'row', backgroundColor: '#111827', borderRadius: 10, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  toggleActive: { backgroundColor: '#1f2937' },
  toggleText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  toggleTextActive: { color: '#f9fafb' },
  label: { fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    backgroundColor: '#111827', borderRadius: 10, padding: 14,
    color: '#f9fafb', fontSize: 16, borderWidth: 1, borderColor: '#1f2937', marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#1f2937', backgroundColor: '#111827', marginRight: 8,
  },
  chipText: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  saveBtn: {
    backgroundColor: '#10b981', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
