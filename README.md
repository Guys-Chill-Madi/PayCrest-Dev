# PayCrest LMS — Production Kubernetes Deployment

<div align="center">

![Kubernetes](https://img.shields.io/badge/Kubernetes-v1.34.6-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)
![Helm](https://img.shields.io/badge/Helm-v3-0F1689?style=for-the-badge&logo=helm&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Hub-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI/CD-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)
![Prometheus](https://img.shields.io/badge/Prometheus-Monitoring-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-Dashboards-F46800?style=for-the-badge&logo=grafana&logoColor=white)

**A full-stack microservices Loan Management System deployed on a production-grade bare-metal Kubernetes cluster — built as a DevOps training project covering the complete software delivery lifecycle.**

[Architecture](#architecture) • [Prerequisites](#prerequisites) • [Quick Start](#quick-start) • [CI/CD Pipeline](#cicd-pipeline) • [Monitoring](#monitoring) • [Contributing](#contributing) • [Security](#security-policy)

</div>

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Helm Chart Configuration](#helm-chart-configuration)
- [Namespace Design](#namespace-design)
- [Network Policies](#network-policies)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring & Alerting](#monitoring--alerting)
- [Storage](#storage)
- [Contributing](#contributing)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Branch Strategy](#branch-strategy)
- [Security Policy](#security-policy)

---

## Project Overview

PayCrest LMS is a microservices-based Loan Management System deployed on a **3-node bare-metal kubeadm Kubernetes cluster** hosted on AWS EC2. This project was built as a comprehensive DevOps training exercise covering:

- **Container orchestration** with Kubernetes (kubeadm)
- **Package management** with Helm umbrella charts
- **Service mesh routing** with kgateway (Envoy proxy)
- **Network security** with Calico CNI and Kubernetes NetworkPolicies
- **GitOps CI/CD** with GitHub Actions
- **Observability** with Prometheus, Grafana, and Alertmanager
- **Persistent storage** with NFS CSI driver
- **Policy enforcement** with Kyverno admission controller
- **Security scanning** with SonarQube, Snyk, and Trivy

The application consists of **8 Python FastAPI microservices**, a **Node.js API gateway**, a **React frontend**, and a **MongoDB database** — all orchestrated across **5 isolated Kubernetes namespaces**.

---

## Architecture

```
                          ┌─────────────────────────────────────────┐
                          │           AWS VPC (10.0.0.0/16)         │
                          │         Availability Zone: us-east-1a   │
                          │           Subnet: 10.0.1.0/24           │
                          │                                          │
   Internet Users         │  ┌──────────────────┐  ┌─────────────┐  │
   (Admin/Customer/       │  │ EC2: HAProxy      │  │ EC2:        │  │
    Manager)              │  │ + NFS Server      │  │ SonarQube   │  │
        │                 │  │ (10.0.1.27)       │  │ Server      │  │
        │ HTTP :80        │  │ Port 80 → 31748   │  └─────────────┘  │
        └─────────────────┼──►                  │                    │
                          │  └────────┬─────────┘                    │
                          │           │ NodePort :31748               │
                          │  ┌────────▼────────────────────────────┐ │
                          │  │         Kubernetes Cluster           │ │
                          │  │  ┌──────────────────────────────┐   │ │
                          │  │  │  pc-gateway (Envoy/kgateway)  │   │ │
                          │  │  │  HTTPRoute → /api → pc-edge   │   │ │
                          │  │  │  HTTPRoute → /    → pc-frontend│  │ │
                          │  │  └──────┬───────────────┬────────┘   │ │
                          │  │         │               │             │ │
                          │  │  ┌──────▼──────┐ ┌─────▼──────────┐ │ │
                          │  │  │  pc-edge    │ │  pc-frontend   │ │ │
                          │  │  │  api-gateway│ │  React/Nginx   │ │ │
                          │  │  │  (Node.js)  │ └────────────────┘ │ │
                          │  │  └──────┬──────┘                    │ │
                          │  │         │ TCP :8000                  │ │
                          │  │  ┌──────▼──────────────────────┐    │ │
                          │  │  │           pc-app             │    │ │
                          │  │  │  auth    loan    wallet      │    │ │
                          │  │  │  admin   payment emi         │    │ │
                          │  │  │  manager verification        │    │ │
                          │  │  └──────┬───────────────────────┘    │ │
                          │  │         │ TCP :27017                  │ │
                          │  │  ┌──────▼──────┐  ┌──────────────┐   │ │
                          │  │  │   pc-data   │  │  monitoring  │   │ │
                          │  │  │   MongoDB   │  │  Prometheus  │   │ │
                          │  │  │  StatefulSet│  │  Grafana     │   │ │
                          │  │  └──────┬──────┘  │  Alertmanager│   │ │
                          │  │         │          └──────────────┘   │ │
                          │  └─────────┼────────────────────────────┘ │
                          │            │ NFS Mount                     │
                          │  ┌─────────▼──────────────────────┐       │
                          │  │  NFS Server /var/nfs/paycrest   │       │
                          │  │  PV (mongo-data) + PV (uploads) │       │
                          │  └────────────────────────────────┘       │
                          └─────────────────────────────────────────┘
```

### Traffic Routing Explained

1. **User → HAProxy** — All HTTP traffic enters through HAProxy on port 80
2. **HAProxy → NodePort** — Round-robin load balanced to NodePort 31748 on worker nodes
3. **NodePort → kgateway** — kube-proxy DNAT rules forward to kgateway/Envoy pod
4. **kgateway → HTTPRoute** — Envoy matches path prefix and routes:
   - `/api/*` → `api-gateway` service in `pc-edge` namespace
   - `/*` → `frontend-service` in `pc-frontend` namespace
5. **api-gateway → microservices** — JWT validation then forwards to respective service via DNS
6. **microservices → MongoDB** — Direct connection via headless service DNS

> **Key insight:** The React frontend runs in the user's browser after initial load. All API calls come from the browser directly to HAProxy — not from the frontend pod. This is why the NetworkPolicy between `pc-frontend` and `pc-edge` is not needed.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Container Orchestration | Kubernetes v1.34.6 (kubeadm) | Cluster management |
| Package Management | Helm v3 | Kubernetes package manager |
| CNI | Calico | Pod networking + NetworkPolicy enforcement |
| Ingress/Gateway | kgateway (Envoy) | Layer 7 routing |
| Frontend | React + Nginx | SPA served as static files |
| API Gateway | Node.js (Express) | JWT auth + request routing |
| Microservices | Python FastAPI (×8) | Business logic |
| Database | MongoDB 7.0 | Document storage |
| Storage | NFS CSI Driver | Persistent volumes |
| CI/CD | GitHub Actions | Automated pipelines |
| Image Registry | Docker Hub | Container image storage |
| Code Quality | SonarQube | Static analysis + quality gates |
| Dependency Security | Snyk | Vulnerability scanning |
| Container Security | Trivy | Container image scanning |
| Monitoring | Prometheus + Grafana | Metrics + dashboards |
| Alerting | Alertmanager + Slack | Alert routing |
| Policy | Kyverno | Admission control |
| Infrastructure | AWS EC2 (bare-metal) | Compute |

---

## Repository Structure

```
PayCrest-Dev/
├── infra/
│   ├── Helm/                          # Umbrella Helm chart
│   │   ├── Chart.yaml                 # Umbrella chart with 11 dependencies
│   │   ├── values.yaml                # Default values
│   │   ├── values-noel.yaml           # Environment-specific overrides
│   │   ├── templates/
│   │   │   ├── _helpers.tpl           # Reusable template helpers
│   │   │   ├── app-secrets.yaml       # pc-secrets-global secret
│   │   │   ├── api-secrets.yaml       # pc-secret-api secret
│   │   │   ├── configmap.yaml         # Global configmap
│   │   │   ├── frontend-configmap.yaml# Nginx config
│   │   │   ├── network-policies.yaml  # All namespace NetworkPolicies
│   │   │   ├── gateway.yaml           # kgateway Gateway resource
│   │   │   ├── routes.yaml            # HTTPRoute rules
│   │   │   ├── pvc.yaml               # Upload PersistentVolumeClaim
│   │   │   ├── storageclass.yaml      # NFS StorageClass
│   │   │   ├── reference-api.yaml     # ReferenceGrant for api-gateway
│   │   │   └── reference-frontend.yaml# ReferenceGrant for frontend
│   │   └── charts/
│   │       ├── mongodb/               # MongoDB StatefulSet
│   │       ├── api-gateway/           # Node.js API gateway
│   │       ├── frontend/              # React frontend
│   │       ├── admin-service/
│   │       ├── auth-service/
│   │       ├── emi-service/
│   │       ├── loan-service/          # Has HPA
│   │       ├── manager-service/
│   │       ├── payment-service/
│   │       ├── verification-service/
│   │       └── wallet-service/
│   ├── create-admin.yaml              # One-time admin user creation job
│   ├── update-mongo-ip.sh             # MongoDB IP update script (workaround)
│   └── essential-alerts.yaml          # PrometheusRule for alerting
├── monitoring/
│   └── essential-alerts.yaml          # Prometheus alerting rules
└── .github/
    └── workflows/
        ├── admin-service.yml          # CI/CD pipeline
        ├── auth-service.yml
        ├── loan-service.yml
        ├── payment-service.yml
        ├── verification-service.yml
        ├── wallet-service.yml
        ├── emi-service.yml
        └── manager-service.yml
```

---

## Prerequisites

### Infrastructure Requirements

| Component | Spec | Count |
|-----------|------|-------|
| Master Node EC2 | t3.medium (2 vCPU, 4GB RAM) | 1 |
| Worker Node EC2 | t3.medium (2 vCPU, 4GB RAM) | 2 |
| HAProxy + NFS EC2 | t3.small (2 vCPU, 2GB RAM) | 1 |
| SonarQube EC2 | t3.medium (2 vCPU, 4GB RAM) | 1 |

### Software Requirements

- kubeadm v1.34.6
- containerd v1.7+
- Helm v3.x
- Calico CNI v3.27+
- NFS CSI Driver
- kgateway v2.0.3
- Prometheus kube-prometheus-stack

### GitHub Secrets Required

```
DOCKER_USERNAME          # Docker Hub username
DOCKER_PASSWORD          # Docker Hub password/token
SONAR_TOKEN              # SonarQube authentication token
SONAR_HOST_URL           # SonarQube server URL
SNYK_TOKEN               # Snyk authentication token
MAIL_USERNAME            # Gmail address for notifications
MAIL_PASSWORD            # Gmail app password
DEVELOPMENT_TEAM_EMAIL   # Team email for notifications
```

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-ORG/PayCrest-Dev.git
cd PayCrest-Dev/infra/Helm
```

### 2. Create namespaces and labels

```bash
for ns in pc-app pc-data pc-edge pc-frontend pc-gateway; do
  kubectl create namespace $ns
done

for ns in pc-app pc-data pc-edge pc-frontend pc-gateway kube-system kgateway-system; do
  kubectl label namespace $ns kubernetes.io/metadata.name=$ns --overwrite
done
```

### 3. Update values for your environment

```bash
cp values.yaml values-myenv.yaml
# Edit values-myenv.yaml:
# - nfs.server: your NFS server IP
# - nfs.share: your NFS share path
# - image tags if needed
```

### 4. Deploy with Helm

```bash
helm dependency update
helm lint . -f values-myenv.yaml
helm install paycrest-v1 . -f values-myenv.yaml
```

### 5. Post-install steps

```bash
# Fix NFS upload permissions
UPLOAD_PVC=$(kubectl get pvc pc-upload-pvc -n pc-app -o jsonpath='{.spec.volumeName}')
# SSH to NFS server and run:
# chmod 777 /var/nfs/paycrest/${UPLOAD_PVC}

# Create admin user (runs automatically as a Job)
kubectl logs job/create-admin -n pc-app

# Verify all pods are running
kubectl get pods -A
```

### 6. Access the application

```bash
# Get HAProxy IP
echo "App URL: http://<haproxy-ip>"

# Test login
curl -s http://<haproxy-ip>/api/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@lms.com&password=admin123" | python3 -m json.tool
```

---

## Helm Chart Configuration

### values.yaml Structure

All environment-specific configuration lives in `values.yaml`. Override with `-f values-myenv.yaml` for different environments.

```yaml
# NFS Storage backend
nfs:
  server: "10.0.1.27"      # Change per environment
  share: "/var/nfs/paycrest"

# Per-service configuration
authService:
  image: "chillmadiguys/auth-service:v1.1.1"   # Pin exact version
  replicas: 2                                    # HA - 2 replicas minimum
  resources:
    requests:
      cpu: "100m"     # Guaranteed CPU
      memory: "96Mi"  # Guaranteed memory
    limits:
      cpu: "200m"     # Maximum CPU
      memory: "512Mi" # OOMKill threshold
```

### Template Helpers (`_helpers.tpl`)

Shared templates eliminate code duplication across 8 service files:

| Helper | Purpose |
|--------|---------|
| `paycrest.labels` | Common Helm labels on all resources |
| `paycrest.appEnvFrom` | Standard secret + configmap injection |
| `paycrest.appProbes` | Liveness + readiness probes on port 8000 |
| `paycrest.antiAffinity` | Pod spread across nodes |
| `paycrest.rollingUpdate` | Zero-downtime deployment strategy |
| `paycrest.uploadVolumeMount` | NFS volume mount at `/app/uploads` |
| `paycrest.uploadVolume` | PVC reference |

### Deploying to a New Environment

```bash
# Create environment values file
cat > values-production.yaml << EOF
nfs:
  server: "10.x.x.x"
  share: "/var/nfs/paycrest"

appSecrets:
  jwtSecret: "CHANGE_ME_IN_PRODUCTION"
  internalServiceToken: "CHANGE_ME_IN_PRODUCTION"
EOF

helm install paycrest-prod . -f values-production.yaml
```

---

## Namespace Design

We use **5 isolated namespaces** instead of a single namespace for security isolation and blast radius reduction.

| Namespace | Contains | Trust Level |
|-----------|---------|-------------|
| `pc-gateway` | kgateway/Envoy proxy | Public — accepts internet traffic |
| `pc-frontend` | React/Nginx | Semi-public — serves static files |
| `pc-edge` | Node.js API gateway | Internal — requires gateway auth |
| `pc-app` | 8 Python microservices | Internal — requires edge auth |
| `pc-data` | MongoDB | Private — database only |

**Why not one namespace?** A single namespace with no NetworkPolicies means any compromised pod can reach any other pod — including the database. With 5 namespaces enforced by NetworkPolicies, compromising the frontend pod gives an attacker no path to the database. Each namespace boundary is a security checkpoint.

---

## Network Policies

All NetworkPolicies are defined in `templates/network-policies.yaml` and follow the **principle of least privilege** — deny all, then allow only what is necessary.

### Trust Chain

```
Internet ──► pc-gateway ──► pc-edge ──► pc-app ──► pc-data
              (public)     (port 3000) (port 8000) (port 27017)
```

### Policy Summary

| Policy | Namespace | Ingress From | Egress To |
|--------|-----------|-------------|-----------|
| `gateway-policy` | pc-gateway | Anyone (internet) | pc-edge:3000, pc-frontend:80 |
| `gateway-shield` | pc-edge | pc-gateway only | pc-app:8000 |
| `frontend-isolation` | pc-frontend | pc-gateway only | DNS only |
| `app-isolation` | pc-app | pc-edge + intra-namespace | pc-data:27017, DNS, external:443 |
| `allow-from-app` | pc-data | pc-app only | — |

### Why ipBlock Rules?

Every NetworkPolicy that routes through a Kubernetes Service also needs an `ipBlock` for the Service CIDR (`10.96.0.0/12`). This is because kube-proxy rewrites packet destinations from pod IP to Service ClusterIP — without the ipBlock rule, the return traffic gets dropped even if the pod-to-pod rule allows it.

---

## CI/CD Pipeline

Each microservice has its own independent GitHub Actions pipeline with two main jobs:

### Pipeline Flow

```
Push to 'test' branch
        │
        ▼
┌───────────────────┐
│ Security & Validation │
│                       │
│ 1. SonarQube Scan     │──── FAIL ──► Email Notification
│ 2. Quality Gate       │
│ 3. Snyk Dependency    │
│ 4. Docker Build       │
│ 5. Trivy Scan         │
└───────┬───────────┘
        │ PASS
        ▼
Pull Request to 'main'
        │
Manual workflow_dispatch
  (with version tag)
        │
        ▼
┌───────────────────┐
│ Release to Production │
│                       │
│ 1. Validate semver tag│
│ 2. Final Docker build │
│ 3. Trivy critical check│
│ 4. Push to Docker Hub │
│ 5. Tag as :latest     │
└───────┬───────────┘
        │
        ▼
Email Notification (success/failure)
```

### Triggering a Release

1. Merge your feature branch to `test`
2. Pipeline runs security scans automatically
3. Open a Pull Request from `test` to `main`
4. After PR approval and merge, go to GitHub Actions
5. Select the service workflow → Run workflow → Enter version (e.g., `v1.2.3`)
6. Image is built, scanned, and pushed to Docker Hub
7. Update `values.yaml` image tag and `helm upgrade`

### Version Tag Format

All releases must follow semantic versioning: `vMAJOR.MINOR.PATCH`

```
v1.0.0  ✅
v1.2.3  ✅
1.0.0   ❌ (missing v prefix)
v1.0    ❌ (missing patch version)
latest  ❌ (prohibited by Kyverno policy)
```

---

## Monitoring & Alerting

### Prometheus Alerts

Alerts are defined in `infra/essential-alerts.yaml` covering three categories:

**Node & Cluster Health**
- `NodeDown` — Node unreachable for 5 minutes (critical)
- `NodeHighCPU` — CPU > 90% for 10 minutes (warning)
- `NodeLowDisk` — Disk < 10% available (critical)
- `NodeMemoryPressure` — RAM < 10% available (warning)
- `KubeletDown` — Kubelet unreachable (critical)

**Workload Health**
- `PodCrashLooping` — Pod restarting > 5x per 15 minutes (critical)
- `PendingPods` — Pod stuck Pending > 10 minutes (warning)
- `DeploymentReplicasMismatch` — Available replicas < desired (warning)
- `ContainerOOMKilled` — Container killed due to memory limit (critical)
- `HPAAtMaxCapacity` — HPA at maximum replicas (warning)

**Network & API**
- `KubeAPILatency` — 99th percentile API latency > 1s (warning)
- `CoreDNSErrors` — CoreDNS returning SERVFAIL (critical)
- `PersistentVolumeFull` — PV > 90% full (critical)

### Slack Alerting Setup

Alertmanager sends alerts to `#incoming-alerts` Slack channel. The webhook URL is stored as a Kubernetes secret — never in git.

```bash
# Create alertmanager config with webhook
cat > /tmp/am-config.yaml << 'EOF'
global:
  resolve_timeout: 5m
route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'slack-notifications'
receivers:
- name: 'slack-notifications'
  slack_configs:
  - api_url: 'WEBHOOK_PLACEHOLDER'
    channel: '#incoming-alerts'
    send_resolved: true
    title: '{{ .Status }} - {{ .GroupLabels.alertname }}'
    text: >-
      {{ range .Alerts }}
        *Description:* {{ .Annotations.description }}
        *Severity:* {{ .Labels.severity }}
      {{ end }}
EOF

# Inject webhook URL (replace with actual URL)
sed -i "s|WEBHOOK_PLACEHOLDER|YOUR_WEBHOOK_URL|g" /tmp/am-config.yaml

kubectl create secret generic alertmanager-prometheus-kube-prometheus-alertmanager \
  --from-file=alertmanager.yaml=/tmp/am-config.yaml \
  -n monitoring --dry-run=client -o yaml | kubectl apply -f -

rm /tmp/am-config.yaml
```

### Grafana Dashboards

Access Grafana at `http://<haproxy-ip>:3000`

Recommended dashboard IDs to import:

| Dashboard ID | Name |
|-------------|------|
| `315` | Kubernetes Cluster Overview |
| `1860` | Node Exporter Full |
| `6417` | Kubernetes Pods and Nodes |
| `13770` | Kubernetes Persistent Volumes |

---

## Storage

### Architecture

```
Pods (/app/uploads)
      │
      ▼
PVC: pc-upload-pvc (ReadWriteMany, 10Gi)
      │
      ▼
PV (auto-provisioned by NFS CSI)
      │
      ▼
NFS Server: /var/nfs/paycrest/<pvc-directory>
```

### Why ReadWriteMany?

Multiple pods across different nodes need to read and write the same uploaded files simultaneously (KYC documents, profile photos). `ReadWriteMany` (RWX) allows this — only NFS supports RWX in our setup. `ReadWriteOnce` (RWO) would only allow one node to mount the volume at a time, breaking multi-node deployments.

### Post-Deploy Permission Fix

NFS provisioned directories require manual permission fix after first deployment:

```bash
# Get the PVC directory name
UPLOAD_PVC=$(kubectl get pvc pc-upload-pvc -n pc-app -o jsonpath='{.spec.volumeName}')

# On NFS server
chmod 777 /var/nfs/paycrest/${UPLOAD_PVC}
```

This is required because pods run as non-root and NFS directories are created as root by default.

---

## Contributing

We welcome contributions from all team members. Please read this section carefully before submitting any changes.

### Development Workflow

```
feature/your-feature
        │
        ▼
     test branch  ←── all development work
        │
        │ Pull Request (after CI passes)
        ▼
     main branch  ←── stable, production-ready only
```

### Setting Up Local Development

```bash
# Clone the repo
git clone https://github.com/YOUR-ORG/PayCrest-Dev.git
cd PayCrest-Dev

# Create your feature branch from test
git checkout test
git pull origin test
git checkout -b feature/your-feature-name

# Make your changes
# ...

# Push and create PR to test
git push origin feature/your-feature-name
```

---

## Pull Request Guidelines

### Before Opening a PR

- [ ] Your branch is up to date with `test`
- [ ] All GitHub Actions checks pass on your branch
- [ ] You have tested your changes locally or in a dev cluster
- [ ] Helm chart changes have been validated with `helm lint`
- [ ] No secrets or credentials are committed
- [ ] Docker images use pinned version tags (no `latest`)
- [ ] Resource requests and limits are defined for any new containers
- [ ] NetworkPolicies are updated if new namespaces or ports are introduced

### PR Title Format

```
[SERVICE] Brief description of change

Examples:
[auth-service] Add MPIN reset endpoint
[helm] Update loan-service HPA max replicas to 6
[ci] Add vulnerability threshold to Trivy scan
[monitoring] Add alert for high MongoDB connections
```

### PR Description Template

```markdown
## What does this PR do?
<!-- Brief description of the change -->

## Why is this change needed?
<!-- Business or technical justification -->

## How was it tested?
<!-- Local testing, cluster testing, curl commands used -->

## Checklist
- [ ] Helm lint passes
- [ ] No hardcoded secrets
- [ ] Resource limits defined
- [ ] NetworkPolicy updated if needed
- [ ] CI pipeline passes

## Related Issues
<!-- Link any related GitHub issues -->
```

### Review Requirements

- Minimum **1 approval** required before merging to `test`
- Minimum **2 approvals** required before merging to `main`
- All CI checks must pass
- No unresolved review comments

### Merging to Main

Only merge to `main` when:
1. The feature is fully tested on the `test` branch
2. All security scans pass (SonarQube quality gate, Snyk, Trivy)
3. A release version tag has been agreed upon
4. The team lead has approved

---

## Branch Strategy

| Branch | Purpose | Direct Push |
|--------|---------|------------|
| `main` | Production-ready code | ❌ PR only |
| `test` | Integration testing | ✅ Team leads only |
| `feature/*` | New features | ✅ Author only |
| `fix/*` | Bug fixes | ✅ Author only |
| `hotfix/*` | Critical production fixes | ✅ With lead approval |

### Branch Naming Convention

```
feature/add-loan-approval-endpoint
fix/kyc-upload-permission-error
hotfix/mongodb-connection-timeout
chore/update-helm-values-structure
docs/update-deployment-guide
```

---

## Security Policy

### Reporting a Vulnerability

If you discover a security vulnerability in this project, **do not open a public GitHub issue**. Instead:

1. Email the security team directly at the address configured in `DEVELOPMENT_TEAM_EMAIL`
2. Include a detailed description of the vulnerability
3. Include steps to reproduce
4. Include the potential impact

We will acknowledge receipt within **48 hours** and provide a resolution timeline.

### Security Controls in Place

| Control | Implementation | Purpose |
|---------|---------------|---------|
| Network isolation | Kubernetes NetworkPolicies | Prevent lateral movement |
| Admission control | Kyverno ClusterPolicy | Enforce image tags and resource limits |
| Secret management | Kubernetes Secrets | Credentials never in git |
| Container scanning | Trivy (CI/CD) | Detect CVEs before deployment |
| Dependency scanning | Snyk | Detect vulnerable packages |
| Code quality | SonarQube | Detect code vulnerabilities |
| Image policy | No `latest` tags allowed | Ensure reproducible deployments |
| Resource limits | Defined on all containers | Prevent resource exhaustion attacks |

### Secrets Management Rules

- **Never commit secrets to git** — use Kubernetes Secrets
- **Never log secrets** — check application logs before pushing
- **Never expose webhook URLs** in terminal output or chat
- **Rotate secrets** if accidentally exposed
- JWT secrets and internal service tokens must be rotated before production use
- MongoDB credentials must be changed from the defaults in `values.yaml`

### Kyverno Admission Policies

The cluster enforces these policies on all pods:

```yaml
# All containers must have CPU and memory limits
# Image tag 'latest' is prohibited
# (See infra/kyverno-policies.yaml for full policy)
```

### Production Security Checklist

Before going to production, ensure:

- [ ] Change all default passwords in `values.yaml`
- [ ] Rotate JWT secret to a cryptographically random 256-bit value
- [ ] Rotate `INTERNAL_SERVICE_TOKEN`
- [ ] Change MongoDB credentials from `pycrest/pycrest123`
- [ ] Enable TLS on the kgateway listener (port 443)
- [ ] Restrict HAProxy to specific IP ranges if possible
- [ ] Enable Kubernetes audit logging
- [ ] Set up regular etcd backups

---

## Known Issues & Workarounds

| Issue | Cause | Workaround |
|-------|-------|-----------|
| KYC upload 500 error | NFS directory permissions | `chmod 777` on PVC directory after deploy |
| Services crash after MongoDB restart | MongoDB headless service DNS (pod IP changes) | Run `infra/update-mongo-ip.sh` |
| DNS broken on node after containerd reinstall | Calico rp_filter reset | Cordon node, kubeadm reset, rejoin |

---

## DevOps Learning Outcomes

This project demonstrates the following real-world DevOps competencies:

| Competency | Implementation |
|-----------|---------------|
| Infrastructure as Code | Helm umbrella chart with values-based templating |
| GitOps | GitHub Actions triggering from branch events |
| Security-first design | NetworkPolicies, Kyverno, Trivy, Snyk, SonarQube |
| High Availability | Anti-affinity, multiple replicas, rolling updates |
| Auto-scaling | HPA on api-gateway and loan-service |
| Observability | Prometheus metrics, Grafana dashboards, Slack alerts |
| Persistent storage | NFS CSI with ReadWriteMany PVCs |
| Zero-downtime deployments | RollingUpdate strategy with maxUnavailable:1 |
| Namespace isolation | 5 namespaces with strict NetworkPolicy boundaries |
| Secret management | Kubernetes Secrets, never in git |

---

## License

This project is developed for **DevOps training purposes**. All rights reserved by the PayCrest development team.

---

<div align="center">

Built with ❤️ by the PayCrest DevOps Team

*This project was built as part of a comprehensive DevOps training program covering the complete software delivery lifecycle from code to production.*

</div>