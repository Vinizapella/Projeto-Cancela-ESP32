import os
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

def gerar_relatorio_diario():
    try:
        client = MongoClient(os.getenv("MONGO_URI"))
        db = client[os.getenv("DATABASE_NAME")]
        colecao = db[os.getenv("COLLECTION_NAME")]

        dados = list(colecao.find({}, {"evento": 1, "data": 1, "_id": 0}))
        
        if not dados:
            print("❌ Banco de dados vazio!")
            return

        df = pd.DataFrame(dados)
        df['dt'] = pd.to_datetime(df['data']).dt.date 

        relatorio = df[df['evento'].isin(['Carro Entrando', 'Carro Saindo', 'ALARME: Tempo Excedido'])]
        
        resumo = relatorio.groupby(['dt', 'evento']).size().unstack(fill_value=0)

        print("\n📊 RELATÓRIO DE MOVIMENTAÇÃO DIÁRIA")
        print("=" * 60)
        print(resumo)
        print("=" * 60)
        print(f"Total de registros analisados: {len(df)}")

    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    gerar_relatorio_diario()