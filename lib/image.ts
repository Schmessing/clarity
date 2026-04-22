import * as ImagePicker from 'expo-image-picker';

export async function pickFromLibrary(): Promise<{ uri: string; base64: string } | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') throw new Error('Photo library permission denied');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    base64: true,
  });
  if (result.canceled || !result.assets[0]) return null;
  return { uri: result.assets[0].uri, base64: result.assets[0].base64 ?? '' };
}

export async function takePhoto(): Promise<{ uri: string; base64: string } | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') throw new Error('Camera permission denied');
  const result = await ImagePicker.launchCameraAsync({ quality: 0.8, base64: true });
  if (result.canceled || !result.assets[0]) return null;
  return { uri: result.assets[0].uri, base64: result.assets[0].base64 ?? '' };
}
