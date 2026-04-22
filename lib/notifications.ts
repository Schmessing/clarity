import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function sendBudgetAlert(category: string, spent: number, budget: number): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Budget Alert: ${category}`,
      body: `You've used ${Math.round((spent / budget) * 100)}% of your $${budget.toFixed(0)} budget ($${spent.toFixed(2)} spent).`,
    },
    trigger: null,
  });
}
