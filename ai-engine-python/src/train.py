import os
import pandas as pd
import joblib
from pymongo import MongoClient
from dotenv import load_dotenv
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "cancela_db")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "historico")

def categorizar_turno(hora):
    if 6 <= hora < 14: return 1 
    elif 14 <= hora < 22: return 2  
    else: return 3 

def treinar():
    try:
        print(f"🔌 Conectando ao banco: {DATABASE_NAME}...")
        client = MongoClient(MONGO_URI)
        db = client[DATABASE_NAME]
        colecao = db[COLLECTION_NAME]

        query = {"evento": {"$in": ["Carro Entrando", "ALARME: Tempo Excedido"]}}
        dados = list(colecao.find(query))
        
        if not dados:
            print(f"⚠️ Nenhuma entrada encontrada para treinar!")
            return

        df = pd.DataFrame(dados)
        print(f"📊 {len(df)} registros de entrada carregados (Carros + Caminhões).")

        df['dt'] = pd.to_datetime(df['data']) 
        df['hora_num'] = df['dt'].dt.hour
        df['dia_semana'] = df['dt'].dt.dayofweek
        df['turno'] = df['hora_num'].apply(categorizar_turno)

        df_modelo = df.groupby(['hora_num', 'dia_semana', 'turno']).size().reset_index(name='fluxo')

        X = df_modelo[['hora_num', 'dia_semana', 'turno']]
        y = df_modelo['fluxo']

        print("🤖 Treinando o modelo com padrões de turnos e logística...")
        
        # Treino
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        modelo = RandomForestRegressor(n_estimators=100, random_state=42)
        modelo.fit(X_train, y_train)
        
        precisao = modelo.score(X_test, y_test)
        print(f"📈 Precisão do modelo (R2): {precisao:.2f}")

        caminho_base = os.path.dirname(os.path.abspath(__file__))
        pasta_models = os.path.join(caminho_base, '..', 'models')
        os.makedirs(pasta_models, exist_ok=True)
        
        caminho_salvar = os.path.join(pasta_models, 'modelo_cancela.pkl')
        joblib.dump(modelo, caminho_salvar)
        
        print(f"✅ Sucesso! O 'cérebro' da IA foi salvo em: {caminho_salvar}")

    except Exception as e:
        print(f"❌ Erro crítico: {e}")

if __name__ == "__main__":
    treinar()