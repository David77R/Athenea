import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Animaciones from '../pantallas/animaciones';
import Login from '../pantallas/login';
import Registro from '../pantallas/registro';
import Home from '../pantallas/home';
import Grabacion from '../pantallas/grabacion';
import Formulario from '../pantallas/formulario';
import BuscarPaciente from '../pantallas/buscarPaciente';
import HistorialClinico from '../pantallas/historialClinico';
import Perfil from '../pantallas/perfil';
import Ajustes from '../pantallas/ajustes';

import { syncEngine } from '../servicios/syncEngine';

const Stack = createNativeStackNavigator();

export default function AppNav() {
  useEffect(() => {
    syncEngine.iniciar();
    return () => syncEngine.detener();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Animaciones"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Animaciones" component={Animaciones} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Registro" component={Registro} />
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Grabacion" component={Grabacion} />
        <Stack.Screen name="Formulario" component={Formulario} />
        <Stack.Screen name="BuscarPaciente" component={BuscarPaciente} />
        <Stack.Screen
          name="HistorialClinico"
          component={HistorialClinico}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Perfil"
          component={Perfil}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Ajustes"
          component={Ajustes}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}