// ==========================================================================
// CHART.JS VISUALIZATION ENGINE
// ==========================================================================

const chartInstances = {};

// Colores del sistema de diseño para los gráficos
const CHART_COLORS = {
    primary: 'rgba(103, 58, 183, 0.85)',
    primarySolid: 'rgb(103, 58, 183)',
    secondary: 'rgba(0, 229, 153, 0.85)',
    secondarySolid: 'rgb(0, 229, 153)',
    orange: 'rgba(255, 107, 0, 0.85)',
    orangeSolid: 'rgb(255, 107, 0)',
    gridColor: 'rgba(255, 255, 255, 0.08)',
    textColor: '#e2e8f0',
    mutedText: '#94a3b8',
    transparent: 'rgba(0, 0, 0, 0)',
    palette: [
        'rgba(103, 58, 183, 0.85)',
        'rgba(0, 229, 153, 0.85)',
        'rgba(255, 107, 0, 0.85)',
        'rgba(0, 172, 237, 0.85)',
        'rgba(240, 98, 146, 0.85)'
    ]
};

// Configuración base de fuentes y cuadrículas
const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: {
                color: CHART_COLORS.textColor,
                font: { family: 'Inter', size: 11 }
            }
        }
    },
    scales: {
        x: {
            grid: { color: CHART_COLORS.gridColor },
            ticks: { color: CHART_COLORS.mutedText, font: { family: 'Inter', size: 10 } }
        },
        y: {
            grid: { color: CHART_COLORS.gridColor },
            ticks: { color: CHART_COLORS.mutedText, font: { family: 'Inter', size: 10 } }
        }
    }
};

window.renderCharts = function(selectedCft, selectedYear, matriculaRaw, tituladosRaw, correlacionRaw, metadataRaw) {
    console.log("Renderizando gráficos...");
    
    const yearNum = parseInt(selectedYear);
    
    // --- PREPARAR DATOS DE MATRÍCULA ---
    let matHistory = [];
    let matSelectedYear = [];
    
    if (selectedCft === "todos") {
        // Matrícula por año agregada (2020-2025)
        const years = [2020, 2021, 2022, 2023, 2024, 2025];
        matHistory = years.map(y => {
            const records = matriculaRaw.filter(r => r.anio === y);
            const total = records.reduce((sum, r) => sum + r.matricula_total, 0);
            const primer = records.reduce((sum, r) => sum + r.matricula_primer_anio, 0);
            return { anio: y, matricula_total: total, matricula_primer_anio: primer };
        });
        
        // Matrícula por CFT para el año seleccionado (para gráfico regional)
        matSelectedYear = matriculaRaw.filter(r => r.anio === yearNum);
    } else {
        // Historial del CFT seleccionado
        matHistory = matriculaRaw.filter(r => r.cft_id === selectedCft).sort((a, b) => a.anio - b.anio);
        matSelectedYear = matriculaRaw.filter(r => r.cft_id === selectedCft && r.anio === yearNum);
    }
    
    // --- PREPARAR DATOS DE TITULADOS ---
    let titHistory = [];
    let titSelectedYear = [];
    
    if (selectedCft === "todos") {
        const years = [2020, 2021, 2022, 2023, 2024];
        titHistory = years.map(y => {
            const records = tituladosRaw.filter(r => r.anio === y);
            const total = records.reduce((sum, r) => sum + r.total_titulados, 0);
            const empWeight = records.reduce((sum, r) => sum + (r.empleabilidad_1er_anio * r.total_titulados), 0);
            const empAvg = total > 0 ? (empWeight / total) : 0;
            const ingWeight = records.reduce((sum, r) => sum + (r.ingreso_promedio_1er_anio * r.total_titulados), 0);
            const ingAvg = total > 0 ? (ingWeight / total) : 0;
            
            return { 
                anio: y, 
                total_titulados: total, 
                empleabilidad_1er_anio: empAvg,
                ingreso_promedio_1er_anio: ingAvg
            };
        });
        
        titSelectedYear = tituladosRaw.filter(r => r.anio === yearNum);
    } else {
        titHistory = tituladosRaw.filter(r => r.cft_id === selectedCft).sort((a, b) => a.anio - b.anio);
        titSelectedYear = tituladosRaw.filter(r => r.cft_id === selectedCft && r.anio === yearNum);
    }
    
    // ==========================================================================
    // 1. GRÁFICO: EVOLUCIÓN DE MATRÍCULA
    // ==========================================================================
    renderEnrollmentEvolution(matHistory);
    
    // ==========================================================================
    // 2. GRÁFICO: MATRÍCULA POR REGIÓN / INSTITUCIÓN
    // ==========================================================================
    renderEnrollmentRegion(matSelectedYear, metadataRaw, selectedCft);
    
    // ==========================================================================
    // 3. GRÁFICO: JORNADAS
    // ==========================================================================
    renderScheduleDistribution(matSelectedYear);
    
    // ==========================================================================
    // 4. GRÁFICO: ÁREAS DE CONOCIMIENTO
    // ==========================================================================
    renderAreaDistribution(matSelectedYear);
    
    // ==========================================================================
    // 5. GRÁFICO: EVOLUCIÓN DE TITULADOS
    // ==========================================================================
    renderGraduatesEvolution(titHistory);
    
    // ==========================================================================
    // 6. GRÁFICO: EMPLEABILIDAD E INGRESOS
    // ==========================================================================
    renderEmployability(titHistory);
    
    // ==========================================================================
    // 7. GRÁFICOS CIENTÍFICOS: SCATTER PLOTS (CORRELACIONES)
    // ==========================================================================
    renderCorrelationScatters(correlacionRaw, metadataRaw);
};

