# Plan Prompt — Command Interface

Activa al agente **ialab-plan** mediante `/ialab-plan <ruta_spec.md>`.

---

## ➤ Uso

    /ialab-plan RUTA_DEL_ARCHIVO_SPEC

Ejemplo:

    /ialab-plan ./.github/features/20260312-ov-estados/spec.md

---

## ➤ Comportamiento

1. Extrae la ruta del archivo proporcionado.  
2. Envía esa ruta al agente **ialab-plan**.  
3. El agente deriva la carpeta de feature del directorio padre de esa ruta y genera `plan.md` en la misma carpeta.

El usuario debe indicar el archivo spec.
Si no se proporciona, el agente buscará la carpeta de feature más reciente con `spec.md`.