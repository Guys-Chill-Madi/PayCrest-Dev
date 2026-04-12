# Helm Chart Documentation
Generated on: 04/12/2026 19:40:37


---

## FILE: charts\admin-service\templates\deployments.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admin-service
  namespace: pc-app
  labels:
    app: admin-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: admin-service
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    metadata:
      labels:
        app: admin-service
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: admin-service
                topologyKey: "kubernetes.io/hostname"
      containers:
        - name: admin-service
          image: chillmadiguys/admin-service:v1.1.1
          imagePullPolicy: Always
          ports:
            - containerPort: 8000
          resources:
            requests:
              cpu: "100m"
              memory: "96Mi"
            limits:
              cpu: "200m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
          envFrom:
            - configMapRef:
                name: pc-config-global
            - secretRef:
                name: pc-secrets-global
          volumeMounts:
            - name: uploads
              mountPath: /app/uploads
      volumes:
        - name: uploads
          persistentVolumeClaim:
            claimName: pc-upload-pvc
```

---

## FILE: charts\admin-service\templates\service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: admin-service
  namespace: pc-app
spec:
  selector:
    app: admin-service
  ports:
    - port: 8000
      targetPort: 8000
```

---

## FILE: charts\admin-service\Chart.yaml

```yaml
apiVersion: v2
name: admin-service
description: PayCrest Admin Service 
type: application
version: 1.0.0
appVersion: "1.0.0"
```

---

## FILE: charts\api-gateway\templates\deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: pc-edge
  labels:
    app: api-gateway
spec:
  # No static replicas â€” HPA owns replica count (min:2 max:4)
  selector:
    matchLabels:
      app: api-gateway
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: api-gateway
                topologyKey: "kubernetes.io/hostname"
      dnsPolicy: ClusterFirst
      dnsConfig:
        options:
          - name: ndots
            value: "2"
          - name: attempts
            value: "3"
          - name: timeout
            value: "5"
      containers:
        - name: api-gateway
          image: chillmadiguys/api-gateway:v1.1.3
          imagePullPolicy: Always
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: pc-secret-api
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
          resources:
            requests:
              cpu: "100m"
              memory: "96Mi"
            limits:
              cpu: "200m"
              memory: "256Mi"
```

---

## FILE: charts\api-gateway\templates\hpa.yaml

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: pc-edge
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 2
  maxReplicas: 4
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 120
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
    
```

---

## FILE: charts\api-gateway\templates\service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: pc-edge
spec:
  selector:
    app: api-gateway
  ports:
    - port: 3000
      targetPort: 3000
```

---

## FILE: charts\api-gateway\Chart.yaml

```yaml
apiVersion: v2
name: api-gateway
description: PayCrest API Gateway 
type: application
version: 1.0.0
appVersion: "1.0.0"
```

---

## FILE: charts\auth-service\templates\deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: pc-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: auth-service
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: auth-service
                topologyKey: "kubernetes.io/hostname"
      containers:
        - name: auth-service
          image: chillmadiguys/auth-service:v1.1.1
          imagePullPolicy: Always
          ports:
            - containerPort: 8000
          resources:
            requests:
              cpu: "100m"
              memory: "96Mi"
            limits:
              cpu: "200m"
              memory: "512Mi"
          envFrom:
            - secretRef:
                name: pc-secrets-global
            - configMapRef:
                name: pc-config-global
          volumeMounts:
            - name: uploads
              mountPath: /app/uploads
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 20
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 10
      volumes:
        - name: uploads
          persistentVolumeClaim:
            claimName: pc-upload-pvc
```

---

## FILE: charts\auth-service\templates\service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: pc-app
spec:
  selector:
    app: auth-service
  ports:
    - port: 8000
      targetPort: 8000
  type: ClusterIP
