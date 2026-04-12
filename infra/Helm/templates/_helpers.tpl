{{/*
Common labels applied to all resources
*/}}
{{- define "paycrest.labels" -}}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end }}

{{/*
Standard envFrom for all pc-app services
*/}}
{{- define "paycrest.appEnvFrom" -}}
- configMapRef:
    name: pc-config-global
- secretRef:
    name: pc-secrets-global
{{- end }}

{{/*
Standard upload volume mount
*/}}
{{- define "paycrest.uploadVolumeMount" -}}
- name: uploads
  mountPath: /app/uploads
{{- end }}

{{/*
Standard upload volume definition
*/}}
{{- define "paycrest.uploadVolume" -}}
- name: uploads
  persistentVolumeClaim:
    claimName: pc-upload-pvc
{{- end }}

{{/*
Pod anti-affinity by hostname
Call with the app label string: include "paycrest.antiAffinity" "auth-service"
*/}}
{{- define "paycrest.antiAffinity" -}}
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: {{ . }}
          topologyKey: "kubernetes.io/hostname"
{{- end }}

{{/*
Standard liveness + readiness probes for port 8000 app services
*/}}
{{- define "paycrest.appProbes" -}}
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
{{- end }}

{{/*
Standard RollingUpdate strategy
*/}}
{{- define "paycrest.rollingUpdate" -}}
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 1
    maxSurge: 1
{{- end }}