// ==========================================================================
// FUNCIONES AUXILIARES DE RENDERIZADO
// ==========================================================================

function destroyChart(chartId) {
    if (chartInstances[chartId]) {
        chartInstances[chartId].destroy();
        delete chartInstances[chartId];
    }
}

function renderEnrollmentEvolution(history) {
    const chartId = "enrollmentEvolutionChart";
    destroyChart(chartId);
    
    const ctx = document.getElementById(chartId).getContext("2d");
    
    const labels = history.map(h => h.anio);
    const totalMat = history.map(h => h.matricula_total);
    const primerMat = history.map(h => h.matricula_primer_anio);
    
    chartInstances[chartId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Matrícula Total',
                    data: totalMat,
                    borderColor: CHART_COLORS.secondarySolid,
                    backgroundColor: 'rgba(0, 229, 153, 0.05)',
                    tension: 0.25,
                    fill: true,
                    borderWidth: 3
                },
                {
                    label: 'Matrícula Primer Año',
                    data: primerMat,
                    borderColor: CHART_COLORS.primarySolid,
                    backgroundColor: CHART_COLORS.transparent,
                    tension: 0.25,
                    borderWidth: 2,
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            ...baseOptions,
            plugins: {
                ...baseOptions.plugins,
                tooltip: { mode: 'index', intersect: false }
            }
        }
    });
}

function renderEnrollmentRegion(data, metadata, selectedCft) {
    const chartId = "enrollmentRegionChart";
    destroyChart(chartId);
    
    const ctx = document.getElementById(chartId).getContext("2d");
    
    let labels = [];
    let values = [];
    let labelTitle = "";
    
    if (selectedCft === "todos") {
        // Agrupar por región
        const regionSum = {};
        data.forEach(r => {
            const meta = metadata.find(m => m.id === r.cft_id) || {};
            const region = meta.region || "Sin Región";
            regionSum[region] = (regionSum[region] || 0) + r.matricula_total;
        });
        
        // Ordenar de mayor a menor
        const sorted = Object.entries(regionSum).sort((a, b) => b[1] - a[1]);
        labels = sorted.map(s => s[0]);
        values = sorted.map(s => s[1]);
        labelTitle = "Matrícula por Región";
    } else {
        // Si hay uno solo, mostrar distribución por género
        labels = ["Hombres", "Mujeres"];
        const record = data[0] || { hombres: 0, mujeres: 0 };
        values = [record.hombres, record.mujeres];
        labelTitle = "Matrícula por Género";
    }
    
    chartInstances[chartId] = new Chart(ctx, {
        type: selectedCft === "todos" ? 'bar' : 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: labelTitle,
                data: values,
                backgroundColor: selectedCft === "todos" ? CHART_COLORS.primary : [CHART_COLORS.palette[3], CHART_COLORS.palette[4]],
                borderColor: selectedCft === "todos" ? CHART_COLORS.primarySolid : CHART_COLORS.transparent,
                borderWidth: 1
            }]
        },
        options: selectedCft === "todos" ? {
            ...baseOptions,
            indexAxis: 'y',
            plugins: { legend: { display: false } }
        } : {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: CHART_COLORS.textColor } }
            }
        }
    });
}

