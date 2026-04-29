import QRCode from "qrcode";

export async function generateQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 200,
    color: {
      dark: "#000000",
      light: "#ffffff00",
    },
  });
}
