/**
 * Turning a picked image into something the mock backend can store.
 *
 * There is no upload bucket any more, so a group logo is kept as a data URL.
 * It is downscaled first: the mock database lives in sessionStorage, and a
 * phone photo as a data URL would blow its quota on its own.
 */

export interface PictureResult {
  url?: string
  error?: string
}

const MAX_EDGE = 256

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('That file is not an image'))
    image.src = src
  })
}

export async function readPicture(file: File): Promise<PictureResult> {
  if (!file.type.startsWith('image/')) return { error: 'Choose an image file' }
  try {
    const original = await readAsDataUrl(file)
    const image = await loadImage(original)
    const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.width * scale)
    canvas.height = Math.round(image.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return { url: original }
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return { url: canvas.toDataURL('image/jpeg', 0.85) }
  } catch (error) {
    return { error: (error as Error).message }
  }
}
