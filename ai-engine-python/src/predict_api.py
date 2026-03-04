import os
import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Caminho corrigido para src/models
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'modelo_cancela.pkl')

try:
    modelo = joblib.load(MODEL_PATH)
    print("🧠 IA Carregada com Sucesso!")
except Exception as e:
    modelo = None
    print(f"⚠️ Erro: {e}")

class DadosEntrada(BaseModel):
    hora: int
    dia_semana: int
    turno: int

@app.post("/prever")
def realizar_previsao(entrada: DadosEntrada):
    if modelo is None: return {"status": "erro"}

    try:
        # Modo Semana (Soma o dia)
        if entrada.hora == -1:
            horas_dia = [6, 10, 14, 18, 22, 2]
            total = 0
            for h in horas_dia:
                t = 1 if 6 <= h < 14 else 2 if 14 <= h < 22 else 3
                df = pd.DataFrame([[h, entrada.dia_semana, t]], columns=['hora_num', 'dia_semana', 'turno'])
                total += modelo.predict(df)[0]
            return {"fluxo_estimado": round(float(total), 2)}

        # Modo Hora Individual
        df = pd.DataFrame([[entrada.hora, entrada.dia_semana, entrada.turno]], columns=['hora_num', 'dia_semana', 'turno'])
        predicao = modelo.predict(df)[0]
        return {"fluxo_estimado": round(float(predicao), 2)}

    except Exception as e:
        return {"status": "erro", "mensagem": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)