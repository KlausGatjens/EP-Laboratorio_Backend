import { MongoClient } from 'mongodb';
import { config } from '../config/env.js';

/**
 * Colecciones que crea el script esquemas.js del repositorio EP-Laboratorio_MongoDB
 * (con su validador $jsonSchema y sus índices). La API solo las usa.
 */
export const COLECCIONES = Object.freeze({
    logs: 'logs',
    comentarios: 'comentarios'
});

export const clienteMongo = new MongoClient(config.mongo.uri, {
    serverSelectionTimeoutMS: 5000,
    appName: 'restaurante-backend'
});

export const mongoDB = clienteMongo.db(config.mongo.database);

let conectado = false;

export const estaConectadoMongo = () => conectado;

export const coleccion = (nombre) => mongoDB.collection(nombre);

export const conectarMongo = async () => {
    await clienteMongo.connect();
    await mongoDB.command({ ping: 1 });
    conectado = true;
};

export const cerrarMongo = async () => {
    conectado = false;
    await clienteMongo.close();
};

export const mongoDisponible = async () => {
    if (!conectado) return false;
    try {
        await mongoDB.command({ ping: 1 });
        return true;
    } catch {
        return false;
    }
};

/** Devuelve las colecciones requeridas que todavía no existen en la base. */
export const coleccionesFaltantes = async () => {
    const existentes = new Set(
        (await mongoDB.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name)
    );
    return Object.values(COLECCIONES).filter((nombre) => !existentes.has(nombre));
};
