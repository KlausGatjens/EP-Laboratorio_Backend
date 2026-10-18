import { ErrorHttp } from '../utils/ErrorHttp.js';

/**
 * Middleware de validación declarativo.
 *
 * Cada regla recibe el valor y devuelve { valor } (ya normalizado) o { error }.
 * `validar({ params, query, body })` revisa cada origen, acumula TODOS los
 * errores en `detalles` y, si no hay errores, deja los datos limpios en
 * `req.validado` para que el controlador no vuelva a validarlos.
 */

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO = /^\+?\d{7,14}$/;
const OBJECT_ID = /^[0-9a-f]{24}$/i;
/** Fecha y hora con zona horaria obligatoria: 2026-12-17T20:00:00-05:00 o 2026-12-18T01:00:00Z */
const FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
/** Filtros: fecha sola (2026-12-17) o fecha y hora, con o sin zona horaria. */
const FECHA = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/;
const ZONA_LIMA = '-05:00';
const ASPECTOS = ['comida', 'servicio', 'ambiente'];

const ok = (valor) => ({ valor });
const falla = (error) => ({ error });

const enRango = (numero, min, max) => Number.isInteger(numero) && numero >= min && numero <= max;

/** Completa una fecha de filtro con la hora de Lima: 2026-12-17 -> 2026-12-17T00:00:00-05:00 */
const conZonaLima = (texto) => {
    if (!texto.includes('T')) return `${texto}T00:00:00${ZONA_LIMA}`;
    return /(Z|[+-]\d{2}:\d{2})$/.test(texto) ? texto : `${texto}${ZONA_LIMA}`;
};

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

    /** Para query strings: ?activa=true */
    booleanoTexto: (v) => (v === 'true' || v === 'false' ? ok(v === 'true') : falla('debe ser true o false')),

    correo: (v) => (typeof v === 'string' && v.trim().length <= 150 && CORREO.test(v.trim())
        ? ok(v.trim().toLowerCase())
        : falla('debe ser un correo electrónico válido de máximo 150 caracteres')),

    /** Acepta espacios y guiones ("987 654 321") y los elimina antes de guardar. */
    telefono: (v) => {
        const limpio = typeof v === 'string' ? v.replace(/[\s-]/g, '') : '';
        return TELEFONO.test(limpio) ? ok(limpio) : falla('debe tener de 7 a 14 dígitos y puede empezar con +');
    },

    objectId: (v) => (typeof v === 'string' && OBJECT_ID.test(v)
        ? ok(v)
        : falla('debe ser un identificador de MongoDB válido (24 caracteres hexadecimales)')),

    fechaHora: (v) => (typeof v === 'string' && FECHA_HORA.test(v) && Number.isFinite(Date.parse(v))
        ? ok(v)
        : falla('debe ser una fecha y hora ISO 8601 con zona horaria, por ejemplo 2026-12-17T20:00:00-05:00')),

    /** Si no se indica la zona horaria, se asume la hora de Lima. */
    fecha: (v) => {
        if (typeof v !== 'string' || !FECHA.test(v)) {
            return falla('debe ser una fecha ISO 8601, por ejemplo 2026-12-17 o 2026-12-17T20:00:00-05:00');
        }
        const normalizada = conZonaLima(v);
        return Number.isFinite(Date.parse(normalizada)) ? ok(normalizada) : falla('no es una fecha válida');
    },

    enumeracion: (valores) => (v) => (valores.includes(v)
        ? ok(v)
        : falla(`debe ser uno de: ${valores.join(', ')}`)),

    listaTextos: ({ maxElementos = 5, maxLargo = 30 } = {}) => (v) => (
        Array.isArray(v) && v.length <= maxElementos &&
        v.every((t) => typeof t === 'string' && t.trim().length > 0 && t.trim().length <= maxLargo)
            ? ok(v.map((t) => t.trim().toLowerCase()))
            : falla(`debe ser una lista de hasta ${maxElementos} textos de máximo ${maxLargo} caracteres`)),

    /** Calificación por aspecto: { comida, servicio, ambiente }, al menos uno, enteros de 1 a 5. */
    aspectos: (v) => {
        const esObjeto = v !== null && typeof v === 'object' && !Array.isArray(v);
        const claves = esObjeto ? Object.keys(v) : [];
        const valido = claves.length > 0 && claves.every((clave) => ASPECTOS.includes(clave) && enRango(v[clave], 1, 5));
        return valido
            ? ok(Object.fromEntries(claves.map((clave) => [clave, v[clave]])))
            : falla(`debe ser un objeto con al menos uno de: ${ASPECTOS.join(', ')} (enteros de 1 a 5)`);
    },

    /** Envuelve una regla para que el campo sea opcional (se puede omitir o enviar null). */
    opcional: (regla) => Object.assign(
        (v) => (v === undefined || v === null ? ok(undefined) : regla(v)),
        { opcional: true }
    )
};

const validarOrigen = (esquema, datos, origen, detalles, permitirExtras) => {
    const limpio = {};
    for (const [campo, regla] of Object.entries(esquema)) {
        const valor = datos[campo];
        if ((valor === undefined || valor === null) && !regla.opcional) {
            detalles.push({ campo, origen, mensaje: 'es obligatorio' });
            continue;
        }
        const resultado = regla(valor);
        if (resultado.error) detalles.push({ campo, origen, mensaje: resultado.error });
        else if (resultado.valor !== undefined) limpio[campo] = resultado.valor;
    }
    if (!permitirExtras) {
        for (const campo of Object.keys(datos)) {
            if (!(campo in esquema)) detalles.push({ campo, origen, mensaje: 'no es un campo permitido' });
        }
    }
    return limpio;
};

