import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navegacion/appnav';
import { inicializarDB } from './baseDatosLite/basedatoslt';
import COLORES from './constantes/colores';

export default function App() {
  const [token,    setToken]    = useState(null);
  const [cargando, setCargando] = useState(true);
useEffect(() => {
  async function arrancar() {
    await inicializarDB();
    const t = await AsyncStorage.getItem('token');
    setToken(t);
    setCargando(false);
  }
  arrancar();
}, []);

useEffect(() => {
  console.log('TOKEN EN APP:', token);
}, [token]);

  if (cargando) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORES.fondo }}>
          <ActivityIndicator size="large" color={COLORES.primario} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppNavigator token={token} setToken={setToken} />
    </SafeAreaProvider>
  );
}
