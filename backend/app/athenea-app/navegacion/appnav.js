import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Animaciones      from '../pantallas/animaciones';
import Login            from '../pantallas/login';
import Registro         from '../pantallas/registro';
import Home             from '../pantallas/home';
import Grabacion        from '../pantallas/grabacion';
import Formulario       from '../pantallas/formulario';
import BuscarPaciente   from '../pantallas/buscarPaciente';
import HistorialClinico from '../pantallas/historialClinico';
import Perfil           from '../pantallas/perfil';
import Ajustes          from '../pantallas/ajustes';
import GenerarReceta    from '../pantallas/generarReceta';

import { syncEngine } from '../servicios/syncEngine';
import COLORES from '../constantes/colores';

const Stack = createNativeStackNavigator();

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

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORES.fondo },
          ...transicionSlide,
        }}
      >
        {!token ? (
          
          <>
            <Stack.Screen
              name="Animaciones"
              component={Animaciones}
              options={transicionFade}
            />
            <Stack.Screen name="Login" options={transicionFade}>
              {(props) => <Login {...props} setToken={setToken} />}
            </Stack.Screen>
            <Stack.Screen name="Registro" options={transicionModal}>
              {(props) => <Registro {...props} setToken={setToken} />}
            </Stack.Screen>
          </>
        ) : (

          <>
            <Stack.Screen name="Home" options={transicionFade}>
              {(props) => <Home {...props} setToken={setToken} />}
            </Stack.Screen>
            <Stack.Screen name="Grabacion" component={Grabacion} options={transicionSlide} />
            <Stack.Screen name="Formulario" component={Formulario} options={transicionModal} />
            <Stack.Screen name="BuscarPaciente" options={transicionSlide}>
              {(props) => <BuscarPaciente {...props} setToken={setToken} />}
            </Stack.Screen>
            <Stack.Screen name="HistorialClinico" options={transicionSlide}>
              {(props) => <HistorialClinico {...props} setToken={setToken} />}
            </Stack.Screen>
            <Stack.Screen name="Perfil" options={transicionSlide}>
              {(props) => <Perfil {...props} setToken={setToken} />}
            </Stack.Screen>
            <Stack.Screen name="Ajustes" options={transicionSlide}>
              {(props) => <Ajustes {...props} setToken={setToken} />}
            </Stack.Screen>
            <Stack.Screen name="GenerarReceta" component={GenerarReceta} options={transicionModal} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}