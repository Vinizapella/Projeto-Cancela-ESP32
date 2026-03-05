import os
import random
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone # Importado timezone
from pathlib import Path

# Ajuste de caminho para o .env na raiz
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

def gerar_saidas_proporcionais():
    uri = os.getenv("MONGO_URI")
    db_name = os.getenv("DATABASE_NAME")
    coll_name = os.getenv("COLLECTION_NAME")

    try:
        client = MongoClient(uri)
        db = client[db_name]
        colecao = db[coll_name]

        print("🔍 Analisando entradas no banco para gerar saídas...")
        
        # Busca todas as entradas
        entradas = list(colecao.find({"evento": "Carro Entrando"}, {"data": 1, "tipo": 1, "_id": 0}))

        if not entradas:
            print("❌ Nenhuma entrada encontrada no banco!")
            return

        registros_saida = []
        # Define o "agora" com fuso horário UTC (padrão do MongoDB)
        agora_utc = datetime.now(timezone.utc)

        for doc in entradas:
            # Converte a string ISO para datetime com fuso horário
            dt_ent = datetime.fromisoformat(doc['data'])
            
            # Se a data vir sem fuso, forçamos UTC para permitir comparação
            if dt_ent.tzinfo is None:
                dt_ent = dt_ent.replace(tzinfo=timezone.utc)

            tipo = doc.get('tipo', 'funcionario')

            # Define permanência (8h-9h para func, 1h-3h para caminhão)
            if tipo == "funcionario":
                permanencia = timedelta(hours=8, minutes=random.randint(0, 45))
            else:
                permanencia = timedelta(hours=random.randint(1, 3), minutes=random.randint(0, 59))

            dt_sai = dt_ent + permanencia

            # Compara: só gera se a saída já teria ocorrido
            if dt_sai <= agora_utc:
                registros_saida.append({
                    "evento": "Carro Saindo",
                    "data": dt_sai.isoformat(),
                    "tipo": tipo,
                    "dispositivo": "Cancela_Saida_Zapella"
                })

        if registros_saida:
            # Insere em lotes de 1000 para o Atlas
            for i in range(0, len(registros_saida), 1000):
                colecao.insert_many(registros_saida[i:i + 1000])
            
            print(f"✅ Sucesso! Geradas {len(registros_saida)} saídas.")
        else:
            print("⚠️ Nenhuma saída pendente para as entradas atuais.")

    except Exception as e:
        print(f"❌ Erro ao processar saídas: {e}")

if __name__ == "__main__":
    gerar_saidas_proporcionais()
