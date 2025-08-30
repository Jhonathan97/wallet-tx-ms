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

---

## 📑 Tabla de contenido
- [Arquitectura y decisiones](#arquitectura-y-decisiones)
- [Esquema de datos](#esquema-de-datos)
- [API (REST)](#api-rest)
- [Fraude (extra)](#fraude-extra)
- [Logs (pino)](#logs-pino)
- [Correr en local (sin K8s)](#correr-en-local-sin-k8s)
- [Docker Compose (opcional)](#docker-compose-opcional)
- [Kubernetes en local con Minikube](#kubernetes-en-local-con-minikube)
- [Swagger / OpenAPI](#swagger--openapi)
- [Pruebas](#pruebas)
- [CI/CD (GitHub Actions)](#cicd-github-actions)
- [Preguntas conceptuales](#preguntas-conceptuales)
- [Seguridad y notas](#seguridad-y-notas)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Arquitectura y decisiones
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
- **Migraciones**: no incluidas en esta entrega → en dev `synchronize: true`.

---

## 🗄️ Esquema de datos
*(simplificado)*

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

## 🌐 API (REST)

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
