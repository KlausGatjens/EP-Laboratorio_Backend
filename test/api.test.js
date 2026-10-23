import assert from 'node:assert/strict';
import { after, before, it, mock } from 'node:test';
import { app } from '../src/app.js';
import { clientesRepository } from '../src/repositories/clientesRepository.js';
import { mesasRepository } from '../src/repositories/mesasRepository.js';
import { reservasRepository } from '../src/repositories/reservasRepository.js';
import { logsRepository } from '../src/repositories/logsRepository.js';

let servidor;
let base;
const eventos = [];
before(async () => {
    mock.method(logsRepository, 'registrar', async (tipo, datos) => eventos.push({ tipo, datos }));
    servidor = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => servidor.once('listening', resolve));
    base = `http://127.0.0.1:${servidor.address().port}/api/v1`;
});
after(async () => {
    await new Promise((resolve) => servidor.close(resolve));
    mock.restoreAll();
});
const pedir = async (metodo, ruta, cuerpo) => {
    const res = await fetch(base + ruta, { method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
    const texto = await res.text();
    return { estado: res.status, headers: res.headers, json: texto ? JSON.parse(texto) : null };
};

it('solo ofrece los recursos del parcial', async () => {
    const { estado, json } = await pedir('GET', '/');
    assert.equal(estado, 200);
    assert.deepEqual(Object.keys(json.recursos).sort(), ['clientes', 'logs', 'mesas', 'reservas']);
    for (const ruta of ['/comentarios', '/logs/resumen', '/salud', '/zonas', '/usuarios', '/mesas/1/reservas']) {
        assert.equal((await pedir('GET', ruta)).estado, 404, ruta);
    }
});

const inicio = new Date(Date.now() + 86400000).toISOString();
const fin = new Date(Date.now() + 93600000).toISOString();
const casos = [
    ['clientes', clientesRepository, 'idCliente', { nombres: 'Ana', apellidos: 'Torres', correo: 'ana@correo.pe', telefono: '987654321' }],
    ['mesas', mesasRepository, 'idMesa', { numero: 1, capacidad: 4, activa: true }],
    ['reservas', reservasRepository, 'idReserva', { idCliente: 1, idMesa: 1, fechaInicio: inicio, fechaFin: fin, numeroPersonas: 2 }]
];
for (const [recurso, repo, clave, datos] of casos) {
    it(`${recurso}: CRUD usa verbos, estados y Location correctos`, async (t) => {
        const registro = { [clave]: 1, ...datos };
        t.mock.method(repo, 'listar', async () => [registro]);
        t.mock.method(repo, 'obtener', async () => registro);
        t.mock.method(repo, 'crear', async (body) => ({ [clave]: 1, ...body }));
        t.mock.method(repo, 'actualizar', async () => registro);
        t.mock.method(repo, recurso === 'reservas' ? 'cancelar' : 'eliminar', async () => true);
        assert.deepEqual((await pedir('GET', `/${recurso}`)).json, [registro]);
        assert.deepEqual((await pedir('GET', `/${recurso}/1`)).json, registro);
        const creado = await pedir('POST', `/${recurso}`, datos);
        assert.equal(creado.estado, 201);
        assert.equal(creado.headers.get('location'), `/api/v1/${recurso}/1`);
        assert.equal(creado.json[clave], 1);
        assert.equal((await pedir('PUT', `/${recurso}/1`, datos)).estado, 200);
        const eliminado = await pedir('DELETE', `/${recurso}/1`);
        assert.equal(eliminado.estado, 204);
        assert.equal(eliminado.json, null);
    });
}
it('valida antes de llamar al repositorio', async (t) => {
    const crear = t.mock.method(reservasRepository, 'crear');
    const res = await pedir('POST', '/reservas', { idMesa: 1, idCliente: 'uno', numeroPersonas: 0 });
    assert.equal(res.estado, 400);
    assert.equal(res.json.detalles.length, 1);
    assert.equal(res.json.detalles[0].campo, 'idCliente');
    assert.equal(crear.mock.callCount(), 0);
    assert.equal((await pedir('POST', '/mesas', { numero: 1, capacidad: 0 })).estado, 400);
    assert.equal((await pedir('GET', '/clientes/abc')).estado, 400);
    assert.equal((await pedir('PUT', '/mesas/1', { numero: 1, capacidad: 4 })).estado, 400);
});
it('el manejador global convierte duplicados y cruces a 409', async (t) => {
    t.mock.method(clientesRepository, 'crear', async () => { throw { number: 2601, message: 'UX_Clientes_correo' }; });
    t.mock.method(reservasRepository, 'crear', async () => { throw { number: 50009, message: 'Mesa reservada' }; });
    assert.equal((await pedir('POST', '/clientes', casos[0][3])).estado, 409);
    assert.equal((await pedir('POST', '/reservas', casos[2][3])).estado, 409);
});
it('acepta números de mesa y capacidades sin los antiguos límites', async (t) => {
    const crear = t.mock.method(mesasRepository, 'crear', async (datos) => ({ idMesa: 9, ...datos }));
    assert.equal((await pedir('POST', '/mesas', { numero: 1000, capacidad: 300 })).estado, 201);
    assert.equal(crear.mock.calls[0].arguments[0].capacidad, 300);
    t.mock.method(reservasRepository, 'crear', async (datos) => ({ idReserva: 9, ...datos }));
    assert.equal((await pedir('POST', '/reservas', { ...casos[2][3], numeroPersonas: 300 })).estado, 201);
});
it('mantiene la validación y limpieza del teléfono', async (t) => {
    const crear = t.mock.method(clientesRepository, 'crear', async (datos) => ({ idCliente: 9, ...datos }));
    const datos = { ...casos[0][3], telefono: '+51 987-654-321' };
    assert.equal((await pedir('POST', '/clientes', datos)).estado, 201);
    assert.equal(crear.mock.calls[0].arguments[0].telefono, '+51987654321');
    const invalido = await pedir('POST', '/clientes', { ...datos, telefono: 'abc' });
    assert.equal(invalido.estado, 400);
    assert.equal(invalido.json.detalles[0].campo, 'telefono');
    assert.equal(crear.mock.callCount(), 1);
});
it('responde 404 para un cliente inexistente y 405 para un método no permitido', async (t) => {
    t.mock.method(clientesRepository, 'obtener', async () => null);
    assert.equal((await pedir('GET', '/clientes/99')).estado, 404);
    const res = await pedir('PATCH', '/reservas/1');
    assert.equal(res.estado, 405);
    assert.equal(res.headers.get('allow'), 'GET, PUT, DELETE');
});
it('rechaza JSON mal formado e informa si MongoDB no está conectado', async () => {
    const res = await fetch(base + '/clientes', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(res.status, 400);
    assert.equal((await pedir('GET', '/logs')).estado, 503);
});
it('registra peticiones y errores con estructuras diferentes', async () => {
    await pedir('GET', '/no-existe');
    const peticion = eventos.findLast((e) => e.tipo === 'peticion');
    const error = eventos.findLast((e) => e.tipo === 'error');
    assert.equal(peticion.datos.estado, 404);
    assert.equal(peticion.datos.metodo, 'GET');
    assert.ok(error.datos.mensaje);
    assert.equal(peticion.datos.idPeticion, error.datos.idPeticion);
});
