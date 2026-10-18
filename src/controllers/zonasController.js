import { zonasRepository } from '../repositories/zonasRepository.js';
import { auditar, urlRecurso } from '../utils/auditoria.js';
import { ErrorHttp } from '../utils/ErrorHttp.js';

export const zonasController = {
    async listar(req, res) {
        res.json(await zonasRepository.listar());
    },

    async obtener(req, res) {
        const zona = await zonasRepository.obtener(req.validado.params.id);
        if (!zona) throw ErrorHttp.noEncontrado('La zona no existe');
        res.json(zona);
    },

    async crear(req, res) {
        const zona = await zonasRepository.crear(req.validado.body);
        void auditar(req, 'crear', 'zona', zona.idZona, req.validado.body);
        res.status(201).location(urlRecurso('zonas', zona.idZona)).json(zona);
    }
};