```

---

## FILE: charts\auth-service\Chart.yaml

```yaml
apiVersion: v2
name: auth-service
description: PayCrest Auth Service
type: application
version: 1.0.0
appVersion: "1.0.0"
```

---

## FILE: charts\emi-service\templates\deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: emi-service
  namespace: pc-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: emi-service
  template:
    metadata:
      labels:
        app: emi-service
    spec:
      containers:
        - name: emi-container
          image: chillmadiguys/emi-service:v1.1.1
          imagePullPolicy: Always
          ports:
            - containerPort: 8000
          resources:
            requests:
              cpu: "100m"
              memory: "96Mi"
            limits:
              cpu: "200m"
              memory: "512Mi"
          envFrom:
            - configMapRef:
                name: pc-config-global
            - secretRef:
                name: pc-secrets-global
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 20
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 10
```

---

## FILE: charts\emi-service\templates\service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: emi-service
  namespace: pc-app
spec:
  selector:
    app: emi-service
  ports:
    - port: 8000
      targetPort: 8000
  type: ClusterIP

```

---

## FILE: charts\emi-service\Chart.yaml

```yaml
apiVersion: v2
name: emi-service
description: PayCrest EMI Service 
type: application
version: 1.0.0
appVersion: "1.0.0"
```

---

## FILE: charts\frontend\templates\deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: pc-frontend
spec:
  selector:
    matchLabels:
      app: frontend
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0   
      maxSurge: 1
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: chillmadiguys/frontend:v1.1.1
          imagePullPolicy: Always
          ports:
            - containerPort: 80
          volumeMounts:
            - name: nginx-config
              mountPath: /etc/nginx/conf.d/default.conf
              subPath: default.conf
              readOnly: true
          livenessProbe:
            httpGet:
              path: /health
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 30
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 3
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "200m"
              memory: "256Mi"
      volumes:
        - name: nginx-config
          configMap:
            name: frontend-nginx-config
```

---

## FILE: charts\frontend\templates\hpa.yaml

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-service-hpa
  namespace: pc-frontend
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 1
  maxReplicas: 2
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 120
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Pods
          value: 2
          periodSeconds: 30
```

---

## FILE: charts\frontend\templates\service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: pc-frontend
spec:
  selector:
    app: frontend
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```

---

## FILE: charts\frontend\Chart.yaml

```yaml
apiVersion: v2
name: frontend
description: PayCrest Frontend 
type: application
version: 1.0.0
appVersion: "1.0.0"
```

---

## FILE: charts\loan-service\templates\deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loan-service
  namespace: pc-app
spec:
  selector:
    matchLabels:
      app: loan-service
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    metadata:
      labels:
        app: loan-service
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: loan-service
                topologyKey: "kubernetes.io/hostname"
      containers:
        - name: loan-container
          image: chillmadiguys/loan-service:v1.1.1
          imagePullPolicy: Always
          ports:
            - containerPort: 8000
          resources:
            requests:
              cpu: "100m"
              memory: "96Mi"
            limits:
              cpu: "200m"
              memory: "512Mi"
          envFrom:
            - configMapRef:
                name: pc-config-global
            - secretRef:
                name: pc-secrets-global
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 10
          volumeMounts:
            - name: loan-volume
              mountPath: /app/uploads
      volumes:
        - name: loan-volume
          persistentVolumeClaim:
            claimName: pc-upload-pvc
```

---

## FILE: charts\loan-service\templates\hpa.yaml

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: loan-service-hpa
  namespace: pc-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: loan-service
  minReplicas: 2
  maxReplicas: 4
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 120
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
```

---

## FILE: charts\loan-service\templates\service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: loan-service
  namespace: pc-app
spec:
  type: ClusterIP
  selector:
    app: loan-service
  ports:
    - port: 8000
      targetPort: 8000
