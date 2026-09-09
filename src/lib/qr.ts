import QRCode from "qrcode";

/** Renders a QR code encoding `data` as a PNG data URL, suitable for <img src>. */
export async function qrCodeDataUrl(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });
}

/** Renders a QR code encoding `data` as a PNG buffer, suitable for an email attachment. */
export async function qrCodeBuffer(data: string): Promise<Buffer> {
  return QRCode.toBuffer(data, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });
}
