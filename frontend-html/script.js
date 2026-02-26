const API_URL = 'http://localhost:8080/api/estacionamento';

let modoAtual = 'entrada';
let indicePeriodo = 0;
const periodos = ["Hoje", "Ontem", "Esta Semana", "Semana Passada"];
let turnoSelecionado = "Matutino";
let horarioSelecionado = null;

function formatarHora(dataString) {
    if(!dataString) return "00:00";
    const partes = dataString.split(" ");
    return partes[1] ? partes[1].substring(0, 5) : "00:00";
}

async function carregarDados() {
    try {
        const periodoAtual = periodos[indicePeriodo];
        const endpoint = modoAtual === 'entrada' ? 'entradas' : 'saidas';

        document.getElementById('display-periodo-card').innerText = periodoAtual;
        document.getElementById('current-period-display').innerText = periodoAtual;
        document.getElementById('count-label').innerText = `${modoAtual.toUpperCase()}S ${periodoAtual.toUpperCase()}`;

        const resVagas = await fetch(`${API_URL}/vagas`);
        const vagas = await resVagas.text(); 
        document.getElementById('vagas-count').innerText = vagas;

        const resEventos = await fetch(`${API_URL}/${endpoint}`);
        const dados = await resEventos.json();
        
        document.getElementById('eventos-count').innerText = dados.length;
        renderizarLista(dados);

        const resTurnos = await fetch(`${API_URL}/resumo/entradas/hoje`);
        if(resTurnos.ok) {
            const resumo = await resTurnos.json();

            document.getElementById('turno-manha').innerText = resumo.turno_manha || '0';
            document.getElementById('turno-tarde').innerText = resumo.turno_tarde || '0';
            document.getElementById('turno-noite').innerText = resumo.turno_noite || '0';
        }

    } catch (error) {
        console.error("Erro ao conectar com o servidor Java:", error);
    }
}

function renderizarLista(dados) {
    const scrollTexto = document.getElementById('lista-notificacoes-texto');
    const scrollIcones = document.getElementById('lista-notificacoes-icones');
    
    scrollTexto.innerHTML = ''; 
    scrollIcones.innerHTML = '';

    const ultimosTrinta = dados.slice().reverse().slice(0, 30);

    ultimosTrinta.forEach((item, index) => {

        const divTexto = document.createElement('div');
        divTexto.className = `employee-row ${index === 0 ? 'active-row' : ''}`;
        divTexto.innerHTML = `
            <span>${item.evento}</span>
            <span class="notif-time">${formatarHora(item.data)}</span>
        `;
        scrollTexto.appendChild(divTexto);

        const divIcone = document.createElement('div');
        divIcone.className = 'side-icon-item';
        
        let icone = 'carro.png';
        if (item.evento.toLowerCase().includes('botao')) {
            icone = 'caminhao.png'; 
        }
        
        divIcone.innerHTML = `<img src="${icone}" style="width: 20px;">`;
        scrollIcones.appendChild(divIcone);
    });
}

document.getElementById('btn-prev-period').onclick = () => { 
    if(indicePeriodo < 3) { 
        indicePeriodo++; carregarDados();

     } 
};
document.getElementById('btn-next-period').onclick = () => { 
    if(indicePeriodo > 0) {
         indicePeriodo--; carregarDados();
    } 
};

document.getElementById('btn-trocar-status').onclick = () => {
    modoAtual = (modoAtual === 'entrada') ? 'saida' : 'entrada';
    document.getElementById('status-display').innerText = modoAtual === 'entrada' ? 'Entrada' : 'Saída';
    document.getElementById('gate-title').innerText = modoAtual === 'entrada' ? 'Entradas' : 'Saídas';
    carregarDados();
};

document.querySelectorAll('.btn-pill').forEach(btn => {
    btn.onclick = function() {
        if(this.classList.contains('btn-hour')) {

            document.querySelectorAll('.btn-hour').forEach(h => h.classList.remove('active-hour'));
            this.classList.add('active-hour');
            horarioSelecionado = this.innerText;
        } else {

            document.querySelectorAll('.btn-pill').forEach(p => { p.classList.remove('active'); p.classList.add('btn-inactive'); });
            this.classList.add('active'); this.classList.remove('btn-inactive');
            turnoSelecionado = this.innerText;
            horarioSelecionado = null;
        }
        carregarDados();
    };
});

function baixarRelatorio() {
    window.location.href = `${API_URL}/relatorio/excel`;
}

const scrollTexto = document.getElementById('lista-notificacoes-texto');
const scrollIcones = document.getElementById('lista-notificacoes-icones');

scrollTexto.onscroll = function() {
    scrollIcones.scrollTop = scrollTexto.scrollTop;
};

scrollIcones.onscroll = function() {
    scrollTexto.scrollTop = scrollIcones.scrollTop;
};

window.onload = carregarDados;
setInterval(carregarDados, 3000);