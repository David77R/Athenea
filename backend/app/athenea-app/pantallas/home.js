import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Platform, StatusBar, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DrawerMenu from '../componentes/drawerMenu';
import {
  obtenerTodasLasHistorias,
  obtenerHistoriasPendientes,
  marcarComoSincronizada,
} from '../baseDatosLite/basedatoslt';
import CONFIG from '../config';
import COLORES from '../constantes/colores';
import { useAlerta } from '../componentes/AlertaPersonalizada';

const { width } = Dimensions.get('window');

const DIAS_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function getDiaIndex(fecha) {
  const d = fecha.getDay();
  return d === 0 ? 6 : d - 1;
}

function actividadSemana(historias) {
  const hoy        = new Date();
  const diaHoyIdx  = getDiaIndex(hoy);
  const inicioSem  = new Date(hoy);
  inicioSem.setDate(hoy.getDate() - diaHoyIdx);
  inicioSem.setHours(0, 0, 0, 0);

  const dias = [0, 0, 0, 0, 0, 0, 0];
  historias.forEach(h => {
    if (!h.creado_en) return;
    const f = new Date(h.creado_en);
    if (f >= inicioSem && f <= hoy) {
      dias[getDiaIndex(f)]++;
    }
  });
  return dias;
}

function esHoy(fechaStr) {
  if (!fechaStr) return false;
  const hoy = new Date();
  const f   = new Date(fechaStr);
  return f.getDate()     === hoy.getDate()     &&
         f.getMonth()    === hoy.getMonth()    &&
         f.getFullYear() === hoy.getFullYear();
}

function formatearFechaHoy() {
  const hoy    = new Date();
  const dias   = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses  = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${dias[hoy.getDay()]}, ${hoy.getDate()} de ${meses[hoy.getMonth()]}`;
}

async function sincronizarAhora() {
  try {
    const token      = await AsyncStorage.getItem('token');
    const email      = await AsyncStorage.getItem('email') || '';
    const pendientes = await obtenerHistoriasPendientes();

    if (pendientes.length === 0) {
      return { success: true, message: 'No hay historias pendientes de sincronizar.' };
    }

    let subidas  = 0;
    let fallidas = 0;

    for (const fila of pendientes) {
      try {
        const historia = JSON.parse(fila.datos);
        const { paciente, anamnesis, examen, especializado, diagnostico } = historia;

        const resp = await fetch(`${CONFIG.CLINICAL_URL}/historias`, {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${token}`,
          },
          body: JSON.stringify({
            especialista_email:   email,
            paciente: {
              nombre:          paciente?.nombre          || '',
              cedula:          paciente?.cedula          || '',
              fecha_nacimiento: paciente?.fechaNac       || null,
              telefono:        paciente?.telefono        || '',
            },
            motivo_consulta:      anamnesis?.motivo      || '',
            agudeza_visual: {
              ojo_derecho:   examen?.avscOD || '',
              ojo_izquierdo: examen?.avscOI || '',
            },
            refraccion: {
              ojo_derecho:   {
                esferico:   parseFloat(examen?.esfOD) || 0,
                cilindrico: parseFloat(examen?.cilOD) || 0,
                eje:        parseFloat(examen?.ejeOD) || 0,
                adicion:    parseFloat(examen?.addOD) || 0,
              },
              ojo_izquierdo: {
                esferico:   parseFloat(examen?.esfOI) || 0,
                cilindrico: parseFloat(examen?.cilOI) || 0,
                eje:        parseFloat(examen?.ejeOI) || 0,
                adicion:    parseFloat(examen?.addOI) || 0,
              },
            },
            presion_intraocular: {
              ojo_derecho:   parseFloat(examen?.pioOD) || 0,
              ojo_izquierdo: parseFloat(examen?.pioOI) || 0,
            },
            examen_especializado: {
              tonometria:          especializado?.tonometria          || '',
              lensometria:         especializado?.lensometria         || '',
              autorrefractometria: especializado?.autorrefractometria || '',
              oftalmoscopio:       especializado?.oftalmoscopio       || '',
              derivacion:          especializado?.derivacion          || '',
            },
            diagnostico:   diagnostico?.diagPrincipal || '',
            tratamiento:   diagnostico?.prescripcion  || '',
            observaciones: diagnostico?.observaciones || '',
          }),
        });

        if (resp.ok) {
          await marcarComoSincronizada(fila.id);
          subidas++;
        } else {
          fallidas++;
        }
      } catch {
        fallidas++;
      }
    }

    const ahora = new Date().toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    await AsyncStorage.setItem('ultima_sincronizacion', ahora);

    if (fallidas === 0) {
      return {
        success: true,
        message: `${subidas} historia(s) sincronizada(s) correctamente.`,
      };
    } else if (subidas > 0) {
      return {
        success: false,
        message: `${subidas} sincronizadas, ${fallidas} fallaron. Intenta de nuevo más tarde.`,
      };
    } else {
      return {
        success: false,
        message: `No se pudo sincronizar. Verifica tu conexión e intenta de nuevo.`,
      };
    }
  } catch {
    return {
      success: false,
      message: 'Error inesperado al sincronizar. Verifica tu conexión.',
    };
  }
}

