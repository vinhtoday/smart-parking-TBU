/*
 * =================================================================================================*
 *                     BAI DO XE THONG MINH - PHIEN BAN TOI UU
 * =================================================================================================*
 *
 * >>> SUA SO CHO DO O DUOI DAY ROI NAP LAI ARDUINO <<<
 *
 * Dau noi:
 * Arduino UNO R3 vs LCD 16x2 I2C
 * 5V <-> VCC  ;   GND <-> GND  ;   A4 <-> SDA  ;   A5 <-> SCL
 *
 * Arduino UNO R3 vs Module RC522 (RFID)
 * 3.3V <-> VCC  ;   GND <-> GND
 * D10 <-> SDA   ;   D13 <-> SCK  ;   D11 <-> MOSI  ;   D12 <-> MISO  ;   D9  <-> RST
 *
 * Arduino UNO R3 vs Dong co servo
 * 5V <-> Day do  ;   GND <-> Day den  ;   D8 <-> Day Vang
 *
 * Arduino UNO R3 vs Module Cam bien phat hien lua
 * 5V <-> VCC  ;   GND <-> GND  ;   D4 <-> D0
 *
 * Arduino UNO R3 vs Module Cam Bien Khi Gas MQ2
 * 5V <-> VCC  ;   GND <-> GND  ;   D3 <-> D0
 * =================================================================================================*
 */

#include <Wire.h>
#include <SPI.h>
#include <MFRC522.h>
#include <LiquidCrystal_I2C.h>
#include <Servo.h>
#include <EEPROM.h>

// ==========================================================================================
//  PHAN 1: CAU HINH HE THONG
// ==========================================================================================

#define MASTER_UID        0x4B9C0705   // The Admin
#define EEPROM_SIGNATURE  0xC1D0       // Chu ky kiem tra EEPROM hop le (da doi de clear data cu)
#define MAX_SLOTS         6            // >>> SO CHO DO TOI DA - SUA SO NAY ROI NAP LAI <<<
#define MAX_VIP_SIZE      3            // So the VIP toi da
int maxCars = MAX_SLOTS;               // So cho do thuc te
#define BARRIER_DELAY     3000         // Thoi gian mo barrier (ms)
#define SYNC_INTERVAL     30000        // Gui FULL_SYNC moi 30 giay

// --- Chan ket noi ---
#define PIN_RFID_SS       10
#define PIN_RFID_RST      9
#define PIN_SERVO         8
#define PIN_LED_GREEN     7
#define PIN_LED_RED       6
#define PIN_BUZZER        5
#define PIN_FLAME         4
#define PIN_MQ2           3
#define PIN_RESET_BTN     A0

// --- Khoi tao doi tuong ---
MFRC522 mfrc522(PIN_RFID_SS, PIN_RFID_RST);
LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo barrierServo;

// ==========================================================================================
//  PHAN 2: BIEN TOAN CUC (da toi uu giam RAM)
// ==========================================================================================

uint32_t parkedUIDs[MAX_SLOTS];
uint32_t parkedTimestamps[MAX_SLOTS];
int parkedCount = 0;
int vipParkedCount = 0;

uint32_t vipList[MAX_VIP_SIZE];
int currentVipCount = 0;

// Trang thai an toan (NON-BLOCKING - khong dung while() chan he thong)
bool isFireActive = false;
bool isGasWarningActive = false;
bool gasAlarmSent = false;
bool flameAlarmSent = false;
unsigned long gasAlarmStartTime = 0;
unsigned long lastBlinkTime = 0;
bool blinkState = false;

unsigned long lastSyncTime = 0;
unsigned long bootTime = 0;

// Serial buffer - dung char array thay String (tranh heap fragmentation)
#define SERIAL_BUF_SIZE  32
char serialBuf[SERIAL_BUF_SIZE];
int serialBufPos = 0;

