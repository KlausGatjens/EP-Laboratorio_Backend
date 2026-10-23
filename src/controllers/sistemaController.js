import { config } from '../config/env.js';

export const sistemaController = {
    indice(req, res) {
        const p = config.prefijoApi;
        res.json({
            nombre: 'Restaurante Sazón Criolla - API de Reservas',
            recursos: { clientes: `${p}/clientes`, mesas: `${p}/mesas`,
                reservas: `${p}/reservas`, logs: `${p}/logs` }
        });
    }
};
