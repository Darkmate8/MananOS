import NetInfo from '@react-native-community/netinfo';

export async function getIsConnected(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected ?? true;
  } catch {
    return true;
  }
}
