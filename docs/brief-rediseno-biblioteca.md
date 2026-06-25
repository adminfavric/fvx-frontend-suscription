# Brief de diseño — Rediseño de la Biblioteca (Área de miembros)

> **Para:** agente/diseñador de UI. **Objetivo:** rediseñar la pantalla
> **"Mi contenido" / Biblioteca** del área de suscriptores para que se vea
> **profesional, cálida y premium**, y soporte **sesiones en vivo con cuenta
> regresiva en tiempo real** e **historial** de sesiones pasadas.
> Este documento es autocontenido: incluye marca, datos reales y estados.

---

## 1. Contexto del producto

Plataforma de **membresías** de **Experiencias Lita Donoso · Alkymia Solar**
(contenido espiritual / sanación / astrología solar). Los suscriptores pagan un
plan (ej. **Oro**, **Premium**, **Básico**) y acceden a una **biblioteca** de
contenido y a **sesiones en vivo por Zoom** embebidas en el sitio.

La pantalla a rediseñar es **`/mi-contenido`** (área privada del miembro). Hoy
funciona pero se ve simple; queremos elevarla a algo **profesional y con identidad**.

---

## 2. Identidad visual (usar esta paleta y tono)

**Colores de marca:**
- Violeta profundo (principal): `#2e1a52`
- Violeta medio: `#5b3a8a` / `#6B4C8C`
- Dorado (acento): `#d9a441`
- Crema (fondo): `#faf6ef`
- Texto oscuro: `#2a2333` · Texto suave: `#6b6478`

**Tipografías (ya cargadas en el sitio):**
- Títulos: **Playfair Display** (serif elegante).
- Texto/UI: **Inter** (sans moderna).
- Iconos: **Material Icons** (Outlined preferido).

**Tono:** cálido, espiritual, premium pero accesible. Nada frío ni corporativo.
Pensar en "membresía exclusiva / club privado", con aire y elegancia.

---

## 3. Qué hay hoy en la pantalla (estructura actual)

1. **Encabezado:** eyebrow "ÁREA DE MIEMBROS", título "Mi contenido", correo del
   miembro, botón "Salir".
2. **Mi suscripción:** tarjeta con nombre del plan, estado (Activa/Cancelada),
   tarjeta de pago (•••• 6623), próximo cobro, botones "Cancelar suscripción" y
   "Ver otras membresías".
3. **Biblioteca:** título + filtros tipo chip (Todo, Zoom en vivo, Video…) + grilla
   de tarjetas de contenido.

Limitaciones actuales: las tarjetas son básicas, las sesiones en vivo no comunican
bien su estado, y no hay separación entre lo "próximo" y lo "ya pasado".

---

## 4. Tipos de contenido (la biblioteca los mezcla)

Cada pieza tiene un **tipo** (`kind`) que define su tarjeta e ícono:

| Tipo | Etiqueta | Ícono sugerido | Acción al hacer clic |
| --- | --- | --- | --- |
| `video` | Video | play_circle | Abre reproductor (modal) |
| `audio` | Audio | graphic_eq | Reproductor de audio (modal) |
| `pdf` | Documento | picture_as_pdf | Abre el PDF |
| `text` | Texto | article | Muestra el texto (modal) |
| `image` | Imagen | image | Muestra la imagen (modal) |
| `zoom` | **Zoom en vivo** | videocam | Entra a la sala en vivo (ver §5) |
| `link` | Enlace | link | Abre el enlace |

Cada tarjeta tiene: portada (imagen propia o degradado por tipo), **badge de tipo**,
título y una descripción corta (2 líneas).

---

## 5. Sesiones en vivo (Zoom) — lo más importante a rediseñar

Una sesión Zoom puede estar en **3 estados** según la hora. El diseño debe
comunicarlos con claridad:

1. **PRÓXIMA (`soon`)** — aún no empieza.
   - Mostrar **cuenta regresiva en TIEMPO REAL** (actualiza cada segundo):
     ej. "Comienza en 2h 15m 30s", y la fecha/hora ("Mié 24-06 · 16:20").
   - **NO clickeable** (no se puede entrar todavía). Debe *verse* deshabilitada
     pero atractiva (no gris triste): un estado "en espera" elegante.
2. **EN VIVO (`live`)** — dentro de la franja (se abre ~15 min antes).
   - Sello **● EN VIVO** (rojo, con pulso). Tarjeta **destacada/clickeable**, con
     llamado a la acción claro ("Entrar a la sala").
3. **FINALIZADA (`ended`)** — ya terminó.
   - Va al **HISTORIAL** (ver §6). No clickeable (salvo que algún día tenga
     grabación, pero hoy no).

