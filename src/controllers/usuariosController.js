import { reservasRepository } from '../repositories/reservasRepository.js';
import { usuariosRepository } from '../repositories/usuariosRepository.js';
import { auditar, urlRecurso } from '../utils/auditoria.js';
import { ErrorHttp } from '../utils/ErrorHttp.js';

const USUARIO_NO_ENCONTRADO = 'El usuario no existe';

/** Solo se auditan los nombres: el correo y el teléfono son datos personales. */
const resumen = ({ nombres, apellidos }) => ({ nombres, apellidos });

export const usuariosController = {
    async listar(req, res) {
        res.json(await usuariosRepository.listar());
    },

    async obtener(req, res) {
        const usuario = await usuariosRepository.obtener(req.validado.params.id);
        if (!usuario) throw ErrorHttp.noEncontrado(USUARIO_NO_ENCONTRADO);
        res.json(usuario);
    },

    async crear(req, res) {
        const usuario = await usuariosRepository.crear(req.validado.body);
        void auditar(req, 'crear', 'usuario', usuario.idUsuario, resumen(usuario));
        res.status(201).location(urlRecurso('usuarios', usuario.idUsuario)).json(usuario);
    },

    async actualizar(req, res) {
        const { id } = req.validado.params;
        const usuario = await usuariosRepository.actualizar(id, req.validado.body);
        if (!usuario) throw ErrorHttp.noEncontrado(USUARIO_NO_ENCONTRADO);
        void auditar(req, 'actualizar', 'usuario', id, resumen(usuario));
        res.json(usuario);
    },

    /** Un usuario con reservas no se puede eliminar (FK): la API responde 409. */
    async eliminar(req, res) {
        const { id } = req.validado.params;
        if (!(await usuariosRepository.eliminar(id))) throw ErrorHttp.noEncontrado(USUARIO_NO_ENCONTRADO);
        void auditar(req, 'eliminar', 'usuario', id);
        res.status(204).end();
    },

    async listarReservas(req, res) {
        const { id } = req.validado.params;
        if (!(await usuariosRepository.obtener(id))) throw ErrorHttp.noEncontrado(USUARIO_NO_ENCONTRADO);
        res.json(await reservasRepository.listar({ idUsuario: id }));
    }
};
