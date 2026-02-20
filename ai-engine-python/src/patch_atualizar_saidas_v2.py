import os
import random
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

def executar_patch_blindado():
    try:
        client = MongoClient(os.getenv("MONGO_URI"))
        db = client[os.getenv("DATABASE_NAME")]
        colecao = db[os.getenv("COLLECTION_NAME")]

        print("🔍 Buscando entradas de carros para gerar saídas de 8h...")
        
        # Busca entradas que ainda não foram marcadas pelo patch
        query = {"evento": "Carro Entrando", "dispositivo": {"$ne": "Patch_Sincronizado_V2"}}
        entradas = list(colecao.find(query))
        
        if not entradas:
            print("✅ Banco já está atualizado ou nenhuma entrada encontrada.")
            return

        novas_saidas = []
        ids_processados = []

        for doc in entradas:
            # Tratamento robusto para o campo 'data'
            dt_raw = doc.get('data')
            if isinstance(dt_raw, datetime):
                dt_ent = dt_raw
            elif isinstance(dt_raw, str):
                dt_ent = datetime.fromisoformat(dt_raw.replace("Z", "+00:00"))
            else:
                continue # Pula se o formato for inválido

            # Lógica de 8 horas + respiro aleatório
            dt_sai = dt_ent + timedelta(hours=8, minutes=random.randint(0, 15))
            
            # Só gera se a saída já aconteceu
            if dt_sai < datetime.now():
                novas_saidas.append({
                    "evento": "Carro Saindo",
                    "data": dt_sai.isoformat() if isinstance(dt_raw, str) else dt_sai,
                    "hora": dt_sai.hour,
                    "dispositivo": "Patch_Sincronizado_V2"
                })
                ids_processados.append(doc['_id'])

        if novas_saidas:
            # 1. Insere as saídas
            colecao.insert_many(novas_saidas)
            
            # 2. Marca as entradas para não repetir o processo
            colecao.update_many(
                {"_id": {"$in": ids_processados}},
                {"$set": {"dispositivo": "Patch_Sincronizado_V2"}}
            )
            print(f"🚀 Sucesso! {len(novas_saidas)} saídas inseridas e sincronizadas.")
        else:
            print("⚠️ Nenhuma saída pendente para o passado.")

    except Exception as e:
        print(f"❌ Erro crítico: {e}")

if __name__ == "__main__":
    executar_patch_blindado()