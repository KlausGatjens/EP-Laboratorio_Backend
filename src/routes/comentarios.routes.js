import { Router } from 'express';
import { comentariosController } from '../controllers/comentariosController.js';
import { metodoNoPermitido } from '../middlewares/manejoErrores.js';
import {
    validarComentario, validarConsultaComentarios, validarIdComentario
} from '../middlewares/validacion.js';

export const comentariosRouter = Router();

comentariosRouter.route('/')
    .get(validarConsultaComentarios, comentariosController.listar)
    .post(validarComentario, comentariosController.crear)
    .all(metodoNoPermitido(['GET', 'POST']));

// Antes de "/:id" para que "resumen" no se interprete como un identificador.
comentariosRouter.route('/resumen')
    .get(comentariosController.resumen)
    .all(metodoNoPermitido(['GET']));

comentariosRouter.route('/:id')
    .get(validarIdComentario, comentariosController.obtener)
    .delete(validarIdComentario, comentariosController.eliminar)
    .all(metodoNoPermitido(['GET', 'DELETE']));