// ==========================================================================================
//  PHAN 3: GUI DU LIEU SERIAL - KHONG DUNG ArduinoJson (TIET KIEM ~600 BYTES RAM)
// ==========================================================================================

// Chuyen uint32 sang chuoi hex 8 ky tu
void uidToHex(uint32_t uid, char* buf) {
    const char* hexChars = "0123456789ABCDEF";
    for (int i = 7; i >= 0; i--) {
        buf[i] = hexChars[uid & 0x0F];
        uid >>= 4;
    }
    buf[8] = '\0';
}

void sendRFIDScan(uint32_t uid) {
    char hex[9];
    uidToHex(uid, hex);
    Serial.print("{\"type\":\"RFID_SCAN\",\"data\":{\"uid\":\"");
    Serial.print(hex);
    Serial.println("\"}}");
}

void sendVehicleEntry(uint32_t uid, bool isVip) {
    char hex[9];
    uidToHex(uid, hex);
    Serial.print("{\"type\":\"VEHICLE_ENTRY\",\"data\":{\"uid\":\"");
    Serial.print(hex);
    Serial.print("\",\"uidDec\":");
    Serial.print(uid);
    Serial.print(",\"isVip\":");
    Serial.print(isVip ? "true" : "false");
    Serial.println("}}");
}

void sendVehicleExit(uint32_t uid, bool isVip, unsigned long duration) {
    char hex[9];
    uidToHex(uid, hex);
    Serial.print("{\"type\":\"VEHICLE_EXIT\",\"data\":{\"uid\":\"");
    Serial.print(hex);
    Serial.print("\",\"uidDec\":");
    Serial.print(uid);
    Serial.print(",\"isVip\":");
    Serial.print(isVip ? "true" : "false");
    Serial.print(",\"fee\":0");
    Serial.print(",\"duration\":");
    Serial.print(duration);
    Serial.println("}}");
}

void sendFireAlarm(bool isAlarm, const char* source) {
    Serial.print("{\"type\":\"");
    Serial.print(isAlarm ? "FIRE_ALARM" : "FIRE_CLEARED");
    Serial.print("\",\"data\":{\"message\":\"");
    Serial.print(isAlarm ? "CANH BAO!" : "Da xu ly");
    Serial.print("\",\"source\":\"");
    Serial.print(source);
    Serial.println("\"}}");
}

void sendFullSync() {
    Serial.print("{\"type\":\"FULL_SYNC\",\"data\":{\"parkedVehicles\":[");
    bool first = true;
    for (int i = 0; i < MAX_SLOTS; i++) {
        if (parkedUIDs[i] != 0) {
            if (!first) Serial.print(",");
            first = false;
            char hex[9];
            uidToHex(parkedUIDs[i], hex);
            Serial.print("{\"uid\":\"");
            Serial.print(hex);
            Serial.print("\",\"uidDec\":");
            Serial.print(parkedUIDs[i]);
            Serial.print(",\"isVip\":");
            Serial.print(isVipCard(parkedUIDs[i]) ? "true" : "false");
            Serial.print(",\"entryTime\":");
            Serial.print(parkedTimestamps[i]);
            Serial.print("}");
        }
    }
    Serial.print("],\"parkedCount\":");
    Serial.print(parkedCount);
    Serial.print(",\"studentCount\":");
    Serial.print(parkedCount - vipParkedCount);
    Serial.print(",\"teacherCount\":");
    Serial.print(vipParkedCount);
    Serial.print(",\"freeSlots\":");
    Serial.print(maxCars - parkedCount);
    Serial.println("}}");
}

// ==========================================================================================
//  PHAN 4: HAM HIEN THI & DIEU KHIEN
// ==========================================================================================

void showMessage(const char* line1, const char* line2, int delayMs) {
    lcd.clear();
    lcd.setCursor(0, 0); lcd.print(line1);
    lcd.setCursor(0, 1); lcd.print(line2);
    if (delayMs > 0) delay(delayMs);
}

