import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { getTransactionsByMonth, getCategorySummary, getMonthlySummaries } from '../lib/db';
import { generateInsights } from '../lib/gemini';
import InsightCard from '../components/InsightCard';
import CategoryRing from '../components/CategoryRing';
import SpendingChart from '../components/SpendingChart';
import { currentYM, formatMonth, formatCurrency } from '../lib/format';
import type { Insight } from '../lib/gemini';
import type { CategorySummary, MonthlySummary } from '../types/finance';

export default function InsightsScreen() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [monthlies, setMonthlies] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [txCount, setTxCount] = useState(0);
  const ym = currentYM();

  const loadData = useCallback(async () => {
    const [cat, mon, txs] = await Promise.all([
      getCategorySummary(ym),
      getMonthlySummaries(6),
      getTransactionsByMonth(ym),
    ]);
    setCategories(cat);
    setMonthlies(mon);
    setTxCount(txs.length);
  }, [ym]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const analyze = async () => {
    setLoading(true);
    try {
      const txs = await getTransactionsByMonth(ym);
      const result = await generateInsights(txs, formatMonth(ym));
      setInsights(result);
      setAnalyzed(true);
    } catch (e: any) {
      setInsights([{
        title: 'Analysis unavailable',
        body: e.message ?? 'Could not connect to Gemini. Check your API key in .env.',
        type: 'warning',
      }]);
      setAnalyzed(true);
    } finally {
      setLoading(false);
    }
  };

  const totalExpenses = categories.reduce((s, c) => s + c.total, 0);
  const thisMonth = monthlies[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.month}>{formatMonth(ym)}</Text>
        </View>

        {/* Month snapshot */}
        <View style={styles.snapshot}>
          <SnapStat label="Spent" value={formatCurrency(thisMonth?.expenses ?? 0)} color="#ef4444" />
          <View style={styles.snapDivider} />
          <SnapStat label="Income" value={formatCurrency(thisMonth?.income ?? 0)} color="#10b981" />
          <View style={styles.snapDivider} />
          <SnapStat
            label="Net"
            value={formatCurrency(Math.abs(thisMonth?.net ?? 0))}
            color={(thisMonth?.net ?? 0) >= 0 ? '#10b981' : '#ef4444'}
          />
        </View>

        {/* Spending breakdown */}
        {categories.length > 0 && (
          <CategoryRing data={categories} totalExpenses={totalExpenses} />
        )}
        {monthlies.length > 1 && <SpendingChart data={monthlies} />}

        {/* AI Analysis */}
        <View style={styles.aiSection}>
          <View style={styles.aiHeader}>
            <Text style={styles.aiTitle}>🤖 AI Analysis</Text>
            <Text style={styles.aiSub}>Powered by Gemini</Text>
          </View>

          {!analyzed && !loading && (
            <View style={styles.analyzePrompt}>
              <Text style={styles.analyzeDesc}>
                {txCount > 0
                  ? `Analyze your ${txCount} transactions from ${formatMonth(ym)} and get personalized insights.`
                  : 'Add some transactions first, then come back for AI-powered insights.'}
              </Text>
              <TouchableOpacity
                style={[styles.analyzeBtn, txCount === 0 && styles.analyzeBtnDisabled]}
                onPress={analyze}
                disabled={txCount === 0}
              >
                <Text style={styles.analyzeBtnText}>Analyze This Month</Text>
              </TouchableOpacity>
            </View>
          )}

          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#10b981" />
              <Text style={styles.loadingText}>Gemini is analyzing your spending...</Text>
            </View>
          )}

          {analyzed && insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}

          {analyzed && (
            <TouchableOpacity style={styles.reanalyzeBtn} onPress={() => { setAnalyzed(false); setInsights([]); }}>
              <Text style={styles.reanalyzeBtnText}>Re-analyze</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SnapStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.snapStat}>
      <Text style={[styles.snapVal, { color }]}>{value}</Text>
      <Text style={styles.snapLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080b14' },
  content: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#f9fafb' },
  month: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  snapshot: {
    backgroundColor: '#111827', borderRadius: 16,
    padding: 16, flexDirection: 'row', marginBottom: 12,
  },
  snapStat: { flex: 1, alignItems: 'center' },
  snapVal: { fontSize: 18, fontWeight: '700' },
  snapLabel: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  snapDivider: { width: 1, backgroundColor: '#1f2937' },
  aiSection: { marginTop: 4 },
  aiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  aiTitle: { fontSize: 18, fontWeight: '700', color: '#f9fafb' },
  aiSub: { fontSize: 12, color: '#6b7280' },
  analyzePrompt: {
    backgroundColor: '#111827', borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 14,
  },
  analyzeDesc: { fontSize: 15, color: '#9ca3af', textAlign: 'center', lineHeight: 22 },
  analyzeBtn: {
    backgroundColor: '#10b981', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  analyzeBtnDisabled: { backgroundColor: '#1f2937' },
  analyzeBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  loadingBox: {
    backgroundColor: '#111827', borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 12,
  },
  loadingText: { fontSize: 14, color: '#9ca3af' },
  reanalyzeBtn: { alignItems: 'center', marginTop: 12 },
  reanalyzeBtnText: { fontSize: 14, color: '#6b7280', textDecorationLine: 'underline' },
});
