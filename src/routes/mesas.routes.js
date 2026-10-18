import { Router } from 'express';
import { mesasController } from '../controllers/mesasController.js';
import { metodoNoPermitido } from '../middlewares/manejoErrores.js';
import {
    validarActualizacionMesa, validarConsultaMesas, validarDisponibilidad, validarId, validarMesa
} from '../middlewares/validacion.js';

export const mesasRouter = Router();

mesasRouter.route('/')
    .get(validarConsultaMesas, mesasController.listar)
    .post(validarMesa, mesasController.crear)
    .all(metodoNoPermitido(['GET', 'POST']));

// Antes de "/:id" para que "disponibles" no se interprete como un identificador.
mesasRouter.route('/disponibles')
    .get(validarDisponibilidad, mesasController.disponibles)
    .all(metodoNoPermitido(['GET']));

mesasRouter.route('/:id')
    .get(validarId, mesasController.obtener)
    .put(validarActualizacionMesa, mesasController.actualizar)
    .delete(validarId, mesasController.eliminar)
    .all(metodoNoPermitido(['GET', 'PUT', 'DELETE']));

// Sub-recurso: reservas de la mesa.
mesasRouter.route('/:id/reservas')
    .get(validarId, mesasController.listarReservas)
    .all(metodoNoPermitido(['GET']));
