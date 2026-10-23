# Restaurante Sazón Criolla — API REST

Proyecto de parcial con **Node.js, Express, SQL Server y MongoDB**.
Los recursos del enunciado se adaptan al restaurante: Usuarios → Clientes y Salas → Mesas.

## Preparación y ejecución

Requiere Node.js 20.6 o superior, SQL Server con acceso TCP y autenticación SQL, y MongoDB.

1. Ejecutar `inicializar.sql` de `EP-Laboratorio_BBDD`, siguiendo su README.
2. Ejecutar `npm run inicializar` en `EP-Laboratorio_MongoDB`, siguiendo su README.
3. En esta carpeta:

```powershell
npm install
Copy-Item .env.example .env
# Editar .env con las credenciales y conexiones.
npm run dev
```

`npm start` ejecuta sin recarga automática y `npm test` ejecuta las pruebas sin bases reales.
La API queda en `http://localhost:3000/api/v1`.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| PORT | Puerto HTTP, por defecto 3000 |
| NODE_ENV | Entorno, por defecto development |
| SQL_SERVER / SQL_PORT | Servidor y puerto de SQL Server |
| SQL_INSTANCE | Instancia con nombre; si se indica, reemplaza SQL_PORT |
| SQL_DATABASE | RestauranteDB |
| SQL_USER / SQL_PASSWORD | Credenciales SQL, obligatorias |
| SQL_ENCRYPT / SQL_TRUST_CERTIFICATE | Opciones de conexión TLS |
| MONGO_URI / MONGO_DATABASE | Conexión y base de MongoDB; coinciden con su inicializador |

La plantilla está en `.env.example`. `.env` contiene credenciales y se excluye de Git.

## Estructura

`src/routes` separa los recursos; `controllers` atiende las peticiones; `repositories` consulta las bases;
`db` mantiene las conexiones y `config` lee el entorno.

Los tres middlewares son:

- **logging:** registra método, ruta, estado y duración en consola y MongoDB.
- **validacion:** comprueba campos obligatorios, tipos, correo, teléfono y formato de fechas; devuelve solo el primer error.
- **manejoErrores:** devuelve errores JSON con un formato uniforme y los registra en MongoDB.

SQL Server tiene solo Clientes, Mesas y Reservas, en 3FN. MongoDB guarda solo la actividad del sistema.
La API requiere las dos conexiones para iniciar; si faltan objetos, informa qué inicializador ejecutar.

## Endpoints

Todas las rutas de la tabla se agregan a `/api/v1`. Se reciben y devuelven datos JSON.

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/` | Recursos disponibles |
| GET | `/clientes` | Lista de clientes |
| POST | `/clientes` | Crear cliente |
| GET | `/clientes/:id` | Obtener cliente |
| PUT | `/clientes/:id` | Reemplazar cliente |
| DELETE | `/clientes/:id` | Eliminar cliente sin reservas |
| GET | `/mesas` | Lista de mesas |
| POST | `/mesas` | Crear mesa |
| GET | `/mesas/:id` | Obtener mesa |
| PUT | `/mesas/:id` | Reemplazar mesa |
| DELETE | `/mesas/:id` | Eliminar mesa sin reservas |
| GET | `/reservas` | Lista de reservas |
| POST | `/reservas` | Registrar con RegistrarReserva |
| GET | `/reservas/:id` | Obtener reserva |
| PUT | `/reservas/:id` | Reemplazar reserva con ActualizarReserva |
| DELETE | `/reservas/:id` | Cancelar reserva con SQL parametrizado |
| GET | `/logs` | Consultar actividad de MongoDB |

`/logs` devuelve los 100 eventos más recientes, sin filtros.

### Cuerpos de ejemplo

Cliente:
```json
{ "nombres": "Ana", "apellidos": "Torres", "correo": "ana@correo.pe", "telefono": "987654321" }
```

Mesa:
```json
{ "numero": 4, "capacidad": 4, "activa": true }
```

Reserva:
```json
{ "idCliente": 1, "idMesa": 1, "fechaInicio": "2030-01-15T13:00:00-05:00",
  "fechaFin": "2030-01-15T15:00:00-05:00", "numeroPersonas": 2, "observaciones": "Cumpleaños" }
```

Las fechas de reservas deben indicar zona horaria y ser futuras; SQL las guarda en UTC.
La mesa debe estar activa, admitir el número de personas y no tener una reserva en el mismo intervalo.
`observaciones` es opcional. `activa` es opcional en POST y obligatoria en PUT.

## Richardson nivel 2

Se usan recursos con sustantivos, GET para leer, POST para crear, PUT para reemplazar y DELETE para eliminar.
Las respuestas usan los códigos correspondientes:

| Código | Uso |
| --- | --- |
| 200 | Lectura o actualización correcta |
| 201 | Creación correcta, incluye Location |
| 204 | Eliminación correcta, sin cuerpo |
| 400 | Datos inválidos o JSON mal formado |
| 404 | Recurso o ruta inexistente |
| 405 | Método no permitido, incluye Allow |
| 409 | Duplicados, mesa ocupada o registros con reservas |
| 413 | JSON demasiado grande |
| 500 | Error inesperado |
| 503 | Base de datos no disponible |

## Demostración y pruebas

`request.http` permite probar con REST Client de VS Code. La colección de `postman/` permite ejecutar
la misma secuencia con Run collection: crear cliente, mesa y reserva; consultar; actualizar y limpiar.
Las fechas de demostración se calculan automáticamente.

Las pruebas usan repositorios simulados para comprobar el contrato HTTP, la validación,
los errores, las cabeceras y los eventos de logging. No sustituyen una prueba de persistencia en SQL Server.

Las reglas de fechas futuras y ordenadas, capacidad y disponibilidad se comprueban en los procedimientos SQL.
El teléfono conserva su validación: de 7 a 14 dígitos, prefijo + opcional y limpieza de espacios y guiones.
Los campos numéricos positivos usan el rango técnico de INT de SQL Server, sin límites de negocio como 20 personas o mesa 999.
