interface Compiled {
    [key: string]: string[];
}

let connectedBT = false;
let compiled: Compiled = {};

// Send data to serial and Bluetooth if connected
function sendData(data: string) {
    serial.writeLine(data);
    if (connectedBT) {
        bluetooth.uartWriteString(data + "\r\n");
    }
}

// Clamp function for coordinates
function clampCoord(v: number, minVal: number, maxVal: number): number {
    if (v < minVal) return minVal;
    if (v > maxVal) return maxVal;
    return v;
}

// Clean line: remove non-printable characters
function cleanLine(line: string): string {
    let result = "";
    for (let i = 0; i < line.length; i++) {
        const c = line.charCodeAt(i);
        if (c >= 32 && c <= 126) result += line[i];
    }
    return _py.py_string_strip(result);
}

// Parse commands
function parse(line: string, depth: number = 0) {
    if (depth > 10) {
        sendData("Error: Maximum recursion depth reached");
        return;
    }

    line = cleanLine(line);
    if (line.length === 0) return;

    const parts = _py.py_string_split(line, " ");
    const cmd = parts[0];

    if (cmd === "P" && parts.length >= 3) { // PLOT
        for (let i = 1; i < parts.length; i += 2) {
            let x = parseInt(parts[i] || "0");
            let y = parseInt(parts[i + 1] || "0");
            if (isNaN(x)) x = 0;
            if (isNaN(y)) y = 0;
            x = clampCoord(x, 0, 4);
            y = clampCoord(y, 0, 4);
            led.plot(x, y);
        }

    } else if (cmd === "C" && parts.length === 1) { // CLEAR
        basic.clearScreen();

    } else if (cmd === "SC" && parts.length === 2) { // SENDCOMPILE
        const key = parts[1];
        let newcompile: string[] = [];
        let current = "";
        do {
            current = serial.readUntil(serial.delimiters(Delimiters.CarriageReturn));
            current = cleanLine(current);
            if (current !== "EC") {
                newcompile.push(current);
            }
        } while (current !== "EC");
        compiled[key] = newcompile;

    } else if (cmd === "PC" && parts.length === 2 && compiled[parts[1]]) { // PLAYCOMPILE
        for (const cmdLine of compiled[parts[1]]) {
            parse(cmdLine, depth + 1);
        }

    } else if (cmd === "W" && parts.length === 2) { // WAIT
        let t = parseFloat(parts[1]);
        if (!isNaN(t) && t >= 0) {
            basic.pause(t * 1000);
        } else {
            sendData("Error: Invalid WAIT time");
        }

    } else if (cmd === "TEXT") { // TEXT command
        let text = line.slice(5).toUpperCase();
        for (let i = 0; i < text.length; i++) {
            let char = text[i];
            if (char >= "A" && char <= "Z") {
                // Example: map A-Z to simple patterns on 5x5 grid
                led.plot(i % 5, i % 5);
            }
        }

    } else {
        sendData("Error: Unknown or malformed command: " + line);
    }
}

// Serial input
serial.onDataReceived(serial.delimiters(Delimiters.CarriageReturn), () => {
    const line = cleanLine(serial.readUntil(serial.delimiters(Delimiters.CarriageReturn)));
    parse(line);
});

// Button / logo events
input.onLogoEvent(TouchButtonEvent.LongPressed, () => sendData("logolongpress"));
input.onButtonPressed(Button.A, () => sendData("A"));
input.onButtonPressed(Button.AB, () => sendData("A+B"));
input.onButtonPressed(Button.B, () => sendData("B"));
input.onLogoEvent(TouchButtonEvent.Touched, () => sendData("logotouch"));
input.onLogoEvent(TouchButtonEvent.Pressed, () => sendData("logopress"));
input.onLogoEvent(TouchButtonEvent.Released, () => sendData("logorelease"));

// Send temperature every second
basic.clearScreen();
basic.forever(() => {
    basic.pause(1000);
    serial.writeValue("temp", input.temperature());
});

// Bluetooth setup
bluetooth.startUartService();
bluetooth.startTemperatureService();
bluetooth.startLEDService();

bluetooth.onUartDataReceived(serial.delimiters(Delimiters.CarriageReturn), () => {
    const line = cleanLine(bluetooth.uartReadUntil(serial.delimiters(Delimiters.CarriageReturn)));
    parse(line);
});

bluetooth.onBluetoothDisconnected(() => {
    connectedBT = false;
    basic.showIcon(IconNames.No);
});

bluetooth.onBluetoothConnected(() => {
    connectedBT = true;
    basic.showIcon(IconNames.Yes);
    bluetooth.uartWriteString("READY\r\n");
    basic.pause(1000);
    basic.clearScreen();
});

// Optional helper to extract TEXT commands
function extract_text(line: string): string {
    let prefix = "TEXT ";
    if (_py.py_string_startswith(line, prefix)) {
        return line.slice(prefix.length);
    }
    return "";
}
