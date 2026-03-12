import os
import random
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime, timedelta
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

def gerar_fluxo_completo(total_dias=14):
    uri = os.getenv("MONGO_URI")
    db_name = os.getenv("DATABASE_NAME")
    coll_name = os.getenv("COLLECTION_NAME")

    try:
        client = MongoClient(uri)
        db = client[db_name]
        colecao = db[coll_name]


        agora = datetime.now()
        data_inicial = agora - timedelta(days=total_dias)

        picos_turno = [
            {"h": 5, "m": 0, "vol": 800},   
            {"h": 14, "m": 24, "vol": 650}, 
            {"h": 23, "m": 24, "vol": 350}  
        ]

        print(f"Iniciando geração de dados para {total_dias} dias...")

        atual = data_inicial
        while atual <= agora:
            registros_dia = []
            
            if atual.weekday() < 5:
                for pico in picos_turno:
                    for _ in range(pico["vol"]):
                        offset = random.randint(-30, 30)
                        dt_ent = atual.replace(hour=pico["h"], minute=pico["m"]) + timedelta(minutes=offset)
                        
                        if dt_ent > agora: continue

                        registros_dia.append({
                            "evento": "Carro Entrando",
                            "data": dt_ent.isoformat(),
                            "tipo": "funcionario"
                        })

                        dt_sai = dt_ent + timedelta(hours=8, minutes=48, seconds=random.randint(0, 59))
                        if dt_sai <= agora:
                            registros_dia.append({
                                "evento": "Carro Saindo",
                                "data": dt_sai.isoformat(),
                                "tipo": "funcionario"
                            })

                for _ in range(80):
                    h_cam = random.randint(7, 19)
                    dt_cam_ent = atual.replace(hour=h_cam, minute=random.randint(0, 59))
                    if dt_cam_ent <= agora:
                        registros_dia.append({"evento": "Carro Entrando", "data": dt_cam_ent.isoformat(), "tipo": "caminhao"})
                        
                        dt_cam_sai = dt_cam_ent + timedelta(hours=random.randint(1, 3))
                        if dt_cam_sai <= agora:
                            registros_dia.append({"evento": "Carro Saindo", "data": dt_cam_sai.isoformat(), "tipo": "caminhao"})

            if registros_dia:
                colecao.insert_many(registros_dia)
                print(f"{atual.date()}: {len(registros_dia)} documentos inseridos.")

            atual += timedelta(days=1)

        print("\nBanco de dados populado com sucesso!")

    except Exception as e:
        print(f"Erro crítico: {e}")

if __name__ == "__main__":
    gerar_fluxo_completo(total_dias=14)