import Constants from "expo-constants";
import { randomUUID } from "expo-crypto";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, BackHandler, FlatList, Image, KeyboardAvoidingView, Modal, Platform,
  Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { categories, normalize, productNames, type Category, type Product } from "../catalog";
import { Chip, ItemForm, type ItemFields } from "../components/itemForm";
import { art, Brand, Button, Chevron, Eye, Field, Heading, ListTint, mascot, Trash } from "../components/marketUi";
import { MarketGuide } from "../components/marketGuide";
import { shareListPdf, shareListText } from "../exportList";
import { aisleOrder, colorChoices, listColors, nextListColor, type ListColor } from "../listPreferences";
import { compareStores, formatQuantity, itemPrice, marketTotals, money, nextMarket, selectedShopPrice, starter, subtotal, type Closure, type Item, type Member } from "../shopping";
import { theme } from "../theme";
import { useMarket } from "../useMarket";
import { useCatalog } from "../useCatalog";

const cloud = Platform.OS === "android" && Constants.expoConfig?.extra?.firebaseEnabled
  ? (require("../cloud") as typeof import("../cloud"))
  : null;

type Panel = "catalog" | "lists" | "manage" | "profile" | "sync" | "edit" | "history" | "close" | "hidden" | "stores" | "aisles" | "guide" | "export" | null;
type Remote = { id: string; items: Item[]; cached: boolean; pending: boolean };
const color = theme.colors;
const closureDate = new Intl.DateTimeFormat("es", {
  day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
});
const formatTotal = (value: number | null) => value === null ? "—" : money(value);
const maxListItems = 200;
const maxLists = 2;
const catalogItemId = (name: string) => "catalog-" + encodeURIComponent(name);
const validQuantity = (quantity: number) => quantity > 0 && quantity <= 10000;

