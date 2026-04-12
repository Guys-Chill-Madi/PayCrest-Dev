param (
    [string]$OutputFile = "helm-docs.md",
    [string]$RootPath = ".",
    [switch]$OnlyYaml
)

$codeBlock = '```'

"# Helm Chart Documentation`nGenerated on: $(Get-Date)`n" | Out-File -FilePath $OutputFile -Encoding utf8

if ($OnlyYaml) {
    $files = Get-ChildItem -Path $RootPath -Recurse -Include *.yaml, *.yml -File
} else {
    $files = Get-ChildItem -Path $RootPath -Recurse -File
}

foreach ($file in $files) {

    $basePath = (Resolve-Path $RootPath).Path
    $relativePath = $file.FullName.Substring($basePath.Length + 1)

    "`n---`n" | Out-File -FilePath $OutputFile -Append -Encoding utf8
    "## FILE: $relativePath`n" | Out-File -FilePath $OutputFile -Append -Encoding utf8

    if ($file.Extension -match "ya?ml") {
        ($codeBlock + "yaml") | Out-File -FilePath $OutputFile -Append -Encoding utf8
    }
    else {
        ($codeBlock + "text") | Out-File -FilePath $OutputFile -Append -Encoding utf8
    }

    Get-Content -Path $file.FullName | Out-File -FilePath $OutputFile -Append -Encoding utf8

    $codeBlock | Out-File -FilePath $OutputFile -Append -Encoding utf8
}

Write-Host ('Documentation generated: ' + $OutputFile)