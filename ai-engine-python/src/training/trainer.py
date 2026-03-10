import os
import pandas as pd
import joblib
from pymongo import MongoClient
from dotenv import load_dotenv
from sklearn.ensemble import RandomForestRegressor
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

def treinar_modelo():
    try:
        client = MongoClient(os.getenv("MONGO_URI"))
        db = client[os.getenv("DATABASE_NAME")]
        colecao = db[os.getenv("COLLECTION_NAME")]

        query = {"evento": {"$in": ["Carro Entrando", "ALARME: Tempo Excedido"]}}
        dados = list(colecao.find(query))
        
        if not dados:
            print("Sem dados no banco!")
            return

        df = pd.DataFrame(dados)
        df['dt'] = pd.to_datetime(df['data'], utc=True).dt.tz_convert('America/Sao_Paulo')
        
        df['hora_num'] = df['dt'].dt.hour
        df['dia_semana'] = df['dt'].dt.dayofweek
        df['turno'] = df['hora_num'].apply(lambda x: 1 if 6 <= x < 14 else 2 if 14 <= x < 22 else 3)

        df_modelo = df.groupby(['hora_num', 'dia_semana', 'turno']).size().reset_index(name='fluxo')

        X = df_modelo[['hora_num', 'dia_semana', 'turno']]
        y = df_modelo['fluxo']

        modelo = RandomForestRegressor(n_estimators=100, random_state=42)
        modelo.fit(X, y)

        caminho = BASE_DIR / "models" / 'modelo_cancela.pkl'
        os.makedirs(caminho.parent, exist_ok=True)
        joblib.dump(modelo, caminho)
        print(f"Modelo treinado com sucesso e salvo em: {caminho}")

    except Exception as e:
        print(f"Erro no treino: {e}")

if __name__ == "__main__":
    treinar_modelo()