function renderScheduleDistribution(data) {
    const chartId = "scheduleChart";
    destroyChart(chartId);
    
    const ctx = document.getElementById(chartId).getContext("2d");
    
    let diurna = 0;
    let vespertina = 0;
    
    data.forEach(r => {
        diurna += r.jornada_diurna;
        vespertina += r.jornada_vespertina;
    });
    
    chartInstances[chartId] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ["Diurna", "Vespertina"],
            datasets: [{
                data: [diurna, vespertina],
                backgroundColor: [CHART_COLORS.palette[1], CHART_COLORS.palette[2]],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: CHART_COLORS.textColor } }
            }
        }
    });
}

function renderAreaDistribution(data) {
    const chartId = "areaDistributionChart";
    destroyChart(chartId);
    
    const ctx = document.getElementById(chartId).getContext("2d");
    
    const areas = ["Tecnología", "Administración y Comercio", "Salud", "Educación", "Recursos Naturales"];
    const areaSums = { "Tecnología": 0, "Administración y Comercio": 0, "Salud": 0, "Educación": 0, "Recursos Naturales": 0 };
    
    data.forEach(r => {
        areas.forEach(a => {
            areaSums[a] += (r.matricula_por_area[a] || 0);
        });
    });
    
    chartInstances[chartId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: areas,
            datasets: [{
                label: 'Estudiantes',
                data: areas.map(a => areaSums[a]),
                backgroundColor: CHART_COLORS.palette,
                borderWidth: 0
            }]
        },
        options: {
            ...baseOptions,
            plugins: { legend: { display: false } }
        }
    });
}

function renderGraduatesEvolution(history) {
    const chartId = "graduatesEvolutionChart";
    destroyChart(chartId);
    
    const ctx = document.getElementById(chartId).getContext("2d");
    
    const labels = history.map(h => h.anio);
    const totalTitulados = history.map(h => h.total_titulados);
    
    chartInstances[chartId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Titulados',
                    data: totalTitulados,
                    backgroundColor: CHART_COLORS.primary,
                    borderColor: CHART_COLORS.primarySolid,
                    borderWidth: 1
                }
            ]
        },
        options: baseOptions
    });
}

function renderEmployability(history) {
    const chartId = "employabilityChart";
    destroyChart(chartId);
    
    const ctx = document.getElementById(chartId).getContext("2d");
    
    const labels = history.map(h => h.anio);
    const emp = history.map(h => h.empleabilidad_1er_anio);
    const ing = history.map(h => h.ingreso_promedio_1er_anio / 1000); // en miles de pesos
    
    chartInstances[chartId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Empleabilidad 1er Año (%)',
                    data: emp,
                    borderColor: CHART_COLORS.secondarySolid,
                    backgroundColor: CHART_COLORS.transparent,
                    yAxisID: 'y-emp',
                    tension: 0.2,
                    borderWidth: 3
                },
                {
                    label: 'Ingreso Promedio ($ miles)',
                    data: ing,
                    borderColor: CHART_COLORS.orangeSolid,
                    backgroundColor: CHART_COLORS.transparent,
                    yAxisID: 'y-ing',
                    tension: 0.2,
                    borderWidth: 3
                }
            ]
        },
        options: {
            ...baseOptions,
            scales: {
                x: baseOptions.scales.x,
                'y-emp': {
                    type: 'linear',
                    position: 'left',
                    grid: { color: CHART_COLORS.gridColor },
                    ticks: { color: CHART_COLORS.mutedText, callback: (v) => `${v}%` }
                },
                'y-ing': {
                    type: 'linear',
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: CHART_COLORS.mutedText, callback: (v) => `$${v}k` }
                }
            }
        }
    });
}

