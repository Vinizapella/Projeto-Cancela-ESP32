/* ==============================================
   VARIÁVEIS GLOBAIS DOS GRÁFICOS
   ============================================== */
let meuGraficoLinha;
let meuGraficoBarra;
let meuGraficoPizza;

/* ==============================================
   INICIALIZAÇÃO DOS GRÁFICOS
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
                    borderWidth: 6,
                    pointRadius: 8,
                    pointBackgroundColor: '#00e5ff'
                },
                {
                    label: 'Saídas (IA)',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: '#1f6feb',
                    tension: 0.4,
                    borderWidth: 6,
                    pointRadius: 8,
                    pointBackgroundColor: '#1f6feb'
                }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
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
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { font: { size: 17 }, color: '#8b949e' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                x: { ticks: { font: { size: 17 }, color: '#8b949e' }, grid: { display: false } }
            }
        }
    });

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
            responsive: true, 
            maintainAspectRatio: false,
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
   LÓGICA DE INTEGRAÇÃO COM A API PYTHON
   ============================================== */

async function buscarPrevisoesIA() {
    const horasParaPrever = [6, 10, 14, 18, 22, 2];
    const diaAtual = new Date().getDay();
    const getTurno = (h) => (h >= 6 && h < 14) ? 1 : (h >= 14 && h < 22) ? 2 : 3;

    try {
        console.log("Conectando à IA...");
        const promessas = horasParaPrever.map(hora => 
            fetch("http://127.0.0.1:8000/prever", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hora: hora,
                    dia_semana: diaAtual,
                    turno: getTurno(hora)
                })
            }).then(res => {
                if(!res.ok) throw new Error("Erro na API");
                return res.json();
            })
        );

        const resultados = await Promise.all(promessas);
        
        const dadosEntradas = resultados.map(r => r.fluxo_estimado || 0);
        const dadosSaidas = dadosEntradas.map(v => Math.round(v * 0.75));

        
        atualizarGraficoLinha(dadosEntradas, dadosSaidas);
        
        atualizarGraficoBarra(dadosEntradas.slice(0, 4));
        
        const fluxoTotal = dadosEntradas.reduce((a, b) => a + b, 0);
        atualizarGraficoPizza(Math.round(fluxoTotal * 0.8), Math.round(fluxoTotal * 0.2));

        document.getElementById('vagas-count').innerText = Math.max(...dadosEntradas);
        document.getElementById('eventos-count').innerText = Math.max(...dadosSaidas);
        
        document.getElementById('turno-manha').innerText = dadosEntradas[0] || "--";
        document.getElementById('turno-tarde').innerText = dadosEntradas[2] || "--";
        document.getElementById('turno-noite').innerText = dadosEntradas[4] || "--";
        
        console.log("✅ Todos os gráficos foram atualizados pela IA!");

    } catch (error) {
        console.error("Erro ao buscar dados da IA:", error);
    }
}

function atualizarGraficoLinha(entradas, saidas) {
    if (meuGraficoLinha) {
        meuGraficoLinha.data.datasets[0].data = entradas;
        meuGraficoLinha.data.datasets[1].data = saidas;
        meuGraficoLinha.update();
    }
}

function atualizarGraficoBarra(dados) {
    if (meuGraficoBarra) {
        meuGraficoBarra.data.datasets[0].data = dados;
        meuGraficoBarra.update();
    }
}

function atualizarGraficoPizza(carros, caminhoes) {
    if (meuGraficoPizza) {
        meuGraficoPizza.data.datasets[0].data = [carros, caminhoes];
        meuGraficoPizza.update();
    }
}

/* ==============================================
   EXECUÇÃO INICIAL
   ============================================== */
window.onload = () => {
    inicializarGraficos();
    buscarPrevisoesIA();
};