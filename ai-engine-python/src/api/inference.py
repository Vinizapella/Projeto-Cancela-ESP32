import os
import joblib
import pandas as pd
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from pathlib import Path
import numpy as np
from typing import List, Dict

# =============================================================
# CONFIGURAÇÃO DE AMBIENTE
# =============================================================
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# =============================================================
# MODELOS DE DADOS PARA O SWAGGER
# =============================================================
class DadosEntrada(BaseModel):
    hora: int = Field(..., ge=-1, le=23, example=8, description="Hora do dia (0-23). Use -1 para cálculo de fluxo total acumulado")
    dia_semana: int = Field(..., ge=0, le=6, example=0, description="Dia da semana (0=Segunda, 6=Domingo)")
    turno: int = Field(..., ge=1, le=3, example=1, description="Turno: 1 (Manhã), 2 (Tarde), 3 (Noite)")

class PrevisaoResponse(BaseModel):
    fluxo_estimado: float = Field(..., example=45.2)

class DetalheDia(BaseModel):
    hora: str = Field(..., example="08:00")
    fluxo: float = Field(..., example=12.5)

class EstatisticasResponse(BaseModel):
    min: float
    max: float
    media: float
    mediana: float
    desvio_padrao: float

# =============================================================
# INICIALIZAÇÃO DA API
# =============================================================
app = FastAPI(
    title="Motor de IA - Predição de Cancela",
    description="""
    API para estimativa e análise de fluxo de veículos utilizando o modelo **Random Forest**.
    
    ### Documentação de Integração:
    Esta API fornece os dados preditivos para o Dashboard em JavaScript
    """,
    version="1.0.0",
    contact={
        "name": "Vinicius dos Santos Zapella",
        "email": "vinicius_zapella@estudante.sesisenai.org.br",
    }
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================
# CARREGAMENTO DO MODELO
# =============================================================
MODEL_PATH = BASE_DIR / "models" / "modelo_cancela.pkl"
try:
    modelo = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None
except Exception as e:
    print(f"Erro ao carregar o modelo: {e}")
    modelo = None

# =============================================================
# FUNÇÕES AUXILIARES
# =============================================================
def get_turno(h: int):
    if 5 <= h < 14: return 1
    elif 14 <= h < 23: return 2
    else: return 3

# =============================================================
# ENDPOINTS
# =============================================================

@app.post("/prever", 
          tags=["Previsão"], 
          summary="Realizar predição de fluxo",
          response_model=PrevisaoResponse)
def realizar_previsao(entrada: DadosEntrada):
    """
    **Calcula a estimativa de veiculos:**
    - Se a hora for **-1**, realiza uma amostragem de 12 periodos para estimar o fluxo acumulado do dia
    - Se for uma hora valida (**0-23**), retorna a predição exata do modelo
    """
    if modelo is None: 
        raise HTTPException(status_code=500, detail="Modelo preditivo não encontrado no servidor")
    
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
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/prever_dia_completo", 
         tags=["Análise"], 
         summary="Prever fluxo para as 24 horas",
         response_model=List[DetalheDia])
def prever_dia_completo(
    dia: int = Query(..., ge=0, le=6, description="Dia da semana (0-6)")
):
    """
    Gera uma serie temporal de 24 pontos. Util para o componente de **Gráfico de Linhas** do Frontend
    """
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

@app.get("/estatisticas", 
         tags=["Análise"], 
         summary="Obter métricas do modelo",
         response_model=EstatisticasResponse)
def obter_estatisticas():
    """
    Retorna metricas descritivas (min, max, media) baseadas em todas as combinações de horarios
    """
    if modelo is None:
        raise HTTPException(status_code=500, detail="Modelo não carregado.")
    
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
    # Execução local na porta 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)