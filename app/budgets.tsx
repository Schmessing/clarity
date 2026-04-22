import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { getBudgetProgress, upsertBudget, deleteBudget } from '../lib/db';
import { sendBudgetAlert } from '../lib/notifications';
import BudgetBar from '../components/BudgetBar';
import { EXPENSE_CATEGORIES, CATEGORY_ICONS } from '../types/finance';
import { currentYM, formatMonth, formatCurrency } from '../lib/format';
import type { BudgetProgress, Category } from '../types/finance';

export default function BudgetsScreen() {
  const [progress, setProgress] = useState<BudgetProgress[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCategory, setEditCategory] = useState<Category>(EXPENSE_CATEGORIES[0]);
  const [editAmount, setEditAmount] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const ym = currentYM();

  const load = useCallback(async () => {
    const data = await getBudgetProgress(ym);
    setProgress(data);
    for (const b of data) {
      if (b.pct >= 90) await sendBudgetAlert(b.category, b.spent, b.amount);
    }
  }, [ym]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setEditCategory(EXPENSE_CATEGORIES[0]);
    setEditAmount('');
    setShowModal(true);
  };

  const openEdit = (b: BudgetProgress) => {
    setEditingId(b.id ?? null);
    setEditCategory(b.category);
    setEditAmount(b.amount.toFixed(2));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setEditAmount('');
  };

  const saveBudget = async () => {
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) { Alert.alert('Invalid amount'); return; }
    await upsertBudget({ category: editCategory, amount: amt, month: ym });
    closeModal();
    load();
  };

  const handleDelete = (b: BudgetProgress) => {
    Alert.alert(
      'Delete Budget',
      `Remove the ${b.category} budget of ${formatCurrency(b.amount)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            if (b.id) { await deleteBudget(b.id); load(); }
          },
        },
      ]
    );
  };

  const totalBudgeted = progress.reduce((s, b) => s + b.amount, 0);
  const totalSpent = progress.reduce((s, b) => s + b.spent, 0);
  const overBudget = progress.filter((b) => b.spent > b.amount);
  const isEditing = editingId !== null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Budgets</Text>
            <Text style={styles.month}>{formatMonth(ym)}</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Set Budget</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{formatCurrency(totalSpent)}</Text>
            <Text style={styles.summaryLabel}>Spent</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{formatCurrency(totalBudgeted)}</Text>
            <Text style={styles.summaryLabel}>Budgeted</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: totalBudgeted - totalSpent < 0 ? '#ef4444' : '#10b981' }]}>
              {formatCurrency(Math.abs(totalBudgeted - totalSpent))}
            </Text>
            <Text style={styles.summaryLabel}>{totalBudgeted - totalSpent < 0 ? 'Over' : 'Left'}</Text>
          </View>
        </View>

        {overBudget.length > 0 && (
          <View style={styles.overAlert}>
            <Text style={styles.overAlertText}>
              🚨  {overBudget.length} budget{overBudget.length > 1 ? 's' : ''} exceeded this month
            </Text>
          </View>
        )}

        {progress.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>No budgets set</Text>
            <Text style={styles.emptyText}>Tap "+ Set Budget" to create your first spending goal</Text>
          </View>
        )}

        {progress.map((b) => (
          <BudgetBar
            key={b.category}
            budget={b}
            onEdit={() => openEdit(b)}
            onDelete={() => handleDelete(b)}
          />
        ))}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <View style={modal.container}>
          <View style={modal.header}>
            <Text style={modal.title}>{isEditing ? 'Edit Budget' : 'Set Budget'}</Text>
            <TouchableOpacity onPress={closeModal}>
              <Text style={modal.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={modal.label}>Category</Text>
          <ScrollView style={{ maxHeight: 180, marginBottom: 16 }}>
            {EXPENSE_CATEGORIES.map((cat) => {
              const active = editCategory === cat;
              // When editing, lock category to the one being edited
              const disabled = isEditing && cat !== editCategory;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[modal.catRow, active && modal.catRowActive, disabled && modal.catRowDisabled]}
                  onPress={() => !disabled && setEditCategory(cat)}
                  activeOpacity={disabled ? 1 : 0.7}
                >
                  <Text style={modal.catIcon}>{CATEGORY_ICONS[cat]}</Text>
                  <Text style={[modal.catName, active && modal.catNameActive, disabled && modal.catNameDisabled]}>
                    {cat}
                  </Text>
                  {active && <Text style={modal.check}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={modal.label}>Monthly Budget ($)</Text>
          <TextInput
            style={modal.input}
            value={editAmount}
            onChangeText={setEditAmount}
            keyboardType="decimal-pad"
            placeholder="e.g. 300"
            placeholderTextColor="#4b5563"
            autoFocus
          />

          <TouchableOpacity style={modal.saveBtn} onPress={saveBudget}>
            <Text style={modal.saveBtnText}>{isEditing ? 'Update Budget' : 'Save Budget'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080b14' },
  content: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#f9fafb' },
  month: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  addBtn: {
    backgroundColor: '#10b981', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  summaryCard: {
    backgroundColor: '#111827', borderRadius: 16,
    padding: 16, flexDirection: 'row', marginBottom: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 18, fontWeight: '700', color: '#f9fafb' },
  summaryLabel: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  summaryDivider: { width: 1, backgroundColor: '#1f2937' },
  overAlert: {
    backgroundColor: '#450a0a', borderRadius: 10,
    padding: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#ef4444',
  },
  overAlertText: { fontSize: 14, color: '#fca5a5' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#e5e7eb' },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
});

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d18', padding: 20, paddingTop: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#f9fafb' },
  cancel: { fontSize: 16, color: '#10b981' },
  label: { fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 10, marginBottom: 4, backgroundColor: '#111827',
  },
  catRowActive: { backgroundColor: '#0d1f1a', borderWidth: 1, borderColor: '#10b981' },
  catRowDisabled: { opacity: 0.3 },
  catIcon: { fontSize: 18 },
  catName: { flex: 1, fontSize: 15, color: '#9ca3af' },
  catNameActive: { color: '#10b981', fontWeight: '600' },
  catNameDisabled: { color: '#374151' },
  check: { fontSize: 16, color: '#10b981' },
  input: {
    backgroundColor: '#111827', borderRadius: 10, padding: 14,
    color: '#f9fafb', fontSize: 16, borderWidth: 1, borderColor: '#1f2937', marginBottom: 20,
  },
  saveBtn: { backgroundColor: '#10b981', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
