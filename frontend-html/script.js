const API_URL = 'http://localhost:8080/api/estacionamento';


let modoAtual = 'entrada';
let indicePeriodo = 0;
const periodos = ["Hoje", "Ontem", "Esta Semana", "Semana Passada"];
let turnoSelecionado = "Matutino";
let horarioSelecionado = null;


document.getElementById('btn-refresh').onclick = () => {
    console.log("🔄 Atualização manual solicitada...");
    carregarDados(); // Chama a sua função mestra
};


function formatarHora(dataString) {
    if(!dataString) return "00:00";
    // Tenta pegar os caracteres da hora independente de ser espaço ou "T"
    // Ex: "2026-02-26 15:30:00" -> pega do índice 11 ao 16
    try {
        return dataString.includes(" ") ?
               dataString.split(" ")[1].substring(0, 5) :
               dataString.substring(11, 16);
    } catch (e) {
        return "00:00";
    }
}


async function carregarDados() {
    try {
        const periodoAtual = periodos[indicePeriodo]; 
        const endpoint = modoAtual === 'entrada' ? 'entradas' : 'saidas';

        // =========================================================
        // 1. ATUALIZAÇÃO IMEDIATA DOS TEXTOS (Topo, Setas e Círculo)
        // =========================================================
        const txtTopo = document.getElementById('current-period-display');
        const txtSetas = document.getElementById('display-periodo-card');
        const txtCirculo = document.getElementById('count-label');

        if (txtTopo) txtTopo.innerText = periodoAtual;
        if (txtSetas) txtSetas.innerText = periodoAtual;
        if (txtCirculo) {
            txtCirculo.innerText = `${modoAtual.toUpperCase()}S ${periodoAtual.toUpperCase()}`;
        }

        // =========================================================
        // 2. BUSCA DE DADOS (Vagas e Eventos)
        // =========================================================
        const resVagas = await fetch(`${API_URL}/vagas`);
        const vagas = await resVagas.text();
        document.getElementById('vagas-count').innerText = vagas;

        const resEventos = await fetch(`${API_URL}/${endpoint}`);
        const todosOsDados = await resEventos.json();

        // =========================================================
        // 3. LÓGICA DE DADOS PARA "HOJE" (Usando seu endpoint Java)
        // =========================================================
        if (periodoAtual === "Hoje" && modoAtual === 'entrada') {
            const resResumo = await fetch(`${API_URL}/resumo/entradas/hoje`);
            if (resResumo.ok) {
                const resumo = await resResumo.json();
                document.getElementById('turno-manha').innerText = resumo.turno_manha || '0';
                document.getElementById('turno-tarde').innerText = resumo.turno_tarde || '0';
                document.getElementById('turno-noite').innerText = resumo.turno_noite || '0';
                
                const totalHoje = (resumo.turno_manha || 0) + (resumo.turno_tarde || 0) + (resumo.turno_noite || 0);
                document.getElementById('eventos-count').innerText = totalHoje;
            }
        }

       // =========================================================
        // 4. FILTRO PARA AS NOTIFICAÇÕES (Lista Lateral)
        // =========================================================
        const agora = new Date();
        const ano = agora.getFullYear();
        const mes = String(agora.getMonth() + 1).padStart(2, '0');
        const dia = String(agora.getDate()).padStart(2, '0');
        const hojeStrFixo = `${ano}-${mes}-${dia}`; // Formato manual robusto: "2026-02-26"

        const ontemData = new Date();
        ontemData.setDate(agora.getDate() - 1);
        const ontemStrFixo = `${ontemData.getFullYear()}-${String(ontemData.getMonth() + 1).padStart(2, '0')}-${String(ontemData.getDate()).padStart(2, '0')}`;

        const dadosFiltrados = todosOsDados.filter(item => {
            if (!item.data) return false;

            // Limpa a string do banco: tira espaços e pega só a parte YYYY-MM-DD
            const dataPura = item.data.trim().split(' ')[0].split('T')[0];

            if (periodoAtual === "Hoje") {
                return dataPura === hojeStrFixo;
            } else if (periodoAtual === "Ontem") {
                return dataPura === ontemStrFixo;
            }
            return true; // Semana Passada / Esta Semana
        });

        // =========================================================
        // 5. SE NÃO FOR HOJE, CALCULA TUDO PELO JS
        // =========================================================
        if (periodoAtual !== "Hoje") {
            const resumoManual = { manha: 0, tarde: 0, noite: 0 };
            dadosFiltrados.forEach(item => {
                if (item.data && item.data.includes(' ')) {
                    const hora = parseInt(item.data.split(' ')[1].substring(0, 2));
                    if (hora >= 5 && hora < 14) resumoManual.manha++;
                    else if (hora >= 14 && hora < 23) resumoManual.tarde++;
                    else resumoManual.noite++;
                }
            });
            document.getElementById('turno-manha').innerText = resumoManual.manha;
            document.getElementById('turno-tarde').innerText = resumoManual.tarde;
            document.getElementById('turno-noite').innerText = resumoManual.noite;
            document.getElementById('eventos-count').innerText = dadosFiltrados.length;
        }

        // 6. RENDERIZA A LISTA SEMPRE
        renderizarLista(dadosFiltrados);

    } catch (error) {
        console.error("Erro geral no carregamento:", error);
    }
}


