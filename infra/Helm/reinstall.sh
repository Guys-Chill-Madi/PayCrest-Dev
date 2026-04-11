#!/bin/bash
# =============================================================
# PayCrest Full Clean Reinstall Script
# Run from: /home/ubuntu/PayCrest-Dev/infra/Helm
# =============================================================

set -e  # Exit on any error

echo ""
echo "=============================================="
echo " STEP 1: Install NFS CSI Driver (if missing)"
echo "=============================================="

# Check if nfs-csi driver is already installed
if helm list -n kube-system | grep -q "csi-driver-nfs"; then
  echo "[SKIP] NFS CSI driver already installed"
else
  echo "[INFO] Adding NFS CSI Helm repo..."
  helm repo add csi-driver-nfs https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts
  helm repo update

  echo "[INFO] Installing NFS CSI driver..."
  helm install csi-driver-nfs csi-driver-nfs/csi-driver-nfs \
    --namespace kube-system \
    --set kubeletDir=/var/lib/kubelet \
    --wait --timeout=120s

  echo "[OK] NFS CSI driver installed"
fi

# Verify driver pods are running
echo ""
echo "[CHECK] NFS CSI pods:"
kubectl get pods -n kube-system -l app=csi-nfs-controller
kubectl get pods -n kube-system -l app=csi-nfs-node

echo ""
echo "=============================================="
echo " STEP 2: Verify NFS connectivity from cluster"
echo "=============================================="
# Replace with your actual NFS EC2 private IP
NFS_IP=$(grep 'server:' templates/storageclass.yaml | awk '{print $2}')
echo "[INFO] NFS server IP from storageclass.yaml: $NFS_IP"

if [ "$NFS_IP" = "NFS_SERVER_IP_HERE" ]; then
  echo ""
  echo "[ERROR] You haven't replaced NFS_SERVER_IP_HERE in templates/storageclass.yaml!"
  echo "        Edit the file and re-run this script."
  exit 1
fi

echo ""
echo "=============================================="
echo " STEP 3: Clean uninstall existing Helm release"
echo "=============================================="

if helm list | grep -q "paycrest-v1"; then
  echo "[INFO] Uninstalling paycrest-v1..."
  helm uninstall paycrest-v1
  echo "[OK] Helm release removed"
else
  echo "[SKIP] No existing release named paycrest-v1"
fi

echo ""
echo "=============================================="
echo " STEP 4: Delete lingering PVCs and PVs"
echo "=============================================="
# PVCs from old install won't be deleted by helm uninstall (ReclaimPolicy: Retain)
# We want a clean state so delete them manually

echo "[INFO] Deleting PVCs in pc-app..."
kubectl delete pvc --all -n pc-app --ignore-not-found=true

echo "[INFO] Deleting PVCs in pc-data..."
kubectl delete pvc --all -n pc-data --ignore-not-found=true

# List any lingering PVs and delete Released ones
echo "[INFO] Cleaning up Released PVs..."
kubectl get pv | grep Released | awk '{print $1}' | xargs -r kubectl delete pv

echo ""
echo "=============================================="
echo " STEP 5: Wait for all pods to terminate"
echo "=============================================="
echo "[INFO] Waiting for pc-app pods to terminate..."
kubectl wait --for=delete pod --all -n pc-app --timeout=60s 2>/dev/null || true

echo "[INFO] Waiting for pc-data pods to terminate..."
kubectl wait --for=delete pod --all -n pc-data --timeout=60s 2>/dev/null || true

echo "[INFO] Waiting for pc-frontend pods to terminate..."
kubectl wait --for=delete pod --all -n pc-frontend --timeout=60s 2>/dev/null || true

echo "[INFO] Waiting for pc-edge pods to terminate..."
kubectl wait --for=delete pod --all -n pc-edge --timeout=60s 2>/dev/null || true

echo "[INFO] Waiting for pc-gateway pods to terminate..."
kubectl wait --for=delete pod --all -n pc-gateway --timeout=60s 2>/dev/null || true

echo ""
echo "=============================================="
echo " STEP 6: Update Helm dependencies"
echo "=============================================="
echo "[INFO] Running helm dependency update..."
helm dependency update .
echo "[OK] Dependencies updated"

echo ""
echo "=============================================="
echo " STEP 7: Dry run to validate manifests"
echo "=============================================="
echo "[INFO] Running helm template dry run..."
helm template paycrest-v1 . --debug > /tmp/paycrest-dry-run.yaml 2>&1

if [ $? -eq 0 ]; then
  echo "[OK] Dry run passed — manifests are valid"
else
  echo "[ERROR] Dry run failed! Check /tmp/paycrest-dry-run.yaml for details"
  echo "        Fix errors before proceeding."
  exit 1
fi

echo ""
echo "=============================================="
echo " STEP 8: Install the corrected release"
echo "=============================================="
echo "[INFO] Installing paycrest-v1..."

helm install paycrest-v1 . \
  --timeout 180s \
  --wait=false

echo "[OK] Helm install submitted"

echo ""
echo "=============================================="
echo " STEP 9: Watch rollout status"
echo "=============================================="
echo "[INFO] Watching pod startup (Ctrl+C when stable)..."
echo ""

# Give k8s a moment to create resources
sleep 5

kubectl get pods -A -l 'app in (mongodb,api-gateway,frontend,admin-service,auth-service,emi-service,loan-service,manager-service,payment-service,verification-service,wallet-service)' --watch &
WATCH_PID=$!

# Auto-kill watch after 120s
sleep 120 && kill $WATCH_PID 2>/dev/null &

wait $WATCH_PID 2>/dev/null || true

echo ""
echo "=============================================="
echo " STEP 10: Final status check"
echo "=============================================="

echo ""
echo "=== pc-gateway ==="
kubectl get all -n pc-gateway

echo ""
echo "=== pc-edge ==="
kubectl get all -n pc-edge

echo ""
echo "=== pc-frontend ==="
kubectl get all -n pc-frontend

echo ""
echo "=== pc-app ==="
kubectl get all -n pc-app

echo ""
echo "=== pc-data ==="
kubectl get all -n pc-data

echo ""
echo "=== PVC status ==="
kubectl get pvc -A

echo ""
echo "=== PV status ==="
kubectl get pv

echo ""
echo "=============================================="
echo " Done! If pods are still Pending or crashing:"
echo "   kubectl describe pod <pod-name> -n <ns>"
echo "   kubectl logs <pod-name> -n <ns>"
echo "=============================================="