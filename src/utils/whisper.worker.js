import { pipeline, env } from '@xenova/transformers'
import { MessageTypes } from './presets'

env.allowLocalModels = false;
env.backends.onnx.logLevel = 'error';

const originalWarn = console.warn.bind(console)
const originalError = console.error.bind(console)

function isIgnoredRuntimeWarning(args) {
    const message = args.map(arg => String(arg)).join(' ')
    return message.includes('Unable to determine content-length from response headers')
        || (message.includes('[W:onnxruntime') && message.includes('CleanUnusedInitializersAndNodeArgs'))
}

console.warn = (...args) => {
    if (!isIgnoredRuntimeWarning(args)) {
        originalWarn(...args)
    }
}

console.error = (...args) => {
    if (!isIgnoredRuntimeWarning(args)) {
        originalError(...args)
    }
}


class MyTranscriptionPipeline {
    static task = 'automatic-speech-recognition'
    static model = 'Xenova/whisper-base'
    static instance = null

    static async getInstance(progress_callback = null, model_name = null) {
        const model = model_name || this.model
        if (this.instance === null) {
            this.instance = await pipeline(this.task, model, { progress_callback })
        }

        return this.instance
    }
}

self.addEventListener('message', async (event) => {
    const { type, audio, model_name, language } = event.data
    if (type === MessageTypes.INFERENCE_REQUEST) {
        await transcribe(audio, model_name, language)
    }
})

async function transcribe(audio, model_name, language) {
    sendLoadingMessage('loading')

    let transcriber

    try {
        transcriber = await MyTranscriptionPipeline.getInstance(load_model_callback, model_name)
    } catch (err) {
        console.error(err.message)
        self.postMessage({
            type: MessageTypes.ERROR,
            message: 'Failed to load AI model: ' + err.message
        })
        return
    }

    if (!transcriber) {
        self.postMessage({
            type: MessageTypes.ERROR,
            message: 'AI model failed to initialize. Try reloading the page.'
        })
        return
    }

    sendLoadingMessage('success')

    let result
    try {
        const options = {
            chunk_length_s: 30,
            stride_length_s: 5,
            task: 'transcribe',
            no_repeat_ngram_size: 3,
            repetition_penalty: 1.15,
        }

        if (language) {
            options.language = language
        }

        result = await transcriber(audio, options)
    } catch (err) {
        console.error(err.message)
        self.postMessage({
            type: MessageTypes.ERROR,
            message: 'Failed to transcribe audio: ' + err.message
        })
        return
    }

    const chunks = result?.chunks || [{ text: result?.text || '' }]

    self.postMessage({
        type: MessageTypes.RESULT,
        results: chunks,
    })

    self.postMessage({ type: MessageTypes.INFERENCE_DONE })
}

async function load_model_callback(data) {
    const { status } = data
    if (status === 'progress') {
        const { file, progress, loaded, total } = data
        sendDownloadingMessage(file, progress, loaded, total)
    }
}

function sendLoadingMessage(status) {
    self.postMessage({
        type: MessageTypes.LOADING,
        status
    })
}

async function sendDownloadingMessage(file, progress, loaded, total) {
    self.postMessage({
        type: MessageTypes.DOWNLOADING,
        file,
        progress,
        loaded,
        total
    })
}
