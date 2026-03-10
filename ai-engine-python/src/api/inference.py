import os
import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path
import numpy as np

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

def get_turno(h: int):
    if 5 <= h < 14: return 1
    elif 14 <= h < 23: return 2
    else: return 3

@app.post("/prever")
def realizar_previsao(entrada: DadosEntrada):
    if modelo is None: 
        return {"status": "erro", "mensagem": "Modelo não carregado"}
    try:
        if entrada.hora == -1:
            horas_teste = list(range(0, 24, 2))  
            total = 0
            for h in horas_teste:
                t = get_turno(h)
                df = pd.DataFrame([[h, entrada.dia_semana, t]], columns=['hora_num', 'dia_semana', 'turno'])
                pred = modelo.predict(df)[0]
                total += max(0, pred) 
            return {"fluxo_estimado": round(float(total), 2)}

        df = pd.DataFrame([[entrada.hora, entrada.dia_semana, entrada.turno]], columns=['hora_num', 'dia_semana', 'turno'])
        predicao = modelo.predict(df)[0]
        return {"fluxo_estimado": round(float(max(0, predicao)), 2)}  
    except Exception as e:
        return {"status": "erro", "mensagem": str(e)}

@app.get("/prever_dia_completo")
def prever_dia_completo(dia: int):
    if modelo is None: 
        return []
    resultados = []
    for h in range(0, 24): 
        t = get_turno(h)
        df = pd.DataFrame([[h, dia, t]], columns=['hora_num', 'dia_semana', 'turno'])
        pred = modelo.predict(df)[0]
        resultados.append({
            "hora": f"{h:02d}:00", 
            "fluxo": round(float(max(0, pred)), 1)
        })
    return resultados

@app.get("/estatisticas")
def obter_estatisticas():
    if modelo is None:
        return {"erro": "Modelo não carregado"}
    
    X_debug = pd.DataFrame({
        'hora_num': list(range(24)) * 7,
        'dia_semana': [d for d in range(7) for _ in range(24)],
        'turno': [get_turno(h) for h in range(24) for _ in range(7)]
    })
    
    preds = modelo.predict(X_debug)
    
    return {
        "min": float(np.min(preds)),
        "max": float(np.max(preds)),
        "media": float(np.mean(preds)),
        "mediana": float(np.median(preds)),
        "desvio_padrao": float(np.std(preds))
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)