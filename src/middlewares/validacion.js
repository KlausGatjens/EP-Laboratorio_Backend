import { ErrorHttp } from '../utils/ErrorHttp.js';

/** Valida campos obligatorios y tipos. Devuelve el primer error encontrado. */

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO = /^\+?\d{7,14}$/;
/** Fecha y hora con zona horaria obligatoria: 2026-12-17T20:00:00-05:00 o 2026-12-18T01:00:00Z */
const FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const ok = (valor) => ({ valor });
const falla = (error) => ({ error });

const enRango = (numero, min, max) => Number.isInteger(numero) && numero >= min && numero <= max;

export const reglas = {
    texto: (max) => (v) => (typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max
        ? ok(v.trim())
        : falla(`debe ser un texto no vacío de máximo ${max} caracteres`)),

    entero: ({ min = 1, max = 2147483647 } = {}) => (v) => (enRango(v, min, max)
        ? ok(v)
        : falla(`debe ser un número entero entre ${min} y ${max}`)),

    /** Para params y query strings: convierte el texto a entero antes de validar. */
    enteroTexto: ({ min = 1, max = 2147483647 } = {}) => (v) => {
        const numero = typeof v === 'string' && /^\d{1,10}$/.test(v) ? Number(v) : Number.NaN;
        return enRango(numero, min, max) ? ok(numero) : falla(`debe ser un número entero entre ${min} y ${max}`);
    },

    booleano: (v) => (typeof v === 'boolean' ? ok(v) : falla('debe ser true o false')),

    correo: (v) => (typeof v === 'string' && v.trim().length <= 150 && CORREO.test(v.trim())
        ? ok(v.trim().toLowerCase())
        : falla('debe ser un correo electrónico válido de máximo 150 caracteres')),

    /** Acepta espacios y guiones ("987 654 321") y los elimina antes de guardar. */
    telefono: (v) => {
        const limpio = typeof v === 'string' ? v.replace(/[\s-]/g, '') : '';
        return TELEFONO.test(limpio) ? ok(limpio) : falla('debe tener de 7 a 14 dígitos y puede empezar con +');
    },

    fechaHora: (v) => (typeof v === 'string' && FECHA_HORA.test(v) && Number.isFinite(Date.parse(v))
        ? ok(v)
        : falla('debe ser una fecha y hora ISO 8601 con zona horaria, por ejemplo 2026-12-17T20:00:00-05:00')),

    /** Envuelve una regla para que el campo sea opcional (se puede omitir o enviar null). */
    opcional: (regla) => Object.assign(
        (v) => (v === undefined || v === null ? ok(undefined) : regla(v)),
        { opcional: true }
    )
};

// Se conservan solo los campos declarados en cada recurso.
export const validar = (esquemas) => (req, res, next) => {
    const validado = { params: {}, body: {} };
    for (const origen of ['params', 'body']) {
        if (!esquemas[origen]) continue;
        const datos = req[origen] ?? {};
        if (typeof datos !== 'object' || Array.isArray(datos)) {
            return next(ErrorHttp.solicitudInvalida('El cuerpo debe ser un objeto JSON'));
        }
        for (const [campo, regla] of Object.entries(esquemas[origen])) {
            const valor = datos[campo];
            const resultado = (valor == null && !regla.opcional)
                ? { error: 'es obligatorio' } : regla(valor);
            if (resultado.error) {
                return next(ErrorHttp.solicitudInvalida('Datos invalidos', [
                    { campo, origen, mensaje: resultado.error }
                ]));
            }
            if (resultado.valor !== undefined) validado[origen][campo] = resultado.valor;
        }
    }
    req.validado = validado;
    next();
};

/* ---------- Esquemas por recurso ---------- */

const {
    texto, entero, enteroTexto, booleano, correo, telefono,
    fechaHora, opcional
} = reglas;

const id = enteroTexto();

/* Identificadores en la ruta */
export const validarId = validar({ params: { id } });

/* Mesas */
const cuerpoMesa = {
    numero: entero(),
    capacidad: entero()
};

export const validarMesa = validar({ body: { ...cuerpoMesa, activa: opcional(booleano) } });

// PUT reemplaza el recurso completo: todos los campos son obligatorios.
export const validarActualizacionMesa = validar({ params: { id }, body: { ...cuerpoMesa, activa: booleano } });

/* Clientes */
const cuerpoCliente = { nombres: texto(60), apellidos: texto(60), correo, telefono };

export const validarCliente = validar({ body: cuerpoCliente });

export const validarActualizacionCliente = validar({ params: { id }, body: cuerpoCliente });

/* Reservas */
const cuerpoReserva = {
    idMesa: entero(),
    idCliente: entero(),
    fechaInicio: fechaHora,
    fechaFin: fechaHora,
    numeroPersonas: entero(),
    observaciones: opcional(texto(200))
};
export const validarReserva = validar({ body: cuerpoReserva });
export const validarActualizacionReserva = validar({ params: { id }, body: cuerpoReserva });
