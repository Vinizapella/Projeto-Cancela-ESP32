const API_URL = 'http://localhost:8080/api/estacionamento';

let modoAtual = 'entrada';
let indicePeriodo = 0;
const periodos = ["Hoje", "Ontem", "Esta Semana", "Semana Passada"];

// 1. Formata a hora usando a lógica do seu código antigo que dava certo
function formatarHora(dataString) {
    if (!dataString) return "00:00";
    try {
        // A lógica do seu código antigo: simples e funcional
        const data = new Date(dataString);
        return data.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } catch (e) { 
        return "00:00"; 
    }
}

// 2. Função Mestra de Carga de Dados
async function carregarDados() {
    try {
        const periodoAtual = periodos[indicePeriodo]; 
        const endpoint = modoAtual === 'entrada' ? 'entradas' : 'saidas';

        // Atualiza textos da interface
        document.querySelectorAll('#display-periodo-card').forEach(el => el.innerText = periodoAtual);
        const txtCirculo = document.getElementById('count-label');
        if (txtCirculo) txtCirculo.innerText = `${modoAtual.toUpperCase()}S ${periodoAtual.toUpperCase()}`;

        // Busca Vagas
        const resVagas = await fetch(`${API_URL}/vagas`);
        if (resVagas.ok) {
            const vagas = await resVagas.json();
            document.getElementById('vagas-count').innerText = vagas;
        }

        // Busca Eventos
        const resEventos = await fetch(`${API_URL}/${endpoint}`);
        const todosOsDados = await resEventos.json();

        // --- LÓGICA DE FILTRO ---
        const agora = new Date();
        
        const dadosFiltrados = todosOsDados.filter(item => {
            if (!item.data) return false;
            const dataItem = new Date(item.data);

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
            return true;
        });

        // --- ATUALIZAÇÃO DOS TURNOS (Baseado na hora que funciona) ---
        const resumoLocal = { manha: 0, tarde: 0, noite: 0 };
        
        dadosFiltrados.forEach(item => {
            const horaTexto = formatarHora(item.data);
            const hora = parseInt(horaTexto.split(':')[0]);
            
            if (hora >= 5 && hora < 14) resumoLocal.manha++;
            else if (hora >= 14 && hora < 23) resumoLocal.tarde++;
            else resumoLocal.noite++;
        });

        document.getElementById('turno-manha').innerText = resumoLocal.manha;
        document.getElementById('turno-tarde').innerText = resumoLocal.tarde;
        document.getElementById('turno-noite').innerText = resumoLocal.noite;

        // Círculo central
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

// 4. Eventos e Sincronização
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

const sTexto = document.getElementById('lista-notificacoes-texto');
const sIcones = document.getElementById('lista-notificacoes-icones');
sTexto.onscroll = () => { sIcones.scrollTop = sTexto.scrollTop; };
sIcones.onscroll = () => { sTexto.scrollTop = sIcones.scrollTop; };

// Inicialização
window.onload = carregarDados;
// Atualização automática como no seu código antigo
setInterval(carregarDados, 5000);