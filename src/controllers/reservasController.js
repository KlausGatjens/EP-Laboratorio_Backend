import { reservasRepository } from '../repositories/reservasRepository.js';
import { auditar, urlRecurso } from '../utils/auditoria.js';
import { ErrorHttp } from '../utils/ErrorHttp.js';

/**
 * Las escrituras usan procedimientos almacenados. Si se rompe una regla del negocio,
 * el procedimiento lanza un error (THROW 500xx) que el manejador global traduce a
 * 400, 404 o 409 (src/utils/erroresSql.js).
 */
export const reservasController = {
    async listar(req, res) {
        res.json(await reservasRepository.listar(req.validado.query));
    },

    async obtener(req, res) {
        const reserva = await reservasRepository.obtener(req.validado.params.id);
        if (!reserva) throw ErrorHttp.noEncontrado('La reserva no existe');
        res.json(reserva);
    },

    /** dbo.RegistrarReserva: horario, capacidad y cruces de horario en una transacción. */
    async crear(req, res) {
        const reserva = await reservasRepository.crear(req.validado.body);
        void auditar(req, 'crear', 'reserva', reserva.idReserva, req.validado.body);
        res.status(201).location(urlRecurso('reservas', reserva.idReserva)).json(reserva);
    },

    /** dbo.ActualizarReserva: reemplaza los datos de una reserva que aún no empieza. */
    async actualizar(req, res) {
        const { id } = req.validado.params;
        const reserva = await reservasRepository.actualizar(id, req.validado.body);
        void auditar(req, 'actualizar', 'reserva', id, req.validado.body);
        res.json(reserva);
    },

    /** dbo.CancelarReserva: elimina una reserva que aún no empieza. */
    async cancelar(req, res) {
        const { id } = req.validado.params;
        await reservasRepository.cancelar(id);
        void auditar(req, 'cancelar', 'reserva', id);
        res.status(204).end();
    }
};