/**
 * @param {{ params?: object, query?: object, body?: object, reglasCruzadas?: Function }} esquemas
 */
export const validar = (esquemas) => (req, res, next) => {
    const detalles = [];
    const validado = { params: {}, query: {}, body: {} };

    if (esquemas.params) {
        validado.params = validarOrigen(esquemas.params, req.params ?? {}, 'params', detalles, true);
    }
    if (esquemas.query) {
        validado.query = validarOrigen(esquemas.query, req.query ?? {}, 'query', detalles, false);
    }
    if (esquemas.body) {
        const cuerpo = req.body ?? {};
        if (typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
            return next(ErrorHttp.solicitudInvalida('El cuerpo de la petición debe ser un objeto JSON'));
        }
        validado.body = validarOrigen(esquemas.body, cuerpo, 'body', detalles, false);
    }

    if (detalles.length === 0 && esquemas.reglasCruzadas) {
        detalles.push(...esquemas.reglasCruzadas(validado));
    }

    if (detalles.length > 0) {
        return next(ErrorHttp.solicitudInvalida('Los datos enviados no son válidos', detalles));
    }

    req.validado = validado;
    next();
};

/* ---------- Esquemas por recurso ---------- */

const {
    texto, entero, enteroTexto, booleano, booleanoTexto, correo, telefono, objectId,
    fechaHora, fecha, enumeracion, listaTextos, aspectos, opcional
} = reglas;

const fechasEnOrden = (inicio, fin, campoFin, origen) => (inicio && fin && Date.parse(fin) <= Date.parse(inicio)
    ? [{ campo: campoFin, origen, mensaje: 'debe ser posterior a la fecha de inicio' }]
    : []);

const id = enteroTexto();

const paginacion = {
    pagina: opcional(enteroTexto({ min: 1, max: 100000 })),
    limite: opcional(enteroTexto({ min: 1, max: 100 }))
};

/* Identificadores en la ruta */
export const validarId = validar({ params: { id } });
export const validarIdComentario = validar({ params: { id: objectId } });

/* Zonas */
export const validarZona = validar({
    body: { nombre: texto(50), descripcion: opcional(texto(200)) }
});

/* Mesas */
const cuerpoMesa = {
    numero: entero({ min: 1, max: 999 }),
    capacidad: entero({ min: 1, max: 20 }),
    idZona: entero()
};

export const validarConsultaMesas = validar({
    query: {
        idZona: opcional(enteroTexto()),
        capacidadMinima: opcional(enteroTexto({ min: 1, max: 20 })),
        activa: opcional(booleanoTexto)
    }
});

export const validarDisponibilidad = validar({
    query: { fechaInicio: fechaHora, fechaFin: fechaHora, personas: enteroTexto({ min: 1, max: 20 }) },
    reglasCruzadas: ({ query }) => fechasEnOrden(query.fechaInicio, query.fechaFin, 'fechaFin', 'query')
});

export const validarMesa = validar({ body: { ...cuerpoMesa, activa: opcional(booleano) } });

// PUT reemplaza el recurso completo: todos los campos son obligatorios.
export const validarActualizacionMesa = validar({ params: { id }, body: { ...cuerpoMesa, activa: booleano } });

/* Usuarios */
const cuerpoUsuario = { nombres: texto(60), apellidos: texto(60), correo, telefono };

export const validarUsuario = validar({ body: cuerpoUsuario });

export const validarActualizacionUsuario = validar({ params: { id }, body: cuerpoUsuario });

/* Reservas */
const cuerpoReserva = {
    idMesa: entero(),
    idUsuario: entero(),
    fechaInicio: fechaHora,
    fechaFin: fechaHora,
    numeroPersonas: entero({ min: 1, max: 20 }),
    observaciones: opcional(texto(200))
};
const reservaCruzada = ({ body }) => fechasEnOrden(body.fechaInicio, body.fechaFin, 'fechaFin', 'body');

export const validarReserva = validar({ body: cuerpoReserva, reglasCruzadas: reservaCruzada });

export const validarActualizacionReserva = validar({
    params: { id },
    body: cuerpoReserva,
    reglasCruzadas: reservaCruzada
});

export const validarConsultaReservas = validar({
    query: {
        idMesa: opcional(enteroTexto()),
        idUsuario: opcional(enteroTexto()),
        desde: opcional(fecha),
        hasta: opcional(fecha)
    },
    reglasCruzadas: ({ query }) => fechasEnOrden(query.desde, query.hasta, 'hasta', 'query')
});

/* Comentarios (MongoDB) */
export const validarComentario = validar({
    body: {
        idReserva: entero(),
        calificacion: entero({ min: 1, max: 5 }),
        aspectos: opcional(aspectos),
        texto: texto(500),
        etiquetas: opcional(listaTextos())
    }
});

export const validarConsultaComentarios = validar({
    query: {
        idMesa: opcional(enteroTexto()),
        idUsuario: opcional(enteroTexto()),
        calificacionMinima: opcional(enteroTexto({ min: 1, max: 5 })),
        buscar: opcional(texto(100)),
        ...paginacion
    }
});

/* Logs (MongoDB) */
export const validarConsultaLogs = validar({
    query: {
        tipo: opcional(texto(30)),
        nivel: opcional(enumeracion(['info', 'warn', 'error'])),
        desde: opcional(fecha),
        hasta: opcional(fecha),
        ...paginacion
    },
    reglasCruzadas: ({ query }) => fechasEnOrden(query.desde, query.hasta, 'hasta', 'query')
});
