// ==========================================================================
// CORE CONTROLLER & STATE MANAGEMENT
// ==========================================================================

const DashboardState = {
    metadata: [],
    matricula: [],
    titulados: [],
    correlacion: [],
    clusteringData: null,
    selectedCft: "todos",
    selectedYear: "2025",
    selectedLevel: "todos"
};
window.DashboardState = DashboardState;

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

async function initApp() {
    console.log("Inicializando aplicación de análisis...");
    
    // 1. Cargar Datos
    const dataLoaded = await loadAllData();
    if (!dataLoaded) {
        console.error("No se pudieron cargar todos los datos.");
        return;
    }
    
    // 2. Inicializar Filtros y Menús
    setupFilters();
    
    // 3. Inicializar Navegación de Pestañas
    setupTabs();
    
    // 4. Inicializar Búsqueda en Tabla
    setupSearch();
    
    // 5. Primera Renderización
    updateDashboard();
    
    // 6. Forzar redibujado inicial del mapa de Leaflet
    if (window.triggerMapResize) {
        window.triggerMapResize();
    }
}

async function loadAllData() {
    try {
        const [metaRes, matRes, titRes, corrRes, clusterRes, rfRes] = await Promise.all([
            fetch('data/cft_estatales.json'),
            fetch('data/matricula_procesada.json'),
            fetch('data/titulados_procesado.json'),
            fetch('data/analisis_correlacion.json'),
            fetch('data/clustering.json'),
            fetch('data/random_forest.json')
        ]);
        
        DashboardState.metadata = await metaRes.json();
        DashboardState.matricula = await matRes.json();
        DashboardState.titulados = await titRes.json();
        DashboardState.correlacion = await corrRes.json();
        DashboardState.clusteringData = await clusterRes.json();
        DashboardState.rfData = await rfRes.json();
        
        // Poblar métricas del modelo RF
        populateRfMetrics(DashboardState.rfData);
        
        return true;
    } catch (error) {
        console.error("Error cargando archivos JSON:", error);
        return false;
    }
}

function setupFilters() {
    const cftFilter = document.getElementById("cft-filter");
    const yearFilter = document.getElementById("year-filter");
    const levelFilter = document.getElementById("level-filter");
    
    // Limpiar opciones anteriores en el select de CFT (excepto la opción "todos")
    cftFilter.innerHTML = '<option value="todos">Todos los CFT Estatales</option>';
    
    // Llenar select con CFTs ordenados por región
    const sortedCfts = [...DashboardState.metadata].sort((a, b) => a.region.localeCompare(b.region));
    sortedCfts.forEach(cft => {
        const option = document.createElement("option");
        option.value = cft.id;
        option.textContent = `${cft.nombre} (${cft.sede_principal})`;
        cftFilter.appendChild(option);
    });
    
    // Event Listeners
    cftFilter.addEventListener("change", (e) => {
        DashboardState.selectedCft = e.target.value;
        updateDashboard();
    });
    
    yearFilter.addEventListener("change", (e) => {
        DashboardState.selectedYear = e.target.value;
        updateDashboard();
    });
    
    if (levelFilter) {
        levelFilter.addEventListener("change", (e) => {
            DashboardState.selectedLevel = e.target.value;
            updateDashboard();
        });
    }
}

function setupTabs() {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    
    // Configurar scroll suave al hacer clic en los botones de navegación
    tabButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const targetTab = btn.getAttribute("data-tab");
            const targetElement = document.getElementById(targetTab);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    });
    
    // Observar las secciones para marcar activa la que esté visible en pantalla
    const observerOptions = {
        root: null,
        rootMargin: "-120px 0px -50% 0px", // Detecta cuando la sección ocupa la parte superior del viewport
        threshold: 0
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute("id");
                tabButtons.forEach(btn => {
                    if (btn.getAttribute("data-tab") === id) {
                        btn.classList.add("active");
                    } else {
                        btn.classList.remove("active");
                    }
                });
            }
        });
    }, observerOptions);
    
    tabContents.forEach(c => {
        observer.observe(c);
        c.classList.add("active"); // Asegurarse de que todas las secciones tengan la clase active para consistencia de clases
    });
}

function setupSearch() {
    const searchInput = document.getElementById("table-search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            filterGraduatesTable(e.target.value);
        });
    }
}

// ==========================================================================
// RENDERIZADO Y ACTUALIZACIONES DE UI
// ==========================================================================