function renderizarLista(dados) {
    const scrollTexto = document.getElementById('lista-notificacoes-texto');
    const scrollIcones = document.getElementById('lista-notificacoes-icones');
    
    // Limpa as listas antes de começar
    scrollTexto.innerHTML = ''; 
    scrollIcones.innerHTML = '';

    if (!dados || dados.length === 0) {
        scrollTexto.innerHTML = '<div class="employee-row"><span>Sem registros</span></div>';
        return;
    }

    // Pega os 30 mais recentes
    const ultimosTrinta = dados.slice().reverse().slice(0, 30);

    ultimosTrinta.forEach((item, index) => {
        // SEGURANÇA: Garante que o texto existe para não travar o código
        const nomeEvento = item.evento || "Evento sem nome";
        const horaEvento = formatarHora(item.data);

        // 1. Cria a linha de texto
        const divTexto = document.createElement('div');
        divTexto.className = `employee-row ${index === 0 ? 'active-row' : ''}`;
        divTexto.innerHTML = `
            <span>${nomeEvento}</span>
            <span class="notif-time">${horaEvento}</span>
        `;
        scrollTexto.appendChild(divTexto);

        // 2. Cria o ícone lateral
        const divIcone = document.createElement('div');
        divIcone.className = 'side-icon-item';
        
        let icone = 'carro.png';
        // Verificação segura do texto para escolher o ícone
        if (nomeEvento.toLowerCase().includes('botao') || nomeEvento.toLowerCase().includes('caminhao')) {
            icone = 'caminhao.png';
        }
        
        divIcone.innerHTML = `<img src="${icone}" style="width: 20px;" onerror="this.src='carro.png'">`;
        scrollIcones.appendChild(divIcone);
    });
}


document.getElementById('btn-prev-period').onclick = () => {
    if(indicePeriodo < 3) {
        indicePeriodo++;
        // Atualiza os dois IDs imediatamente para não parecer travado
        const novoPeriodo = periodos[indicePeriodo];
        document.getElementById('display-periodo-card').innerText = novoPeriodo;
        if(document.getElementById('current-period-display')) {
            document.getElementById('current-period-display').innerText = novoPeriodo;
        }
        carregarDados();
    }
};


document.getElementById('btn-next-period').onclick = () => {
    if(indicePeriodo > 0) {
        indicePeriodo--;
        // Atualiza os dois IDs imediatamente para não parecer travado
        const novoPeriodo = periodos[indicePeriodo];
        document.getElementById('display-periodo-card').innerText = novoPeriodo;
        if(document.getElementById('current-period-display')) {
            document.getElementById('current-period-display').innerText = novoPeriodo;
        }
        carregarDados();
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