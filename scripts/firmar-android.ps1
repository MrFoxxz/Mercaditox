param(
    [Parameter(Mandatory)] [string] $Apk,
    [Parameter(Mandatory)] [string] $Destino,
    [switch] $Inicializar
)

$ErrorActionPreference = 'Stop'
$signingDirectory = Join-Path $env:LOCALAPPDATA 'Mercaditox\signing'
$keystore = Join-Path $signingDirectory 'mercaditox-ffoxx.p12'
$passwordFile = Join-Path $signingDirectory 'mercaditox-ffoxx.dpapi'
$alias = 'merca-ffoxx'
$keytool = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
$apksigner = Join-Path $env:ANDROID_HOME 'build-tools\37.0.0\apksigner.bat'
$apkSource = (Resolve-Path -LiteralPath $Apk).Path

try {
    if ((Test-Path -LiteralPath $keystore) -and (Test-Path -LiteralPath $passwordFile)) {
        $securePassword = (Get-Content -LiteralPath $passwordFile -Raw).Trim() | ConvertTo-SecureString
        $env:MX_FFOXX_SIGNING_PASSWORD = [pscredential]::new($alias, $securePassword).GetNetworkCredential().Password
    } else {
        if (!$Inicializar -or (Test-Path -LiteralPath $keystore) -or (Test-Path -LiteralPath $passwordFile)) {
            throw 'Se requieren tanto el almacén de claves FFoxx como la contraseña protegida del usuario de Windows.'
        }
        [IO.Directory]::CreateDirectory($signingDirectory) | Out-Null
        $bytes = [byte[]]::new(36)
        $random = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $random.GetBytes($bytes) } finally { $random.Dispose() }
        $env:MX_FFOXX_SIGNING_PASSWORD = [Convert]::ToBase64String($bytes)
        $securePassword = ConvertTo-SecureString $env:MX_FFOXX_SIGNING_PASSWORD -AsPlainText -Force
        $securePassword | ConvertFrom-SecureString | Set-Content -LiteralPath $passwordFile
        $keyArguments = @('-genkeypair', '-keystore', $keystore, '-storetype', 'PKCS12', '-alias', $alias,
            '-storepass:env', 'MX_FFOXX_SIGNING_PASSWORD', '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000', '-dname', 'CN=FFoxx')
        & $keytool @keyArguments
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo generar la clave FFoxx.' }
    }

    $signArguments = @('sign', '--ks', $keystore, '--ks-type', 'PKCS12', '--ks-key-alias', $alias,
        '--ks-pass', 'env:MX_FFOXX_SIGNING_PASSWORD', '--out', $Destino, $apkSource)
    & $apksigner @signArguments
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo firmar el APK.' }
    $certificate = & $apksigner verify --verbose --print-certs $Destino
    if ($LASTEXITCODE -ne 0 -or !($certificate -match 'certificate DN: CN=FFoxx$') -or
        !($certificate -match 'Number of signers: 1$')) {
        throw 'El APK no contiene una única firma válida a nombre de FFoxx.'
    }
    $certificate | Select-String 'certificate DN:|certificate SHA-256 digest:'
} finally {
    Remove-Item Env:MX_FFOXX_SIGNING_PASSWORD -ErrorAction SilentlyContinue
}
