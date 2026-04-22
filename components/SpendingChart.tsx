import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { MonthlySummary } from '../types/finance';

interface Props {
  data: MonthlySummary[];
}

export default function SpendingChart({ data }: Props) {
  if (data.length === 0) return null;

  const reversed = [...data].reverse();
  const maxVal = Math.max(...reversed.map((d) => Math.max(d.income, d.expenses)), 1);

  const fmt = (ym: string) => {
    const [y, m] = ym.split('-');
    return new Date(Number(y), Number(m) - 1, 1)
      .toLocaleDateString('en-US', { month: 'short' });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Income vs Expenses</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chart}>
          {reversed.map((item) => {
            const incH = Math.max((item.income / maxVal) * 90, item.income > 0 ? 4 : 0);
            const expH = Math.max((item.expenses / maxVal) * 90, item.expenses > 0 ? 4 : 0);
            return (
              <View key={item.month} style={styles.group}>
                <View style={styles.bars}>
                  <View style={[styles.bar, { height: incH, backgroundColor: '#10b981' }]} />
                  <View style={[styles.bar, { height: expH, backgroundColor: '#ef4444' }]} />
                </View>
                <Text style={styles.label}>{fmt(item.month)}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.legend}>
        <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
        <Text style={styles.legendText}>Income</Text>
        <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
        <Text style={styles.legendText}>Expenses</Text>
      </View>
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
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 110,
    paddingBottom: 20,
    gap: 12,
  },
  group: { alignItems: 'center', width: 48 },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 90,
  },
  bar: { width: 16, borderRadius: 4 },
  label: { fontSize: 11, color: '#6b7280', position: 'absolute', bottom: 0 },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#6b7280', marginRight: 10 },
});
