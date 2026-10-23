import { estaConectadoMongo } from '../db/mongodb.js';
import { logsRepository } from '../repositories/logsRepository.js';
import { ErrorHttp } from '../utils/ErrorHttp.js';

const exigirMongo = () => {
    if (!estaConectadoMongo()) throw ErrorHttp.servicioNoDisponible('MongoDB no está disponible');
};

export const logsController = {
    async listar(req, res) {
        exigirMongo();
        res.json(await logsRepository.listar());
    }
};
