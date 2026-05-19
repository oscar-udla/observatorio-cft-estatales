// ==========================================================================
// LEAFLET GEOGRAPHIC MAPPING SYSTEM
// ==========================================================================

let mapInstance = null;
let markerLayerGroup = null;

window.renderMap = function(metadata, matriculaData, selectedYear, selectedCft = "todos") {
    console.log("Renderizando mapa de CFT Estatales...");
    
    const yearNum = parseInt(selectedYear);
    const mapElement = document.getElementById("leaflet-map");
    
    if (!mapElement) return;
    
    // 1. Inicializar Mapa si no existe
    if (!mapInstance) {
        // Centrar mapa en el centro geográfico aproximado de Chile continental
        mapInstance = L.map("leaflet-map", {
            center: [-37.5, -72.5],
            zoom: 4,
            minZoom: 3,
            maxZoom: 12,
            zoomControl: true,
            scrollWheelZoom: false
        });
        
        // Agregar capa oscura premium de CartoDB (Dark Matter)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(mapInstance);
        
        markerLayerGroup = L.layerGroup().addTo(mapInstance);
    }
    
    // 2. Limpiar marcadores existentes
    markerLayerGroup.clearLayers();
    
    // 3. Agregar nuevos marcadores
    let selectedCftObj = null;
    
    metadata.forEach(cft => {
        // Obtener datos de matrícula para este CFT y año seleccionado
        const matRecord = matriculaData.find(r => r.cft_id === cft.id && r.anio === yearNum);
        
        if (!matRecord) return; // Si no hay datos para el año, omitir
        
        const enrollment = matRecord.matricula_total;
        const retention = matRecord.retencion_1er_anio;
        
        // Calcular tamaño proporcional
        // Matrículas varían entre 100 y 1500. Raíz cuadrada da mejor escalado visual.
        const radius = Math.sqrt(enrollment) * 1.6;
        
        // Color según retención
        let color = 'hsl(24, 90%, 55%)'; // Naranja/Deserción alta
        if (retention >= 75) {
            color = 'hsl(165, 80%, 42%)'; // Verde esmeralda (Buena retención)
        } else if (retention >= 70) {
            color = 'hsl(255, 75%, 65%)'; // Violeta (Retención media)
        }
        
        // Determinar opacidad según filtro de institución
        const isSelected = selectedCft === "todos" || cft.id === selectedCft;
        const fillOpacity = isSelected ? 0.45 : 0.08;
        const strokeOpacity = isSelected ? 0.85 : 0.15;
        
        if (cft.id === selectedCft) {
            selectedCftObj = cft;
        }
        
        // Crear marcador circular
        const marker = L.circleMarker([cft.lat, cft.lng], {
            radius: Math.max(radius, 8), // mínimo de 8px
            fillColor: color,
            color: isSelected ? color : '#64748b',
            weight: isSelected ? 2.5 : 1.0,
            opacity: strokeOpacity,
            fillOpacity: fillOpacity
        });
        
        // Popup descriptivo
        const popupContent = `
            <div style="font-family: 'Inter', sans-serif; color: #f8fafc; padding: 4px; max-width: 250px;">
                <h4 style="font-family: 'Outfit', sans-serif; margin-bottom: 6px; font-weight: 700; color: #a78bfa; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
                    ${cft.nombre}
                </h4>
                <p style="margin: 3px 0; font-size: 0.85rem;"><strong>Sede Principal:</strong> ${cft.sede_principal}</p>
                <p style="margin: 3px 0; font-size: 0.85rem;"><strong>Sedes Vigentes:</strong> ${cft.sedes ? cft.sedes.join(', ') : cft.sede_principal}</p>
                <p style="margin: 3px 0; font-size: 0.85rem;"><strong>Matrícula ${selectedYear}:</strong> ${enrollment.toLocaleString('es-CL')} alumnos</p>
                <p style="margin: 3px 0; font-size: 0.85rem;"><strong>Retención:</strong> <span style="color: ${color}; font-weight: 600;">${retention}%</span></p>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        
        // Evento al hacer clic en el marcador
        marker.on('click', () => {
            showInstitutionDetails(cft);
        });
        
        markerLayerGroup.addLayer(marker);
    });
    
    // Enfocar el mapa
    if (selectedCft !== "todos" && selectedCftObj) {
        mapInstance.setView([selectedCftObj.lat, selectedCftObj.lng], 8);
        showInstitutionDetails(selectedCftObj);
    }
};
    
function showInstitutionDetails(cft) {
    const placeholder = document.getElementById("map-detail-placeholder");
    const content = document.getElementById("map-detail-content");
    
    if (placeholder && content) {
        placeholder.classList.add("hidden");
        content.classList.remove("hidden");
        
        // Identificación
        document.getElementById("detail-name").textContent = cft.nombre;
        document.getElementById("detail-region").textContent = cft.region;
        document.getElementById("detail-sede").textContent = cft.sede_principal;
        
        // Cargar lista completa de sedes
        const sedesListEl = document.getElementById("detail-sedes-list");
        if (sedesListEl) {
            if (cft.sedes && cft.sedes.length > 0) {
                sedesListEl.innerHTML = cft.sedes.map(s => `<span class="badge-sede" style="display:inline-block; background:rgba(167, 139, 250, 0.15); color:#a78bfa; padding:2px 6px; border-radius:4px; margin:2px; font-size:0.75rem; border:1px solid rgba(167, 139, 250, 0.3);">${s}</span>`).join(' ');
            } else {
                sedesListEl.textContent = cft.sede_principal || "Casa Central";
            }
        }
        
        document.getElementById("detail-rector").textContent = cft.rector || "N/A";
        document.getElementById("detail-fundacion").textContent = cft.año_creacion || "N/A";
        
        const webLink = document.getElementById("detail-web");
        if (cft.web) {
            webLink.href = cft.web;
            webLink.textContent = cft.web.replace('https://', '').replace('http://', '');
            webLink.style.display = 'inline';
        } else {
            webLink.textContent = "N/A";
            webLink.removeAttribute('href');
        }
        
        // Infraestructura y Planta
        document.getElementById("detail-m2").textContent = cft.m2_construidos ? `${cft.m2_construidos.toLocaleString('es-CL')} m²` : "N/A";
        document.getElementById("detail-laboratorios").textContent = cft.laboratorios_talleres !== null ? cft.laboratorios_talleres : "N/A";
        document.getElementById("detail-computadores").textContent = cft.computadores !== null ? cft.computadores : "N/A";
        document.getElementById("detail-docentes").textContent = cft.jce_docentes ? `${cft.jce_docentes} JCE` : "N/A";
        
        if (cft.jce_magister_pct || cft.jce_doctorado_pct) {
            document.getElementById("detail-docentes-posgrado").textContent = `Mag. ${cft.jce_magister_pct}% / Doc. ${cft.jce_doctorado_pct}%`;
        } else {
            document.getElementById("detail-docentes-posgrado").textContent = "0.0% / Sin datos";
        }
        
        // Perfil e Inclusión
        document.getElementById("detail-nem").textContent = cft.nem_promedio ? cft.nem_promedio.toFixed(2) : "N/A";
        document.getElementById("detail-origen-municipal").textContent = cft.origen_municipal_pct !== undefined ? `${cft.origen_municipal_pct}%` : "N/A";
        document.getElementById("detail-origen-subvencionado").textContent = cft.origen_subvencionado_pct !== undefined ? `${cft.origen_subvencionado_pct}%` : "N/A";
        
        const particularPct = (cft.origen_pagado_pct || 0) + (cft.origen_delegada_pct || 0);
        document.getElementById("detail-origen-pagado").textContent = `${particularPct.toFixed(1)}%`;
    }
}

// Función expuesta globalmente para forzar redibujado de Leaflet al cambiar de pestaña
window.triggerMapResize = function() {
    setTimeout(() => {
        if (mapInstance) {
            mapInstance.invalidateSize();
            // Restablecer vista inicial
            mapInstance.setView([-37.5, -72.5], 4);
        }
    }, 150);
};