export default function HomeScreen({ navigation, setToken }) {
  const insets = useSafeAreaInsets();
  const { mostrar, AlertaPersonalizada } = useAlerta();
  const [nombreUsuario,  setNombreUsuario]  = useState('');
  const [email,          setEmail]          = useState('');
  const [drawerVisible,  setDrawerVisible]  = useState(false);
  const [modalNueva,     setModalNueva]     = useState(false);
  const [stats,          setStats]          = useState({ pacientes: 0, hoy: 0, pendientes: 0, ultimaSync: '' });
  const [semana,         setSemana]         = useState([0, 0, 0, 0, 0, 0, 0]);
  const [ultimaConsulta, setUltimaConsulta] = useState(null);
  const [sincronizando,  setSincronizando]  = useState(false);

  const timerSync = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  // Timer de sincronización automática cada 60 segundos.
  // Solo corre si hay pendientes, para no hacer requests innecesarios.
  useEffect(() => {
    timerSync.current = setInterval(async () => {
      const pendientes = await obtenerHistoriasPendientes();
      if (pendientes.length > 0) {
        await sincronizarAhora();
        await cargarDatos();
      }
    }, 60 * 1000);

    return () => {
      if (timerSync.current) clearInterval(timerSync.current);
    };
  }, []);

  async function cargarDatos() {
    const n = await AsyncStorage.getItem('nombre');
    const e = await AsyncStorage.getItem('email');
    const s = await AsyncStorage.getItem('ultima_sincronizacion');

    if (n) setNombreUsuario(n);
    if (e) setEmail(e);

    const todas      = await obtenerTodasLasHistorias();
    const pendientes = await obtenerHistoriasPendientes();

    const cedulas = new Set(todas.map(h => {
      try { return JSON.parse(h.datos)?.paciente?.cedula || h.id; } catch { return h.id; }
    }));

    const hoy = todas.filter(h => esHoy(h.creado_en)).length;
    setSemana(actividadSemana(todas));
    setStats({
      pacientes:  cedulas.size,
      hoy,
      pendientes: pendientes.length,
      ultimaSync: s || 'Nunca',
    });

    if (todas.length > 0) {
      try {
        const datos = JSON.parse(todas[0].datos);
        setUltimaConsulta({
          nombre:  datos.paciente?.nombre,
          cedula:  datos.paciente?.cedula,
          fecha:   todas[0].creado_en,
          motivo:  datos.anamnesis?.motivo || '',
        });
      } catch {}
    }
  }

  async function handleSincronizar() {
    if (sincronizando) return;
    setSincronizando(true);
    try {
      const resultado = await sincronizarAhora();
      await cargarDatos();
      mostrar({
        tipo:    resultado.success ? 'exito' : 'error',
        titulo:  resultado.success ? '¡Sincronizado!' : 'Error al sincronizar',
        mensaje: resultado.message,
        icono:   resultado.success ? 'cloud-done-outline' : 'cloud-offline-outline',
        boton:   'Entendido',
      });
    } finally {
      setSincronizando(false);
    }
  }

  const paddingTop   = Platform.OS === 'android' ? 48 : 10;
  const maxSemana    = Math.max(...semana, 1);
  const inicial      = nombreUsuario ? nombreUsuario.charAt(0).toUpperCase() : 'A';
  const diaHoyIdx    = getDiaIndex(new Date());

  const horaActual   = new Date().getHours();
  const saludo       = horaActual < 12 ? 'Buenos días' : horaActual < 18 ? 'Buenas tardes' : 'Buenas noches';
  const fechaHoy     = formatearFechaHoy();

  return (
    <View style={styles.raiz}>
      <StatusBar barStyle="light-content" backgroundColor={COLORES.oscuro} />

      {/* ── Header ── */}
      <LinearGradient
        colors={[COLORES.gradienteInicio, COLORES.gradienteMedio]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: paddingTop + 12 }]}
      >
        <View style={styles.headerFila}>
          <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuBtn}>
            <Ionicons name="menu" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCentro}>
            <Text style={styles.headerTitulo}>ATHENEA</Text>
            <Text style={styles.headerSub}>{fechaHoy}</Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Perfil')}>
            <Text style={styles.avatarTexto}>{inicial}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Saludo */}
        <View style={styles.saludoArea}>
          <Text style={styles.saludoTexto}>{saludo},</Text>
          <View style={styles.saludoNombreFila}>
            <Text style={styles.saludoNombre}>{nombreUsuario || 'Especialista'}</Text>
            <View style={styles.iconoMedico}>
              <Ionicons name="eye-outline" size={18} color={COLORES.primario} />
            </View>
          </View>
          <Text style={styles.saludoSub}>Panel de control</Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icono="people-outline"
            valor={stats.pacientes > 0 ? stats.pacientes : '--'}
            label="Pacientes"
            color={COLORES.primario}
            bg={COLORES.secundario}
            onPress={() => navigation.navigate('HistorialClinico')}
          />
          <StatCard
            icono="today-outline"
            valor={stats.hoy}
            label="Hoy"
            color={COLORES.info}
            bg="#E3F2FD"
            onPress={() => navigation.navigate('HistorialClinico')}
          />
          <StatCard
            icono="cloud-upload-outline"
            valor={stats.pendientes}
            label="Pendientes"
            color={stats.pendientes > 0 ? COLORES.advertencia : COLORES.exito}
            bg={stats.pendientes > 0 ? '#FFF3E0' : '#E8F5E9'}
            onPress={() => navigation.navigate('Ajustes')}
          />
        </View>

        {/* Nueva historia — hero card */}
        <TouchableOpacity
          style={styles.heroCard}
          onPress={() => setModalNueva(true)}
          activeOpacity={0.92}
        >
          <LinearGradient
            colors={[COLORES.gradienteInicio, COLORES.gradienteMedio, COLORES.gradienteFin]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.heroGrad}
          >
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitulo}>Nueva Historia</Text>
              <Text style={styles.heroSub}>Grabar con Athenea IA</Text>
              <View style={styles.heroBadge}>
                <Ionicons name="mic" size={11} color="#fff" />
                <Text style={styles.heroBadgeTexto}>Completación automática</Text>
              </View>
            </View>
            <View style={styles.heroIconCaja}>
              <Ionicons name="eye" size={44} color="rgba(255,255,255,0.55)" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Gráfico semanal */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bar-chart-outline" size={16} color={COLORES.primario} />
            <Text style={styles.cardTitulo}>Actividad semanal</Text>
            <Text style={styles.cardSubtitulo}>Esta semana</Text>
          </View>
          <View style={styles.grafico}>
            {semana.map((val, i) => {
              const altura   = Math.max((val / maxSemana) * 80, 4);
              const esHoyBar = i === diaHoyIdx;
              return (
                <View key={i} style={styles.barraCol}>
                  {val > 0 && <Text style={styles.barraNum}>{val}</Text>}
                  <View style={styles.barraFondo}>
                    <LinearGradient
                      colors={esHoyBar
                        ? [COLORES.gradienteMedio, COLORES.gradienteFin]
                        : [COLORES.secundario, COLORES.borde]}
                      style={[styles.barra, { height: altura }]}
                    />
                  </View>
                  <Text style={[styles.diaLabel, esHoyBar && { color: COLORES.primario, fontWeight: '700' }]}>
                    {DIAS_LABELS[i]}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.syncTexto}>
            Última sync: {stats.ultimaSync}
          </Text>
        </View>

        {/* Última consulta */}
        {ultimaConsulta && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="time-outline" size={16} color={COLORES.primario} />
              <Text style={styles.cardTitulo}>Última consulta</Text>
            </View>
            <TouchableOpacity
              style={styles.ultimaFila}
              onPress={() => navigation.navigate('HistorialClinico', { cedula: ultimaConsulta.cedula })}
              activeOpacity={0.8}
            >
              <View style={styles.ultimaAvatar}>
                <Text style={styles.ultimaAvatarTexto}>
                  {ultimaConsulta.nombre?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ultimaNombre}>{ultimaConsulta.nombre || 'Paciente'}</Text>
                {ultimaConsulta.motivo ? (
                  <Text style={styles.ultimaMotivo} numberOfLines={1}>{ultimaConsulta.motivo}</Text>
                ) : (
                  <Text style={styles.ultimaSub}>CI: {ultimaConsulta.cedula}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORES.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}

        {/* Acciones rápidas */}
        <Text style={styles.seccionTitulo}>Acciones rápidas</Text>
        <View style={styles.accionesGrid}>
          <AccionCard icono="mic-outline"           label="Nueva Historia" color={COLORES.primario}    bg={COLORES.secundario} onPress={() => setModalNueva(true)} />
          <AccionCard icono="document-text-outline" label="Historial"      color={COLORES.info}        bg="#E3F2FD"            onPress={() => navigation.navigate('HistorialClinico')} />
          <AccionCard icono="search-outline"        label="Buscar"         color="#7B1FA2"             bg="#F3E5F5"            onPress={() => navigation.navigate('BuscarPaciente')} />
          <AccionCard icono="receipt-outline"       label="Receta PDF"     color={COLORES.advertencia} bg="#FFF3E0"            onPress={() => navigation.navigate('GenerarReceta', { historia: null })} />
        </View>

        {/* Banner sync */}
        <View style={[styles.syncBanner, stats.pendientes > 0 && styles.syncBannerAlerta]}>
          <View style={[styles.syncPunto, { backgroundColor: stats.pendientes > 0 ? COLORES.advertencia : COLORES.exito }]} />
          <Text style={[styles.syncBannerTexto, stats.pendientes > 0 && { color: COLORES.advertencia }]}>
            {stats.pendientes > 0
              ? `${stats.pendientes} historia(s) pendiente(s) de sincronizar`
              : 'Conectado · Sincronización activa'}
          </Text>
          {stats.pendientes > 0 && (
            <TouchableOpacity onPress={handleSincronizar} disabled={sincronizando}>
              <Text style={[styles.syncLink, sincronizando && { opacity: 0.5 }]}>
                {sincronizando ? 'Subiendo...' : 'Sincronizar'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ── Modal Nueva Historia ── */}
      <Modal visible={modalNueva} transparent animationType="fade" onRequestClose={() => setModalNueva(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCaja, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalBarra} />
            <Text style={styles.modalTitulo}>Nueva Historia Clínica</Text>
            <Text style={styles.modalSub}>¿Cómo deseas registrar la consulta?</Text>

            <TouchableOpacity
              style={styles.modalOpcion}
              onPress={() => { setModalNueva(false); navigation.navigate('Grabacion'); }}
            >
              <LinearGradient
                colors={[COLORES.primario, COLORES.gradienteFin]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.modalOpcionGrad}
              >
                <View style={styles.modalOpcionIcon}>
                  <Ionicons name="mic" size={28} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalOpcionTitulo}>Grabar con Athenea IA</Text>
                  <Text style={styles.modalOpcionSub}>Dictado por voz · Rellena automáticamente</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOpcion, { marginTop: 10 }]}
              onPress={() => { setModalNueva(false); navigation.navigate('Formulario'); }}
            >
              <View style={styles.modalOpcionManual}>
                <View style={[styles.modalOpcionIcon, { backgroundColor: COLORES.secundario }]}>
                  <Ionicons name="create-outline" size={28} color={COLORES.primario} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalOpcionTitulo, { color: COLORES.oscuro }]}>Ingresar manualmente</Text>
                  <Text style={[styles.modalOpcionSub, { color: COLORES.mutedForeground }]}>Formulario paso a paso</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORES.mutedForeground} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelar} onPress={() => setModalNueva(false)}>
              <Text style={styles.modalCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <AlertaPersonalizada />

      {/* ── Drawer ── */}
      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        setToken={setToken}
        nombreUsuario={nombreUsuario}
        email={email}
        pantallaActual="Home"
      />
    </View>
  );
}

