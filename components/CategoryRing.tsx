import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../types/finance';
import { formatCurrency } from '../lib/format';
import type { CategorySummary } from '../types/finance';

interface Props {
  data: CategorySummary[];
  totalExpenses: number;
}

export default function CategoryRing({ data, totalExpenses }: Props) {
  if (data.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spending Breakdown</Text>
      {data.map((item) => {
        const color = CATEGORY_COLORS[item.category] ?? '#6b7280';
        const icon = CATEGORY_ICONS[item.category] ?? '📦';
        const pct = totalExpenses > 0 ? ((item.total / totalExpenses) * 100).toFixed(1) : '0';
        return (
          <View key={item.category} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.icon}>{icon}</Text>
            <Text style={styles.name}>{item.category}</Text>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${Math.min(Number(pct), 100)}%` as any,
                    backgroundColor: color + '88',
                  },
                ]}
              />
            </View>
            <Text style={styles.pct}>{pct}%</Text>
            <Text style={styles.amount}>{formatCurrency(item.total)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  icon: { fontSize: 15 },
  name: { fontSize: 13, color: '#d1d5db', width: 110 },
  barContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#1f2937',
    borderRadius: 3,
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: 3 },
  pct: { fontSize: 12, color: '#6b7280', width: 36, textAlign: 'right' },
  amount: { fontSize: 13, fontWeight: '600', color: '#f9fafb', width: 72, textAlign: 'right' },
});
