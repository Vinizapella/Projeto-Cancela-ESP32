# README — Sistema de Controle de Acesso: Cancela Inteligente

> Documentação técnica completa de todos os arquivos do projeto

---

## Sumário

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Estrutura de Arquivos](#2-estrutura-de-arquivos)
3. [Firmware — main.ino](#3-firmware--mainio)
4. [Simulador — simulator_config.json e wokwi.toml](#4-simulador--simulator_configjson-e-wokwitoml)
5. [Node-RED — flows.json](#5-node-red--flowsjson)
6. [Python — data_generator.py](#6-python--data_generatorpy)
7. [Python — inference.py](#7-python--inferencepy)
8. [Machine Learning — modelo_cancela.pkl](#8-machine-learning--modelo_cancelapkl)
9. [Python — __init__.py](#9-python--__init__py)
10. [Frontend — index.html](#10-frontend--indexhtml)
11. [Frontend — analytics.html](#11-frontend--analyticshtml)
12. [CSS — main.css](#12-css--maincss)
13. [CSS — dashboard.css](#13-css--dashboardcss)
14. [JavaScript — app.js](#14-javascript--appjs)
15. [JavaScript — charts.js](#15-javascript--chartsjs)
16. [Fluxo Completo do Sistema](#16-fluxo-completo-do-sistema)
17. [Como Executar o Projeto](#17-como-executar-o-projeto)

---

## 1. Visão Geral do Projeto

Este projeto é um sistema completo de controle de acesso para cancelas de estacionamento/fábrica. Ele integra hardware (ESP32), comunicação IoT (MQTT), banco de dados em nuvem (MongoDB Atlas), inteligência artificial (modelo de previsão de fluxo) e um dashboard web para monitoramento em tempo real.

A arquitetura é composta por **cinco camadas principais**:

| Camada | Tecnologia | Responsabilidade |
|--------|-----------|-----------------|
| Firmware | ESP32 (Arduino/C++) | Controla sensores físicos, servo motor e comunicação MQTT |
| IoT Middleware | Node-RED | Recebe eventos MQTT e persiste no MongoDB |
| Backend IA | Python (FastAPI) | Serve a API REST e o modelo de previsão de fluxo |
| Banco de Dados | MongoDB Atlas | Armazena histórico de eventos e acessos |
| Frontend | HTML / CSS / JS | Dashboard visual com gráficos, notificações e gauges |

---

## 2. Estrutura de Arquivos

```
projeto/
├── firmware/
│   ├── main.ino                # Firmware do ESP32 (Arduino)
│   ├── simulator_config.json   # Configuração do simulador Wokwi
│   └── wokwi.toml              # Config de firmware para simulação
├── node-red/
│   └── flows.json              # Flows do Node-RED (MQTT -> MongoDB)
├── ml/
│   ├── modelo_cancela.pkl      # Modelo de IA serializado (scikit-learn)
│   ├── inference.py            # Servidor FastAPI de inferência
│   ├── data_generator.py       # Gerador de dados simulados no MongoDB
│   └── __init__.py             # Marcador de pacote Python
└── frontend/
    ├── index.html              # Página principal (modo normal)
    ├── analytics.html          # Página de previsões com IA
    ├── css/
    │   ├── main.css            # Estilos da página principal
    │   └── dashboard.css       # Estilos da página de analytics
    └── js/
        ├── app.js              # Lógica do dashboard principal
        └── charts.js           # Gráficos e integração com a IA
```

---

## 3. Firmware — main.ino

Arquivo principal do microcontrolador ESP32. Escrito em linguagem Arduino (C++). Responsável por controlar todos os periféricos físicos e enviar eventos via MQTT para o Node-RED.

### 3.1 Pinagem e Componentes

```cpp
#define TRIG_EXT   5   // Pino TRIG do sensor ultrassônico externo
#define ECHO_EXT  18   // Pino ECHO do sensor ultrassônico externo
#define TRIG_INT  19   // Pino TRIG do sensor ultrassônico interno
#define ECHO_INT  21   // Pino ECHO do sensor ultrassônico interno
#define SERVO_PIN 13   // Pino PWM do servo motor (cancela)
#define BTN_PIN    4   // Pino do botão físico de abertura manual
#define BUZZER_PIN 25  // Pino do buzzer (alarme sonoro)
```

### 3.2 Fluxo de Funcionamento

- **`setup()`** — Inicializa Wi-Fi, MQTT, servo motor e sensores
- **`loop()`** — Verifica sensores a cada ciclo; se detectar veículo, aciona lógica de abertura
- O **sensor externo** (`TRIG_EXT` / `ECHO_EXT`) detecta veículo se aproximando pelo lado de fora
- O **sensor interno** (`TRIG_INT` / `ECHO_INT`) detecta veículo passando pelo lado de dentro
- O **servo** abre a cancela (90 graus) e aguarda a passagem; fecha automaticamente após timeout
- Se o veículo demorar mais que o tempo configurado, o **buzzer** dispara alarme
- O **botão físico** (`BTN_PIN`) permite abertura manual em casos de emergência
- Cada evento é publicado via MQTT no tópico `cancela/status`

### 3.3 Eventos MQTT Publicados

```
"Carro Entrando"
"Carro Saindo"
"ALARME: Tempo Excedido"
"Aberta por: Botao Fisico"
```

Esses textos são exatamente os que aparecem nas notificações do dashboard frontend e são persistidos como campo `evento` no MongoDB.

---

## 4. Simulador — simulator_config.json e wokwi.toml

### 4.1 simulator_config.json

Arquivo de configuração do simulador **Wokwi** (plataforma online para simular hardware Arduino/ESP32). Define todos os componentes virtuais e as conexões elétricas entre eles.

**Campo `"parts"`** — lista todos os componentes virtuais:

| ID | Tipo | Descrição |
|----|------|-----------|
| `esp` | ESP32 DevKit v1 | Microcontrolador principal |
| `sensorExt` | HC-SR04 | Sensor ultrassônico externo (distância inicial: 100 cm) |
| `sensorInt` | HC-SR04 | Sensor ultrassônico interno (distância inicial: 100 cm) |
| `servo1` | Servo motor | Motor da cancela |
| `btn_manual` | Push button (verde) | Botão físico de abertura manual |
| `buzzer1` | Buzzer | Alarme sonoro (volume: 0.1) |

**Campo `"connections"`** — define cada fio de ligação entre pinos, incluindo a cor do cabo para visualização. Exemplos:

```json
["esp:D5",  "sensorExt:TRIG", "blue",   ["v0"]],
["esp:D18", "sensorExt:ECHO", "green",  ["v0"]],
["esp:D13", "servo1:PWM",     "orange", ["v0"]]
```

### 4.2 wokwi.toml

Arquivo de configuração que aponta os binários compilados pelo PlatformIO para uso na simulação Wokwi.

```toml
[wokwi]
version  = 1
firmware = '.pio/build/esp32dev/firmware.bin'  # Binário para upload/simulação
elf      = '.pio/build/esp32dev/firmware.elf'  # ELF com símbolos de debug
```

---

## 5. Node-RED — flows.json

Define o fluxo de processamento de mensagens no Node-RED. O Node-RED atua como **middleware** entre o ESP32 (via MQTT) e o MongoDB Atlas (banco de dados na nuvem).

### 5.1 Componentes do Flow

**Configurações de conexão:**

- **`mqtt-broker` (id: `66e4cc...`)** — Broker MQTT público HiveMQ (`broker.hivemq.com`, porta `1883`), protocolo MQTT v4, auto-connect ativo, sessão limpa
- **`mongodb4-client` (id: `08a0be...`)** — Conexão com MongoDB Atlas via URI `mongodb+srv://...`. Banco: `cancela_db`, pool máximo: 100 conexões, timeout de conexão: 30 segundos

**Nodes do fluxo principal:**

- **`mqtt in` (id: `93bd53...`)** — Escuta o tópico `cancela/status` com QoS 2 (entrega garantida). Ao receber uma mensagem, dispara dois caminhos paralelos: debug e processamento
- **`function 1` (id: `b5db5f...`)** — Transforma o payload bruto em documento MongoDB estruturado:
  ```javascript
  msg.payload = {
      evento:         msg.payload,         // texto vindo do ESP32
      data:           agora.toISOString(), // "2024-01-15T14:30:00.000Z"
      data_formatada: agora.toLocaleString('pt-BR'), // "15/01/2024 14:30:00"
      hora:           agora.getHours(),    // 0-23
      dispositivo:    "ESP32_Cancela_Zapella"
  }
  ```
- **`delay` (id: `96f824...`)** — Rate limiter: aceita no máximo **1 mensagem a cada 2 segundos**, descartando o excedente. Evita sobrecarga no MongoDB
- **`mongodb4` (id: `c95f5e...`)** — Persiste o documento na coleção `historico` do banco `cancela_db` via operação `insertOne`
- **`inject` (id: `1a4be7...`)** — Node de teste manual que publica a data atual no tópico MQTT (útil para testar o pipeline sem o hardware)
- **`catch` (id: `66bec3...`)** — Captura erros de qualquer node do flow e redireciona para o debug 2
- **Nodes `debug` 1, 2, 3** — Inspecionam o payload em diferentes pontos do pipeline pelo painel web do Node-RED

### 5.2 Fluxo de Dados

```
ESP32 ──[MQTT]──> HiveMQ Broker
                       │
                  Node-RED (mqtt in) ──> debug 1
                       │
                  function 1  (enriquece dados)
                       │
                  delay (rate limit: 1/2s)
                       │
                  MongoDB Atlas (insertOne → historico) ──> debug 3
```

---

## 6. Python — data_generator.py

Script de população de dados simulados no MongoDB. Gera **14 dias de histórico realista** de veículos para treinar e testar o sistema sem precisar do hardware físico.

### 6.1 Configuração

As variáveis são carregadas de um arquivo `.env` localizado 2 diretórios acima do script:

```
MONGO_URI        # URI de conexão com MongoDB Atlas
DATABASE_NAME    # Nome do banco de dados
COLLECTION_NAME  # Nome da coleção de destino
```

### 6.2 Lógica de Geração — Carros (dias úteis)

Simula os picos de fluxo típicos de uma indústria:

| Horário | Quantidade/hora | Contexto |
|---------|----------------|---------|
| 05h–07h | 300–400 | Entrada turno manhã |
| 08h–09h | 400–500 | Pico de entrada |
| 13h–14h | 450–550 | Entrada turno tarde / almoço |
| 21h–22h | 150–250 | Saída tarde / entrada noite |
| 10h–18h | 10–30 | Movimento diurno baixo |
| Demais | 0–5 | Madrugada |

Para cada carro, gera o evento de **entrada** e, **8 horas depois** (+0–15 min aleatórios), o evento de **saída**.

### 6.3 Lógica de Geração — Caminhões

**80 caminhões por dia** (apenas dias úteis). Para cada caminhão:

1. Gera `"ALARME: Tempo Excedido"` (caminhão não cabe na cancela automática)
2. 30 segundos depois: `"Aberta por: Botao Fisico"` (operador abre manualmente)
3. 2–4 horas depois: mesmo ciclo para a saída
4. Evento final: `"Carro Saindo"` para registrar a saída

### 6.4 Performance

Para evitar inserções lentas de documento por documento, acumula registros em **lotes de 5.000** e usa `insert_many()` do PyMongo, imprimindo progresso a cada lote enviado.

```python
if len(registros) > 5000:
    colecao.insert_many(registros)
    registros = []
    print(f"📡 Lote de 5000 registros enviado... (Data: {atual.date()})")
```

---

## 7. Python — inference.py

Servidor de API REST construído com **FastAPI**. Carrega o modelo de machine learning treinado e expõe um endpoint de previsão de fluxo de veículos.

### 7.1 Inicialização

```python
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.abspath(os.path.join(BASE_DIR, '../../../models/modelo_cancela.pkl'))
modelo     = joblib.load(MODEL_PATH)  # Carrega modelo scikit-learn na memória
```

O servidor inicia na porta `8000`. Se o modelo não for encontrado, o servidor sobe mesmo assim mas retorna `{"status": "erro"}` nas previsões.

### 7.2 CORS

Configurado com `allow_origins=["*"]` para aceitar requisições de qualquer origem — necessário para o frontend HTML (servido em porta diferente) conseguir chamar a API.

### 7.3 Schema de Entrada — `DadosEntrada`

```python
class DadosEntrada(BaseModel):
    hora:       int  # Hora do dia (0–23) ou -1 para modo semana
    dia_semana: int  # 0=Segunda ... 6=Domingo (padrão Python/datetime)
    turno:      int  # 1=Manhã, 2=Tarde, 3=Noite
```

### 7.4 Endpoint `POST /prever`

Possui **dois modos de operação**:

**Modo Hora Individual** (`hora != -1`):
```python
df = pd.DataFrame([[hora, dia_semana, turno]], columns=['hora_num', 'dia_semana', 'turno'])
predicao = modelo.predict(df)[0]
return {"fluxo_estimado": round(float(predicao), 2)}
```

**Modo Semana** (`hora == -1`):
```python
# Itera pelas 6 janelas horárias do dia
horas_dia = [6, 10, 14, 18, 22, 2]
for h in horas_dia:
    t = 1 if 6 <= h < 14 else 2 if 14 <= h < 22 else 3
    df = pd.DataFrame([[h, dia_semana, t]], columns=['hora_num', 'dia_semana', 'turno'])
    total += modelo.predict(df)[0]
return {"fluxo_estimado": round(float(total), 2)}
```

### 7.5 Features do Modelo

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `hora_num` | int | Hora do dia (0–23) |
| `dia_semana` | int | Dia da semana (0=Seg, 6=Dom) |
| `turno` | int | Turno (1=Manhã, 2=Tarde, 3=Noite) |
| **Target** | float | Fluxo estimado de veículos |

---

## 8. Machine Learning — modelo_cancela.pkl

Modelo de regressão treinado com **scikit-learn**, serializado com **joblib**. Estima o número de veículos esperados dado o horário, dia da semana e turno.

- **Formato:** joblib pickle (`.pkl`)
- **Features de entrada:** `hora_num` (int), `dia_semana` (int 0–6), `turno` (int 1–3)
- **Output:** fluxo estimado (float — número de veículos no período)
- O modelo foi treinado com dados históricos gerados pelo `data_generator.py` ou coletados do sistema real

**Para atualizar o modelo:**
```python
import joblib
joblib.dump(novo_modelo, 'modelo_cancela.pkl')
# Substituir o arquivo e reiniciar o servidor inference.py
```

---

## 9. Python — __init__.py

Arquivo vazio que marca o diretório como um **pacote Python**. Permite que outros módulos importem os módulos deste diretório usando import relativo. Não possui conteúdo funcional.

---

## 10. Frontend — index.html

Página principal do dashboard (**Modo Normal**). Exibe dados em tempo real do banco de dados via API REST backend.

### 10.1 Estrutura HTML

```
<body>
├── <header>                     # Barra lateral esquerda
│   ├── .logo-header             # Logo do sistema
│   ├── .gear-btn                # Botão configurações (gear icon rotativo no hover)
│   └── .profile-img             # Foto de perfil
└── <main>
    ├── .main-content
    │   ├── .main-left-area
    │   │   ├── <h1>             # Título "Controle de Acesso Cancela"
    │   │   └── .main-left
    │   │       ├── .option      # Botões: Modo Normal | Modo IA | Baixar CSV
    │   │       └── .shift-grid  # Seleção de turno (Matutino/Vespertino/Noturno)
    │   └── .main-right-area
    │       ├── .main-right      # Lista de notificações (texto + ícones)
    │       └── .access-status-container  # Status atual + botão Trocar Status
    └── .main-right-right        # Bloco visual da cancela
        ├── .image-entrada       # Imagem de fundo (gate-view.jpg)
        ├── .gate-header         # Título e ícone SVG
        ├── .turnos-resumo-container  # Resumo por turno (1°/2°/3°)
        ├── .gauge-wrapper       # Gauge SVG esquerdo (vagas)
        └── .gauge-wrapper-2     # Gauge SVG direito (eventos)
```

### 10.2 Gauges SVG

Os gauges são traçados com paths SVG descrevendo um arco de ~270 graus:

```svg
<path d="M 22 78 A 38 38 0 1 1 78 78" />
<!-- M 22 78    = ponto inicial (inferior esquerdo)
     A 38 38    = arco com raio 38
     0 1 1      = rotação 0, arco grande, sentido horário
     78 78      = ponto final (inferior direito) -->
```

- **`gauge-fill-vagas`** — barra vai reduzindo conforme o estacionamento enche
- **`gauge-fill-eventos`** — barra vai enchendo conforme mais eventos ocorrem
- O controle é feito via `stroke-dashoffset` manipulado pelo JavaScript

### 10.3 IDs Consumidos pelo app.js

| ID | Elemento | Função |
|----|----------|--------|
| `lista-notificacoes-texto` | `<div>` | Container das linhas de texto |
| `lista-notificacoes-icones` | `<div>` | Container dos ícones sincronizados |
| `display-periodo-card` | `<p>` | Exibe período atual (Hoje/Ontem/...) |
| `eventos-count` | `<span>` | Contador de eventos |
| `vagas-count` | `<span>` | Contador de vagas disponíveis |
| `status-display` | `<h2>` | Exibe "Entrada" ou "Saída" |
| `gate-title` | `<h1>` | Título principal do bloco da cancela |
| `count-label` | `<span>` | Legenda do gauge de eventos |
| `btn-refresh` | `<button>` | Atualiza dados imediatamente |
| `btn-prev-period` | `<button>` | Navega para período anterior (`<`) |
| `btn-next-period` | `<button>` | Navega para próximo período (`>`) |
| `btn-trocar-status` | `<button>` | Alterna entre entrada e saída |
| `Matutino` | `<button>` | Filtro por 1° turno |
| `Vespertino` | `<button>` | Filtro por 2° turno |
| `Noturno` | `<button>` | Filtro por 3° turno |
| `btn-baixar-csv` | `<button>` | Dispara download do relatório CSV |

---

## 11. Frontend — analytics.html

Página de previsões com **Inteligência Artificial** (Modo IA). Utiliza o modelo ML via FastAPI para mostrar estimativas de fluxo futuro.

### 11.1 Diferenças em relação ao index.html

- Importa **Chart.js via CDN** (`cdn.jsdelivr.net/npm/chart.js`)
- Não há lista de notificações — o espaço é usado para o **gráfico de linha principal**
- Os gauges mostram `"Previsão Entradas"` e `"Previsão Saídas"` ao invés de dados reais
- A navegação de período exibe `"Amanhã"` / `"Próxima Semana"` (previsão futura, não histórico)
- O ícone SVG na cancela é um círculo com lupa estilizado (busca/análise), em cor `#21D1D1`
- Carrega `js/charts.js` ao invés de `js/app.js`

### 11.2 Canvas dos Gráficos

| ID do Canvas | Tipo | Descrição |
|-------------|------|-----------|
| `linhaChart` | Linha | Entradas e Saídas estimadas por hora ou dia da semana |
| `barraChart` | Barra | Fluxo estimado por período (visualização alternativa) |
| `pizzaChart` | Pizza | Distribuição Carros vs Caminhões |

---

## 12. CSS — main.css

Arquivo de estilos da página principal (`index.html`). Tema escuro com acento **amarelo-neon** (`#d7ff00`).

### 12.1 Paleta de Cores

| Variável | Valor | Uso |
|----------|-------|-----|
| Fundo global | `#121212` | `body` |
| Fundo de cards | `#1f1f1f` | `header`, `.main-left`, `.main-right` |
| Botões inativos | `#2a2a2a` | `.btn-inactive`, `.button-ia` |
| Destaque principal | `#d7ff00` | Botões ativos, gauges, título da cancela |
| Texto secundário | `#efefef` | Textos em botões inativos |

### 12.2 Componentes Principais

**`body`**
```css
font-family: 'Inter', sans-serif;
font-weight: 300;
background-color: #121212;
display: flex;
margin-left: 40px;
```

**`header`** — barra lateral fixa de `150px` de largura e `846px` de altura, `border-radius: 20px`, `padding: 30px 0`

**`.gear-btn` / `.gear-icon`** — botão transparente; ao hover aplica `rotate(45deg)` e `filter: brightness(1)` para simular engrenagem girando

**`.main-content`** — container com gradiente diagonal que cria o efeito de aba:
```css
background: linear-gradient(-145deg, transparent 20%, #1f1f1f 20.5%);
border-radius: 20px 20px 0 0;
```

**`.main-left`** — card de `815x220px` com `border-radius: 0px 20px 20px 20px` (sem arredondamento superior esquerdo para encaixar na aba acima)

**`.button-time`** — botão amarelo-neon (`#d7ff00`), `border-radius: 100px`

**`.btn-pill.active`** — estado ativo usa `background-color: #d7ff00` com texto preto

**`.gauge-fill`** — path SVG com `stroke: #d7ff00` e animação `cubic-bezier(0.4, 0, 0.2, 1)` de `0.8s` no `stroke-dashoffset`

**`.value`** — número do gauge em `65px` com `text-shadow: 0 0 15px rgba(215, 255, 0, 0.6)` (glow amarelo)

### 12.3 Posicionamento dos Gauges

```css
/* Gauge esquerdo (vagas) */
.gauge-wrapper   { top: 40%; left: 20%; transform: translate(-50%, -50%); }

/* Gauge direito (eventos) */
.gauge-wrapper-2 { top: 40%; left: 80%; transform: translate(-50%, -50%); }
```

---

## 13. CSS — dashboard.css

Arquivo de estilos da página de analytics (`analytics.html`). Mesmo layout base do `main.css`, mas com tema **ciano/teal** (`#21D1D1`) ao invés de amarelo-neon.

### 13.1 Diferenças de Paleta

| Elemento | main.css | dashboard.css |
|---------|----------|---------------|
| Fundo global | `#121212` | `#0A1114` (mais escuro) |
| Fundo de cards | `#1f1f1f` | `#1A2326` |
| Cor de destaque | `#d7ff00` | `#21D1D1` |
| Sombra do gauge | `rgba(215, 255, 0, 0.5)` | `rgba(33, 209, 209, 0.5)` |

### 13.2 Diferenças Estruturais

- **Regra unificada** `.main-right, .main-right-right, .chart-box` — aplica `box-shadow` glow ciano padronizado em todos os cards de uma só vez
- **`.main-left`** — adiciona `border-top: none` para integrar visualmente com o `.main-content`
- **`.bottom-charts`** — posicionado `absolute` na parte inferior do `.main-right-right`, `height: 325px`, `z-index: 100` para ficar sobre a imagem de fundo
- **`.chart-box`** — usa `backdrop-filter: blur(10px)` para efeito glassmorphism sobre a imagem de fundo
- **`h1`, `.gate-title`** — recebem `text-shadow` ciano para efeito glow
- **`.gauge-wrapper`** — `top: 35%` (ligeiramente mais alto que os `40%` do main.css)

---

## 14. JavaScript — app.js

Lógica principal do dashboard em tempo real. Responsável por buscar dados da API backend, renderizar a lista de notificações, atualizar os gauges e gerenciar a navegação de períodos.

### 14.1 Constantes e Configuração

```js
const API_BASE         = 'http://localhost:8080/api'; // URL base do backend
const PERIODOS         = ["Hoje", "Ontem", "Esta Semana", "Semana Passada"];
const CAPACIDADE_TOTAL = 1381;  // Total de vagas do estacionamento
const GAUGE_ARC_LENGTH = 165;   // Comprimento total do arco SVG em unidades
```

### 14.2 Mapeamento de Endpoints

```js
const ENDPOINTS = {
    entrada: {
        "Hoje":          "/entradas/hoje",
        "Ontem":         "/entradas/ontem",
        "Esta Semana":   "/entradas/semana",
        "Semana Passada":"/entradas/semanapassada",
        vagas:           "/entradas/vagas",
        turno: {
            1: "/turno/entradas/primeiro",
            2: "/turno/entradas/segundo",
            3: "/turno/entradas/terceiro"
        }
    },
    saida: { /* mesmo padrão */ }
}
```

### 14.3 Estado Global

```js
let modoAtual          = 'entrada'; // 'entrada' | 'saida'
let indicePeriodo      = 0;         // índice em PERIODOS[] (0=Hoje)
let todasAsNotificacoes = [];       // cache dos dados carregados
let turnoSelecionado   = null;      // null | 1 | 2 | 3
```

### 14.4 `formatarHora(dataString)`

Converte uma string ISO (`2024-01-15T14:30:00`) para o formato brasileiro `dd/mm/yyyy hh:mm` usando `toLocaleString('pt-BR')`. Retorna `"00/00/0000 00:00"` em caso de erro de parse.

### 14.5 `atualizarGaugeVagas(vagasDisponiveis)`

```js
const proporcao = Math.min(Math.max(vagasDisponiveis / CAPACIDADE_TOTAL, 0), 1);
const offset    = GAUGE_ARC_LENGTH * (1 - proporcao);
path.style.strokeDashoffset = offset;
```

Barra **cheia** = todas as vagas livres (1381). Vai **reduzindo** conforme o estacionamento enche.

### 14.6 `atualizarGaugeEventos(count)`

Lógica inversa: barra vai **enchendo** conforme mais eventos ocorrem, tendo `CAPACIDADE_TOTAL` como máximo visual.

### 14.7 `renderizarLista(dados)`

Limpa e re-renderiza as duas listas sincronizadas a cada chamada:

1. Inverte o array (`.reverse()`) para mostrar os mais recentes primeiro
2. Limita a **30 itens** para performance
3. Para cada item, cria uma `.employee-row` com nome do evento e horário formatado
4. Detecta se é caminhão pelo nome do evento (contém `'botao'`, `'caminhao'` ou `'alarme'`) para escolher o ícone: `truck.png` ou `car.png`
5. O primeiro item recebe a classe `active-row` para destaque visual

### 14.8 `carregarDados()` — Função Principal

Executada no `load` e a cada **5 segundos** via `setInterval`:

```
1. atualizarPeriodoDisplay()       → sincroniza texto do período
2. fetch(/entradas/vagas)          → atualiza gauge e contador de vagas
3. Determina rota correta          → turnoSelecionado tem prioridade sobre indicePeriodo
4. fetch(rota)                     → busca eventos
5. renderizarLista(dados)          → atualiza lista e gauge de eventos
```

### 14.9 Eventos de Interface

| Elemento | Ação | Efeito |
|----------|------|--------|
| `btnRefresh` | `click` | Chama `carregarDados()` imediatamente |
| `btnPrev` | `click` | Avança no histórico (`indicePeriodo++`), reseta turno |
| `btnNext` | `click` | Volta no histórico (`indicePeriodo--`), reseta turno |
| `btnTrocarStatus` | `click` | Alterna `modoAtual` entre `'entrada'` e `'saida'` |
| `btnTurnos[1,2,3]` | `click` | Toggle — ativa ou desativa o filtro por turno |
| `listaTexto` | `scroll` | Espelha o scroll em `listaIcones` para manter sincronização |

### 14.10 Download CSV

```js
btnBaixarCsv.addEventListener('click', async () => {
    const response = await fetch(`${API_BASE}/entradas/relatorio/excel`);
    const blob     = await response.blob();
    const url      = window.URL.createObjectURL(blob);
    const a        = document.createElement('a');
    a.href         = url;
    a.download     = 'relatorio_cancela.csv';
    a.click();                          // dispara o download
    window.URL.revokeObjectURL(url);    // libera memória
});
```

---

## 15. JavaScript — charts.js

Responsável por toda a lógica da página de analytics (`analytics.html`). Inicializa os três gráficos Chart.js e integra com a API de IA para exibir previsões de fluxo futuro.

### 15.1 Variáveis Globais

```js
let meuGraficoLinha;           // Instância Chart.js — gráfico de linha
let meuGraficoBarra;           // Instância Chart.js — gráfico de barras
let meuGraficoPizza;           // Instância Chart.js — gráfico de pizza
const periodosTexto = ["Amanhã", "Próxima Semana"];
let indiceAtual = 0;           // Índice do período atual
```

### 15.2 `inicializarGraficos()`

Cria as três instâncias Chart.js com configurações visuais detalhadas:

**Gráfico de Linha (`linhaChart`)**
- Dois datasets: `Entradas (IA)` em `#00e5ff` (ciano) e `Saídas (IA)` em `#1f6feb` (azul)
- `fill: true` com área translúcida (`rgba(0, 229, 255, 0.05)`)
- `tension: 0.4` para curvas suaves, pontos de `radius: 7`

**Gráfico de Barras (`barraChart`)**
- Um dataset de fluxo estimado em ciano (`#00e5ff`)
- `borderRadius: 8` nas barras para visual moderno
- Grid no eixo Y com `rgba(255, 255, 255, 0.05)` (quase invisível)

**Gráfico de Pizza (`pizzaChart`)**
- Dois setores: `Carros` (`#1f6feb`) e `Caminhões` (`#00e5ff`)
- Legenda posicionada à direita, `borderWidth: 0`

### 15.3 `buscarPrevisoesIA(periodo)`

Função assíncrona central que consulta a FastAPI:

**Modo `'amanha'`:**
```js
// Descobre o dia da semana de amanhã
let d = new Date();
d.setDate(hoje.getDate() + 1);
const diaSimulado = d.getDay();

// Monta 6 requisições paralelas (uma por janela horária)
const endpoints = [6, 10, 14, 18, 22, 2].map(h => ({ hora: h, dia: diaSimulado }));
const resultados = await Promise.all(endpoints.map(p => fetch("/prever", {...})));
```

**Modo `'proxima-semana'`:**
```js
// 7 requisições com hora=-1 (modo semana da IA)
const endpoints = [0,1,2,3,4,5,6].map(d => ({ hora: -1, dia: d }));
// Labels mudam para ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
```

**Cálculo das saídas:**
```js
const dadosSaidas = dadosEntradas.map(v => Math.round(v * 0.75));
// Heurística: 75% dos carros que entram saem no mesmo período
```

**Distribuição no pizza:**
```js
const fluxoTotal = dadosEntradas.reduce((a, b) => a + b, 0);
meuGraficoPizza.data.datasets[0].data = [
    Math.round(fluxoTotal * 0.8),  // 80% carros
    Math.round(fluxoTotal * 0.2)   // 20% caminhões
];
```

### 15.4 `configurarFiltrosTurno()`

Mapeia os botões para índices no array de dados do gráfico de linha:

```js
const botoes = {
    'Matutino':   0,   // índice 0 = 06h
    'Vespertino': 2,   // índice 2 = 14h
    'Noturno':    4    // índice 4 = 22h
};
```

Lógica de toggle: clique em botão **ativo** desativa o filtro e recarrega o total do período. Clique em botão **inativo** ativa o filtro e chama `filtrarInterfacePorTurno(indice)`.

### 15.5 `filtrarInterfacePorTurno(indice)`

Aplica filtro visual para destacar um turno específico:

- Atualiza contadores superiores com os dados do ponto selecionado
- Recalcula pizza com os valores do turno (80% carros, 20% caminhões)
- **Efeito spotlight no gráfico de linha:** ponto selecionado fica com `radius: 12`, os demais com `radius: 0`
- **Destaque no gráfico de barras:** barra selecionada em ciano cheio, demais em `rgba(0, 229, 255, 0.1)` (10% de opacidade)

### 15.6 `configurarNavegacao()`

Gerencia os botões `<` e `>` de navegação. Ao trocar de período, reseta todos os botões de turno para o estado `.btn-inactive` e chama `buscarPrevisoesIA()` com o novo período.

### 15.7 Inicialização (`window.onload`)

```js
window.onload = () => {
    inicializarGraficos();    // Cria os três gráficos vazios
    configurarNavegacao();    // Ativa botões < e >
    configurarFiltrosTurno(); // Ativa botões de turno
    buscarPrevisoesIA();      // Carrega previsão inicial (amanhã)
};
```

---

## 16. Fluxo Completo do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        HARDWARE (ESP32)                          │
│  Sensor detecta veículo → Servo abre → MQTT publica evento      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ MQTT (cancela/status)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    HiveMQ MQTT Broker                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         NODE-RED                                  │
│  mqtt in → function (enriquece) → delay (1/2s) → MongoDB insert  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ insertOne
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MongoDB Atlas                                  │
│                  banco: cancela_db                               │
│                  coleção: historico                              │
└──────────┬────────────────────────────────────────────────────--┘
           │ REST API (porta 8080)                │ REST API (porta 8000)
           ▼                                      ▼
┌──────────────────────┐              ┌───────────────────────────┐
│  Backend Java/Spring │              │  FastAPI (inference.py)   │
│  /api/entradas/...   │              │  POST /prever             │
│  /api/saidas/...     │              │  modelo_cancela.pkl       │
└──────────┬───────────┘              └──────────────┬────────────┘
           │                                         │
           ▼                                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND WEB                                 │
│                                                                   │
│  index.html + app.js         analytics.html + charts.js          │
│  ├── Lista de notificações    ├── Gráfico de linha (IA)          │
│  ├── Gauges em tempo real     ├── Gráfico de barras              │
│  └── Filtros por turno/período└── Gráfico de pizza               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 17. Como Executar o Projeto

### 17.1 Pré-requisitos

- Python 3.8+
- Node.js (para Node-RED)
- PlatformIO ou Arduino IDE (para compilar o firmware)
- Conta MongoDB Atlas (ou MongoDB local)
- Arquivo `.env` configurado:
  ```env
  MONGO_URI=mongodb+srv://<usuario>:<senha>@cluster0.xxxx.mongodb.net/
  DATABASE_NAME=cancela_db
  COLLECTION_NAME=historico
  ```

### 17.2 Backend FastAPI (IA)

```bash
cd src/models
pip install fastapi uvicorn joblib pandas python-dotenv
uvicorn inference:app --host 0.0.0.0 --port 8000
# API disponível em: http://localhost:8000
```

### 17.3 Geração de Dados de Teste

```bash
cd src/data
pip install pymongo python-dotenv
python data_generator.py
# Insere ~14 dias de histórico simulado no MongoDB
```

### 17.4 Node-RED

```bash
npm install -g node-red
node-red
# Acesse http://localhost:1880
# Menu → Import → Cole o conteúdo de flows.json
```

### 17.5 Firmware ESP32

```bash
# Usando PlatformIO:
pio run --target upload

# Para simular com Wokwi (sem hardware):
# 1. Acesse wokwi.com
# 2. Importe simulator_config.json
# 3. Compile com PlatformIO e aponte para os binários no wokwi.toml
```

### 17.6 Frontend

```bash
cd frontend
python -m http.server 3000
# Acesse http://localhost:3000         → Modo Normal
# Acesse http://localhost:3000/analytics.html → Modo IA
```

---

*Documentação do Sistema Cancela Inteligente*
