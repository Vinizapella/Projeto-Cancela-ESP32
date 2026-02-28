const API_BASE = 'http://localhost:8080/api';

let todasAsNotificacoes = [];
let modoAtual = 'entrada'; 
let indicePeriodo = 0;
const periodos = ["Hoje", "Ontem", "Esta Semana", "Semana Passada"];

const ENDPOINTS = {
    entrada: {
        "Hoje": "/resumo/entradas/hoje", 
        "Ontem": "/entradas/ontem",
        "Esta Semana": "/entradas/semana",
        "Semana Passada": "/entradas/semanapassada",
        "vagas": "/entradas/vagas"
    },
    saida: {
        "Hoje": "/saidas",
        "Ontem": "/saidas/ontem",
        "Esta Semana": "/saidas/semana",
        "Semana Passada": "/saidas/passada"
    }
};

function formatarHora(dataString) {
    if (!dataString) return "00/00/0000 00:00";
    try {
        const data = new Date(dataString);
        
        if (dataString.includes('T')) {
            const horaBruta = parseInt(dataString.split('T')[1].substring(0, 2));
            const horaObjeto = data.getHours();
            if (horaObjeto !== horaBruta) {
                data.setHours(data.getHours());
            }
        }

        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        const hora = String(data.getHours()).padStart(2, '0');
        const minuto = String(data.getMinutes()).padStart(2, '0');
        
        return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
    } catch (e) { 
        return "00/00/0000 00:00"; 
    }
}

async function carregarDados() {
    try {
        const periodoTexto = periodos[indicePeriodo];
        let rotaBase = ENDPOINTS[modoAtual][periodoTexto];
        
        document.querySelectorAll('#display-periodo-card').forEach(el => el.innerText = periodoTexto);
        const txtCirculo = document.getElementById('count-label');
        if (txtCirculo) txtCirculo.innerText = `${modoAtual.toUpperCase()}S ${periodoTexto.toUpperCase()}`;

        const resVagas = await fetch(`${API_BASE}/entradas/vagas`);
        if (resVagas.ok) {
            const vagas = await resVagas.json();
            document.getElementById('vagas-count').innerText = vagas;
        }

        const resEventos = await fetch(`${API_BASE}${rotaBase}`);
        let dados = await resEventos.json();

        if (periodoTexto === "Hoje") {
            const dataHoje = new Date().toLocaleDateString('en-CA'); 
            dados = dados.filter(item => {
                const dataItem = item.data.split('T')[0];
                return dataItem === dataHoje;
            });
        }

        todasAsNotificacoes = dados;
        document.getElementById('eventos-count').innerText = dados.length;

        renderizarLista(dados);

    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    }
}

function renderizarLista(dados) {
    const scrollTexto = document.getElementById('lista-notificacoes-texto');
    const scrollIcones = document.getElementById('lista-notificacoes-icones');
    
    scrollTexto.innerHTML = ''; 
    scrollIcones.innerHTML = '';

    if (!dados || dados.length === 0) {
        scrollTexto.innerHTML = '<div class="employee-row"><span>Sem registros</span></div>';
        return;
    }

    [...dados].reverse().slice(0, 30).forEach((item, index) => {
        const nomeEvento = item.evento || (modoAtual === 'entrada' ? "Entrada" : "Saída");
        
        const divTexto = document.createElement('div');
        divTexto.className = `employee-row ${index === 0 ? 'active-row' : ''}`;
        divTexto.innerHTML = `<span>${nomeEvento}</span><span class="notif-time">${formatarHora(item.data)}</span>`;
        scrollTexto.appendChild(divTexto);

        const divIcone = document.createElement('div');
        divIcone.className = 'side-icon-item';
        const icone = nomeEvento.toLowerCase().includes('botao') ? 'caminhao.png' : 'carro.png';
        divIcone.innerHTML = `<img src="${icone}" style="width: 50px; height: 50px; object-fit: contain;">`;
        scrollIcones.appendChild(divIcone);
    });
}

const sTexto = document.getElementById('lista-notificacoes-texto');
const sIcones = document.getElementById('lista-notificacoes-icones');

if (sTexto && sIcones) {
    sTexto.onscroll = () => { sIcones.scrollTop = sTexto.scrollTop; };
    sIcones.onscroll = () => { sTexto.scrollTop = sIcones.scrollTop; };
}

document.getElementById('btn-refresh').onclick = carregarDados;
document.getElementById('btn-prev-period').onclick = () => { if(indicePeriodo < 3) { indicePeriodo++; carregarDados(); } };
document.getElementById('btn-next-period').onclick = () => { if(indicePeriodo > 0) { indicePeriodo--; carregarDados(); } };

document.getElementById('btn-trocar-status').onclick = () => {
    modoAtual = (modoAtual === 'entrada') ? 'saida' : 'entrada';
    document.getElementById('status-display').innerText = modoAtual === 'entrada' ? 'Entrada' : 'Saída';
    document.getElementById('gate-title').innerText = modoAtual === 'entrada' ? 'Entradas' : 'Saídas';
    carregarDados();
};

window.onload = carregarDados;
setInterval(carregarDados, 5000);