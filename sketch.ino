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
int estado = 0; 

long lerDistancia(int trig, int echo) {
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long duracao = pulseIn(echo, HIGH, 30000);
  long d = duracao * 0.034 / 2;
  return (d <= 0) ? 400 : d;
}

void setup_wifi() {
  delay(10);
  Serial.print("Conectando WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println(" Conectado!");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Tentando MQTT...");
    if (client.connect("ESP32_Cancela_Zapella")) { 
      Serial.println(" Conectado ao Broker!");
      client.subscribe("cancela/comando");
    } else {
      delay(5000);
    }
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (int i = 0; i < length; i++) { msg += (char)payload[i]; }

  if (msg == "ABRIR") {
    Serial.println("Comando Remoto: Abrindo Cancela");
    cancela.write(90);
    client.publish("cancela/status", "Aberta Manualmente");
    delay(3000); 
    cancela.write(0);
    client.publish("cancela/status", "Livre");
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
  pinMode(pinoBotao, INPUT_PULLUP);
  cancela.attach(pinoServo);
  cancela.write(0);
  pinMode(trigExt, OUTPUT); pinMode(echoExt, INPUT);
  pinMode(trigInt, OUTPUT); pinMode(echoInt, INPUT);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  if (digitalRead(pinoBotao) == LOW) { 
    Serial.println("Botão Físico: Abrindo...");
    client.publish("cancela/status", "Abertura Manual (Wokwi)");
    cancela.write(90);
    delay(3000); 
    cancela.write(0);
    client.publish("cancela/status", "Livre");
  }

  long dExt = lerDistancia(trigExt, echoExt);
  long dInt = lerDistancia(trigInt, echoInt);

  if (estado == 0) {
    if (dExt < distDeteccao) {
      Serial.println("Entrada Detectada");
      client.publish("cancela/status", "Carro Entrando"); 
      cancela.write(90);
      estado = 1; 
    } 
    else if (dInt < distDeteccao) {
      Serial.println("Saída Detectada");
      client.publish("cancela/status", "Carro Saindo");
      cancela.write(90);
      estado = 2; 
    }
  }
  else if (estado == 1) {
    if (dInt < distDeteccao) {
      while(lerDistancia(trigInt, echoInt) < distDeteccao) { delay(100); }
      client.publish("cancela/status", "Livre - Entrada Concluída");
      delay(1000); 
      cancela.write(0);
      estado = 0;
    }
  }
  else if (estado == 2) {
    if (dExt < distDeteccao) {
      while(lerDistancia(trigExt, echoExt) < distDeteccao) { delay(100); }
      client.publish("cancela/status", "Livre - Saída Concluída");
      delay(1000);
      cancela.write(0);
      estado = 0;
    }
  }
  delay(50);
}