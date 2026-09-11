# Gastos en pareja

Aplicación personal de Lali Valentina y Óscar Iván: HTML, CSS y JavaScript, con gastos compartidos en Firebase y publicación en GitHub Pages. Sin cuentas ni contraseñas para quienes registran gastos.

## Estado de la entrega

La aplicación, las reglas, las pruebas y el flujo de publicación están incluidos. La configuración pública apunta al proyecto Firebase `gastos-en-pareja-a810c`, en plan Spark, con Firestore Standard en `northamerica-south1`.

Repositorio: [investigaciongiad/gastos-en-pareja](https://github.com/investigaciongiad/gastos-en-pareja). Dirección de GitHub Pages: [Gastos en pareja](https://investigaciongiad.github.io/gastos-en-pareja/). Para acceder a los gastos se necesita el enlace privado completo; su identificador no se publica en este repositorio.

## Uso diario

1. Abrir el enlace privado completo, que termina en `#acceso=…`.
2. Seleccionar quién pagó, indicar el valor en pesos, escribir el concepto, elegir la categoría y guardar. La fecha empieza en el día actual de Colombia.
3. Esperar «Gasto guardado para los dos». Si falla, conservar la pestaña abierta y reintentar cuando vuelva la conexión: el formulario mantiene lo escrito.
4. En **Movimientos**, seleccionar el mes y filtrar por persona o categoría. Los botones del lápiz y la papelera permiten editar o eliminar.
5. En **Resumen**, consultar total mensual, pagos de cada persona y distribución por categorías.

Ambos pueden modificar cualquier gasto. Los pagos por persona no representan deudas. Los valores admitidos son pesos enteros entre 1 y 999.999.999.999. Las fechas son fechas calendario reales desde 1900. La app no guarda gastos sin internet ni conserva borradores después de cerrar la pestaña; advierte al salir con cambios pendientes. En celular, se puede guardar el enlace como favorito. No se implementa una PWA ni una instalación sin conexión.

## Configurar Firebase, una sola vez

La persona que administra la aplicación necesita una cuenta Google; Lali y Óscar no tendrán que iniciar sesión.

Estos pasos sirven para reproducir la instalación; el proyecto de esta pareja ya está creado. Consola: [Gastos en pareja](https://console.firebase.google.com/project/gastos-en-pareja-a810c/overview).

1. Entrar a [Firebase Console](https://console.firebase.google.com/) y crear un proyecto llamado **Gastos en pareja**, en plan **Spark**. No habilitar Google Analytics. No se requieren funciones, almacenamiento de archivos ni facturación para las capacidades incluidas; se aplican las cuotas del plan gratuito.
2. Registrar una aplicación **Web** en Configuración del proyecto → Tus apps. No es necesario activar Firebase Hosting.
3. Copiar `apiKey`, `authDomain`, `projectId` y `appId` a `dist/firebase-config.js`. Estos valores identifican públicamente la app; no son la credencial de acceso a los gastos. Mantener `emulatorConfig = null`. Nunca copiar archivos de cuenta de servicio o claves privadas a `dist`.
4. En Authentication → Sign-in method, habilitar **Anonymous / Anónimo**. Dejar desactivados los proveedores que no se usarán. No activar la actualización opcional a Identity Platform.
5. Crear una base **Cloud Firestore Standard**, ID `(default)`, en modo producción. Elegir la ubicación disponible más cercana a Colombia; la ubicación de la base no cambia la zona horaria utilizada por la app.
6. En Firestore → Reglas, reemplazar el contenido por `firestore.rules` y publicar. No utilizar reglas de modo prueba. Alternativa mediante CLI: `npx firebase login` y `npx firebase deploy --only firestore --project TU_PROJECT_ID`.
7. En Authentication → Settings → Authorized domains, añadir `TU_USUARIO.github.io` si la configuración del proyecto lo requiere. No introducir una URL con ruta en la lista de dominios.

Documentación: [SDK web](https://firebase.google.com/docs/web/setup), [autenticación anónima](https://firebase.google.com/docs/auth/web/anonymous-auth), [reglas](https://firebase.google.com/docs/firestore/security/rules-conditions), [cuotas y precios](https://firebase.google.com/docs/firestore/pricing).

## Crear el repositorio y publicar

Requisito de desarrollo: Node.js 22. Para ejecutar emuladores, Java 21. El sitio publicado no necesita Node ni Java.

1. Crear en [GitHub](https://github.com/new) un repositorio llamado **gastos-en-pareja**. En GitHub Free, usar un repositorio público para GitHub Pages; solo se subirán código y archivos de configuración públicos, nunca gastos ni el enlace privado. Si ya se dispone de un plan compatible con Pages en repositorios privados, puede mantenerse privado.
2. Subir este proyecto conservando la estructura. `.gitignore` excluye `.private/`, dependencias y resultados de pruebas. No subir nada de esas carpetas manualmente.
3. En Settings → Pages → Build and deployment, seleccionar **GitHub Actions**.
4. Completar Firebase antes de publicar y subir los cambios a `main`. El flujo `.github/workflows/pages.yml` ejecuta las pruebas y publica **únicamente `dist/`**; falla intencionalmente si falta configurar Firebase.
5. Esperar a que finalice el flujo y comprobar la dirección que muestra el paso de publicación. Habitualmente será `https://TU_USUARIO.github.io/gastos-en-pareja/`.

Si el repositorio local aún no tiene Git:

```powershell
git init -b main
git add .
git commit -m "Crear aplicativo de gastos en pareja"
git remote add origin https://github.com/TU_USUARIO/gastos-en-pareja.git
git push -u origin main
```

No volver a ejecutar `git init` ni añadir otro `origin` si ya están configurados. La autenticación de GitHub se hace con sus herramientas, no enviando contraseñas al chat.

## Generar el enlace compartido y activar el espacio

Con la URL publicada:

```powershell
npm run setup:link -- https://TU_USUARIO.github.io/gastos-en-pareja/
```

El comando crea `.private/acceso.json` con un identificador generado criptográficamente de 256 bits y el enlace. No imprime el secreto en la terminal y se niega a sobrescribir un enlace existente.

1. Abrir **localmente** `.private/acceso.json`.
2. En Firestore → Datos, crear la colección `espacios` y un documento cuyo ID sea exactamente `documentoFirebase.id` del archivo. Añadir el campo booleano `active` con valor `true`.
3. No crear gastos manualmente. El aplicativo creará la subcolección `gastos` al registrar el primero.
4. Abrir el valor de `enlace` del archivo en los dos celulares. Compartirlo únicamente con quienes deban acceder.

**El enlace es la credencial. Quien lo posea puede leer y modificar todos los gastos.** El secreto no debe aparecer en GitHub, capturas públicas, diagnósticos ni herramientas de analítica. El fragmento no se envía al servidor de GitHub Pages; el navegador sí lo usa para consultar la ruta protegida en Firebase. La sesión anónima no prueba quién es la persona que paga.

## Administración y recuperación

- Los datos viven en `espacios/{identificador}/gastos/{id}`. Cerrar el navegador o cambiar de celular no los elimina.
- Cada gasto contiene `payer`, `amount`, `description`, `category`, `date`, `createdAt`, `updatedAt` y `version`. `payer` usa `lali` u `oscar`; la descripción siempre se presenta como texto, nunca como HTML.
- Las reglas impiden leer/listar los espacios administrativos y cualquier consulta global de gastos. Requieren un espacio existente y activo para cada operación.
- Para revocar un enlace filtrado, cambiar `active` a `false` en ese espacio desde la consola. Esto bloquea nuevas operaciones; no puede retirar copias de datos que alguien ya haya leído.
- Para reemplazarlo conservando gastos, un administrador debe copiar la subcolección a un nuevo espacio secreto, comprobar la copia y activar el nuevo enlace. No borrar el espacio anterior hasta verificar los datos. No hay rotación automática en esta versión.
- Eliminar un gasto desde la app es definitivo. No se incluyen copias de seguridad automáticas. Si se necesitan, valorar las funciones de exportación/backup de Firebase y sus condiciones de facturación antes de habilitarlas.
- Revisar Firestore → Usage para observar las cuotas. Un límite agotado produce un error de conexión/guardado; nunca se debe interpretar como gasto confirmado.

## Desarrollo y verificación

```powershell
npm ci
npm run start
```

Abrir `http://127.0.0.1:4173/gastos-en-pareja/`. Sin configurar Firebase se puede revisar la interfaz, pero Guardar estará desactivado. El servidor solo expone `dist/` y escucha en el equipo local.

```powershell
npm run check
npm test
npm run test:rules
node scripts/prepare-sdk.mjs
npx playwright install chromium webkit
npm run test:e2e
```

Las pruebas utilizan exclusivamente el proyecto ficticio `demo-gastos-pareja`, emuladores locales y datos sintéticos. El SDK descargado para las pruebas es el mismo SDK oficial que usa producción. El servidor de pruebas sustituye la configuración en memoria solo cuando `USE_EMULATORS=1`; no modifica archivos publicados. No se usa una base real para las pruebas.

Playwright comprueba Chromium con pantalla Android y WebKit con pantalla iPhone. Son pruebas de motores y tamaños simulados; la validación final desde dos teléfonos reales debe realizarse después de configurar y publicar.

En carpetas sincronizadas de Google Drive, si `npm ci` falla al escribir miles de dependencias, copiar el proyecto sin `.private/` a una carpeta local de desarrollo y ejecutar allí los mismos comandos. No hace falta instalar dependencias para editar ni publicar directamente los archivos estáticos.

## Lista de puesta en marcha

- [ ] Firebase configurado, proveedor anónimo activo y reglas publicadas.
- [ ] Espacio secreto creado con `active: true`.
- [ ] Repositorio y GitHub Pages publicados sin secretos ni datos de prueba.
- [ ] Enlace sin fragmento o incorrecto no muestra gastos.
- [ ] Gasto registrado en un celular aparece en el otro y al reabrir.
- [ ] Editar, eliminar y consultar resúmenes funciona desde ambos teléfonos.
- [ ] Un intento sin internet conserva el formulario sin confirmar el guardado.
