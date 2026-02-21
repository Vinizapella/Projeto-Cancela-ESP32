import os
import random
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

def gerar_sistema_completo(total_dias=14):
    client = MongoClient(os.getenv("MONGO_URI"))
    db = client[os.getenv("DATABASE_NAME")]
    colecao = db[os.getenv("COLLECTION_NAME")]

    registros = []
    agora = datetime.now()
    data_inicial = agora - timedelta(days=total_dias)

    print(f"🚀 Iniciando geração massiva: Carros (1000/turno) + Caminhões (80/dia)")

    atual = data_inicial
    while atual <= agora:
        if atual.weekday() < 5:  
            for hora in range(24):
                qtd_carros = 0
                if 5 <= hora <= 7: qtd_carros = random.randint(300, 400)    
                elif 8 <= hora <= 9: qtd_carros = random.randint(400, 500)  
                elif 13 <= hora <= 14: qtd_carros = random.randint(450, 550)
                elif 21 <= hora <= 22: qtd_carros = random.randint(150, 250)
                elif 10 <= hora <= 18: qtd_carros = random.randint(10, 30)  
                else: qtd_carros = random.randint(0, 5)

                for _ in range(qtd_carros):
                    dt_ent = atual.replace(hour=hora, minute=random.randint(0,59), second=random.randint(0,59))
                    if dt_ent > agora: continue

                    registros.append({
                        "evento": "Carro Entrando",
                        "data": dt_ent.isoformat(),
                        "hora": hora,
                        "dispositivo": "Simulador_Zapella_V3"
                    })

                    dt_sai = dt_ent + timedelta(hours=8, minutes=random.randint(0, 15))
                    if dt_sai <= agora:
                        registros.append({
                            "evento": "Carro Saindo",
                            "data": dt_sai.isoformat(),
                            "hora": dt_sai.hour,
                            "dispositivo": "Simulador_Zapella_V3"
                        })

            for _ in range(80):
                h_cam = random.randint(6, 20)
                m_cam = random.randint(0, 50)
                dt_cam_ent = atual.replace(hour=h_cam, minute=m_cam)
                
                if dt_cam_ent <= agora:
                    registros.append({"evento": "ALARME: Tempo Excedido", "data": dt_cam_ent.isoformat(), "hora": h_cam, "dispositivo": "Cancela_Caminhao"})
                    registros.append({"evento": "Aberta por: Botao Fisico", "data": (dt_cam_ent + timedelta(seconds=30)).isoformat(), "hora": h_cam, "dispositivo": "Cancela_Caminhao"})
                    
                    dt_cam_sai = dt_cam_ent + timedelta(hours=random.randint(2, 4))
                    if dt_cam_sai <= agora:
                        registros.append({"evento": "ALARME: Tempo Excedido", "data": dt_cam_sai.isoformat(), "hora": dt_cam_sai.hour, "dispositivo": "Cancela_Caminhao"})
                        registros.append({"evento": "Aberta por: Botao Fisico", "data": (dt_cam_sai + timedelta(seconds=30)).isoformat(), "hora": dt_cam_sai.hour, "dispositivo": "Cancela_Caminhao"})
                        registros.append({"evento": "Carro Saindo", "data": (dt_cam_sai + timedelta(seconds=60)).isoformat(), "hora": dt_cam_sai.hour, "dispositivo": "Cancela_Caminhao"})

        if len(registros) > 5000:
            colecao.insert_many(registros)
            registros = []
            print(f"📡 Lote de 5000 registros enviado... (Data: {atual.date()})")
        
        atual += timedelta(days=1)

    if registros:
        colecao.insert_many(registros)
    
    print(f"✅ Finalizado! O banco agora reflete a realidade total da Zapella.")

if __name__ == "__main__":
    gerar_sistema_completo(14)