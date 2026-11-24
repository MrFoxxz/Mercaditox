# Mercaditox

App Android para organizar listas de compras en español. Tiene un catálogo precargado, listas guardadas en el celular y sincronización opcional con Firebase. La interfaz usa fondos oscuros y los PNG de marca en `assets/`. Los colores están en `src/theme.ts` y el icono y el arranque se configuran en `app.json`.

## Prueba en un celular Android

Instala `dist/Mercaditox-0.2.7-prueba.apk` encima de la 0.2.6, que usa el mismo certificado FFoxx. Si aún usas la 0.2.5 o una versión anterior, Android requiere una instalación nueva por el cambio de certificado. Al desinstalar, se borran los datos locales del teléfono.

- [ ] Comprueba el icono del zorro, el nuevo texto de marca y el fondo oscuro.
- [ ] Al iniciar, guarda tu nombre. En **Mis listas → Mi perfil** puedes cambiarlo.
- [ ] En **Mis listas**, crea una lista. Usa **⋯** para cambiarle el nombre o eliminarla con confirmación.
- [ ] En **+ Producto**, filtra por Verduras o Ferretería. Busca «palta», «cambur» y «frutilla». Deben aparecer Aguacate, Banano y Fresa.
- [ ] Usa **Buscar en esta lista** para filtrar los productos visibles de la lista activa. Toca un producto y cambia la categoría desde el selector desplegable.
- [ ] En **Modo compra**, toca cualquier parte de la fila para marcarla. Los totales quedan fijos abajo. Prueba **Deshacer**, el icono **+** para agregar y la flecha para volver a los controles de organización.
- [ ] Cambia la cantidad con **−** o **+** en una fila. El subtotal y los totales deben seguir la cantidad. Para una cantidad fraccionaria, puedes abrir el detalle.
- [ ] En **Comparar tiendas**, guarda precios para al menos dos tiendas, dejando un producto sin precio en una de ellas. Comprueba que esa tienda muestra cobertura parcial y un subtotal.
- [ ] En el catálogo, toca **Seleccionar varios**, marca productos de dos filtros distintos y toca **Agregar selección**. Los productos que ya estaban en la lista deben verse deshabilitados.
- [ ] Cambia el color en **Mis listas → ⋯** y comprueba que se distingue al cambiar de lista. Una vez que haya dos listas, desaparece el botón para crear otra.
- [ ] Despliega el encabezado, abre **Ordenar pasillos** y mueve una categoría. Comprueba el nuevo orden en **Modo compra**.
- [ ] Usa la papelera para sacar un producto. Abre **Exportar lista** y comprueba que el PDF y el texto muestran los productos visibles con su cantidad.
- [ ] Abre la guía desde **?** junto al botón **Mis listas**. Los nombres para futuras capturas están en `tutorial-capturas/README.md`.
- [ ] Marca un producto como comprado, crea un producto propio y elimina un producto confirmando el aviso.
- [ ] Marca la estrella de un producto. En **Favoritos**, agrégalo una vez y comprueba que se atenúa y aparece **Ya está en la lista**. Cambia la cantidad desde la lista.
- [ ] Toca el ojo para ocultar un producto y comprueba que queda fuera de los totales. En el encabezado, pulsa **Ver ocultos** y vuelve a mostrarlo con el ojo tachado.
- [ ] Toca el precio de un producto para abrir la edición rápida. Agrega dos precios con tiendas diferentes, pulsa **Usar este precio** en uno y comprueba el total. Dos unidades a `12,50` deben sumar $25.
- [ ] Despliega el encabezado con la flecha, toca **Cerrar mercado** y agrega una nota. Abre **Historial** y comprueba la fecha, el estimado, el pagado y la nota. Los productos deben volver a Pendientes, incluidos los ocultos.
- [ ] En una lista compartida, arrastra hacia abajo desde el inicio de la pantalla o toca el icono junto a **Compartir** para refrescar. Confirma que el aviso de actualización aparece al recibir los datos del servidor.
- [ ] Cierra la aplicación, activa modo avión y vuelve a abrirla. Las listas y sus cambios deben seguir disponibles en ese celular.

Si algo falla, anota el paso, el modelo del teléfono y la versión de Android, y adjunta una captura.

## Catálogo y guardado

La app consulta un documento de catálogo al abrir **Catálogo** y conserva una copia durante 24 horas. Desde la versión 0.2.3 se usa `catalog/v2`. La 0.2.4 reconoce los nombres regionales definidos en el campo opcional `aliases`. La versión 0.2.2 usa `catalog/default`, con los mismos productos en categorías compatibles. Para actualizar productos sin compilar otra APK, actualiza el documento usado por cada versión. Cada producto tiene `name`, `category` y `unit`. Buscar, filtrar y consultar Favoritos se hace en el celular. Si falla la actualización, se usa la última copia guardada o el catálogo incluido en la APK.

