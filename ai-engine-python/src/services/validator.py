import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, "../../../.env")
load_dotenv(ENV_PATH)

import os
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

def verificar():
    client = MongoClient(os.getenv("MONGO_URI"))
    db = client[os.getenv("DATABASE_NAME")]
    colecao = db[os.getenv("COLLECTION_NAME")]

    dados = list(colecao.find({}, {"data": 1, "_id": 0}))
    
    if not dados:
        print("❌ Nenhum dado encontrado no banco.")
        return

    df = pd.DataFrame(dados)
    df['dt'] = pd.to_datetime(df['data'])
    
    dias_unicos = sorted(df['dt'].dt.strftime('%d/%m/%Y').unique())
    
    print(f"📅 Total de registros: {len(df)}")
    print("🗓️ Dias encontrados no banco:")
    for dia in dias_unicos:
        print(f" - {dia}")

if __name__ == "__main__":
    verificar()