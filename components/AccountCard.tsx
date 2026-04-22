import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ACCOUNT_ICONS } from '../types/finance';
import { formatCurrency } from '../lib/format';
import type { Account } from '../types/finance';

interface Props {
  account: Account;
}

export default function AccountCard({ account }: Props) {
  const icon = ACCOUNT_ICONS[account.type] ?? '🏦';
  const isCredit = account.type === 'credit';

  return (
    <View style={[styles.card, { borderLeftColor: account.color }]}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.info}>
        <Text style={styles.name}>{account.name}</Text>
        <Text style={styles.type}>{account.type}</Text>
      </View>
      <View style={styles.balanceBox}>
        <Text style={[styles.balance, isCredit && styles.creditBalance]}>
          {isCredit ? '-' : ''}{formatCurrency(Math.abs(account.balance))}
        </Text>
        <Text style={styles.balanceLabel}>{isCredit ? 'owed' : 'available'}</Text>
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
    padding: 16,
    marginRight: 12,
    width: 200,
    borderLeftWidth: 3,
    gap: 10,
  },
  icon: { fontSize: 24 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: '#f9fafb' },
  type: { fontSize: 12, color: '#6b7280', marginTop: 2, textTransform: 'capitalize' },
  balanceBox: { alignItems: 'flex-end' },
  balance: { fontSize: 16, fontWeight: '700', color: '#f9fafb' },
  creditBalance: { color: '#f87171' },
  balanceLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
});
