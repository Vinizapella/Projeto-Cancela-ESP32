// =============================================
// CONFIGURAÇÕES E CONSTANTES
// =============================================
const API_BASE = 'http://localhost:8080/api';
const PERIODOS = ["Hoje", "Ontem", "Esta Semana", "Semana Passada"];
const CAPACIDADE_TOTAL = 1381;
const GAUGE_ARC_LENGTH = 165;

const ENDPOINTS = {
    entrada: {
        "Hoje": "/entradas/hoje",
        "Ontem": "/entradas/ontem",
        "Esta Semana": "/entradas/semana",
        "Semana Passada": "/entradas/semanapassada",
        vagas: "/entradas/vagas",
        turno: {
            1: "/turno/entradas/primeiro",
            2: "/turno/entradas/segundo",
            3: "/turno/entradas/terceiro"
        }
    },
    saida: {
        "Hoje": "/saidas/hoje",
        "Ontem": "/saidas/ontem",
        "Esta Semana": "/saidas/semana",
        "Semana Passada": "/saidas/passada",
        turno: {
            1: "/turno/saidas/primeiro",
            2: "/turno/saidas/segundo",
            3: "/turno/saidas/terceiro"
        }
    }
};

const elementos = {
    listaTexto: document.getElementById('lista-notificacoes-texto'),
    listaIcones: document.getElementById('lista-notificacoes-icones'),
    periodoDisplay: document.querySelectorAll('#display-periodo-card'),
    eventosCount: document.getElementById('eventos-count'),
    vagasCount: document.getElementById('vagas-count'),
    statusDisplay: document.getElementById('status-display'),
    gateTitle: document.getElementById('gate-title'),
    countLabel: document.getElementById('count-label'),
    btnRefresh: document.getElementById('btn-refresh'),
    btnPrev: document.getElementById('btn-prev-period'),
    btnNext: document.getElementById('btn-next-period'),
    btnTrocarStatus: document.getElementById('btn-trocar-status')
};

// =============================================
// ESTADO GLOBAL
// =============================================
let modoAtual = 'entrada'; // 'entrada' ou 'saida'
let indicePeriodo = 0;
let todasAsNotificacoes = [];
let turnoSelecionado = null; // null = sem turno ativo, 1, 2 ou 3

