import { printToFileAsync } from "expo-print";
import { isAvailableAsync, shareAsync } from "expo-sharing";
import { Linking, Share } from "react-native";
import { formatQuantity, type Item } from "./shopping";

type ExportItem = Pick<Item, "name" | "quantity" | "unit">;

const amount = (item: ExportItem) => formatQuantity(item.quantity) + " " + item.unit;
const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function shareListText(name: string, products: ExportItem[]) {
  const message = [name, "", ...products.map((item) => "• " + item.name + " — " + amount(item)),
    "", "Descarga Mercaditox para organizar y compartir tus compras."].join("\n");
  try {
    await Linking.openURL("whatsapp://send?text=" + encodeURIComponent(message));
  } catch {
    await Share.share({ message });
  }
}

export async function shareListPdf(name: string, products: ExportItem[]) {
  if (!await isAvailableAsync()) throw new Error("El dispositivo no puede compartir archivos PDF.");
  const rows = products.map((item) =>
    "<tr><td>" + escapeHtml(item.name) + "</td><td>" + escapeHtml(amount(item)) + "</td></tr>").join("");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
    @page { margin: 20mm; }
    body { color: #231c19; font: 14px sans-serif; }
    h1 { font-size: 23px; margin: 0 0 16px; overflow-wrap: anywhere; }
    table { width: 100%; border-collapse: collapse; }
    thead { display: table-header-group; background: #f6ede6; }
    tr { break-inside: avoid; }
    th, td { padding: 7px 8px; text-align: left; border-bottom: 1px solid #e8ded8; }
    td:first-child { overflow-wrap: anywhere; }
    td:last-child { white-space: nowrap; width: 25%; }
    </style></head><body><h1>${escapeHtml(name)}</h1>
    <table><thead><tr><th>Producto</th><th>Cantidad</th></tr></thead><tbody>${rows}</tbody></table>
    </body></html>`;
  const { uri } = await printToFileAsync({ html });
  await shareAsync(uri, { dialogTitle: "Enviar lista de Mercaditox", mimeType: "application/pdf", UTI: "com.adobe.pdf" });
}
