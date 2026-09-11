# Verificación de la entrega

Fecha: 11 de septiembre de 2026.

## Resultado

- **6 pruebas de dominio aprobadas:** COP, valores inválidos, zona horaria de Colombia, fechas reales, filtros y totales.
- **9 pruebas de reglas aprobadas en Firestore Emulator:** CRUD con acceso válido, autenticación anónima, denegación de acceso, espacios desconocidos/inactivos, enumeración, validación de campos, fechas y versiones.
- **16 pruebas de navegador aprobadas:** 8 escenarios en Chromium con perfil Android y los mismos 8 en WebKit con perfil iPhone. Incluyen sincronización entre dos sesiones, persistencia al reabrir, edición, eliminación, conflictos, pérdida de conexión, doble envío, texto malicioso tratado como texto y diseño a 320, 390 y 1280 px.
- Revisión visual de escritorio y captura de móvil completadas.
- La consulta opcional del resumen por WebMCP se verificó en el navegador integrado: devuelve los totales visibles y rechaza parámetros inválidos sin alterar datos.
- Referencias locales, sintaxis de JavaScript y búsqueda de secretos en los archivos públicos correctas.
- El control de publicación rechaza correctamente la configuración vacía de Firebase.

## Entorno

Node.js 22, Firebase SDK 12.19.0, Firebase CLI 15.30.0, Java 21 y Playwright 1.63.0. Proyecto de pruebas `demo-gastos-pareja`, con Authentication y Firestore locales. Datos exclusivamente sintéticos, sin conexiones a una base de producción.

Las dependencias y las pruebas se ejecutaron desde una copia local fuera de Google Drive por errores de escritura de la carpeta sincronizada. La implementación probada corresponde a los archivos entregados.

## Configuración de producción

Repositorio: `investigaciongiad/gastos-en-pareja`. Proyecto Firebase: `gastos-en-pareja-a810c`. Firestore Standard en `northamerica-south1`, plan Spark, proveedor anónimo habilitado y reglas de acceso publicadas. El enlace privado se conserva fuera de Git. La publicación se verifica mediante el flujo de GitHub Actions.

Comprobación adicional en Firebase de producción: creación, lectura, edición, sincronización entre dos sesiones anónimas y eliminación confirmadas. También se verificó el rechazo de enumeración de espacios, enlaces desconocidos y valores negativos. El registro técnico se eliminó al finalizar.

Después del despliegue, repetir el registro y consulta desde los dos celulares reales. Los perfiles de Playwright comprueban motores y dimensiones móviles, pero no equivalen a pruebas en dispositivos físicos.

## Incidencia local de instalación

La instalación inicial dejó una carpeta `node_modules` incompleta en el proyecto de Google Drive. La revisión automática bloqueó su eliminación recursiva. Está excluida de Git y no forma parte del sitio publicado; se puede eliminar manualmente. La copia local utilizada para pruebas tiene sus dependencias completas.

