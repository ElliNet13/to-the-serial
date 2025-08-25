interface Compiled {
    [key: string]: string[];
}

let connectedBT: boolean = false;
let compiled: Compiled = {};

function sendData(data: string) {
    serial.writeLine(data);
    if (connectedBT) {
        bluetooth.uartWriteString(data + "\r\n");
    }
}

function parse(line: string, depth: number = 0) {
    if (depth > 10) {
        sendData("Error: Maximum recursion depth reached");
        return;
    }

    line = _py.py_string_strip(line);
    if (line.length === 0) return;

    let parts = _py.py_string_split(line, " ");

    if (parts[0] === "P" && parts.length >= 3) { // PLOT
        try {
            for (let i = 1; i < parts.length; i += 2) {
                let x = parseInt(parts[i]);
                let y = parseInt(parts[i + 1]);
                if (isNaN(x) || isNaN(y)) {
                    sendData("Error: Invalid number format in PLOT command");
                    return;
                }
                if (0 <= x && x <= 4 && 0 <= y && y <= 4) {
                    led.plot(x, y);
                } else {
                    sendData(`Error: Coordinates out of range (${x},${y})`);
                    return;
                }
            }
        } catch (_) {
            sendData("Error: Invalid PLOT command");
        }

    } else if (parts[0] === "C" && parts.length === 1) { // CLEAR
        basic.clearScreen();

    } else if (parts[0] === "SC" && parts.length === 2) { // SENDCOMPILE
        let newcompile: string[] = [];
        let current = "";
        do {
            current = serial.readUntil(serial.delimiters(Delimiters.CarriageReturn));
            current = _py.py_string_strip(current);
            if (current !== "EC") { // ENDCOMPILE
                newcompile.push(current);
            }
        } while (current !== "EC");
        compiled[parts[1]] = newcompile;

    } else if (parts[0] === "PC" && parts.length === 2 && compiled[parts[1]]) { // PLAYCOMPILE
        for (const cmd of compiled[parts[1]]) {
            parse(cmd, depth + 1); // pass depth for recursion safety
        }

    } else if (parts[0] === "W" && parts.length === 2) { // WAIT
        let t = parseFloat(parts[1]);
        if (!isNaN(t) && t >= 0) {
            basic.pause(t * 1000);
        } else {
            sendData("Error: Invalid WAIT time");
        }

    } else {
        sendData("Error: Unknown or malformed command: " + line);
    }
}

serial.onDataReceived(serial.delimiters(Delimiters.CarriageReturn), function () {
    let line = _py.py_string_strip(serial.readUntil(serial.delimiters(Delimiters.CarriageReturn)));
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

// Regularly send temperature over serial
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
    let line = _py.py_string_strip(bluetooth.uartReadUntil(serial.delimiters(Delimiters.CarriageReturn)));
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
