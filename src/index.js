import { app } from './app.js';
import { config, validarConfig } from './config/env.js';
import { cerrarMongo, coleccionesFaltantes, conectarMongo } from './db/mongodb.js';
import { cerrarSql, conectarSql, descripcionSql, objetosSqlFaltantes } from './db/sqlserver.js';
import { logsRepository } from './repositories/logsRepository.js';

let servidor;

const cerrarConexiones = () => Promise.allSettled([cerrarSql(), cerrarMongo()]);

/** Cierre ordenado: deja de aceptar peticiones y luego cierra las bases de datos. */
const apagar = async (senal) => {
    console.log(`\nSe recibió ${senal}. Cerrando el servidor...`);
    await logsRepository.registrar('sistema', { mensaje: 'Servidor detenido', senal });
    servidor?.close(async () => {
        await cerrarConexiones();
        console.log('Conexiones cerradas.');
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
};

/**
 * Las bases de datos se crean desde sus propios repositorios. Si falta algo, la API
 * igual arranca, pero avisa qué script hay que ejecutar.
 */
const verificarEstructura = async () => {
    const faltantesSql = await objetosSqlFaltantes();
    if (faltantesSql.length > 0) {
        console.warn(`[SQL Server] Faltan objetos: ${faltantesSql.join(', ')}.`
            + ' Ejecuta los scripts del repositorio EP-Laboratorio_BBDD.');
    }
    const faltantesMongo = await coleccionesFaltantes();
    if (faltantesMongo.length > 0) {
        console.warn(`[MongoDB] Faltan colecciones: ${faltantesMongo.join(', ')}.`
            + ' Ejecuta esquemas.js del repositorio EP-Laboratorio_MongoDB.');
    }
};

try {
    validarConfig();
    await conectarSql();
    console.log(`[SQL Server] Conectado a ${descripcionSql()}`);
    await conectarMongo();
    console.log(`[MongoDB] Conectado a la base ${config.mongo.database}`);
    await verificarEstructura();

    servidor = app.listen(config.puerto, () => {
        console.log(`API disponible en http://localhost:${config.puerto}${config.prefijoApi}`);
    });

    await logsRepository.registrar('sistema', {
        mensaje: 'Servidor iniciado', puerto: config.puerto, entorno: config.entorno
    });

    process.on('SIGINT', apagar);
    process.on('SIGTERM', apagar);
} catch (error) {
    console.error('No se pudo iniciar el servidor:', error.message);
    await cerrarConexiones();
    process.exitCode = 1;
}
