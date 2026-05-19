import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Animaciones     from '../pantallas/animaciones';
import Login           from '../pantallas/login';
import Registro        from '../pantallas/registro';
import Home            from '../pantallas/home';
import Grabacion       from '../pantallas/grabacion';
import Formulario      from '../pantallas/formulario';
import BuscarPaciente  from '../pantallas/buscarPaciente';
import HistorialClinico from '../pantallas/historialClinico';
import Perfil          from '../pantallas/perfil';
import Ajustes         from '../pantallas/ajustes';

import { syncEngine } from '../servicios/syncEngine';
import COLORES from '../constantes/colores';
import GenerarReceta from '../pantallas/generarReceta';
const Stack = createNativeStackNavigator();

// Transiciones personalizadas
const transicionSlide = {
  animation: 'slide_from_right',
  presentation: 'card',
  gestureEnabled: true,
  gestureDirection: 'horizontal',
  animationDuration: 280,
};

const transicionModal = {
  animation: 'slide_from_bottom',
  presentation: 'modal',
  gestureEnabled: true,
  gestureDirection: 'vertical',
  animationDuration: 320,
};

const transicionFade = {
  animation: 'fade',
  animationDuration: 350,
};

export default function AppNav({ token, setToken }) {
  useEffect(() => {
    syncEngine.iniciar();
    return () => syncEngine.detener();
  }, []);

  const pantallaInicial = token ? 'Home' : 'Animaciones';

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={pantallaInicial}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORES.fondo },
          ...transicionSlide,
        }}
      >
        {/* Splash — fade suave */}
        <Stack.Screen
          name="Animaciones"
          component={Animaciones}
          options={transicionFade}
        />

        {/* Auth — slide desde abajo */}
        <Stack.Screen name="Login" options={transicionModal}>
          {(props) => <Login {...props} setToken={setToken} />}
        </Stack.Screen>

        <Stack.Screen name="Registro" options={transicionModal}>
          {(props) => <Registro {...props} setToken={setToken} />}
        </Stack.Screen>

        {/* Home — fade al entrar */}
        <Stack.Screen name="Home" options={transicionFade}>
          {(props) => <Home {...props} setToken={setToken} />}
        </Stack.Screen>

        {/* Pantallas principales — slide horizontal */}
        <Stack.Screen name="Grabacion"       component={Grabacion}       options={transicionSlide} />
        <Stack.Screen name="BuscarPaciente"  component={BuscarPaciente}  options={transicionSlide} />
        <Stack.Screen name="HistorialClinico" component={HistorialClinico} options={transicionSlide} />

        {/* Formulario — slide desde abajo (modal feel) */}
        <Stack.Screen name="Formulario" component={Formulario} options={transicionModal} />

        {/* Perfil y Ajustes — slide horizontal */}
        <Stack.Screen name="Perfil" options={transicionSlide}>
          {(props) => <Perfil {...props} setToken={setToken} />}
        </Stack.Screen>

        <Stack.Screen name="Ajustes" component={Ajustes} options={transicionSlide} />
        <Stack.Screen name="GenerarReceta" component={GenerarReceta} options={transicionModal} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}