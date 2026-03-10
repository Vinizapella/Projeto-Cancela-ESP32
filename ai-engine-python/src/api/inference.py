import os
import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = BASE_DIR / "models" / "modelo_cancela.pkl"
modelo = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None

class DadosEntrada(BaseModel):
    hora: int
    dia_semana: int
    turno: int

@app.post("/prever")
def realizar_previsao(entrada: DadosEntrada):
    if modelo is None: return {"status": "erro", "mensagem": "Modelo não carregado"}
    try:
        if entrada.hora == -1:
            horas_teste = [6, 10, 14, 18, 22, 2]
            total = 0
            for h in horas_teste:
                t = 1 if 6 <= h < 14 else 2 if 14 <= h < 22 else 3
                df = pd.DataFrame([[h, entrada.dia_semana, t]], columns=['hora_num', 'dia_semana', 'turno'])
                total += modelo.predict(df)[0]
            return {"fluxo_estimado": round(float(total), 2)}

        df = pd.DataFrame([[entrada.hora, entrada.dia_semana, entrada.turno]], columns=['hora_num', 'dia_semana', 'turno'])
        predicao = modelo.predict(df)[0]
        return {"fluxo_estimado": round(float(predicao), 2)}
    except Exception as e:
        return {"status": "erro", "mensagem": str(e)}

@app.get("/prever_dia_completo")
def prever_dia_completo(dia: int):
    if modelo is None: return []
    resultados = []
    for h in range(0, 24, 2):
        t = 1 if 6 <= h < 14 else 2 if 14 <= h < 22 else 3
        df = pd.DataFrame([[h, dia, t]], columns=['hora_num', 'dia_semana', 'turno'])
        pred = modelo.predict(df)[0]
        resultados.append({"hora": f"{h:02d}:00", "fluxo": round(float(pred), 1)})
    return resultados

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)