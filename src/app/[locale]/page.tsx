import LayoutTemplate from '@/components/layout/LayoutTemplate';
import FileEditor from '@/components/editor/FileEditor';

interface Props {
  searchParams: Promise<{ profile?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const { profile } = await searchParams;
  return (
    <LayoutTemplate>
      <FileEditor initialProfile={profile} />
    </LayoutTemplate>
  );
}
