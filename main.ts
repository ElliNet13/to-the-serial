input.onLogoEvent(TouchButtonEvent.LongPressed, function on_logo_long_pressed() {
    serial.writeLine("logolongpress")
})
input.onButtonPressed(Button.A, function on_button_pressed_a() {
    serial.writeLine("A")
})
input.onButtonPressed(Button.AB, function on_button_pressed_ab() {
    serial.writeLine("A+B")
})
input.onButtonPressed(Button.B, function on_button_pressed_b() {
    serial.writeLine("B")
})
input.onLogoEvent(TouchButtonEvent.Touched, function on_logo_touched() {
    serial.writeLine("logotouch")
})
input.onLogoEvent(TouchButtonEvent.Pressed, function on_logo_pressed() {
    serial.writeLine("logopress")
})
input.onLogoEvent(TouchButtonEvent.Released, function on_logo_released() {
    serial.writeLine("logorelease")
})
serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function on_data_received() {
    let x: number;
    let y: number;
    let line = _py.py_string_strip(serial.readUntil(serial.delimiters(Delimiters.CarriageReturn)))
    let parts = _py.py_string_split(line, " ")
    if (parts[0] == "PLOT" && parts.length == 3) {
        try {
            x = parseInt(parts[1])
            y = parseInt(parts[2])
            if (0 <= x && x <= 4 && (0 <= y && y <= 4)) {
                led.plot(x, y)
            } else {
                //  no debug message on success
                serial.writeLine("Error: Coordinates out of range ({x},{y})")
                control.reset()
            }
            
        }
        catch (_) {
            serial.writeLine("Error: Invalid number format in PLOT command")
            control.reset()
        }
        
    } else if (parts[0] == "CLEAR" && parts.length == 1) {
        basic.clearScreen()
    } else {
        serial.writeLine("Error: Unknown or malformed command: '{line}'")
        control.reset()
    }
    
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

