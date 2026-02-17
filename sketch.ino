#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

const char* ssid = "Wokwi-GUEST"; 
const char* password = "";
const char* mqtt_server = "broker.hivemq.com"; 

WiFiClient espClient;
PubSubClient client(espClient);
Servo cancela;

const int trigExt = 5, echoExt = 18;
const int trigInt = 19, echoInt = 21;
const int pinoServo = 13;
const int distDeteccao = 50;
const int pinoBotao = 4; 
const int pinoBuzzer = 25;

int estado = 0; 
unsigned long tempoAbertura = 0; 
unsigned long travaSensoresAte = 0; 

long lerDistancia(int trig, int echo) {
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long duracao = pulseIn(echo, HIGH, 30000);
  long d = duracao * 0.034 / 2;
  return (d <= 0) ? 400 : d;
}

void abrirCancela(String origem) {
  Serial.println("Abrindo: " + origem);
  cancela.write(90);
  
  String mensagem = "Aberta por: " + origem;
  client.publish("cancela/status", mensagem.c_str());
  
  delay(3000); 
  cancela.write(0);
  client.publish("cancela/status", "Livre");
}

void callback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (int i = 0; i < length; i++) { msg += (char)payload[i]; }
  if (msg == "ABRIR") {
    abrirCancela("Comando Remoto");
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
  
  pinMode(pinoBotao, INPUT_PULLUP);
  pinMode(pinoBuzzer, OUTPUT);
  cancela.attach(pinoServo);
  cancela.write(0);
  
  pinMode(trigExt, OUTPUT); pinMode(echoExt, INPUT);
  pinMode(trigInt, OUTPUT); pinMode(echoInt, INPUT);
  Serial.println("\nSistema Pronto!");
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("ESP32_Cancela_Zapella")) {
      client.subscribe("cancela/comando");
    } else { delay(5000); }
  }
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  if (digitalRead(pinoBotao) == LOW) { 
    abrirCancela("Botao Fisico");
  }

  if (millis() > travaSensoresAte) {
    long dExt = lerDistancia(trigExt, echoExt);
    long dInt = lerDistancia(trigInt, echoInt);

    if (estado == 0) {
      if (dExt < distDeteccao) {
        client.publish("cancela/status", "Carro Entrando"); 
        cancela.write(90);
        tempoAbertura = millis();
        estado = 1; 
      } 
      else if (dInt < distDeteccao) {
        client.publish("cancela/status", "Carro Saindo");
        cancela.write(90);
        tempoAbertura = millis();
        estado = 2; 
      }
    }
    else if (estado == 1) { 
      if (dInt < distDeteccao) {
        while(lerDistancia(trigInt, echoInt) < distDeteccao) { delay(100); }
        cancela.write(0);
        estado = 0;
        client.publish("cancela/status", "Livre");
      }
      else if (millis() - tempoAbertura > 15000) { 
        tone(pinoBuzzer, 1000);
        client.publish("cancela/status", "ALARME: Travado por 10s");
        delay(5000); 
        noTone(pinoBuzzer);
        cancela.write(0);
        travaSensoresAte = millis() + 10000; 
        estado = 0;
      }
    }
    else if (estado == 2) {
      if (dExt < distDeteccao) {
        while(lerDistancia(trigExt, echoExt) < distDeteccao) { delay(100); }
        cancela.write(0);
        estado = 0;
        client.publish("cancela/status", "Livre");
      }
      else if (millis() - tempoAbertura > 15000) { 
        tone(pinoBuzzer, 1000);
        client.publish("cancela/status", "ALARME: Travado por 10s");
        delay(5000);
        noTone(pinoBuzzer);
        cancela.write(0);
        travaSensoresAte = millis() + 10000; 
        estado = 0;
      }
    }
  }
  delay(50);
}