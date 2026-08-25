declare global {
    interface Window {
        /** Legacy Opera (Presto) user-agent hook, still read by `getOs()`. */
        opera?: string
        B1Handler: any
        NativeBridge: any
        browserCallback: any
        barcodeCallback: any
        signatureCallback: any
        urlParams: any
        keyboardShown: (shown: 0 | 1) => void
        screenChanged: (topPadding: number, windowHeight: number) => void
        signatureReceived: (data: string, signature: string) => void
        barcodeReceived: (trace: string, data: string) => void
        coordinateReceived: (data: string) => void
    }
}

export {};