function renderCorrelationScatters(correlacion, metadata) {
    const scatter1Id = "scatterVespRetChart";
    const scatter2Id = "scatterSizeRetChart";
    
    destroyChart(scatter1Id);
    destroyChart(scatter2Id);
    
    const ctx1 = document.getElementById(scatter1Id).getContext("2d");
    const ctx2 = document.getElementById(scatter2Id).getContext("2d");
    
    const dataVesp = correlacion.graficos.vespertina_vs_retencion;
    const dataSize = correlacion.graficos.size_vs_retencion;
    
    // Mapear nombres de las etiquetas cortas a oficiales para el tooltip
    const getOfficialName = (lbl) => {
        const info = metadata.find(m => m.id === lbl);
        return info ? info.nombre : lbl;
    };
    
    // --- 1. VESPERTINA VS RETENCION ---
    const vespPoints = dataVesp.puntos.map(p => ({ x: p.x, y: p.y, label: getOfficialName(p.label) }));
    const vespLine = dataVesp.linea_regresion;
    
    document.getElementById("eq-vesp-ret").textContent = dataVesp.ecuacion;
    document.getElementById("r-vesp-ret").textContent = correlacion.coeficientes.vespertina_vs_retencion;
    
    chartInstances[scatter1Id] = new Chart(ctx1, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'CFT Estatales (2024)',
                    data: vespPoints,
                    backgroundColor: CHART_COLORS.secondarySolid,
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: 'Ajuste Lineal',
                    data: vespLine,
                    type: 'line',
                    borderColor: CHART_COLORS.orangeSolid,
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0,
                    showLine: true
                }
            ]
        },
        options: {
            ...baseOptions,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            if (ctx.dataset.type === 'line') return 'Línea de Tendencia';
                            const pt = ctx.raw;
                            return `${pt.label}: Vespertina ${pt.x.toFixed(1)}%, Retención ${pt.y.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: '% Estudiantes Vespertinos', color: CHART_COLORS.textColor },
                    grid: { color: CHART_COLORS.gridColor },
                    ticks: { color: CHART_COLORS.mutedText }
                },
                y: {
                    title: { display: true, text: 'Tasa de Retención (1er año)', color: CHART_COLORS.textColor },
                    grid: { color: CHART_COLORS.gridColor },
                    ticks: { color: CHART_COLORS.mutedText }
                }
            }
        }
    });
    
    // --- 2. TAMAÑO VS RETENCION ---
    const sizePoints = dataSize.puntos.map(p => ({ x: p.x, y: p.y, label: getOfficialName(p.label) }));
    const sizeLine = dataSize.linea_regresion;
    
    document.getElementById("eq-size-ret").textContent = dataSize.ecuacion;
    document.getElementById("r-size-ret").textContent = correlacion.coeficientes.matricula_total_vs_retencion;
    
    chartInstances[scatter2Id] = new Chart(ctx2, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'CFT Estatales (2024)',
                    data: sizePoints,
                    backgroundColor: CHART_COLORS.primarySolid,
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: 'Ajuste Lineal',
                    data: sizeLine,
                    type: 'line',
                    borderColor: CHART_COLORS.orangeSolid,
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0,
                    showLine: true
                }
            ]
        },
        options: {
            ...baseOptions,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            if (ctx.dataset.type === 'line') return 'Línea de Tendencia';
                            const pt = ctx.raw;
                            return `${pt.label}: Matrícula ${pt.x} alumnos, Retención ${pt.y.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Matrícula Total', color: CHART_COLORS.textColor },
                    grid: { color: CHART_COLORS.gridColor },
                    ticks: { color: CHART_COLORS.mutedText }
                },
                y: {
                    title: { display: true, text: 'Tasa de Retención (1er año)', color: CHART_COLORS.textColor },
                    grid: { color: CHART_COLORS.gridColor },
                    ticks: { color: CHART_COLORS.mutedText }
                }
            }
        }
    });
};

