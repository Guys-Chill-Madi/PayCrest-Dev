#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="pycrest"
RELEASE="pycrest"
CHART_ROOT="./charts/pycrest-umbrella"

echo ""
echo "═══════════════════════════════════════════════"
echo "  PayCrest Kubernetes Deployment"
echo "  Cluster: $(kubectl config current-context)"
echo "═══════════════════════════════════════════════"
echo ""

# Verify namespace exists
echo "── Checking namespace ──────────────────────────"
kubectl get ns "$NAMESPACE" > /dev/null 2>&1 || kubectl create ns "$NAMESPACE"
echo "  Namespace '$NAMESPACE' ready ✅"

# Step 1: Update common library first (everything depends on it)
echo ""
echo "── Updating common library chart ───────────────"
helm dependency update "$CHART_ROOT/charts/common"
echo "  common updated ✅"

# Step 2: Update all sub-charts (they depend on common)
echo ""
echo "── Updating sub-charts ─────────────────────────"
for svc in mongodb api-gateway frontend \
           admin-service auth-service emi-service \
           loan-service manager-service payment-service \
           verification-service wallet-service; do
  echo "  Updating $svc..."
  helm dependency update "$CHART_ROOT/charts/$svc" 2>/dev/null || true
done
echo "  All sub-charts updated ✅"

# Step 3: Update umbrella
echo ""
echo "── Updating umbrella chart ─────────────────────"
helm dependency update "$CHART_ROOT"
echo "  Umbrella updated ✅"

# Step 4: Validate before installing
echo ""
echo "── Validating templates ────────────────────────"
helm template "$RELEASE" "$CHART_ROOT" \
  --namespace "$NAMESPACE" \
  --values "$CHART_ROOT/values.yaml" > /dev/null
echo "  Templates valid ✅"

# Step 5: Install or upgrade
echo ""
echo "── Deploying to Kubernetes ─────────────────────"
helm upgrade --install "$RELEASE" "$CHART_ROOT" \
  --namespace "$NAMESPACE" \
  --values "$CHART_ROOT/values.yaml" \
  --timeout 10m \
  --wait \
  --atomic
echo "  Deployment complete ✅"

# Step 6: Show status
echo ""
echo "── Deployment Status ───────────────────────────"
echo ""
echo "PODS:"
kubectl get pods -n "$NAMESPACE" -o wide
echo ""
echo "SERVICES:"
kubectl get svc -n "$NAMESPACE"
echo ""
echo "GATEWAY:"
kubectl get gateway -n "$NAMESPACE"
echo ""
echo "HTTP ROUTES:"
kubectl get httproutes -n "$NAMESPACE"
echo ""

# Step 7: Find the NodePort to update HAProxy
echo "── HAProxy NodePort ────────────────────────────"
echo "Run this to get the gateway proxy NodePort:"
echo ""
echo "  kubectl get svc -n kgateway-system"
echo ""
echo "Then update /etc/haproxy/haproxy.cfg on your HAProxy EC2"
echo "to use that NodePort instead of 30080, then run:"
echo "  sudo systemctl reload haproxy"
echo ""
echo "═══════════════════════════════════════════════"
echo "  Done! App should be at http://44.223.16.184"
echo "═══════════════════════════════════════════════"