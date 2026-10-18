import { config } from '../config/env.js';
import { mongoDisponible } from '../db/mongodb.js';
import { sqlDisponible } from '../db/sqlserver.js';

const p = config.prefijoApi;

export const sistemaController = {
    /** Punto de entrada de la API: describe los recursos disponibles. */
    indice(req, res) {
        res.json({
            nombre: 'Restaurante Sazón Criolla - API de Reservas',
            version: '1.0.0',
            horarioAtencion: '12:00 a 23:00 (hora de Lima)',
            recursos: {
                zonas: `${p}/zonas`,
                mesas: `${p}/mesas`,
                mesasDisponibles: `${p}/mesas/disponibles?fechaInicio=&fechaFin=&personas=`,
                usuarios: `${p}/usuarios`,
                reservas: `${p}/reservas`,
                comentarios: `${p}/comentarios`,
                logs: `${p}/logs`,
                salud: `${p}/salud`
            }
        });
    },

    /** Health check: 200 si ambas bases responden, 503 si alguna falla. */
    async salud(req, res) {
        const [sqlServer, mongodb] = await Promise.all([sqlDisponible(), mongoDisponible()]);
        const saludable = sqlServer && mongodb;
        res.status(saludable ? 200 : 503).json({
            estado: saludable ? 'ok' : 'degradado',
            servicios: { sqlServer: sqlServer ? 'ok' : 'caido', mongodb: mongodb ? 'ok' : 'caido' },
            tiempoActivoSegundos: Math.round(process.uptime()),
            fecha: new Date().toISOString()
        });
    }
};
