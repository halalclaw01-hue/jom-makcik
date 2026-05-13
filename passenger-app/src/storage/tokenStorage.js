import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "jom_makcik_passenger_token";

export async function saveToken(token) {
  if (!token) {
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }

  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  return AsyncStorage.removeItem(TOKEN_KEY);
}
