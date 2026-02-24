    // URL base da sua API Spring Boot (ajuste a porta se não for 8080)
            const API_URL = 'http://localhost:8080/api/estacionamento';

            // Função para formatar a data que vem do Mongo em um formato brasileiro legível
            function formatarData(dataString) {
        if (!dataString) return "Data não registrada";

        // Se a data já contiver barras (ex: 20/02/2026), ela já está formatada pelo Node-RED
        if (typeof dataString === 'string' && dataString.includes('/')) {
            return dataString;
        }

        // Caso contrário, tenta converter (para registros antigos ou formato ISO da IA)
        const data = new Date(dataString);
        
        // Verifica se a conversão resultou em uma data válida
        if (isNaN(data.getTime())) {
            return "Formato Inválido";
        }

        return data.toLocaleString('pt-BR', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }

            // Função principal para buscar todos os dados
            async function carregarDados() {
    try {
        // 1. Buscar Vagas (Adicionada a CRASE ` no início e no fim)
        const resVagas = await fetch(`${API_URL}/vagas`);
        const vagas = await resVagas.json();
        document.getElementById('vagas-count').innerText = vagas;

        // 2. Buscar Entradas
        const resEntradas = await fetch(`${API_URL}/entradas`);
        const entradas = await resEntradas.json();
        document.getElementById('entradas-count').innerText = entradas.length;
        renderizarLista(entradas, 'lista-entradas', 'text-blue-600');

        // 3. Buscar Saídas
        const resSaidas = await fetch(`${API_URL}/saidas`);
        const saidas = await resSaidas.json();
        document.getElementById('saidas-count').innerText = saidas.length;
        renderizarLista(saidas, 'lista-saidas', 'text-red-600');

    } catch (error) {
        console.error("Erro ao buscar dados da API:", error);
        // Comente o alert abaixo se ele estiver incomodando durante os testes
        // alert("Erro ao conectar com a API. Verifique se o Spring Boot está rodando.");
    }
}

            // Função auxiliar para desenhar a lista no HTML
            function renderizarLista(dados, idElemento, corTexto) {
                const ul = document.getElementById(idElemento);
                ul.innerHTML = ''; // Limpa a lista antes de desenhar

                if (dados.length === 0) {
                    ul.innerHTML = '<li class="py-3 text-gray-500">Nenhum registro encontrado.</li>';
                    return;
                }

                // Inverte o array para mostrar os mais recentes primeiro e pega apenas os 20 últimos
                const dadosRecentes = dados.slice().reverse().slice(0, 20);

                dadosRecentes.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'py-3 flex justify-between items-center';
                    
                    li.innerHTML = `
                        <div>
                            <p class="font-semibold ${corTexto}">${item.evento || 'Evento Desconhecido'}</p>
                            <p class="text-xs text-gray-500">${item.local || 'Local não informado'}</p>
                        </div>
                        <span class="text-sm text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
                            ${formatarData(item.data)}
                        </span>
                    `;
                    ul.appendChild(li);
                });
            }

            // Carrega os dados assim que a página abre
            window.onload = carregarDados;

            // BÔNUS: Atualiza a tela automaticamente a cada 10 segundos
            setInterval(carregarDados, 10000);