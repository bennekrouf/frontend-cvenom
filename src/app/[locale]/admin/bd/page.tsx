import LayoutTemplate from '@/components/layout/LayoutTemplate';
import AdminBdView from '@/components/bd/AdminBdView';

export const metadata = { title: 'BD Admin — cVenom' };

export default function AdminBdPage() {
  return (
    <LayoutTemplate>
      <AdminBdView />
    </LayoutTemplate>
  );
}
