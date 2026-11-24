export const categories = [
  { id: "verduras", label: "Verduras", icon: "🥦" },
  { id: "frutas", label: "Frutas", icon: "🍎" },
  { id: "proteinas", label: "Carnes y huevos", icon: "🥚" },
  { id: "lacteos", label: "Lácteos", icon: "🧀" },
  { id: "despensa", label: "Despensa", icon: "🍚" },
  { id: "panaderia", label: "Panadería", icon: "🥖" },
  { id: "bebidas", label: "Bebidas", icon: "🧃" },
  { id: "higiene", label: "Higiene", icon: "🪥" },
  { id: "aseo", label: "Limpieza", icon: "🧽" },
  { id: "hogar", label: "Hogar", icon: "🏠" },
  { id: "ferreteria", label: "Ferretería", icon: "🔧" },
  { id: "otros", label: "Otros", icon: "🛒" },
] as const;

export type Category = (typeof categories)[number]["id"];

export const units = ["un", "kg", "g", "L", "ml", "paquete", "manojo"] as const;
export type Unit = (typeof units)[number];

export type Product = { name: string; category: Category; unit: Unit };
export type CatalogProduct = Product & { aliases?: string[] };

const regionalNames: Record<string, string[]> = {
  "Cebolla cabezona": ["cebolla de bulbo", "cebolla redonda"],
  "Papa criolla": ["papa amarilla"],
  "Papa pastusa": ["papa blanca", "patata"],
  Yuca: ["mandioca", "casava"],
  "Plátano verde": ["plátano macho", "plátano de cocinar"],
  Pepino: ["pepino cohombro"],
  Habichuela: ["chaucha", "vainita", "ejote", "judía verde"],
  Pimentón: ["morrón", "pimiento dulce", "ají morrón"],
  Remolacha: ["betabel", "betarraga"],
  Aguacate: ["palta"],
  Mazorca: ["choclo", "jojoto", "elote"],
  Calabacín: ["zucchini", "zapallito italiano"],
  Ahuyama: ["auyama", "zapallo", "calabaza"],
  "Cebolla larga": ["cebollín", "cebolla junca", "cebolla de verdeo"],
  Batata: ["camote", "boniato", "batata dulce"],
  "Arveja fresca": ["guisante", "petit pois", "chícharo"],
  Banano: ["banana", "cambur", "guineo"],
  Fresa: ["frutilla"],
  Papaya: ["lechosa", "mamón"],
  Piña: ["ananá", "ananás"],
  Maracuyá: ["parchita", "fruta de la pasión"],
  Sandía: ["patilla"],
  Durazno: ["melocotón"],
  "Carne molida": ["carne picada"],
  Salchichas: ["frankfurters"],
  Mantequilla: ["manteca"],
  Arequipe: ["dulce de leche", "manjar blanco"],
  Fríjol: ["frijol", "caraota", "poroto", "habichuela seca"],
  Panela: ["papelón", "chancaca", "piloncillo"],
  "Maíz para crispetas": ["maíz pisingallo", "maíz para cotufas", "maíz para pochoclo", "maíz para palomitas"],
  "Harina de maíz precocida": ["harina para arepas", "harina pan"],
  "Fécula de maíz": ["maicena", "maizena"],
  Maní: ["cacahuate", "cacahuete"],
  Gaseosa: ["refresco", "soda", "bebida gaseosa"],
  "Agua con gas": ["sifón de soda"],
  "Crema dental": ["pasta de dientes", "dentífrico"],
  "Copitos de algodón": ["hisopos", "cotonetes"],
  Curitas: ["apósitos adhesivos", "tiritas"],
  Lavaloza: ["lavaplatos", "detergente para platos"],
  Cloro: ["lavandina", "lejía"],
  Trapero: ["coleto", "mopa", "trapeador"],
  Balde: ["cubo", "tobo"],
  "Toallas de papel": ["rollo de cocina", "papel absorbente"],
  "Portacomidas": ["vianda", "lonchera"],
  "Bombillo LED": ["bombita LED", "foco LED", "lámpara LED"],
  "Cinta métrica": ["flexómetro", "metro retráctil"],
  Chazos: ["tarugos", "tacos de pared", "ramplús"],
  "Bridas plásticas": ["precintos", "tirrap"],
  "Bolígrafo": ["lapicera", "birome", "lapicero"],
  "Puerro": ["ajo porro", "poro"],
  "Berenjena morada": ["berenjena negra"],
  "Judías blancas": ["porotos alubia", "caraotas blancas"],
  "Frijoles negros en lata": ["caraotas negras en lata"],
  "Palmitos en conserva": ["palmitos en lata"],
  Uchuva: ["aguaymanto", "uvilla", "physalis"],
  Níspero: ["mispero", "níspero japonés"],
  "Achicoria": ["radicheta"],
  "Panceta": ["tocineta", "tocino", "bacon"],
  "Dulce de guayaba": ["bocadillo de guayaba", "conserva de guayaba"],
  "Papel manteca": ["papel encerado"],
  "Trapo de piso": ["paño de piso"],
  "Paño de cocina": ["toalla de cocina"],
  "Vendas adhesivas": ["vendas autoadhesivas"],
  "Tornillos para madera": ["tirafondos"],
  "Cinta adhesiva transparente": ["cinta cristal", "cinta para embalar"],
};

