import { isLoaded } from "expo-font";
import { createContext, useContext, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View, type ImageSourcePropType, type TextInputProps } from "react-native";
import { theme } from "../theme";
import { listColors } from "../listPreferences";

export const mascot = require("../../assets/mercaditoxLogo.png");
export const wordmark = require("../../assets/mercaditoxText.png");
export const art = {
  basket: require("../../assets/mercaditox_ui_icon/icon-basket.png"),
  checklist: require("../../assets/mercaditox_ui_icon/icon-checklist.png"),
  people: require("../../assets/mercaditox_ui_icon/icon-people.png"),
  price: require("../../assets/mercaditox_ui_icon/icon-price-tag.png"),
  welcome: require("../../assets/mascot/happyFox.png"),
  help: require("../../assets/mascot/foxpregunta.png"),
  plan: require("../../assets/mascot/foxchecklist.png"),
  search: require("../../assets/mascot/foxlupa.png"),
  shop: require("../../assets/mascot/foxcompras.png"),
  done: require("../../assets/mascot/foxcheckgreen.png"),
};
export const ListTint = createContext<(typeof listColors)[keyof typeof listColors]>(listColors.naranja);

export function Chevron({ up }: { up?: boolean }) {
  return <View style={[styles.chevron, up && styles.chevronUp]} />;
}

export function Eye({ hidden }: { hidden?: boolean }) {
  return <View style={styles.eye}>
    <View style={styles.pupil} />
    {hidden ? <View style={styles.eyeSlash} /> : null}
  </View>;
}

export function Trash() {
  return <View style={styles.trash} accessible={false}>
    <View style={styles.trashHandle} />
    <View style={styles.trashLid} />
    <View style={styles.trashBin} />
  </View>;
}

export function Brand() {
  return <Image source={wordmark} resizeMode="contain" style={styles.brand} accessibilityLabel="Mercaditox" accessible />;
}

export function Heading({ children, small }: { children: ReactNode; small?: boolean }) {
  const face = isLoaded(theme.font.display) ? styles.display : styles.bold;
  return <Text accessibilityRole="header" style={[styles.heading, small && styles.smallHeading, face]}>{children}</Text>;
}

export function Button({ label, onPress, quiet, disabled, icon }: {
  label: string; onPress: () => void; quiet?: boolean; disabled?: boolean; icon?: ImageSourcePropType;
}) {
  const tint = useContext(ListTint);
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.button, quiet ? [styles.quiet, { backgroundColor: tint.surface, borderColor: tint.border }]
        : { backgroundColor: tint.accent }, (pressed || disabled) && styles.dim]}>
      {icon ? <Image source={icon} resizeMode="contain" style={styles.buttonIcon} accessible={false} /> : null}
      <Text style={[styles.buttonText, icon ? styles.iconLabel : undefined, quiet && styles.quietText]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...input }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={theme.colors.muted}
        selectionColor={theme.colors.accent} style={styles.input} {...input} />
    </View>
  );
}

export const styles = StyleSheet.create({
  chevron: { width: 9, height: 9, borderBottomWidth: 2, borderRightWidth: 2, borderColor: theme.colors.accent, transform: [{ rotate: "45deg" }], marginBottom: 4 },
  chevronUp: { transform: [{ rotate: "225deg" }], marginBottom: 0, marginTop: 4 },
  eye: { width: 19, height: 12, borderWidth: 1.5, borderColor: theme.colors.accent, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  pupil: { width: 5, height: 5, borderRadius: 3, backgroundColor: theme.colors.accent },
  eyeSlash: { position: "absolute", width: 22, height: 2, borderRadius: 1, backgroundColor: theme.colors.accent, transform: [{ rotate: "-35deg" }] },
  trash: { width: 18, height: 19, alignItems: "center", justifyContent: "center", gap: 1 },
  trashHandle: { width: 6, height: 2, backgroundColor: theme.colors.danger, borderRadius: 1 },
  trashLid: { width: 15, height: 2, backgroundColor: theme.colors.danger, borderRadius: 1 },
  trashBin: { width: 12, height: 11, borderColor: theme.colors.danger, borderWidth: 1.5, borderTopWidth: 0, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  brand: { width: 157, height: 53 },
  heading: { color: theme.colors.text, fontSize: 31, letterSpacing: -0.8 },
  smallHeading: { fontSize: 23, letterSpacing: -0.35 },
  display: { fontFamily: theme.font.display },
  bold: { fontWeight: "700" },
  button: { flexDirection: "row", gap: 5, borderRadius: 12, justifyContent: "center", alignItems: "center", minHeight: 44, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: theme.colors.accent },
  buttonIcon: { width: 21, height: 21 },
  iconLabel: { flexShrink: 1 },
  quiet: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.divider },
  buttonText: { color: theme.colors.background, fontSize: 15, fontWeight: "700", textAlign: "center" },
  quietText: { color: theme.colors.text },
  dim: { opacity: 0.63 },
  field: { gap: 4 },
  label: { color: theme.colors.muted, fontSize: 14, fontWeight: "600" },
  input: { color: theme.colors.text, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.divider, borderRadius: 13, minHeight: 46, paddingVertical: 10, paddingHorizontal: 13, fontSize: 16 },
});
