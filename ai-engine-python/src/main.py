import os
import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# 1. Configuração do App e CORS
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Carregamento do Modelo
# Ajustamos o caminho para subir um nível e entrar em 'models'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, '..', 'models', 'modelo_cancela.pkl')

if os.path.exists(MODEL_PATH):
    modelo = joblib.load(MODEL_PATH)
    print("✅ Modelo carregado com sucesso!")
else:
    print(f"❌ Erro: Arquivo {MODEL_PATH} não encontrado. Rode o treino primeiro.")

class DadosEntrada(BaseModel):
    hora: int
    dia_semana: int
    turno: int

# 3. Rotas
@app.post("/prever")
def realizar_previsao(entrada: DadosEntrada):
    try:
        input_df = pd.DataFrame([[entrada.hora, entrada.dia_semana, entrada.turno]], 
                                columns=['hora_num', 'dia_semana', 'turno'])
        
        predicao = modelo.predict(input_df)[0]
        
        return {
            "status": "sucesso",
            "fluxo_estimado": round(float(predicao), 2),
            "unidade": "veículos/hora"
        }
    except Exception as e:
        return {"status": "erro", "mensagem": str(e)}

@app.get("/")
def read_root():
    return {"message": "IA da Cancela Online e Pronta!"}

if __name__ == "__main__":
    import uvicorn
    print("🚀 API de Previsão rodando na porta 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)