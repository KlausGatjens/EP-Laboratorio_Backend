import { Router } from 'express';
import { logsController } from '../controllers/logsController.js';
import { metodoNoPermitido } from '../middlewares/manejoErrores.js';
import { validarConsultaLogs } from '../middlewares/validacion.js';

export const logsRouter = Router();

logsRouter.route('/')
    .get(validarConsultaLogs, logsController.listar)
    .all(metodoNoPermitido(['GET']));

logsRouter.route('/resumen')
    .get(logsController.resumen)
    .all(metodoNoPermitido(['GET']));