void beep(int times) {
    // [DA TAT] Buzzer khi quet the NFC
}

void controlBarrier(bool success) {
    if (success) {
        digitalWrite(PIN_LED_GREEN, HIGH);
        digitalWrite(PIN_LED_RED, LOW);
        barrierServo.attach(PIN_SERVO);
        barrierServo.write(0);
        delay(BARRIER_DELAY);
        barrierServo.write(90);
        delay(500);
        barrierServo.detach();
        digitalWrite(PIN_LED_GREEN, LOW);
    } else {
        for (int i = 0; i < 3; i++) {
            digitalWrite(PIN_LED_RED, HIGH);
            delay(100);
            digitalWrite(PIN_LED_RED, LOW);
            delay(100);
        }
    }
}

void updateIdleScreen() {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Cho trong: ");
    lcd.print(maxCars - parkedCount);
    lcd.print("/");
    lcd.print(maxCars);
    lcd.setCursor(0, 1);
    lcd.print("SV:");
    lcd.print(parkedCount - vipParkedCount);
    lcd.print(" GV:");
    lcd.print(vipParkedCount);
    int freeSlots = maxCars - parkedCount;
    if (freeSlots == 0) {
      lcd.print(" [DAY]");
    }
}

// ==========================================================================================
//  PHAN 5: QUAN LY EEPROM (giu nguyen dinh dang EEPROM.put/get tu ban goc)
// ==========================================================================================

void saveData() {
    int addr = 0;
    EEPROM.put(addr, (int)EEPROM_SIGNATURE); addr += 4;
    EEPROM.put(addr, parkedCount);             addr += 4;
    EEPROM.put(addr, vipParkedCount);          addr += 4;
    EEPROM.put(addr, parkedUIDs);              addr += sizeof(parkedUIDs);
    EEPROM.put(addr, parkedTimestamps);        addr += sizeof(parkedTimestamps);
    EEPROM.put(addr, currentVipCount);         addr += 4;
    EEPROM.put(addr, vipList);
}

void loadData() {
    int addr = 0;
    int signature = 0;

    EEPROM.get(addr, signature); addr += 4;

    if (signature != (int)EEPROM_SIGNATURE) {
        parkedCount = 0;
        vipParkedCount = 0;
        currentVipCount = 0;
        memset(parkedUIDs, 0, sizeof(parkedUIDs));
        memset(parkedTimestamps, 0, sizeof(parkedTimestamps));
        memset(vipList, 0, sizeof(vipList));
        saveData();
        return;
    }

    EEPROM.get(addr, parkedCount);         addr += 4;
    EEPROM.get(addr, vipParkedCount);      addr += 4;
    EEPROM.get(addr, parkedUIDs);          addr += sizeof(parkedUIDs);
    EEPROM.get(addr, parkedTimestamps);    addr += sizeof(parkedTimestamps);
    EEPROM.get(addr, currentVipCount);     addr += 4;
    EEPROM.get(addr, vipList);

    if (parkedCount < 0 || parkedCount > MAX_SLOTS ||
        vipParkedCount < 0 || vipParkedCount > parkedCount ||
        currentVipCount < 0 || currentVipCount > MAX_VIP_SIZE) {
        parkedCount = 0;
        vipParkedCount = 0;
        currentVipCount = 0;
        memset(parkedUIDs, 0, sizeof(parkedUIDs));
        memset(parkedTimestamps, 0, sizeof(parkedTimestamps));
        memset(vipList, 0, sizeof(vipList));
        saveData();
    }
}

// ==========================================================================================
//  PHAN 6: KIEM TRA AN TOAN CHAY NO - NON-BLOCKING (KHONG DUNG WHILE CHAN)
// ==========================================================================================

#define SENSOR_WARMUP_MS    5000
#define FLAME_CONFIRM_MS    100
#define GAS_DEBOUNCE_MS     2000
#define BLINK_INTERVAL_MS   150