```

---

## FILE: charts\loan-service\Chart.yaml

```yaml
apiVersion: v2
name: loan-service
description: PayCrest Loan Service 
type: application
version: 1.0.0
appVersion: "1.0.0"
```

---

## FILE: charts\manager-service\templates\deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: manager-service
  namespace: pc-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: manager-service
  template:
    metadata:
      labels:
        app: manager-service
    spec:
      containers:
        - name: manager-service
          image: chillmadiguys/manager-service:v1.1.1
          imagePullPolicy: Always
          ports:
            - containerPort: 8000
          resources:
            requests:
              cpu: "100m"
              memory: "96Mi"
            limits:
              cpu: "200m"
              memory: "512Mi"
          envFrom:
            - configMapRef:
                name: pc-config-global
            - secretRef:
                name: pc-secrets-global
          volumeMounts:
            - name: manager-volume
              mountPath: /app/uploads
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 10
      volumes:
        - name: manager-volume
          persistentVolumeClaim:
            claimName: pc-upload-pvc
```

---

## FILE: charts\manager-service\templates\service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: manager-service
  namespace: pc-app
spec:
  type: ClusterIP
  selector:
    app: manager-service
  ports:
    - port: 8000
      targetPort: 8000
```

---

## FILE: charts\manager-service\Chart.yaml

```yaml
apiVersion: v2
name: manager-service
description: PayCrest Manager Service 
type: application
version: 1.0.0
appVersion: "1.0.0"
```

---

## FILE: charts\mongodb\templates\service.yaml

```yaml
apiVersion: v1
kind: Service 
metadata:
  name: mongodb 
  namespace: pc-data 
spec:
  clusterIP: None
  selector: 
    app: mongodb 
  ports:
    - port: 27017
      targetPort: 27017
```

---

## FILE: charts\mongodb\templates\statefulset.yaml

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: pc-data
spec:
  replicas: 1
  serviceName: mongodb
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
        - name: mongodb
          image: mongo:7.0
          ports:
            - containerPort: 27017
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              valueFrom:
                secretKeyRef:
                  name: mongo-secret
                  key: MONGO_INITDB_ROOT_USERNAME
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mongo-secret
                  key: MONGO_INITDB_ROOT_PASSWORD
            - name: MONGO_INITDB_DATABASE
              valueFrom:
                secretKeyRef:
                  name: mongo-secret
                  key: MONGO_INITDB_DATABASE
          volumeMounts:
            - name: mongo-data
              mountPath: /data/db
  volumeClaimTemplates:
    - metadata:
        name: mongo-data
      spec:
        accessModes:
          - "ReadWriteOnce"
        storageClassName: nfs-csi
        resources:
          requests:
            storage: 10Gi
```

---

## FILE: charts\mongodb\Chart.yaml

```yaml
apiVersion: v2
name: mongodb
description: MongoDB
type: application
version: 1.0.0
```

---

## FILE: charts\payment-service\templates\deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: pc-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payment-service
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: payment-service
                topologyKey: "kubernetes.io/hostname"
      containers:
        - name: payment-cont
          image: chillmadiguys/payment-service:v1.1.1
          imagePullPolicy: Always
          ports:
            - containerPort: 8000
          resources:
            requests:
              cpu: "100m"
              memory: "96Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          envFrom:
            - configMapRef:
                name: pc-config-global
            - secretRef:
                name: pc-secrets-global
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 10
```

---

## FILE: charts\payment-service\templates\service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  namespace: pc-app
spec:
  type: ClusterIP
  selector:
    app: payment-service
  ports:
    - port: 8000
      targetPort: 8000
```

---

## FILE: charts\payment-service\Chart.yaml

```yaml
apiVersion: v2
name: payment-service
description: PayCrest Payment Service 
type: application
version: 1.0.0
appVersion: "1.0.0"
```

---

## FILE: charts\verification-service\templates\deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: verification-service
  namespace: pc-app
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      app: verification-service
  template:
    metadata:
      labels:
        app: verification-service
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: verification-service
                topologyKey: "kubernetes.io/hostname"
      containers:
        - name: verification-service-cont
          image: chillmadiguys/verification-service:v1.1.1
          imagePullPolicy: Always
          ports:
            - containerPort: 8000
          resources:
            requests:
              cpu: "100m"
              memory: "96Mi"
            limits:
              cpu: "400m"
              memory: "512Mi"
          envFrom:
            - configMapRef:
                name: pc-config-global
            - secretRef:
                name: pc-secrets-global
          volumeMounts:
            - name: verification-service-volume
              mountPath: /app/uploads
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 20
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 10
      volumes:
        - name: verification-service-volume
          persistentVolumeClaim:
            claimName: pc-upload-pvc
