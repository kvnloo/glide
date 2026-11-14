import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)
export interface SpeechAudio { readonly duration: number; level(ms: number): number }
export interface CouncilSpeech {
  speak(text: string, signal: AbortSignal, playing: (audio: SpeechAudio) => void): Promise<void>
}

/** Decode the platform engine's mono/stereo signed 16-bit PCM, including streaming WAV sizes. */
export function pcmSpeech(wav: Buffer): SpeechAudio {
  if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Speech engine returned no PCM WAV')
  let rate = 0
  let channels = 0
  let data: Buffer = Buffer.alloc(0)
  for (let at = 12; at + 8 <= wav.length;) {
    const name = wav.toString('ascii', at, at + 4)
    const length = wav.readUInt32LE(at + 4)
    const start = at + 8
    if (name === 'fmt ' && length >= 16 && start + 16 <= wav.length) {
      if (wav.readUInt16LE(start) !== 1 || wav.readUInt16LE(start + 14) !== 16) throw new Error('Speech WAV must use signed 16-bit PCM')
      channels = wav.readUInt16LE(start + 2)
      rate = wav.readUInt32LE(start + 4)
    }
    if (name === 'data') { data = wav.subarray(start, Math.min(wav.length, start + length)); break }
    at = start + length + length % 2
  }
  if (!rate || !channels || !data.length) throw new Error('Speech WAV has no samples')
  const samplesPerMs = rate * channels / 1000
  const duration = data.length / 2 / samplesPerMs
  const levels: number[] = []
  for (let ms = 0; ms < duration; ms += 50) {
    const begin = Math.floor(ms * samplesPerMs)
    const end = Math.min(data.length / 2, Math.floor((ms + 50) * samplesPerMs))
    let sum = 0
    for (let n = begin; n < end; n++) sum += (data.readInt16LE(n * 2) / 32768) ** 2
    levels.push(Math.min(1, Math.sqrt(sum / Math.max(1, end - begin)) * 2))
  }
  return { duration, level: ms => ms < 0 || ms >= duration ? 0 : levels[Math.floor(ms / 50)] ?? 0 }
}

/** Local platform TTS only. No shell, remote provider, microphone, or text in filenames. */
export const platformSpeech: CouncilSpeech = {
  async speak(text, signal, playing) {
    const dir = await mkdtemp(join(tmpdir(), 'glide-council-speech-'))
    try {
      let wav: Buffer | undefined
      for (const engine of ['espeak-ng', 'espeak']) {
        try {
          const result = await exec(engine, ['--stdout', '--', text], { encoding: 'buffer', signal, maxBuffer: 16 * 1024 * 1024, timeout: 30_000 })
          wav = result.stdout
          break
        } catch (error) {
          if (signal.aborted) throw error
          if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw new Error('Platform speech synthesis failed')
        }
      }
      if (!wav) throw new Error('Read aloud needs espeak-ng or espeak and paplay on this platform. The council remains available as text.')
      const audio = pcmSpeech(wav)
      const file = join(dir, 'sentence.wav')
      await writeFile(file, wav, { signal })
      if (signal.aborted) return
      // Announce speech only once the player process exists, not while synthesis is pending.
      await new Promise<void>((resolve, reject) => {
        const child = execFile('paplay', [file], { signal, timeout: Math.ceil(audio.duration) + 10_000 }, error => {
          if (error) reject(new Error(signal.aborted ? 'Reading cancelled' : 'Platform audio playback failed. Check paplay and the audio output.'))
          else resolve()
        })
        child.once('spawn', () => { playing(audio) })
      })
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  }
}

export function speechSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+(?:["']|$)?|[^.!?]+$/g)?.map(s => s.trim()).filter(Boolean) ?? []
}
