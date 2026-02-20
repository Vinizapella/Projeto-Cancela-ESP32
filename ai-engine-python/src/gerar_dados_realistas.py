import os
import random
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

def gerar_trafego_massivo(total_dias=14):
    client = MongoClient(os.getenv("MONGO_URI"))
    db = client[os.getenv("DATABASE_NAME")]
    colecao = db[os.getenv("COLLECTION_NAME")]

    registros = []
    data_final = datetime.now()
    data_inicial = data_final - timedelta(days=total_dias)

    print(f"⏳ Gerando ~3.000 carros/dia por {total_dias} dias...")

    atual = data_inicial
    while atual <= data_final:
        if atual.weekday() < 5:  
            for hora in range(24):
                if 5 <= hora <= 7:      
                    quantidade = random.randint(300, 400) 
                elif 8 <= hora <= 9:    
                    quantidade = random.randint(400, 500) 
                elif 13 <= hora <= 14: 
                    quantidade = random.randint(450, 550) 
                elif 21 <= hora <= 22:  
                    quantidade = random.randint(150, 250) 
                elif 10 <= hora <= 12 or 15 <= hora <= 18: 
                    quantidade = random.randint(10, 30)
                else:                  
                    quantidade = random.randint(0, 5)

                for _ in range(quantidade):
                    minuto = random.randint(0, 59)
                    data_registro = atual.replace(hour=hora, minute=minuto, second=random.randint(0,59))
                    
                    registros.append({
                        "evento": "Carro Entrando",
                        "data": data_registro.isoformat(),
                        "hora": hora,
                        "dispositivo": "Simulador_Massivo_Zapella"
                    })
        
        if len(registros) > 5000:
            colecao.insert_many(registros)
            registros = []
        
        atual += timedelta(days=1)

    if registros:
        colecao.insert_many(registros)
    
    print(f"✅ Finalizado! Agora o banco tem volume real para os turnos.")

if __name__ == "__main__":
    gerar_trafego_massivo(14)