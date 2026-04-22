# Clarity — Personal Finance App

A full personal finance app built with Expo React Native. Scan receipts and checks with AI, track spending across multiple accounts, set monthly budgets, and get personalized AI-powered insights.

## Features

### 📊 Dashboard
- Net worth across all accounts
- Monthly income vs expenses chart
- Spending breakdown by category
- Budget alerts when you're close to limits
- Quick-add transaction modal

### 📋 Transactions
- Full searchable transaction history
- Filter by type (income/expense) and category
- Grouped by month with totals
- Swipe to delete

### 📷 Smart Scanner
- Point camera at a **receipt** → AI extracts merchant, total, items, category → saves as expense
- Point camera at a **check** → AI detects it automatically → saves as income with payer name and memo
- Powered by GPT-4o mini vision

### 🎯 Budgets
- Set monthly spending goals per category
- Live progress bars (turns red when over budget)
- Push notifications at 90% of budget
- Monthly summary with total budgeted vs spent

### 🤖 AI Insights
- One-tap monthly analysis powered by GPT-4o mini
- Identifies biggest spending categories, recurring charges, savings rate
- Actionable recommendations based on your real data

## Stack

- Expo + React Native + TypeScript
- Expo Router (file-based navigation)
- expo-sqlite (local-first data storage)
- expo-image-picker + expo-camera (receipt/check scanning)
- expo-notifications (budget alerts)
- OpenAI GPT-4o mini (vision + insights)

## Setup

```bash
npm install
npx expo start
```

Create a `.env` file in the root:
```
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_key_here
```