Las listas locales se guardan con AsyncStorage en el dispositivo. En las versiones conectadas a Firebase, una lista local pasa a Firestore al generar su primera invitación. Las listas compartidas usan la caché nativa de Firestore para conservar los datos cargados y los cambios pendientes al perder la conexión. Generar o aceptar invitaciones requiere internet. [Persistencia de Firestore](https://firebase.google.com/docs/firestore/manage-data/enable-offline)

## Activar la sincronización entre celulares

Mercaditox se conectó al proyecto `mercaditox-60ad8`. El acceso anónimo está habilitado y las reglas de Firestore de este proyecto se publicaron. Para probar esta configuración, sigue el paso 5 con la APK conectada en ambos teléfonos.

1. En tu proyecto de Firebase, registra una aplicación **Android** con el paquete `com.mercaditox.app`. Descarga su `google-services.json` y colócalo en la raíz del proyecto. Ese archivo contiene la configuración del cliente. [Configuración de Android en Firebase](https://firebase.google.com/docs/android/setup?hl=es)
2. En **Authentication → Método de acceso**, activa **Anónimo**. En **Cloud Firestore**, crea la base de datos predeterminada en modo producción. [Autenticación anónima](https://firebase.google.com/docs/auth/android/anonymous-auth)
3. Con una cuenta autorizada en el proyecto, publica `firestore.rules` desde la raíz con `npx.cmd firebase-tools deploy --only firestore:rules --project ID_DEL_PROYECTO`. Si el proyecto ya tiene reglas para otras aplicaciones, incorpora estas rutas a las reglas existentes antes de desplegar. Las consultas actuales usan los índices automáticos de Firestore.
4. Ejecuta `npx.cmd expo prebuild --platform android --no-install --no-clean` y genera la APK autónoma. Instala esa versión en ambos teléfonos.
5. En el primer teléfono, abre **Compartir** y genera un código. En el segundo, pégalo en **Código de otra lista** y pulsa **Unirme a una lista**. Cambia un producto en cada teléfono y verifica que aparece en el otro. Cada código dura 24 horas, permite una incorporación y se puede revocar mientras el dueño conserva el código.

El nombre del perfil se guarda en el celular y en el documento privado `users/{uid}` del usuario anónimo. Los miembros ven el nombre en **Compartir → Miembros**. Se copia al crear o aceptar una invitación y se actualiza al abrir cada lista compartida si se cambió en **Mi perfil**. El dueño puede renombrar una lista compartida o borrarla para todos. Un invitado puede quitarla de su celular. Los Favoritos se guardan en cada celular.

Cada producto puede tener hasta seis precios de tienda. El precio seleccionado se usa en el estimado y, si el producto se marca como comprado, en el pagado. En una lista compartida el dueño puede cerrar el mercado con conexión. Todos los miembros pueden ver los cierres compartidos. Los cierres realizados antes de compartir una lista siguen disponibles en el celular donde se guardaron.

La sincronización usa Firebase Authentication y Cloud Firestore. El plan Spark incluye una cuota gratuita para una base Firestore por proyecto. La cuenta anónima se conserva al actualizar la aplicación y puede perderse al desinstalarla o borrar sus datos. [Cuotas de Firestore](https://firebase.google.com/docs/firestore/quotas) · [Cuentas anónimas](https://firebase.google.com/docs/auth/android/anonymous-auth)

## Entorno Windows

| Herramienta | Versión usada | Descarga o referencia oficial |
| --- | --- | --- |
| Node.js y npm | Node.js 24.22.3 LTS, npm 11.19.1 incluido | [Node.js para Windows](https://nodejs.org/en/blog/release/v24.22.3/) |
| Visual Studio Code | 1.144.0 | [Descargar VS Code](https://code.visualstudio.com/download) |
| Git | 2.50.1 para Windows | [Instalar Git para Windows](https://git-scm.com/install/win) |
| JDK | Eclipse Temurin 17.0.21 | [Descargar Temurin 17](https://adoptium.net/temurin/releases/?version=17&os=windows&arch=x64) |
| Android Studio | Rabbit 2, parche 1 | [Descargar Android Studio](https://developer.android.com/studio) |
| Android SDK | Plataforma 37.0, Build Tools 37.0.0 y NDK 27.1.12297006 | [Configurar el SDK de Android](https://developer.android.com/studio/intro/update#sdk-manager) |
| Expo y React Native | Expo SDK 58, React Native 0.88.1, React 19.3.0 | [Compatibilidad del SDK de Expo](https://docs.expo.dev/versions/v58.0.0/) |

### Preparación desde otro equipo

1. Instala Node.js 24 LTS, Git, VS Code, JDK 17 y Android Studio para Windows x64 con los enlaces anteriores.
2. En **Android Studio → More Actions → SDK Manager**, instala la **plataforma Android 37.0** para compilar. En **SDK Tools**, instala **Android SDK Build-Tools 37.0.0**, **Android SDK Platform-Tools**, **Android SDK Command-line Tools** y **Android Emulator**. Gradle instala el NDK requerido al compilar por primera vez si la licencia está aceptada.
3. Crea las variables de usuario `JAVA_HOME` con la ruta del JDK y `ANDROID_HOME` con la ruta del SDK. La ruta habitual del SDK es `%LOCALAPPDATA%\Android\Sdk`. Agrega `%JAVA_HOME%\bin`, `%ANDROID_HOME%\platform-tools` y `%ANDROID_HOME%\emulator` al `Path` del usuario. Abre una terminal nueva.
4. En **Device Manager**, crea un teléfono virtual con Android 16 y una imagen x86_64. Para acelerarlo en AMD, habilita **SVM** en UEFI y **Plataforma de hipervisor de Windows** en las características de Windows. Reinicia y comprueba el resultado con `emulator -accel-check`. [Guía oficial de aceleración](https://developer.android.com/studio/run/emulator-acceleration)

### Herramientas en este equipo

Node.js, Temurin y Android Studio se instalaron bajo `%LOCALAPPDATA%\Mercaditox\toolchain`. El SDK está en `%LOCALAPPDATA%\Android\Sdk` y el dispositivo virtual se llama `Mercaditox_API_36`. Desde la raíz de Mercaditox, prepara la sesión de PowerShell con:

```powershell
$mxTools = Join-Path $env:LOCALAPPDATA 'Mercaditox\toolchain'
$mxNodeVersion = (Get-Content -LiteralPath .\.node-version -Raw).Trim()
$env:JAVA_HOME = Join-Path $mxTools 'jdk-17.0.21+9'
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$env:Path = "$mxTools\node-v$mxNodeVersion-win-x64;$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"

node --version
npm.cmd --version
git --version
code --version
java -version
adb --version
```

Puedes abrir Android Studio con `& "$mxTools\android-studio\bin\studio64.exe"`. Selecciona el SDK existente si aparece el asistente de configuración.

## Ejecutar Mercaditox

Arranca el emulador desde **Device Manager**, o conecta un Android con la depuración USB activada y acepta la conexión en el teléfono. Comprueba que ADB lo enumera como `device`. [Ejecutar en un dispositivo físico](https://developer.android.com/studio/run/device)

```powershell
adb devices -l
npm.cmd ci
npm.cmd run android
```

El último comando compila e instala la build de desarrollo y abre Metro. La primera compilación descarga Gradle y los paquetes nativos adicionales requeridos por Expo. Si ya tienes instalada esa build, inicia Metro con `npm.cmd start` y pulsa **a** para abrirla en Android.

Si ya tienes una APK de desarrollo generada en `android/app/build/outputs/apk/debug/app-debug.apk`, puedes reutilizarla con `adb install -r .\android\app\build\outputs\apk\debug\app-debug.apk` y abrir la app desde Metro de la misma forma.

Para ver la bienvenida en un navegador local, ejecuta `npm.cmd run web`. Para usar EAS Build más adelante, crea una cuenta desde el portal de Expo. Una compilación local funciona con el SDK de Android. [Cuenta de Expo](https://expo.dev/signup) · [Builds de desarrollo locales](https://docs.expo.dev/guides/local-app-development/)

## Generar la APK autónoma

Con el entorno de PowerShell preparado y las dependencias instaladas, ejecuta desde la raíz del proyecto:

```powershell
if (-not (Test-Path -LiteralPath .\android\gradlew.bat)) {
    npx.cmd expo prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { throw 'Falló la generación del proyecto Android.' }
}

Push-Location .\android
try {
    .\gradlew.bat :app:assembleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64'
    if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación de la APK.' }
} finally {
    Pop-Location
}
```

El APK intermedio sale en `android/app/build/outputs/apk/release/app-release.apk` e incluye el paquete de la app para abrirla directamente en Android. Para generar la versión distribuible, fírmalo con el certificado FFoxx del equipo. [Compilación local de Expo](https://docs.expo.dev/guides/local-app-production/)

```powershell
.\scripts\firmar-android.ps1 -Apk .\android\app\build\outputs\apk\release\app-release.apk -Destino .\dist\Mercaditox-0.2.7-prueba.apk
```

El script guarda el almacén de claves en `%LOCALAPPDATA%\Mercaditox\signing` y protege la contraseña con la cuenta de Windows. Reutiliza esa clave para las siguientes actualizaciones.

## Verificación

```powershell
npm.cmd run typecheck
npx.cmd expo install --check
npx.cmd --yes expo-doctor
```

La lista de pruebas manuales está al inicio de este documento. `com.mercaditox.app` es el identificador de Android.

En Windows, el plugin local de Expo limita la longitud de las rutas de objetos C++ generados por CMake. Se aplica al regenerar Android con Prebuild. [Límite de rutas de objetos en CMake](https://cmake.org/cmake/help/v3.22/variable/CMAKE_OBJECT_PATH_MAX.html)
# Mercaditox
