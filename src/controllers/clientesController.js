import { clientesRepository } from '../repositories/clientesRepository.js';
import { urlRecurso } from '../utils/urlRecurso.js';
import { ErrorHttp } from '../utils/ErrorHttp.js';

const CLIENTE_NO_ENCONTRADO = 'El cliente no existe';

export const clientesController = {
    async listar(req, res) {
        res.json(await clientesRepository.listar());
    },

    async obtener(req, res) {
        const cliente = await clientesRepository.obtener(req.validado.params.id);
        if (!cliente) throw ErrorHttp.noEncontrado(CLIENTE_NO_ENCONTRADO);
        res.json(cliente);
    },

    async crear(req, res) {
        const cliente = await clientesRepository.crear(req.validado.body);
        res.status(201).location(urlRecurso('clientes', cliente.idCliente)).json(cliente);
    },

    async actualizar(req, res) {
        const { id } = req.validado.params;
        const cliente = await clientesRepository.actualizar(id, req.validado.body);
        if (!cliente) throw ErrorHttp.noEncontrado(CLIENTE_NO_ENCONTRADO);
        res.json(cliente);
    },

    /** Un cliente con reservas no se puede eliminar (FK): la API responde 409. */
    async eliminar(req, res) {
        const { id } = req.validado.params;
        if (!(await clientesRepository.eliminar(id))) throw ErrorHttp.noEncontrado(CLIENTE_NO_ENCONTRADO);
        res.status(204).end();
    }
};
