import { Image, StyleSheet, Text, View } from "react-native";
import { art, Brand } from "./marketUi";
import { theme } from "../theme";

const steps = [
  { image: art.plan, title: "Prepara tu lista",
    detail: "En Mis listas puedes crear o abrir una lista. Toca ⋯ junto a su nombre para renombrarla, cambiarle el color o eliminarla." },
  { image: art.search, title: "Encuentra y añade productos",
    detail: "Abre + Producto, busca por nombre o filtra por categoría. Usa la estrella para guardar favoritos. Con Seleccionar varios puedes añadir todo de una vez." },
  { image: art.price, title: "Controla las cantidades y los precios",
    detail: "Ajusta la cantidad con − y +. Toca el importe para guardar precios por tienda y elegir cuál suma. Comparar tiendas muestra el subtotal y los productos cotizados en cada una." },
  { image: art.shop, title: "Recorre los pasillos",
    detail: "Despliega el encabezado y abre Ordenar pasillos. Luego activa Modo compra para ver los pendientes en ese orden. Marca cada compra y usa Deshacer si te equivocas." },
  { image: art.checklist, title: "Oculta o saca un producto",
    detail: "Usa el ojo para dejarlo fuera de esta compra. Puedes recuperarlo desde Ver ocultos. Si quieres retirarlo de la lista, toca la papelera y confirma." },
  { image: art.people, title: "Comparte la compra",
    detail: "En Compartir puedes generar un código para comprar en equipo. Para enviar una copia informativa, abre Exportar lista en el encabezado y elige PDF o WhatsApp." },
  { image: art.done, title: "Cierra el mercado",
    detail: "Despliega el encabezado y toca Cerrar mercado. Puedes dejar una nota, revisar los totales en Historial y reutilizar los productos en tu próxima compra." },
];

export function MarketGuide() {
  return <>
    <View style={styles.intro}>
      <Image source={art.help} style={styles.mascot} resizeMode="contain" accessible={false} />
      <Brand />
    </View>
    {steps.map(({ title, detail, image }) => <View key={title} style={styles.card}>
      <Image source={image} style={styles.illustration} resizeMode="contain" accessible={false} />
      <View style={styles.copy}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
    </View>)}
    <Text style={styles.credit}>Creado por FFoxx</Text>
  </>;
}

const styles = StyleSheet.create({
  intro: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  mascot: { width: 86, height: 86 },
  illustration: { width: 54, height: 54 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12,
    backgroundColor: theme.colors.surface, borderColor: theme.colors.divider, borderWidth: 1 },
  copy: { flex: 1, gap: 4 },
  title: { color: theme.colors.accent, fontSize: 15, fontWeight: "700" },
  detail: { color: theme.colors.muted, fontSize: 14, lineHeight: 20 },
  credit: { textAlign: "center", color: theme.colors.muted, fontSize: 12, paddingVertical: 9 },
});
