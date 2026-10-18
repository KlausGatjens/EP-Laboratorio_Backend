import { Router } from 'express';
import { reservasController } from '../controllers/reservasController.js';
import { metodoNoPermitido } from '../middlewares/manejoErrores.js';
import {
    validarActualizacionReserva, validarConsultaReservas, validarId, validarReserva
} from '../middlewares/validacion.js';

export const reservasRouter = Router();

reservasRouter.route('/')
    .get(validarConsultaReservas, reservasController.listar)
    .post(validarReserva, reservasController.crear)
    .all(metodoNoPermitido(['GET', 'POST']));

reservasRouter.route('/:id')
    .get(validarId, reservasController.obtener)
    .put(validarActualizacionReserva, reservasController.actualizar)
    .delete(validarId, reservasController.cancelar)
    .all(metodoNoPermitido(['GET', 'PUT', 'DELETE']));
