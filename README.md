# XThread — Logseq plugin

Escribe hilos de X (Twitter) dentro de Logseq.

- **1 bloque = 1 tweet** del hilo.
- **Contador flotante** con caracteres restantes en la esquina superior derecha del bloque enfocado. Verde / naranja a partir de 20 restantes / **rojo en negativo** si te pasas.
- **Marcado visual del exceso**: los caracteres que se quedan fuera de los 280 se pintan con fondo rojo translúcido. Nada se borra ni se trunca.
- **Regla real de X**: URLs cuentan 23, CJK y emojis cuentan 2, `\n` (Shift+Enter) cuenta 1.
- **Persistencia**: Logseq guarda cada cambio en el `.md` de la página, sin trabajo extra.

## Instalar

1. Descomprime `xthread.zip` en una carpeta de tu elección.
2. Logseq → ··· → **Settings** → **Advanced** → **Developer mode** → ON
3. Logseq → ··· → **Plugins** → **Load unpacked plugin**
4. Selecciona la carpeta donde descomprimiste `xthread`.
5. Activa el plugin.

> **Necesita internet la primera vez**: el plugin carga `@logseq/libs` desde unpkg (CDN). Si arrancas Logseq sin conexión, el plugin no engancha al editor.

## Uso

Crea una página nueva: cada hilo es una página. Cada bloque (línea) es un tweet del hilo.

- Al enfocar un bloque aparece el contador con los caracteres restantes.
- El número se pone naranja a partir de 20 restantes y rojo en negativo si te pasas.
- Los caracteres por encima de 280 se quedan en el bloque pero pintados con fondo rojo, para que veas exactamente lo que sobra.
- Para el siguiente tweet del hilo, Enter y a escribir en el siguiente bloque.

## Cómo cuenta

Replica el algoritmo de `twitter-text` v3:

- Caracteres en U+0000–U+10FF y algunos rangos de puntuación general = 1 cada uno
- Resto (CJK, emojis…) = 2 cada uno
- URLs (`http(s)://…` o `www.…`) = 23 sin importar la longitud real

## Pendiente

- [ ] Detección de URLs más fiel (TLDs sin protocolo, `t.co`)
- [ ] Indicador circular tipo X en lugar de número
- [ ] Slash command para exportar el hilo numerado al portapapeles
- [ ] Manejar IME composition (chino/japonés) sin trimear a mitad de composición
