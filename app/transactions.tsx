import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { getTransactions, deleteTransaction } from '../lib/db';
import TransactionCard from '../components/TransactionCard';
import { CATEGORIES, CATEGORY_COLORS } from '../types/finance';
import type { Transaction, Category } from '../types/finance';

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [catFilter, setCatFilter] = useState<Category | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getTransactions(200);
    setTransactions(data);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleDelete = (t: Transaction) => {
    Alert.alert('Delete Transaction', `Remove "${t.merchant}" (${t.amount.toFixed(2)})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { if (t.id) { await deleteTransaction(t.id); load(); } },
      },
    ]);
  };

  const filtered = transactions.filter((t) => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (catFilter && t.category !== catFilter) return false;
    if (search && !t.merchant.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalShown = filtered
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor="#4b5563"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Type filter */}
      <View style={styles.typeRow}>
        {(['all', 'expense', 'income'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeBtn, typeFilter === t && styles.typeBtnActive]}
            onPress={() => setTypeFilter(t)}
          >
            <Text style={[styles.typeBtnText, typeFilter === t && styles.typeBtnTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category filter */}
      <FlatList
        data={CATEGORIES}
        keyExtractor={(c) => c}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
        renderItem={({ item }) => {
          const active = catFilter === item;
          const color = CATEGORY_COLORS[item];
          return (
            <TouchableOpacity
              style={[styles.catChip, active && { borderColor: color, backgroundColor: color + '22' }]}
              onPress={() => setCatFilter(active ? null : item)}
            >
              <Text style={[styles.catText, active && { color }]}>{item}</Text>
            </TouchableOpacity>
          );
        }}
        style={styles.catScroll}
      />

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>{filtered.length} transactions</Text>
        {typeFilter !== 'income' && (
          <Text style={styles.summaryAmount}>-${totalShown.toFixed(2)}</Text>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
        renderItem={({ item }) => (
          <TransactionCard transaction={item} onDelete={() => handleDelete(item)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080b14' },
  searchRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111827', borderRadius: 12,
    paddingHorizontal: 12, gap: 8,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, color: '#f9fafb', fontSize: 15, paddingVertical: 12 },
  clearBtn: { fontSize: 13, color: '#6b7280', padding: 4 },
  typeRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  typeBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937',
  },
  typeBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  typeBtnText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  typeBtnTextActive: { color: '#fff' },
  catScroll: { flexGrow: 0, marginBottom: 4 },
  catRow: { paddingHorizontal: 16, gap: 8 },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#1f2937', backgroundColor: '#111827',
  },
  catText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  summary: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  summaryText: { fontSize: 13, color: '#6b7280' },
  summaryAmount: { fontSize: 13, fontWeight: '700', color: '#f87171' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 15, color: '#6b7280' },
});
