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
    hora: int = Field(..., ge=-1, le=23, examples=[8], description="Hora do dia (0-23). Use -1 para cálculo de fluxo total acumulado.")
    dia_semana: int = Field(..., ge=0, le=6, examples=[0], description="Dia da semana (0=Segunda, 6=Domingo).")
    turno: int = Field(..., ge=1, le=3, examples=[1], description="Turno: 1 (Manhã), 2 (Tarde), 3 (Noite).")

class PrevisaoResponse(BaseModel):
    fluxo_estimado: float = Field(..., examples=[45.2], description="Quantidade estimada de veículos.")

class DetalheDia(BaseModel):
    hora: str = Field(..., examples=["08:00"], description="Horário formatado.")
    fluxo: float = Field(..., examples=[12.5], description="Fluxo estimado para o horário.")

class EstatisticasResponse(BaseModel):
    min: float = Field(..., examples=[2.1], description="Menor fluxo previsto.")
    max: float = Field(..., examples=[120.5], description="Maior fluxo previsto.")
    media: float = Field(..., examples=[45.3], description="Média aritmética dos fluxos.")
    mediana: float = Field(..., examples=[42.0], description="Valor central das predições.")
    desvio_padrao: float = Field(..., examples=[15.8], description="Desvio padrão dos dados preditos.")

# =============================================================
# INICIALIZAÇÃO DA API
# =============================================================
app = FastAPI(
    title="Motor de IA - Predição de Cancela",
    description="""
    API para estimativa e análise de fluxo de veículos utilizando o modelo **Random Forest**.
    
    ### Documentação de Integração:
    Esta API fornece os dados preditivos para o Dashboard em JavaScript. 
    Lida com predições pontuais, séries temporais e estatísticas globais do modelo.
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
          response_model=PrevisaoResponse,
          responses={
              200: {"description": "Predição calculada com sucesso."},
              400: {"description": "Erro de Lógica: Erro interno durante o cálculo do modelo de ML."},
              422: {"description": "Erro de Validação: Dados enviados fora das regras estipuladas no JSON (ex: hora 25)."},
              500: {"description": "Erro Crítico: Modelo preditivo .pkl não encontrado no servidor."}
          })
def realizar_previsao(entrada: DadosEntrada):
    """
    **Calcula a estimativa de veículos:**
    - Se a hora for **-1**, realiza uma amostragem de 12 períodos para estimar o fluxo acumulado do dia.
    - Se for uma hora válida (**0-23**), retorna a predição exata do modelo.
    """
    if modelo is None: 
        raise HTTPException(status_code=500, detail="Modelo preditivo não encontrado no servidor.")
    
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
        raise HTTPException(status_code=400, detail=f"Erro ao calcular predição: {str(e)}")


@app.get("/prever_dia_completo", 
         tags=["Análise"], 
         summary="Prever fluxo para as 24 horas",
         response_model=List[DetalheDia],
         responses={
             200: {"description": "Série temporal gerada com sucesso."},
             422: {"description": "Erro de Validação: Parâmetro 'dia' ausente ou inválido na URL."},
             500: {"description": "Erro Crítico: Modelo preditivo .pkl não encontrado no servidor."}
         })
def prever_dia_completo(
    dia: int = Query(..., ge=0, le=6, description="Dia da semana (0=Segunda, 6=Domingo)")
):
    """
    Gera uma série temporal completa de 24 pontos (um para cada hora do dia).
    Útil para preencher o componente de **Gráfico de Linhas** do Dashboard no Frontend.
    """
    if modelo is None: 
        raise HTTPException(status_code=500, detail="Modelo preditivo não encontrado no servidor.")
    
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
         response_model=EstatisticasResponse,
         responses={
             200: {"description": "Estatísticas geradas com sucesso."},
             500: {"description": "Erro Crítico: Modelo preditivo .pkl não encontrado no servidor."}
         })
def obter_estatisticas():
    """
    Retorna métricas descritivas globais (Mínimo, Máximo, Média, Mediana e Desvio Padrão) 
    baseadas na predição de todas as combinações possíveis de horários e dias da semana.
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