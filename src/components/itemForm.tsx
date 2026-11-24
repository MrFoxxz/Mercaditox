import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { categories, units, type Product } from "../catalog";
import { maxPrice, readPrice, type Item } from "../shopping";
import { theme } from "../theme";
import { Button, Chevron, Field } from "./marketUi";

export type ItemFields = Omit<Item, "id" | "checked" | "asleep" | "createdAt">;

export function ItemForm({ item, pricesOnly, onSave, onRemove, onSleep }: {
  item?: Item;
  pricesOnly?: boolean;
  onSave: (fields: ItemFields) => void;
  onRemove?: () => void;
  onSleep?: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState<Product["category"]>(item?.category ?? "otros");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [unit, setUnit] = useState<Product["unit"]>(item?.unit ?? "un");
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1));
  const [note, setNote] = useState(item?.note ?? "");
  const [estimated, setEstimated] = useState(item?.estimated?.toString() ?? "");
  const [paid, setPaid] = useState(item?.paid?.toString() ?? "");
  const [quotes, setQuotes] = useState(() => (item?.prices ?? []).map((price) => ({
    store: price.store, amount: String(price.amount),
  })));
  const [selectedPrice, setSelectedPrice] = useState(item?.selectedPrice ?? null);
  const [error, setError] = useState("");

  function submit() {
    const count = Number(quantity.trim().replace(",", "."));
    const validCount = /^\d+(?:[.,]\d{1,3})?$/.test(quantity.trim()) && count > 0 && count <= 10000;
    const prices = [estimated, paid].map((price) => price.trim() ? readPrice(price) : null);
    if (!name.trim() || !validCount) {
      setError("Escribe el nombre y una cantidad mayor que cero, con hasta tres decimales.");
      return;
    }
    if (prices.some((price) => price !== null && (!Number.isFinite(price) || price > maxPrice))) {
      setError("Escribe un precio válido con hasta dos decimales. Por ejemplo, 12,50.");
      return;
    }
    const shopPrices = quotes.map((quote) => ({ store: quote.store.trim(), amount: readPrice(quote.amount) }));
    if (shopPrices.some(({ store, amount }) => !store || !Number.isFinite(amount) || amount > maxPrice)) {
      setError("Cada precio necesita una tienda y un valor válido con hasta dos decimales.");
      return;
    }
    onSave({
      name: name.trim(), category, unit, quantity: count, note: note.trim(),
      estimated: prices[0], paid: prices[1],
      prices: shopPrices,
      selectedPrice,
    });
  }

  function removeQuote(index: number) {
    setQuotes((current) => current.filter((_, position) => position !== index));
    setSelectedPrice((current) => current === index ? null : current !== null && current > index ? current - 1 : current);
  }

  function setQuote(index: number, field: "store" | "amount", value: string) {
    setQuotes((current) => current.map((quote, position) =>
      position === index ? { ...quote, [field]: value } : quote,
    ));
  }

  return (
    <View style={styles.form}>
      {pricesOnly ? <Text style={styles.productTitle}>{name}</Text> : <>
      <Field label="Producto" value={name} onChangeText={setName} maxLength={80} placeholder="Ej. Tomate" />
      <Field label="Cantidad" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" maxLength={10} />
      <Text style={styles.label}>Unidad</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {units.map((value) => <Chip key={value} label={value} selected={value === unit} onPress={() => setUnit(value)} />)}
      </ScrollView>
      <Text style={styles.label}>Categoría</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: categoryOpen }}
        accessibilityLabel={"Categoría: " + categories.find((value) => value.id === category)?.label}
        style={styles.select} onPress={() => setCategoryOpen((open) => !open)}>
        <Text style={styles.optionLabel}>{categories.find((value) => value.id === category)?.label}</Text>
        <Chevron up={categoryOpen} />
      </Pressable>
      {categoryOpen ? <View style={styles.options}>
        {categories.map((value) => <Pressable key={value.id} accessibilityRole="radio"
          accessibilityState={{ checked: value.id === category }} style={styles.option}
          onPress={() => { setCategory(value.id); setCategoryOpen(false); }}>
          <Text style={[styles.optionLabel, value.id === category && styles.selectedText]}>{value.icon}  {value.label}</Text>
          {value.id === category ? <Text style={styles.selectedText}>✓</Text> : null}
        </Pressable>)}
      </View> : null}
      </>}
      <View style={styles.priceRow}>
        <View style={styles.flex}><Field label="$ Estimado por unidad" value={estimated} onChangeText={setEstimated} keyboardType="decimal-pad" maxLength={18} /></View>
        <View style={styles.flex}><Field label="$ Pagado por unidad" value={paid} onChangeText={setPaid} keyboardType="decimal-pad" maxLength={18} /></View>
      </View>
      {quotes.map((quote, index) => (
        <View key={index} style={styles.quote}>
          <Field label={"Tienda " + (index + 1)} value={quote.store} onChangeText={(value) => setQuote(index, "store", value)}
            maxLength={60} placeholder="Ej. Plaza de mercado" />
          <Field label="$ Precio por unidad" value={quote.amount} onChangeText={(value) => setQuote(index, "amount", value)}
            keyboardType="decimal-pad" maxLength={18} placeholder="Ej. 12,50" />
          <Chip label={selectedPrice === index ? "✓ Precio para la lista" : "Usar este precio"}
            selected={selectedPrice === index} onPress={() => setSelectedPrice((current) => current === index ? null : index)} />
          <Button label="Quitar precio" onPress={() => removeQuote(index)} quiet />
        </View>
      ))}
      <Button label="+ Agregar otro precio" onPress={() => setQuotes((current) => [...current, { store: "", amount: "" }])}
        disabled={quotes.length >= 6} quiet />
      {!pricesOnly ? <Field label="Nota" value={note} onChangeText={setNote} maxLength={240} placeholder="Opcional" multiline /> : null}
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      <Button label={pricesOnly ? "Guardar precios" : "Guardar producto"} onPress={submit} />
      {!pricesOnly && onSleep ? <Button label={item?.asleep ? "Mostrar en la compra" : "Ocultar en esta compra"} onPress={onSleep} quiet /> : null}
      {!pricesOnly && onRemove ? <Button label="Sacar de la lista" onPress={onRemove} quiet /> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.selected]}>
      <Text style={[styles.label, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  form: { gap: 9 },
  flex: { flex: 1 },
  priceRow: { flexDirection: "row", gap: 8 },
  productTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "700" },
  label: { color: theme.colors.muted, fontSize: 14, fontWeight: "600" },
  select: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44, backgroundColor: theme.colors.surface, borderColor: theme.colors.divider, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  options: { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 42, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  optionLabel: { color: theme.colors.text, fontSize: 15 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { borderRadius: 18, borderWidth: 1, borderColor: theme.colors.divider, backgroundColor: theme.colors.surface, paddingVertical: 9, paddingHorizontal: 12 },
  selected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.raised },
  selectedText: { color: theme.colors.accent },
  quote: { gap: 8, padding: 12, borderRadius: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.divider },
  error: { color: theme.colors.danger, fontSize: 14 },
});