```

---

## FILE: charts\verification-service\templates\service.yaml

```yaml
apiVersion: v1 
kind: Service 
metadata:
  name: verification-service 
  namespace: pc-app
spec:
  selector:
    app: verification-service 
  ports:
    - targetPort: 8000
      port: 8000
  type: ClusterIP
    
  

```

---

## FILE: charts\verification-service\Chart.yaml

```yaml
apiVersion: v2
name: verification-service
description: PayCrest Verification Service 
type: application
version: 1.0.0
appVersion: "1.0.0"
```

---

## FILE: charts\wallet-service\templates\Deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wallet-service
  namespace: pc-app
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      app: wallet-service
  template:
    metadata:
      labels:
        app: wallet-service
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: wallet-service
                topologyKey: "kubernetes.io/hostname"
      containers:
        - name: wallet-service-cont
          image: chillmadiguys/wallet-service:v1.1.1
          imagePullPolicy: Always
          ports:
            - containerPort: 8000
          resources:
            requests:
              cpu: "100m"
              memory: "96Mi"
            limits:
              cpu: "400m"
              memory: "512Mi"
          envFrom:
            - configMapRef:
                name: pc-config-global
            - secretRef:
                name: pc-secrets-global
          volumeMounts:
            - name: wallet-volume
              mountPath: /app/uploads
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 20
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 10
      volumes:
        - name: wallet-volume
          persistentVolumeClaim:
            claimName: pc-upload-pvc
```

---

## FILE: charts\wallet-service\templates\service.yaml

```yaml
apiVersion: v1 
kind: Service 
metadata:
  name: wallet-service 
  namespace: pc-app
spec:
  selector:
    app: wallet-service  
  ports:
    - targetPort: 8000
      port: 8000
  type: ClusterIP
    
  

```

---

## FILE: charts\wallet-service\Chart.yaml

```yaml
apiVersion: v2
name: wallet-service
description: PayCrest Wallet Service 
type: application
version: 1.0.0
appVersion: "1.0.0"
```

---

## FILE: templates\api-secrets.yaml

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: pc-secret-api
  namespace: pc-edge
type: Opaque
stringData:
  JWT_SECRET: pycrest_jwt_secret_devops_2024
  JWT_ALGORITHM: HS256
  PORT: "3000"
  INTERNAL_SERVICE_TOKEN: e9ccbcbfd93e305d56e67a751664bd4b79ed32b23a896cc71958b98008f0fbcb
  AUTH_SERVICE_URL: http://auth-service.pc-app.svc.cluster.local:8000
  LOAN_SERVICE_URL: http://loan-service.pc-app.svc.cluster.local:8000
  EMI_SERVICE_URL: http://emi-service.pc-app.svc.cluster.local:8000
  WALLET_SERVICE_URL: http://wallet-service.pc-app.svc.cluster.local:8000
  PAYMENT_SERVICE_URL: http://payment-service.pc-app.svc.cluster.local:8000
  VERIFICATION_SERVICE_URL: http://verification-service.pc-app.svc.cluster.local:8000
  ADMIN_SERVICE_URL: http://admin-service.pc-app.svc.cluster.local:8000
  MANAGER_SERVICE_URL: http://manager-service.pc-app.svc.cluster.local:8000
  AUDIT_SERVICE_URL: http://admin-service.pc-app.svc.cluster.local:8000
