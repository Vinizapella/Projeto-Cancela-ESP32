import os
import random
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

def gerar_fluxo_caminhoes(total_dias=14):
    client = MongoClient(os.getenv("MONGO_URI"))
    db = client[os.getenv("DATABASE_NAME")]
    colecao = db[os.getenv("COLLECTION_NAME")]

    registros = []
    data_final = datetime.now()
    data_inicial = data_final - timedelta(days=total_dias)

    print(f"🚛 Gerando fluxo de 80 caminhões/dia por {total_dias} dias...")

    atual = data_inicial
    while atual <= data_final:
        if atual.weekday() < 6:  
            for _ in range(80):
                hora_ent = random.randint(6, 20)
                dt_ent = atual.replace(hour=hora_ent, minute=random.randint(0,55), second=random.randint(0,59))
                
                registros.append({
                    "evento": "ALARME: Tempo Excedido",
                    "data": dt_ent.isoformat(),
                    "hora": hora_ent,
                    "dispositivo": "ESP32_Cancela_Caminhao"
                })
                registros.append({
                    "evento": "Aberta por: Botao Fisico",
                    "data": (dt_ent + timedelta(seconds=30)).isoformat(),
                    "hora": hora_ent,
                    "dispositivo": "ESP32_Cancela_Caminhao"
                })

                permanencia = random.randint(2, 5)
                dt_sai = dt_ent + timedelta(hours=permanencia)
                
                if dt_sai <= data_final:
                    registros.append({
                        "evento": "ALARME: Tempo Excedido",
                        "data": dt_sai.isoformat(),
                        "hora": dt_sai.hour,
                        "dispositivo": "ESP32_Cancela_Caminhao"
                    })
                    registros.append({
                        "evento": "Aberta por: Botao Fisico",
                        "data": (dt_sai + timedelta(seconds=20)).isoformat(),
                        "hora": dt_sai.hour,
                        "dispositivo": "ESP32_Cancela_Caminhao"
                    })
                    registros.append({
                        "evento": "Carro Saindo",
                        "data": (dt_sai + timedelta(seconds=40)).isoformat(),
                        "hora": dt_sai.hour,
                        "dispositivo": "ESP32_Cancela_Caminhao"
                    })
        
        if len(registros) > 2000:
            colecao.insert_many(registros)
            registros = []
        atual += timedelta(days=1)

    if registros:
        colecao.insert_many(registros)
    print(f"✅ Fluxo de caminhões inserido com sucesso!")

if __name__ == "__main__":
    gerar_fluxo_caminhoes(14)