function updateDashboard() {
    console.log("Actualizando dashboard con filtros:", DashboardState.selectedCft, DashboardState.selectedYear, DashboardState.selectedLevel);
    
    // 1. Filtrar por nivel académico (históricos)
    const levelFilteredMat = getLevelFilteredMatricula();
    const levelFilteredTit = getLevelFilteredTitulados();
    
    // 2. Filtrar por año y CFT
    const filteredMat = getFilteredMatricula();
    const filteredTit = getFilteredTitulados();
    
    // 3. Actualizar KPIs
    updateKPIs(filteredMat);
    
    // 4. Renderizar Gráficos (llamada a charts.js)
    if (window.renderCharts) {
        window.renderCharts(
            DashboardState.selectedCft,
            DashboardState.selectedYear,
            levelFilteredMat,
            levelFilteredTit,
            DashboardState.correlacion,
            DashboardState.metadata
        );
    }
    
    // 5. Renderizar Mapa (llamada a map.js)
    if (window.renderMap) {
        window.renderMap(
            DashboardState.metadata,
            levelFilteredMat,
            DashboardState.selectedYear,
            DashboardState.selectedCft
        );
    }
    
    // 6. Actualizar Tabla de Titulados
    renderGraduatesTable(filteredTit);
    
    // 7. Renderizar Pestaña de Clustering
    renderClusteringTab();
    if (window.renderClusteringChart) {
        window.renderClusteringChart(DashboardState.clusteringData, DashboardState.metadata, DashboardState.selectedCft);
    }
    
    // 8. Renderizar Pestaña de Random Forest (resaltado)
    if (window.renderRandomForestCharts) {
        window.renderRandomForestCharts(DashboardState.rfData, DashboardState.selectedCft);
    }
}

function getLevelFilteredMatricula() {
    let filtered = DashboardState.matricula;
    if (DashboardState.selectedLevel !== "todos") {
        filtered = filtered.filter(r => r.nivel === DashboardState.selectedLevel);
    } else {
        filtered = consolidateMatricula(filtered);
    }
    return filtered;
}

function getLevelFilteredTitulados() {
    let filtered = DashboardState.titulados;
    if (DashboardState.selectedLevel !== "todos") {
        filtered = filtered.filter(r => r.nivel === DashboardState.selectedLevel);
    } else {
        filtered = consolidateTitulados(filtered);
    }
    return filtered;
}

function getFilteredMatricula() {
    const yearNum = parseInt(DashboardState.selectedYear);
    const levelFiltered = getLevelFilteredMatricula();
    return levelFiltered.filter(r => {
        const matchesYear = r.anio === yearNum;
        const matchesCft = DashboardState.selectedCft === "todos" || r.cft_id === DashboardState.selectedCft;
        return matchesYear && matchesCft;
    });
}

function getFilteredTitulados() {
    let yearNum = parseInt(DashboardState.selectedYear);
    if (yearNum === 2025) {
        yearNum = 2024;
    }
    const levelFiltered = getLevelFilteredTitulados();
    return levelFiltered.filter(r => {
        const matchesYear = r.anio === yearNum;
        const matchesCft = DashboardState.selectedCft === "todos" || r.cft_id === DashboardState.selectedCft;
        return matchesYear && matchesCft;
    });
}

function consolidateMatricula(records) {
    const grouped = {};
    records.forEach(r => {
        const key = `${r.cft_id}_${r.anio}`;
        if (!grouped[key]) {
            grouped[key] = {
                cft_id: r.cft_id,
                anio: r.anio,
                matricula_total: 0,
                matricula_primer_anio: 0,
                hombres: 0,
                mujeres: 0,
                jornada_diurna: 0,
                jornada_vespertina: 0,
                retencion_1er_anio: 0,
                retencion_weight: 0,
                tasa_desercion: 0,
                matricula_por_area: {
                    "Tecnología": 0,
                    "Administración y Comercio": 0,
                    "Salud": 0,
                    "Educación": 0,
                    "Recursos Naturales": 0
                }
            };
        }
        
        const g = grouped[key];
        g.matricula_total += r.matricula_total;
        g.matricula_primer_anio += r.matricula_primer_anio;
        g.hombres += r.hombres;
        g.mujeres += r.mujeres;
        g.jornada_diurna += r.jornada_diurna;
        g.jornada_vespertina += r.jornada_vespertina;
        
        if (r.matricula_primer_anio > 0) {
            g.retencion_1er_anio += r.retencion_1er_anio * r.matricula_primer_anio;
            g.retencion_weight += r.matricula_primer_anio;
        } else {
            g.retencion_1er_anio += r.retencion_1er_anio;
            g.retencion_weight += 1;
        }
        
        if (r.matricula_por_area) {
            Object.keys(g.matricula_por_area).forEach(area => {
                g.matricula_por_area[area] += (r.matricula_por_area[area] || 0);
            });
        }
    });
    
    return Object.values(grouped).map(g => {
        if (g.retencion_weight > 0) {
            g.retencion_1er_anio = parseFloat((g.retencion_1er_anio / g.retencion_weight).toFixed(1));
        } else {
            g.retencion_1er_anio = 0;
        }
        g.tasa_desercion = parseFloat((100 - g.retencion_1er_anio).toFixed(1));
        delete g.retencion_weight;
        return g;
    });
}

