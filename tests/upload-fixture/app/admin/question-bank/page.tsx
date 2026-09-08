import FolderBrowser from '../../../../../src/components/folder-browser';
import { folders, sets } from '../../../bank-data';
export default async function Page({ searchParams }: { searchParams: Promise<{ folder?: string }> }) {
  return <FolderBrowser folders={folders} sets={sets} currentId={(await searchParams).folder ?? null} />;
}
