/** Pruebas unitarias de utilidades: traducción de errores SQL y reglas de validación. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { reglas } from '../src/middlewares/validacion.js';
import { mapearErrorSql } from '../src/utils/erroresSql.js';

describe('mapearErrorSql', () => {
    const casos = [
        [50001, 400], [50002, 400], 
        [50005, 404], [50006, 409], [50007, 404], [50008, 409],
        [50009, 409],  [50011, 404], 
        [515, 400]
    ];
    for (const [numero, estado] of casos) {
        it(`error ${numero} -> HTTP ${estado}`, () => {
            assert.equal(mapearErrorSql({ number: numero, message: 'x' }).estado, estado);
        });
    }

    it('conserva el mensaje del procedimiento almacenado', () => {
        const error = { number: 50009, message: 'La mesa ya está reservada en ese horario' };
        assert.deepEqual(mapearErrorSql(error), { estado: 409, mensaje: 'La mesa ya está reservada en ese horario' });
    });

    it('identifica el índice UNIQUE violado', () => {
        const error = {
            number: 2601,
            message: "Cannot insert duplicate key row in object 'dbo.Clientes' with unique index 'UX_Clientes_correo'."
        };
        assert.deepEqual(mapearErrorSql(error), { estado: 409, mensaje: 'El correo ya está registrado' });
    });

    it('547 al eliminar un registro con reservas -> 409', () => {
        const error = { number: 547, message: 'The DELETE statement conflicted with the REFERENCE constraint "FK_Reservas_Mesas".' };
        assert.equal(mapearErrorSql(error).estado, 409);
    });

    it('547 por una clave foránea inexistente -> 404', () => {
        const error = { number: 547, message: 'The INSERT statement conflicted with the FOREIGN KEY constraint "FK_Reservas_Mesas".' };
        assert.equal(mapearErrorSql(error).estado, 404);
    });

    it('547 por una restricción CHECK -> 400', () => {
        const error = { number: 547, message: 'The INSERT statement conflicted with the CHECK constraint "CK_Mesas_capacidad".' };
        assert.equal(mapearErrorSql(error).estado, 400);
    });

    it('lee el número desde originalError (driver mssql)', () => {
        const error = { originalError: { info: { number: 50009 } }, message: 'ocupada' };
        assert.equal(mapearErrorSql(error).estado, 409);
    });

    it('devuelve null para errores que no son de SQL', () => {
        assert.equal(mapearErrorSql(new Error('otro')), null);
    });
});

describe('reglas de validación', () => {
    it('texto recorta espacios y respeta el máximo', () => {
        assert.deepEqual(reglas.texto(5)('  hola '), { valor: 'hola' });
        assert.ok(reglas.texto(5)('demasiado largo').error);
    });

    it('correo se normaliza a minúsculas', () => {
        assert.deepEqual(reglas.correo(' Ana@Correo.PE '), { valor: 'ana@correo.pe' });
    });

    it('teléfono acepta espacios, guiones y prefijo +', () => {
        assert.deepEqual(reglas.telefono('987 654 321'), { valor: '987654321' });
        assert.deepEqual(reglas.telefono('+51 987-654-321'), { valor: '+51987654321' });
        assert.ok(reglas.telefono('98765').error);
        assert.ok(reglas.telefono('98765432a').error);
    });

    it('entero rechaza decimales y textos', () => {
        assert.ok(reglas.entero()(2.5).error);
        assert.ok(reglas.entero()('3').error);
        assert.deepEqual(reglas.entero({ min: 1, max: 5 })(5), { valor: 5 });
    });

    it('enteroTexto convierte el texto de la URL', () => {
        assert.deepEqual(reglas.enteroTexto()('12'), { valor: 12 });
        assert.ok(reglas.enteroTexto()('12abc').error);
        assert.ok(reglas.enteroTexto()('99999999999').error);
    });


    it('fechaHora exige zona horaria', () => {
        assert.deepEqual(reglas.fechaHora('2027-01-15T20:00:00-05:00'), { valor: '2027-01-15T20:00:00-05:00' });
        assert.deepEqual(reglas.fechaHora('2027-01-16T01:00:00Z'), { valor: '2027-01-16T01:00:00Z' });
        assert.ok(reglas.fechaHora('2027-01-15T20:00:00').error);
        assert.ok(reglas.fechaHora('15/01/2027 20:00').error);
    });



    it('opcional acepta undefined y null', () => {
        assert.deepEqual(reglas.opcional(reglas.texto(10))(undefined), { valor: undefined });
        assert.deepEqual(reglas.opcional(reglas.texto(10))(null), { valor: undefined });
    });
});
