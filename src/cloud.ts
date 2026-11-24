import { getAuth, onAuthStateChanged, signInAnonymously } from "@react-native-firebase/auth";
import {
  collection, deleteDoc, doc, getDocFromServer, getDocsFromServer, getFirestore, onSnapshot,
  increment, limit, query, runTransaction, setDoc, updateDoc, where, writeBatch,
} from "@react-native-firebase/firestore";
import { getRandomBytes } from "expo-crypto";
import { parseCatalog } from "./catalog";
import { marketTotals, nextMarket, type Closure, type Item, type List, type Member } from "./shopping";

let authentication: Promise<string> | undefined;

export async function readCatalog() {
  await uid();
  const snapshot = await getDocFromServer(doc(getFirestore(), "catalog", "v2"));
  const products = parseCatalog(snapshot.data()?.products);
  if (!products) throw new Error("El catálogo de Firebase no tiene un formato válido.");
  return products;
}

function uid() {
  authentication ??= (async () => {
    const auth = getAuth();
    const user = await new Promise<typeof auth.currentUser>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (current) => {
        unsubscribe();
        resolve(current);
      });
    });
    return (user ?? (await signInAnonymously(auth)).user).uid;
  })().catch((error: unknown) => {
    authentication = undefined;
    throw error;
  });
  return authentication;
}

export async function saveProfile(name: string) {
  const user = await uid();
  await setDoc(doc(getFirestore(), "users", user), { displayName: name });
}

export async function invite(list: List, name: string): Promise<{ id: string; code: string }> {
  const owner = await uid();
  const db = getFirestore();
  const code = Array.from(getRandomBytes(24), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const listRef = list.shared ? doc(db, "lists", list.id) : doc(collection(db, "lists"));
  const inviteRef = doc(db, "invites", code);

  await runTransaction(db, async (transaction) => {
    if (list.shared) {
      const current = await transaction.get(listRef);
      if (current.data()?.owner !== owner || current.data()?.deleted) throw new Error("La lista ya no se puede compartir.");
    } else {
      transaction.set(listRef, { owner, name: list.name, ownerName: name });
      list.items.forEach(({ id, ...item }) => {
        transaction.set(doc(db, "lists", listRef.id, "items", id), item);
      });
    }
    transaction.set(inviteRef, {
      listId: listRef.id,
      owner,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      usedBy: null,
    });
  });
  return { id: listRef.id, code };
}

export async function join(rawCode: string, name: string): Promise<List> {
  const code = rawCode.trim().toLowerCase();
  if (!/^[a-f0-9]{48}$/.test(code)) throw new Error("Pega el código completo de la invitación.");
  const user = await uid();
  const db = getFirestore();
  const inviteRef = doc(db, "invites", code);
  const id = await runTransaction(db, async (transaction) => {
    const data = (await transaction.get(inviteRef)).data();
    if (!data || data.expiresAt <= Date.now()) throw new Error("La invitación ya venció o fue revocada.");
    const listId = data.listId as string;
    if (data.owner === user || data.usedBy === user) return listId;
    if (data.usedBy !== null) throw new Error("Esta invitación ya se usó.");
    const member = doc(db, "lists", listId, "members", user);
    // A server read confirms existing membership without replacing its original grant.
    const existing = await transaction.get(member);
    if (existing.exists()) return listId;
    transaction.set(member, { invite: code, displayName: name });
    transaction.update(inviteRef, { usedBy: user });
    return listId;
  });
  const snapshot = await getDocFromServer(doc(db, "lists", id));
  const data = snapshot.data();
  if (!data || data.deleted) throw new Error("Esta lista se eliminó.");
  return {
    id, name: String(data?.name ?? "Lista compartida"), items: [], shared: true,
    ...(data?.owner === user ? { owner: true as const } : {}),
  };
}

export async function revoke(code: string) {
  await uid();
  await deleteDoc(doc(getFirestore(), "invites", code));
}

export async function renameList(id: string, name: string) {
  await uid();
  await updateDoc(doc(getFirestore(), "lists", id), { name });
}

export async function deleteList(id: string) {
  const user = await uid();
  const db = getFirestore();
  const listRef = doc(db, "lists", id);
  const exists = await runTransaction(db, async (transaction) => {
    const data = (await transaction.get(listRef)).data();
    if (!data) return false;
    if (data.owner !== user) throw new Error("Solo el dueño puede eliminar la lista.");
    if (!data.deleted) transaction.set(listRef, { owner: user, deleted: true });
    return true;
  });
  if (!exists) return;

  async function removeDocuments(source: ReturnType<typeof query>) {
    while (true) {
      const snapshot = await getDocsFromServer(query(source, limit(150)));
      if (snapshot.empty) return;
      const batch = writeBatch(db);
      for (const entry of snapshot.docs) batch.delete(entry.ref);
      await batch.commit();
    }
  }

  // Freeze writes before reading the subcollections so concurrent edits cannot leave orphaned documents.
  for (const child of ["items", "members", "history"]) {
    await removeDocuments(collection(listRef, child));
  }
  await removeDocuments(query(collection(db, "invites"), where("owner", "==", user), where("listId", "==", id)));
  await deleteDoc(listRef);
}

export async function subscribe(
  id: string,
  onName: (name: string, cached: boolean) => void,
  onItems: (items: Item[], cached: boolean, pending: boolean) => void,
  onDeleted: (stillExists: boolean) => void,
  onError: (error: unknown) => void,
) {
  await uid();
  const listRef = doc(getFirestore(), "lists", id);
  let deleted = false;
  const stopList = onSnapshot(listRef, { includeMetadataChanges: true }, (snapshot) => {
    const data = snapshot.data();
    if (data?.deleted || (!snapshot.exists() && !snapshot.metadata.fromCache)) {
      deleted = true;
      stopItems();
      onDeleted(snapshot.exists());
      return;
    }
    const name = data?.name;
    if (typeof name === "string") onName(name, snapshot.metadata.fromCache);
  }, onError);
  const stopItems = onSnapshot(collection(listRef, "items"), { includeMetadataChanges: true }, (snapshot) => {
    const items = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as Item);
    items.sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
    if (!deleted) onItems(items, snapshot.metadata.fromCache, snapshot.metadata.hasPendingWrites);
  }, (error) => { if (!deleted) onError(error); });
  return () => { stopList(); stopItems(); };
}

