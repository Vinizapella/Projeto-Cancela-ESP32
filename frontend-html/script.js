// =============================================
// CONFIGURAÇÕES E CONSTANTES
// =============================================
const API_BASE = 'http://localhost:8080/api';
const PERIODOS = ["Hoje", "Ontem", "Esta Semana", "Semana Passada"];

const ENDPOINTS = {
    entrada: {
        "Hoje": "/resumo/entradas/hoje",
        "Ontem": "/entradas/ontem",
        "Esta Semana": "/entradas/semana",
        "Semana Passada": "/entradas/semanapassada",
        vagas: "/entradas/vagas"
    },
    saida: {
        "Hoje": "/saidas",
        "Ontem": "/saidas/ontem",
        "Esta Semana": "/saidas/semana",
        "Semana Passada": "/saidas/passada"
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

// =============================================
// FUNÇÕES AUXILIARES
// =============================================
function formatarHora(dataString) {
    if (!dataString) return "00/00/0000 00:00";
    try {
        const data = new Date(dataString);
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        const hora = String(data.getHours()).padStart(2, '0');
        const minuto = String(data.getMinutes()).padStart(2, '0');
        return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
    } catch {
        return "00/00/0000 00:00";
    }
}

function atualizarPeriodoDisplay() {
    const texto = PERIODOS[indicePeriodo];
    elementos.periodoDisplay.forEach(el => el.textContent = texto);
    if (elementos.countLabel) {
        elementos.countLabel.textContent = `${modoAtual.toUpperCase()}S ${texto.toUpperCase()}`;
    }
}

function getRotaAtual() {
    return ENDPOINTS[modoAtual][PERIODOS[indicePeriodo]];
}

// =============================================
// RENDERIZAÇÃO DA LISTA
// =============================================
function renderizarLista(dados) {
    elementos.listaTexto.innerHTML = '';
    elementos.listaIcones.innerHTML = '';

    if (!dados || dados.length === 0) {
        elementos.listaTexto.innerHTML = '<div class="employee-row"><span>Sem registros</span></div>';
        elementos.eventosCount.textContent = '0';
        return;
    }

    elementos.eventosCount.textContent = dados.length;

    [...dados].reverse().slice(0, 30).forEach((item, index) => {
        const nomeEvento = item.evento || (modoAtual === 'entrada' ? "Entrada" : "Saída");

        const divTexto = document.createElement('div');
        divTexto.className = `employee-row ${index === 0 ? 'active-row' : ''}`;
        divTexto.innerHTML = `
            <span>${nomeEvento}</span>
            <span class="notif-time">${formatarHora(item.data)}</span>
        `;
        elementos.listaTexto.appendChild(divTexto);

        const divIcone = document.createElement('div');
        divIcone.className = 'side-icon-item';
        const iconeSrc = nomeEvento.toLowerCase().includes('botao') ? 'caminhao.png' : 'carro.png';
        divIcone.innerHTML = `<img src="${iconeSrc}" alt="Ícone" style="width:50px;height:50px;object-fit:contain;">`;
        elementos.listaIcones.appendChild(divIcone);
    });
}

// =============================================
// CARREGAMENTO DE DADOS
// =============================================
async function carregarDados() {
    try {
        const periodo = PERIODOS[indicePeriodo];
        atualizarPeriodoDisplay();

        const resVagas = await fetch(`${API_BASE}/entradas/vagas`);
        if (resVagas.ok) {
            const vagas = await resVagas.json();
            elementos.vagasCount.textContent = vagas;
        }

        const rota = getRotaAtual();
        const res = await fetch(`${API_BASE}${rota}`);
        let dados = await res.json();

        if (periodo === "Hoje") {
            const hoje = new Date().toISOString().split('T')[0];
            dados = dados.filter(item => item.data.startsWith(hoje));
        }

        todasAsNotificacoes = dados;
        renderizarLista(dados);

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
        carregarDados();
    }
});

elementos.btnNext?.addEventListener('click', () => {
    if (indicePeriodo > 0) {
        indicePeriodo--;
        carregarDados();
    }
});

elementos.btnTrocarStatus?.addEventListener('click', () => {
    modoAtual = modoAtual === 'entrada' ? 'saida' : 'entrada';
    elementos.statusDisplay.textContent = modoAtual === 'entrada' ? 'Entrada' : 'Saída';
    elementos.gateTitle.textContent = modoAtual === 'entrada' ? 'Entradas' : 'Saídas';
    carregarDados();
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