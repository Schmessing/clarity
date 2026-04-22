import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { takePhoto, pickFromLibrary } from '../lib/image';
import { parseReceipt } from '../lib/gemini';
import { insertTransaction, getAccounts } from '../lib/db';
import { EXPENSE_CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS } from '../types/finance';
import { todayISO } from '../lib/format';
import type { ParsedReceipt, Category, Account } from '../types/finance';
import { useCallback } from 'react';

type State = 'idle' | 'scanning' | 'review' | 'saving';

export default function ScanScreen() {
  const [state, setState] = useState<State>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [merchant, setMerchant] = useState('');
  const [total, setTotal] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<Category>('Other');
  const [isCheck, setIsCheck] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    getAccounts().then((a) => { setAccounts(a); if (a.length > 0) setAccountId(a[0].id!); });
  }, []));

  const scan = async (source: 'camera' | 'library') => {
    try {
      setState('scanning');
      const img = source === 'camera' ? await takePhoto() : await pickFromLibrary();
      if (!img) { setState('idle'); return; }
      setImageUri(img.uri);
      const result = await parseReceipt(img.base64);
      setParsed(result);
      setMerchant(result.merchant);
      setTotal(result.total.toFixed(2));
      setDate(result.date);
      setCategory(result.category);
      setIsCheck(result.documentType === 'check');
      setState('review');
    } catch (e: any) {
      Alert.alert('Scan Failed', e.message);
      setState('idle');
    }
  };

  const save = async () => {
    if (!accountId) { Alert.alert('No account found'); return; }
    setState('saving');
    try {
      await insertTransaction({
        accountId,
        amount: parseFloat(total) || 0,
        type: isCheck ? 'income' : 'expense',
        category: isCheck ? 'Income' : category,
        merchant,
        date,
        isRecurring: 0,
        imageUri: imageUri ?? undefined,
        items: JSON.stringify(parsed?.items ?? []),
        createdAt: new Date().toISOString(),
      });
      setState('idle');
      setImageUri(null);
      setParsed(null);
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Save Failed', e.message);
      setState('review');
    }
  };

  const reset = () => { setState('idle'); setImageUri(null); setParsed(null); setIsCheck(false); };

  if (state === 'idle') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.idleContainer}>
          <Text style={styles.title}>Scan Receipt</Text>
          <Text style={styles.subtitle}>Gemini AI extracts all details automatically</Text>
          <View style={styles.options}>
            <TouchableOpacity style={styles.optionBtn} onPress={() => scan('camera')}>
              <Text style={styles.optionIcon}>📷</Text>
              <Text style={styles.optionLabel}>Camera</Text>
              <Text style={styles.optionSub}>Take a photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionBtn, styles.optionBtnAlt]} onPress={() => scan('library')}>
              <Text style={styles.optionIcon}>🖼️</Text>
              <Text style={styles.optionLabel}>Library</Text>
              <Text style={styles.optionSub}>Pick existing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'scanning') {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingTitle}>Reading Document</Text>
        <Text style={styles.loadingText}>AI is analyzing your receipt or check...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.reviewContent}>
        <View style={styles.reviewHeader}>
          <Text style={styles.title}>{isCheck ? '💰 Check Detected' : 'Review Receipt'}</Text>
          <TouchableOpacity onPress={reset}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        </View>

        {isCheck && (
          <View style={styles.checkBanner}>
            <Text style={styles.checkBannerText}>
              ✅  This will be added as income to your account
            </Text>
            {parsed?.memo && (
              <Text style={styles.checkMemo}>Memo: {parsed.memo}</Text>
            )}
          </View>
        )}

        {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />}

        <View style={styles.form}>
          <Label>Merchant</Label>
          <TextInput style={styles.input} value={merchant} onChangeText={setMerchant} placeholderTextColor="#4b5563" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Label>Total ($)</Label>
              <TextInput style={styles.input} value={total} onChangeText={setTotal} keyboardType="decimal-pad" placeholderTextColor="#4b5563" />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Label>Date</Label>
              <TextInput style={styles.input} value={date} onChangeText={setDate} placeholderTextColor="#4b5563" />
            </View>
          </View>

          {!isCheck && (
            <>
              <Label>Category</Label>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {EXPENSE_CATEGORIES.map((cat) => {
                  const active = category === cat;
                  const color = CATEGORY_COLORS[cat];
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catChip, active && { borderColor: color, backgroundColor: color + '22' }]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={styles.catIcon}>{CATEGORY_ICONS[cat]}</Text>
                      <Text style={[styles.catLabel, active && { color }]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {accounts.length > 1 && (
            <>
              <Label>Account</Label>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {accounts.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.catChip, accountId === a.id && { borderColor: a.color, backgroundColor: a.color + '22' }]}
                    onPress={() => setAccountId(a.id!)}
                  >
                    <Text style={[styles.catLabel, accountId === a.id && { color: a.color }]}>{a.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {parsed && parsed.items.length > 0 && (
            <View style={styles.itemsBox}>
              <Text style={styles.itemsTitle}>Items ({parsed.items.length})</Text>
              {parsed.items.map((item, i) => (
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, state === 'saving' && { opacity: 0.6 }]}
          onPress={save}
          disabled={state === 'saving'}
        >
          {state === 'saving'
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>{isCheck ? '💰 Add Income' : 'Save Expense'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080b14' },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  idleContainer: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#f9fafb', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 32 },
  options: { gap: 12 },
  optionBtn: {
    backgroundColor: '#0d1f1a', borderRadius: 18, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: '#064e3b', gap: 6,
  },
  optionBtnAlt: { backgroundColor: '#111827', borderColor: '#1f2937' },
  optionIcon: { fontSize: 40, marginBottom: 4 },
  optionLabel: { fontSize: 20, fontWeight: '700', color: '#f9fafb' },
  optionSub: { fontSize: 14, color: '#6b7280' },
  loadingTitle: { fontSize: 20, fontWeight: '600', color: '#f9fafb' },
  loadingText: { fontSize: 14, color: '#6b7280' },
  reviewContent: { paddingBottom: 40 },
  reviewHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
  },
  cancelText: { fontSize: 16, color: '#10b981' },
  preview: { height: 200, marginHorizontal: 16, borderRadius: 14, marginBottom: 16 },
  form: { paddingHorizontal: 16 },
  row: { flexDirection: 'row' },
  label: {
    fontSize: 12, color: '#6b7280', fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  input: {
    backgroundColor: '#111827', borderRadius: 10, padding: 13,
    color: '#f9fafb', fontSize: 15, borderWidth: 1, borderColor: '#1f2937', marginBottom: 16,
  },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#1f2937', backgroundColor: '#111827', marginRight: 8,
  },
  catIcon: { fontSize: 14 },
  catLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  itemsBox: { backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 16 },
  itemsTitle: { fontSize: 13, color: '#6b7280', fontWeight: '600', marginBottom: 8 },
  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#1f2937',
  },
  itemName: { flex: 1, fontSize: 14, color: '#d1d5db', marginRight: 12 },
  itemPrice: { fontSize: 14, color: '#9ca3af', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#10b981', borderRadius: 14,
    padding: 16, margin: 16, alignItems: 'center',
  },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  checkBanner: {
    backgroundColor: '#064e3b', borderRadius: 12,
    padding: 14, marginHorizontal: 16, marginBottom: 12,
    borderLeftWidth: 3, borderLeftColor: '#10b981',
  },
  checkBannerText: { fontSize: 14, color: '#6ee7b7', fontWeight: '600' },
  checkMemo: { fontSize: 13, color: '#34d399', marginTop: 4 },
});
