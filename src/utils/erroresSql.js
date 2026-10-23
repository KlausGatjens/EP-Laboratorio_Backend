/**
 * Traduce los errores de SQL Server a códigos HTTP.
 *
 * - Errores: errores de negocio lanzados con THROW en el procedimiento de registro o las consultas
 *   parametrizadas de cambios (repositorio EP-Laboratorio_BBDD, DDL/03_procedimientos_almacenados.sql).
 * - 2601 / 2627: violación de un índice o restricción UNIQUE (dato duplicado).
 * - 547: violación de FOREIGN KEY o CHECK.
 * - 515: se intentó guardar NULL en una columna obligatoria.
 */
const ERRORES_NEGOCIO = Object.freeze({
    50001: 400, // Fechas inválidas
    50002: 400, // Fecha pasada
    50005: 404, // La mesa no existe
    50006: 409, // Mesa fuera de servicio
    50007: 404, // El cliente no existe
    50008: 409, // Capacidad insuficiente
    50009: 409, // Mesa ocupada en ese horario
    50011: 404, // La reserva no existe
});

const MENSAJES_DUPLICADO = Object.freeze({
    UX_Clientes_correo: 'El correo ya está registrado',
    UX_Mesas_numero: 'Ya existe una mesa con ese número'
});

export const numeroErrorSql = (error) => error?.number ?? error?.originalError?.info?.number;

/**
 * @returns {{ estado: number, mensaje: string } | null} null si no es un error SQL conocido.
 */
export const mapearErrorSql = (error) => {
    const numero = numeroErrorSql(error);
    if (numero === undefined) return null;
    const texto = error.message ?? '';

    if (ERRORES_NEGOCIO[numero]) {
        return { estado: ERRORES_NEGOCIO[numero], mensaje: texto };
    }

    if (numero === 2601 || numero === 2627) {
        const restriccion = Object.keys(MENSAJES_DUPLICADO).find((nombre) => texto.includes(nombre));
        return { estado: 409, mensaje: MENSAJES_DUPLICADO[restriccion] ?? 'El registro ya existe' };
    }

    if (numero === 547) {
        // Las restricciones tienen nombre: CK_ = CHECK, FK_ = clave foránea.
        if (texto.includes('CK_')) {
            return { estado: 400, mensaje: 'Los datos no cumplen las reglas de la base de datos' };
        }
        if (/DELETE/i.test(texto)) {
            return { estado: 409, mensaje: 'No se puede eliminar: el registro tiene reservas asociadas' };
        }
        return { estado: 404, mensaje: 'Se hace referencia a un registro que no existe' };
    }

    if (numero === 515) {
        return { estado: 400, mensaje: 'Falta un dato obligatorio' };
    }

    return null;
};
