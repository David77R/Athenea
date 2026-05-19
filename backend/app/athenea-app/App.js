import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import AppNavigator from './navegacion/appnav';
import { inicializarDB } from './baseDatosLite/basedatoslt';
import COLORES from './constantes/colores';

export default function App() {
  const [token, setToken] = useState(null);
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

  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORES.fondo }}>
        <ActivityIndicator size="large" color={COLORES.primario} />
      </View>
    );
  }

  return <AppNavigator token={token} setToken={setToken} />;
}
