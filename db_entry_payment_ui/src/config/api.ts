import { Platform } from 'react-native';

const localApiHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? `http://${localApiHost}:8090/api/v1`;