**Pedido nuevo del cliente:** que el **timer en tiempo real** sea protagonista en
las próximas citas, que la tarjeta **no sea clickeable** hasta que esté EN VIVO, y
que las finalizadas queden en un **historial** separado.

---

## 6. Historial (nuevo)

Separar la biblioteca en (al menos) dos zonas:
- **Próximas y disponibles:** sesiones en vivo por venir (con timer) + contenido
  on-demand vigente.
- **Historial:** sesiones en vivo ya finalizadas (y, a futuro, sus grabaciones).
  Mostrarlas atenuadas, con la fecha en que ocurrieron.

🟡 Decisión de diseño abierta: ¿el historial es una **pestaña/sección aparte**, un
**acordeón** "Ver historial", o un **filtro**? Proponer la mejor opción.

---

## 7. Datos disponibles por ítem (shape real)

El diseño puede apoyarse en estos campos (vienen del backend):

```ts
{
  id: number,
  title: string,
  kind: 'video'|'audio'|'pdf'|'text'|'image'|'zoom'|'link',
  text: string,            // descripción corta
  image_url: string,       // portada (puede venir vacía)
  created: string,         // fecha de publicación (ISO)
  // Solo para 'zoom':
  live_start: string|null, // inicio de la sesión (ISO)
  live_end: string|null,   // fin (ISO, opcional)
  opens_at: string|null,   // cuándo abre la sala (ISO) → base de la cuenta regresiva
  closes_at: string|null,  // cuándo cierra (ISO)
  live_open: boolean,      // ¿se puede entrar ahora?
  has_zoom: boolean        // ¿tiene reunión configurada?
}
```

Y la **suscripción** del miembro (para la tarjeta "Mi suscripción"):
```ts
{
  plan_name: string,           // "Membresía Oro"
  status: number|null,         // 1 = activa
  cancel_at_period_end: ...,   // si cancelará al final del período
  period_end: string|null,     // hasta cuándo
  next_invoice_date: string|null,
  card: { type: string, last4: string } | null
}
```

---

## 8. Requisitos funcionales y de UX

- **Profesional y con marca** (paleta y tipografías de §2). Que transmita
  "membresía premium".
- **Cuenta regresiva en tiempo real** para sesiones próximas (segundos visibles).
- **Tarjetas no clickeables** cuando la sesión no está disponible (estado claro,
  no solo "apagado").
- **Historial** de sesiones pasadas, visualmente diferenciado.
- **Jerarquía:** lo que está EN VIVO o por empezar pronto debe **saltar** primero.
- **Filtros** por tipo de contenido (chips), manteniéndolos pero más finos.
- **Tarjeta de suscripción** integrada y elegante (no como bloque aparte tosco).
- **Estados vacíos** bonitos ("aún no tienes contenido", "sin sesiones próximas").
- **Mobile-first / responsive:** se ve en celular y desktop.
- **Accesible:** contraste suficiente, foco visible, textos legibles.

---

## 9. Restricciones técnicas (para que la propuesta sea implementable)

- Frontend en **Angular** (componentes standalone) + **Angular Material** + CSS.
- Se usa control reactivo con **signals**; la cuenta regresiva ya se actualiza con
  un reloj cada segundo (existe la lógica de estados `live`/`soon`/`ended`).
- Iconografía **Material Icons**. Evitar librerías pesadas nuevas.
- La grilla actual usa `grid-template-columns: repeat(auto-fill, minmax(230px,1fr))`.
- No cambiar la lógica de acceso (eso lo maneja el backend); el diseño consume los
  datos de §7.

---

## 10. Entregables esperados del diseño

1. **Propuesta visual** de la pantalla "Mi contenido" completa (desktop + mobile).
2. Diseño de la **tarjeta de sesión en vivo** en sus 3 estados (próxima con timer,
   en vivo, finalizada).
3. Diseño de la **tarjeta de contenido** on-demand (video/audio/pdf/etc.).
4. Diseño de la **tarjeta de suscripción**.
5. Tratamiento del **historial** y de los **estados vacíos**.
6. Paleta/tokens y tipografías aplicadas de forma consistente.

---

## 11. Inspiración / dirección (no copiar, orientar)

- Plataformas de membresía premium (estilo "club privado"): tarjetas con aire,
  sombras suaves, esquinas redondeadas generosas.
- Un toque **místico/solar**: degradados violeta→dorado sutiles, detalles dorados.
- Sensación de calma y exclusividad; menos "dashboard", más "espacio sagrado".

> **Frase guía:** *"Que al entrar, el miembro sienta que está en un espacio
> exclusivo y cuidado — no en un panel de administración."*
