import { toggleTenantAction } from "@/app/actions/admin";

export function ToggleTenantButton({ id, active }: { id: string; active: boolean }) {
  return <form action={toggleTenantAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="active" value={String(active)} /><button className="button-small button-outline" type="submit">{active ? "Pausar" : "Ativar"}</button></form>;
}
