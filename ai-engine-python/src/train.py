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
    if 6 <= hora < 14:
        return 1 
    elif 14 <= hora < 22:
        return 2  
    elif 22 <= hora or hora < 6:
        return 3 
    else:
        return 0  

def treinar():
    try:
        print(f"🔌 Conectando ao banco: {DATABASE_NAME}...")
        client = MongoClient(MONGO_URI)
        db = client[DATABASE_NAME]
        colecao = db[COLLECTION_NAME]

        dados = list(colecao.find())
        if not dados:
            print(f"⚠️ Coleção '{COLLECTION_NAME}' vazia no banco '{DATABASE_NAME}'!")
            return

        df = pd.DataFrame(dados)
        print(f"📊 {len(df)} registros carregados com sucesso.")

        df['dt'] = pd.to_datetime(df['data']) 
        
        df['hora_num'] = df['dt'].dt.hour
        df['dia_semana'] = df['dt'].dt.dayofweek
        df['turno'] = df['hora_num'].apply(categorizar_turno)

        df_modelo = df.groupby(['hora_num', 'dia_semana', 'turno']).size().reset_index(name='fluxo')

        X = df_modelo[['hora_num', 'dia_semana', 'turno']]
        y = df_modelo['fluxo']

        print("🤖 Treinando o modelo de previsão de tráfego...")
        try:
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            modelo = RandomForestRegressor(n_estimators=100, random_state=42)
            modelo.fit(X_train, y_train)
            precisao = modelo.score(X_test, y_test)
            print(f"📈 Precisão do modelo (R2): {precisao:.2f}")
        except:
            print("⚠️ Poucos dados para teste, treinando com a base completa...")
            modelo = RandomForestRegressor(n_estimators=100, random_state=42)
            modelo.fit(X, y)

        os.makedirs('../models', exist_ok=True)
        caminho_salvar = os.path.join('..', 'models', 'modelo_cancela.pkl')
        joblib.dump(modelo, caminho_salvar)
        
        print(f"✅ Sucesso! O arquivo '{caminho_salvar}' foi gerado.")

    except Exception as e:
        print(f"❌ Erro crítico: {e}")

if __name__ == "__main__":
    treinar()