<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

# Wallet Transactions Microservice (NestJS + Fastify + TypeORM + PostgreSQL)

Microservicio de billetera digital que procesa depósitos/retiros, mantiene saldo por usuario, registra el historial de transacciones y expone APIs REST. Incluye validaciones, idempotencia por `transaction_id`, concurrencia segura, regla antifraude simple, logs con pino, contenedores Docker y manifests Kubernetes.


# 🏗️ Arquitectura y decisiones
- **NestJS + Fastify** (rendimiento en IO).
- **TypeORM + PostgreSQL** (relacional).
- **Moneda en centavos (enteros)** para evitar errores de coma flotante.
- **Idempotencia**: `transaction_id` único.
- **Concurrencia**: transacción DB `SERIALIZABLE` + `SELECT ... FOR UPDATE`.
- **Identidad de usuario**:
  - `users.id` (BIGINT autoincremental) → interno.
  - `users.external_id` → identificador externo recibido en la API.
  - `transactions.user_id` → FK a `users.id`.
- **Logs**: `@nestjs/pino` (JSON; pretty en dev).
- **Antifraude**: regla simple → “3+ transacciones ≥ umbral en 5 min” → `logger.warn`.
.

---

# 🗄️ Esquema de datos

- **users**
  - id (PK)
  - external_id (string, único)

- **transactions**
  - id (PK)
  - transaction_id (string, único, idempotencia)
  - user_id (FK → users.id)
  - amount (int, centavos)
  - type (enum: deposit | withdraw)
  - timestamp (timestamptz)

---

# 🌐 API (REST)

### Crear transacción
```http
POST /api/transactions
{
  "transaction_id": "tx-001",
  "user_id": "ext-123",
  "amount": "10000",
  "type": "deposit",
  "timestamp": "2025-08-27T16:00:00Z"
}

```
### Historial por usuario
```http
GET /api/transactions/:externalId?limit=50&offset=0

```

### Saldo actual
```http
GET /api/transactions/:externalId/balance

```

### Health
```http
GET /api/health → { "status": "ok" }
```

# 🛡️ Esquema de datos
Regla simple en FraudService:

- Umbral: 200_00 (≈ $200.00 en centavos).

- Ventana: 5 minutos.

- Si hay ≥ 3 transacciones ≥ umbral en la ventana → logger.warn.

- Extensible a SNS/Email/flag de auditoría.

# 📜 Logs (pino)

- Integracion con @nestjs/pino

- Logs de negocio en TransactionsService



# 🐳 Deploy Docker  local (sin k8s)
```
npm install
docker compose up -d postgres
npm run start:dev
```
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=wallet
DB_PASSWORD=wallet
DB_NAME=wallet
```

# 🚀 Deploy  Kubernetes (k8s)

### Prerrequisitos

- Docker

- kubectl

- Minikube

- (Opcional) Helm (para levantar Postgres dentro del cluster)

###  Manifests

- ConfigMap: variables de entorno.

- Secret: credenciales DB.

- Deployment: wallet-api.

- Service: tipo LoadBalancer → expone la API.

- Helm: bitnami/postgresql para DB.

### Rutas útiles Minikube
```
minikube service list
minikube  start
minikube service wallet-api --url
```
# 🧪  Pruebas unitarias 

```
npm run test

``` 
# ❓ Preguntas conceptuales

### 1) ¿Cómo manejar picos altos de transacciones para garantizar escalabilidad?

- Horizontal scaling con réplicas (HPA por CPU/RPS/latencia).

- Desacople con colas (SQS/Kafka/Kinesis) + workers escalables.

- Idempotencia para permitir reintentos.

- DB gestionada (RDS) con réplicas de lectura.

- Backpressure / Rate limiting.

- Cache de lectura (Redis) para saldo/historial reciente.

### 2) ¿Qué estrategias usarías para prevenir fraudes?

- Reglas determinísticas (umbral, velocity, geolocalización, device fingerprint).

- Límites diarios por usuario.

- Detección en streaming + alertas.

- ML supervisado (frecuencia/monto).

- Controles KYC/AML, 2FA, auditoría.

### 3) ¿Cómo mejorar rendimiento ante alta concurrencia?

- Reducir contención (operaciones atómicas).

- Minimizar ventana transaccional.

- Índices adecuados.

- Sharding por user_id o advisory locks.

- Escalamiento horizontal app/DB.

- Cache/batching/colas.
