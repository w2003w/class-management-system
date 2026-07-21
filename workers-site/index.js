import { getAssetFromKV, NotFoundError, MethodNotAllowedError } from '@cloudflare/kv-asset-handler'

addEventListener('fetch', event => {
  event.respondWith(handleEvent(event))
})

async function handleEvent(event) {
  const url = new URL(event.request.url)
  let options = {}

  try {
    if (event.request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      })
    }

    return await getAssetFromKV(event, options)
  } catch (e) {
    if (e instanceof NotFoundError) {
      return new Response('Not found', { status: 404 })
    } else if (e instanceof MethodNotAllowedError) {
      return new Response('Method not allowed', { status: 405 })
    } else {
      return new Response('An unexpected error occurred', { status: 500 })
    }
  }
}