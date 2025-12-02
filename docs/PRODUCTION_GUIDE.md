# Production Deployment Guide

**Deploy Conduit applications to production with confidence**

---

## Table of Contents

1. [Docker Deployment](#docker-deployment)
2. [Cloud Deployment](#cloud-deployment)
3. [Performance Tuning](#performance-tuning)
4. [Scaling Strategies](#scaling-strategies)
5. [Monitoring & Logging](#monitoring--logging)
6. [Security Best Practices](#security-best-practices)

---

## Docker Deployment

### Basic Dockerfile

Create `Dockerfile`:

```dockerfile
# Build stage
FROM ubuntu:22.04 AS builder

# Install Codon
RUN apt-get update && apt-get install -y curl build-essential
RUN /bin/bash -c "$(curl -fsSL https://exaloop.io/install.sh)"

# Copy application
WORKDIR /app
COPY . .

# Build application
RUN codon build -release main.codon -o app

# Runtime stage
FROM ubuntu:22.04

# Copy binary
COPY --from=builder /app/app /usr/local/bin/app

# Expose port
EXPOSE 8080

# Run
CMD ["/usr/local/bin/app"]
```

### Build and Run

```bash
# Build image
docker build -t my-conduit-app .

# Run container
docker run -p 8080:8080 my-conduit-app

# Run with environment variables
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e LOG_LEVEL=info \
  my-conduit-app
```

### Multi-Stage Build (Optimized)

```dockerfile
FROM ubuntu:22.04 AS builder

RUN apt-get update && \
    apt-get install -y curl build-essential && \
    /bin/bash -c "$(curl -fsSL https://exaloop.io/install.sh)" && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN codon build -release -o app main.codon

# Minimal runtime image
FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y ca-certificates && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/app /usr/local/bin/app

EXPOSE 8080

USER nobody

CMD ["/usr/local/bin/app"]
```

**Image size**: ~100MB (vs 1GB+ for Python)

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    depends_on:
      - prometheus
```

---

## Cloud Deployment

### AWS (ECS/Fargate)

**1. Push to ECR**:

```bash
# Authenticate
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

# Build and tag
docker build -t my-app .
docker tag my-app:latest \
  123456789.dkr.ecr.us-east-1.amazonaws.com/my-app:latest

# Push
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
```

**2. Create ECS Task Definition** (`task-definition.json`):

```json
{
  "family": "conduit-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/my-app:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [{ "name": "PORT", "value": "8080" }],
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:8080/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

**3. Deploy**:

```bash
# Register task definition
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster my-cluster \
  --service-name conduit-app \
  --task-definition conduit-app \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Google Cloud Platform (Cloud Run)

**1. Build and deploy**:

```bash
# Build with Cloud Build
gcloud builds submit --tag gcr.io/PROJECT_ID/conduit-app

# Deploy to Cloud Run
gcloud run deploy conduit-app \
  --image gcr.io/PROJECT_ID/conduit-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --port 8080 \
  --max-instances 10
```

**2. Auto-scaling**:

```bash
gcloud run services update conduit-app \
  --min-instances 1 \
  --max-instances 100 \
  --concurrency 80
```

### Azure (Container Instances)

```bash
# Create resource group
az group create --name conduit-rg --location eastus

# Deploy container
az container create \
  --resource-group conduit-rg \
  --name conduit-app \
  --image myregistry.azurecr.io/conduit-app:latest \
  --cpu 1 \
  --memory 1 \
  --registry-login-server myregistry.azurecr.io \
  --registry-username <username> \
  --registry-password <password> \
  --dns-name-label conduit-app \
  --ports 8080
```

### Kubernetes

Create `deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: conduit-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: conduit-app
  template:
    metadata:
      labels:
        app: conduit-app
    spec:
      containers:
        - name: app
          image: my-registry/conduit-app:latest
          ports:
            - containerPort: 8080
          env:
            - name: PORT
              value: "8080"
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: conduit-app
spec:
  selector:
    app: conduit-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: LoadBalancer
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: conduit-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: conduit-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

Deploy:

```bash
kubectl apply -f deployment.yaml
```

---

## Performance Tuning

### Application Configuration

**Optimize for throughput**:

```python
from conduit import Conduit

app = Conduit()

# Configuration
app.config = {
    "max_connections": 10000,      # Maximum concurrent connections
    "connection_timeout": 30,       # Connection timeout (seconds)
    "request_timeout": 60,          # Request timeout (seconds)
    "buffer_size": 65536,          # 64KB buffer
    "worker_threads": 8,            # Number of worker threads
}

app.run(port=8080)
```

### OS-Level Tuning

**Linux** (`/etc/sysctl.conf`):

```bash
# Increase file descriptors
fs.file-max = 2097152

# TCP tuning
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535

# Connection tuning
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1
net.core.netdev_max_backlog = 65535

# Memory
vm.overcommit_memory = 1
```

Apply:

```bash
sudo sysctl -p
```

### Resource Limits

**systemd** (`/etc/systemd/system/conduit.service`):

```ini
[Unit]
Description=Conduit Application
After=network.target

[Service]
Type=simple
User=conduit
ExecStart=/usr/local/bin/conduit-app
Restart=always

# Resource limits
LimitNOFILE=1048576
LimitNPROC=512
LimitMEMLOCK=infinity

# Environment
Environment="PORT=8080"
Environment="LOG_LEVEL=info"

[Install]
WantedBy=multi-user.target
```

### ML Model Optimization

**Use ONNX with GPU**:

```python
from conduit.ml import load_onnx_model

# Enable GPU acceleration
model = load_onnx_model(
    "model.onnx",
    use_gpu=True,          # 50-200x speedup
    device_id=0,
    optimization_level=3   # Maximum optimization
)
```

**Batch inference**:

```python
# Instead of:
for item in items:
    result = model.predict(item)  # Slow!

# Do:
results = model.predict_batch(items)  # 10-100x faster
```

---

## Scaling Strategies

### Vertical Scaling

**Resources per instance**:

| Workload     | CPU   | Memory    | Notes           |
| ------------ | ----- | --------- | --------------- |
| Light (MCP)  | 0.5-1 | 512MB-1GB | JSON processing |
| Medium (API) | 1-2   | 1-2GB     | Standard API    |
| Heavy (ML)   | 2-4+  | 2-8GB+    | ML inference    |

### Horizontal Scaling

**Load balancing** (Nginx):

```nginx
upstream conduit_backend {
    least_conn;  # or ip_hash for sticky sessions

    server app1:8080 max_fails=3 fail_timeout=30s;
    server app2:8080 max_fails=3 fail_timeout=30s;
    server app3:8080 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;

    location / {
        proxy_pass http://conduit_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Timeouts
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        access_log off;
        proxy_pass http://conduit_backend/health;
    }
}
```

### Auto-Scaling Rules

**AWS ECS**:

```bash
# CPU-based scaling
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/my-cluster/conduit-app \
  --min-capacity 2 \
  --max-capacity 10

aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/my-cluster/conduit-app \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

---

## Monitoring & Logging

### Prometheus Integration

**Configure scraping** (`prometheus.yml`):

```yaml
scrape_configs:
  - job_name: "conduit"
    scrape_interval: 15s
    static_configs:
      - targets: ["app:8080"]
    metrics_path: "/metrics"
```

### Grafana Dashboards

**Import dashboard JSON** (simplified):

```json
{
  "dashboard": {
    "title": "Conduit Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time (p99)",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, http_request_duration_seconds_bucket)"
          }
        ]
      }
    ]
  }
}
```

### Centralized Logging

**FluentBit configuration**:

```yaml
[SERVICE]
    Flush        5
    Daemon       off
    Log_Level    info

[INPUT]
    Name         tail
    Path         /var/log/conduit/*.log
    Parser       json

[OUTPUT]
    Name         es
    Match        *
    Host         elasticsearch
    Port         9200
    Index        conduit-logs
```

---

## Security Best Practices

### 1. Use HTTPS

**Let's Encrypt** (Nginx):

```nginx
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://conduit_backend;
    }
}
```

### 2. Rate Limiting

```python
from conduit.framework.security import rate_limit

# Per-IP rate limiting
app.use(rate_limit(
    max_requests=1000,
    window_seconds=60,
    per_ip=True
))
```

### 3. Authentication

```python
from conduit.framework.security import AuthMiddleware

# API key authentication
api_keys = {
    "secret-key-prod-1": "client1",
    "secret-key-prod-2": "client2"
}

app.use(AuthMiddleware(api_keys=api_keys))
```

### 4. Input Validation

```python
from conduit.framework.security import InputValidator

validator = InputValidator()

@app.post("/api/data")
def process_data(req, res):
    data = req.json()

    # Validate
    errors = validator.validate_required(data, ["user_id", "action"])
    if errors:
        abort(400, "Validation failed", "; ".join(errors))

    # Process...
```

### 5. Secrets Management

**AWS Secrets Manager**:

```bash
# Store secret
aws secretsmanager create-secret \
  --name conduit/api-keys \
  --secret-string '{"key1":"value1","key2":"value2"}'

# Retrieve in application
aws secretsmanager get-secret-value \
  --secret-id conduit/api-keys
```

---

## Performance Comparison

| Metric            | Python (Flask) | Node.js (Express) | Conduit      |
| ----------------- | -------------- | ----------------- | ------------ |
| Requests/sec      | 1,000          | 5,000             | **100,000+** |
| Latency (p99)     | 100ms          | 20ms              | **<1ms**     |
| Memory (1K req/s) | 500MB          | 200MB             | **50MB**     |
| Cold start        | 2-5s           | 1-2s              | **<100ms**   |
| Container size    | 1GB+           | 500MB+            | **~100MB**   |

---

## Next Steps

1. **Monitor**: Set up Prometheus + Grafana
2. **Scale**: Configure auto-scaling based on load
3. **Secure**: Enable HTTPS, rate limiting, auth
4. **Optimize**: Tune OS, application, and ML models
5. **Test**: Load test before production (Apache Bench, k6, Locust)

**Need help?** Check the [API Reference](./API_REFERENCE.md) or [Examples](../examples/)
