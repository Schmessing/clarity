import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../types/finance';
import { formatCurrency, formatDate } from '../lib/format';
import type { Transaction } from '../types/finance';

interface Props {
  transaction: Transaction;
  onDelete?: () => void;
}

export default function TransactionCard({ transaction: t, onDelete }: Props) {
  const color = CATEGORY_COLORS[t.category] ?? '#6b7280';
  const icon = CATEGORY_ICONS[t.category] ?? '📦';
  const isIncome = t.type === 'income';

  return (
    <View style={styles.card}>
      <View style={[styles.iconBadge, { backgroundColor: color + '22' }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.merchant} numberOfLines={1}>{t.merchant}</Text>
        <View style={styles.meta}>
          <Text style={styles.date}>{formatDate(t.date)}</Text>
          {t.isRecurring === 1 && <Text style={styles.recurring}>↩ recurring</Text>}
        </View>
      </View>

      <View style={styles.right}>
        <Text style={[styles.amount, { color: isIncome ? '#10b981' : '#f9fafb' }]}>
          {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
        </Text>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} hitSlop={12}>
            <Text style={styles.del}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  info: { flex: 1, gap: 4 },
  merchant: { fontSize: 15, fontWeight: '600', color: '#f9fafb' },
  meta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  date: { fontSize: 12, color: '#6b7280' },
  recurring: { fontSize: 11, color: '#818cf8', fontWeight: '500' },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 16, fontWeight: '700' },
  del: { fontSize: 12, color: '#374151' },
});