function formatarHora(dataString) {
    if (!dataString) return "00/00/0000 00:00";
    try {
        const data = new Date(dataString);
        return data.toLocaleString('pt-BR', { 
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } catch (e) { 
        return "00/00/0000 00:00"; 
    }
}

function atualizarPeriodoDisplay() {
    const nomesTurno = { 1: "1° Turno", 2: "2° Turno", 3: "3° Turno" };
    const texto = turnoSelecionado !== null
        ? nomesTurno[turnoSelecionado]
        : PERIODOS[indicePeriodo];

    elementos.periodoDisplay.forEach(el => el.textContent = texto);
    if (elementos.countLabel) {
        elementos.countLabel.textContent = `${modoAtual.toUpperCase()}S — ${texto.toUpperCase()}`;
    }
}

function getRotaAtual() {
    return ENDPOINTS[modoAtual][PERIODOS[indicePeriodo]];
}

// =============================================
// GAUGES
// =============================================

// Barra cheia = todas as vagas livres (1381)
// Barra vai descarregando conforme o estacionamento ocupa
function atualizarGaugeVagas(vagasDisponiveis) {
    const path = document.getElementById('gauge-fill-vagas');
    if (!path) return;

    const proporcao = Math.min(Math.max(vagasDisponiveis / CAPACIDADE_TOTAL, 0), 1);
    const offset = GAUGE_ARC_LENGTH * (1 - proporcao);

    path.style.strokeDashoffset = offset;
    path.style.stroke = '#d7ff00';
}

// Barra enche conforme quantidade de eventos no período
function atualizarGaugeEventos(count) {
    const path = document.getElementById('gauge-fill-eventos');
    if (!path) return;

    const proporcao = Math.min(count / CAPACIDADE_TOTAL, 1);
    const offset = GAUGE_ARC_LENGTH * (1 - proporcao);

    path.style.strokeDashoffset = offset;
    path.style.stroke = '#d7ff00';
}

// =============================================
// RENDERIZAÇÃO DA LISTA
// =============================================
function renderizarLista(dados) {
    
    const scrollTexto = document.getElementById('lista-notificacoes-texto');
    const scrollIcones = document.getElementById('lista-notificacoes-icones');
    
    scrollTexto.innerHTML = ''; 
    scrollIcones.innerHTML = '';

    if (!dados || dados.length === 0) {
        elementos.listaTexto.innerHTML = '<div class="employee-row"><span>Sem registros</span></div>';
        elementos.eventosCount.textContent = '0';
        atualizarGaugeEventos(0);
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
        const icone = nomeEvento.toLowerCase().includes('botao') || nomeEvento.toLowerCase().includes('caminhao') ? 'caminhao.png' : 'carro.png';
        divIcone.innerHTML = `<img src="${icone}" style="width: 50px; object-fit: contain;" onerror="this.src='carro.png'">`;
        scrollIcones.appendChild(divIcone);
    });
}

// =============================================
// CARREGAMENTO DE DADOS
// =============================================
async function carregarDados() {
    try {
        atualizarPeriodoDisplay();

        const resVagas = await fetch(`${API_BASE}/entradas/vagas`);
        if (resVagas.ok) {
            const vagas = await resVagas.json();
            elementos.vagasCount.textContent = vagas;
            atualizarGaugeVagas(vagas);
        }

        let rota;
        if (turnoSelecionado !== null) {
            rota = ENDPOINTS[modoAtual].turno[turnoSelecionado];
        } else {
            rota = getRotaAtual();
        }

        const res = await fetch(`${API_BASE}${rota}`);
        const dados = await res.json();

        todasAsNotificacoes = dados;
        renderizarLista(dados);
        atualizarGaugeEventos(dados.length);

        elementos.eventosCount.textContent = dados.length;


    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        elementos.listaTexto.innerHTML = '<div class="employee-row"><span>Erro ao carregar</span></div>';
    }
}

// =============================================
// EVENTOS
// =============================================
elementos.btnRefresh?.addEventListener('click', carregarDados);

elementos.btnPrev?.addEventListener('click', () => {
    if (indicePeriodo < PERIODOS.length - 1) {
        indicePeriodo++;
        turnoSelecionado = null;
        atualizarEstiloTurnos();
        carregarDados();
    }
});

elementos.btnNext?.addEventListener('click', () => {
    if (indicePeriodo > 0) {
        indicePeriodo--;
        turnoSelecionado = null;
        atualizarEstiloTurnos();
        carregarDados();
    }
});

elementos.btnTrocarStatus?.addEventListener('click', () => {
    modoAtual = modoAtual === 'entrada' ? 'saida' : 'entrada';
    elementos.statusDisplay.textContent = modoAtual === 'entrada' ? 'Entrada' : 'Saída';
    elementos.gateTitle.textContent = modoAtual === 'entrada' ? 'Entradas' : 'Saídas';
    carregarDados();
});

// Botões de turno
const btnTurnos = {
    1: document.getElementById('Matutino'),
    2: document.getElementById('Vespertino'),
    3: document.getElementById('Noturno')
};

function atualizarEstiloTurnos() {
    [1, 2, 3].forEach(t => {
        const btn = btnTurnos[t];
        if (!btn) return;
        btn.className = 'btn-pill ' + (turnoSelecionado === t ? 'btn-morning active' : 'btn-inactive');
    });
}

[1, 2, 3].forEach(t => {
    btnTurnos[t]?.addEventListener('click', () => {
        turnoSelecionado = turnoSelecionado === t ? null : t;
        atualizarEstiloTurnos();
        carregarDados();
    });
});

// Sincronização de scroll
const sincronizarScroll = () => {
    elementos.listaIcones.scrollTop = elementos.listaTexto.scrollTop;
};

elementos.listaTexto?.addEventListener('scroll', sincronizarScroll);
elementos.listaIcones?.addEventListener('scroll', sincronizarScroll);

window.addEventListener('load', () => {
    carregarDados();
    setInterval(carregarDados, 5000);
});


const btnBaixarCsv = document.getElementById('btn-baixar-csv');

if (btnBaixarCsv) {
    btnBaixarCsv.addEventListener('click', async () => {
        try {
            const response = await fetch(`${API_BASE}/entradas/relatorio/excel`); 
            
            if (!response.ok) {
                throw new Error("Erro ao gerar o arquivo no servidor");
            }

            const blob = await response.blob();
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'relatorio_cancela.csv'; 
            
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error("Falha ao baixar CSV:", error);
            alert("Não foi possível baixar o relatório. Verifique o console.");
        }
    });
}