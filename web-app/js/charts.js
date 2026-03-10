/* ==============================================
    VARIÁVEIS GLOBAIS
   ============================================== */
let meuGraficoLinha, meuGraficoBarra, meuGraficoPizza;
const periodosTexto = ["Amanhã", "Próxima Semana"];
let indiceAtual = 0;
let dadosEntradasAtuais = []; 

/* ==============================================
    INICIALIZAÇÃO DOS GRÁFICOS
   ============================================== */
function inicializarGraficos() {
    const ctxLinha = document.getElementById('linhaChart').getContext('2d');
    meuGraficoLinha = new Chart(ctxLinha, {
        type: 'line',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${String(i).padStart(2, '0')}:00`),
            datasets: [
                {
                    label: 'Entradas (IA)',
                    data: Array(24).fill(0),
                    borderColor: '#00e5ff',
                    backgroundColor: 'rgba(0, 229, 255, 0.05)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 5,
                    pointBackgroundColor: '#00e5ff',
                    pointHoverRadius: 8
                },
                {
                    label: 'Saídas (IA)',
                    data: Array(24).fill(0),
                    borderColor: '#1f6feb',
                    backgroundColor: 'rgba(31, 111, 235, 0.05)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 5,
                    pointBackgroundColor: '#1f6feb',
                    pointHoverRadius: 8
                }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            plugins: { 
                legend: { 
                    display: true,
                    labels: { color: '#e6edf3', padding: 20, font: { size: 14 } }
                } 
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { font: { size: 14 }, color: '#8b949e' }, 
                    grid: { color: 'rgba(139, 148, 158, 0.1)' } 
                },
                x: { 
                    ticks: { font: { size: 12 }, color: '#8b949e' }, 
                    grid: { display: false } 
                }
            }
        }
    });

    const ctxBarra = document.getElementById('barraChart').getContext('2d');
    meuGraficoBarra = new Chart(ctxBarra, {
        type: 'bar',
        data: {
            labels: ['00h', '04h', '08h', '12h', '16h', '20h'], 
            datasets: [{
                label: 'Fluxo Estimado',
                data: [0, 0, 0, 0, 0, 0],
                backgroundColor: '#00e5ff',
                borderRadius: 12,
                hoverBackgroundColor: '#1ff7ff'
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            animation: {
                duration: 600,
                easing: 'easeInOutQuad'
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#00e5ff',
                    bodyColor: '#e6edf3',
                    padding: 12,
                    displayColors: false
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { font: { size: 14 }, color: '#8b949e' }, 
                    grid: { color: 'rgba(139, 148, 158, 0.1)' } 
                },
                x: { 
                    ticks: { font: { size: 14 }, color: '#8b949e' }, 
                    grid: { display: false } 
                }
            }
        }
    });

    const ctxPizza = document.getElementById('pizzaChart').getContext('2d');
    meuGraficoPizza = new Chart(ctxPizza, {
        type: 'doughnut',
        data: {
            labels: ['Carros', 'Caminhões'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#00e5ff', '#1f6feb'],
                borderColor: '#1e1e2e',
                borderWidth: 2
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            animation: {
                duration: 800,
                easing: 'easeInOutQuart'
            },
            plugins: { 
                legend: { 
                    position: 'right', 
                    labels: { 
                        color: '#e6edf3', 
                        padding: 20, 
                        font: { size: 14, weight: 'bold' }
                    } 
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                            return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

/* ==============================================
    LÓGICA DE INTEGRAÇÃO COM A IA
   ============================================== */
async function buscarPrevisoesIA(periodo = 'amanha') {
    const hoje = new Date();
    let endpoints = [];

    if (periodo === 'proxima-semana') {
        endpoints = [0, 1, 2, 3, 4, 5, 6].map(d => ({ hora: -1, dia: d })); 
    } else {
        let d = new Date();
        d.setDate(hoje.getDate() + 1);
        const diaSimulado = d.getDay();
        endpoints = Array.from({length: 24}, (_, h) => ({ 
            hora: h, 
            dia: diaSimulado 
        }));
    }

    try {
        const promessas = endpoints.map(p => 
            fetch("http://127.0.0.1:8000/prever", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hora: p.hora,
                    dia_semana: p.dia,
                    turno: (p.hora >= 5 && p.hora < 14) ? 1 : (p.hora >= 14 && p.hora < 23) ? 2 : 3
                })
            }).then(res => res.json())
        );

        const resultados = await Promise.all(promessas);
        
        if (periodo === 'proxima-semana') {
            const dadosPorDia = resultados.map(r => Math.max(0, r.fluxo_estimado || 0));
            dadosEntradasAtuais = dadosPorDia;
            
            const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
            
            if (meuGraficoLinha) {
                meuGraficoLinha.data.labels = diasSemana;
                meuGraficoLinha.data.datasets[0].data = dadosPorDia;
                meuGraficoLinha.data.datasets[1].data = dadosPorDia.map(v => Math.round(v * 0.75));
                meuGraficoLinha.update();
            }

            if (meuGraficoBarra) {
                meuGraficoBarra.data.labels = diasSemana;
                meuGraficoBarra.data.datasets[0].data = dadosPorDia;
                meuGraficoBarra.update();
            }

            const fluxoTotal = dadosPorDia.reduce((a, b) => a + b, 0);
            if (meuGraficoPizza) {
                meuGraficoPizza.data.datasets[0].data = [Math.round(fluxoTotal * 0.8), Math.round(fluxoTotal * 0.2)];
                meuGraficoPizza.update();
            }

            document.getElementById('vagas-count').innerText = Math.round(fluxoTotal);
            document.getElementById('eventos-count').innerText = Math.round(fluxoTotal * 0.75);
        } else {
            const dadosEntradasFull = resultados.map(r => Math.max(0, r.fluxo_estimado || 0));
            const dadosSaidasFull = dadosEntradasFull.map(v => Math.round(v * 0.75));
            
            dadosEntradasAtuais = dadosEntradasFull;
            
            const labelsLinha = Array.from({length: 24}, (_, i) => `${String(i).padStart(2, '0')}:00`);

            if (meuGraficoLinha) {
                meuGraficoLinha.data.labels = labelsLinha;
                meuGraficoLinha.data.datasets[0].data = dadosEntradasFull;
                meuGraficoLinha.data.datasets[1].data = dadosSaidasFull;
                meuGraficoLinha.update();
            }

            if (meuGraficoBarra) {
                const horasPicos = [0, 4, 8, 12, 16, 20]; 
                const labelsPicos = horasPicos.map(h => `${String(h).padStart(2, '0')}h`);
                const dadosReduzidos = horasPicos.map(h => dadosEntradasFull[h] || 0);
                
                meuGraficoBarra.data.labels = labelsPicos;
                meuGraficoBarra.data.datasets[0].data = dadosReduzidos;
                meuGraficoBarra.update();
            }

            const fluxoTotal = dadosEntradasFull.reduce((a, b) => a + b, 0);

            if (meuGraficoPizza) {
                meuGraficoPizza.data.datasets[0].data = [Math.round(fluxoTotal * 0.8), Math.round(fluxoTotal * 0.2)];
                meuGraficoPizza.update();
            }

            document.getElementById('vagas-count').innerText = Math.round(fluxoTotal);
            document.getElementById('eventos-count').innerText = Math.round(fluxoTotal * 0.75);
        }

    } catch (error) {
        console.error("Erro na IA:", error);
    }
}

/* ==============================================
    LÓGICA DOS BOTÕES DE TURNO (FILTRO)
   ============================================== */
function configurarFiltrosTurno() {
    const botoes = {
        'Matutino': 5,   
        'Vespertino': 14, 
        'Noturno': 23     
    };

    Object.keys(botoes).forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;

        btn.onclick = () => {
            const estaAtivo = btn.classList.contains('active');

            Object.keys(botoes).forEach(b => {
                const bEl = document.getElementById(b);
                if (bEl) {
                    bEl.classList.remove('active');
                    bEl.classList.add('btn-inactive');
                }
            });

            if (!estaAtivo) {
                btn.classList.add('active');
                btn.classList.remove('btn-inactive');
                filtrarInterfacePorTurno(botoes[id]);
            } else {
                buscarPrevisoesIA(periodosTexto[indiceAtual] === "Amanhã" ? "amanha" : "proxima-semana");
            }
        };
    });
}

/* ==============================================
    LÓGICA DE FILTRAR INTERFACE POR TURNO
   ============================================== */
function filtrarInterfacePorTurno(horaInicio) {
    if (indiceAtual === 1) return; 

    let indicesFiltro = [];
    let nomeTurno = '';

    if (horaInicio === 5) {
        indicesFiltro = Array.from({length: 9}, (_, i) => 5 + i);
        nomeTurno = 'Matutino';
    } else if (horaInicio === 14) {
        indicesFiltro = Array.from({length: 9}, (_, i) => 14 + i);
        nomeTurno = 'Vespertino';
    } else if (horaInicio === 23) {
        indicesFiltro = [23, 0, 1, 2, 3, 4];
        nomeTurno = 'Noturno';
    }

    const totalTurno = indicesFiltro.reduce((sum, idx) => sum + (dadosEntradasAtuais[idx] || 0), 0);
    const totalSaidas = Math.round(totalTurno * 0.75);

    document.getElementById('vagas-count').innerText = Math.round(totalTurno);
    document.getElementById('eventos-count').innerText = totalSaidas;

    if (meuGraficoPizza) {
        const carros = Math.round(totalTurno * 0.8);
        const caminhoes = Math.round(totalTurno * 0.2);
        meuGraficoPizza.data.datasets[0].data = [carros, caminhoes];
        meuGraficoPizza.update();
    }

    meuGraficoLinha.data.datasets[0].pointRadius = meuGraficoLinha.data.datasets[0].data.map((_, i) => 
        indicesFiltro.includes(i) ? 8 : 3
    );
    meuGraficoLinha.data.datasets[1].pointRadius = meuGraficoLinha.data.datasets[1].data.map((_, i) => 
        indicesFiltro.includes(i) ? 8 : 3
    );
    meuGraficoLinha.update();

    if (meuGraficoBarra) {
        meuGraficoBarra.data.datasets[0].backgroundColor = meuGraficoBarra.data.datasets[0].data.map((_, i) => {
            const hora = parseInt(meuGraficoBarra.data.labels[i]);
            return indicesFiltro.includes(hora) ? '#00e5ff' : 'rgba(0, 229, 255, 0.2)';
        });
        meuGraficoBarra.update();
    }
}

function configurarNavegacao() {
    const btnPrev = document.getElementById('btn-prev-period');
    const btnNext = document.getElementById('btn-next-period');
    const display = document.getElementById('display-periodo-card');

    const atualizarPeriodoUI = () => {
        const texto = periodosTexto[indiceAtual];
        if (display) display.innerText = texto;
        
        document.querySelectorAll('.btn-pill').forEach(btn => {
            btn.classList.remove('active');
            btn.classList.add('btn-inactive');
        });
        
        buscarPrevisoesIA(texto === "Amanhã" ? "amanha" : "proxima-semana");
    };

    if (btnNext) btnNext.onclick = () => { indiceAtual = (indiceAtual + 1) % periodosTexto.length; atualizarPeriodoUI(); };
    if (btnPrev) btnPrev.onclick = () => { indiceAtual = (indiceAtual - 1 + periodosTexto.length) % periodosTexto.length; atualizarPeriodoUI(); };
}

window.onload = () => {
    inicializarGraficos();
    configurarNavegacao();
    configurarFiltrosTurno(); 
    buscarPrevisoesIA(); 
};