function StatCard({ icono, valor, label, color, bg, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: bg }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.statIconCaja, { backgroundColor: color + '22' }]}>
        <Ionicons name={icono} size={18} color={color} />
      </View>
      <Text style={[styles.statValor, { color }]}>{valor}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function AccionCard({ icono, label, color, bg, onPress }) {
  return (
    <TouchableOpacity style={[styles.accionCard, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.accionIconCaja, { backgroundColor: color + '22' }]}>
        <Ionicons name={icono} size={24} color={color} />
      </View>
      <Text style={[styles.accionLabel, { color: COLORES.foreground }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  raiz:   { flex: 1, backgroundColor: COLORES.fondo },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerFila:   { flexDirection: 'row', alignItems: 'center' },
  menuBtn:      { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerCentro: { flex: 1, alignItems: 'center' },
  headerTitulo: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 4 },
  headerSub:    { fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.3, marginTop: 2 },
  avatar:       { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORES.oscuro, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  avatarTexto:  { fontSize: 16, fontWeight: '700', color: '#fff' },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16 },

  saludoArea:       { marginBottom: 20 },
  saludoTexto:      { fontSize: 15, color: COLORES.mutedForeground, fontWeight: '500' },
  saludoNombreFila: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  saludoNombre:     { fontSize: 28, fontWeight: '800', color: COLORES.oscuro },
  saludoSub:        { fontSize: 13, color: COLORES.mutedForeground, marginTop: 2 },
  iconoMedico:      { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORES.secundario, justifyContent: 'center', alignItems: 'center' },

  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard:  { flex: 1, borderRadius: 18, padding: 14, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 1 } },
  statIconCaja: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValor:    { fontSize: 22, fontWeight: '800' },
  statLabel:    { fontSize: 11, color: COLORES.mutedForeground, marginTop: 2, fontWeight: '600' },

  heroCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 16, elevation: 6, shadowColor: COLORES.primario, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
  heroGrad: { padding: 24, flexDirection: 'row', alignItems: 'center' },
  heroInfo: { flex: 1 },
  heroTitulo:     { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroSub:        { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, marginBottom: 14 },
  heroBadge:      { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 5 },
  heroBadgeTexto: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  heroIconCaja:   { width: 72, height: 72, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 24, justifyContent: 'center', alignItems: 'center' },

  card:       { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 1 } },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitulo: { fontSize: 14, fontWeight: '700', color: COLORES.oscuro, flex: 1 },
  cardSubtitulo: { fontSize: 11, color: COLORES.mutedForeground, fontWeight: '500' },

  grafico:    { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, marginBottom: 8 },
  barraCol:   { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barraFondo: { width: '60%', alignItems: 'center' },
  barra:      { width: '100%', borderRadius: 6 },
  barraNum:   { fontSize: 9, color: COLORES.primario, fontWeight: '700', marginBottom: 2 },
  diaLabel:   { fontSize: 10, color: COLORES.mutedForeground, marginTop: 4 },
  syncTexto:  { fontSize: 10, color: COLORES.mutedForeground, textAlign: 'right', marginTop: 4 },

  ultimaFila:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ultimaAvatar:      { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORES.secundario, justifyContent: 'center', alignItems: 'center' },
  ultimaAvatarTexto: { fontSize: 20, fontWeight: '700', color: COLORES.primario },
  ultimaNombre:      { fontSize: 15, fontWeight: '700', color: COLORES.oscuro },
  ultimaSub:         { fontSize: 12, color: COLORES.mutedForeground, marginTop: 2 },
  ultimaMotivo:      { fontSize: 12, color: COLORES.mutedForeground, marginTop: 2, fontStyle: 'italic' },

  seccionTitulo: { fontSize: 16, fontWeight: '700', color: COLORES.oscuro, marginBottom: 12 },
  accionesGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  accionCard:    { width: (width - 52) / 2, borderRadius: 18, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } },
  accionIconCaja: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  accionLabel:   { fontSize: 14, fontWeight: '600' },

  syncBanner:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', borderRadius: 14, padding: 12, gap: 8 },
  syncBannerAlerta: { backgroundColor: '#FFF8E1' },
  syncPunto:        { width: 8, height: 8, borderRadius: 4 },
  syncBannerTexto:  { flex: 1, fontSize: 12, color: COLORES.exito, fontWeight: '600' },
  syncLink:         { fontSize: 12, color: COLORES.primario, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(13,59,68,0.7)', justifyContent: 'flex-end' },
  modalCaja:    { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  modalBarra:   { width: 50, height: 5, backgroundColor: COLORES.borde, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalTitulo:  { fontSize: 20, fontWeight: '800', color: COLORES.oscuro, marginBottom: 4 },
  modalSub:     { fontSize: 13, color: COLORES.mutedForeground, marginBottom: 20 },

  modalOpcion:       { borderRadius: 18, overflow: 'hidden' },
  modalOpcionGrad:   { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  modalOpcionManual: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, backgroundColor: COLORES.muted, borderRadius: 18 },
  modalOpcionIcon:   { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  modalOpcionTitulo: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  modalOpcionSub:    { fontSize: 12, color: 'rgba(255,255,255,0.75)' },

  modalCancelar:      { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
  modalCancelarTexto: { fontSize: 14, color: COLORES.mutedForeground, fontWeight: '600' },
});