import { Router } from 'express';
import { zonasController } from '../controllers/zonasController.js';
import { metodoNoPermitido } from '../middlewares/manejoErrores.js';
import { validarId, validarZona } from '../middlewares/validacion.js';

export const zonasRouter = Router();

zonasRouter.route('/')
    .get(zonasController.listar)
    .post(validarZona, zonasController.crear)
    .all(metodoNoPermitido(['GET', 'POST']));

zonasRouter.route('/:id')
    .get(validarId, zonasController.obtener)
    .all(metodoNoPermitido(['GET']));
