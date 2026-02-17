#include <ESP32Servo.h>

const int trigExt = 5, echoExt = 18;
const int trigInt = 19, echoInt = 21;
const int pinoServo = 13;
const int distDeteccao = 50;

Servo cancela;

int estado = 0; 

long lerDistancia(int trig, int echo) {
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long duracao = pulseIn(echo, HIGH, 30000);
  long d = duracao * 0.034 / 2;
  return (d <= 0) ? 400 : d;
}

void setup() {
  Serial.begin(115200);
  cancela.attach(pinoServo);
  cancela.write(0);
  pinMode(trigExt, OUTPUT); pinMode(echoExt, INPUT);
  pinMode(trigInt, OUTPUT); pinMode(echoInt, INPUT);
  Serial.println("SISTEMA PRONTO: Aguardando aproximação...");
}

void loop() {
  long dExt = lerDistancia(trigExt, echoExt);
  long dInt = lerDistancia(trigInt, echoInt);

  if (estado == 0) {
    if (dExt < distDeteccao) {
      Serial.println("Carro detectado por FORA. Abrindo...");
      cancela.write(90);
      estado = 1; 
    } 
    else if (dInt < distDeteccao) {
      Serial.println("Carro detectado por DENTRO. Abrindo...");
      cancela.write(90);
      estado = 2; 
    }
  }

  else if (estado == 1) {
    if (dInt < distDeteccao) {
      Serial.println("Carro passando pelo sensor interno...");
      while(lerDistancia(trigInt, echoInt) < distDeteccao) { delay(100); }
      Serial.println("Passagem concluída. Fechando...");
      delay(1000); 
      cancela.write(0);
      estado = 0;
    }
  }

  else if (estado == 2) {
    if (dExt < distDeteccao) {
      Serial.println("Carro passando pelo sensor externo...");
      while(lerDistancia(trigExt, echoExt) < distDeteccao) { delay(100); }
      Serial.println("Saída concluída. Fechando...");
      delay(1000);
      cancela.write(0);
      estado = 0;
    }
  }

  delay(50);
}