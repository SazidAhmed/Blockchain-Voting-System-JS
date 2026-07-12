# Update existing services to ship logs to Loki
# Add this logging configuration to each service in docker-compose.yml:
#
# logging:
#   driver: "json-file"
#   options:
#     labels: "service=service-name,project=voting"
#
# For each service, uncomment and update the logging section:

version: '3.8'

services:
  # Example: Add logging to MySQL
  mysql:
    logging:
      driver: "json-file"
      options:
        labels: "service=mysql,project=voting"
        max-size: "10m"
        max-file: "3"

  # Example: Add logging to Backend
  backend:
    logging:
      driver: "json-file"
      options:
        labels: "service=backend,project=voting"
        max-size: "10m"
        max-file: "3"

  # Example: Add logging to Blockchain
  blockchain-node:
    logging:
      driver: "json-file"
      options:
        labels: "service=blockchain,project=voting"
        max-size: "10m"
        max-file: "3"

  # Example: Add logging to Frontend
  frontend:
    logging:
      driver: "json-file"
      options:
        labels: "service=frontend,project=voting"
        max-size: "10m"
        max-file: "3"
