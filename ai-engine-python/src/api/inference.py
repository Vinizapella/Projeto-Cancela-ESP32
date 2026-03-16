import os
import joblib
import pandas as pd
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from pathlib import Path
import numpy as np

# Configuração de caminhos e ambiente
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# Inicialização do FastAPI com metadados para o Swagger
app = FastAPI(
    title="Motor de IA - Predição de Cancela",
    description="""
    API para estimativa e análise de fluxo de veículos utilizando o modelo **Random Forest Regressor**.
    
    ### Funcionalidades:
    * **Predição Pontual**: Estime o fluxo para uma hora e dia específicos.
    * **Análise Diária**: Gere uma lista de previsões para as 24h de um dia.
    * **Estatísticas**: Obtenha métricas gerais do comportamento do modelo.
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

# Carregamento do Modelo
MODEL_PATH = BASE_DIR / "models" / "modelo_cancela.pkl"
modelo = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None

# Esquema de Dados com exemplos para o Swagger
class DadosEntrada(BaseModel):
    hora: int = Field(..., ge=-1, le=23, example=8, description="Hora do dia (0-23). Use -1 para cálculo de fluxo total estimado.")
    dia_semana: int = Field(..., ge=0, le=6, example=0, description="Dia da semana (0=Segunda, 6=Domingo).")
    turno: int = Field(..., ge=1, le=3, example=1, description="Turno de trabalho: 1 (Manhã), 2 (Tarde), 3 (Noite).")

def get_turno(h: int):
    if 5 <= h < 14: return 1
    elif 14 <= h < 23: return 2
    else: return 3


@app.post("/prever", tags=["Previsão"], summary="Realizar predição de fluxo")
def realizar_previsao(entrada: DadosEntrada):
    """
    **Calcula a estimativa de veículos:**
    - Se a hora enviada for **-1**, o sistema realiza uma amostragem de 12 períodos para estimar o fluxo acumulado.
    - Se for uma hora válida (**0-23**), retorna a predição exata do modelo Random Forest.
    """
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

@app.get("/prever_dia_completo", tags=["Análise"], summary="Prever fluxo para as 24 horas")
def prever_dia_completo(
    dia: int = Query(..., ge=0, le=6, description="Dia da semana para gerar o gráfico (0-6)")
):
    """
    Gera uma série temporal de 24 pontos (uma para cada hora) para o dia selecionado. 
    Ideal para construção de **gráficos de linha** no frontend.
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

@app.get("/estatisticas", tags=["Análise"], summary="Obter métricas do modelo")
def obter_estatisticas():
    """
    Retorna métricas descritivas baseadas em todas as combinações possíveis de horários e dias.
    Útil para entender os limites de operação (mínimo, máximo e média).
    """
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