import { pool, sql } from '../db/sqlserver.js';

/**
 * Acceso a datos de las mesas (patrón Repository).
 * - Lecturas: vista dbo.vw_MesasDetalle (mesa + nombre de su zona).
 * - Escrituras: tabla dbo.Mesas.
 * Todas las consultas son parametrizadas para evitar inyección SQL.
 */
const COLUMNAS = 'idMesa, numero, capacidad, activa, idZona, zona, fechaCreacion';

const parametrosMesa = (request, { numero, capacidad, idZona, activa }) => request
    .input('numero', sql.SmallInt, numero)
    .input('capacidad', sql.TinyInt, capacidad)
    .input('idZona', sql.Int, idZona)
    .input('activa', sql.Bit, activa);

export const mesasRepository = {
    async listar({ idZona, capacidadMinima, activa } = {}) {
        const request = pool.request();
        const condiciones = [];
        if (idZona !== undefined) {
            request.input('idZona', sql.Int, idZona);
            condiciones.push('idZona = @idZona');
        }
        if (capacidadMinima !== undefined) {
            request.input('capacidadMinima', sql.Int, capacidadMinima);
            condiciones.push('capacidad >= @capacidadMinima');
        }
        if (activa !== undefined) {
            request.input('activa', sql.Bit, activa);
            condiciones.push('activa = @activa');
        }
        const filtro = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
        const { recordset } = await request.query(
            `SELECT ${COLUMNAS} FROM dbo.vw_MesasDetalle ${filtro} ORDER BY numero`
        );
        return recordset;
    },

    async obtener(id) {
        const { recordset } = await pool.request()
            .input('id', sql.Int, id)
            .query(`SELECT ${COLUMNAS} FROM dbo.vw_MesasDetalle WHERE idMesa = @id`);
        return recordset[0] ?? null;
    },

    /**
     * Mesas activas, con capacidad suficiente y sin reservas que se crucen con el
     * horario pedido. Se ordenan de menor a mayor capacidad (la que mejor se ajusta primero).
     */
    async disponibles({ fechaInicio, fechaFin, personas }) {
        const { recordset } = await pool.request()
            .input('fechaInicio', sql.DateTime2(0), new Date(fechaInicio))
            .input('fechaFin', sql.DateTime2(0), new Date(fechaFin))
            .input('personas', sql.Int, personas)
            .query(`SELECT ${COLUMNAS}
                    FROM dbo.vw_MesasDetalle m
                    WHERE m.activa = 1
                      AND m.capacidad >= @personas
                      AND NOT EXISTS (SELECT 1
                                      FROM dbo.Reservas r
                                      WHERE r.idMesa      = m.idMesa
                                        AND r.fechaInicio < @fechaFin
                                        AND r.fechaFin    > @fechaInicio)
                    ORDER BY m.capacidad, m.numero`);
        return recordset;
    },

    async crear({ activa = true, ...datos }) {
        const { recordset } = await parametrosMesa(pool.request(), { ...datos, activa })
            .query(`INSERT INTO dbo.Mesas (numero, capacidad, idZona, activa)
                    VALUES (@numero, @capacidad, @idZona, @activa);
                    SELECT ${COLUMNAS} FROM dbo.vw_MesasDetalle WHERE idMesa = SCOPE_IDENTITY();`);
        return recordset[0];
    },

    async actualizar(id, datos) {
        const { recordset } = await parametrosMesa(pool.request().input('id', sql.Int, id), datos)
            .query(`UPDATE dbo.Mesas
                    SET numero = @numero, capacidad = @capacidad, idZona = @idZona, activa = @activa
                    WHERE idMesa = @id;
                    SELECT ${COLUMNAS} FROM dbo.vw_MesasDetalle WHERE idMesa = @id;`);
        return recordset[0] ?? null;
    },

    async eliminar(id) {
        const { rowsAffected } = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM dbo.Mesas WHERE idMesa = @id');
        return rowsAffected[0] > 0;
    }
};