void checkFireSafety() {
    unsigned long now = millis();

    if (now - bootTime < SENSOR_WARMUP_MS) {
        return;
    }

    bool flameDetected = (digitalRead(PIN_FLAME) == LOW);
    bool gasDetected = (digitalRead(PIN_MQ2) == LOW);

    // --- PHAT HIEN CHAY ---
    if (flameDetected) {
        delay(FLAME_CONFIRM_MS);  // chi 100ms de xac nhan
        flameDetected = (digitalRead(PIN_FLAME) == LOW);

        if (flameDetected) {
            // Lan dau phat hien chay
            if (!flameAlarmSent) {
                flameAlarmSent = true;
                isFireActive = true;
                sendFireAlarm(true, "FLAME");
                barrierServo.attach(PIN_SERVO);
                barrierServo.write(0);  // mo barrier
            }

            // NON-BLOCKING blink: chi cap nhat moi BLINK_INTERVAL_MS
            if (now - lastBlinkTime >= BLINK_INTERVAL_MS) {
                lastBlinkTime = now;
                blinkState = !blinkState;
                digitalWrite(PIN_BUZZER, blinkState ? HIGH : LOW);
                digitalWrite(PIN_LED_RED, blinkState ? HIGH : LOW);
                lcd.clear();
                lcd.setCursor(0, 0); lcd.print("!!! CHAY !!!");
                lcd.setCursor(0, 1); lcd.print("DANG MO CONG...");
            }
            return;  // quay lai loop() nhanh - khong block!
        }
    }

    // --- CHAY DA TAT ---
    if (isFireActive && !flameDetected) {
        isFireActive = false;
        flameAlarmSent = false;
        blinkState = false;
        digitalWrite(PIN_BUZZER, LOW);
        digitalWrite(PIN_LED_RED, LOW);
        delay(500);
        barrierServo.write(90);  // dong barrier
        delay(500);
        barrierServo.detach();
        isGasWarningActive = false;
        gasAlarmSent = false;
        sendFireAlarm(false, "FLAME");
        updateIdleScreen();
        return;
    }

    // --- KHI GAS ---
    if (gasDetected && !isGasWarningActive) {
        gasAlarmStartTime = now;
        isGasWarningActive = true;
    }

    if (isGasWarningActive) {
        if (gasDetected) {
            // Gui canh bao sau khi gas on du 2 giay
            if (!gasAlarmSent && (now - gasAlarmStartTime >= GAS_DEBOUNCE_MS)) {
                gasAlarmSent = true;
                sendFireAlarm(true, "GAS");
            }
            // NON-BLOCKING blink cho gas
            if (gasAlarmSent && (now - lastBlinkTime >= BLINK_INTERVAL_MS)) {
                lastBlinkTime = now;
                blinkState = !blinkState;
                digitalWrite(PIN_BUZZER, blinkState ? HIGH : LOW);
                digitalWrite(PIN_LED_RED, blinkState ? HIGH : LOW);
            }
        } else {
            // Gas da tat
            if (gasAlarmSent) {
                gasAlarmSent = false;
                blinkState = false;
                digitalWrite(PIN_BUZZER, LOW);
                digitalWrite(PIN_LED_RED, LOW);
                sendFireAlarm(false, "GAS");
            }
            isGasWarningActive = false;
            updateIdleScreen();
        }
    }
}

// ==========================================================================================
//  PHAN 7: XU LY SERIAL (dung char array - khong dung String)
// ==========================================================================================

void checkSerialCommands() {
    while (Serial.available()) {
        char c = Serial.read();
        if (c == '\n' || c == '\r') {
            if (serialBufPos > 0) {
                serialBuf[serialBufPos] = '\0';
                if (strcmp(serialBuf, "SYNC") == 0) {
                    sendFullSync();
                }
                serialBufPos = 0;
            }
        } else if (serialBufPos < SERIAL_BUF_SIZE - 1) {
            serialBuf[serialBufPos++] = c;
        }
    }
}

