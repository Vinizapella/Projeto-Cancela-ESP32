import os
import random
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime, timedelta
from pathlib import Path

# Ajuste automático de caminho para o .env na raiz da pasta ai-engine-python
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

        print(f"🚀 Gerando Fluxo Zapella (Entradas e Saídas) para {total_dias} dias...")

        atual = data_inicial
        while atual <= agora:
            if atual.weekday() < 5:  # Segunda a Sexta
                registros_dia = []
                
                for hora in range(24):
                    # Definição de volume por turno (Baseado no seu relato)
                    if 5 <= hora <= 7:     qtd = random.randint(600, 800) # Pico T1
                    elif 13 <= hora <= 14: qtd = random.randint(400, 550) # Pico T2
                    elif 21 <= hora <= 22: qtd = random.randint(150, 300) # Pico T3
                    elif 8 <= hora <= 18:  qtd = random.randint(20, 50)   # Comercial
                    else:                  qtd = random.randint(0, 10)    # Madrugada

                    for _ in range(qtd):
                        # --- GERAÇÃO DA ENTRADA ---
                        dt_ent = atual.replace(hour=hora, minute=random.randint(0,59), second=random.randint(0,59))
                        if dt_ent > agora: continue
                        
                        registros_dia.append({
                            "evento": "Carro Entrando",
                            "data": dt_ent.isoformat(),
                            "tipo": "funcionario"
                        })

                        # --- GERAÇÃO DA SAÍDA (Simula 8h a 9h de trabalho) ---
                        atraso_saida = timedelta(hours=8, minutes=random.randint(0, 45))
                        dt_sai = dt_ent + atraso_saida
                        
                        if dt_sai <= agora:
                            registros_dia.append({
                                "evento": "Carro Saindo",
                                "data": dt_sai.isoformat(),
                                "tipo": "funcionario"
                            })

                # --- GERAÇÃO DE CAMINHÕES (80/dia - Apenas Entrada e Saída rápida) ---
                for _ in range(random.randint(75, 85)):
                    h_cam = random.randint(7, 19)
                    dt_cam_ent = atual.replace(hour=h_cam, minute=random.randint(0,59))
                    if dt_cam_ent <= agora:
                        registros_dia.append({"evento": "ALARME: Tempo Excedido", "data": dt_cam_ent.isoformat(), "tipo": "caminhao"})
                        
                        # Caminhão sai em média 2 horas depois
                        dt_cam_sai = dt_cam_ent + timedelta(hours=random.randint(1, 3))
                        if dt_cam_sai <= agora:
                            registros_dia.append({"evento": "Carro Saindo", "data": dt_cam_sai.isoformat(), "tipo": "caminhao"})

                # Envio em lote por dia para o Atlas
                if registros_dia:
                    colecao.insert_many(registros_dia)
                    print(f"📡 {atual.date()}: {len(registros_dia)} movimentos sincronizados.")
            
            atual += timedelta(days=1)

        print("✅ Banco de dados populado com Entradas e Saídas!")

    except Exception as e:
        print(f"❌ Erro na geração: {e}")

if __name__ == "__main__":
    gerar_fluxo_completo(14)
