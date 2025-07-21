def on_logo_long_pressed():
    serial.write_line("logolongpress")
input.on_logo_event(TouchButtonEvent.LONG_PRESSED, on_logo_long_pressed)

def on_button_pressed_a():
    serial.write_line("A")
input.on_button_pressed(Button.A, on_button_pressed_a)

def on_button_pressed_ab():
    serial.write_line("A+B")
input.on_button_pressed(Button.AB, on_button_pressed_ab)

def on_button_pressed_b():
    serial.write_line("B")
input.on_button_pressed(Button.B, on_button_pressed_b)

def on_logo_touched():
    serial.write_line("logotouch")
input.on_logo_event(TouchButtonEvent.TOUCHED, on_logo_touched)

def on_logo_pressed():
    serial.write_line("logopress")
input.on_logo_event(TouchButtonEvent.PRESSED, on_logo_pressed)

def on_logo_released():
    serial.write_line("logorelease")
input.on_logo_event(TouchButtonEvent.RELEASED, on_logo_released)

def on_data_received():
    line = serial.read_until(serial.delimiters(Delimiters.CARRIAGE_RETURN)).strip()
    parts = line.split(" ")

    if parts[0] == "PLOT" and len(parts) == 3:
        try:
            x = int(parts[1])
            y = int(parts[2])
            if 0 <= x <= 4 and 0 <= y <= 4:
                led.plot(x, y)
                # no debug message on success
            else:
                serial.write_line(f"Error: Coordinates out of range ({x},{y})")
                control.reset()
        except:
            serial.write_line("Error: Invalid number format in PLOT command")
            control.reset()

    elif parts[0] == "CLEAR" and len(parts) == 1:
        basic.clear_screen()

    elif parts[0] == "TEXT" and len(parts) >= 2:
        music.play(music.tone_playable(Note.D, music.beat(BeatFraction.WHOLE)), music.PlaybackMode.UNTIL_DONE)

    else:
        serial.write_line(f"Error: Unknown or malformed command: '{line}'")
        control.reset()

serial.on_data_received(serial.delimiters(Delimiters.NEW_LINE), on_data_received)

basic.clear_screen()

def on_forever():
    basic.pause(1000)
    serial.write_value("temp", input.temperature())

basic.forever(on_forever)

def extract_text(line: str) -> str:
    prefix = "TEXT "
    if line.startswith(prefix):
        return line[len(prefix):]
    else:
        return ""
