import { Router } from 'express';
import { clientesController } from '../controllers/clientesController.js';
import { metodoNoPermitido } from '../middlewares/manejoErrores.js';
import { validarActualizacionCliente, validarId, validarCliente } from '../middlewares/validacion.js';

export const clientesRouter = Router();

clientesRouter.route('/')
    .get(clientesController.listar)
    .post(validarCliente, clientesController.crear)
    .all(metodoNoPermitido(['GET', 'POST']));

clientesRouter.route('/:id')
    .get(validarId, clientesController.obtener)
    .put(validarActualizacionCliente, clientesController.actualizar)
    .delete(validarId, clientesController.eliminar)
    .all(metodoNoPermitido(['GET', 'PUT', 'DELETE']));
