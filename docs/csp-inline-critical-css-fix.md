# CSP + Angular: estilos rotos en producción por `inlineCritical` (`onload` bloqueado)

> Guía reutilizable. Si un proyecto Angular con CSP estricta **funciona en local
> (`ng serve`) pero rompe estilos en producción** (`ng build` + deploy), casi
> seguro es esto. Aplica a cualquier app Angular detrás de una CSP sin
> `'unsafe-inline'` en `script-src`.

---

## TL;DR (el fix)

En `angular.json`, dentro de `configurations.production`, desactiva el inline
critical CSS:

```jsonc
"optimization": {
  "scripts": true,
  "styles": {
    "minify": true,
    "inlineCritical": false   // <-- la clave
  },
  "fonts": true
}
```

Reconstruir (`ng build --configuration production`) y redeployar. Listo.

---

## Qué es la CSP (Content Security Policy)

Lista blanca de seguridad que el navegador aplica a una página: define de dónde
se puede **cargar y ejecutar** cada tipo de recurso (scripts, estilos, imágenes,
fuentes, iframes, conexiones). Su fin principal es mitigar **XSS**: si alguien
inyecta código, la CSP impide que se ejecute si no estaba autorizado.

Se entrega como **header HTTP** (`Content-Security-Policy`) o como
**`<meta http-equiv="Content-Security-Policy">`** en el HTML.

Directivas relevantes aquí:

| Directiva | Qué controla |
|---|---|
| `script-src` | Qué scripts pueden ejecutarse. `'self'` = solo del mismo origen, **sin inline**. |
| `style-src`  | Qué estilos se aplican. `'unsafe-inline'` permite estilos inline (Angular Material los necesita). |

### Scripts "inline" y por qué los hashes no siempre sirven

`script-src` sin `'unsafe-inline'` bloquea **dos** cosas:

1. `<script>...código...</script>` inline.
2. **Inline event handlers**: atributos `onclick=`, `onload=`, `onerror=`, etc.

Un `<script>` inline se puede autorizar con un **hash** (`sha256-...`) o un
**nonce** (`nonce-...`). Pero esos mecanismos **NO aplican a los `onXXX=`**. Para
event handlers inline solo sirve `'unsafe-inline'` (abre todo, inseguro) o
`'unsafe-hashes'` + el hash exacto. Por eso el error del navegador dice:

> *Note that hashes do not apply to event handlers, style attributes and
> javascript: navigations unless the 'unsafe-hashes' keyword is present.*

---

## El problema concreto

Angular, en el **build de producción**, activa por defecto la optimización
**inline critical CSS**. Para no bloquear el render, inyecta el stylesheet
principal así:

```html
<link rel="stylesheet" href="styles-XXXX.css" media="print" onload="this.media='all'">
```

La idea: cargar el CSS como `media="print"` (no bloqueante) y, cuando termina de
cargar, el `onload` lo cambia a `media="all"` para que aplique a la pantalla.

**El choque con la CSP:** ese `onload="this.media='all'"` es un *inline event
handler* (un script). Con `script-src 'self'` (sin `'unsafe-inline'`), el
navegador **bloquea el `onload`** → el stylesheet **se queda en `media="print"`**
→ **nunca se aplica a la pantalla**.

### Por qué solo pasa en producción

`inlineCritical` solo corre en el **build optimizado** (`ng build`). En
`ng serve` (dev) el `<link>` es normal, sin `onload`. Por eso local se ve bien y
producción no.

---

## Síntomas (cómo reconocerlo)

- En consola, repetido al cargar:
  > Executing inline event handler violates the following Content Security
  > Policy directive 'script-src 'self' ...'. ... The action has been blocked.
- **Estilos globales que no cargan** en producción (la app se ve "sin diseño").
- **Overlays/diálogos/popups** (Angular Material CDK) sin estilar o mal
  posicionados — usan ese mismo stylesheet global.
- Funciona perfecto en `ng serve` local.

### Confirmación rápida

```bash
# En el HTML servido en producción, busca el onload en el <link>:
curl -s https://TU-DOMINIO/ | grep -oE '<link[^>]*stylesheet[^>]*>'
# Si ves  media="print" onload="this.media='all'"  → es esto.
```

---

## El fix (detallado)

En `angular.json`, configuración `production`:

```jsonc
"configurations": {
  "production": {
    "outputHashing": "all",
    "optimization": {
      "scripts": true,
      "styles": {
        "minify": true,         // sigue minificando el CSS
        "inlineCritical": false // NO inyecta el <link onload>
      },
      "fonts": true             // sigue inlineando CSS de fuentes
    }
  }
}
```

Con esto el build emite un `<link rel="stylesheet" href="styles-XXXX.css">`
limpio, sin handler inline. Se mantienen el resto de optimizaciones (minify,
hashing, tree-shaking).

> Nota: poner `"optimization": false` también lo arregla, pero **desactiva TODA
> la optimización** (no minifica, bundles enormes). Usa el objeto granular.

### Verificar

```bash
ng build --configuration production
grep -oE '<link[^>]*stylesheet[^>]*>' dist/<tu-app>/browser/index.html
# Esperado:  <link rel="stylesheet" href="styles-XXXX.css">   (SIN onload)
```

---

## Alternativas (y por qué no se eligieron)

| Opción | Veredicto |
|---|---|
| `inlineCritical: false` | ✅ **Elegida.** Quita el handler en origen, mantiene seguridad y optimización. |
| Añadir `'unsafe-inline'` a `script-src` | ❌ Debilita la CSP para toda la app (justo lo que protege contra XSS). |
| Añadir `'unsafe-hashes'` + hash del handler | ❌ Frágil; el handler es de Angular y autorizar event handlers inline sigue siendo mala práctica. |
| Emitir la CSP por header con nonce | ➖ Más robusto a futuro, pero no resuelve este `onload` (los nonces no aplican a event handlers). |

---

## Checklist para replicar en otros proyectos

1. ¿El proyecto tiene CSP con `script-src` **sin** `'unsafe-inline'`?
   (revisar `<meta>` en `index.html` o header del server/CDN).
2. ¿Estilos rotos **solo** en producción?
3. `curl` a la home → ¿el `<link>` trae `media="print" onload=...`?
4. Aplicar `optimization.styles.inlineCritical: false` en `angular.json`
   (config `production`).
5. Rebuild + verificar el `index.html` generado.
6. Redeploy (el bundle viejo se sigue sirviendo hasta entonces).

---

## Bonus: CSP y librerías de terceros

Si usas SDKs externos (Google Identity, Apple, Microsoft MSAL, Mapbox, YouTube,
etc.), recuerda listarlos en las directivas correspondientes:

- `script-src` / `script-src-elem`: dominios de los SDK JS.
- `connect-src`: endpoints que llaman por fetch/XHR/WebSocket.
- `frame-src`: si embeben iframes (login popups, videos, mapas).
- `img-src` / `font-src` / `style-src`: assets que cargan.

Mantener la CSP estricta (sin `'unsafe-inline'` en scripts) y resolver los
conflictos en origen — como este caso — es la práctica correcta.
