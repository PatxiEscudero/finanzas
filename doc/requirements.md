Quiero que realices una investigación para poder realizar una aplicación con los siguientes requisitos y funcionalidades:
- La aplicación se realizará con tecnología:
	- Next.js para ser full-stack
	- TailwindCSS para maquetación
	- TypeScript como lenguaje principal
	- Vercel AI SDK para interactuar con LLMs
	- Ollama y modelos libres como Mistral / Qwen2.5:7b
- Debe seguir los mejores estándares de calidad y mejores prácticas

La aplicación consistirá en una aplicación web de finanzas personales en la que:
- Se ingestarán datos de transacciones/movimientos bancarios mediante ficheros CSV / XLSX exportados de plataformas bancarias.
  Estos ficheros se importarán mediante botón de selección de fichero o drag&drop.  
  Como es conocido, cada plataforma bancaria exporta datos de diferente manera:
	- En archivos CSV, pueden tener columnas con información que no es relevante
	- En archivos XLSX, pueden tener columnas con información que no es relevante e incluir imágenes, como el logotipo de la entidad
  Por este motivo, se utilizará el LLM para que sea capaz de identificar la información que sí es relevante y extraerla.
  La información a extraer para cualquier tipo de archivo es:
	- Fecha del movimiento bancario
	- Descripción del movimiento bancario
	- Importe del movimiento bancario
  Quizá sea conveniente obtener la información en formato JSON para gestión posterior.
- Una vez extraída la información se tiene que intentar categorizar cada movimiento bancario según la metodología/regla 50/30/20 de finanzas personales en la que:
	- El 50% de los ingresos corresponde con los gastos fijos/obligatorios (hipoteca, suministros, compra, seguros, etc)
	- El 30% de los ingresos corresponde con los gastos que no son obligatorios (ocio, viajes, etc)
	- El 20% de los ingresos corresponde con el ahorro/inversión
  Para que se pueda realizar la categorización se utilizarán los datos ingestados y mediante llamada al LLM, se categorizarán los movimientos.
  Los datos de entrada serán los extraídos de los ficheros CSV/XLSX y almacenados en JSON.
  Los datos de salida serán almacenados en otro JSON similar al de entrada, pero con dos columnas adicionales en el que se guarde la categorización y subcategorización.
  Ejemplo:
  	Entrada: {"fecha":"01/01/2026", "concepto": "hipoteca", "importe":"1000"}
	Salida: {"fecha":"01/01/2026", "concepto": "hipoteca", "importe":"1000", "categoria":"Necesidades", "sub-categoria": "Hipoteca"}
	Entrada: {"fecha":"01/01/2026", "concepto": "Mercadona", "importe":"200"}
	Salida: {"fecha":"01/01/2026", "concepto": "Mercadona", "importe":"200", "categoria":"Necesidades", "sub-categoria": "Alimentación"}
	Entrada: {"fecha":"01/01/2026", "concepto": "Zara", "importe":"100"}
	Salida: {"fecha":"01/01/2026", "concepto": "Zara", "importe":"100", "categoria":"Deseos", "sub-categoria": "Ropa"}
	Entrada: {"fecha":"01/01/2026", "concepto": "Comida con la familia", "importe":"100"}
	Salida: {"fecha":"01/01/2026", "concepto": "Comida con la familia", "importe":"100", "categoria":"Deseos", "sub-categoria": "Ocio"}
- Una vez categorizada la información, se mostrará en pantalla en un grid/tabla de datos en los que se pueda filtrar y paginar.
  Cada fila de la tabla tendrá un botón para poder eliminar el movimiento o para modificarlo. Se podrá modificar cualquier dato, tanto la fecha, como el concepto, importe, categoría, subcategoría.
  Encima del grid/tabla habrá 3 tarjetas con KPIs acumulando las cantidades de ingresos, gastos, ahorro (ingresos - gastos)
  Importante que los datos ingestados desde los ficheros sean acumulativos, es decir, si arrastramos un fichero, esa información se incorporará a los datos existentes, no debe limpiarse la información y presentar únicamente los datos del fichero importado.
  Más adelante se analizará el almacenamiento persistente de esta información.
