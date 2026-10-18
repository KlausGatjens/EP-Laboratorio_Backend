import { Router } from 'express';
import { usuariosController } from '../controllers/usuariosController.js';
import { metodoNoPermitido } from '../middlewares/manejoErrores.js';
import { validarActualizacionUsuario, validarId, validarUsuario } from '../middlewares/validacion.js';

export const usuariosRouter = Router();

usuariosRouter.route('/')
    .get(usuariosController.listar)
    .post(validarUsuario, usuariosController.crear)
    .all(metodoNoPermitido(['GET', 'POST']));

usuariosRouter.route('/:id')
    .get(validarId, usuariosController.obtener)
    .put(validarActualizacionUsuario, usuariosController.actualizar)
    .delete(validarId, usuariosController.eliminar)
    .all(metodoNoPermitido(['GET', 'PUT', 'DELETE']));

// Sub-recurso: reservas del usuario.
usuariosRouter.route('/:id/reservas')
    .get(validarId, usuariosController.listarReservas)
    .all(metodoNoPermitido(['GET']));
