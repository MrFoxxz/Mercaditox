import { categories, type Category } from "./catalog";

export const listColors = {
  naranja: { label: "Naranja", accent: "#FDBB91", surface: "#2C211B", border: "#50392B" },
  violeta: { label: "Violeta", accent: "#DFBCFF", surface: "#2D2137", border: "#593C6C" },
  verde: { label: "Verde", accent: "#C3DF9E", surface: "#242B20", border: "#3D5032" },
  azul: { label: "Azul", accent: "#B1D7FF", surface: "#202B38", border: "#344C66" },
  rosa: { label: "Rosa", accent: "#FFC1D2", surface: "#33232C", border: "#633D51" },
} as const;

export type ListColor = keyof typeof listColors;
export const colorChoices = Object.keys(listColors) as ListColor[];

export function nextListColor(lists: { color?: ListColor }[]): ListColor {
  return colorChoices.find((value) => !lists.some((list) => (list.color ?? "naranja") === value)) ?? "naranja";
}

export function aisleOrder(saved: readonly Category[] = []): Category[] {
  const available = categories.map((category) => category.id);
  return [...new Set([...saved.filter((value) => available.includes(value)), ...available])];
}
