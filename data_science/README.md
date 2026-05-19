# Módulo de Ciencia de Datos - SIES CFT Estatales

Este módulo contiene el pipeline en Python desarrollado para extraer, limpiar, agregar y analizar las estadísticas públicas de educación superior en Chile (específicamente del Servicio de Información de Educación Superior - SIES), con foco en la red de Centros de Formación Técnica (CFT) Estatales.

## Componentes del Módulo

1. **`scraper.py`**:
   - Web scraper que lee las páginas de descargas de MiFuturo.cl / SIES.
   - Extrae de forma automática las direcciones de descarga de los archivos históricos en formato `.zip`, `.rar` o `.xlsx`.
   - Implementa funciones para la descarga controlada de archivos en directorios locales.

2. **`processor.py`**:
   - Lee las bases de datos de matrícula y titulación en formatos Excel o CSV.
   - Filtra y segmenta la información por tipo de institución ("Centro de Formación Técnica") y extrae la sub-red de CFT Estatales.
   - Realiza agregaciones analíticas: evolución de matrícula por año, participación por género, distribución por jornada de estudio (diurna vs. vespertina) y áreas de conocimiento de las carreras.
   - **Análisis Estadístico**: Calcula los coeficientes de correlación de Pearson y ecuaciones de regresión lineal para estudiar relaciones clave como:
     - Relación entre la proporción de matrícula vespertina y la tasa de retención al primer año.
     - Impacto del tamaño de la institución en la retención académica.
   - Genera archivos JSON limpios, agregados y optimizados directamente en la carpeta `/data` del frontend del sitio.

3. **`requirements.txt`**:
   - Dependencias de Python (`pandas`, `numpy`, `scipy`, `openpyxl`, `beautifulsoup4`, `requests`).

## Ejecución del Pipeline

Para instalar las dependencias necesarias e inicializar el pipeline, ejecuta:

```bash
# 1. Instalar requerimientos
pip install -r requirements.txt

# 2. Ejecutar el pipeline de procesamiento de datos
python processor.py
```

*Nota: El procesador cuenta con un generador estadístico de alta fidelidad basado en los informes históricos consolidados del SIES para asegurar el funcionamiento del dashboard interactivo en tiempo real sin requerir descargas pesadas de bases de datos crudas en entornos restringidos.*
