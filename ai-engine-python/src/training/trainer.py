import os
import pandas as pd
import joblib
from pymongo import MongoClient
from dotenv import load_dotenv
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from pathlib import Path

# --- AJUSTE DINÂMICO DE CAMINHO PARA O .ENV ---
# Pega o diretório atual do script e sobe 2 níveis (src/training -> ai-engine-python)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "cancela_db")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "historico")

def categorizar_turno(hora: int) -> int:
    """
    1: Manhã (06h às 13h59)
    2: Tarde (14h às 21h59)
    3: Noite/Madrugada (22h às 05h59)
    """
    if 6 <= hora < 14:
        return 1 
    elif 14 <= hora < 22:
        return 2  
    else:
        return 3 

def treinar_modelo():
    try:
        print(f"🔗 Conectando ao banco de dados: {DATABASE_NAME}...")
        client = MongoClient(MONGO_URI)
        db = client[DATABASE_NAME]
        colecao = db[COLLECTION_NAME]

        # Busca dados relevantes para o fluxo (Entradas e Alarmes/Caminhões)
        query = {"evento": {"$in": ["Carro Entrando", "ALARME: Tempo Excedido"]}}
        dados = list(colecao.find(query, {"data": 1, "_id": 0}))
        
        if not dados:
            print("⚠️ Nenhuma entrada encontrada para treinar! Verifique se rodou o data_generator.")
            return

        df = pd.DataFrame(dados)
        print(f"📊 {len(df)} registros carregados para processamento.")

        # --- TRATAMENTO DEFINITIVO DE DATA E FUSO HORÁRIO ---
        # utc=True resolve o erro do "Z" e ISO8601 automaticamente
        # errors='coerce' evita que dados corrompidos travem o código
        df['dt'] = pd.to_datetime(df['data'], utc=True, errors='coerce')
        
        # Remove linhas que não puderam ser convertidas
        df = df.dropna(subset=['dt'])
        
        # Converte para o fuso horário local (Zapella - Jaraguá do Sul)
        df['dt'] = df['dt'].dt.tz_convert('America/Sao_Paulo')
        
        # Extração de Features para a IA
        df['hora_num'] = df['dt'].dt.hour
        df['dia_semana'] = df['dt'].dt.dayofweek
        df['turno'] = df['hora_num'].apply(categorizar_turno)

        # Agrupa para descobrir o fluxo real por hora/dia/turno
        df_modelo = df.groupby(['hora_num', 'dia_semana', 'turno']).size().reset_index(name='fluxo')

        # X = Características (Input) | y = O que queremos prever (Output: Fluxo)
        X = df_modelo[['hora_num', 'dia_semana', 'turno']]
        y = df_modelo['fluxo']

        print("🧠 Treinando o modelo preditivo (Random Forest)...")
        
        # Divide 80% para treino e 20% para teste de precisão
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Criação da Floresta Aleatória (Modelo robusto para este tipo de dado)
        modelo = RandomForestRegressor(n_estimators=100, random_state=42)
        modelo.fit(X_train, y_train)
        
        precisao = modelo.score(X_test, y_test)
        print(f"📈 Precisão do modelo (R²): {precisao:.2f}")

        # --- SALVAMENTO DO MODELO ---
        # Garante que a pasta models exista na raiz do projeto
        pasta_models = BASE_DIR / "models"
        os.makedirs(pasta_models, exist_ok=True)
        
        caminho_salvar = pasta_models / 'modelo_cancela.pkl'
        joblib.dump(modelo, caminho_salvar)
        
        print(f"✅ Sucesso! O 'cérebro' da IA foi atualizado em: {caminho_salvar}")

    except Exception as e:
        print(f"❌ Erro crítico durante o treinamento: {e}")

if __name__ == "__main__":
    treinar_modelo()