const groups: [Category, Unit, string[]][] = [
  ["verduras", "kg", ["Tomate", "Cebolla cabezona", "Papa criolla", "Papa pastusa", "Yuca", "Zanahoria", "Plátano verde", "Pepino", "Habichuela", "Pimentón", "Remolacha"]],
  ["verduras", "un", ["Lechuga", "Brócoli", "Coliflor", "Aguacate", "Ajo", "Mazorca", "Calabacín", "Ahuyama"]],
  ["verduras", "manojo", ["Cilantro", "Espinaca", "Cebolla larga", "Perejil"]],
  ["frutas", "kg", ["Banano", "Mango", "Guayaba", "Fresa", "Uva", "Mandarina", "Naranja", "Limón", "Lulo", "Tomate de árbol", "Granadilla", "Maracuyá"]],
  ["frutas", "un", ["Manzana", "Pera", "Papaya", "Piña", "Sandía", "Melón"]],
  ["proteinas", "kg", ["Pechuga de pollo", "Muslos de pollo", "Carne molida", "Carne de res", "Lomo de cerdo", "Tilapia", "Salmón"]],
  ["proteinas", "un", ["Huevo", "Atún en lata", "Sardinas en lata"]],
  ["proteinas", "paquete", ["Chorizo", "Salchichas", "Jamón"]],
  ["lacteos", "L", ["Leche entera", "Leche deslactosada", "Yogur natural"]],
  ["lacteos", "g", ["Queso campesino", "Queso mozzarella", "Mantequilla", "Cuajada"]],
  ["lacteos", "un", ["Crema de leche", "Arequipe"]],
  ["despensa", "kg", ["Arroz", "Lentejas", "Fríjol", "Garbanzos", "Azúcar", "Harina de trigo"]],
  ["despensa", "paquete", ["Pasta", "Harina de maíz", "Avena", "Panela", "Sal", "Café molido", "Chocolate de mesa", "Cereal", "Galletas", "Maíz para crispetas"]],
  ["despensa", "un", ["Aceite", "Vinagre", "Salsa de tomate", "Mayonesa", "Miel", "Caldo de pollo"]],
  ["panaderia", "un", ["Pan de molde", "Pan francés", "Almojábana", "Pandebono", "Croissant"]],
  ["panaderia", "paquete", ["Arepas", "Tortillas", "Tostadas"]],
  ["bebidas", "L", ["Agua", "Jugo de naranja", "Gaseosa", "Agua con gas"]],
  ["bebidas", "paquete", ["Té", "Aromática"]],
  ["verduras", "kg", ["Batata", "Berenjena", "Arracacha", "Arveja fresca", "Jengibre"]],
  ["verduras", "un", ["Repollo", "Champiñones", "Apio", "Rábano"]],
  ["frutas", "kg", ["Mora", "Pitahaya", "Kiwi", "Arándanos", "Durazno"]],
  ["frutas", "un", ["Coco", "Guanábana"]],
  ["proteinas", "kg", ["Costilla de cerdo", "Sobrebarriga", "Hígado de res", "Trucha", "Camarón", "Alitas de pollo"]],
  ["lacteos", "un", ["Leche condensada", "Kumis", "Yogur griego"]],
  ["lacteos", "g", ["Queso parmesano", "Queso doble crema", "Queso crema"]],
  ["despensa", "paquete", ["Quinua", "Cuscús", "Almidón de yuca", "Fécula de maíz", "Granola", "Arequipe en polvo", "Gelatina", "Uvas pasas", "Maní", "Almendras", "Coco rallado"]],
  ["despensa", "un", ["Aceite de oliva", "Mostaza", "Salsa de soya", "Salsa BBQ", "Pasta de tomate", "Aceitunas", "Pepinillos", "Maíz dulce en lata", "Mermelada", "Pimienta", "Comino", "Orégano", "Canela"]],
  ["panaderia", "un", ["Pan integral", "Baguette", "Buñuelo", "Mogolla", "Pan para hamburguesa"]],
  ["bebidas", "L", ["Leche de almendras", "Jugo de guayaba", "Bebida de avena", "Agua de coco"]],
  ["bebidas", "paquete", ["Chocolate en polvo", "Café instantáneo", "Té verde"]],
  ["higiene", "un", ["Jabón de manos", "Champú", "Crema dental", "Jabón corporal", "Acondicionador", "Cepillo de dientes", "Hilo dental", "Enjuague bucal", "Desodorante", "Protector solar", "Crema corporal", "Gel antibacterial", "Máquina de afeitar", "Espuma de afeitar", "Peine", "Cepillo para el cabello", "Cortaúñas", "Bálsamo labial", "Agua micelar", "Jabón facial", "Crema para peinar"]],
  ["higiene", "paquete", ["Papel higiénico", "Toallas higiénicas", "Protectores diarios", "Tampones", "Pañales", "Pañitos húmedos", "Pañuelos desechables", "Copitos de algodón", "Algodón", "Discos desmaquillantes", "Curitas"]],
  ["aseo", "un", ["Lavaloza", "Detergente", "Suavizante", "Desinfectante", "Cloro", "Esponja", "Limpiador multiusos", "Limpiavidrios", "Desengrasante", "Quitamanchas", "Limpiador de pisos", "Limpiador de baño", "Limpiador de inodoro", "Jabón para ropa", "Cera para pisos", "Escoba", "Recogedor", "Trapero", "Balde", "Cepillo de limpieza", "Cepillo para inodoro", "Paño de microfibra", "Ambientador", "Destapador de inodoro", "Cepillo para ropa", "Plumero", "Repuesto de trapero"]],
  ["aseo", "paquete", ["Bolsas de basura", "Guantes de aseo", "Estropajos", "Toallitas desinfectantes", "Pastillas para lavavajillas"]],
  ["hogar", "un", ["Papel aluminio", "Papel film", "Papel para hornear", "Encendedor", "Termo", "Vaso medidor", "Colador", "Tabla de picar", "Abrelatas", "Sacacorchos", "Rallador", "Espátula de cocina", "Portacomidas", "Bandeja para hielo", "Jarra", "Sartén", "Olla", "Plato", "Vaso", "Taza", "Manta", "Toalla de baño", "Cortina de baño", "Alfombra de baño", "Canasta para ropa", "Organizador", "Caja plástica", "Protector de colchón"]],
  ["hogar", "paquete", ["Toallas de papel", "Servilletas", "Bolsas herméticas", "Filtros de café", "Fósforos", "Velas", "Ganchos para ropa", "Pinzas para ropa", "Recipientes herméticos", "Vasos desechables", "Platos desechables"]],
  ["ferreteria", "un", ["Bombillo LED", "Linterna", "Extensión eléctrica", "Multitoma", "Adaptador de enchufe", "Cinta aislante", "Cinta métrica", "Cinta de enmascarar", "Cinta doble faz", "Cinta de teflón", "Martillo", "Destornillador de estrella", "Destornillador de pala", "Alicate", "Llave ajustable", "Llave Allen", "Nivel", "Bisturí", "Taladro", "Broca", "Candado", "Bisagra", "Picaporte", "Silicona", "Pegante instantáneo", "Pegante para madera", "Lubricante multiusos", "Lija", "Brocha", "Rodillo para pintura", "Bandeja para pintura", "Masilla", "Pintura", "Espátula para masilla", "Gafas de protección", "Guantes de trabajo", "Manguera de jardín", "Abrazadera", "Cuerda", "Alambre"]],
  ["ferreteria", "paquete", ["Pilas AA", "Pilas AAA", "Tornillos", "Clavos", "Chazos", "Tuercas", "Arandelas", "Bridas plásticas", "Ganchos adhesivos"]],
  ["otros", "paquete", ["Comida para perro", "Comida para gato", "Arena para gato", "Bolsas para mascotas"]],
  ["otros", "un", ["Champú para mascotas", "Cuaderno", "Bolígrafo", "Marcador", "Tijeras"]],
  ["verduras", "un", ["Repollo morado", "Acelga", "Boniato morado", "Zapallito redondo"]],
  ["frutas", "kg", ["Ciruela", "Cereza", "Higo", "Membrillo"]],
  ["proteinas", "kg", ["Vacío", "Matambre", "Milanesas", "Carne para mechada"]],
  ["lacteos", "un", ["Leche en polvo", "Queso rallado", "Leche evaporada"]],
  ["despensa", "paquete", ["Harina de maíz precocida", "Harina integral", "Yerba mate", "Mate cocido", "Sémola", "Porotos negros", "Caraotas rojas", "Sopa de fideos"]],
  ["despensa", "un", ["Salsa inglesa", "Dulce de membrillo", "Dulce de batata", "Salsa picante", "Puré de tomate"]],
  ["panaderia", "un", ["Medialuna", "Facturas", "Cachito de jamón", "Pan de yuca"]],
  ["bebidas", "L", ["Malta", "Horchata", "Jugo de manzana"]],
  ["higiene", "un", ["Protector labial con FPS", "Talco corporal", "Cepillo interdental"]],
  ["aseo", "un", ["Jabón en barra para lavar ropa", "Detergente líquido para ropa", "Repelente de insectos"]],
  ["hogar", "un", ["Mate", "Bombilla para mate", "Cucharón", "Repasador"]],
  ["ferreteria", "un", ["Pistola para silicona", "Llave de tubo", "Pinza de punta", "Pistola encoladora"]],
  ["verduras", "un", ["Puerro", "Berenjena morada", "Repollo chino", "Coles de Bruselas", "Espárragos", "Chayote", "Hinojo", "Alcachofa", "Endivia"]],
  ["verduras", "manojo", ["Berros", "Albahaca", "Menta", "Achicoria", "Rúcula", "Eneldo", "Tomillo fresco", "Romero fresco"]],
  ["frutas", "kg", ["Nectarina", "Frambuesa", "Uchuva", "Níspero", "Uva verde", "Toronja", "Damasco", "Guinda", "Tamarindo"]],
  ["frutas", "un", ["Carambola", "Mamey", "Zapote", "Feijoa"]],
  ["proteinas", "kg", ["Higaditos de pollo", "Pavo molido", "Bagre", "Merluza", "Calamar", "Pulpo", "Lengua de res", "Panceta", "Churrasco"]],
  ["proteinas", "paquete", ["Tocino ahumado", "Mortadela", "Salame", "Salchichón", "Tofu"]],
  ["lacteos", "g", ["Queso gouda", "Queso cheddar", "Queso de cabra", "Ricota", "Queso provolone"]],
  ["lacteos", "un", ["Postre de vainilla", "Yogur bebible", "Crema agria", "Kéfir"]],
  ["despensa", "paquete", ["Fideos de arroz", "Pasta integral", "Arroz integral", "Arroz para sushi", "Sémola de maíz", "Fideos para lasaña", "Judías blancas", "Arvejas partidas", "Pasas de ciruela", "Semillas de chía", "Linaza", "Nueces", "Pistachos", "Semillas de girasol", "Cacao en polvo", "Pan rallado", "Puré de papa instantáneo"]],
  ["despensa", "un", ["Tomates en conserva", "Frijoles negros en lata", "Palmitos en conserva", "Encortidos", "Alcaparras", "Vinagre balsámico", "Aceite de girasol", "Aceite de coco", "Tahini", "Mantequilla de maní", "Dulce de guayaba", "Levadura seca", "Polvo de hornear", "Bicarbonato", "Páprika", "Cúrcuma", "Nuez moscada", "Laurel seco"]],
  ["panaderia", "un", ["Pan de centeno", "Pan pita", "Pan para perro caliente", "Pan brioche", "Empanadas", "Tequeños", "Alfajores", "Bizcochos salados"]],
  ["bebidas", "L", ["Ginger ale", "Jugo de maracuyá", "Jugo de tomate", "Bebida de soya", "Bebida de arroz", "Agua tónica"]],
  ["higiene", "un", ["Cepillo desenredante", "Crema de manos", "Piedra pómez", "Jabón neutro", "Aceite para bebé", "Crema para pañal", "Vendas adhesivas", "Termómetro digital"]],
  ["aseo", "un", ["Jabón para ropa delicada", "Limpiador de acero", "Limpiador de horno", "Pulidor de muebles", "Quitapelusas", "Trapo de piso", "Escobilla para vidrios"]],
  ["hogar", "un", ["Papel manteca", "Paño de cocina", "Individual de mesa", "Mantel", "Guante de horno", "Reloj de cocina", "Prensa para café", "Jabonera", "Colgador de puerta", "Cesto organizador", "Funda para almohada", "Sábana ajustable"]],
  ["ferreteria", "un", ["Probador de voltaje", "Regleta", "Protector de sobretensión", "Cutter de precisión", "Llave para tubos", "Escuadra", "Prensa de banco", "Serrucho", "Pistola de calafateo", "Cinta adhesiva transparente", "Burlete", "Sellador para madera", "Pintura en aerosol"]],
  ["ferreteria", "paquete", ["Tornillos para madera", "Pasadores", "Remaches", "Terminales eléctricos", "Tapones de goma"]],
  ["otros", "un", ["Juguete para perro", "Rascador para gato", "Plato para mascotas", "Cepillo para mascotas", "Cinta correctora", "Carpeta", "Sacapuntas", "Regla escolar", "Goma de borrar"]],
  ["otros", "paquete", ["Resma de papel", "Sobres", "Lápices de colores", "Pegatinas", "Premios para perro", "Snacks para gato"]],
];

