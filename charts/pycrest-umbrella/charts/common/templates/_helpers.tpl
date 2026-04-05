{{/*
Expand the name of the chart.
*/}}
{{- define "common.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}


{{- define "common.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: pycrest
{{- end }}

{{- define "common.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
ServiceAccount name convention: <chart-name>-sa
*/}}
{{- define "common.serviceAccountName" -}}
{{ .Chart.Name }}-sa
{{- end }}


{{- define "common.image" -}}
{{- $registry := .Values.global.imageRegistry | default "" -}}
{{- $repo := .Values.image.repository -}}
{{- $tag := .Values.image.tag | default "latest" -}}
{{- if $registry -}}
{{ $registry }}/{{ $repo }}:{{ $tag }}
{{- else -}}
{{ $repo }}:{{ $tag }}
{{- end -}}
{{- end }}

{{- define "common.envFrom" -}}
- secretRef:
    name: pycrest-global-secret
- configMapRef:
    name: pycrest-global-config
{{- end }}

{{- define "common.uploadsVolumeMount" -}}
- name: uploads
  mountPath: /app/uploads
{{- end }}


{{- define "common.uploadsVolume" -}}
- name: uploads
  persistentVolumeClaim:
    claimName: pycrest-uploads-pvc
{{- end }}


{{- define "common.rollingUpdateStrategy" -}}
type: RollingUpdate
rollingUpdate:
  maxUnavailable: 1
  maxSurge: 1
{{- end }}



{{- define "common.livenessProbe" -}}
httpGet:
  path: /health
  port: 8000
initialDelaySeconds: 20
periodSeconds: 30
timeoutSeconds: 5
failureThreshold: 3
{{- end }}


{{- define "common.readinessProbe" -}}
httpGet:
  path: /health
  port: 8000
initialDelaySeconds: 10
periodSeconds: 10
timeoutSeconds: 5
failureThreshold: 3
{{- end }}

