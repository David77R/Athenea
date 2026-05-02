import sys
import wave
import json
from vosk import Model, KaldiRecognizer


def transcribir(audio_path, model_path):
    # Cargar el modelo de lenguaje
    model = Model(model_path)

    # Abrir el archivo de audio
    wf = wave.open(audio_path, "rb")

    # Crear el reconocedor con la frecuencia del audio
    rec = KaldiRecognizer(model, wf.getframerate())

    resultado = ""

    # Procesar el audio en bloques de 4000 frames
    while True:
        data = wf.readframes(4000)
        if len(data) == 0:
            break
        if rec.AcceptWaveform(data):
            r = json.loads(rec.Result())
            resultado += r.get("text", "") + " "

    # Capturar el último fragmento
    r = json.loads(rec.FinalResult())
    resultado += r.get("text", "")

    print(resultado.strip())


if __name__ == "__main__":
    audio_path = sys.argv[1]
    model_path = sys.argv[2]
    transcribir(audio_path, model_path)
