import React, { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './navegacion/appnav';
import { inicializarDB } from './baseDatosLite/basedatoslt';
import { iniciarAutoSync, detenerAutoSync } from './servicios/syncEngine';

export default function App() {
  useEffect(() => {
    inicializarDB();
    iniciarAutoSync();
    return () => detenerAutoSync();
  }, []);

  return <AppNavigator />;
}