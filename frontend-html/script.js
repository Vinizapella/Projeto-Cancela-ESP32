const API_URL = 'http://localhost:8080/api/estacionamento';
let modoAtual = 'entrada';

// Seleção de Elementos Globais
const btnTrocar = document.getElementById('btn-trocar-status');
const statusDisplay = document.getElementById('status-display');
const gateTitle = document.getElementById('gate-title');
const countLabel = document.getElementById('count-label');
const scrollTexto = document.getElementById('lista-notificacoes-texto');
const scrollIcones = document.getElementById('lista-notificacoes-icones');

// --- 1. Sincronia de Scroll ---
scrollTexto.addEventListener('scroll', () => {
    scrollIcones.scrollTop = scrollTexto.scrollTop;
});

scrollIcones.addEventListener('scroll', () => {
    scrollTexto.scrollTop = scrollIcones.scrollTop;
});

// --- 2. Lógica de Interface ---
function alternarInterface() {
    if (modoAtual === 'entrada') {
        statusDisplay.innerText = 'Entrada';
        gateTitle.innerText = 'Entradas';
        countLabel.innerText = 'Entradas hoje';
    } else {
        statusDisplay.innerText = 'Saída';
        gateTitle.innerText = 'Saídas';
        countLabel.innerText = 'Saídas hoje';
    }
    carregarDados();
}

btnTrocar.addEventListener('click', () => {
    modoAtual = (modoAtual === 'entrada') ? 'saida' : 'entrada';
    alternarInterface();
});

// --- 3. Comunicação com a API ---
async function carregarDados() {
    try {
        // Busca Vagas
        const resVagas = await fetch(`${API_URL}/vagas`);
        const vagas = await resVagas.json();
        document.getElementById('vagas-count').innerText = vagas;

        // Busca Eventos baseado no modo (entrada/saida)
        const endpoint = modoAtual === 'entrada' ? 'entradas' : 'saidas';
        const resEventos = await fetch(`${API_URL}/${endpoint}`);
        const dados = await resEventos.json();
        
        document.getElementById('eventos-count').innerText = dados.length;

        // Chama a função para desenhar a lista na tela
        renderizarLista(dados);

    } catch (error) {
        console.error("Erro ao sincronizar com a API Java:", error);
    }
}

function renderizarLista(dados) {
    // Limpa o conteúdo manual anterior
    scrollTexto.innerHTML = ''; 
    scrollIcones.innerHTML = '';

    // Inverte a lista para que o mais recente apareça no topo
    const registrosOrdenados = dados.slice().reverse();

    registrosOrdenados.forEach((item, index) => {
        // Criar a linha de texto
        const divTexto = document.createElement('div');
        divTexto.className = `employee-row ${index === 0 ? 'active-row' : ''}`;
        divTexto.innerHTML = `
            <span>${item.evento}</span>
            <span class="notif-time">${formatarHora(item.data)}</span>
        `;
        scrollTexto.appendChild(divTexto);

        // Criar o ícone correspondente
        const divIcone = document.createElement('div');
        divIcone.className = 'side-icon-item';
        
        // Se a string do evento contiver "botão", usa caminhão, senão usa carro
        const imgNome = item.evento.toLowerCase().includes('botao') ? 'caminhao.png' : 'carro.png';
        
        divIcone.innerHTML = `<img src="${imgNome}" alt="veiculo">`;
        scrollIcones.appendChild(divIcone);
    });
}

function formatarHora(dataString) {
    if(!dataString) return "00:00 AM";
    // Tenta pegar a parte do tempo "10:30:00" e transformar em "10:30"
    const partes = dataString.split(" ");
    const horaFull = partes[1] ? partes[1].substring(0, 5) : "00:00";
    return `${horaFull} AM`;
}

// Inicialização
window.onload = carregarDados;