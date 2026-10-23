import express from 'express';
import { config } from './config/env.js';
import { logging } from './middlewares/logging.js';
import { manejoErrores, rutaNoEncontrada } from './middlewares/manejoErrores.js';
import { apiRouter } from './routes/index.js';

export const app = express();

app.disable('x-powered-by');

app.use(logging);
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => res.redirect(config.prefijoApi));
app.use(config.prefijoApi, apiRouter);

app.use(rutaNoEncontrada);
app.use(manejoErrores);
