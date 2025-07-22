interface Compiled {
    [key: string]: string[];
}

let connectedBT: boolean = false
let compiled: Compiled = {}

function sendData(data: string) {
    serial.writeLine(data)
    if (connectedBT) {
        bluetooth.uartWriteString(data)
    }
}

input.onLogoEvent(TouchButtonEvent.LongPressed, function on_logo_long_pressed() {
    sendData("logolongpress")
})
input.onButtonPressed(Button.A, function on_button_pressed_a() {
    sendData("A")
})
input.onButtonPressed(Button.AB, function on_button_pressed_ab() {
    sendData("A+B")
})
input.onButtonPressed(Button.B, function on_button_pressed_b() {
    sendData("B")
})
input.onLogoEvent(TouchButtonEvent.Touched, function on_logo_touched() {
    sendData("logotouch")
})
input.onLogoEvent(TouchButtonEvent.Pressed, function on_logo_pressed() {
    sendData("logopress")
})
input.onLogoEvent(TouchButtonEvent.Released, function on_logo_released() {
    sendData("logorelease")
})

function parse(line: string) {
    let x: number;
    let y: number;
    let parts = _py.py_string_split(line, " ")
    if (parts[0] == "PLOT" && parts.length == 3) {
        try {
            x = parseInt(parts[1])
            y = parseInt(parts[2])
            if (0 <= x && x <= 4 && (0 <= y && y <= 4)) {
                led.plot(x, y)
            } else {
                //  no debug message on success
                sendData("Error: Coordinates out of range ({x},{y})")
                control.reset()
            }

        }
        catch (_) {
            sendData("Error: Invalid number format in PLOT command")
            control.reset()
        }

    } else if (parts[0] == "CLEAR" && parts.length == 1) {
        basic.clearScreen()
    } else if (parts[0] == "SENDCOMPILE" && parts.length == 2) {
        let newcompile = []
        let current = ""
        do {
            serial.readUntil(serial.delimiters(Delimiters.CarriageReturn))
            if (current != "ENDCOMPILE") {
                newcompile.push(current)
            }
        } while (current != "ENDCOMPILE")
        compiled[parts[1]] = newcompile
    } else if (parts[0] == "PLAYCOMPILE" && parts.length == 2 && compiled[parts[1]]) {
        for (const cmd of compiled[parts[1]]) {
        parse(cmd)
        }
    } else if (parts[0] == "WAIT" && parts.length == 1) {
        basic.pause(parseFloat(parts[1]) * 1000)
    } else {
        sendData("Error: Unknown or malformed command: '{line}'")
        control.reset()
    }

}

serial.onDataReceived(serial.delimiters(Delimiters.CarriageReturn), function() {
    let line: string = _py.py_string_strip(serial.readUntil(serial.delimiters(Delimiters.CarriageReturn)))
    parse(line)
})

basic.clearScreen()
basic.forever(function on_forever() {
    basic.pause(1000)
    serial.writeValue("temp", input.temperature())
})
function extract_text(line: string): string {
    let prefix = "TEXT "
    if (_py.py_string_startswith(line, prefix)) {
        return line.slice(prefix.length)
    } else {
        return ""
    }
    
}

bluetooth.startUartService()
bluetooth.startTemperatureService()
bluetooth.startLEDService()

bluetooth.onUartDataReceived(serial.delimiters(Delimiters.CarriageReturn), function() {
    parse(bluetooth.uartReadUntil(serial.delimiters(Delimiters.CarriageReturn)))
})

bluetooth.onBluetoothDisconnected(function() {
    connectedBT = false
    basic.showIcon(IconNames.No)
})
bluetooth.onBluetoothConnected(function() {
    connectedBT = true
    basic.showIcon(IconNames.Yes)
    bluetooth.uartWriteString("READY\r\n")
    basic.pause(1000)
    basic.clearScreen()
})
