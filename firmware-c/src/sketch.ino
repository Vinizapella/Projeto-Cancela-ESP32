#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>


const char* ssid = "Wokwi-GUEST"; 
const char* password = "";
const char* mqtt_server = "broker.hivemq.com"; 


const int trigExt = 5, echoExt = 18;  
const int trigInt = 19, echoInt = 21; 
const int pinoServo = 13;
const int pinoBotao = 4; 
const int pinoBuzzer = 25;


const int distDeteccao = 50;
const unsigned long timeoutCancela = 15000;

WiFiClient espClient;
PubSubClient client(espClient);
Servo cancela;

int estado = 0; 
unsigned long tempoAbertura = 0; 
unsigned long travaSensoresAte = 0;
bool carroDetectadoNoSegundoSensor = false; 

long lerDistancia(int trig, int echo) {
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long duracao = pulseIn(echo, HIGH, 25000);
  long d = duracao * 0.034 / 2;
  return (d <= 0 || d > 400) ? 400 : d;
}

void abrirCancelaFisica() {
  cancela.write(90);
  tempoAbertura = millis();
  carroDetectadoNoSegundoSensor = false; 
}

void fecharCancelaFisica() {
  cancela.write(0);
  estado = 0;
  client.publish("cancela/status", "Livre");
  travaSensoresAte = millis() + 3000; 
}

void dispararAlarme() {
  tone(pinoBuzzer, 1000);
  client.publish("cancela/status", "ALARME: Tempo Excedido");
  delay(2000);
  noTone(pinoBuzzer);
  fecharCancelaFisica();
}

void callback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (int i = 0; i < length; i++) { msg += (char)payload[i]; }
  if (msg == "ABRIR" && estado == 0) {
    abrirCancelaFisica();
    estado = 3; 
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  pinMode(pinoBotao, INPUT_PULLUP);
  pinMode(pinoBuzzer, OUTPUT);
  pinMode(trigExt, OUTPUT); pinMode(echoExt, INPUT);
  pinMode(trigInt, OUTPUT); pinMode(echoInt, INPUT);
  cancela.attach(pinoServo);
  cancela.write(0);
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void reconnect() {
  if (!client.connected() && WiFi.status() == WL_CONNECTED) {
    if (client.connect("ESP32_Cancela_Zapella")) {
      client.subscribe("cancela/comando");
    }
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!client.connected()) reconnect();
    client.loop();
  }

  if (digitalRead(pinoBotao) == LOW && estado == 0) { 
    abrirCancelaFisica();
    estado = 3; 
    delay(200); 
  }

  if (millis() > travaSensoresAte) {
    long dExt = lerDistancia(trigExt, echoExt);
    long dInt = lerDistancia(trigInt, echoInt);

    switch (estado) {
      case 0:
        if (dExt < distDeteccao) {
          Serial.println("Entrada Detectada");
          client.publish("cancela/status", "Entrada Detectada");
          abrirCancelaFisica();
          estado = 1; 
        } 
        else if (dInt < distDeteccao) {
          Serial.println("Saida Detectada");
          client.publish("cancela/status", "Saida Detectada");
          abrirCancelaFisica();
          estado = 2;
        }
        break;

      case 1: 
        
        if (dInt < distDeteccao) carroDetectadoNoSegundoSensor = true;
        
       
        if (carroDetectadoNoSegundoSensor && dInt > distDeteccao) {
          fecharCancelaFisica();
        }
        if (millis() - tempoAbertura > timeoutCancela) dispararAlarme();
        break;

      case 2: 
        
        if (dExt < distDeteccao) carroDetectadoNoSegundoSensor = true;
        
        
        if (carroDetectadoNoSegundoSensor && dExt > distDeteccao) {
          fecharCancelaFisica();
        }
        if (millis() - tempoAbertura > timeoutCancela) dispararAlarme();
        break;

      case 3:
        if (millis() - tempoAbertura > 5000) fecharCancelaFisica();
        break;
    }
  }
  delay(10); 
}