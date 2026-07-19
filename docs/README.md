# Blockchain Voting System — Documentation

University blockchain-based voting system. 5 Docker services, ECDSA P-256 signatures, PoW blockchain with Merkle tree verification.

## Quick Start

```bash
cp .env.example .env
docker-compose -f infra/docker/docker-compose.yml up --build -d
```

See [deployment/setup.md](deployment/setup.md) for full guide.

## Documentation Index

| Domain                                                    | Description                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| [Project](project/structure.md)                           | Repository layout, file map                                 |
| [Frontend](frontend/README.md)                            | Vue 3 app: pages, components, crypto, theming               |
| [Architecture](architecture/overview.md)                  | System design, blockchain mechanics, crypto                 |
| [Database](database/schema.md)                            | Schema, setup, migrations, reference                        |
| [API](api/backend.md)                                     | Backend, blockchain node, institution API                   |
| [Deployment](deployment/docker.md)                        | Docker, environment variables, setup                        |
| [Development](development/getting-started.md)             | Getting started, conventions, crypto impl                   |
| [Testing](testing/overview.md)                            | Test architecture, how to run, CI                           |
| [Monitoring](monitoring/stack.md)                         | Grafana, Prometheus, Loki, alerts                           |
| [Security](security/threat-model.md)                      | Threat model, audit, operations                             |
| [Knowledge](knowledge/blockchain.md)                      | Academic explainers: blockchain, crypto, security, e-voting |
| [Final Report](Final_report/PROJECT_REPORT_FINAL_IEEE.md) | Project reports and defense materials                       |
| [Archive](archive/README.md)                              | Historical docs (ZIP)                                       |

## Key Facts

- **Frontend**: Vue 3 + Vite + Vuex (port 5173)
- **Admin Panel**: Vue 3 + Vite + Pinia (port 5174)
- **Backend**: Express 5 + MySQL (port 3000)
- **Blockchain Nodes**: Express + LevelDB (ports 3001-3004)
- **Institution API**: Express 4 + MySQL (port 4000)
- **Crypto**: ECDSA P-256 (signatures), RSA-OAEP 2048-bit (encryption), SHA-256 (nullifiers, tx hashes)
- **Database**: MySQL 8.0, database name `voting_db`
- **Testing**: Integration-only via shell scripts, isolated test Docker stack
