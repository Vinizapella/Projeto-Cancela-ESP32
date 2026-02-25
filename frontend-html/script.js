const scrollTexto = document.getElementById('lista-notificacoes-texto');
const scrollIcones = document.getElementById('lista-notificacoes-icones');

scrollTexto.addEventListener('scroll', () => {
    scrollIcones.scrollTop = scrollTexto.scrollTop;
});

scrollIcones.addEventListener('scroll', () => {
    scrollTexto.scrollTop = scrollIcones.scrollTop;
});

const API_URL = 'http://localhost:8080/api/estacionamento';
let modoAtual = 'entrada';

const btnTrocar = document.getElementById('btn-trocar-status');
const statusDisplay = document.getElementById('status-display');
const gateTitle = document.getElementById('gate-title');
const countLabel = document.getElementById('count-label');

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

async function carregarDados() {
    try {
        const resVagas = await fetch(`${API_URL}/vagas`);
        const vagas = await resVagas.json();
        document.getElementById('vagas-count').innerText = vagas;

        const endpoint = modoAtual === 'entrada' ? 'entradas' : 'saidas';
        const resEventos = await fetch(`${API_URL}/${endpoint}`);
        const dados = await resEventos.json();
        
        document.getElementById('eventos-count').innerText = dados.length;

    } catch (error) {
        console.error("Erro ao sincronizar com a API Java:", error);
    }
}

window.onload = carregarDados;


