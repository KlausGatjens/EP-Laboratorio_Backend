import { Router } from 'express';
import { mesasController } from '../controllers/mesasController.js';
import { metodoNoPermitido } from '../middlewares/manejoErrores.js';
import {
    validarActualizacionMesa, validarId, validarMesa
} from '../middlewares/validacion.js';

export const mesasRouter = Router();

mesasRouter.route('/')
    .get(mesasController.listar)
    .post(validarMesa, mesasController.crear)
    .all(metodoNoPermitido(['GET', 'POST']));

mesasRouter.route('/:id')
    .get(validarId, mesasController.obtener)
    .put(validarActualizacionMesa, mesasController.actualizar)
    .delete(validarId, mesasController.eliminar)
    .all(metodoNoPermitido(['GET', 'PUT', 'DELETE']));
