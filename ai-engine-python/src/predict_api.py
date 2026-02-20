import os
import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

MODEL_PATH = os.path.join('..', 'models', 'modelo_cancela.pkl')
modelo = joblib.load(MODEL_PATH)

class DadosEntrada(BaseModel):
    hora: int
    dia_semana: int
    turno: int

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
    return {"message": "IA da Cancela Online!"}

if __name__ == "__main__":
    import uvicorn
    print("🚀 API de Previsão rodando na porta 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)