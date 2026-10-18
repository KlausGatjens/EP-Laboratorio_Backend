import { estaConectadoMongo } from '../db/mongodb.js';
import { comentariosRepository } from '../repositories/comentariosRepository.js';
import { reservasRepository } from '../repositories/reservasRepository.js';
import { auditar, urlRecurso } from '../utils/auditoria.js';
import { ErrorHttp } from '../utils/ErrorHttp.js';

const COMENTARIO_NO_ENCONTRADO = 'El comentario no existe';

const exigirMongo = () => {
    if (!estaConectadoMongo()) {
        throw ErrorHttp.servicioNoDisponible('El servicio de comentarios (MongoDB) no está disponible');
    }
};

export const comentariosController = {
    async listar(req, res) {
        exigirMongo();
        res.json(await comentariosRepository.listar(req.validado.query));
    },

    /** Promedios por zona calculados con un pipeline de agregación. */
    async resumen(req, res) {
        exigirMongo();
        res.json(await comentariosRepository.resumenPorZona());
    },

    async obtener(req, res) {
        exigirMongo();
        const comentario = await comentariosRepository.obtener(req.validado.params.id);
        if (!comentario) throw ErrorHttp.noEncontrado(COMENTARIO_NO_ENCONTRADO);
        res.json(comentario);
    },

    /**
     * Integridad entre las dos bases: antes de guardar en MongoDB se verifica en
     * SQL Server que la reserva exista y que la visita ya haya terminado.
     */
    async crear(req, res) {
        exigirMongo();
        const { idReserva, calificacion, aspectos, texto, etiquetas } = req.validado.body;

        const reserva = await reservasRepository.obtener(idReserva);
        if (!reserva) throw ErrorHttp.noEncontrado('La reserva no existe');
        if (reserva.fechaFin > new Date()) {
            throw ErrorHttp.conflicto('Solo se puede reseñar una visita que ya terminó');
        }
        if (await comentariosRepository.existeParaReserva(idReserva)) {
            throw ErrorHttp.conflicto('La reserva ya tiene una reseña');
        }

        // Datos de la mesa y del cliente embebidos: se leen sin consultar SQL Server.
        const documento = {
            idReserva,
            mesa: { idMesa: reserva.idMesa, numero: reserva.numeroMesa, zona: reserva.zona },
            autor: { idUsuario: reserva.idUsuario, nombre: reserva.cliente },
            calificacion
        };
        if (aspectos) documento.aspectos = aspectos;
        documento.texto = texto;
        if (etiquetas?.length) documento.etiquetas = etiquetas;
        documento.fechaVisita = reserva.fechaInicio;
        documento.fecha = new Date();

        const comentario = await comentariosRepository.crear(documento);
        void auditar(req, 'crear', 'comentario', comentario._id, { idReserva, calificacion });
        res.status(201).location(urlRecurso('comentarios', comentario._id)).json(comentario);
    },

    async eliminar(req, res) {
        exigirMongo();
        const { id } = req.validado.params;
        if (!(await comentariosRepository.eliminar(id))) throw ErrorHttp.noEncontrado(COMENTARIO_NO_ENCONTRADO);
        void auditar(req, 'eliminar', 'comentario', id);
        res.status(204).end();
    }
};