function consolidateTitulados(records) {
    const grouped = {};
    records.forEach(r => {
        const key = `${r.cft_id}_${r.anio}`;
        if (!grouped[key]) {
            grouped[key] = {
                cft_id: r.cft_id,
                anio: r.anio,
                total_titulados: 0,
                hombres: 0,
                mujeres: 0,
                duracion_semestres_promedio: 0,
                empleabilidad_1er_anio: 0,
                ingreso_promedio_1er_anio: 0,
                weight: 0
            };
        }
        
        const g = grouped[key];
        g.total_titulados += r.total_titulados;
        g.hombres += r.hombres;
        g.mujeres += r.mujeres;
        
        if (r.total_titulados > 0) {
            g.duracion_semestres_promedio += r.duracion_semestres_promedio * r.total_titulados;
            g.empleabilidad_1er_anio += r.empleabilidad_1er_anio * r.total_titulados;
            g.ingreso_promedio_1er_anio += r.ingreso_promedio_1er_anio * r.total_titulados;
            g.weight += r.total_titulados;
        } else {
            g.duracion_semestres_promedio += r.duracion_semestres_promedio;
            g.empleabilidad_1er_anio += r.empleabilidad_1er_anio;
            g.ingreso_promedio_1er_anio += r.ingreso_promedio_1er_anio;
            g.weight += 1;
        }
    });
    
    return Object.values(grouped).map(g => {
        if (g.weight > 0) {
            g.duracion_semestres_promedio = parseFloat((g.duracion_semestres_promedio / g.weight).toFixed(2));
            g.empleabilidad_1er_anio = parseFloat((g.empleabilidad_1er_anio / g.weight).toFixed(1));
            g.ingreso_promedio_1er_anio = Math.round(g.ingreso_promedio_1er_anio / g.weight);
        } else {
            g.duracion_semestres_promedio = 0;
            g.empleabilidad_1er_anio = 0;
            g.ingreso_promedio_1er_anio = 0;
        }
        delete g.weight;
        return g;
    });
}

function updateKPIs(filteredMat) {
    if (filteredMat.length === 0) {
        document.getElementById("kpi-total-val").textContent = "N/A";
        document.getElementById("kpi-first-val").textContent = "N/A";
        document.getElementById("kpi-retention-val").textContent = "N/A";
        document.getElementById("kpi-gender-val").textContent = "N/A";
        return;
    }
    
    let totalMat = 0;
    let firstYearMat = 0;
    let weightedRetentionSum = 0;
    let totalWomen = 0;
    
    filteredMat.forEach(r => {
        totalMat += r.matricula_total;
        firstYearMat += r.matricula_primer_anio;
        weightedRetentionSum += (r.retencion_1er_anio * r.matricula_primer_anio);
        totalWomen += r.mujeres;
    });
    
    const avgRetention = firstYearMat > 0 ? (weightedRetentionSum / firstYearMat) : 0;
    const femalePct = totalMat > 0 ? (totalWomen / totalMat * 100) : 0;
    
    document.getElementById("kpi-total-val").textContent = totalMat.toLocaleString('es-CL');
    document.getElementById("kpi-first-val").textContent = firstYearMat.toLocaleString('es-CL');
    document.getElementById("kpi-retention-val").textContent = `${avgRetention.toFixed(1)}%`;
    document.getElementById("kpi-gender-val").textContent = `${femalePct.toFixed(1)}%`;
}

// ==========================================================================
// RENDERIZADO DE TABLAS
// ==========================================================================

