import ServiceStatus from "@/components/service-status";
import Workspace from "@/components/workspace";

export default function SettingsPage() {
  return <Workspace view="overview"><ServiceStatus /></Workspace>;
}