export function writeItem(listId: string, id: string, changes: Partial<Omit<Item, "id">>, create: boolean) {
  const item = doc(getFirestore(), "lists", listId, "items", id);
  return create ? setDoc(item, changes) : updateDoc(item, changes);
}

export function changeQuantity(listId: string, id: string, step: number) {
  return updateDoc(doc(getFirestore(), "lists", listId, "items", id), { quantity: increment(step) });
}

export function removeItem(listId: string, id: string) {
  return deleteDoc(doc(getFirestore(), "lists", listId, "items", id));
}

export function resetItems(listId: string, ids: string[]) {
  const db = getFirestore();
  const batch = writeBatch(db);
  ids.forEach((id) => batch.update(doc(db, "lists", listId, "items", id), {
    checked: false, asleep: false,
  }));
  return batch.commit();
}

export async function subscribeMembers(
  id: string,
  onMembers: (members: Member[]) => void,
  onError: (error: unknown) => void,
) {
  const user = await uid();
  const listRef = doc(getFirestore(), "lists", id);
  let owner: Member | undefined;
  let guests: Member[] = [];
  const notify = () => { if (owner) onMembers([owner, ...guests]); };
  const stopList = onSnapshot(listRef, (snapshot) => {
    const data = snapshot.data();
    if (typeof data?.owner !== "string") return;
    owner = {
      id: data.owner,
      name: typeof data.ownerName === "string" ? data.ownerName : undefined,
      owner: true,
      self: data.owner === user,
    };
    notify();
  }, onError);
  const stopMembers = onSnapshot(collection(listRef, "members"), (snapshot) => {
    guests = snapshot.docs.map((member) => {
      const name = member.data().displayName;
      return {
        id: member.id, name: typeof name === "string" ? name : undefined,
        owner: false, self: member.id === user,
      };
    });
    notify();
  }, onError);
  return () => { stopList(); stopMembers(); };
}

export async function changeMemberName(listId: string, owner: boolean, name: string) {
  const user = await uid();
  const db = getFirestore();
  if (owner) await updateDoc(doc(db, "lists", listId), { ownerName: name });
  else await updateDoc(doc(db, "lists", listId, "members", user), { displayName: name });
}

export async function closeMarket(listId: string, note: string) {
  const user = await uid();
  const db = getFirestore();
  const listRef = doc(db, "lists", listId);
  const list = (await getDocFromServer(listRef)).data();
  if (list?.owner !== user) throw new Error("Solo el dueño puede cerrar un mercado compartido.");
  const round = typeof list.round === "number" ? list.round : 0;
  const snapshot = await getDocsFromServer(collection(listRef, "items"));
  const items = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as Item);
  if (!items.length) throw new Error("Agrega al menos un producto antes de cerrar el mercado.");
  const record = { ...marketTotals(items), note, createdAt: Date.now() };

  await runTransaction(db, async (transaction) => {
    const current = (await transaction.get(listRef)).data();
    if ((current?.round ?? 0) !== round) throw new Error("Este mercado ya se cerró en otro celular.");
    transaction.set(doc(db, "lists", listId, "history", String(round)), record);
    transaction.update(listRef, { round: round + 1 });
    for (const item of items) {
      if (item.checked || item.asleep || item.paid !== null) {
        transaction.update(doc(db, "lists", listId, "items", item.id), nextMarket);
      }
    }
  });
}

export async function subscribeHistory(
  id: string,
  receive: (closures: Closure[]) => void,
  onError: (error: unknown) => void,
) {
  await uid();
  return onSnapshot(collection(getFirestore(), "lists", id, "history"), (snapshot) => {
    receive(snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }) as Closure));
  }, onError);
}
