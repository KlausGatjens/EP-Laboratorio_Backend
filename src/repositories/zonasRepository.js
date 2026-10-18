import { pool, sql } from '../db/sqlserver.js';

/**
 * Acceso a datos de la tabla dbo.Zonas (patrón Repository).
 * Cada zona incluye la cantidad de mesas que tiene.
 */
const CONSULTA = `SELECT z.idZona, z.nombre, z.descripcion, COUNT(m.idMesa) AS totalMesas
                  FROM dbo.Zonas z
                  LEFT JOIN dbo.Mesas m ON m.idZona = z.idZona`;
const AGRUPACION = 'GROUP BY z.idZona, z.nombre, z.descripcion';

export const zonasRepository = {
    async listar() {
        const { recordset } = await pool.request()
            .query(`${CONSULTA} ${AGRUPACION} ORDER BY z.idZona`);
        return recordset;
    },

    async obtener(id) {
        const { recordset } = await pool.request()
            .input('id', sql.Int, id)
            .query(`${CONSULTA} WHERE z.idZona = @id ${AGRUPACION}`);
        return recordset[0] ?? null;
    },

    async crear({ nombre, descripcion }) {
        const { recordset } = await pool.request()
            .input('nombre', sql.NVarChar(50), nombre)
            .input('descripcion', sql.NVarChar(200), descripcion ?? null)
            .query(`INSERT INTO dbo.Zonas (nombre, descripcion)
                    OUTPUT INSERTED.idZona, INSERTED.nombre, INSERTED.descripcion
                    VALUES (@nombre, @descripcion)`);
        return { ...recordset[0], totalMesas: 0 };
    }
};