export default function MarketScreen() {
  const { market, problem, change } = useMarket();
  const [panel, setPanel] = useState<Panel>(null);
  const catalog = useCatalog(panel === "catalog", cloud?.readCatalog);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Category | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selection, setSelection] = useState<Set<string> | null>(null);
  const [editing, setEditing] = useState<Item>();
  const [editingPrices, setEditingPrices] = useState(false);
  const [listName, setListName] = useState("");
  const [newName, setNewName] = useState("");
  const [profileDraft, setProfileDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [purchasedOpen, setPurchasedOpen] = useState(false);
  const [shoppingListId, setShoppingListId] = useState<string>();
  const [undo, setUndo] = useState<{ listId: string; id: string; name: string }>();
  const [listSearch, setListSearch] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string>();
  const [joinCode, setJoinCode] = useState("");
  const [remote, setRemote] = useState<Remote>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [subscription, setSubscription] = useState(0);
  const [refreshingId, setRefreshingId] = useState<string>();
  const refreshRequest = useRef<{ id: string; subscription: number } | null>(null);
  const [memberView, setMemberView] = useState<{ id: string; members: Member[] }>();
  const [memberError, setMemberError] = useState("");
  const [historyView, setHistoryView] = useState<{ id: string; entries: Closure[] }>();
  const [historyError, setHistoryError] = useState("");
  const [closingNote, setClosingNote] = useState("");
  const closing = useRef(false);
  const pendingAdds = useRef(new Set<string>());

  const list = market?.lists.find((entry) => entry.id === market.activeId);
  const profileName = market?.profileName;
  const syncedProfileName = market?.syncedProfileName;
  const remoteId = list?.shared ? list.id : undefined;
  const sharedView = remote?.id === remoteId ? remote : undefined;
  const isDeleting = list?.id === deletingId && Boolean(deletingId);
  const owner = list?.owner === true;
  const syncedName = list?.syncedName;
  const refreshing = Boolean(list && refreshingId === list.id);
  const shoppingMode = Boolean(list && shoppingListId === list.id && !isDeleting);

  useEffect(() => {
    if (!shoppingMode) return;
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      setShoppingListId(undefined);
      return true;
    });
    return () => back.remove();
  }, [shoppingMode]);

  useEffect(() => {
    setListSearch(null);
    setPurchasedOpen(false);
    setShoppingListId(undefined);
    setSelection(null);
    setUndo(undefined);
  }, [list?.id]);

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(undefined), 7000);
    return () => clearTimeout(timer);
  }, [undo]);

  useEffect(() => {
    if (!cloud || !profileName || profileName === syncedProfileName) return;
    let active = true;
    void cloud.saveProfile(profileName).then(() => {
      if (active) change((value) => ({ ...value, syncedProfileName: profileName }));
    }).catch(() => {});
    return () => { active = false; };
  }, [profileName, syncedProfileName, subscription, change]);

  useEffect(() => {
    if (!cloud || !profileName || !remoteId || !sharedView || isDeleting || syncedName === profileName) return;
    let active = true;
    void cloud.changeMemberName(remoteId, owner, profileName).then(() => {
      if (active) change((value) => ({
        ...value,
        lists: value.lists.map((entry) => entry.id === remoteId ? { ...entry, syncedName: profileName } : entry),
      }));
    }).catch(() => {});
    return () => { active = false; };
  }, [profileName, remoteId, Boolean(sharedView), isDeleting, owner, syncedName, subscription, change]);

  function forgetList(id: string) {
    change((value) => {
      if (!value.lists.some((entry) => entry.id === id)) return value;
      const remaining = value.lists.filter((entry) => entry.id !== id);
      const lists = remaining.length ? remaining : starter.lists;
      return { ...value, lists, activeId: value.activeId === id ? lists[0].id : value.activeId };
    });
  }

  useEffect(() => {
    if (panel !== "history" || !remoteId || !cloud || isDeleting) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    setHistoryError("");
    const onError = () => { if (active) setHistoryError("No se pudo cargar el historial compartido."); };
    void cloud.subscribeHistory(remoteId, (entries) => {
      if (active) setHistoryView({ id: remoteId, entries });
    }, onError).then((stop) => {
      if (active) unsubscribe = stop;
      else stop();
    }).catch(onError);
    return () => { active = false; unsubscribe?.(); };
  }, [panel, remoteId, isDeleting, subscription]);

  useEffect(() => {
    if (panel !== "sync" || !remoteId || !cloud || isDeleting) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    setMemberError("");
    const onError = () => {
      if (active) setMemberError("No se pudo cargar quién participa en esta lista.");
    };
    void cloud.subscribeMembers(remoteId, (members) => {
      if (active) setMemberView({ id: remoteId, members });
    }, onError).then((stop) => {
      if (active) unsubscribe = stop;
      else stop();
    }).catch(onError);
    return () => { active = false; unsubscribe?.(); };
  }, [panel, remoteId, isDeleting, subscription]);

  useEffect(() => {
    if (!remoteId || !cloud) return;
    let active = true;
    let serverName = false;
    let serverItems = false;
    let unsubscribe: (() => void) | undefined;
    const requested = refreshRequest.current;
    const isRefresh = requested?.id === remoteId && requested.subscription === subscription;
    const finish = (message?: string) => {
      if (!isRefresh || refreshRequest.current !== requested) return;
      refreshRequest.current = null;
      setRefreshingId(undefined);
      if (message) setNotice(message);
    };
    const timer = isRefresh ? setTimeout(() => {
      finish("Sin respuesta de Firebase. Se muestra la última copia disponible.");
    }, 10000) : undefined;
    const checkServer = () => { if (serverName && serverItems) finish("Lista actualizada."); };
    const onError = () => {
      if (!active) return;
      finish();
      setSyncError("No se pudo conectar con esta lista. Revisa la conexión o los permisos.");
    };
    setSyncError("");
    void cloud.subscribe(remoteId, (name, cached) => {
      if (!active) return;
      serverName = !cached;
      checkServer();
      change((value) => {
        const current = value.lists.find((entry) => entry.id === remoteId);
        if (current?.name === name) return value;
        return { ...value, lists: value.lists.map((entry) => entry.id === remoteId ? { ...entry, name } : entry) };
      });
    }, (items, cached, pending) => {
      if (!active) return;
      setRemote({ id: remoteId, items, cached, pending });
      serverItems = !cached && !pending;
      checkServer();
    }, (stillExists) => {
      if (!active) return;
      finish();
      setSyncError("");
      if (stillExists && owner) {
        setDeletingId(remoteId);
      } else {
        forgetList(remoteId);
        navigate("lists");
      }
    }, onError).then((stop) => {
      if (active) unsubscribe = stop;
      else stop();
    }).catch(onError);
    return () => {
      active = false;
      clearTimeout(timer);
      finish();
      unsubscribe?.();
    };
  }, [remoteId, owner, subscription, change]);

  function saveProfile() {
    const name = profileDraft.trim();
    if (!name) { setError("Escribe el nombre que verán otros miembros."); return; }
    change((value) => ({ ...value, profileName: name }));
    if (name === profileName) setSubscription((value) => value + 1);
    navigate(null);
  }

  if (!market || !list) {
    return <SafeAreaView style={styles.screen}><View style={styles.wait}>
      {problem ? <Text style={styles.error}>{problem}</Text> : <ActivityIndicator color={color.accent} />}
    </View></SafeAreaView>;
  }

  if (!profileName) {
    return <SafeAreaView style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.intro}>
        <Image source={art.welcome} resizeMode="contain" style={styles.introMascot} accessible={false} />
        <Brand />
        <Heading>Dame tu nombre</Heading>
        <Text style={styles.body}>Tus compañeros de lista te reconocerán por este nombre.</Text>
        <Field label="Tu nombre" value={profileDraft} onChangeText={setProfileDraft} maxLength={40}
          autoCapitalize="words" returnKeyType="done" onSubmitEditing={saveProfile} placeholder="Ej. Ana" />
        {error || problem ? <Text style={styles.error}>{error || problem}</Text> : null}
        <Button label="Continuar" onPress={saveProfile} />
      </ScrollView>
    </SafeAreaView>;
  }

  const items = list.shared ? (sharedView?.items ?? []) : list.items;
  const canEdit = !isDeleting && (!list.shared || Boolean(sharedView && !syncError));
  const sleeping = items.filter((item) => item.asleep);
  const pending = items.filter((item) => !item.asleep && !item.checked);
  const purchased = items.filter((item) => !item.asleep && item.checked);
  const listQuery = normalize(listSearch ?? "");
  const matchesListSearch = (item: Item) => productNames(item).some((name) => normalize(name).includes(listQuery));
  const visiblePending = pending.filter(matchesListSearch);
  const visiblePurchased = purchased.filter(matchesListSearch);
  const { estimated, paid } = marketTotals(items);
  const currentList = list;
  const tint = listColors[list.color ?? "naranja"] ?? listColors.naranja;
  const hasListSpace = market.lists.length < maxLists;
  const aisles = aisleOrder(list.aisles).map((id) => categories.find((category) => category.id === id)!);
  const exportItems = panel === "export" ? aisles.flatMap(({ id }) =>
    items.filter((item) => !item.asleep && item.category === id)) : [];
  const favorites = new Set(market.favorites ?? []);
  const addedNames = new Set(items.map((item) => normalize(item.name)));
  const addedIds = new Set(items.map((item) => item.id));
  const members = memberView?.id === list.id ? memberView.members : undefined;
  const sharedHistory = historyView?.id === list.id ? historyView.entries : undefined;
  const history = [...(list.history ?? []), ...(sharedHistory ?? [])]
    .sort((first, second) => second.createdAt - first.createdAt);
  const canClose = canEdit && items.length > 0 && (!list.shared || list.owner === true);
  const recentPurchase = undo?.listId === list.id && canEdit ? undo : undefined;
  const comparisons = panel === "stores" ? compareStores(items) : undefined;

  function navigate(next: Panel) {
    setError("");
    setNotice("");
    setClosingNote("");
    if (next !== "catalog") setSelection(null);
    setPanel(next);
  }

  function refreshList() {
    if (busy || isDeleting || refreshing || refreshRequest.current?.id === currentList.id) return;
    setError("");
    if (!currentList.shared || !cloud) {
      setNotice("Lista al día en este celular.");
      return;
    }
    setNotice("");
    refreshRequest.current = { id: currentList.id, subscription: subscription + 1 };
    setRefreshingId(currentList.id);
    setSubscription((value) => value + 1);
  }

  function setLocalItems(update: (items: Item[]) => Item[]) {
    change((value) => ({
      ...value,
      lists: value.lists.map((entry) => entry.id === currentList.id && !entry.shared
        ? { ...entry, items: update(entry.items) } : entry),
    }));
  }

  function write(id: string, changes: Partial<Omit<Item, "id">>) {
    if (currentList.shared && cloud) {
      void cloud.writeItem(currentList.id, id, changes, false).catch(() => {
        setError("No se pudo sincronizar el cambio. Revisa la conexión o los permisos.");
      });
    } else if (!currentList.shared) {
      setLocalItems((all) => all.map((item) => item.id === id ? { ...item, ...changes } : item));
    }
  }

  function alreadyAdded(name: string, catalogIdentity = true) {
    return addedNames.has(name) || (catalogIdentity && addedIds.has(catalogItemId(name)))
      || pendingAdds.current.has(currentList.id + ":" + name);
  }

  function addProducts(products: Product[], details?: ItemFields) {
    if (!canEdit) return 0;
    const prefix = currentList.id + ":";
    const additions = products.filter((product) => !alreadyAdded(normalize(product.name), !details));
    if (!additions.length) {
      setError("Este producto ya está en la lista. Tócalo allí si quieres cambiar su cantidad.");
      return 0;
    }
    const stillPending = [...pendingAdds.current].filter((key) => {
      if (!key.startsWith(prefix)) return false;
      const name = key.slice(prefix.length);
      return !addedNames.has(name) && !addedIds.has(catalogItemId(name));
    }).length;
    const spaces = Math.max(0, maxListItems - items.length - stillPending);
    if (additions.length > spaces) {
      setError(spaces ? "Espacios disponibles en la lista: " + spaces + "." : "La lista admite hasta 200 productos.");
      return 0;
    }

    const createdAt = Date.now();
    const entries = additions.map(({ name, category, unit }): Item => ({
      name, category, unit, quantity: 1, estimated: null, paid: null, note: "", ...details,
      id: details ? randomUUID() : catalogItemId(normalize(name)), checked: false, createdAt,
    }));
    const client = cloud;
    if (currentList.shared && client) {
      // A duplicate from another member can reject one create while the rest still sync.
      const writes = entries.map(({ id, ...item }) => {
        const key = prefix + normalize(item.name);
        pendingAdds.current.add(key);
        return client.writeItem(currentList.id, id, item, true).finally(() => pendingAdds.current.delete(key));
      });
      void Promise.allSettled(writes).then((results) => {
        const failed = results.filter((result) => result.status === "rejected").length;
        if (failed) setError("No se pudieron sincronizar todos los productos de «" + currentList.name + "». Revisa cuáles faltan e inténtalo otra vez.");
      });
    } else {
      setLocalItems((all) => {
        const names = new Set(all.map((item) => normalize(item.name)));
        const ids = new Set(all.map((item) => item.id));
        const fresh = entries.filter((item) => !names.has(normalize(item.name)) && !ids.has(item.id));
        return [...all, ...fresh.slice(0, Math.max(0, maxListItems - all.length))];
      });
    }
    return entries.length;
  }

  function adjustQuantity(item: Item, step: -1 | 1) {
    if (!canEdit || !validQuantity(item.quantity + step)) return;
    if (currentList.shared && cloud) {
      void cloud.changeQuantity(currentList.id, item.id, step).catch(() => {
        setError("No se pudo cambiar la cantidad. Revisa el valor actual en la lista.");
      });
    } else {
      setLocalItems((all) => all.map((entry) => {
        const quantity = Math.round((entry.quantity + step) * 1000) / 1000;
        return entry.id === item.id && validQuantity(quantity) ? { ...entry, quantity } : entry;
      }));
    }
  }

  function togglePurchased(item: Item) {
    if (!canEdit) return;
    write(item.id, { checked: !item.checked });
    if (!item.checked) setUndo({ listId: currentList.id, id: item.id, name: item.name });
    else setUndo((recent) => recent?.id === item.id ? undefined : recent);
  }

  function undoPurchase() {
    if (!recentPurchase || !items.some((item) => item.id === recentPurchase.id && !item.asleep)) return;
    setUndo(undefined);
    write(recentPurchase.id, { checked: false });
  }

  function save(fields: ItemFields) {
    if (!editing) {
      if (addProducts([fields], fields)) navigate(null);
      return;
    }
    if (items.some((item) => item.id !== editing.id && normalize(item.name) === normalize(fields.name))) {
      setError("Ya hay un producto con ese nombre en la lista.");
      return;
    }
    const changes = Object.fromEntries(
      Object.entries(fields).filter(([key, value]) => {
        if (key === "prices") return JSON.stringify(value ?? []) !== JSON.stringify(editing.prices ?? []);
        if (key === "selectedPrice") return (value ?? null) !== (editing.selectedPrice ?? null);
        return value !== editing[key as keyof ItemFields];
      }),
    ) as Partial<ItemFields>;
    if (Object.keys(changes).length) write(editing.id, changes);
    navigate(null);
  }

  function toggleSleep(item: Item) {
    if (!canEdit) return;
    write(item.id, { asleep: !item.asleep, checked: false });
    setUndo((recent) => recent?.id === item.id ? undefined : recent);
  }

  function restoreList() {
    const ids = [...purchased, ...sleeping].map((item) => item.id);
    if (!canEdit || !ids.length) return;
    Alert.alert("Poner todo pendiente", "Los productos comprados y ocultos volverán a Pendientes.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Restaurar lista", onPress: () => {
        setUndo(undefined);
        if (currentList.shared && cloud) {
          void cloud.resetItems(currentList.id, ids).catch(() => setError("No se pudo restaurar la lista compartida."));
        } else {
          setLocalItems((all) => all.map((item) => item.checked || item.asleep
            ? { ...item, checked: false, asleep: false } : item));
        }
      } },
    ]);
  }

  function confirmClose() {
    if (!canClose || closing.current) return;
    Alert.alert("Cerrar mercado", "Se guardarán los totales y la nota. Los productos quedarán pendientes para el siguiente mercado.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar mercado", onPress: () => { void closeMarket(); } },
    ]);
  }

  async function closeMarket() {
    if (!canClose || closing.current) return;
    closing.current = true;
    setBusy(true);
    setError("");
    const note = closingNote.trim();
    try {
      if (currentList.shared && cloud) {
        await cloud.closeMarket(currentList.id, note);
      } else if (!currentList.shared) {
        const id = randomUUID();
        const createdAt = Date.now();
        change((value) => ({
          ...value,
          lists: value.lists.map((entry) => entry.id !== currentList.id ? entry : {
            ...entry,
            history: [...(entry.history ?? []), { ...marketTotals(entry.items), id, createdAt, note }],
            items: entry.items.map((item) => ({ ...item, ...nextMarket })),
          }),
        }));
      }
      navigate(null);
      setUndo(undefined);
      setNotice("Mercado cerrado. Los productos están pendientes otra vez.");
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "";
      setError(message && !message.includes("[") ? message : "No se pudo cerrar el mercado. Revisa tu conexión con Firebase.");
    } finally {
      closing.current = false;
      setBusy(false);
    }
  }

  function toggleFavorite(name: string) {
    change((value) => {
      const saved = value.favorites ?? [];
      return { ...value, favorites: saved.includes(name) ? saved.filter((item) => item !== name) : [...saved, name] };
    });
  }

  function deleteItem(item: Item) {
    if (!canEdit) return;
    Alert.alert("Sacar producto", "¿Quitar " + item.name + " de la lista?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sacar", style: "destructive", onPress: () => {
        if (panel === "edit") navigate(null);
        setUndo((recent) => recent?.id === item.id ? undefined : recent);
        if (currentList.shared && cloud) {
          void cloud.removeItem(currentList.id, item.id).catch(() => setError("No se pudo eliminar el producto."));
        } else {
          setLocalItems((all) => all.filter((entry) => entry.id !== item.id));
        }
      } },
    ]);
  }

  function createList() {
    if (!hasListSpace) return;
    const name = listName.trim();
    if (!name) { setError("Escribe un nombre para la lista."); return; }
    const id = randomUUID();
    change((value) => value.lists.length < maxLists ? ({
      ...value, activeId: id, lists: [...value.lists, { id, name, items: [], color: nextListColor(value.lists) }],
    }) : value);
    setListName("");
    navigate(null);
  }

  function setListColor(next: ListColor) {
    change((value) => ({
      ...value, lists: value.lists.map((entry) => entry.id === currentList.id ? { ...entry, color: next } : entry),
    }));
  }

  function moveAisle(id: Category, delta: -1 | 1) {
    change((value) => ({
      ...value,
      lists: value.lists.map((entry) => {
        if (entry.id !== currentList.id) return entry;
        const order = aisleOrder(entry.aisles);
        const index = order.indexOf(id);
        const target = index + delta;
        if (target < 0 || target >= order.length) return entry;
        [order[index], order[target]] = [order[target], order[index]];
        return { ...entry, aisles: order };
      }),
    }));
  }

  async function exportList(format: "pdf" | "text") {
    if (busy || !exportItems.length) return;
    setBusy(true);
    setError("");
    try {
      if (format === "pdf") await shareListPdf(currentList.name, exportItems);
      else await shareListText(currentList.name, exportItems);
    } catch {
      setError(format === "pdf" ? "No se pudo generar o compartir el PDF." : "No se pudo compartir el mensaje.");
    } finally {
      setBusy(false);
    }
  }

  async function renameList() {
    if (busy || isDeleting || (currentList.shared && (!owner || !cloud))) return;
    const name = newName.trim();
    if (!name) { setError("Escribe un nombre para la lista."); return; }
    setBusy(true);
    setError("");
    try {
      if (currentList.shared) await cloud?.renameList(currentList.id, name);
      change((value) => ({
        ...value, lists: value.lists.map((entry) => entry.id === currentList.id ? { ...entry, name } : entry),
      }));
      navigate("lists");
    } catch {
      setError("No se pudo cambiar el nombre. Revisa tu conexión.");
    } finally {
      setBusy(false);
    }
  }

  function confirmDeleteList() {
    if (busy) return;
    const removeForEveryone = currentList.shared && owner;
    const forgetOnly = currentList.shared && !owner;
    const description = removeForEveryone
      ? "Se borrarán los productos, el historial y las invitaciones para todos los miembros."
      : forgetOnly ? "La lista desaparecerá de este celular."
        : "Se borrarán todos los productos y el historial de esta lista.";
    Alert.alert(forgetOnly ? "Quitar lista de este celular" : "Eliminar «" + currentList.name + "»", description, [
      { text: "Cancelar", style: "cancel" },
      { text: forgetOnly ? "Quitar" : "Eliminar", style: "destructive", onPress: () => {
        void removeList();
      } },
    ]);
  }

  async function removeList() {
    setError("");
    setBusy(true);
    try {
      if (currentList.shared && owner) {
        if (!cloud) throw new Error("Firebase no está disponible.");
        await cloud.deleteList(currentList.id);
      }
      forgetList(currentList.id);
      navigate("lists");
    } catch {
      setError("No se pudo terminar de eliminar la lista. Revisa la conexión y vuelve a intentarlo.");
    } finally {
      setBusy(false);
    }
  }

  async function sync(operation: "invite" | "join" | "revoke") {
    if (!cloud || busy || !profileName || isDeleting || (operation === "join" && !hasListSpace)) return;
    setBusy(true);
    setError("");
    try {
      if (operation === "invite") {
        const { id, code } = await cloud.invite(currentList, profileName);
        change((value) => ({
          ...value,
          activeId: id,
          lists: value.lists.map((entry) => entry.id === currentList.id
            ? { ...entry, id, items: [], shared: true, owner: true, invitation: code,
              syncedName: entry.shared ? entry.syncedName : profileName } : entry),
        }));
      } else if (operation === "join") {
        const joined = await cloud.join(joinCode, profileName);
        change((value) => {
          if (value.lists.some((entry) => entry.id === joined.id)) return { ...value, activeId: joined.id };
          if (value.lists.length >= maxLists) return value;
          return { ...value, activeId: joined.id, lists: [...value.lists, { ...joined, color: nextListColor(value.lists) }] };
        });
        setJoinCode("");
        navigate(null);
      } else if (currentList.invitation) {
        await cloud.revoke(currentList.invitation);
        change((value) => ({ ...value, lists: value.lists.map((entry) => entry.id === currentList.id
          ? { ...entry, invitation: undefined } : entry) }));
      }
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "";
      setError(message && !message.includes("[") ? message : "No se pudo completar la operación. Revisa internet y la configuración de Firebase.");
    } finally {
      setBusy(false);
    }
  }

  function itemRow(item: Item) {
    const shopPrice = selectedShopPrice(item);
    const price = item.checked ? (itemPrice(item, "paid") ?? itemPrice(item, "estimated")) : itemPrice(item, "estimated");
    function quantityButton(step: -1 | 1) {
      const disabled = !canEdit || !validQuantity(item.quantity + step);
      return <Pressable disabled={disabled} onPress={() => adjustQuantity(item, step)}
        accessibilityRole="button" accessibilityLabel={(step < 0 ? "Reducir cantidad de " : "Aumentar cantidad de ") + item.name}
        accessibilityState={{ disabled }} style={[styles.stepButton, disabled && styles.dimmed]}>
        <Text style={styles.stepSign}>{step < 0 ? "−" : "+"}</Text>
      </Pressable>;
    }
    return (
      <View key={item.id} style={styles.marketRow}>
        <View style={styles.productLine}>
        {item.asleep ? <View style={styles.checkAction} /> :
          <Pressable onPress={() => togglePurchased(item)} disabled={!canEdit}
            accessibilityRole="checkbox" accessibilityLabel={item.name}
            accessibilityState={{ checked: item.checked, disabled: !canEdit }} style={styles.checkAction}>
            <View style={[styles.check, item.checked && styles.checkOn]}>
              {item.checked ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
          </Pressable>}
        <Pressable disabled={!canEdit} onPress={() => { setEditing(item); setEditingPrices(false); navigate("edit"); }}
          accessibilityRole="button" accessibilityLabel={"Editar " + item.name} style={styles.rowBody}>
          <Text style={[styles.itemName, item.checked && styles.strike, item.asleep && styles.dimmed]}>{item.name}</Text>
        </Pressable>
        <Pressable disabled={!canEdit} onPress={() => { setEditing(item); setEditingPrices(true); navigate("edit"); }}
          style={styles.priceAction} accessibilityRole="button" accessibilityLabel={"Editar precio de " + item.name}>
          <Text style={styles.trailing}>{price !== null ? money(subtotal(item.quantity, price)) : "$ +"}</Text>
        </Pressable>
        <Pressable disabled={!canEdit} onPress={() => toggleSleep(item)} style={styles.eyeAction}
          accessibilityRole="button" accessibilityLabel={(item.asleep ? "Mostrar " : "Ocultar ") + item.name}>
          <Eye hidden={item.asleep} />
        </Pressable>
        </View>
        <View style={styles.quantityLine}>
          <View style={styles.stepper}>
            {quantityButton(-1)}
            <Text style={styles.quantityValue}>{formatQuantity(item.quantity)} {item.unit}</Text>
            {quantityButton(1)}
          </View>
          <Text style={[styles.muted, styles.storeLabel]} numberOfLines={1}>{shopPrice?.store ?? ""}</Text>
          <Pressable disabled={!canEdit} onPress={() => deleteItem(item)} style={styles.removeAction}
            accessibilityRole="button" accessibilityLabel={"Sacar " + item.name + " de la lista"}>
            <Trash />
          </Pressable>
        </View>
      </View>
    );
  }

  const status = list.shared
    ? syncError ? "Conexión pendiente"
      : sharedView?.pending ? "Cambios por sincronizar"
      : sharedView?.cached ? "Copia del dispositivo"
      : sharedView ? "" : "Abriendo lista…"
    : "";
  const catalogQuery = normalize(search);
  const matches = catalog.filter((product) =>
    (!filter || product.category === filter) && (!favoritesOnly || favorites.has(normalize(product.name)))
    && productNames(product).some((name) => normalize(name).includes(catalogQuery)),
  );
  const selectedProducts = selection ? catalog.filter((product) => {
    const name = normalize(product.name);
    return selection.has(name) && !alreadyAdded(name);
  }) : [];
  const totalsDisplay = <View style={[styles.totals, { backgroundColor: tint.surface }]}>
    <View style={styles.total}><Text style={styles.muted}>Estimado</Text><Text style={styles.amount}>{formatTotal(estimated)}</Text></View>
    <View style={styles.total}><Text style={styles.muted}>Pagado</Text><Text style={styles.amount}>{formatTotal(paid)}</Text></View>
  </View>;
  const title = panel === "catalog" ? "Catálogo" : panel === "lists" ? "Mis listas"
    : panel === "manage" ? "Administrar lista" : panel === "profile" ? "Mi perfil"
    : panel === "hidden" ? "Productos ocultos"
    : panel === "guide" ? "Cómo usar Mercaditox" : panel === "aisles" ? "Ordenar pasillos" : panel === "export" ? "Exportar lista"
    : panel === "stores" ? "Comparar tiendas"
    : panel === "sync" ? "Compartir" : panel === "history" ? "Historial" : panel === "close" ? "Cerrar mercado actual"
    : editingPrices ? "Precios" : editing ? "Editar producto" : "Nuevo producto";
  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={refreshList}
    colors={[tint.accent]} progressBackgroundColor={color.surface} tintColor={tint.accent} />;

  return (
    <ListTint.Provider value={tint}>
    <SafeAreaView style={styles.screen}>
      {shoppingMode ? <>
        <View style={styles.shopHeader}>
          <Pressable style={styles.shopAction} accessibilityRole="button" accessibilityLabel="Salir de Modo compra"
            onPress={() => setShoppingListId(undefined)}>
            <Text style={[styles.shopSymbol, { color: tint.accent }]}>‹</Text>
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.shopTitle} numberOfLines={1}>{list.name}</Text>
            <Text style={styles.muted}>{pending.length} pendientes · {purchased.length} comprados</Text>
          </View>
          <Pressable style={[styles.shopAction, styles.shopAdd, { backgroundColor: tint.surface }, !canEdit && styles.dimmed]}
            accessibilityRole="button" accessibilityLabel="Agregar producto" disabled={!canEdit} onPress={() => navigate("catalog")}>
            <Text style={[styles.shopSymbol, { color: tint.accent }]}>+</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} refreshControl={refreshControl}>
          <View style={styles.shopPage}>
            {problem || (!panel && error) || syncError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{problem || (!panel && error) || syncError}</Text> : null}
            {list.shared && !sharedView && !syncError ? <ActivityIndicator color={tint.accent} /> : null}
            {pending.length ? aisles.map((category) => {
              const products = pending.filter((item) => item.category === category.id);
              if (!products.length) return null;
              return <View key={category.id} style={styles.shopGroup}>
                <Text style={[styles.shopCategory, { color: tint.accent }]} accessibilityRole="header">{category.label}</Text>
                {products.map((item) => {
                  const price = itemPrice(item, "estimated");
                  const quantity = formatQuantity(item.quantity) + " " + item.unit;
                  return <Pressable key={item.id} disabled={!canEdit} onPress={() => togglePurchased(item)}
                    accessibilityRole="checkbox" accessibilityState={{ checked: false, disabled: !canEdit }}
                    accessibilityLabel={item.name + ", " + quantity}
                    style={({ pressed }) => [styles.shopRow, pressed && { backgroundColor: tint.surface }]}>
                    <View style={[styles.shopCheck, { borderColor: tint.accent }]} />
                    <Text style={styles.shopName}>{item.name}</Text>
                    <Text style={styles.shopQuantity}>{quantity}</Text>
                    {price !== null ? <Text style={styles.shopPrice}>{money(subtotal(item.quantity, price))}</Text> : null}
                  </Pressable>;
                })}
              </View>;
            }) : canEdit ? <View style={styles.shopEmpty}>
              <Text style={styles.body}>{items.length ? "Terminaste con los pendientes." : "La lista todavía está vacía."}</Text>
              {canClose ? <Button label="Cerrar mercado" onPress={() => navigate("close")} /> : null}
            </View> : null}
          </View>
        </ScrollView>
      </> : <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll} refreshControl={refreshControl}>
        <View style={styles.page}>
          <LinearGradient colors={tint === listColors.naranja ? theme.colors.illustrationGradient : [tint.surface, color.background]}
            style={[styles.hero, { borderColor: tint.border }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.heroTop}>
              <Pressable onPress={() => setExpanded((value) => !value)} style={styles.heroToggle}
                accessibilityRole="button" accessibilityLabel="Detalles de la lista" accessibilityState={{ expanded }}>
                <View style={styles.flex}>
                  <Text style={[styles.heroTitle, { color: tint.accent }]} numberOfLines={1}>{list.name}</Text>
                  <Text style={styles.heroSummary}>{pending.length} pendientes · {purchased.length} comprados</Text>
                </View>
                <View style={styles.expandIcon}><Chevron up={expanded} /></View>
              </Pressable>
              <Pressable style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Mis listas" onPress={() => navigate("lists")}>
                <Image source={art.basket} style={styles.headerArt} resizeMode="contain" accessible={false} />
              </Pressable>
              <Pressable style={styles.helpAction} accessibilityRole="button" accessibilityLabel="Cómo usar Mercaditox" onPress={() => navigate("guide")}>
                <View style={[styles.helpCircle, { borderColor: tint.border }]}>
                  <Text style={[styles.helpMark, { color: tint.accent }]}>?</Text>
                </View>
              </Pressable>
            </View>
            {sleeping.length && !isDeleting ? <Pressable onPress={() => navigate("hidden")}
              accessibilityRole="button" style={styles.hiddenLink}>
              <Eye hidden /><Text style={styles.activeName}>Ver ocultos ({sleeping.length})</Text>
            </Pressable> : null}
            {expanded ? <View style={styles.heroDetails}>
              <View style={styles.heroBrand}>
                <Image source={mascot} resizeMode="contain" style={styles.mascot} accessible={false} />
                <Brand />
              </View>
              <View style={styles.actions}>
                <View style={styles.flex}><Button label="Historial" onPress={() => navigate("history")} quiet disabled={isDeleting} /></View>
                <View style={styles.flex}><Button label="Cerrar mercado" onPress={() => navigate("close")} disabled={!canClose} /></View>
              </View>
              <View style={styles.actions}>
                <View style={styles.flex}><Button label="Ordenar pasillos" icon={art.checklist} quiet onPress={() => navigate("aisles")} /></View>
                <View style={styles.flex}><Button label="Exportar lista" quiet onPress={() => navigate("export")}
                  disabled={isDeleting || !pending.length && !purchased.length} /></View>
              </View>
              {canEdit && (purchased.length > 0 || sleeping.length > 0)
                ? <Button label="Poner todo pendiente" onPress={restoreList} quiet /> : null}
            </View> : null}
          </LinearGradient>

          <View style={styles.actions}>
            <View style={styles.flex}><Button label="+ Producto" icon={art.basket} onPress={() => navigate("catalog")} disabled={!canEdit} /></View>
            <Button label="Compartir" icon={art.people} onPress={() => navigate("sync")} disabled={isDeleting} quiet />
            {list.shared ? <Pressable style={styles.toolButton} accessibilityRole="button" accessibilityLabel="Actualizar sincronización"
              onPress={refreshList} disabled={refreshing || isDeleting || busy}>
              {refreshing ? <ActivityIndicator color={color.accent} size="small" /> : <Text style={styles.headerIcon}>⟳</Text>}
            </Pressable> : null}
          </View>
          {!isDeleting ? <View style={styles.actions}>
            <View style={styles.flex}><Button label="Modo compra" quiet onPress={() => setShoppingListId(list.id)} /></View>
            <View style={styles.flex}><Button label="Comparar tiendas" icon={art.price} onPress={() => navigate("stores")}
              disabled={!items.length} quiet /></View>
          </View> : null}
          {listSearch === null ? items.length && !isDeleting ? <Pressable style={styles.searchLink}
            accessibilityRole="button" onPress={() => setListSearch("")}>
            <Text style={styles.activeName}>Buscar en esta lista</Text>
          </Pressable> : null : <View style={styles.actions}>
            <View style={styles.flex}><Field label="Buscar en esta lista" value={listSearch} onChangeText={setListSearch}
              placeholder="Nombre del producto" autoFocus returnKeyType="search" /></View>
            <View style={styles.searchClose}><Button label="Cerrar" onPress={() => setListSearch(null)} quiet /></View>
          </View>}

          {problem || (!panel && error) || syncError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{problem || (!panel && error) || syncError}</Text> : null}
          {!panel && notice ? <Text accessibilityLiveRegion="polite" style={styles.success}>{notice}</Text> : null}
          {status && !syncError && !isDeleting ? <Text style={styles.muted}>{status}</Text> : null}
          {isDeleting ? <Button label="Terminar de eliminar la lista" onPress={confirmDeleteList} quiet disabled={busy} /> : null}

          {!isDeleting ? totalsDisplay : null}

          {list.shared && !sharedView && !syncError && !isDeleting ? <ActivityIndicator color={color.accent} /> : null}
          {canEdit && !items.length ? <Text style={styles.body}>Agrega tu primer producto para empezar.</Text> : null}

          {!isDeleting && visiblePending.length ? <View style={styles.section}>
            {categories.map((category) => {
              const products = visiblePending.filter((item) => item.category === category.id);
              return products.length ? <View key={category.id} style={styles.group}>
                <Text style={styles.groupName}>{category.icon}  {category.label}</Text>
                {products.map(itemRow)}
              </View> : null;
            })}
          </View> : null}
          {!isDeleting && visiblePurchased.length ? <View style={styles.section}>
              <Pressable style={styles.sectionToggle} accessibilityRole="button" accessibilityState={{ expanded: purchasedOpen || Boolean(listQuery) }}
                onPress={() => setPurchasedOpen((open) => !open)} disabled={Boolean(listQuery)}>
                <Text style={styles.groupName}>Comprados ({visiblePurchased.length})</Text>
                <Chevron up={purchasedOpen || Boolean(listQuery)} />
              </Pressable>
              {purchasedOpen || listQuery ? visiblePurchased.map(itemRow) : null}
          </View> : null}
          {listQuery && !visiblePending.length && !visiblePurchased.length && !isDeleting
            ? <Text style={styles.body}>No hay productos visibles que coincidan.</Text> : null}
        </View>
      </ScrollView>}
      {shoppingMode || recentPurchase ? <View style={styles.fixedBar}>
        {recentPurchase ? <View style={styles.undoBar}>
          <Text style={[styles.itemName, styles.flex]} numberOfLines={2} accessibilityLiveRegion="polite">
            {recentPurchase.name} · comprado
          </Text>
          <Button label="Deshacer" quiet onPress={undoPurchase} />
        </View> : null}
        {shoppingMode ? totalsDisplay : null}
      </View> : null}

      <Modal visible={panel !== null} onRequestClose={() => { if (!busy) navigate(null); }} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.screen}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.sheetHeader}>
              <View style={styles.flex}><Heading small>{title}</Heading></View>
              <Button label="Cerrar" onPress={() => navigate(null)} disabled={busy} quiet />
            </View>

            {panel === "catalog" ? <>
            <FlatList
              style={styles.flex}
              data={matches}
              keyExtractor={(product) => product.name}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetScroll}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListHeaderComponent={<View style={styles.sheetContent}>
                {error && !selection ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
                <Field label="Buscar productos" value={search} onChangeText={setSearch} placeholder="Ej. tomate, arroz, leche" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} keyboardShouldPersistTaps="handled">
                  <Chip label="★ Favoritos" selected={favoritesOnly} onPress={() => setFavoritesOnly((value) => !value)} />
                  <Chip label="Todos" selected={!filter && !favoritesOnly} onPress={() => { setFilter(null); setFavoritesOnly(false); }} />
                  {categories.map((category) => <Chip key={category.id}
                    label={category.label} selected={filter === category.id} onPress={() => setFilter(category.id)} />)}
                </ScrollView>
                <View style={styles.actions}>
                  <View style={styles.flex}><Button label="Crear producto" onPress={() => {
                    setEditing(undefined); setEditingPrices(false); navigate("edit");
                  }} quiet /></View>
                  <View style={styles.flex}><Button label={selection ? "Cancelar selección" : "Seleccionar varios"} onPress={() => {
                    setError(""); setNotice(""); setSelection(selection ? null : new Set());
                  }} quiet disabled={!canEdit && !selection} /></View>
                </View>
                {notice ? <Text style={styles.success} accessibilityLiveRegion="polite">{notice}</Text> : null}
                <Text style={styles.muted}>{matches.length} productos</Text>
                {!matches.length ? <Text style={styles.body}>{favoritesOnly && !favorites.size
                  ? "Marca la estrella de un producto para encontrarlo aquí." : "No encontramos coincidencias."}</Text> : null}
              </View>}
              renderItem={({ item: product }) => {
                  const name = normalize(product.name);
                  const alias = catalogQuery && !name.includes(catalogQuery)
                    ? productNames(product).find((candidate) => normalize(candidate).includes(catalogQuery))
                    : undefined;
                  const added = alreadyAdded(name);
                  const disabled = added || !canEdit;
                  const favorite = favorites.has(name);
                  const selected = selection?.has(name) && !added;
                  return (
                    <View style={[styles.row, selected && styles.selectedRow]} key={product.name}>
                      <Text style={[styles.productIcon, added && styles.dimmed]}>{categories.find((category) => category.id === product.category)?.icon}</Text>
                      <View style={[styles.rowBody, added && styles.dimmed]}>
                        <Text style={styles.itemName}>{product.name}</Text>
                        <Text style={styles.muted}>{added ? "Ya está en la lista" : alias ? alias + " · " + product.unit : product.unit}</Text>
                      </View>
                      <Pressable accessibilityRole="button" accessibilityState={{ selected: favorite }}
                        accessibilityLabel={(favorite ? "Quitar de favoritos " : "Agregar a favoritos ") + product.name}
                        style={styles.favorite} onPress={() => toggleFavorite(name)}>
                        <Text style={styles.star}>{favorite ? "★" : "☆"}</Text>
                      </Pressable>
                      <Pressable accessibilityRole={selection ? "checkbox" : "button"}
                        accessibilityLabel={(selection ? "Seleccionar " : "Agregar ") + product.name}
                        accessibilityState={{ disabled, checked: selection ? Boolean(selected) : undefined }} disabled={disabled}
                        style={[styles.add, disabled && styles.dimmed]}
                        onPress={() => {
                          setError("");
                          if (selection) {
                            setSelection((current) => {
                              if (!current) return current;
                              const next = new Set(current);
                              if (next.has(name)) next.delete(name);
                              else next.add(name);
                              return next;
                            });
                          } else if (addProducts([product])) setNotice(product.name + " añadido a la lista");
                        }}>
                        <Text style={styles.addSign}>{added || selected ? "✓" : selection ? "□" : "+"}</Text>
                      </Pressable>
                    </View>
                  );
              }}
            />
            {selection ? <View style={styles.fixedBar}>
              {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
              <Button label={"Agregar selección (" + selectedProducts.length + ")"} disabled={!canEdit || !selectedProducts.length}
                onPress={() => {
                  setError("");
                  const count = addProducts(selectedProducts);
                  if (!count) return;
                  navigate(null);
                  setNotice(count === 1 ? "1 producto añadido a la lista." : count + " productos añadidos a la lista.");
                }} />
            </View> : null}
            </> : <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.sheetScroll, styles.sheetContent]}>
              {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}

              {panel === "edit" ? <ItemForm key={editing?.id ?? "new"} item={editing} pricesOnly={editingPrices} onSave={save}
                onSleep={editing ? () => { toggleSleep(editing); navigate(null); } : undefined}
                onRemove={editing ? () => deleteItem(editing) : undefined} /> : null}

              {panel === "hidden" ? <>
                <Text style={styles.body}>{sleeping.length
                  ? "Toca el ojo para volver a mostrar un producto. Todos regresan al cerrar el mercado."
                  : "Ya no hay productos ocultos."}</Text>
                {sleeping.map(itemRow)}
              </> : null}
              {panel === "guide" ? <MarketGuide /> : null}

              {panel === "export" ? <>
                <Heading small>{list.name}</Heading>
                <Text style={styles.body}>{exportItems.length} productos visibles · nombre y cantidad</Text>
                <Button label="Compartir PDF" icon={art.checklist} disabled={busy || !exportItems.length}
                  onPress={() => { void exportList("pdf"); }} />
                <Button label="Enviar por WhatsApp" icon={art.people} disabled={busy || !exportItems.length}
                  onPress={() => { void exportList("text"); }} quiet />
                {busy ? <ActivityIndicator color={tint.accent} /> : null}
              </> : null}

              {panel === "aisles" ? <>
                <Text style={styles.body}>Usa las flechas para ordenar las categorías según tu recorrido en Modo compra.</Text>
                {aisles.map((category, index) => <View key={category.id} style={styles.aisleRow}>
                  <Text style={[styles.itemName, styles.flex]}>{category.icon}  {category.label}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={"Subir " + category.label} disabled={index === 0}
                    style={[styles.aisleAction, index === 0 && styles.dimmed]} onPress={() => moveAisle(category.id, -1)}>
                    <Text style={[styles.headerIcon, { color: tint.accent }]}>↑</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={"Bajar " + category.label} disabled={index === aisles.length - 1}
                    style={[styles.aisleAction, index === aisles.length - 1 && styles.dimmed]} onPress={() => moveAisle(category.id, 1)}>
                    <Text style={[styles.headerIcon, { color: tint.accent }]}>↓</Text>
                  </Pressable>
                </View>)}
                {list.aisles ? <Button label="Restaurar orden inicial" quiet onPress={() => {
                  change((value) => ({ ...value, lists: value.lists.map((entry) => entry.id === list.id
                    ? { ...entry, aisles: undefined } : entry) }));
                }} /> : null}
              </> : null}
              {comparisons ? <>
                <Text style={styles.body}>Se usan los precios por tienda y las cantidades de la lista. Los productos ocultos quedan fuera.</Text>
                {!comparisons.stores.length ? <Text style={styles.body}>Agrega precios por tienda en el detalle de tus productos para compararlos aquí.</Text> : null}
                {comparisons.stores.map((entry) => {
                  const complete = entry.covered === comparisons.products;
                  const cheapest = complete && comparisons.stores[1]?.covered === comparisons.products &&
                    entry.total === comparisons.stores[0]?.total;
                  return <View key={entry.store} style={styles.members}>
                    <Text style={styles.itemName}>{entry.store}</Text>
                    <Text style={styles.muted}>{entry.covered} de {comparisons.products} productos con precio</Text>
                    <Text style={styles.amount}>{complete ? "Total" : "Subtotal"} · {money(entry.total)}</Text>
                    {cheapest ? <Text style={styles.success}>Menor total</Text> : null}
                  </View>;
                })}
              </> : null}

              {panel === "lists" ? <>
                {market.lists.map((entry) => <View key={entry.id} style={styles.listRow}>
                  <Pressable style={styles.listName} accessibilityRole="button" accessibilityState={{ selected: entry.id === list.id }}
                    onPress={() => { change((value) => ({ ...value, activeId: entry.id })); navigate(null); }}>
                    <View style={[styles.listDot, { backgroundColor: (listColors[entry.color ?? "naranja"] ?? listColors.naranja).accent }]} />
                    <Text style={[styles.itemName, styles.flex, entry.id === list.id && { color: tint.accent }]} numberOfLines={1}>
                      {entry.name}{entry.id === list.id ? "  ✓" : ""}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.headerButton} accessibilityRole="button" accessibilityLabel={"Administrar " + entry.name}
                    onPress={() => {
                      change((value) => ({ ...value, activeId: entry.id }));
                      setNewName(entry.name);
                      navigate("manage");
                    }}>
                    <Text style={styles.headerIcon}>⋯</Text>
                  </Pressable>
                </View>)}
                {hasListSpace ? <>
                  <Field label="Nueva lista" value={listName} onChangeText={setListName} maxLength={60} placeholder="Ej. Mercado del viernes" />
                  <Button label="Crear lista" icon={art.checklist} onPress={createList} />
                </> : null}
                <Button label={"Mi perfil · " + profileName} onPress={() => { setProfileDraft(profileName); navigate("profile"); }} quiet />
              </> : null}

              {panel === "profile" ? <>
                <Field label="Tu nombre" value={profileDraft} onChangeText={setProfileDraft} maxLength={40}
                  autoCapitalize="words" returnKeyType="done" onSubmitEditing={saveProfile} />
                <Button label="Guardar nombre" onPress={saveProfile} />
                {cloud && profileName !== syncedProfileName ? <Text style={styles.muted}>Nombre pendiente de sincronizar con Firebase.</Text> : null}
              </> : null}

              {panel === "manage" ? <>
                {(!list.shared || owner) && !isDeleting ? <>
                  <Field label="Nombre de la lista" value={newName} onChangeText={setNewName} maxLength={60} editable={!busy} />
                  <Button label="Guardar nombre" onPress={() => { void renameList(); }} disabled={busy || newName.trim() === list.name} />
                </> : <Text style={styles.itemName}>{list.name}</Text>}
                {!isDeleting ? <View style={styles.members}>
                  <Text style={styles.itemName}>Color de la lista · {tint.label}</Text>
                  <View style={styles.palette}>
                    {colorChoices.map((choice) => {
                      const swatch = listColors[choice];
                      const selected = choice === (list.color ?? "naranja");
                      return <Pressable key={choice} accessibilityRole="radio" accessibilityLabel={swatch.label}
                        accessibilityState={{ checked: selected }} style={styles.swatchAction} onPress={() => setListColor(choice)}>
                        <View style={[styles.swatch, { backgroundColor: swatch.accent }]}>
                          {selected ? <Text style={styles.swatchCheck}>✓</Text> : null}
                        </View>
                      </Pressable>;
                    })}
                  </View>
                </View> : null}
                <Button label={list.shared && !owner ? "Quitar de este celular" : isDeleting ? "Terminar eliminación" : "Eliminar lista"}
                  onPress={confirmDeleteList} quiet disabled={busy} />
                {busy ? <ActivityIndicator color={color.accent} /> : null}
              </> : null}

              {panel === "close" ? <>
                <Text style={styles.itemName}>{list.name}</Text>
                {canClose ? <View style={styles.members}>
                  <Text style={styles.body}>Estimado {formatTotal(estimated)} · Pagado {formatTotal(paid)}</Text>
                  <Field label="Nota del mercado" value={closingNote} onChangeText={setClosingNote}
                    maxLength={160} editable={!busy} placeholder="Opcional" multiline />
                  <Button label="Cerrar mercado" onPress={confirmClose} disabled={busy} />
                </View> : <Text style={styles.body}>El mercado no está disponible para cerrar.</Text>}
                {busy ? <ActivityIndicator color={color.accent} /> : null}
              </> : null}

              {panel === "history" ? <>
                {historyError ? <Text style={styles.error}>{historyError}</Text> : null}
                {list.shared && !sharedHistory && !historyError ? <ActivityIndicator color={color.accent} /> : null}
                {!history.length && (!list.shared || Boolean(sharedHistory)) ? <Text style={styles.body}>Todavía no hay mercados cerrados.</Text> : null}
                {history.map((entry) => (
                  <View key={entry.id} style={styles.members}>
                    <Text style={styles.itemName}>{closureDate.format(entry.createdAt)}</Text>
                    <Text style={styles.body}>Estimado {formatTotal(entry.estimated)} · Pagado {formatTotal(entry.paid)}</Text>
                    {entry.note ? <Text style={styles.body}>{entry.note}</Text> : null}
                  </View>
                ))}
              </> : null}

              {panel === "sync" ? !cloud ? (
                <View style={styles.group}>
                  <Heading small>Guardado en este celular</Heading>
                  <Text style={styles.body}>Puedes crear listas y usarlas sin internet. Para compartirlas entre celulares, esta instalación necesita una versión conectada al proyecto de Firebase.</Text>
                </View>
              ) : <>
                <Heading small>{list.name}</Heading>
                {list.shared ? <>
                  <Button label={refreshing ? "Actualizando…" : "Actualizar sincronización"} onPress={refreshList}
                    quiet disabled={refreshing || busy || isDeleting} />
                  {syncError || notice ? <Text accessibilityLiveRegion="polite" style={syncError ? styles.error : styles.muted}>{syncError || notice}</Text> : null}
                </> : null}
                {list.shared ? <View style={styles.members}>
                  <Heading small>Miembros</Heading>
                  {memberError ? <Text style={styles.error}>{memberError}</Text> : null}
                  {!members && !memberError ? <ActivityIndicator color={color.accent} /> : null}
                  {members?.map((member) => <View key={member.id} style={styles.member}>
                    <Text style={styles.itemName}>
                      {member.name ?? (member.self ? "Tú" : member.owner ? "Dueño de la lista" : "Participante " + member.id.slice(-4))}
                    </Text>
                    <Text style={styles.muted}>{member.owner ? "Dueño" : "Miembro"}{member.self && member.name ? " · Tú" : ""}</Text>
                  </View>)}
                </View> : null}
                <Text style={styles.body}>Las invitaciones duran 24 horas y cada código admite una incorporación.</Text>
                {list.invitation ? <>
                  <Text selectable style={styles.code}>{list.invitation}</Text>
                  <Button label="Enviar código" onPress={() => {
                    if (list.invitation) void Share.share({ message: list.invitation }).catch(() => setError("Selecciona y copia el código para compartirlo."));
                  }} disabled={busy} />
                  <Button label="Revocar código" onPress={() => { void sync("revoke"); }} disabled={busy} quiet />
                </> : (!list.shared || list.owner) ? <>
                  <Button label="Generar invitación" onPress={() => { void sync("invite"); }} disabled={busy || !canEdit} />
                  {!list.shared ? <Text style={styles.muted}>La lista y sus productos se guardarán en Firebase al crear la invitación.</Text> : null}
                </> : null}
                {hasListSpace ? <>
                  <Field label="Código de otra lista" value={joinCode} onChangeText={setJoinCode} autoCapitalize="none" autoCorrect={false} />
                  <Button label="Unirme a una lista" onPress={() => { void sync("join"); }} disabled={busy} quiet />
                </> : null}
                {busy ? <ActivityIndicator color={color.accent} /> : null}
              </> : null}
            </ScrollView>}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
    </ListTint.Provider>
  );
}

