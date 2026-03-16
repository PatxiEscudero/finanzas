# Spec Prompt — Command Interface

Activa al agente **ialab-spec** mediante `/ialab-spec <ruta_research.md>`.

---

## ➤ Uso

    /ialab-spec RUTA_DEL_ARCHIVO_RESEARCH

Ejemplo:

    /ialab-spec ./.github/features/20260312-ov-estados/research.md

---

## ➤ Comportamiento

Cuando el mensaje comience con `/ialab-spec`:

1. Este prompt extrae la ruta del archivo proporcionado.  
2. Envía esa ruta al agente **ialab-spec** como **entrada obligatoria**.  
3. El agente deriva la carpeta de feature del directorio padre de esa ruta y genera `spec.md` en la misma carpeta.  

El usuario **debe** indicar el archivo de entrada.
Si no lo hace, el agente buscará la carpeta de feature más reciente con `research.md`.