import { Router } from 'express';
import { sistemaController } from '../controllers/sistemaController.js';
import { metodoNoPermitido } from '../middlewares/manejoErrores.js';

import { logsRouter } from './logs.routes.js';
import { mesasRouter } from './mesas.routes.js';
import { reservasRouter } from './reservas.routes.js';
import { clientesRouter } from './clientes.routes.js';

/** Router principal de la versión 1 de la API: agrupa un router por recurso. */
export const apiRouter = Router();

apiRouter.route('/')
    .get(sistemaController.indice)
    .all(metodoNoPermitido(['GET']));

// SQL Server: datos transaccionales
apiRouter.use('/mesas', mesasRouter);
apiRouter.use('/clientes', clientesRouter);
apiRouter.use('/reservas', reservasRouter);

// MongoDB: actividad del sistema

apiRouter.use('/logs', logsRouter);
