import assert from 'node:assert/strict';
import { it } from 'node:test';
import { pool } from '../src/db/sqlserver.js';
import { reservasRepository } from '../src/repositories/reservasRepository.js';

it('actualizar ejecuta ActualizarReserva con el id y todos los datos parametrizados', async (t) => {
    const datos = {
        idMesa: 2, idCliente: 3, fechaInicio: '2030-01-01T13:00:00-05:00',
        fechaFin: '2030-01-01T15:00:00-05:00', numeroPersonas: 4
    };
    const parametros = {};
    const reserva = { idReserva: 7, ...datos };
    let procedimiento;
    const request = {
        input(nombre, tipo, valor) { parametros[nombre] = valor; return this; },
        async execute(nombre) { procedimiento = nombre; return { recordset: [reserva] }; }
    };
    t.mock.method(pool, 'request', () => request);
    assert.deepEqual(await reservasRepository.actualizar(7, datos), reserva);
    assert.equal(procedimiento, 'dbo.ActualizarReserva');
    assert.deepEqual(parametros, {
        idReserva: 7, idMesa: 2, idCliente: 3,
        fechaInicio: new Date(datos.fechaInicio), fechaFin: new Date(datos.fechaFin),
        numeroPersonas: 4, observaciones: null
    });
});

it('conserva los errores del procedimiento para que el middleware los traduzca a HTTP', async (t) => {
    const error = Object.assign(new Error('La mesa ya está reservada'), { number: 50009 });
    const request = {
        input() { return this; },
        async execute() { throw error; }
    };
    t.mock.method(pool, 'request', () => request);
    await assert.rejects(reservasRepository.actualizar(7, {
        idMesa: 2, idCliente: 3, fechaInicio: '2030-01-01T18:00:00Z',
        fechaFin: '2030-01-01T20:00:00Z', numeroPersonas: 4
    }), (recibido) => recibido === error);
});