export const catalog: CatalogProduct[] = groups.flatMap(([category, unit, names]) =>
  names.map((name) => ({ name, category, unit, ...(regionalNames[name] && { aliases: regionalNames[name] }) })),
);

export const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es");

export function productNames(product: CatalogProduct) {
  return [product.name, ...(product.aliases ?? regionalNames[product.name] ?? [])];
}

export function parseCatalog(value: unknown): CatalogProduct[] | undefined {
  if (!Array.isArray(value) || !value.length) return undefined;
  const products: CatalogProduct[] = [];
  const names = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return undefined;
    const { name, category, unit, aliases } = entry as Record<string, unknown>;
    const validCategory = categories.find((candidate) => candidate.id === category);
    const validUnit = units.find((candidate) => candidate === unit);
    if (typeof name !== "string" || !name.trim() || name.length > 80 || !validCategory || !validUnit) {
      return undefined;
    }
    const key = normalize(name);
    if (names.has(key)) return undefined;
    names.add(key);
    const validAliases = Array.isArray(aliases)
      ? aliases.filter((alias): alias is string => typeof alias === "string" && alias.trim().length > 0 && alias.length <= 80).slice(0, 16)
      : undefined;
    products.push({
      name: name.trim(), category: validCategory.id, unit: validUnit,
      ...(validAliases?.length ? { aliases: validAliases } : {}),
    });
  }
  return products;
}
