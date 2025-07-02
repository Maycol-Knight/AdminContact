/**
 * 🎯 SISTEMA DE ESTADO CENTRALIZADO
 * Reemplaza todas las variables globales dispersas por un estado único y reactivo
 */

class AppState {
    constructor() {
        // 📊 Estado principal de la aplicación
        this.state = {
            // Datos de contactos
            contactos: [],
            contactosFiltrados: [],

            // Estado de la UI
            vistaActual: 'lista', // 'lista' | 'formulario'
            modoEdicion: false,
            contactoEditando: null,
            contactoAEliminar: null,

            // Búsqueda
            terminoBusqueda: '',

            // UI temporal
            notificacionVisible: false,
            modalVisible: false
        };

        // 🔔 Sistema de observadores para reactividad
        this.observers = {};

        // 💾 Configuración de persistencia
        this.storageKey = 'adminContactos';

        // 🚀 Inicializar estado
        this.init();
    }

    /**
     * 🔄 Inicialización del estado
     */
    async init() {
        try {
            await this.cargarContactosDesdeStorage();
            this.notify('app:initialized', this.state);
        } catch (error) {
            console.error('Error al inicializar AppState:', error);
            this.cargarContactosDefault();
        }
    }

    /**
     * 🔔 Sistema de observadores (patrón Observer)
     */
    subscribe(evento, callback) {
        if (!this.observers[evento]) {
            this.observers[evento] = [];
        }
        this.observers[evento].push(callback);

        // Retornar función para desuscribirse
        return () => {
            const index = this.observers[evento].indexOf(callback);
            if (index > -1) {
                this.observers[evento].splice(index, 1);
            }
        };
    }

    notify(evento, data) {
        if (this.observers[evento]) {
            this.observers[evento].forEach(callback => {
                try {
                    callback(data, this.state);
                } catch (error) {
                    console.error(`Error en observer de ${evento}:`, error);
                }
            });
        }
    }

    /**
     * 📝 Métodos para gestionar contactos
     */
    setContactos(contactos) {
        this.state.contactos = [...contactos];
        this.state.contactosFiltrados = [...contactos];
        this.guardarEnStorage();
        this.notify('contactos:updated', this.state.contactos);
        this.notify('contactos:filtered', this.state.contactosFiltrados);
    }

    agregarContacto(contacto) {
        const nuevoContacto = {
            ...contacto,
            id: contacto.id || this.generarId()
        };

        this.state.contactos.push(nuevoContacto);
        this.aplicarFiltroActual();
        this.guardarEnStorage();

        this.notify('contacto:agregado', nuevoContacto);
        this.notify('contactos:updated', this.state.contactos);
        return nuevoContacto;
    }

    actualizarContacto(id, datosActualizados) {
        const index = this.state.contactos.findIndex(c => c.id === id);
        if (index !== -1) {
            this.state.contactos[index] = { ...this.state.contactos[index], ...datosActualizados };
            this.aplicarFiltroActual();
            this.guardarEnStorage();

            this.notify('contacto:actualizado', this.state.contactos[index]);
            this.notify('contactos:updated', this.state.contactos);
            return this.state.contactos[index];
        }
        return null;
    }

    eliminarContacto(id) {
        const contacto = this.state.contactos.find(c => c.id === id);
        if (contacto) {
            this.state.contactos = this.state.contactos.filter(c => c.id !== id);
            this.aplicarFiltroActual();
            this.guardarEnStorage();

            this.notify('contacto:eliminado', contacto);
            this.notify('contactos:updated', this.state.contactos);
            return contacto;
        }
        return null;
    }

    obtenerContacto(id) {
        return this.state.contactos.find(c => c.id === id);
    }

    /**
     * 🔍 Métodos de búsqueda y filtrado
     */
    filtrarContactos(termino = '') {
        this.state.terminoBusqueda = termino.toLowerCase().trim();
        this.aplicarFiltroActual();
        this.notify('busqueda:realizada', this.state.terminoBusqueda);
        this.notify('contactos:filtered', this.state.contactosFiltrados);
    }

