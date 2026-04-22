# PayCrest LMS

A production-grade **Loan Management System** built on a microservices architecture, deployed on Kubernetes with a full DevOps pipeline including GitOps, blue-green deployments, centralized logging, monitoring, and identity management.

> **Live:** [paycrest.online](https://paycrest.online)

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Microservices](#microservices)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Infrastructure](#infrastructure)
- [CI/CD Pipeline](#cicd-pipeline)
- [GitOps with ArgoCD](#gitops-with-argocd)
- [Blue-Green Deployments](#blue-green-deployments)
- [Observability](#observability)
- [Identity & Access Management](#identity--access-management)
- [Network Security](#network-security)
- [Storage Strategy](#storage-strategy)
- [Dashboard URLs](#dashboard-urls)
- [Getting Started (New Cluster)](#getting-started-new-cluster)
- [GitHub Secrets Required](#github-secrets-required)
- [Team Access](#team-access)

---

## Project Overview

PayCrest LMS is a fintech platform that handles the full loan lifecycle — from customer registration and KYC verification, through loan application and manager approval, to EMI scheduling, payment processing, and wallet management. It is built as a set of independent Python FastAPI microservices behind a Node.js API gateway, with a React/TypeScript frontend.

The entire infrastructure is deployed on AWS EC2 using Kubernetes (kubeadm), with HAProxy handling SSL termination, kgateway (Envoy) routing all internal traffic, ArgoCD managing deployments via GitOps, and Argo Rollouts providing zero-downtime blue-green deployments.

---

## Architecture

```
Internet
    │  HTTPS :443
    ▼
HAProxy + Certbot  (ip-10-0-1-27 · Elastic IP: 23.23.104.150)
    │  SSL termination · ACL-based subdomain routing
    │  Basic auth on: prometheus, rollouts, loki
    │
    ├── sonar.paycrest.online ──────► SonarQube EC2 (direct, port 9000)
    │
    └── all other subdomains ───────► kgateway NodePort :31748
                                            │
                                   HTTPRoute by hostname
                                            │
              ┌─────────────────────────────┼──────────────────────────────┐
              │                             │                              │
         App Routes                  Dashboard Routes                    ...
    frontend-service              grafana, prometheus,               keycloak,
    api-gateway                   argocd, rollouts,                  headlamp,
    (pc-frontend, pc-edge)        loki  (monitoring,argocd ns)       kube-system
              │
   ┌──────────┴────────────────────────────────┐
   │           Kubernetes Cluster              │
   │  Master: ip-10-0-1-155                    │
   │  Workers: ip-10-0-1-102                   │
   │           ip-10-0-1-245                   │
   │           ip-10-0-1-85                    │
   └──────────┬────────────────────────────────┘
              │  NFS CSI Mount
              ▼
   NFS Server (ip-10-0-1-27)
   /var/nfs/paycrest  →  app PVCs
   /var/nfs/keycloak  →  keycloak PVC (dedicated — prevents H2 locking)
```

**Key design decisions:**
- HAProxy terminates all SSL. kgateway handles all internal routing via HTTPRoutes.
- All services are **ClusterIP** — no NodePorts exposed except kgateway itself (31748).
- All dashboards are routed through kgateway HTTPRoutes — same single entry point as the app.
- SonarQube is the only exception — it runs on its own EC2 and HAProxy routes directly to it.

---

## Microservices

| Service | Language | Namespace | Port | Responsibility |
|---------|----------|-----------|------|----------------|
| frontend | React + TypeScript | pc-frontend | 80 | Customer and staff UI |
| api-gateway | Node.js | pc-edge | 3000 | Request routing, auth middleware |
| auth-service | Python FastAPI | pc-app | 8000 | Authentication, JWT, MPIN |
| loan-service | Python FastAPI | pc-app | 8000 | Loan origination, EMI calculations |
| admin-service | Python FastAPI | pc-app | 8000 | Staff management, approvals, audit |
| manager-service | Python FastAPI | pc-app | 8000 | Manager review, sanctions |
| verification-service | Python FastAPI | pc-app | 8000 | KYC, document verification, scoring |
| payment-service | Python FastAPI | pc-app | 8000 | Cashfree payment gateway integration |
| wallet-service | Python FastAPI | pc-app | 8000 | Wallet, transactions, MPIN |
| emi-service | Python FastAPI | pc-app | 8000 | EMI scheduling, penalties, notifications |
| mongodb | MongoDB | pc-data | 27017 | Database (StatefulSet) |

All microservices use Argo Rollout resources (not standard Deployments) to support blue-green deployments. MongoDB stays as a StatefulSet.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Nginx |
| **API Gateway** | Node.js, Express |
| **Backend** | Python 3.11, FastAPI, Motor (async MongoDB) |
| **Database** | MongoDB 6 |
| **Container Runtime** | containerd |
| **Orchestration** | Kubernetes v1.34 (kubeadm) |
| **CNI** | Calico |
| **Gateway** | kgateway (Envoy Proxy) — Gateway API v1.4 |
| **Load Balancer** | HAProxy |
| **SSL** | Let's Encrypt + Certbot |
| **Storage** | NFS CSI Driver + NFS Server |
| **GitOps** | ArgoCD |
| **Deployments** | Argo Rollouts (Blue-Green) |
| **CI/CD** | GitHub Actions |
| **Container Registry** | Docker Hub |
| **Code Quality** | SonarQube Community Edition |
| **Dependency Scan** | Snyk |
| **Image Scan** | Trivy |
| **Metrics** | Prometheus + kube-prometheus-stack |
| **Dashboards** | Grafana |
| **Logging** | Loki + Promtail |
| **K8s Dashboard** | Headlamp |
| **Identity (OIDC)** | Keycloak 26 |
| **Policy Engine** | Kyverno |
| **Cloud** | AWS EC2 (Ubuntu 22.04) |

---

## Repository Structure

```
PayCrest-Dev/
│
├── .github/workflows/
│   ├── _ci-python.yml          ← Reusable CI template for all Python services
│   ├── _ci-node.yml            ← Reusable CI template for Node.js
│   ├── _ci-frontend.yml        ← Reusable CI template for React frontend
│   ├── _ci-maintenance.yml     ← Scheduled maintenance tasks
│   ├── release.yml             ← CD release pipeline (triggered by tags)
│   └── [service].yml           ← Per-service workflow that calls reusable templates
│
├── argocd-apps/                ← ArgoCD Application manifests
│   ├── shared-infra-app.yaml   ← Deploys gateway, routes, secrets, dashboards
│   ├── mongodb-app.yaml
│   ├── api-gateway-app.yaml
│   └── [service]-app.yaml      ← One per microservice
│
├── shared-infra/Helm/          ← Shared infrastructure Helm chart (ArgoCD managed)
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│       ├── storageclass.yaml       ← nfs-csi StorageClass
│       ├── gateway.yaml            ← kgateway Gateway resource
│       ├── routes.yaml             ← App HTTPRoute (paycrest.online routing)
│       ├── dashboard-routes.yaml   ← ReferenceGrants + HTTPRoutes for all dashboards
│       ├── network-policies.yaml   ← Zero-trust network policies
│       ├── pvc.yaml                ← pc-upload-pvc (ReadWriteMany 10Gi)
│       ├── keycloak.yaml           ← Keycloak namespace + PVC + Deployment + Service
│       ├── headlamp.yaml           ← Headlamp Deployment + SA + token Secret
│       ├── rollouts-dashboard.yaml ← Rollouts dashboard + RBAC
│       ├── api-secrets.yaml        ← api-gateway Kubernetes Secrets
│       ├── app-secrets.yaml        ← microservice Kubernetes Secrets
│       ├── mongo-secrets.yaml      ← MongoDB credentials
│       ├── configmap.yaml
│       ├── frontend-configmap.yaml
│       └── create-admin.yaml
│
├── [service]/                  ← One folder per microservice
│   ├── Helm/                   ← Service Helm chart (watched by ArgoCD)
│   │   ├── Chart.yaml
│   │   ├── values.yaml         ← image.tag updated here on each release
│   │   └── templates/
│   │       ├── deployment.yaml ← Argo Rollout resource (not standard Deployment)
│   │       ├── service.yaml
│   │       └── hpa.yaml        ← (api-gateway, loan-service, frontend only)
│   ├── app/                    ← Application source code
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── sonar-project.properties
│   └── .last-sha               ← Last built image SHA (written by CI pipeline)
│
├── mongodb/Helm/               ← MongoDB StatefulSet Helm chart
├── monitoring/                 ← Alert rules and Grafana PVC config
├── scripts/haproxy.cfg         ← Full HAProxy configuration reference
└── Cluster-Initialization/     ← Reference files for cluster setup (not ArgoCD managed)
    ├── k8s-install.cfg         ← Node installation script
    ├── oidc-api-flag.cfg       ← API server OIDC flag instructions
    ├── oidc-rbac.yaml          ← OIDC ClusterRoleBindings
    └── team-config.yaml        ← Team kubeconfig template
```

---

## Infrastructure

### EC2 Instances

| Instance | Type | Role |
|----------|------|------|
| ip-10-0-1-155 | t2.medium | Kubernetes master (control plane) |
| ip-10-0-1-102 | t2.medium | Worker node 1 |
| ip-10-0-1-245 | t2.medium | Worker node 2 |
| ip-10-0-1-85 | t2.medium | Worker node 3 |
| ip-10-0-1-27 | t2.medium | HAProxy + NFS server |
| ip-10-0-1-248 | t2.medium | SonarQube |

### Kubernetes Namespaces

| Namespace | Purpose |
|-----------|---------|
| pc-gateway | kgateway Envoy proxy |
| pc-frontend | React frontend |
| pc-edge | Node.js API gateway |
| pc-app | All Python microservices |
| pc-data | MongoDB |
| monitoring | Prometheus + Grafana + AlertManager |
| logging | Loki + Promtail |
| argocd | ArgoCD GitOps controller |
| argo-rollouts | Argo Rollouts controller + dashboard |
| keycloak | Keycloak identity provider |
| kube-system | Headlamp + metrics-server + NFS CSI |
| kgateway-system | kgateway controller |

---

## CI/CD Pipeline

### Overview

The pipeline has three separate triggers:

1. **Pull Request** → runs all 7 CI quality checks
2. **Merge to `test` branch** → builds and pushes SHA-tagged Docker image
3. **GitHub Release tag** (`service-name-vX.Y.Z`) → runs CD pipeline to deploy

### CI Pipeline — 7 Stages on every Pull Request

**Stage 1 — Validate Labels.** The workflow reads the PR labels before doing anything. If the required labels are missing the pipeline exits immediately. No scans, no builds. The PR cannot be merged until labels are correct.

**Stage 2 — SonarQube Analysis.** Source code is sent to the self-hosted SonarQube server at `sonar.paycrest.online`. It scans for bugs, vulnerabilities, code smells, and duplications. Results appear as a PR comment on GitHub. Uses `SONAR_HOST_URL` and `SONAR_TOKEN_[SERVICE]` secrets.

**Stage 3 — Quality Gate.** After the scan the workflow checks if the SonarQube Quality Gate passed. The gate enforces rules defined in SonarQube — zero new critical bugs, zero new vulnerabilities. If the gate fails the PR is blocked and the developer must fix the issues and push again.

**Stage 4 — Snyk Dependency Scan.** Scans `requirements.txt` or `package.json` for known CVEs. Only HIGH and CRITICAL severity findings block the PR. Uses `SNYK_TOKEN` secret.

**Stage 5 — Docker Build.** Builds the Docker image and tags it with the short git SHA (e.g. `noelmathews/auth-service:sha-a3c7d9`). The image is only in runner memory at this point — not pushed anywhere.

**Stage 6 — Trivy Image Scan.** Scans the built image for OS and library vulnerabilities. If HIGH or CRITICAL findings exist the image is never pushed. A vulnerable image literally cannot leave the pipeline.

**Stage 7 — Helm Lint.** Runs `helm lint --strict` on the service Helm chart. Validates YAML syntax and does a template dry-run. If the chart has errors the PR is blocked.

### After Merge to Test Branch

A separate job triggers on push to `test`. It rebuilds the image, pushes it to Docker Hub with the SHA tag, and writes the SHA to `service/.last-sha`. Nothing is deployed to the cluster yet.

### CD Pipeline — Release Tag

A team lead creates a GitHub Release with tag `auth-service-v1.2.0`. The release workflow:

1. Parses the tag to extract service name and version. Reads `.last-sha` for the image SHA.
2. Pulls the SHA-tagged image from Docker Hub and retags it as `v1.2.0` and `:latest`. Pushes both.
3. Updates `image.tag: v1.2.0` in `values.yaml` and all environment values files. Commits using `PAT_TOKEN`.
4. Creates a PR and auto-merges to master. This commit triggers ArgoCD.
5. Sends success or failure email notification via Gmail SMTP.

### Reusable Workflow Templates

| Template | Used by |
|----------|---------|
| `_ci-python.yml` | All 8 FastAPI services |
| `_ci-node.yml` | api-gateway |
| `_ci-frontend.yml` | frontend |
| `_ci-maintenance.yml` | Scheduled tasks |

---

## GitOps with ArgoCD

ArgoCD watches the `master` branch of this repository. Every ArgoCD Application points to a specific Helm chart path. When `values.yaml` is updated by the release pipeline, ArgoCD detects the diff between Git and the cluster and automatically syncs.

All ArgoCD apps are configured with:
- `automated.prune: true` — removes resources deleted from Git
- `automated.selfHeal: true` — reverts any manual changes made directly to the cluster
- `syncOptions: CreateNamespace=false` — namespaces created explicitly

The `shared-infra` ArgoCD app is special — it deploys the gateway, all HTTPRoutes, all network policies, all secrets, all PVCs, and the Keycloak, Headlamp, and Rollouts dashboard deployments. It must be synced first before any service app.

**Apply all ArgoCD apps:**

```bash
# Apply shared-infra first — creates gateway, routes, secrets, dashboard deployments
kubectl apply -f argocd-apps/shared-infra-app.yaml

# Then apply MongoDB
kubectl apply -f argocd-apps/mongodb-app.yaml

# Then all services
kubectl apply -f argocd-apps/
```

---

## Blue-Green Deployments

All application services use Argo Rollouts with a blue-green strategy. When a new version is deployed:

- The new version (green) starts alongside the existing version (blue)
- All production traffic stays on blue
- Green is accessible via a preview service for testing
- A team member promotes manually after verifying green works

```bash
# Check rollout status
kubectl argo rollouts get rollout auth-service -n pc-app

# Promote green to production (instant traffic switch)
kubectl argo rollouts promote auth-service -n pc-app

# Rollback to blue immediately
kubectl argo rollouts undo auth-service -n pc-app
```

---

## Observability

### Metrics — Prometheus + Grafana

Prometheus scrapes metrics from all pods, nodes, and Kubernetes components via the kube-prometheus-stack Helm chart. Grafana visualizes them.

**Imported dashboards:**

| Grafana ID | Dashboard |
|-----------|-----------|
| 1860 | Node Exporter Full |
| 12740 | Kubernetes Cluster Overview |
| 15661 | Kubernetes Pods |
| 14584 | ArgoCD |
| 15141 | Loki Logs |

### Logs — Loki + Promtail

Promtail runs as a DaemonSet on every node and collects all container logs. It pushes them to Loki which stores them with NFS-backed persistence. Logs are queried via Grafana Explore using LogQL.

**Grafana Loki datasource URL:** `http://loki-gateway.logging.svc.cluster.local`

### Alerts — AlertManager

AlertManager is configured for email notifications on critical events: pod crashes, high CPU, high memory, node down. Config is in `monitoring/alertmanager-config.yaml`.

### Kubernetes Dashboard — Headlamp

Headlamp is deployed in `kube-system` and accessible at `headlamp.paycrest.online`. Login with the permanent service account token:

```bash
kubectl get secret headlamp-admin-token -n kube-system \
  -o jsonpath='{.data.token}' | base64 -d && echo
```

---

## Identity & Access Management

Keycloak runs in the `keycloak` namespace and is integrated with the Kubernetes API server via OIDC. This means team members log into the cluster using their Keycloak credentials instead of a shared kubeconfig.

### Realm and Groups

- **Realm:** `paycrest`
- **Client:** `kubernetes`
- **Groups and access:**

| Group | Members | Kubernetes Access |
|-------|---------|-------------------|
| cluster-admins | Noel | Full cluster-admin |
| dev-team | Praveen, Surya | Read-only (get, list, watch) |
| test-team | Nimesh, Thanusri, Chandana | Read-only (get, list, watch) |

### Team kubectl Access

Team members use the kubeconfig in `Cluster-Initialization/team-config.yaml` with the `kubelogin` plugin:

```bash
# Install kubelogin
curl -Lo kubelogin.zip \
  https://github.com/int128/kubelogin/releases/latest/download/kubelogin_linux_amd64.zip
unzip kubelogin.zip && sudo mv kubelogin /usr/local/bin/kubectl-oidc_login

# Use the team kubeconfig — will prompt for Keycloak credentials
kubectl get nodes
```

---

## Network Security

Zero-trust network policies enforced by Calico. Each namespace can only communicate with exactly what it needs.

| Policy | Rule |
|--------|------|
| `gateway-policy` | pc-gateway can only egress to pc-frontend (:80), pc-edge (:3000), kgateway-system |
| `gateway-shield` | pc-edge only accepts ingress from pc-gateway, only egresses to pc-app (:8000) |
| `frontend-isolation` | pc-frontend only accepts ingress from pc-gateway |
| `app-isolation` | pc-app accepts from pc-edge (:8000), egresses to pc-data (:27017) and internet (:443 for Cashfree) |
| `allow-from-app` | MongoDB only accepts ingress from pc-app (:27017) |

All policies defined in `shared-infra/Helm/templates/network-policies.yaml`.

---

## Storage Strategy

Every stateful workload has its own dedicated PVC. All use the `nfs-csi` StorageClass backed by the NFS server.

| PVC | Namespace | Size | Access Mode | Used By |
|-----|-----------|------|-------------|---------|
| `pc-upload-pvc` | pc-app | 10Gi | ReadWriteMany | File uploads across microservices |
| `mongodb-data` | pc-data | 20Gi | ReadWriteOnce | MongoDB StatefulSet |
| `keycloak-data` | keycloak | 2Gi | ReadWriteOnce | Keycloak H2 database |
| `storage-loki-0` | logging | 10Gi | ReadWriteOnce | Loki log storage |

> **Note on Keycloak storage:** Keycloak uses a dedicated NFS subdirectory `/var/nfs/keycloak` instead of the shared `/var/nfs/paycrest`. This prevents H2 database file locking conflicts that occur when multiple services share the same NFS path.

---

## Dashboard URLs

| URL | Tool | Auth |
|-----|------|------|
| [paycrest.online](https://paycrest.online) | Application | App login |
| [grafana.paycrest.online](https://grafana.paycrest.online) | Grafana | admin / (set on install) |
| [prometheus.paycrest.online](https://prometheus.paycrest.online) | Prometheus | HAProxy basic auth |
| [argocd.paycrest.online](https://argocd.paycrest.online) | ArgoCD | ArgoCD login |
| [rollouts.paycrest.online](https://rollouts.paycrest.online) | Argo Rollouts | HAProxy basic auth |
| [keycloak.paycrest.online](https://keycloak.paycrest.online) | Keycloak | Keycloak admin |
| [headlamp.paycrest.online](https://headlamp.paycrest.online) | Headlamp | Service account token |
| [loki.paycrest.online](https://loki.paycrest.online) | Loki Gateway | HAProxy basic auth |
| [sonar.paycrest.online](https://sonar.paycrest.online) | SonarQube | SonarQube login |

---

## Getting Started (New Cluster)

For a complete step-by-step guide to setting up this entire infrastructure from scratch — including EC2 provisioning, Kubernetes installation, NFS setup, HAProxy SSL configuration, tool installation, and application deployment — refer to the **Implementation Manual** in the project documentation.

**High-level order:**

```
1.  Provision EC2 instances
2.  Run k8s-install.sh on every node
3.  kubeadm init on master, join workers
4.  Install: Calico, Metrics Server, NFS CSI, kgateway
5.  Configure HAProxy + SSL (Certbot)
6.  Install: ArgoCD, Argo Rollouts, Prometheus+Grafana, Loki+Promtail, SonarQube
7.  Update shared-infra/Helm/values.yaml with your NFS IP and secrets
8.  kubectl apply -f argocd-apps/shared-infra-app.yaml
9.  kubectl apply -f argocd-apps/mongodb-app.yaml
10. kubectl apply -f argocd-apps/
11. Configure Keycloak realm, client, groups, users
12. Add OIDC flags to kube-apiserver
13. Verify all URLs are accessible
```

---

## GitHub Secrets Required

### Shared Secrets

| Secret | Purpose |
|--------|---------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub access token |
| `SNYK_TOKEN` | Snyk vulnerability scanner |
| `PAT_TOKEN` | GitHub PAT (repo scope) for auto-merge |
| `SONAR_HOST_URL` | `https://sonar.paycrest.online` |
| `MAIL_USERNAME` | Gmail address for notifications |
| `MAIL_PASSWORD` | Gmail app password |
| `DEVELOPMENT_TEAM_EMAIL` | Team email for release notifications |

### Per-Service SonarQube Tokens

| Secret | Service |
|--------|---------|
| `SONAR_TOKEN_FRONTEND` | frontend |
| `SONAR_TOKEN_API_GATEWAY` | api-gateway |
| `SONAR_TOKEN_AUTH_SERVICE` | auth-service |
| `SONAR_TOKEN_LOAN_SERVICE` | loan-service |
| `SONAR_TOKEN_ADMIN_SERVICE` | admin-service |
| `SONAR_TOKEN_MANAGER_SERVICE` | manager-service |
| `SONAR_TOKEN_VERIFICATION_SERVICE` | verification-service |
| `SONAR_TOKEN_PAYMENT_SERVICE` | payment-service |
| `SONAR_TOKEN_WALLET_SERVICE` | wallet-service |
| `SONAR_TOKEN_EMI_SERVICE` | emi-service |

---

## Team Access

| Name | Role | Keycloak Group | Cluster Access |
|------|------|---------------|----------------|
| Noel | DevOps Lead | cluster-admins | Full cluster-admin |
| Praveen | Developer | dev-team | Read-only |
| Surya | Developer | dev-team | Read-only |
| Nimesh | QA | test-team | Read-only |
| Thanusri | QA | test-team | Read-only |
| Chandana | QA | test-team | Read-only |

---

## Branching Strategy

```
master ──────────────────────────────────► production (ArgoCD watches this)
         ↑ release PR auto-merged by CD
test ────────────────────────────────────► staging / CI target
         ↑ feature PRs merged here
feature/* ───────────────────────────────► development
```

- All PRs target `test` and must pass all 7 CI stages before merge
- Merges to `test` trigger Docker image build and push
- Release tags (`service-name-vX.Y.Z`) trigger the CD pipeline
- CD pipeline auto-merges to `master` which triggers ArgoCD

---

*Built by the PayCrest DevOps Team*