window.renderClusteringChart = function(clusteringData, metadata, selectedCft = "todos") {
    const chartId = "clusteringChart";
    const canvas = document.getElementById(chartId);
    if (!canvas || !clusteringData) return;
    
    destroyChart(chartId);
    
    const ctx = canvas.getContext("2d");
    
    // Generar datasets por cada cluster
    const datasets = clusteringData.clusters.map(cluster => {
        const clusterPoints = [];
        Object.entries(clusteringData.cft_assignments).forEach(([cftId, assignment]) => {
            if (assignment.cluster_id === cluster.id) {
                const meta = metadata.find(m => m.id === cftId) || {};
                const name = meta.nombre_corto || meta.nombre || cftId;
                clusterPoints.push({
                    x: assignment.matricula,
                    y: assignment.retencion,
                    label: name,
                    cftId: cftId,
                    municipal: assignment.municipal_pct,
                    nem: assignment.nem
                });
            }
        });
        
        return {
            label: cluster.name,
            data: clusterPoints,
            backgroundColor: (ctx) => {
                const pt = ctx.raw;
                if (pt && pt.cftId === selectedCft) return '#a78bfa';
                return cluster.color_hex + 'cc'; // 80% opacity
            },
            borderColor: (ctx) => {
                const pt = ctx.raw;
                if (pt && pt.cftId === selectedCft) return '#ffffff';
                return cluster.color_hex;
            },
            borderWidth: (ctx) => {
                const pt = ctx.raw;
                if (pt && pt.cftId === selectedCft) return 3;
                return 1.5;
            },
            pointRadius: (ctx) => {
                const pt = ctx.raw;
                if (pt && pt.cftId === selectedCft) return 15;
                return 8;
            },
            pointHoverRadius: (ctx) => {
                const pt = ctx.raw;
                if (pt && pt.cftId === selectedCft) return 17;
                return 10;
            },
            pointStyle: (ctx) => {
                const pt = ctx.raw;
                if (pt && pt.cftId === selectedCft) return 'rectRot';
                return 'circle';
            }
        };
    });
    
    chartInstances[chartId] = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: CHART_COLORS.textColor,
                        font: { family: 'Inter', size: 11, weight: '500' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const pt = ctx.raw;
                            return [
                                `🏢 ${pt.label}`,
                                `📊 Matrícula: ${pt.x.toLocaleString('es-CL')} estudiantes`,
                                `📈 Retención: ${pt.y.toFixed(1)}%`,
                                `🏫 Procedencia Municipal: ${pt.municipal.toFixed(1)}%`,
                                `📝 NEM Promedio: ${pt.nem.toFixed(2)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Matrícula Total 2025', color: CHART_COLORS.textColor, font: { family: 'Inter', size: 12, weight: 'bold' } },
                    grid: { color: CHART_COLORS.gridColor },
                    ticks: { color: CHART_COLORS.mutedText }
                },
                y: {
                    title: { display: true, text: 'Tasa de Retención (%)', color: CHART_COLORS.textColor, font: { family: 'Inter', size: 12, weight: 'bold' } },
                    grid: { color: CHART_COLORS.gridColor },
                    ticks: { color: CHART_COLORS.mutedText },
                    min: 50,
                    max: 95
                }
            }
        }
    });
};

window.renderRandomForestCharts = function(rfData, selectedCft = "todos") {
    if (!rfData) return;
    
    // 1. Chart de Importancia de Variables (Horizontal Bar Chart)
    const importanceId = "rfImportanceChart";
    const importanceCanvas = document.getElementById(importanceId);
    if (importanceCanvas) {
        destroyChart(importanceId);
        const ctx = importanceCanvas.getContext("2d");
        
        // Ordenar variables por importancia de mayor a menor
        const featuresWithImp = rfData.features.map((feat, idx) => ({
            name: feat,
            importance: rfData.importances[idx]
        })).sort((a, b) => b.importance - a.importance);
        
        const labels = featuresWithImp.map(item => item.name);
        const data = featuresWithImp.map(item => item.importance * 100); // mostrar como porcentaje %
        
        chartInstances[importanceId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Importancia relativa (%)',
                    data: data,
                    backgroundColor: 'rgba(103, 58, 183, 0.75)',
                    borderColor: 'rgb(103, 58, 183)',
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `Importancia: ${ctx.parsed.x.toFixed(1)}%`
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Importancia (%)', color: CHART_COLORS.textColor },
                        grid: { color: CHART_COLORS.gridColor },
                        ticks: { color: CHART_COLORS.mutedText },
                        max: Math.ceil(Math.max(...data) / 5) * 5 + 5
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: CHART_COLORS.textColor, font: { weight: 'bold' } }
                    }
                }
            }
        });
    }
    
    // 2. Chart de Regresión (Real vs Predicho Scatter Plot)
    const regressionId = "rfRegressionChart";
    const regressionCanvas = document.getElementById(regressionId);
    if (regressionCanvas) {
        destroyChart(regressionId);
        const ctx = regressionCanvas.getContext("2d");
        
        // Puntos de predicción
        const points = rfData.predictions.map(pred => ({
            x: pred.actual,
            y: pred.predicted,
            label: pred.label,
            cftId: pred.cft_id
        }));
        
        // Encontrar max para trazar la línea de identidad y=x
        const maxVal = Math.max(...points.map(p => Math.max(p.x, p.y))) * 1.05;
        const identityLine = [
            { x: 0, y: 0 },
            { x: maxVal, y: maxVal }
        ];
        
        chartInstances[regressionId] = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Línea de Identidad (y = x)',
                        data: identityLine,
                        type: 'line',
                        borderColor: 'rgba(255, 255, 255, 0.4)',
                        borderWidth: 1.5,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'Programas de Estudio',
                        data: points,
                        backgroundColor: (ctx) => {
                            const pt = ctx.raw;
                            if (pt && pt.cftId === selectedCft) return 'rgba(167, 139, 250, 0.95)';
                            return 'rgba(0, 229, 153, 0.6)';
                        },
                        borderColor: (ctx) => {
                            const pt = ctx.raw;
                            if (pt && pt.cftId === selectedCft) return '#ffffff';
                            return 'rgb(0, 229, 153)';
                        },
                        borderWidth: (ctx) => {
                            const pt = ctx.raw;
                            if (pt && pt.cftId === selectedCft) return 2.5;
                            return 1;
                        },
                        pointRadius: (ctx) => {
                            const pt = ctx.raw;
                            if (pt && pt.cftId === selectedCft) return 12;
                            return 6;
                        },
                        pointHoverRadius: (ctx) => {
                            const pt = ctx.raw;
                            if (pt && pt.cftId === selectedCft) return 14;
                            return 8;
                        },
                        pointStyle: (ctx) => {
                            const pt = ctx.raw;
                            if (pt && pt.cftId === selectedCft) return 'rectRot';
                            return 'circle';
                        }
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: CHART_COLORS.textColor }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                if (ctx.datasetIndex === 0) return 'Predicción Perfecta (y = x)';
                                const pt = ctx.raw;
                                return [
                                    `📚 ${pt.label}`,
                                    `📊 Matrícula Real: ${pt.x.toLocaleString('es-CL')} alumnos`,
                                    `🎯 Matrícula Predicha: ${pt.y.toFixed(1)} alumnos`,
                                    `📈 Desviación: ${(pt.y - pt.x).toFixed(1)} alumnos`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Matrícula Real (SIES)', color: CHART_COLORS.textColor },
                        grid: { color: CHART_COLORS.gridColor },
                        ticks: { color: CHART_COLORS.mutedText },
                        min: 0,
                        max: maxVal
                    },
                    y: {
                        title: { display: true, text: 'Matrícula Predicha (Modelo)', color: CHART_COLORS.textColor },
                        grid: { color: CHART_COLORS.gridColor },
                        ticks: { color: CHART_COLORS.mutedText },
                        min: 0,
                        max: maxVal
                    }
                }
            }
        });
    }
};
