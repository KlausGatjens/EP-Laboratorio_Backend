import { estaConectadoMongo } from '../db/mongodb.js';
import { comentariosRepository } from '../repositories/comentariosRepository.js';
import { mesasRepository } from '../repositories/mesasRepository.js';
import { reservasRepository } from '../repositories/reservasRepository.js';
import { zonasRepository } from '../repositories/zonasRepository.js';
import { auditar, urlRecurso } from '../utils/auditoria.js';
import { ErrorHttp } from '../utils/ErrorHttp.js';

const MESA_NO_ENCONTRADA = 'La mesa no existe';

const exigirZona = async (idZona) => {
    if (!(await zonasRepository.obtener(idZona))) throw ErrorHttp.noEncontrado('La zona no existe');
};

/** Une el dato transaccional (SQL Server) con la valoración de las reseñas (MongoDB). */
const valoracionDe = async (idMesa) => {
    if (!estaConectadoMongo()) return null;
    try {
        return await comentariosRepository.resumenMesa(idMesa);
    } catch {
        return null;
    }
};

export const mesasController = {
    async listar(req, res) {
        res.json(await mesasRepository.listar(req.validado.query));
    },

    /** ¿Qué mesas están libres para N personas en un horario? */
    async disponibles(req, res) {
        res.json(await mesasRepository.disponibles(req.validado.query));
    },

    async obtener(req, res) {
        const mesa = await mesasRepository.obtener(req.validado.params.id);
        if (!mesa) throw ErrorHttp.noEncontrado(MESA_NO_ENCONTRADA);
        res.json({ ...mesa, valoracion: await valoracionDe(mesa.idMesa) });
    },

    async crear(req, res) {
        await exigirZona(req.validado.body.idZona);
        const mesa = await mesasRepository.crear(req.validado.body);
        void auditar(req, 'crear', 'mesa', mesa.idMesa, req.validado.body);
        res.status(201).location(urlRecurso('mesas', mesa.idMesa)).json(mesa);
    },

    async actualizar(req, res) {
        const { id } = req.validado.params;
        await exigirZona(req.validado.body.idZona);
        const mesa = await mesasRepository.actualizar(id, req.validado.body);
        if (!mesa) throw ErrorHttp.noEncontrado(MESA_NO_ENCONTRADA);
        void auditar(req, 'actualizar', 'mesa', id, req.validado.body);
        res.json(mesa);
    },

    /** Una mesa con reservas no se puede eliminar (FK): la API responde 409. */
    async eliminar(req, res) {
        const { id } = req.validado.params;
        if (!(await mesasRepository.eliminar(id))) throw ErrorHttp.noEncontrado(MESA_NO_ENCONTRADA);
        void auditar(req, 'eliminar', 'mesa', id);
        res.status(204).end();
    },

    async listarReservas(req, res) {
        const { id } = req.validado.params;
        if (!(await mesasRepository.obtener(id))) throw ErrorHttp.noEncontrado(MESA_NO_ENCONTRADA);
        res.json(await reservasRepository.listar({ idMesa: id }));
    }
};
