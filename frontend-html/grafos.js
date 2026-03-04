
const ctxLinha = document.getElementById('linhaChart').getContext('2d');
new Chart(ctxLinha, {
    type: 'line',
    data: {
        labels: ['06:00', '10:00', '14:00', '18:00', '22:00', '02:00'],
        datasets: [
            {
                label: 'Entradas',
                data: [50, 250, 180, 260, 100, 30],
                borderColor: '#00e5ff',
                backgroundColor: 'rgba(0, 229, 255, 0.05)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'Saídas',
                data: [30, 150, 200, 190, 80, 20],
                borderColor: '#1f6feb',
                tension: 0.4
            }
        ]
    },
    options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { 
            legend: { display: false } 
        },
        layout: {
            padding: {
                top: 20,
                bottom: 10
            }
        },  
        scales: {
            y: {
                ticks: {
                    font: {
                        size: 18
                    },
                    color: '#8b949e'
                }
            },
            x: {
                ticks: {
                    font: {
                        size: 18
                    },
                    color: '#8b949e'
                }
            }
        }
    }
});

// Gráfico de Barras (Direita)
const ctxBarra = document.getElementById('barraChart').getContext('2d');
new Chart(ctxBarra, {
    type: 'bar',
    data: {
        labels: ['06h', '12h', '18h', '00h'],
        datasets: [{
            label: 'Fluxo',
            data: [100, 180, 260, 50],
            backgroundColor: '#00e5ff',
            borderRadius: 4
        }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
});

// Gráfico de Pizza (Apenas Carros e Caminhões)
const ctxPizza = document.getElementById('pizzaChart').getContext('2d');
new Chart(ctxPizza, {
    type: 'pie',
    data: {
        labels: ['Carros', 'Caminhões'],
        datasets: [{
            data: [75, 25],
            backgroundColor: ['#1f6feb', '#00ff88'], // Azul e Verde
            borderWidth: 0
        }]
    },
    options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: { 
            legend: { position: 'right', labels: { color: '#e6edf3' } } 
        } 
    }
});


// --- 2. CONEXÃO COM A SUA API EM PYTHON ---

async function buscarPrevisao(turno) {
    // 1. Atualiza visual dos botões de turno
    document.querySelectorAll('.turno-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // 2. Coloca um loading nos círculos
    document.getElementById('valor-entradas').innerText = "...";
    document.getElementById('valor-saidas').innerText = "...";

    // 3. Prepara os dados para mandar pro api.py
    const hoje = new Date();
    const payload = {
        hora: hoje.getHours(),
        dia_semana: hoje.getDay(),
        turno: turno
    };

    try {
        // 4. Bate na rota /prever do seu FastAPI
        const resposta = await fetch("http://localhost:8000/prever", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const dados = await resposta.json();

        // 5. Atualiza a tela com a resposta da IA
        if (dados.status === "sucesso") {
            const entradas = Math.round(dados.fluxo_estimado);
            document.getElementById('valor-entradas').innerText = entradas;
            // Simulando saídas como 85% das entradas
            document.getElementById('valor-saidas').innerText = Math.round(entradas * 0.85); 
        } else {
            console.error("Erro da API:", dados.mensagem);
            document.getElementById('valor-entradas').innerText = "Erro";
        }
    } catch (erro) {
        console.error("Servidor Python está desligado?", erro);
        document.getElementById('valor-entradas').innerText = "OFF";
        document.getElementById('valor-saidas').innerText = "OFF";
    }
}

// Ao abrir a tela, já clica no primeiro turno para buscar dados
window.onload = () => {
    document.querySelector('.turno-btn').click();
};