import av
source = av.open(".data/asr-reference-check.wav")
target = av.open(".data/asr-reference.webm", mode="w")
stream = target.add_stream("libopus", rate=48000)
stream.layout = "mono"
resampler = av.AudioResampler(format="fltp", layout="mono", rate=48000)
for frame in source.decode(audio=0):
    for converted in resampler.resample(frame):
        for packet in stream.encode(converted):
            target.mux(packet)
for converted in resampler.resample(None):
    for packet in stream.encode(converted):
        target.mux(packet)
for packet in stream.encode(None):
    target.mux(packet)
target.close()
source.close()
