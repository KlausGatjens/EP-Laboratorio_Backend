import { Router } from 'express';
import { sistemaController } from '../controllers/sistemaController.js';
import { metodoNoPermitido } from '../middlewares/manejoErrores.js';
import { comentariosRouter } from './comentarios.routes.js';
import { logsRouter } from './logs.routes.js';
import { mesasRouter } from './mesas.routes.js';
import { reservasRouter } from './reservas.routes.js';
import { usuariosRouter } from './usuarios.routes.js';
import { zonasRouter } from './zonas.routes.js';

/** Router principal de la versión 1 de la API: agrupa un router por recurso. */
export const apiRouter = Router();

apiRouter.route('/')
    .get(sistemaController.indice)
    .all(metodoNoPermitido(['GET']));

apiRouter.route('/salud')
    .get(sistemaController.salud)
    .all(metodoNoPermitido(['GET']));

// SQL Server: datos transaccionales
apiRouter.use('/zonas', zonasRouter);
apiRouter.use('/mesas', mesasRouter);
apiRouter.use('/usuarios', usuariosRouter);
apiRouter.use('/reservas', reservasRouter);

// MongoDB: reseñas y actividad del sistema
apiRouter.use('/comentarios', comentariosRouter);
apiRouter.use('/logs', logsRouter);
