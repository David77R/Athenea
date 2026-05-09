import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from '../pantallas/login';
import HomeScreen from '../pantallas/home';
import RegistroScreen from '../pantallas/registro';
import FormularioScreen from '../pantallas/formulario';
import GrabacionScreen from '../pantallas/grabacion';
import BuscarPacienteScreen from '../pantallas/buscarPaciente';
import HistorialClinicoScreen from '../pantallas/historialClinico';
import PerfilScreen from '../pantallas/perfil';
import AjustesScreen from '../pantallas/ajustes';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [token, setToken] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function verificarSesion() {
      const tokenGuardado = await AsyncStorage.getItem('token');
      setToken(tokenGuardado);
      setCargando(false);
    }
    verificarSesion();
  }, []);

  if (cargando) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <>
            <Stack.Screen name="Home">
              {(props) => <HomeScreen {...props} setToken={setToken} />}
            </Stack.Screen>
            <Stack.Screen name="Formulario" component={FormularioScreen} />
            <Stack.Screen name="Grabacion" component={GrabacionScreen} />
            <Stack.Screen name="BuscarPaciente" component={BuscarPacienteScreen} />
            <Stack.Screen name="Historial" component={HistorialClinicoScreen} />
            <Stack.Screen name="Perfil" component={PerfilScreen} />
            <Stack.Screen name="Ajustes" component={AjustesScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} setToken={setToken} />}
            </Stack.Screen>
            <Stack.Screen name="Registro">
              {(props) => <RegistroScreen {...props} setToken={setToken} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}