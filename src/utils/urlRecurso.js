import { config } from '../config/env.js';

export const urlRecurso = (...segmentos) => [config.prefijoApi, ...segmentos].join('/');
