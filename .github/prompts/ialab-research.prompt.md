# Research Prompt — Command Interface

Este prompt actúa como la interfaz de lanzamiento para activar al agente **ialab-research** mediante el comando `/ialab-research`.

---

## ➤ Uso
Escribe:

    /ialab-research TU_DESCRIPCIÓN_DEL_TEMA

El texto después del comando se tomará como el **topic inicial de investigación**.

---

## ➤ Comportamiento esperado

Cuando el mensaje comience con `/ialab-research`:

1. Este prompt extraerá el topic.  
2. Enviará el topic al agente **ialab-research**.  
3. El agente creará la carpeta `./.github/features/YYYYMMDD-{slug}/` y guardará `research.md` dentro con el análisis completo según sus reglas internas.

Esa ruta completa (`research.md` dentro de la carpeta de feature) será la **entrada oficial de la fase Spec**.

---

## ➤ Ejemplos
 - /ialab-research investigar qué hay que hacer para añadir una nueva pantalla de Estados de Fabricación
 - /ialab-research analizar cómo gestionamos validaciones de negocio en SGS
