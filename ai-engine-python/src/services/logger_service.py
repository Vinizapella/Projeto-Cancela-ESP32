import os
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

def gerar_relatorio_diario():
    try:
        client = MongoClient(os.getenv("MONGO_URI"))
        db = client[os.getenv("DATABASE_NAME")]
        colecao = db[os.getenv("COLLECTION_NAME")]

        dados = list(colecao.find({}, {"evento": 1, "data": 1, "_id": 0}))
        
        if not dados:
            print("Banco de dados vazio! Rode o data_generator primeiro.")
            return

        df = pd.DataFrame(dados)
        df['dt'] = pd.to_datetime(df['data']).dt.date 

        resumo = df.groupby(['dt', 'evento']).size().unstack(fill_value=0)

        print("\nRELATÓRIO DE MOVIMENTAÇÃO ZAPELLA")
        print("=" * 70)
        print(resumo)
        print("-" * 70)
        
        total_alarmes = df[df['evento'] == 'ALARME: Tempo Excedido'].shape[0]
        print(f"Total de Caminhões (Alarmes): {total_alarmes}")
        print(f"Total de Registros: {len(df)}")
        print("=" * 70)

    except Exception as e:
        print(f"Erro ao gerar relatório: {e}")

if __name__ == "__main__":
    gerar_relatorio_diario()