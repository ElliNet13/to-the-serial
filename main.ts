let connectedBT = false
let prefix = ""
let c = 0
let result = ""
// Send data to serial and Bluetooth if connected
function sendData(data: string) {
    serial.writeLine(data)
    if (connectedBT) {
        bluetooth.uartWriteString("" + data + "\r\n")
    }
}
// Button / logo events
input.onLogoEvent(TouchButtonEvent.LongPressed, function () {
    sendData("logolongpress")
})
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
input.onButtonPressed(Button.A, function () {
    sendData("A")
})
input.onButtonPressed(Button.AB, function () {
    sendData("A+B")
})
input.onButtonPressed(Button.B, function () {
    sendData("B")
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
basic.forever(function () {
    basic.pause(1000)
    serial.writeValue("temp", input.temperature())
})

serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    let line = serial.readUntil(serial.delimiters(Delimiters.NewLine)).trim()
    if (line.length == 0) return

    if (line.charAt(0).toUpperCase() == "P") {
        // Example: "P 0 0 1 2 4 4"
        let parts = line.split(" ")
        for (let i = 1; i < parts.length; i += 2) {
            let x = parseInt(parts[i])
            let y = parseInt(parts[i + 1])
            if (!isNaN(x) && !isNaN(y)) {
                led.plot(x, y)
            }
        }
    } else if (line.charAt(0).toUpperCase() == "C") {
        basic.clearScreen()
    }
})
