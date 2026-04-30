import React, { useEffect } from 'react';
import AppNavigator from './navegacion/appnav';
import { inicializarDB } from './baseDatosLite/basedatoslt';
import AsyncStorage from '@react-native-async-storage/async-storage';
export default function App() {
  useEffect(() => {
    AsyncStorage.clear();
    inicializarDB();
  }, []);

  return <AppNavigator />;
}