function renderGraduatesTable(tituladosData) {
    const tbody = document.getElementById("table-body");
    tbody.innerHTML = "";
    
    if (tituladosData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay datos de titulación disponibles para los filtros seleccionados</td></tr>';
        return;
    }
    
    // Unir con metadatos para obtener el nombre oficial del CFT
    const rowData = tituladosData.map(r => {
        const cftInfo = DashboardState.metadata.find(m => m.id === r.cft_id) || {};
        return {
            ...r,
            cftName: cftInfo.nombre || r.cft_id
        };
    }).sort((a, b) => b.total_titulados - a.total_titulados);
    
    rowData.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${row.cftName}</strong></td>
            <td>${row.total_titulados.toLocaleString('es-CL')}</td>
            <td>${row.duracion_semestres_promedio.toFixed(2)}</td>
            <td>${row.empleabilidad_1er_anio.toFixed(1)}%</td>
            <td>$${row.ingreso_promedio_1er_anio.toLocaleString('es-CL')}</td>
        `;
        tbody.appendChild(tr);
    });
    
    // Guardar los datos en el elemento DOM de la tabla para soportar búsquedas locales
    tbody.dataset.rawData = JSON.stringify(rowData);
}

function filterGraduatesTable(searchQuery) {
    const tbody = document.getElementById("table-body");
    if (!tbody.dataset.rawData) return;
    
    const rowData = JSON.parse(tbody.dataset.rawData);
    tbody.innerHTML = "";
    
    const filtered = rowData.filter(row => 
        row.cftName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No se encontraron resultados</td></tr>';
        return;
    }
    
    filtered.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${row.cftName}</strong></td>
            <td>${row.total_titulados.toLocaleString('es-CL')}</td>
            <td>${row.duracion_semestres_promedio.toFixed(2)}</td>
            <td>${row.empleabilidad_1er_anio.toFixed(1)}%</td>
            <td>$${row.ingreso_promedio_1er_anio.toLocaleString('es-CL')}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderClusteringTab() {
    const container = document.getElementById("clusters-summary-container");
    if (!container || !DashboardState.clusteringData) return;
    
    container.innerHTML = "";
    
    const data = DashboardState.clusteringData;
    
    data.clusters.forEach(cluster => {
        // Encontrar nombres legibles para los miembros del cluster
        const membersHtml = cluster.members.map(memberId => {
            const meta = DashboardState.metadata.find(m => m.id === memberId) || {};
            const cftName = meta.nombre_corto || meta.nombre || memberId;
            return `<span class="cluster-member-pill" style="--cluster-color: ${cluster.color_hex}; --cluster-color-alpha: ${cluster.color_hex}15">${cftName}</span>`;
        }).join("");
        
        const card = document.createElement("div");
        card.className = "cluster-profile-card";
        card.style.setProperty("--cluster-color", cluster.color_hex);
        
        card.innerHTML = `
            <div class="cluster-header">
                <span class="cluster-badge">Cluster ${cluster.id}</span>
                <h4 class="cluster-title">${cluster.name}</h4>
            </div>
            <p class="cluster-desc">${cluster.description}</p>
            
            <div class="cluster-stats">
                <div class="cluster-stat-item">
                    <span class="cluster-stat-val">${cluster.avg_matricula.toLocaleString('es-CL')}</span>
                    <span class="cluster-stat-lbl">Matrícula Promedio</span>
                </div>
                <div class="cluster-stat-item">
                    <span class="cluster-stat-val">${cluster.avg_retencion.toFixed(1)}%</span>
                    <span class="cluster-stat-lbl">Retención Promedio</span>
                </div>
                <div class="cluster-stat-item">
                    <span class="cluster-stat-val">${cluster.avg_municipal.toFixed(1)}%</span>
                    <span class="cluster-stat-lbl">Origen Municipal</span>
                </div>
                <div class="cluster-stat-item">
                    <span class="cluster-stat-val">${cluster.avg_nem.toFixed(2)}</span>
                    <span class="cluster-stat-lbl">NEM Promedio</span>
                </div>
            </div>
            
            <div class="cluster-members-section">
                <span class="cluster-members-title">Centros en este Cluster (${cluster.members_count}):</span>
                <div class="cluster-members-list">
                    ${membersHtml}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function populateRfMetrics(rfData) {
    if (!rfData) return;
    const r2El = document.getElementById("kpi-rf-r2-val");
    const maeEl = document.getElementById("kpi-rf-mae-val");
    const nEl = document.getElementById("kpi-rf-n-val");
    
    if (r2El) r2El.textContent = (rfData.r2_score * 100).toFixed(1) + "%";
    if (maeEl) maeEl.textContent = rfData.mae.toFixed(1) + " alumnos";
    if (nEl) nEl.textContent = rfData.num_records;
}
