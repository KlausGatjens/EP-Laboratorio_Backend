import { mesasRepository } from '../repositories/mesasRepository.js';
import { urlRecurso } from '../utils/urlRecurso.js';
import { ErrorHttp } from '../utils/ErrorHttp.js';

const MESA_NO_ENCONTRADA = 'La mesa no existe';

export const mesasController = {
    async listar(req, res) {
        res.json(await mesasRepository.listar());
    },

    async obtener(req, res) {
        const mesa = await mesasRepository.obtener(req.validado.params.id);
        if (!mesa) throw ErrorHttp.noEncontrado(MESA_NO_ENCONTRADA);
        res.json(mesa);
    },

    async crear(req, res) {
        const mesa = await mesasRepository.crear(req.validado.body);
        res.status(201).location(urlRecurso('mesas', mesa.idMesa)).json(mesa);
    },

    async actualizar(req, res) {
        const { id } = req.validado.params;
        const mesa = await mesasRepository.actualizar(id, req.validado.body);
        if (!mesa) throw ErrorHttp.noEncontrado(MESA_NO_ENCONTRADA);
        res.json(mesa);
    },

    /** Una mesa con reservas no se puede eliminar (FK): la API responde 409. */
    async eliminar(req, res) {
        const { id } = req.validado.params;
        if (!(await mesasRepository.eliminar(id))) throw ErrorHttp.noEncontrado(MESA_NO_ENCONTRADA);
        res.status(204).end();
    }
};
