import { Router } from 'express';
import { logsController } from '../controllers/logsController.js';
import { metodoNoPermitido } from '../middlewares/manejoErrores.js';

export const logsRouter = Router();

logsRouter.route('/')
    .get(logsController.listar)
    .all(metodoNoPermitido(['GET']));
