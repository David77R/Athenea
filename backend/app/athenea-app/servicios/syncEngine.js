import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { obtenerHistoriasPendientes, marcarComoSincronizada } from '../baseDatosLite/basedatoslt';
import CONFIG from '../config';

export async function sincronizarPendientes() {
  const estado = await NetInfo.fetch();
  
  if (!estado.isConnected) {
    console.log('Sin conexión a internet para sincronizar');
    return { success: false, message: 'Sin conexión' };
  }

  const pendientes = await obtenerHistoriasPendientes();
  
  if (pendientes.length === 0) {
    return { success: true, message: 'Todo al día' };
  }

  const token = await AsyncStorage.getItem('token');
  let subidos = 0;

  for (const registro of pendientes) {
    try {
      const datosParaSubir = JSON.parse(registro.datos);
      
      const respuesta = await fetch(`${CONFIG.CLINICAL_URL}/historias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(datosParaSubir),
      });

      if (respuesta.ok) {
        await marcarComoSincronizada(registro.id);
        subidos++;
      }
    } catch (error) {
      console.log(`Error sincronizando registro ${registro.id}:`, error);
    }
  }

  return { 
    success: true, 
    message: `Sincronización completada: ${subidos} nuevos registros subidos` 
  };
}