    aplicarFiltroActual() {
        if (!this.state.terminoBusqueda) {
            this.state.contactosFiltrados = [...this.state.contactos];
        } else {
            this.state.contactosFiltrados = this.state.contactos.filter(contacto =>
                contacto.nombre.toLowerCase().includes(this.state.terminoBusqueda) ||
                contacto.telefono.includes(this.state.terminoBusqueda) ||
                contacto.email.toLowerCase().includes(this.state.terminoBusqueda)
            );
        }
    }

    limpiarBusqueda() {
        this.state.terminoBusqueda = '';
        this.state.contactosFiltrados = [...this.state.contactos];
        this.notify('busqueda:limpiada', '');
        this.notify('contactos:filtered', this.state.contactosFiltrados);
    }

    /**
     * 🎨 Métodos para gestionar la UI
     */
    cambiarVista(vista) {
        const vistaAnterior = this.state.vistaActual;
        this.state.vistaActual = vista;

        // Limpiar estados relacionados con la vista anterior
        if (vista === 'lista') {
            this.state.modoEdicion = false;
            this.state.contactoEditando = null;
        }

        this.notify('vista:cambiada', { anterior: vistaAnterior, actual: vista });
    }

    activarModoEdicion(contacto) {
        this.state.modoEdicion = true;
        this.state.contactoEditando = contacto;
        this.notify('edicion:activada', contacto);
    }

    desactivarModoEdicion() {
        this.state.modoEdicion = false;
        this.state.contactoEditando = null;
        this.notify('edicion:desactivada', null);
    }

    prepararEliminacion(contactoId) {
        this.state.contactoAEliminar = contactoId;
        this.state.modalVisible = true;
        this.notify('eliminacion:preparada', contactoId);
    }

    cancelarEliminacion() {
        this.state.contactoAEliminar = null;
        this.state.modalVisible = false;
        this.notify('eliminacion:cancelada', null);
    }

    /**
     * 💾 Métodos de persistencia
     */
    async cargarContactosDesdeStorage() {
        try {
            const contactosGuardados = localStorage.getItem(this.storageKey);
            if (contactosGuardados) {
                const contactos = JSON.parse(contactosGuardados);
                this.setContactos(contactos);
                return contactos;
            } else {
                this.cargarContactosDefault();
                return this.state.contactos;
            }
        } catch (error) {
            console.error('Error al cargar contactos desde localStorage:', error);
            this.cargarContactosDefault();
            throw error;
        }
    }

    guardarEnStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state.contactos));
            this.notify('storage:guardado', this.state.contactos);
        } catch (error) {
            console.error('Error al guardar contactos en localStorage:', error);
            this.notify('storage:error', error);
        }
    }

    cargarContactosDefault() {
        const contactosDefault = [
            { id: '1', nombre: 'Ana Torres', telefono: '987654321', email: 'ana.t@example.com' },
            { id: '2', nombre: 'Luis Morales', telefono: '912345678', email: 'luis.m@example.com' },
            { id: '3', nombre: 'Carla Diaz', telefono: '998877665', email: 'carla.d@example.com' }
        ];
        this.setContactos(contactosDefault);
    }

    /**
     * 🛠️ Métodos utilitarios
     */
    generarId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 5);
    }

    /**
     * 📊 Getters para acceso controlado al estado
     */
    get contactos() {
        return [...this.state.contactos];
    }

    get contactosFiltrados() {
        return [...this.state.contactosFiltrados];
    }

    get vistaActual() {
        return this.state.vistaActual;
    }

    get modoEdicion() {
        return this.state.modoEdicion;
    }

    get contactoEditando() {
        return this.state.contactoEditando;
    }

    get terminoBusqueda() {
        return this.state.terminoBusqueda;
    }

    get contactoAEliminar() {
        return this.state.contactoAEliminar;
    }

    get estadoCompleto() {
        return { ...this.state };
    }

    /**
     * 🧹 Cleanup
     */
    destroy() {
        this.observers = {};
        this.state = null;
    }
}

// 🌟 Exportar para uso en módulos (si se necesita)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppState;
}

// 🌍 Hacer disponible globalmente para compatibilidad con código existente
window.AppState = AppState;
