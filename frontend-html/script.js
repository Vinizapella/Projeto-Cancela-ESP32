const API_URL = 'http://localhost:8080/api/estacionamento';
let modoAtual = 'entrada';

const btnTrocar = document.getElementById('btn-trocar-status');
const statusDisplay = document.getElementById('status-display');
const gateTitle = document.getElementById('gate-title');
const countLabel = document.getElementById('count-label');
const scrollTexto = document.getElementById('lista-notificacoes-texto');
const scrollIcones = document.getElementById('lista-notificacoes-icones');
const periodos = ["Hoje", "Ontem", "Esta Semana", "Semana Passada"];
let indicePeriodo = 0; 
const btnPrev = document.getElementById('btn-prev-period');
const btnNext = document.getElementById('btn-next-period');
const periodDisplay = document.getElementById('current-period-display');


btnPrev.addEventListener('click', () => {
    if (indicePeriodo < periodos.length - 1) {
        indicePeriodo++;
        atualizarInterfacePeriodo();
    }
});


btnNext.addEventListener('click', () => {
    if (indicePeriodo > 0) {
        indicePeriodo--;
        atualizarInterfacePeriodo();
    }
});


scrollTexto.addEventListener('scroll', () => {
    scrollIcones.scrollTop = scrollTexto.scrollTop;
});

scrollIcones.addEventListener('scroll', () => {
    scrollTexto.scrollTop = scrollIcones.scrollTop;
});


function atualizarInterfacePeriodo() {
    periodDisplay.innerText = periodos[indicePeriodo];
    
    carregarDados(periodos[indicePeriodo]);
}


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


async function carregarDados(periodoSelecionado = "Hoje") {
    try {
        const resVagas = await fetch(`${API_URL}/vagas`);
        const vagas = await resVagas.json();
        document.getElementById('vagas-count').innerText = vagas;

        const endpoint = modoAtual === 'entrada' ? 'entradas' : 'saidas';

        const resEventos = await fetch(`${API_URL}/${endpoint}?periodo=${periodoSelecionado}`);
        const dados = await resEventos.json();
        
        document.getElementById('eventos-count').innerText = dados.length;

        renderizarLista(dados);

    } catch (error) {
        console.error("Erro ao sincronizar com a API Java:", error);
    }
}



function renderizarLista(dados) {
    scrollTexto.innerHTML = ''; 
    scrollIcones.innerHTML = '';

    const registrosOrdenados = dados.slice().reverse();

    registrosOrdenados.forEach((item, index) => {
        const divTexto = document.createElement('div');
        divTexto.className = `employee-row ${index === 0 ? 'active-row' : ''}`;
        divTexto.innerHTML = `
            <span>${item.evento}</span>
            <span class="notif-time">${formatarHora(item.data)}</span>
        `;
        scrollTexto.appendChild(divTexto);

        const divIcone = document.createElement('div');
        divIcone.className = 'side-icon-item';
        
        const imgNome = item.evento.toLowerCase().includes('botao') ? 'caminhao.png' : 'carro.png';
        
        divIcone.innerHTML = `<img src="${imgNome}" alt="veiculo">`;
        scrollIcones.appendChild(divIcone);
    });
}



function formatarHora(dataString) {
    if(!dataString) return "00:00 AM";
    const partes = dataString.split(" ");
    const horaFull = partes[1] ? partes[1].substring(0, 5) : "00:00";
    return `${horaFull} AM`;
}



window.onload = carregarDados;