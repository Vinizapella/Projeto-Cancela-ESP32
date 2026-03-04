import os
import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Inicializa a API
app = FastAPI(title="Previsor IA - Cancela Zapella")

# CORS para permitir que o Front-end (JavaScript) acesse a API sem ser bloqueado
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Caminho do modelo treinado
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models', 'modelo_cancela.pkl')

# Carrega o modelo de IA na memória ao iniciar a API
try:
    modelo = joblib.load(MODEL_PATH)
    print("🧠 Modelo Preditivo Carregado com Sucesso!")
except Exception as e:
    modelo = None
    print(f"⚠️ Erro ao carregar o modelo. Rode o train.py primeiro. Erro: {e}")

# Estrutura de dados esperada pelo endpoint
class DadosEntrada(BaseModel):
    hora: int
    dia_semana: int
    turno: int

@app.get("/")
def read_root():
    """Rota raiz para verificar se a API está online."""
    status = "Online e Operante" if modelo else "Online, mas Modelo Ausente"
    return {"message": "IA da Cancela Online!", "status_modelo": status}

@app.post("/prever")
def realizar_previsao(entrada: DadosEntrada):
    """Rota que recebe a hora/dia/turno e devolve a previsão de fluxo."""
    if modelo is None:
        return {"status": "erro", "mensagem": "Modelo não treinado ou não encontrado."}

    try:
        # Formata a entrada para o padrão que a IA entende
        input_df = pd.DataFrame(
            [[entrada.hora, entrada.dia_semana, entrada.turno]], 
            columns=['hora_num', 'dia_semana', 'turno']
        )
        
        # Realiza a predição
        predicao = modelo.predict(input_df)[0]
        
        return {
            "status": "sucesso",
            "fluxo_estimado": round(float(predicao), 2),
            "unidade": "veículos/hora",
            "parametros_recebidos": {
                "hora": entrada.hora,
                "dia_semana": entrada.dia_semana,
                "turno": entrada.turno
            }
        }
    except Exception as e:
        return {"status": "erro", "mensagem": str(e)}

if __name__ == "__main__":
    import uvicorn
    print("🚀 API de Previsão rodando na porta 8000...")
    # Executa o servidor FastAPI
    uvicorn.run(app, host="0.0.0.0", port=8000)