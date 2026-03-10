import os
import pandas as pd
import joblib
import itertools
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

        query = {"evento": "Carro Entrando"}
        dados = list(colecao.find(query))
        
        if not dados:
            print("Sem dados no banco para treinar!")
            return

        df = pd.DataFrame(dados)
        
        df['dt'] = pd.to_datetime(df['data'], format='ISO8601', utc=True).dt.tz_convert('America/Sao_Paulo')
        
        # Extrair features
        df['hora_num'] = df['dt'].dt.hour
        df['dia_semana'] = df['dt'].dt.dayofweek
        df['minuto'] = df['dt'].dt.minute 
        
        df_counts = df.groupby(['hora_num', 'dia_semana']).size().reset_index(name='fluxo')

        horas = list(range(24))
        dias = list(range(7))
        grid = pd.DataFrame(list(itertools.product(horas, dias)), columns=['hora_num', 'dia_semana'])
        
        df_modelo = pd.merge(grid, df_counts, on=['hora_num', 'dia_semana'], how='left').fillna(0)

        df_modelo['turno'] = df_modelo['hora_num'].apply(
            lambda x: 1 if 5 <= x < 14 else 2 if 14 <= x < 23 else 3
        )

        X = df_modelo[['hora_num', 'dia_semana', 'turno']]
        y = df_modelo['fluxo']

        modelo = RandomForestRegressor(
            n_estimators=150,
            max_depth=15,
            min_samples_split=3,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        modelo.fit(X, y)

        caminho = BASE_DIR / "models" / 'modelo_cancela.pkl'
        os.makedirs(caminho.parent, exist_ok=True)
        joblib.dump(modelo, caminho)
        
        print(f"--- Treino Concluído ---")
        print(f"Registros processados: {len(df_modelo)}")
        print(f"Score de treino: {modelo.score(X, y):.3f}")
        print(f"Fluxo mínimo por hora: {y.min():.1f}")
        print(f"Fluxo máximo por hora: {y.max():.1f}")
        print(f"Fluxo médio: {y.mean():.1f}")
        print(f"Modelo salvo em: {caminho}")

    except Exception as e:
        print(f"Erro crítico no treino: {e}")

if __name__ == "__main__":
    treinar_modelo()