// ==========================================================================================
//  PHAN 8: RFID & XU LY GUI XE
// ==========================================================================================

uint32_t getRFID() {
    if (!mfrc522.PICC_IsNewCardPresent()) return 0;
    if (!mfrc522.PICC_ReadCardSerial()) return 0;

    uint32_t uid = 0;
    for (byte i = 0; i < 4; i++) {
        uid = (uid << 8) | mfrc522.uid.uidByte[i];
    }

    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
    return uid;
}

bool isVipCard(uint32_t uid) {
    if (uid == MASTER_UID) return true;
    for (int i = 0; i < MAX_VIP_SIZE; i++) {
        if (vipList[i] == uid) return true;
    }
    return false;
}

void handleParking(uint32_t rfid) {
    sendRFIDScan(rfid);

    if (rfid == MASTER_UID) {
        showMessage("ADMIN MODE", "Quan tri", 2000);
        updateIdleScreen();
        return;
    }

    int index = -1;
    for (int i = 0; i < MAX_SLOTS; i++) {
        if (parkedUIDs[i] == rfid) {
            index = i;
            break;
        }
    }

    bool isVIP = isVipCard(rfid);

    // ========== XE VAO ==========
    if (index == -1) {
        if (parkedCount >= maxCars) {
            showMessage("BAI DA DAY!", "Cho trong: 0", 2000);
            controlBarrier(false);
            updateIdleScreen();
            return;
        }

        for (int i = 0; i < MAX_SLOTS; i++) {
            if (parkedUIDs[i] == 0) {
                parkedUIDs[i] = rfid;
                parkedTimestamps[i] = millis() / 1000;
                parkedCount++;
                if (isVIP) vipParkedCount++;
                saveData();
                break;
            }
        }

        showMessage(isVIP ? "VIP VAO" : "XE VAO", "", 1000);
        sendVehicleEntry(rfid, isVIP);
        controlBarrier(true);
        updateIdleScreen();
    }
    // ========== XE RA ==========
    else {
        unsigned long nowSec = millis() / 1000;
        unsigned long duration = nowSec - parkedTimestamps[index];

        parkedUIDs[index] = 0;
        parkedTimestamps[index] = 0;
        parkedCount--;
        if (isVIP) vipParkedCount--;
        saveData();

        showMessage(isVIP ? "VIP: MIEN PHI" : "XE RA", "Tam biet!", 1000);
        sendVehicleExit(rfid, isVIP, duration);
        controlBarrier(true);
        updateIdleScreen();
    }
}

// ==========================================================================================
//  PHAN 9: SETUP & LOOP
// ==========================================================================================

void setup() {
    Serial.begin(9600);

    pinMode(PIN_RESET_BTN, INPUT_PULLUP);
    pinMode(PIN_FLAME, INPUT);
    pinMode(PIN_MQ2, INPUT);
    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);

    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_LED_RED, LOW);
    digitalWrite(PIN_BUZZER, LOW);

    lcd.init();
    lcd.backlight();
    showMessage("BAI DO XE", "Khoi tao...", 1000);

    SPI.begin();
    mfrc522.PCD_Init();
    delay(100);

    barrierServo.attach(PIN_SERVO);
    barrierServo.write(90);
    delay(500);
    barrierServo.detach();

    bootTime = millis();

    loadData();
    updateIdleScreen();

    sendFullSync();
    Serial.println("=== SMART PARKING READY ===");
}

void loop() {
    checkSerialCommands();
    checkFireSafety();

    // Chi quet RFID khi khong co canh bao chay/gas
    if (!isFireActive && !isGasWarningActive) {
        if (millis() - lastSyncTime > SYNC_INTERVAL) {
            sendFullSync();
            lastSyncTime = millis();
        }

        uint32_t uid = getRFID();
        if (uid != 0) {
            handleParking(uid);
        }
    }
}
