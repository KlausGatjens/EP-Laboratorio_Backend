/**
 * Pruebas de la capa HTTP (router + middlewares) sin bases de datos.
 * Verifican lo que ocurre ANTES de llegar a SQL Server / MongoDB:
 * validación (400), rutas inexistentes (404), métodos no permitidos (405),
 * JSON mal formado, cabeceras y bases no disponibles (503).
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { app } from '../src/app.js';

let servidor;
let base;

before(async () => {
    servidor = app.listen(0);
    await new Promise((resolve) => servidor.once('listening', resolve));
    base = `http://127.0.0.1:${servidor.address().port}/api/v1`;
});

after(() => new Promise((resolve) => servidor.close(resolve)));

const pedir = async (metodo, ruta, cuerpo, cabeceras = {}) => {
    const respuesta = await fetch(`${base}${ruta}`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', ...cabeceras },
        body: typeof cuerpo === 'string' ? cuerpo : cuerpo && JSON.stringify(cuerpo)
    });
    const texto = await respuesta.text();
    return { estado: respuesta.status, cabeceras: respuesta.headers, json: texto ? JSON.parse(texto) : null };
};

const campos = (json) => json.detalles.map((detalle) => detalle.campo).sort();

const reservaValida = {
    idMesa: 3,
    idUsuario: 2,
    fechaInicio: '2027-01-15T20:00:00-05:00',
    fechaFin: '2027-01-15T22:00:00-05:00',
    numeroPersonas: 4
};

describe('Sistema', () => {
    it('GET /api/v1 describe los recursos', async () => {
        const { estado, json } = await pedir('GET', '/');
        assert.equal(estado, 200);
        assert.equal(json.recursos.mesas, '/api/v1/mesas');
        assert.match(json.nombre, /Sazón Criolla/);
    });

    it('GET /salud responde 503 si las bases no están conectadas', async () => {
        const { estado, json } = await pedir('GET', '/salud');
        assert.equal(estado, 503);
        assert.deepEqual(json.servicios, { sqlServer: 'caido', mongodb: 'caido' });
    });

    it('agrega X-Request-Id y cabeceras de seguridad', async () => {
        const { cabeceras } = await pedir('GET', '/');
        assert.match(cabeceras.get('x-request-id'), /^[0-9a-f-]{36}$/);
        assert.equal(cabeceras.get('x-content-type-options'), 'nosniff');
        assert.equal(cabeceras.get('x-powered-by'), null);
    });

    it('respeta el X-Request-Id enviado por el cliente', async () => {
        const { cabeceras } = await pedir('GET', '/', undefined, { 'X-Request-Id': 'prueba-123' });
        assert.equal(cabeceras.get('x-request-id'), 'prueba-123');
    });

    it('responde 204 a la petición preflight OPTIONS (CORS)', async () => {
        const { estado } = await pedir('OPTIONS', '/mesas');
        assert.equal(estado, 204);
    });
});

describe('Errores globales', () => {
    it('404 con formato uniforme para rutas inexistentes', async () => {
        const { estado, json } = await pedir('GET', '/no-existe');
        assert.equal(estado, 404);
        assert.equal(json.error, 'Not Found');
        assert.ok(json.idPeticion);
    });

    it('405 con cabecera Allow para métodos no soportados', async () => {
        const casos = [
            ['PATCH', '/mesas', 'GET, POST'],
            ['POST', '/mesas/disponibles', 'GET'],
            ['PATCH', '/reservas/1', 'GET, PUT, DELETE'],
            ['PUT', '/comentarios/resumen', 'GET'],
            ['DELETE', '/zonas/1', 'GET']
        ];
        for (const [metodo, ruta, permitidos] of casos) {
            const { estado, cabeceras } = await pedir(metodo, ruta);
            assert.equal(estado, 405, `${metodo} ${ruta}`);
            assert.equal(cabeceras.get('allow'), permitidos);
        }
    });

    it('400 cuando el JSON está mal formado', async () => {
        const { estado, json } = await pedir('POST', '/mesas', '{"numero": ');
        assert.equal(estado, 400);
        assert.equal(json.mensaje, 'El cuerpo debe contener un JSON válido');
    });

    it('400 cuando el cuerpo no es un objeto', async () => {
        const { estado } = await pedir('POST', '/mesas', [1, 2]);
        assert.equal(estado, 400);
    });

    it('503 cuando SQL Server no está disponible', async () => {
        const { estado, json } = await pedir('GET', '/zonas');
        assert.equal(estado, 503);
        assert.equal(json.mensaje, 'La base de datos no está disponible en este momento');
    });
});

describe('Validación de zonas y mesas', () => {
    it('400 cuando el nombre de la zona está vacío', async () => {
        const { estado, json } = await pedir('POST', '/zonas', { nombre: '  ' });
        assert.equal(estado, 400);
        assert.deepEqual(campos(json), ['nombre']);
    });

    it('400 con el detalle de cada campo inválido de una mesa', async () => {
        const { estado, json } = await pedir('POST', '/mesas', { numero: 0, capacidad: 30, idZona: '1', extra: true });
        assert.equal(estado, 400);
        assert.deepEqual(campos(json), ['capacidad', 'extra', 'idZona', 'numero']);
    });

    it('400 en PUT cuando falta un campo (reemplazo completo)', async () => {
        const { estado, json } = await pedir('PUT', '/mesas/1', { numero: 101, capacidad: 2, idZona: 1 });
        assert.equal(estado, 400);
        assert.deepEqual(campos(json), ['activa']);
    });

    it('400 cuando el id no es un entero positivo', async () => {
        for (const id of ['abc', '0', '-1', '1.5']) {
            const { estado, json } = await pedir('GET', `/mesas/${id}`);
            assert.equal(estado, 400, id);
            assert.equal(json.detalles[0].campo, 'id');
        }
    });

    it('400 cuando el filtro activa no es booleano', async () => {
        const { estado } = await pedir('GET', '/mesas?activa=si');
        assert.equal(estado, 400);
    });

    it('400 en mesas disponibles sin parámetros', async () => {
        const { estado, json } = await pedir('GET', '/mesas/disponibles');
        assert.equal(estado, 400);
        assert.deepEqual(campos(json), ['fechaFin', 'fechaInicio', 'personas']);
    });

    it('400 en mesas disponibles cuando la fecha no tiene zona horaria', async () => {
        const { estado, json } = await pedir('GET',
            '/mesas/disponibles?fechaInicio=2027-01-15T20:00:00&fechaFin=2027-01-15T22:00:00-05:00&personas=4');
        assert.equal(estado, 400);
        assert.deepEqual(campos(json), ['fechaInicio']);
    });
});

describe('Validación de usuarios', () => {
    it('400 cuando el correo y el teléfono no son válidos', async () => {
        const { estado, json } = await pedir('POST', '/usuarios', {
            nombres: 'Ana', apellidos: 'Torres', correo: 'ana@', telefono: '12'
        });
        assert.equal(estado, 400);
        assert.deepEqual(campos(json), ['correo', 'telefono']);
    });

    it('400 en PUT cuando faltan campos (reemplazo completo)', async () => {
        const { estado, json } = await pedir('PUT', '/usuarios/1', { nombres: 'Ana' });
        assert.equal(estado, 400);
        assert.deepEqual(campos(json), ['apellidos', 'correo', 'telefono']);
    });
});

describe('Validación de reservas', () => {
    it('400 cuando fechaFin no es posterior a fechaInicio', async () => {
        const { estado, json } = await pedir('POST', '/reservas', {
            ...reservaValida,
            fechaFin: '2027-01-15T19:00:00-05:00'
        });
        assert.equal(estado, 400);
        assert.deepEqual(campos(json), ['fechaFin']);
    });

    it('400 con todos los campos obligatorios que faltan', async () => {
        const { estado, json } = await pedir('POST', '/reservas', {});
        assert.equal(estado, 400);
        assert.deepEqual(campos(json), ['fechaFin', 'fechaInicio', 'idMesa', 'idUsuario', 'numeroPersonas']);
    });

    it('400 cuando el número de personas supera 20', async () => {
        const { estado, json } = await pedir('POST', '/reservas', { ...reservaValida, numeroPersonas: 25 });
        assert.equal(estado, 400);
        assert.deepEqual(campos(json), ['numeroPersonas']);
    });

    it('una reserva válida pasa la validación y llega a SQL Server (503 sin base)', async () => {
        const { estado } = await pedir('POST', '/reservas', { ...reservaValida, observaciones: 'Cumpleaños' });
        assert.equal(estado, 503);
    });

    it('400 cuando el filtro desde/hasta está invertido', async () => {
        const { estado } = await pedir('GET', '/reservas?desde=2027-01-16&hasta=2027-01-15');
        assert.equal(estado, 400);
    });
});

describe('Validación de comentarios y logs', () => {
    it('400 cuando la calificación está fuera de 1..5', async () => {
        const { estado, json } = await pedir('POST', '/comentarios', { idReserva: 6, calificacion: 9, texto: 'Rico' });
        assert.equal(estado, 400);
        assert.deepEqual(campos(json), ['calificacion']);
    });

    it('400 cuando un aspecto no existe', async () => {
        const { estado, json } = await pedir('POST', '/comentarios', {
            idReserva: 6, calificacion: 4, texto: 'Rico', aspectos: { sabor: 5 }
        });
        assert.equal(estado, 400);
        assert.deepEqual(campos(json), ['aspectos']);
    });

    it('400 cuando el id de comentario no es ObjectId', async () => {
        const { estado } = await pedir('GET', '/comentarios/123');
        assert.equal(estado, 400);
    });

    it('503 al crear un comentario válido si MongoDB no está disponible', async () => {
        const { estado } = await pedir('POST', '/comentarios', { idReserva: 6, calificacion: 5, texto: 'Excelente' });
        assert.equal(estado, 503);
    });

    it('400 cuando el límite de logs supera 100', async () => {
        const { estado } = await pedir('GET', '/logs?limite=1000');
        assert.equal(estado, 400);
    });

    it('503 al consultar logs si MongoDB no está disponible', async () => {
        const { estado } = await pedir('GET', '/logs');
        assert.equal(estado, 503);
    });
});
