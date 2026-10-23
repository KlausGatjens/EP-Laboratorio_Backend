import { COLECCIONES, coleccion, estaConectadoMongo } from '../db/mongodb.js';

/**
 * Registro de actividad del sistema en MongoDB (colección `logs`).
 *
 * Todos los documentos comparten { tipo, nivel, fecha } y guardan en `datos`
 * un subdocumento BSON con la forma que necesite cada tipo de evento:
 *   peticion  -> { idPeticion, metodo, ruta, estado, duracionMs, ip, agente }
 *   error     -> { idPeticion, metodo, ruta, estado, mensaje, detalles? }
 *   sistema   -> { mensaje, puerto?, entorno?, senal? }
 */
const logs = () => coleccion(COLECCIONES.logs);

export const logsRepository = {
    /**
     * Guarda un evento sin interrumpir la petición: un fallo de MongoDB no debe
     * revertir una operación SQL que ya se confirmó.
     */
    async registrar(tipo, datos = {}, nivel = 'info') {
        if (!estaConectadoMongo()) return;
        try {
            await logs().insertOne({ tipo, nivel, fecha: new Date(), datos });
        } catch (error) {
            console.error('[MongoDB] No se pudo guardar el log:', error.message);
        }
    },

    async listar() {
        return logs().find({}).sort({ fecha: -1 }).limit(100).toArray();
    }
};
