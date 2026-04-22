import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../types/finance';
import { formatCurrency } from '../lib/format';
import type { BudgetProgress } from '../types/finance';

interface Props {
  budget: BudgetProgress;
  onEdit: () => void;
  onDelete: () => void;
}

export default function BudgetBar({ budget, onEdit, onDelete }: Props) {
  const color = CATEGORY_COLORS[budget.category] ?? '#6b7280';
  const icon = CATEGORY_ICONS[budget.category] ?? '📦';
  const over = budget.spent > budget.amount;
  const barColor = budget.pct >= 90 ? '#ef4444' : budget.pct >= 70 ? '#f97316' : color;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.left}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.category}>{budget.category}</Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.spent, over && styles.over]}>
            {formatCurrency(budget.spent)}
          </Text>
          <Text style={styles.of}> / {formatCurrency(budget.amount)}</Text>
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn} hitSlop={8}>
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn} hitSlop={8}>
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${budget.pct}%` as any, backgroundColor: barColor }]} />
      </View>

      <Text style={[styles.remaining, over ? styles.over : styles.safe]}>
        {over
          ? `$${(budget.spent - budget.amount).toFixed(2)} over budget`
          : `$${budget.remaining.toFixed(2)} remaining`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 18 },
  category: { fontSize: 15, fontWeight: '600', color: '#f9fafb' },
  right: { flexDirection: 'row', alignItems: 'center' },
  spent: { fontSize: 15, fontWeight: '700', color: '#f9fafb' },
  of: { fontSize: 13, color: '#6b7280' },
  over: { color: '#ef4444' },
  actionBtn: { marginLeft: 10 },
  editIcon: { fontSize: 14 },
  deleteIcon: { fontSize: 14 },
  track: {
    height: 6,
    backgroundColor: '#1f2937',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  fill: { height: '100%', borderRadius: 3 },
  remaining: { fontSize: 12 },
  safe: { color: '#6b7280' },
});
