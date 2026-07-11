# FitOra AWS Deployment

Templates for deploying FitOra on AWS. Two recommended patterns:

## Option A: EC2 + Docker Compose (simplest)

1. Launch **t3.medium** EC2 (ap-south-1) with Amazon Linux 2023
2. Attach IAM role with ECR pull + Secrets Manager read
3. Install Docker + Docker Compose
4. Clone repo, copy `.env.production`, place SSL certs in `infra/nginx/ssl/`
5. Run: `docker compose -f docker-compose.prod.yml up -d`

Use **RDS PostgreSQL** and **ElastiCache Redis** instead of containerized DB for production.

## Option B: ECS Fargate + ALB

| Component | AWS Service |
|-----------|-------------|
| API | ECS Fargate + ALB target group |
| Web/Admin | S3 + CloudFront OR ECS Fargate |
| Database | RDS PostgreSQL 16 (Multi-AZ) |
| Cache | ElastiCache Redis 7 |
| Secrets | AWS Secrets Manager |
| Logs | CloudWatch Logs |
| Backups | RDS automated backups + S3 (`backup-db.sh`) |
| SSL | ACM certificate on ALB |
| DNS | Route 53 → Cloudflare (optional proxy) |

### ECR setup

```bash
aws ecr create-repository --repository-name fitora-api --region ap-south-1
aws ecr create-repository --repository-name fitora-web --region ap-south-1
aws ecr create-repository --repository-name fitora-admin --region ap-south-1
```

### Deploy ECS task

```bash
envsubst < infra/aws/ecs-task-definition.json > /tmp/task-def.json
aws ecs register-task-definition --cli-input-json file:///tmp/task-def.json
aws ecs update-service --cluster fitora-prod --service fitora-api --force-new-deployment
```

### RDS connection string

```
postgresql://fitora:PASSWORD@fitora-prod.xxxxx.ap-south-1.rds.amazonaws.com:5432/fitora?schema=public&sslmode=require
```

### CloudWatch alarms (recommended)

- ECS CPU > 80% for 5 min
- ALB 5xx count > 10/min
- RDS free storage < 5 GB
- RDS CPU > 85%

## Secrets Manager structure

```
fitora/prod/database     → DATABASE_URL
fitora/prod/jwt          → JWT_SECRET
fitora/prod/jwt-refresh → JWT_REFRESH_SECRET
fitora/prod/razorpay     → RAZORPAY_KEY_SECRET
fitora/prod/sendgrid     → SENDGRID_API_KEY
```
