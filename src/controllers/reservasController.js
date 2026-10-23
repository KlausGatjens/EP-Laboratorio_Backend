import { reservasRepository } from '../repositories/reservasRepository.js';
import { urlRecurso } from '../utils/urlRecurso.js';
import { ErrorHttp } from '../utils/ErrorHttp.js';

/** Registro y actualización con procedimientos almacenados; cancelación con SQL parametrizado. */
export const reservasController = {
    async listar(req, res) {
        res.json(await reservasRepository.listar());
    },

    async obtener(req, res) {
        const reserva = await reservasRepository.obtener(req.validado.params.id);
        if (!reserva) throw ErrorHttp.noEncontrado('La reserva no existe');
        res.json(reserva);
    },

    /** dbo.RegistrarReserva: capacidad y disponibilidad en una transacción. */
    async crear(req, res) {
        const reserva = await reservasRepository.crear(req.validado.body);
        res.status(201).location(urlRecurso('reservas', reserva.idReserva)).json(reserva);
    },

    /** dbo.ActualizarReserva: reemplaza los datos de una reserva. */
    async actualizar(req, res) {
        const { id } = req.validado.params;
        const reserva = await reservasRepository.actualizar(id, req.validado.body);
        res.json(reserva);
    },

    /** SQL parametrizado: elimina una reserva. */
    async cancelar(req, res) {
        const { id } = req.validado.params;
        await reservasRepository.cancelar(id);
        res.status(204).end();
    }
};
