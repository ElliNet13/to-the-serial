interface Compiled {
    [key: string]: string[];
}

let connectedBT = false
let compiled: Compiled = {}

function sendData(data: string) {
    serial.writeLine(data)
    if (connectedBT) {
        bluetooth.uartWriteString(data + "\r\n")
    }
}

// Interpret bytecode from a hex string (e.g., "01 02 02 02")
function runBytecode(hex: string) {
    const bytes = hex.trim().split(" ").map(x => parseInt(x, 16))
    let ptr = 0
    while (ptr < bytes.length) {
        const opcode = bytes[ptr++]

        if (opcode === 0x01) {
            // PLOT x y
            const x = bytes[ptr++]
            const y = bytes[ptr++]
            if (x >= 0 && x <= 4 && y >= 0 && y <= 4) {
                led.plot(x, y)
            }
        } else if (opcode === 0x02) {
            // CLEAR
            basic.clearScreen()
        } else if (opcode === 0x03) {
            // WAIT ms (2 bytes big-endian)
            const ms = (bytes[ptr++] << 8) | bytes[ptr++]
            basic.pause(ms)
        } else {
            sendData("Unknown opcode: " + opcode)
            control.reset()
        }
    }
}

// Listen for hex string commands over serial
serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    const line = serial.readUntil(serial.delimiters(Delimiters.NewLine)).trim()
    runBytecode(line)
})

// Bluetooth
bluetooth.onBluetoothConnected(function () {
    connectedBT = true
    basic.showIcon(IconNames.Yes)
    bluetooth.uartWriteString("READY\r\n")
    basic.pause(1000)
    basic.clearScreen()
})
bluetooth.onBluetoothDisconnected(function () {
    connectedBT = false
    basic.showIcon(IconNames.No)
})
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    const line = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine)).trim()
    runBytecode(line)
})

// Inputs
input.onButtonPressed(Button.A, function () {
    sendData("A")
})
input.onButtonPressed(Button.B, function () {
    sendData("B")
})
input.onButtonPressed(Button.AB, function () {
    sendData("A+B")
})
input.onLogoEvent(TouchButtonEvent.Touched, function () {
    sendData("logotouch")
})
input.onLogoEvent(TouchButtonEvent.Pressed, function () {
    sendData("logopress")
})
input.onLogoEvent(TouchButtonEvent.Released, function () {
    sendData("logorelease")
})
input.onLogoEvent(TouchButtonEvent.LongPressed, function () {
    sendData("logolongpress")
})

// Start services
bluetooth.startUartService()
bluetooth.startTemperatureService()
bluetooth.startLEDService()

// Send temp every second
basic.forever(function () {
    basic.pause(1000)
    serial.writeValue("temp", input.temperature())
})

basic.clearScreen()
