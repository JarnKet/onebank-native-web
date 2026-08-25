/**
 * The three-step picture upload: compress, ask for a signed URL, PUT.
 *
 * The compressor is injected — the real one needs a canvas, which jsdom has
 * not got — and `fetch` is stubbed, so what is under test is the sequencing and
 * the failure handling, not the network.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { uploadPicture } from './upload'
import { setTransport } from '../api/client'
import { env } from '../env'

const file = new File(['pretend jpeg'], 'logo.jpg', { type: 'image/jpeg' })
const passThrough = async (f: File) => f as Blob

let calls: Array<{ service: string; data: Record<string, unknown> }>
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  calls = []
  setTransport(async (service, data) => {
    calls.push({ service, data })
    return { result: 0, signedurl: 'https://r2.example/put/abc?sig=1', filename: 'abc.jpg' }
  })
  fetchMock = vi.fn(async () => ({ ok: true, status: 200 }) as any)
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  setTransport(null)
  vi.unstubAllGlobals()
})

describe('uploadPicture', () => {
  it('asks USER/getuploadurlr2 for the signed URL', async () => {
    await uploadPicture(file, passThrough)
    expect(calls).toHaveLength(1)
    expect(calls[0].service).toBe('USER')
    expect(calls[0].data).toMatchObject({ command: 'getuploadurlr2' })
  })

  it('PUTs the compressed body at the signed URL', async () => {
    const compressed = new Blob(['smaller'], { type: 'image/jpeg' })
    await uploadPicture(file, async () => compressed)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://r2.example/put/abc?sig=1')
    expect(init.method).toBe('PUT')
    expect(init.body).toBe(compressed)
    expect(init.headers['Content-Type']).toBe('image/jpeg')
  })

  it('returns the public URL, which the core never sends back', async () => {
    const result = await uploadPicture(file, passThrough)
    expect(result.url).toBe(`${env.uploadPublicPath}abc.jpg`)
    expect(result.filename).toBe('abc.jpg')
    expect(result.error).toBeUndefined()
  })

  it("reports the core's message when the URL request fails", async () => {
    setTransport(async () => ({ result: 1, message: 'quota exceeded' }))
    const result = await uploadPicture(file, passThrough)
    expect(result).toMatchObject({ error: 'quota exceeded' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fails rather than inventing a URL when the response is missing fields', async () => {
    setTransport(async () => ({ result: 0, filename: 'abc.jpg' }))
    const result = await uploadPicture(file, passThrough)
    expect(result.url).toBeUndefined()
    expect(result.error).toBeTruthy()
  })

  it('reports a rejected PUT', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 } as any)
    const result = await uploadPicture(file, passThrough)
    expect(result.url).toBeUndefined()
    expect(result.error).toContain('403')
  })

  it('reports a network failure instead of throwing', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    const result = await uploadPicture(file, passThrough)
    expect(result).toMatchObject({ error: 'offline' })
  })

  it('never asks for a URL when the picture cannot be compressed', async () => {
    const result = await uploadPicture(file, async () => {
      throw new Error('not an image')
    })
    expect(result).toMatchObject({ error: 'not an image' })
    expect(calls).toHaveLength(0)
  })
})
