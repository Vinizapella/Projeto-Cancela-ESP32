const API_URL = 'http://localhost:8080/api/estacionamento';

let todasAsNotificacoes = [];
let modoAtual = 'entrada';
let indicePeriodo = 0;
const periodos = ["Hoje", "Ontem", "Esta Semana", "Semana Passada"];

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

async function carregarDados() {
    try {
        const periodoAtual = periodos[indicePeriodo]; 
        const endpoint = modoAtual === 'entrada' ? 'entradas' : 'saidas';

        document.querySelectorAll('#display-periodo-card').forEach(el => el.innerText = periodoAtual);
        const txtCirculo = document.getElementById('count-label');
        if (txtCirculo) txtCirculo.innerText = `${modoAtual.toUpperCase()}S ${periodoAtual.toUpperCase()}`;

        const resVagas = await fetch(`${API_URL}/vagas`);
        if (resVagas.ok) {
            const vagas = await resVagas.json();
            document.getElementById('vagas-count').innerText = vagas;
        }

        const resEventos = await fetch(`${API_URL}/${endpoint}`);
        const todosOsDados = await resEventos.json();

        todasAsNotificacoes = todosOsDados;

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

        document.getElementById('eventos-count').innerText = dadosFiltrados.length;

        renderizarLista(dadosFiltrados);

    } catch (error) {
        console.error("Erro ao carregar:", error);
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
        const icone = nomeEvento.toLowerCase().includes('botao') || nomeEvento.toLowerCase().includes('caminhao') ? 'caminhao.png' : 'carro.png';
        divIcone.innerHTML = `<img src="${icone}" style="width: 50px; object-fit: contain;" onerror="this.src='carro.png'">`;
        scrollIcones.appendChild(divIcone);
    });
}

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
const container = document.getElementById('lista-notificacoes-texto');
container.scrollTop = container.scrollHeight;
const containerIcones = document.getElementById('lista-notificacoes-icones');
containerIcones.scrollTop = containerIcones.scrollHeight;

function baixarRelatorio() {
    if (todasAsNotificacoes.length === 0) {
        alert("Não há dados carregados para exportar.");
        return;
    }

    let csvContent = "\uFEFFEvento,Data e Hora\n";

    todasAsNotificacoes.forEach(item => {
        const evento = item.evento || (modoAtual === 'entrada' ? "Entrada" : "Saída"); 
        const data = item.data ? new Date(item.data).toLocaleString('pt-BR') : "";
        
        csvContent += `"${evento}","${data}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.href = url;
    link.download = `relatorio_${modoAtual}_completo.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

window.onload = carregarDados;
setInterval(carregarDados, 5000);