```

---

## FILE: templates\app-secrets.yaml

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: pc-secrets-global
  namespace: pc-app
type: Opaque
stringData:
  MONGODB_URI: mongodb://pycrest:pycrest123@mongodb-0.mongodb.pc-data.svc.cluster.local:27017/pycrest?authSource=admin
  MONGODB_DB: pycrest
  JWT_SECRET: pycrest_jwt_secret_devops_2024
  JWT_SECRET_KEY: pycrest_jwt_secret_devops_2024
  JWT_ALGORITHM: HS256
  JWT_EXPIRE_MINUTES: "60"
  INTERNAL_SERVICE_TOKEN: e9ccbcbfd93e305d56e67a751664bd4b79ed32b23a896cc71958b98008f0fbcb
  AUTH_SERVICE_URL: http://auth-service.pc-app.svc.cluster.local:8000
  LOAN_SERVICE_URL: http://loan-service.pc-app.svc.cluster.local:8000
  EMI_SERVICE_URL: http://emi-service.pc-app.svc.cluster.local:8000
  WALLET_SERVICE_URL: http://wallet-service.pc-app.svc.cluster.local:8000
  PAYMENT_SERVICE_URL: http://payment-service.pc-app.svc.cluster.local:8000
  VERIFICATION_SERVICE_URL: http://verification-service.pc-app.svc.cluster.local:8000
  ADMIN_SERVICE_URL: http://admin-service.pc-app.svc.cluster.local:8000
  MANAGER_SERVICE_URL: http://manager-service.pc-app.svc.cluster.local:8000
  AUDIT_SERVICE_URL: http://admin-service.pc-app.svc.cluster.local:8000
```

---

## FILE: templates\configmap.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pc-config-global
  namespace: pc-app
data:
  UPLOAD_BASE_PATH: "/app/uploads"
  PYTHONDONTWRITEBYTECODE: "1"
  PYTHONUNBUFFERED: "1"
  PYTHONPATH: "/app"
```

---

## FILE: templates\frontend-configmap.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-nginx-config
  namespace: pc-frontend
data:
  default.conf: |
    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        location /health {
            access_log off;
            return 200 "ok\n";
            add_header Content-Type text/plain;
        }

        location / {
            try_files $uri $uri/ /index.html;
        }
    }
```

---

## FILE: templates\gateway.yaml

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata: 
  name: paycrest-kgate
  namespace: pc-gateway
spec:
  gatewayClassName: kgateway
  listeners:
    - name: http
      port: 80
      protocol: HTTP
      allowedRoutes:
        namespaces:
          from: Selector
          selector:
            matchExpressions:
              - key: "kubernetes.io/metadata.name"
                operator: In
                values:
                  - pc-frontend
                  - pc-edge
                  - pc-gateway
          
```

---

## FILE: templates\mongo-secrets.yaml

```yaml
apiVersion: v1
kind: Secret 
metadata:
  name: mongo-secret 
  namespace: pc-data 
type: Opaque
stringData:
  MONGO_INITDB_ROOT_USERNAME: pycrest
  MONGO_INITDB_ROOT_PASSWORD: pycrest123
  MONGO_INITDB_DATABASE: pycrest
