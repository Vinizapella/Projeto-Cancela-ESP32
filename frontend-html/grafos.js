/* ==============================================
    VARIÁVEIS GLOBAIS
   ============================================== */
let meuGraficoLinha, meuGraficoBarra, meuGraficoPizza;
const periodosTexto = ["Amanhã", "Próxima Semana"];
let indiceAtual = 0;

/* ==============================================
    INICIALIZAÇÃO DOS GRÁFICOS (SEU DESIGN)
   ============================================== */
function inicializarGraficos() {
    const ctxLinha = document.getElementById('linhaChart').getContext('2d');
    meuGraficoLinha = new Chart(ctxLinha, {
        type: 'line',
        data: {
            labels: ['06:00', '10:00', '14:00', '18:00', '22:00', '02:00'],
            datasets: [
                {
                    label: 'Entradas (IA)',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: '#00e5ff',
                    backgroundColor: 'rgba(0, 229, 255, 0.05)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 5,
                    pointRadius: 7,
                    pointBackgroundColor: '#00e5ff'
                },
                {
                    label: 'Saídas (IA)',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: '#1f6feb',
                    tension: 0.4,
                    borderWidth: 5,
                    pointRadius: 7,
                    pointBackgroundColor: '#1f6feb'
                }
            ]
        },
        options: { 
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { font: { size: 18 }, color: '#8b949e' }, grid: { display: false } },
                x: { ticks: { font: { size: 18 }, color: '#8b949e' }, grid: { display: false } }
            }
        }
    });


    const ctxBarra = document.getElementById('barraChart').getContext('2d');
    meuGraficoBarra = new Chart(ctxBarra, {
        type: 'bar',
        data: {
            labels: ['06h', '10h', '14h', '18h'], 
            datasets: [{
                label: 'Fluxo Estimado',
                data: [0, 0, 0, 0],
                backgroundColor: '#00e5ff',
                borderRadius: 8 
            }]
        },
        options: { 
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { font: { size: 17 }, color: '#8b949e' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                x: { ticks: { font: { size: 17 }, color: '#8b949e' }, grid: { display: false } }
            }
        }
    });

    // Pizza
    const ctxPizza = document.getElementById('pizzaChart').getContext('2d');
    meuGraficoPizza = new Chart(ctxPizza, {
        type: 'pie',
        data: {
            labels: ['Carros', 'Caminhões'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#1f6feb', '#00e5ff'],
                borderWidth: 0
            }]
        },
        options: { 
            responsive: true, maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    position: 'right', 
                    labels: { color: '#e6edf3', padding: 20, font: { size: 18 } } 
                } 
            } 
        }
    });
}

/* ==============================================
    LÓGICA DE NAVEGAÇÃO E IA (INTEGRADA)
   ============================================== */
function configurarNavegacao() {
    const btnPrev = document.getElementById('btn-prev-period');
    const btnNext = document.getElementById('btn-next-period');
    const display = document.getElementById('display-periodo-card');

    const atualizarPeriodoUI = () => {
        const texto = periodosTexto[indiceAtual];
        if (display) display.innerText = texto;
        const mapa = { "Amanhã": "amanha", "Esta Semana": "esta-semana", "Próxima Semana": "proxima-semana" };
        buscarPrevisoesIA(mapa[texto]);
    };

    if (btnNext) btnNext.onclick = () => { indiceAtual = (indiceAtual + 1) % periodosTexto.length; atualizarPeriodoUI(); };
    if (btnPrev) btnPrev.onclick = () => { indiceAtual = (indiceAtual - 1 + periodosTexto.length) % periodosTexto.length; atualizarPeriodoUI(); };
}

async function buscarPrevisoesIA(periodo = 'amanha') {
    const hoje = new Date();
    let novasLabels;
    let endpoints = [];

    if (periodo === 'proxima-semana') {
        novasLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        endpoints = [0, 1, 2, 3, 4, 5, 6].map(d => ({ hora: -1, dia: d })); 
    } else {
        novasLabels = ['06:00', '10:00', '14:00', '18:00', '22:00', '02:00'];
        let d = new Date();
        if (periodo === 'amanha') d.setDate(hoje.getDate() + 1);
        const diaSimulado = d.getDay();
        endpoints = [6, 10, 14, 18, 22, 2].map(h => ({ hora: h, dia: diaSimulado }));
    }

    try {
        const promessas = endpoints.map(p => 
            fetch("http://127.0.0.1:8000/prever", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hora: p.hora,
                    dia_semana: p.dia,
                    turno: (p.hora >= 6 && p.hora < 14) ? 1 : (p.hora >= 14 && p.hora < 22) ? 2 : 3
                })
            }).then(res => res.json())
        );

        const resultados = await Promise.all(promessas);
        const dadosEntradas = resultados.map(r => r.fluxo_estimado || 0);
        const dadosSaidas = dadosEntradas.map(v => Math.round(v * 0.75));

        // Atualiza Labels e Dados mantendo a estilização
        if (meuGraficoLinha) {
            meuGraficoLinha.data.labels = novasLabels;
            meuGraficoLinha.data.datasets[0].data = dadosEntradas;
            meuGraficoLinha.data.datasets[1].data = dadosSaidas;
            meuGraficoLinha.update();
        }

        if (meuGraficoBarra) {
            meuGraficoBarra.data.labels = novasLabels.slice(0, 4);
            meuGraficoBarra.data.datasets[0].data = dadosEntradas.slice(0, 4);
            meuGraficoBarra.update();
        }

        const fluxoTotal = dadosEntradas.reduce((a, b) => a + b, 0);
        if (meuGraficoPizza) {
            meuGraficoPizza.data.datasets[0].data = [Math.round(fluxoTotal * 0.8), Math.round(fluxoTotal * 0.2)];
            meuGraficoPizza.update();
        }

        /* === ATUALIZAÇÃO DAS GAUGES (TEXTO) === */
        const elEntradas = document.getElementById('vagas-count');
        const elSaidas = document.getElementById('eventos-count');

        if (elEntradas) {
            // Soma todos os valores de entrada retornados pela IA
            const totalEntradas = dadosEntradas.reduce((a, b) => a + b, 0);
            elEntradas.innerText = Math.round(totalEntradas);
        }

        if (elSaidas) {
            // Soma todos os valores de saída (que você calculou como 75% da entrada)
            const totalSaidas = dadosSaidas.reduce((a, b) => a + b, 0);
            elSaidas.innerText = Math.round(totalSaidas);
        }

    } catch (error) {
        console.error("❌ Erro na IA:", error);
    }
}

window.onload = () => {
    inicializarGraficos();
    configurarNavegacao();
    buscarPrevisoesIA(); 
};