const styles = StyleSheet.create({
  shopHeader: { width: "100%", maxWidth: 510, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.divider },
  shopAction: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  shopAdd: { borderWidth: 1, borderColor: color.divider },
  shopSymbol: { fontSize: 30, fontWeight: "600", includeFontPadding: false },
  shopTitle: { color: color.text, fontWeight: "700", fontSize: 18 },
  shopPage: { width: "100%", maxWidth: 510, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 16, gap: 8 },
  shopGroup: { borderRadius: 10, overflow: "hidden", backgroundColor: color.surface },
  shopCategory: { fontSize: 13, fontWeight: "700", paddingHorizontal: 9, paddingVertical: 5 },
  shopRow: { flexDirection: "row", alignItems: "center", minHeight: 44, gap: 8, paddingHorizontal: 9, paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.divider },
  shopCheck: { width: 18, height: 18, borderWidth: 1.5, borderRadius: 5 },
  shopName: { flex: 1, fontSize: 15, fontWeight: "600", color: color.text },
  shopQuantity: { maxWidth: "30%", fontSize: 13, color: color.muted, textAlign: "right" },
  shopPrice: { maxWidth: "28%", fontSize: 13, color: color.text, textAlign: "right" },
  shopEmpty: { paddingVertical: 12, gap: 8 },
  screen: { flex: 1, backgroundColor: color.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: "center" },
  page: { width: "100%", maxWidth: 510, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 24, gap: 8 },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  headerArt: { width: 28, height: 28 },
  helpAction: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  helpCircle: { width: 25, height: 25, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  helpMark: { fontSize: 15, fontWeight: "700", includeFontPadding: false },
  headerIcon: { color: color.accent, fontSize: 22 },
  hero: { borderRadius: 15, borderWidth: 1, borderColor: color.illustrationBorder, overflow: "hidden" },
  heroTop: { flexDirection: "row", alignItems: "center", paddingRight: 3 },
  heroToggle: { flex: 1, flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingLeft: 10, paddingRight: 8, gap: 12 },
  expandIcon: { width: 33, height: 33, borderRadius: 10, backgroundColor: color.raised, alignItems: "center", justifyContent: "center", marginRight: 3 },
  heroTitle: { color: color.text, fontSize: 20, fontWeight: "700" },
  heroSummary: { color: color.muted, fontSize: 12 },
  heroDetails: { padding: 8, gap: 6, borderTopWidth: 1, borderColor: color.illustrationBorder },
  heroBrand: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  mascot: { width: 62, height: 62, marginRight: 8 },
  intro: { flexGrow: 1, justifyContent: "center", alignSelf: "center", width: "100%", maxWidth: 430, padding: 20, gap: 12 },
  introMascot: { width: 115, height: 115 },
  actions: { flexDirection: "row", gap: 9, alignItems: "stretch" },
  toolButton: { width: 44, borderRadius: 12, backgroundColor: color.surface, borderWidth: 1, borderColor: color.divider, alignItems: "center", justifyContent: "center" },
  hiddenLink: { minHeight: 38, flexDirection: "row", gap: 8, alignItems: "center", paddingHorizontal: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.illustrationBorder },
  searchLink: { minHeight: 36, justifyContent: "center", paddingHorizontal: 4 },
  searchClose: { justifyContent: "flex-end" },
  totals: { flexDirection: "row", borderRadius: 12, backgroundColor: color.surface, paddingHorizontal: 9, paddingVertical: 6, gap: 8 },
  total: { flex: 1, flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 5 },
  amount: { color: color.text, fontSize: 15, fontWeight: "700" },
  muted: { color: color.muted, fontSize: 13 },
  body: { color: color.muted, fontSize: 15, lineHeight: 22 },
  error: { color: color.danger, fontSize: 14, lineHeight: 20 },
  success: { color: color.success, fontSize: 14 },
  section: { gap: 6 },
  sectionToggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 44, paddingHorizontal: 8, borderRadius: 11, backgroundColor: color.surface },
  group: { gap: 4 },
  groupName: { color: color.accent, fontSize: 14, fontWeight: "700", paddingLeft: 3 },
  row: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 46, backgroundColor: color.surface, borderWidth: 1, borderColor: color.divider, borderRadius: 10, paddingRight: 3 },
  marketRow: { minHeight: 46, backgroundColor: color.surface, borderWidth: 1, borderColor: color.divider, borderRadius: 10, paddingRight: 3, paddingBottom: 3 },
  productLine: { flexDirection: "row", alignItems: "center", gap: 4 },
  quantityLine: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 48, paddingRight: 6 },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: color.raised, borderRadius: 10 },
  stepButton: { minWidth: 38, minHeight: 36, paddingHorizontal: 5, alignItems: "center", justifyContent: "center" },
  stepSign: { fontSize: 18, color: color.accent, fontWeight: "700" },
  quantityValue: { color: color.text, fontSize: 13, paddingHorizontal: 3 },
  storeLabel: { flex: 1 },
  removeAction: { width: 40, minHeight: 38, alignItems: "center", justifyContent: "center" },
  fixedBar: { paddingHorizontal: 12, paddingVertical: 7, width: "100%", maxWidth: 510, alignSelf: "center", backgroundColor: color.background, borderTopWidth: 1, borderColor: color.divider, gap: 6 },
  undoBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 5 },
  selectedRow: { borderColor: color.accent },
  rowBody: { flex: 1, minHeight: 44, justifyContent: "center", paddingVertical: 3 },
  itemName: { color: color.text, fontSize: 15, fontWeight: "600" },
  priceAction: { minWidth: 44, minHeight: 44, alignItems: "flex-end", justifyContent: "center", paddingHorizontal: 5 },
  eyeAction: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  listRow: { flexDirection: "row", alignItems: "center", backgroundColor: color.surface, borderRadius: 10, borderWidth: 1, borderColor: color.divider },
  listName: { flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10 },
  listDot: { width: 11, height: 11, borderRadius: 6 },
  palette: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  swatchAction: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
  swatch: { width: 35, height: 35, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  swatchCheck: { color: color.background, fontWeight: "800", fontSize: 17 },
  aisleRow: { flexDirection: "row", alignItems: "center", minHeight: 44, paddingLeft: 9, borderRadius: 11, backgroundColor: color.surface },
  aisleAction: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  activeName: { color: color.accent },
  strike: { textDecorationLine: "line-through", color: color.muted },
  trailing: { color: color.accent, fontSize: 13, flexShrink: 1, textAlign: "right" },
  checkAction: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  check: { width: 21, height: 21, borderRadius: 6, borderWidth: 1.5, borderColor: color.accent, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: color.accent },
  checkMark: { color: color.background, fontWeight: "700" },
  wait: { flex: 1, justifyContent: "center", padding: 20 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: color.background, paddingHorizontal: 12, paddingVertical: 5, borderBottomColor: color.divider, borderBottomWidth: 1 },
  sheetScroll: { padding: 12, paddingBottom: 24, width: "100%", maxWidth: 510, alignSelf: "center" },
  sheetContent: { gap: 8, paddingBottom: 8 },
  separator: { height: 4 },
  filters: { flexDirection: "row", gap: 7, paddingBottom: 4 },
  productIcon: { fontSize: 18, marginHorizontal: 6 },
  add: { minWidth: 44, minHeight: 44, borderRadius: 13, backgroundColor: color.raised, alignItems: "center", justifyContent: "center" },
  addSign: { color: color.accent, fontSize: 25, fontWeight: "700" },
  favorite: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  star: { color: color.accent, fontSize: 24 },
  dimmed: { opacity: 0.53 },
  members: { gap: 10, backgroundColor: color.surface, borderRadius: 15, padding: 13 },
  member: { gap: 4, borderBottomWidth: 1, borderBottomColor: color.divider, paddingBottom: 7 },
  code: { color: color.accent, backgroundColor: color.surface, borderColor: color.divider, borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 17 },
});
