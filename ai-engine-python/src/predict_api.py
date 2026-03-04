import os
import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

app = FastAPI(title="Previsor IA - Cancela Zapella")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ajuste do caminho conforme sua estrutura src/models
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'modelo_cancela.pkl')

try:
    modelo = joblib.load(MODEL_PATH)
    print("🧠 Modelo Preditivo Carregado!")
except Exception as e:
    modelo = None
    print(f"⚠️ Erro ao carregar o modelo: {e}")

class DadosEntrada(BaseModel):
    hora: int
    dia_semana: int
    turno: int

@app.post("/prever")
def realizar_previsao(entrada: DadosEntrada):
    if modelo is None:
        return {"status": "erro", "mensagem": "Modelo ausente."}

    try:
        # LÓGICA PARA MUDAR DE HORA PARA DIA
        # Se recebermos hora -1, calculamos a soma das previsões do dia todo
        if entrada.hora == -1:
            # Simulamos as principais horas de movimento (ex: 06h às 22h)
            horas_foco = [6, 8, 10, 12, 14, 16, 18, 20, 22]
            total_dia = 0
            
            for h in horas_foco:
                t = 1 if 6 <= h < 14 else 2 if 14 <= h < 22 else 3
                df = pd.DataFrame([[h, entrada.dia_semana, t]], 
                                 columns=['hora_num', 'dia_semana', 'turno'])
                total_dia += modelo.predict(df)[0]
            
            return {
                "status": "sucesso",
                "fluxo_estimado": round(float(total_dia), 2),
                "unidade": "veículos/dia"
            }

        # PREVISÃO NORMAL (POR HORA)
        input_df = pd.DataFrame(
            [[entrada.hora, entrada.dia_semana, entrada.turno]], 
            columns=['hora_num', 'dia_semana', 'turno']
        )
        predicao = modelo.predict(input_df)[0]
        
        return {
            "status": "sucesso",
            "fluxo_estimado": round(float(predicao), 2),
            "unidade": "veículos/hora"
        }

    except Exception as e:
        return {"status": "erro", "mensagem": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)