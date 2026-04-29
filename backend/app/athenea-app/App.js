import React, { useEffect } from 'react';
import AppNavigator from './navegacion/appnav';
import { inicializarDB } from './baseDatosLite/basedatoslt';

export default function App() {
  useEffect(() => {
    inicializarDB();
  }, []);

  return <AppNavigator />;
}