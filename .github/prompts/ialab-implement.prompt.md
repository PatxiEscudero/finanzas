# Implement Prompt — Command Interface

Activa al agente **ialab-implement** mediante `/ialab-implement <ruta_plan.md>`.

---

## ➤ Uso

    /ialab-implement RUTA_DEL_ARCHIVO_PLAN

Ejemplo:

    /ialab-implement ./.github/features/20260312-ov-estados/plan.md

---

## ➤ Comportamiento

1. Extrae la ruta del archivo de plan indicado.  
2. Envía esa ruta como entrada al agente **ialab-implement**.  
3. El agente deriva la carpeta de feature del directorio padre de esa ruta, actualiza el `plan.md` con el progreso y genera el código correspondiente según su `.agent.md`.

La ruta del plan es obligatoria.