```

---

## FILE: templates\network-policies.yaml

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: gateway-policy
  namespace: pc-gateway
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - {}  #
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    - to:
        - ipBlock:
            cidr: 10.96.0.10/32
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: pc-edge
      ports:
        - protocol: TCP
          port: 3000
    - to:
        - ipBlock:
            cidr: 10.96.0.0/12
      ports:
        - protocol: TCP
          port: 3000
        - protocol: TCP
          port: 80
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: pc-frontend
      ports:
        - protocol: TCP
          port: 80
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kgateway-system
      ports:
        - protocol: TCP
          port: 9977
        - protocol: TCP
          port: 443
---

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: gateway-shield
  namespace: pc-edge
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: pc-gateway
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    - to:
        - ipBlock:
            cidr: 10.96.0.10/32
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: pc-app
      ports:
        - protocol: TCP
          port: 8000
    - to:
        - ipBlock:
            cidr: 10.96.0.0/12
      ports:
        - protocol: TCP
          port: 8000
---

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-isolation
  namespace: pc-frontend
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: pc-gateway
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    - to:
        - ipBlock:
            cidr: 10.96.0.10/32
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: app-isolation
  namespace: pc-app
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: pc-edge
      ports:
        - protocol: TCP
          port: 8000
    - from:
        - podSelector: {}
      ports:
        - protocol: TCP
          port: 8000
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: pc-data
      ports:
        - protocol: TCP
          port: 27017
    - to:
        - ipBlock:
            cidr: 10.96.0.0/12
      ports:
        - protocol: TCP
          port: 27017
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    - to:
        - ipBlock:
            cidr: 10.96.0.10/32
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    - to:
        - podSelector: {}
      ports:
        - protocol: TCP
          port: 8000
    - to:
        - ipBlock:
            cidr: 10.96.0.0/12
      ports:
        - protocol: TCP
          port: 8000
    # Allow external HTTPS for Cashfree and other payment gateways
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 192.168.0.0/16
              - 172.16.0.0/12
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 80
---

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-app
  namespace: pc-data
spec:
  podSelector:
    matchLabels:
      app: mongodb
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: pc-app
      ports:
        - protocol: TCP
          port: 27017
```

---

## FILE: templates\pvc.yaml

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pc-upload-pvc
  namespace: pc-app
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs-csi
  resources: 
    requests:
      storage: 10Gi
```

---

## FILE: templates\reference-api.yaml

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: grant-api
  namespace: pc-edge
spec:
  from:
    - group: gateway.networking.k8s.io
      kind: HTTPRoute
      namespace: pc-gateway
  to:
    - group: ""
      kind: Service
      
```

---

## FILE: templates\reference-frontend.yaml

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: grant-frontend
  namespace: pc-frontend
spec:
  from:
    - group: gateway.networking.k8s.io
      kind: HTTPRoute
      namespace: pc-gateway
  to:
    - group: ""
      kind: Service
```

---

## FILE: templates\routes.yaml

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: paycrest-route
  namespace: pc-gateway
spec:
  parentRefs:
    - name: paycrest-kgate
  rules:
    - matches:
        - path:
            type: Exact
            value: /health
      backendRefs:
        - name: frontend-service
          namespace: pc-frontend
          port: 80

    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: api-gateway
          namespace: pc-edge
          port: 3000

    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: frontend-service
          namespace: pc-frontend
          port: 80
```

---

## FILE: templates\storageclass.yaml

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-csi
provisioner: nfs.csi.k8s.io
parameters:
  server: 10.0.1.140  
  share: /var/nfs/paycrest
reclaimPolicy: Retain
volumeBindingMode: Immediate
mountOptions:
  - nfsvers=4.1
  - hard
  - timeo=600
  - retrans=2
```

---

## FILE: Chart.yaml

```yaml
apiVersion: v2
name: pycrest-umbrella
description: PayCrest LMS â€” full-stack microservices umbrella chart
type: application
version: 1.0.0
appVersion: "1.0.0"

dependencies:
  - name: mongodb
    version: "1.0.0"
    repository: "file://charts/mongodb"
  - name: api-gateway
    version: "1.0.0"
    repository: "file://charts/api-gateway"
  - name: frontend
    version: "1.0.0"
    repository: "file://charts/frontend"
  - name: admin-service
    version: "1.0.0"
    repository: "file://charts/admin-service"
  - name: auth-service
    version: "1.0.0"
    repository: "file://charts/auth-service"
  - name: emi-service
    version: "1.0.0"
    repository: "file://charts/emi-service"
  - name: loan-service
    version: "1.0.0"
    repository: "file://charts/loan-service"
  - name: manager-service
    version: "1.0.0"
    repository: "file://charts/manager-service"
  - name: payment-service
    version: "1.0.0"
    repository: "file://charts/payment-service"
  - name: verification-service
    version: "1.0.0"
    repository: "file://charts/verification-service"
  - name: wallet-service
    version: "1.0.0"
    repository: "file://charts/wallet-service"
```

---

## FILE: values.yaml

```yaml
```
