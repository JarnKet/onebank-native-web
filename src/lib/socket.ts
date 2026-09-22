import { env } from './env'

declare global {
  interface Window {
    socketClusterClient: any
    socketConnection: any
    socketChannels: any
  }
}

export default class SocketCluster {
  private static createSocketConnection() {
    if (window['socketConnection'] === undefined) {
      window['socketConnection'] = window['socketClusterClient'].create({
        hostname: env.socketHost,
        port: env.socketPort,
        secure: true,
        rejectUnauthorized: true,
        autoReconnect: true,
        autoSubscribeOnConnect: true,
        autoReconnectOptions: {
          initialDelay: 3000,
          multiplier: 1.2,
          maxDelay: 10000,
        },
      })
    }
    return window['socketConnection']
  }

  public static async subscribe(channelName: string, onData: (data: string) => void) {
    const socket = this.createSocketConnection()
    const channel = socket.subscribe(channelName)
    console.log('[SOCKET] Subscribed to ' + channelName)
    if (!window['socketChannels']) window['socketChannels'] = {}
    window['socketChannels'][channelName] = channel

    for await (const data of channel) {
      console.log('RECEIVED DATA: ' + data)
      onData(data)
    }
  }

  public static async unsubscribe(channelName: string) {
    const channel = window['socketChannels'][channelName]
    if (channel) await channel.unsubscribe()
  }
}
