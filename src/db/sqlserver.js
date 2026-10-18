import sql from 'mssql';
import { config } from '../config/env.js';

export { sql };

/**
 * Objetos que crean los scripts del repositorio EP-Laboratorio_BBDD y que la API
 * necesita. Al iniciar se comprueba que existan.
 */
const OBJETOS_REQUERIDOS = Object.freeze([
    'dbo.Zonas', 'dbo.Mesas', 'dbo.Usuarios', 'dbo.Reservas',
    'dbo.vw_MesasDetalle', 'dbo.vw_ReservasDetalle',
    'dbo.RegistrarReserva', 'dbo.ActualizarReserva', 'dbo.CancelarReserva'
]);

/** Instancia con nombre (SQLEXPRESS) o puerto fijo: el driver no acepta ambos a la vez. */
const conInstancia = Boolean(config.sql.instancia);

/** Pool de conexiones compartido por todos los repositorios SQL. */
export const pool = new sql.ConnectionPool({
    server: config.sql.server,
    ...(!conInstancia && { port: config.sql.port }),
    database: config.sql.database,
    user: config.sql.user,
    password: config.sql.password,
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    options: {
        ...(conInstancia && { instanceName: config.sql.instancia }),
        encrypt: config.sql.encrypt,
        trustServerCertificate: config.sql.trustServerCertificate,
        useUTC: true
    }
});

pool.on('error', (error) => console.error('[SQL Server] Error en el pool:', error.message));

export const descripcionSql = () => (config.sql.instancia
    ? `${config.sql.server}\\${config.sql.instancia}/${config.sql.database}`
    : `${config.sql.server}:${config.sql.port}/${config.sql.database}`);

export const conectarSql = async () => pool.connect();

export const cerrarSql = async () => pool.close();

export const sqlDisponible = async () => {
    if (!pool.connected) return false;
    try {
        await pool.request().query('SELECT 1 AS ok');
        return true;
    } catch {
        return false;
    }
};

/** Devuelve los objetos requeridos que todavía no existen en la base. */
export const objetosSqlFaltantes = async () => {
    const valores = OBJETOS_REQUERIDOS.map((nombre) => `(N'${nombre}')`).join(', ');
    const { recordset } = await pool.request().query(
        `SELECT nombre FROM (VALUES ${valores}) AS requeridos (nombre) WHERE OBJECT_ID(nombre) IS NULL`
    );
    return recordset.map((fila) => fila.nombre);
};
