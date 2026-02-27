const API_URL = 'http://localhost:8080/api/estacionamento';

let modoAtual = 'entrada';
let indicePeriodo = 0;
const periodos = ["Hoje", "Ontem", "Esta Semana", "Semana Passada"];

// 1. Formata a hora para exibir na lista (HH:MM)
function formatarHora(dataString) {
    if(!dataString) return "00:00";
    try {
        // Trata tanto "YYYY-MM-DD HH:mm:ss" quanto "YYYY-MM-DDTHH:mm:ss"
        const parteHora = dataString.includes(" ") ? dataString.split(" ")[1] : dataString.split("T")[1];
        return parteHora ? parteHora.substring(0, 5) : "00:00";
    } catch (e) { return "00:00"; }
}

// 2. Função Mestra de Carga de Dados
async function carregarDados() {
    try {
        const periodoAtual = periodos[indicePeriodo]; 
        const endpoint = modoAtual === 'entrada' ? 'entradas' : 'saidas';

        // Atualiza textos
        document.querySelectorAll('#display-periodo-card').forEach(el => el.innerText = periodoAtual);
        const txtCirculo = document.getElementById('count-label');
        if (txtCirculo) txtCirculo.innerText = `${modoAtual.toUpperCase()}S ${periodoAtual.toUpperCase()}`;

        // Busca Vagas
        const resVagas = await fetch(`${API_URL}/vagas`);
        if (resVagas.ok) document.getElementById('vagas-count').innerText = await resVagas.text();

        // Busca Eventos
        const resEventos = await fetch(`${API_URL}/${endpoint}`);
        const todosOsDados = await resEventos.json();

        // --- NOVA LÓGICA DE FILTRO (Dias e Horas) ---
        const agora = new Date();
        
        const dadosFiltrados = todosOsDados.filter(item => {
            if (!item.data) return false;

            // Converte a string do banco ("2026-02-26 21:40:00") para objeto Date
            // Trocamos o espaço por "T" para o JS aceitar melhor
            const dataISO = item.data.replace(" ", "T");
            const dataItem = new Date(dataISO);

            // Se a conversão falhar, tentamos pegar só os 10 primeiros caracteres
            if (isNaN(dataItem)) {
                const partes = item.data.substring(0, 10).split('-');
                dataItem.setFullYear(partes[0], partes[1] - 1, partes[2]);
            }

            if (periodoAtual === "Hoje") {
                return dataItem.toLocaleDateString() === agora.toLocaleDateString();
            } 
            
            if (periodoAtual === "Ontem") {
                const ontem = new Date();
                ontem.setDate(agora.getDate() - 1);
                return dataItem.toLocaleDateString() === ontem.toLocaleDateString();
            }

            if (periodoAtual === "Esta Semana") {
                const seteDiasAtras = new Date();
                seteDiasAtras.setDate(agora.getDate() - 7);
                return dataItem >= seteDiasAtras;
            }

            return true; // Semana Passada / Outros
        });

        // --- ATUALIZAÇÃO DOS TURNOS ---
        // Aqui o JS vai contar os turnos sozinho baseado no filtro, 
        // caso o endpoint do back ainda esteja instável.
        const resumoLocal = { manha: 0, tarde: 0, noite: 0 };
        
        dadosFiltrados.forEach(item => {
            const hora = parseInt(formatarHora(item.data).split(':')[0]);
            if (hora >= 5 && hora < 14) resumoLocal.manha++;
            else if (hora >= 14 && hora < 23) resumoLocal.tarde++;
            else resumoLocal.noite++;
        });

        // Mostra os turnos (Prioriza o resumo local se for Hoje)
        document.getElementById('turno-manha').innerText = resumoLocal.manha;
        document.getElementById('turno-tarde').innerText = resumoLocal.tarde;
        document.getElementById('turno-noite').innerText = resumoLocal.noite;

        // O círculo central agora mostra o total do que o JS encontrou
        document.getElementById('eventos-count').innerText = dadosFiltrados.length;

        renderizarLista(dadosFiltrados);

    } catch (error) {
        console.error("Erro ao carregar:", error);
    }
}

// 3. Renderiza a lista lateral
function renderizarLista(dados) {
    const scrollTexto = document.getElementById('lista-notificacoes-texto');
    const scrollIcones = document.getElementById('lista-notificacoes-icones');
    
    scrollTexto.innerHTML = ''; 
    scrollIcones.innerHTML = '';

    if (!dados || dados.length === 0) {
        scrollTexto.innerHTML = '<div class="employee-row"><span>Sem registros</span></div>';
        return;
    }

    // Mostra os 30 mais recentes
    [...dados].reverse().slice(0, 30).forEach((item, index) => {
        const nomeEvento = item.evento || (modoAtual === 'entrada' ? "Entrada" : "Saída");
        
        const divTexto = document.createElement('div');
        divTexto.className = `employee-row ${index === 0 ? 'active-row' : ''}`;
        divTexto.innerHTML = `<span>${nomeEvento}</span><span class="notif-time">${formatarHora(item.data)}</span>`;
        scrollTexto.appendChild(divTexto);

        const divIcone = document.createElement('div');
        divIcone.className = 'side-icon-item';
        const icone = nomeEvento.toLowerCase().includes('botao') || nomeEvento.toLowerCase().includes('caminhao') ? 'caminhao.png' : 'carro.png';
        divIcone.innerHTML = `<img src="${icone}" style="width: 20px;" onerror="this.src='carro.png'">`;
        scrollIcones.appendChild(divIcone);
    });
}

// 4. Eventos de Interface
document.getElementById('btn-refresh').onclick = carregarDados;

document.getElementById('btn-prev-period').onclick = () => {
    if(indicePeriodo < 3) { indicePeriodo++; carregarDados(); }
};

document.getElementById('btn-next-period').onclick = () => {
    if(indicePeriodo > 0) { indicePeriodo--; carregarDados(); }
};

document.getElementById('btn-trocar-status').onclick = () => {
    modoAtual = (modoAtual === 'entrada') ? 'saida' : 'entrada';
    document.getElementById('status-display').innerText = modoAtual === 'entrada' ? 'Entrada' : 'Saída';
    document.getElementById('gate-title').innerText = modoAtual === 'entrada' ? 'Entradas' : 'Saídas';
    carregarDados();
};

function baixarRelatorio() {
    window.location.href = `${API_URL}/relatorio/excel`;
}

// 5. Sincronização de Scroll Melhorada
const sTexto = document.getElementById('lista-notificacoes-texto');
const sIcones = document.getElementById('lista-notificacoes-icones');

sTexto.onscroll = () => { sIcones.scrollTop = sTexto.scrollTop; };
sIcones.onscroll = () => { sTexto.scrollTop = sIcones.scrollTop; };

// Inicialização
window.onload = carregarDados;