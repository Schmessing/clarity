import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Insight } from '../lib/gemini';

interface Props {
  insight: Insight;
}

const TYPE_CONFIG = {
  positive: { icon: '✅', color: '#10b981', bg: '#064e3b' },
  warning:  { icon: '⚠️', color: '#f97316', bg: '#431407' },
  neutral:  { icon: '💡', color: '#6366f1', bg: '#1e1b4b' },
};

export default function InsightCard({ insight }: Props) {
  const config = TYPE_CONFIG[insight.type] ?? TYPE_CONFIG.neutral;

  return (
    <View style={[styles.card, { borderLeftColor: config.color, backgroundColor: config.bg }]}>
      <Text style={styles.typeIcon}>{config.icon}</Text>
      <View style={styles.content}>
        <Text style={[styles.title, { color: config.color }]}>{insight.title}</Text>
        <Text style={styles.body}>{insight.body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 3,
    gap: 12,
  },
  typeIcon: { fontSize: 20, marginTop: 1 },
  content: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  body: { fontSize: 14, color: '#d1d5db', lineHeight: 20 },
});
